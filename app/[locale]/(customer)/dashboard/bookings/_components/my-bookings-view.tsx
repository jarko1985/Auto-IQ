"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";

interface BookingRow {
  id: string;
  bookingNumber: string;
  status: string;
  serviceType: string;
  garageName: string;
  locationName: string;
  vehicleLabel: string;
  scheduledStart: string;
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

const TABS = [
  {
    value: "upcoming",
    label: "Upcoming",
    statuses: ["REQUESTED", "ACCEPTED", "RESCHEDULE_PROPOSED"],
  },
  { value: "past", label: "Past", statuses: ["COMPLETED", "NO_SHOW"] },
  { value: "cancelled", label: "Cancelled", statuses: ["CANCELLED", "REJECTED"] },
] as const;

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function MyBookingsView({ initialBookings }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("upcoming");
  const activeTab = TABS.find((t) => t.value === tab) ?? TABS[0];
  const filtered = initialBookings.filter((b) =>
    (activeTab.statuses as readonly string[]).includes(b.status),
  );

  return (
    <div>
      <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1.5rem", overflowX: "auto" }}>
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
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {t.label}
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
          <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1rem" }}>
            No bookings here yet.
          </p>
          <Link
            href={"/garages" as never}
            style={{
              display: "inline-block",
              padding: "0.5rem 1.25rem",
              backgroundColor: "#00b8d9",
              color: "#fff",
              borderRadius: "0.5rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Find a Garage
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map((b) => {
            const status = STATUS_STYLES[b.status] ?? DEFAULT_STATUS_STYLE;
            return (
              <Link
                key={b.id}
                href={`/dashboard/bookings/${b.id}` as never}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  padding: "1rem 1.25rem",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#081a2f" }}>
                      {SERVICE_LABELS[b.serviceType] ?? b.serviceType}
                    </span>
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
                  <div style={{ fontSize: "0.8125rem", color: "#5b6472", marginTop: "0.25rem" }}>
                    {b.garageName} · {b.vehicleLabel}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "#081a2f",
                    textAlign: "end",
                  }}
                >
                  {formatDateTime(b.scheduledStart)}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
