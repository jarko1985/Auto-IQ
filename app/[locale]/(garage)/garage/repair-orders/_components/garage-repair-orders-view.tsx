"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { formatCurrency } from "@/lib/utils";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { ClipboardList } from "lucide-react";

interface RepairOrderRow {
  id: string;
  repairOrderNumber: string;
  status: string;
  serviceType: string;
  customerName: string;
  vehicleLabel: string;
  totalMinorUnits: number;
  currency: string;
  createdAt: string;
}

interface EligibleBooking {
  id: string;
  bookingNumber: string;
  scheduledStart: string;
  customerName: string;
  vehicleLabel: string;
}

interface Props {
  initialRepairOrders: RepairOrderRow[];
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  CREATED: { bg: "rgba(8,26,47,0.08)", color: "#081a2f", label: "New" },
  INSPECTION: { bg: "rgba(0,184,217,0.12)", color: "#00b8d9", label: "Inspection" },
  DIAGNOSIS: { bg: "rgba(0,184,217,0.12)", color: "#00b8d9", label: "Diagnosis" },
  ESTIMATE_DRAFT: { bg: "rgba(217,119,6,0.12)", color: "#d97706", label: "Estimate Draft" },
  AWAITING_APPROVAL: { bg: "rgba(217,119,6,0.12)", color: "#d97706", label: "Awaiting Approval" },
  APPROVED: { bg: "rgba(22,163,74,0.12)", color: "#16a34a", label: "Approved" },
  REJECTED: { bg: "rgba(220,38,38,0.12)", color: "#dc2626", label: "Rejected" },
  IN_REPAIR: { bg: "rgba(22,163,74,0.12)", color: "#16a34a", label: "In Repair" },
  QUALITY_CHECK: { bg: "rgba(0,184,217,0.12)", color: "#00b8d9", label: "Quality Check" },
  COMPLETED: { bg: "rgba(22,163,74,0.12)", color: "#16a34a", label: "Completed" },
  INVOICED: { bg: "rgba(8,26,47,0.08)", color: "#081a2f", label: "Invoiced" },
  CANCELLED: { bg: "rgba(220,38,38,0.12)", color: "#dc2626", label: "Cancelled" },
};
const DEFAULT_STATUS_STYLE = STATUS_STYLES.CREATED!;

const TABS = [
  { value: "active", label: "Active", statuses: null },
  { value: "new", label: "New", statuses: ["CREATED"] },
  { value: "estimate", label: "Estimate", statuses: ["DIAGNOSIS", "ESTIMATE_DRAFT", "AWAITING_APPROVAL", "REJECTED"] },
  { value: "in_repair", label: "In Repair", statuses: ["APPROVED", "IN_REPAIR", "QUALITY_CHECK"] },
  { value: "done", label: "Completed", statuses: ["COMPLETED", "INVOICED"] },
  { value: "cancelled", label: "Cancelled", statuses: ["CANCELLED"] },
] as const;

const ACTIVE_STATUSES = ["CREATED", "INSPECTION", "DIAGNOSIS", "ESTIMATE_DRAFT", "AWAITING_APPROVAL", "APPROVED", "IN_REPAIR", "QUALITY_CHECK"];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AE", { day: "numeric", month: "short" });
}

export function GarageRepairOrdersView({ initialRepairOrders }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("active");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [bookings, setBookings] = useState<EligibleBooking[] | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!checkInOpen || bookings !== null) return;
    fetch("/api/v1/garages/me/bookings?status=ACCEPTED&limit=50")
      .then((r) => r.json())
      .then((json: { data?: unknown[] }) => {
        const rows = (json.data ?? []) as Array<{
          id: string;
          bookingNumber: string;
          scheduledStart: string;
          customer: { name: string | null; email: string };
          vehicle: { year: number; makeName: string; modelName: string };
        }>;
        setBookings(
          rows.map((b) => ({
            id: b.id,
            bookingNumber: b.bookingNumber,
            scheduledStart: b.scheduledStart,
            customerName: b.customer.name ?? b.customer.email,
            vehicleLabel: `${b.vehicle.year} ${b.vehicle.makeName} ${b.vehicle.modelName}`,
          })),
        );
      })
      .catch(() => setBookings([]));
  }, [checkInOpen, bookings]);

  async function checkIn() {
    if (!selectedBookingId) {
      toast.error("Select a booking to check in.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/v1/garages/me/repair-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: selectedBookingId }),
      });
      const json = (await res.json()) as { data?: { id: string }; error?: { message?: string } };
      if (!res.ok || !json.data) {
        toast.error(json.error?.message ?? "Failed to create repair order.");
        return;
      }
      toast.success("Vehicle checked in.");
      router.push(`/garage/repair-orders/${json.data.id}` as never);
    } finally {
      setBusy(false);
    }
  }

  const activeTab = TABS.find((t) => t.value === tab) ?? TABS[0];
  const filtered = initialRepairOrders.filter((ro) =>
    activeTab.statuses ? (activeTab.statuses as readonly string[]).includes(ro.status) : ACTIVE_STATUSES.includes(ro.status),
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", gap: "0.375rem" }}>
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
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCheckInOpen(true)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#00b8d9",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.8125rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Check In Vehicle
        </button>
      </div>

      {checkInOpen && (
        <div
          style={{
            border: "1px solid #00b8d9",
            backgroundColor: "rgba(0,184,217,0.06)",
            borderRadius: "0.75rem",
            padding: "1.25rem",
            marginBottom: "1.25rem",
          }}
        >
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#081a2f", marginTop: 0 }}>
            Create a repair order from an accepted booking
          </h3>
          {bookings === null ? (
            <p
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8125rem",
                color: "#5b6472",
              }}
            >
              <InlineSpinner color="#5b6472" size={12} /> Loading eligible bookings…
            </p>
          ) : bookings.length === 0 ? (
            <p style={{ fontSize: "0.8125rem", color: "#5b6472" }}>
              No accepted bookings are available to check in right now.
            </p>
          ) : (
            <select
              value={selectedBookingId}
              onChange={(e) => setSelectedBookingId(e.target.value)}
              style={{
                width: "100%",
                maxWidth: "28rem",
                padding: "0.5rem 0.75rem",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                marginBottom: "0.875rem",
                display: "block",
              }}
            >
              <option value="">Select a booking…</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.bookingNumber} — {b.customerName} — {b.vehicleLabel}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            disabled={busy || !bookings?.length}
            onClick={() => void checkIn()}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#00b8d9",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
              marginInlineEnd: "0.5rem",
            }}
          >
            Create Repair Order
          </button>
          <button
            type="button"
            onClick={() => setCheckInOpen(false)}
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

      {filtered.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: "0.75rem",
            padding: "3rem 1.5rem",
            textAlign: "center",
          }}
        >
          <ClipboardList size={32} color="#8a92a6" style={{ margin: "0 auto 0.75rem" }} />
          <p style={{ fontSize: "0.875rem", color: "#5b6472" }}>
            No repair orders in this category.
          </p>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" }}>
          {filtered.map((ro, i) => {
            const status = STATUS_STYLES[ro.status] ?? DEFAULT_STATUS_STYLE;
            return (
              <div
                key={ro.id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/garage/repair-orders/${ro.id}` as never)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/garage/repair-orders/${ro.id}` as never);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem 1.25rem",
                  cursor: "pointer",
                  borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", minWidth: 0, flex: 1 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#081a2f" }}>
                      #{ro.repairOrderNumber}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#8a92a6" }}>{ro.vehicleLabel}</div>
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#5b6472" }}>{ro.customerName}</div>
                  <div style={{ fontSize: "0.8125rem", color: "#5b6472" }}>{formatDate(ro.createdAt)}</div>
                  {ro.totalMinorUnits > 0 && (
                    <div style={{ fontSize: "0.8125rem", color: "#081a2f", fontWeight: 600 }}>
                      {formatCurrency(ro.totalMinorUnits, ro.currency)}
                    </div>
                  )}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
