"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { Phone, Mail, MapPin } from "lucide-react";

interface StatusHistoryEntry {
  id: string;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

interface BookingDetail {
  id: string;
  bookingNumber: string;
  status: string;
  serviceType: string;
  scheduledStart: string;
  scheduledEnd: string;
  proposedStart: string | null;
  proposedEnd: string | null;
  rescheduleNote: string | null;
  customerNotes: string | null;
  rejectionReason: string | null;
  cancelledReason: string | null;
  garageName: string;
  garagePhone: string;
  garageEmail: string;
  locationName: string;
  locationAddress: string;
  vehicleLabel: string;
  statusHistory: StatusHistoryEntry[];
}

interface Props {
  booking: BookingDetail;
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
  RESCHEDULE_PROPOSED: {
    bg: "rgba(0,184,217,0.12)",
    color: "#00b8d9",
    label: "Reschedule Proposed",
  },
  REJECTED: { bg: "rgba(220,38,38,0.12)", color: "#dc2626", label: "Rejected" },
  CANCELLED: { bg: "rgba(220,38,38,0.12)", color: "#dc2626", label: "Cancelled" },
  COMPLETED: { bg: "rgba(8,26,47,0.08)", color: "#081a2f", label: "Completed" },
  NO_SHOW: { bg: "rgba(220,38,38,0.12)", color: "#dc2626", label: "No-Show" },
};
const DEFAULT_STATUS_STYLE = STATUS_STYLES.REQUESTED!;

const CANCELLABLE_STATUSES = ["REQUESTED", "RESCHEDULE_PROPOSED", "ACCEPTED"];

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function MyBookingDetailView({ booking }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(booking.status);
  const [busy, setBusy] = useState(false);

  async function cancel() {
    const reason = window.prompt("Why are you cancelling this booking?");
    if (!reason) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to cancel booking.");
        return;
      }
      setStatus("CANCELLED");
      toast.success("Booking cancelled.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function respondToReschedule(accept: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/bookings/${booking.id}/reschedule-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        toast.error(body.error?.message ?? "Failed to respond to reschedule.");
        return;
      }
      setStatus(accept ? "ACCEPTED" : "CANCELLED");
      toast.success(accept ? "New time accepted." : "Reschedule declined.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const state = STATUS_STYLES[status] ?? DEFAULT_STATUS_STYLE;

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          gap: "1rem",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.625rem" }}>
            <h1
              className="text-fluid-page-title break-words"
              style={{ fontWeight: 700, color: "#081a2f", margin: 0 }}
            >
              #{booking.bookingNumber}
            </h1>
            <span
              style={{
                padding: "0.1875rem 0.625rem",
                borderRadius: "9999px",
                fontSize: "0.6875rem",
                fontWeight: 700,
                backgroundColor: state.bg,
                color: state.color,
              }}
            >
              {state.label}
            </span>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "#5b6472", marginTop: "0.25rem" }}>
            {booking.garageName} · {booking.locationName}
          </p>
          {status === "CANCELLED" && booking.cancelledReason && (
            <p style={{ fontSize: "0.8125rem", color: "#dc2626", marginTop: "0.375rem" }}>
              Cancelled: {booking.cancelledReason}
            </p>
          )}
          {status === "REJECTED" && booking.rejectionReason && (
            <p style={{ fontSize: "0.8125rem", color: "#dc2626", marginTop: "0.375rem" }}>
              Declined: {booking.rejectionReason}
            </p>
          )}
        </div>
        {CANCELLABLE_STATUSES.includes(status) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void cancel()}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Cancel Booking
          </button>
        )}
      </div>

      {status === "RESCHEDULE_PROPOSED" && booking.proposedStart && (
        <div
          style={{
            border: "1px solid #00b8d9",
            backgroundColor: "rgba(0,184,217,0.06)",
            borderRadius: "0.75rem",
            padding: "1.25rem",
            marginBottom: "1.25rem",
          }}
        >
          <h2 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#081a2f", marginTop: 0 }}>
            The garage proposed a new time
          </h2>
          <p
            style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#081a2f", margin: "0.5rem 0" }}
          >
            {formatDateTime(booking.proposedStart)} (GST)
          </p>
          {booking.rescheduleNote && (
            <p style={{ fontSize: "0.8125rem", color: "#5b6472", marginBottom: "1rem" }}>
              "{booking.rescheduleNote}"
            </p>
          )}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void respondToReschedule(true)}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              Accept New Time
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void respondToReschedule(false)}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "transparent",
                color: "#5b6472",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              Decline
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          padding: "1.25rem",
          marginBottom: "1.25rem",
        }}
      >
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "#081a2f",
            marginTop: 0,
            marginBottom: "1rem",
          }}
        >
          Appointment Details
        </h2>
        <div
          className="grid grid-cols-1 gap-y-3.5 gap-x-6 sm:grid-cols-2"
          style={{ fontSize: "0.8125rem" }}
        >
          <div>
            <div style={{ color: "#8a92a6" }}>Vehicle</div>
            <div style={{ color: "#081a2f", fontWeight: 600 }}>{booking.vehicleLabel}</div>
          </div>
          <div>
            <div style={{ color: "#8a92a6" }}>Service</div>
            <div style={{ color: "#081a2f", fontWeight: 600 }}>
              {SERVICE_LABELS[booking.serviceType] ?? booking.serviceType}
            </div>
          </div>
          <div>
            <div style={{ color: "#8a92a6" }}>Date & Time</div>
            <div style={{ color: "#081a2f", fontWeight: 600 }}>
              {formatDateTime(booking.scheduledStart)} (GST)
            </div>
          </div>
          <div>
            <div style={{ color: "#8a92a6" }}>Location</div>
            <div
              style={{
                color: "#081a2f",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <MapPin size={12} /> {booking.locationAddress}
            </div>
          </div>
        </div>
        {booking.customerNotes && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ color: "#8a92a6", fontSize: "0.8125rem" }}>Your Notes</div>
            <div
              style={{
                color: "#081a2f",
                fontSize: "0.8125rem",
                fontStyle: "italic",
                marginTop: "0.25rem",
              }}
            >
              "{booking.customerNotes}"
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "1.25rem",
            marginTop: "1.25rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              fontSize: "0.8125rem",
              color: "#5b6472",
            }}
          >
            <Phone size={13} /> {booking.garagePhone}
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              fontSize: "0.8125rem",
              color: "#5b6472",
            }}
          >
            <Mail size={13} /> {booking.garageEmail}
          </span>
        </div>
      </div>

      <div
        style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.25rem" }}
      >
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "#081a2f",
            marginTop: 0,
            marginBottom: "0.75rem",
          }}
        >
          Status History
        </h2>
        {booking.statusHistory.map((h) => (
          <div
            key={h.id}
            style={{
              padding: "0.5rem 0",
              fontSize: "0.8125rem",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#081a2f", fontWeight: 600 }}>
                {STATUS_STYLES[h.toStatus]?.label ?? h.toStatus}
              </span>
              <span style={{ color: "#8a92a6" }}>{formatDateTime(h.createdAt)}</span>
            </div>
            {h.note && <div style={{ color: "#8a92a6", marginTop: "0.125rem" }}>{h.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
