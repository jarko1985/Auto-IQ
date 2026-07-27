"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { ChevronDown, ChevronUp, CalendarClock } from "lucide-react";

interface BookingRow {
  id: string;
  bookingNumber: string;
  status: string;
  serviceType: string;
  scheduledStart: string;
  scheduledEnd: string;
  proposedStart: string | null;
  customerName: string;
  customerNotes: string | null;
  vehicleLabel: string;
}

interface Props {
  initialBookings: BookingRow[];
}

const SERVICE_LABELS: Record<string, string> = {
  OIL_CHANGE: "Oil Change",
  TYRE_ROTATION: "Tyre Rotation",
  BRAKE_SERVICE: "Brake Service",
  FILTER_CHANGE: "Filter Change",
  FLUID_CHECK: "Fluid Check",
  BATTERY_REPLACEMENT: "Battery Replacement",
  TIMING_BELT: "Timing Belt",
  AC_SERVICE: "AC Service",
  TRANSMISSION_SERVICE: "Transmission Service",
  GENERAL_INSPECTION: "General Inspection",
  OTHER: "Other",
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  REQUESTED: { bg: "rgba(217,119,6,0.12)", color: "#d97706", label: "Pending" },
  ACCEPTED: { bg: "rgba(22,163,74,0.12)", color: "#16a34a", label: "Confirmed" },
  RESCHEDULE_PROPOSED: { bg: "rgba(0,184,217,0.12)", color: "#00b8d9", label: "Reschedule Sent" },
  REJECTED: { bg: "rgba(220,38,38,0.12)", color: "#dc2626", label: "Rejected" },
  CANCELLED: { bg: "rgba(220,38,38,0.12)", color: "#dc2626", label: "Cancelled" },
  COMPLETED: { bg: "rgba(8,26,47,0.08)", color: "#081a2f", label: "Completed" },
  NO_SHOW: { bg: "rgba(220,38,38,0.12)", color: "#dc2626", label: "No-Show" },
};
const DEFAULT_STATUS_STYLE = STATUS_STYLES.REQUESTED!;

const TABS = [
  { value: "pending", label: "Pending", statuses: ["REQUESTED"] },
  { value: "upcoming", label: "Upcoming", statuses: ["ACCEPTED", "RESCHEDULE_PROPOSED"] },
  { value: "completed", label: "Completed", statuses: ["COMPLETED", "NO_SHOW"] },
  { value: "cancelled", label: "Cancelled", statuses: ["CANCELLED", "REJECTED"] },
] as const;

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** Interprets a `<input type="datetime-local">` value as a GST (UTC+4) wall
 * time and returns the equivalent UTC ISO string. */
function gstLocalInputToIso(value: string): string {
  const [datePart, timePart] = value.split("T");
  const [y, m, d] = (datePart ?? "").split("-").map(Number);
  const [hh, mm] = (timePart ?? "").split(":").map(Number);
  const utcMs = Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0) - 4 * 60 * 60_000;
  return new Date(utcMs).toISOString();
}

export function GarageAppointmentsView({ initialBookings }: Props) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [proposedTime, setProposedTime] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");

  const activeTab = TABS.find((t) => t.value === tab) ?? TABS[0];
  const filtered = bookings.filter((b) =>
    (activeTab.statuses as readonly string[]).includes(b.status),
  );
  const pendingCount = bookings.filter((b) => b.status === "REQUESTED").length;

  function updateLocal(id: string, patch: Partial<BookingRow>) {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  async function callAction(id: string, path: string, body?: unknown) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/garages/me/bookings/${id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json()) as {
        data?: { status: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.data) {
        toast.error(json.error?.message ?? "Action failed.");
        return false;
      }
      updateLocal(id, { status: json.data.status });
      router.refresh();
      return true;
    } finally {
      setBusyId(null);
    }
  }

  async function accept(id: string) {
    if (await callAction(id, "accept")) toast.success("Booking accepted.");
  }
  async function reject(id: string) {
    if (!reason.trim()) {
      toast.error("A rejection reason is required.");
      return;
    }
    const ok = await callAction(id, "reject", { reason: reason.trim() });
    if (ok) {
      setRejectingId(null);
      setReason("");
      toast.success("Booking rejected.");
    }
  }
  async function propose(id: string) {
    if (!proposedTime) {
      toast.error("Pick a proposed date and time.");
      return;
    }
    const ok = await callAction(id, "reschedule", {
      proposedStart: gstLocalInputToIso(proposedTime),
      note: rescheduleNote.trim() || undefined,
    });
    if (ok) {
      setReschedulingId(null);
      setProposedTime("");
      setRescheduleNote("");
      toast.success("New time proposed to customer.");
    }
  }
  async function complete(id: string) {
    if (await callAction(id, "complete")) toast.success("Booking marked as completed.");
  }
  async function noShow(id: string) {
    if (await callAction(id, "no-show")) toast.success("Marked as no-show.");
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1.5rem" }}>
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            style={{
              padding: "0.375rem 0.875rem",
              borderRadius: "9999px",
              border: "1px solid var(--border)",
              backgroundColor: tab === t.value ? "#081a2f" : "transparent",
              color: tab === t.value ? "#fff" : "#5b6472",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.label} {t.value === "pending" && pendingCount > 0 ? `(${pendingCount})` : ""}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: "0.75rem",
            padding: "3rem 1.5rem",
            textAlign: "center",
          }}
        >
          <CalendarClock size={32} color="#8a92a6" style={{ margin: "0 auto 0.75rem" }} />
          <p style={{ fontSize: "0.875rem", color: "#5b6472" }}>No appointments in this category.</p>
        </div>
      ) : (
        <div
          style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" }}
        >
          {filtered.map((b, i) => {
            const expanded = expandedId === b.id;
            const status = STATUS_STYLES[b.status] ?? DEFAULT_STATUS_STYLE;
            const busy = busyId === b.id;
            const canMarkOutcome =
              b.status === "ACCEPTED" && new Date(b.scheduledStart).getTime() <= Date.now();

            return (
              <div
                key={b.id}
                style={{
                  borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(expanded ? null : b.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setExpandedId(expanded ? null : b.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1rem 1.25rem",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1.5rem",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#081a2f" }}>
                        {b.customerName}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#8a92a6" }}>{b.vehicleLabel}</div>
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "#5b6472" }}>
                      {SERVICE_LABELS[b.serviceType] ?? b.serviceType}
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "#5b6472" }}>
                      {formatDateTime(b.scheduledStart)}
                    </div>
                    <span
                      style={{
                        padding: "0.1875rem 0.625rem",
                        borderRadius: "9999px",
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        backgroundColor: status.bg,
                        color: status.color,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}
                  >
                    {b.status === "REQUESTED" && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            void accept(b.id);
                          }}
                          style={{
                            padding: "0.375rem 0.75rem",
                            backgroundColor: "#16a34a",
                            color: "#fff",
                            border: "none",
                            borderRadius: "0.5rem",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(b.id);
                            setRejectingId(b.id);
                          }}
                          style={{
                            padding: "0.375rem 0.75rem",
                            backgroundColor: "#fee2e2",
                            color: "#991b1b",
                            border: "none",
                            borderRadius: "0.5rem",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(b.id);
                            setReschedulingId(b.id);
                          }}
                          style={{
                            padding: "0.375rem 0.75rem",
                            backgroundColor: "transparent",
                            color: "#00b8d9",
                            border: "1px solid #00b8d9",
                            borderRadius: "0.5rem",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Propose New Time
                        </button>
                      </>
                    )}
                    {b.status === "ACCEPTED" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setBusyId(b.id);
                          try {
                            const res = await fetch("/api/v1/garages/me/repair-orders", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ bookingId: b.id }),
                            });
                            const json = (await res.json()) as {
                              data?: { id: string };
                              error?: { message?: string };
                            };
                            if (!res.ok || !json.data) {
                              toast.error(json.error?.message ?? "Failed to check in vehicle.");
                              return;
                            }
                            toast.success("Vehicle checked in.");
                            router.push(`/garage/repair-orders/${json.data.id}` as never);
                          } finally {
                            setBusyId(null);
                          }
                        }}
                        style={{
                          padding: "0.375rem 0.75rem",
                          backgroundColor: "transparent",
                          color: "#00b8d9",
                          border: "1px solid #00b8d9",
                          borderRadius: "0.5rem",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Check In Vehicle
                      </button>
                    )}
                    {canMarkOutcome && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            void complete(b.id);
                          }}
                          style={{
                            padding: "0.375rem 0.75rem",
                            backgroundColor: "#081a2f",
                            color: "#fff",
                            border: "none",
                            borderRadius: "0.5rem",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Mark Completed
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            void noShow(b.id);
                          }}
                          style={{
                            padding: "0.375rem 0.75rem",
                            backgroundColor: "transparent",
                            color: "#dc2626",
                            border: "1px solid #dc2626",
                            borderRadius: "0.5rem",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          No-Show
                        </button>
                      </>
                    )}
                    {expanded ? (
                      <ChevronUp size={18} color="#8a92a6" />
                    ) : (
                      <ChevronDown size={18} color="#8a92a6" />
                    )}
                  </div>
                </div>

                {expanded && (
                  <div style={{ padding: "0 1.25rem 1.25rem" }}>
                    {b.customerNotes && (
                      <div style={{ marginBottom: "1rem" }}>
                        <div
                          style={{ fontSize: "0.75rem", color: "#8a92a6", marginBottom: "0.25rem" }}
                        >
                          Customer Notes
                        </div>
                        <div
                          style={{ fontSize: "0.8125rem", color: "#081a2f", fontStyle: "italic" }}
                        >
                          "{b.customerNotes}"
                        </div>
                      </div>
                    )}
                    {b.status === "RESCHEDULE_PROPOSED" && b.proposedStart && (
                      <div
                        style={{ fontSize: "0.8125rem", color: "#00b8d9", marginBottom: "1rem" }}
                      >
                        Awaiting customer response to proposed time:{" "}
                        {formatDateTime(b.proposedStart)}
                      </div>
                    )}

                    {rejectingId === b.id && (
                      <div style={{ marginBottom: "1rem" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            color: "#081a2f",
                            marginBottom: "0.375rem",
                          }}
                        >
                          Rejection reason
                        </label>
                        <textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Let the customer know why..."
                          style={{
                            width: "100%",
                            minHeight: "4rem",
                            padding: "0.5rem 0.75rem",
                            border: "1px solid var(--border)",
                            borderRadius: "0.5rem",
                            fontSize: "0.8125rem",
                            boxSizing: "border-box",
                            marginBottom: "0.75rem",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => void reject(b.id)}
                          disabled={busy}
                          style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: "#dc2626",
                            color: "#fff",
                            border: "none",
                            borderRadius: "0.5rem",
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            marginInlineEnd: "0.5rem",
                          }}
                        >
                          Confirm Rejection
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingId(null)}
                          style={{
                            padding: "0.5rem 1rem",
                            background: "none",
                            border: "1px solid var(--border)",
                            borderRadius: "0.5rem",
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {reschedulingId === b.id && (
                      <div style={{ marginBottom: "1rem" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            color: "#081a2f",
                            marginBottom: "0.375rem",
                          }}
                        >
                          Propose a new date & time (GST)
                        </label>
                        <input
                          type="datetime-local"
                          value={proposedTime}
                          onChange={(e) => setProposedTime(e.target.value)}
                          style={{
                            padding: "0.5rem 0.75rem",
                            border: "1px solid var(--border)",
                            borderRadius: "0.5rem",
                            fontSize: "0.8125rem",
                            marginBottom: "0.625rem",
                            display: "block",
                          }}
                        />
                        <textarea
                          value={rescheduleNote}
                          onChange={(e) => setRescheduleNote(e.target.value)}
                          placeholder="Optional note to the customer..."
                          style={{
                            width: "100%",
                            minHeight: "3rem",
                            padding: "0.5rem 0.75rem",
                            border: "1px solid var(--border)",
                            borderRadius: "0.5rem",
                            fontSize: "0.8125rem",
                            boxSizing: "border-box",
                            marginBottom: "0.75rem",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => void propose(b.id)}
                          disabled={busy}
                          style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: "#00b8d9",
                            color: "#fff",
                            border: "none",
                            borderRadius: "0.5rem",
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            marginInlineEnd: "0.5rem",
                          }}
                        >
                          Send Proposal
                        </button>
                        <button
                          type="button"
                          onClick={() => setReschedulingId(null)}
                          style={{
                            padding: "0.5rem 1rem",
                            background: "none",
                            border: "1px solid var(--border)",
                            borderRadius: "0.5rem",
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
