"use client";

import { useRouter } from "@/i18n/routing";
import { useIsRtl } from "@/i18n/direction";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Booking {
  id: string;
  bookingNumber: string;
  status: string;
  serviceType: string;
  customerName: string;
  vehicleLabel: string;
  scheduledStart: string;
  scheduledEnd: string;
}

interface Props {
  weekStart: string;
  bookings: Booking[];
}

const DUBAI_TZ = "Asia/Dubai";
const START_HOUR = 8;
const END_HOUR = 20;
const ROW_HEIGHT = 56;
const WEEKDAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_COLORS: Record<string, { bg: string; border: string; color: string; label: string }> =
  {
    REQUESTED: {
      bg: "rgba(217,119,6,0.12)",
      border: "#d97706",
      color: "#92400e",
      label: "Pending",
    },
    ACCEPTED: {
      bg: "rgba(0,184,217,0.12)",
      border: "#00b8d9",
      color: "#0e7490",
      label: "Confirmed",
    },
    RESCHEDULE_PROPOSED: {
      bg: "rgba(124,58,237,0.12)",
      border: "#7c3aed",
      color: "#6d28d9",
      label: "Reschedule Sent",
    },
    COMPLETED: {
      bg: "rgba(107,114,128,0.15)",
      border: "#6b7280",
      color: "#374151",
      label: "Completed",
    },
  };
const DEFAULT_COLOR = STATUS_COLORS.REQUESTED!;

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

function gstDayIndex(iso: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: DUBAI_TZ, weekday: "short" }).format(
    new Date(iso),
  );
  return WEEKDAY_ORDER.indexOf(weekday);
}
function gstHourMinute(iso: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DUBAI_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  return {
    hour: Number(parts.find((p) => p.type === "hour")?.value ?? "0"),
    minute: Number(parts.find((p) => p.type === "minute")?.value ?? "0"),
  };
}
function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function columnDateLabel(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DUBAI_TZ,
    weekday: "short",
    day: "numeric",
  }).format(new Date(`${dateStr}T12:00:00Z`));
}
function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DUBAI_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function GarageCalendarView({ weekStart, bookings }: Props) {
  const router = useRouter();
  // "Previous"/"next week" chevrons must still point the way the week
  // sequence reads, which flips under RTL.
  const isRtl = useIsRtl();
  const PrevWeekIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextWeekIcon = isRtl ? ChevronLeft : ChevronRight;
  const totalRows = END_HOUR - START_HOUR;
  const columnDates = Array.from({ length: 7 }, (_, i) => addDaysToDateStr(weekStart, i));

  function goToWeek(offsetDays: number) {
    const next = addDaysToDateStr(weekStart, offsetDays);
    router.push(`/garage/calendar?week=${next}` as never);
  }

  function goToday() {
    const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: DUBAI_TZ }).format(new Date());
    const d = new Date(`${todayStr}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    router.push(`/garage/calendar?week=${d.toISOString().slice(0, 10)}` as never);
  }

  return (
    <div>
      <div
        style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}
      >
        <button
          type="button"
          onClick={() => goToWeek(-7)}
          style={{
            padding: "0.375rem",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            cursor: "pointer",
            background: "none",
          }}
        >
          <PrevWeekIcon size={16} />
        </button>
        <button
          type="button"
          onClick={goToday}
          style={{
            padding: "0.375rem 0.875rem",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            cursor: "pointer",
            background: "none",
            fontSize: "0.8125rem",
            fontWeight: 600,
          }}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => goToWeek(7)}
          style={{
            padding: "0.375rem",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            cursor: "pointer",
            background: "none",
          }}
        >
          <NextWeekIcon size={16} />
        </button>
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#081a2f",
            marginInlineStart: "0.5rem",
          }}
        >
          {columnDateLabel(columnDates[0]!)} – {columnDateLabel(columnDates[6]!)}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1rem",
          fontSize: "0.75rem",
          color: "#5b6472",
        }}
      >
        {Object.entries(STATUS_COLORS).map(([key, s]) => (
          <span key={key} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span
              style={{
                width: "0.625rem",
                height: "0.625rem",
                borderRadius: "0.1875rem",
                backgroundColor: s.border,
                display: "inline-block",
              }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <div
        style={{ border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          <div
            style={{
              borderBottom: "1px solid var(--border)",
              borderInlineEnd: "1px solid var(--border)",
            }}
          />
          {columnDates.map((d) => (
            <div
              key={d}
              style={{
                padding: "0.625rem",
                textAlign: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#081a2f",
                borderBottom: "1px solid var(--border)",
                borderInlineEnd: "1px solid var(--border)",
              }}
            >
              {columnDateLabel(d)}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "56px repeat(7, 1fr)",
            position: "relative",
          }}
        >
          <div>
            {Array.from({ length: totalRows }, (_, i) => (
              <div
                key={i}
                style={{
                  height: ROW_HEIGHT,
                  borderInlineEnd: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "0.6875rem",
                  color: "#8a92a6",
                  padding: "0.25rem",
                  boxSizing: "border-box",
                }}
              >
                {String(START_HOUR + i).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {columnDates.map((d, colIndex) => (
            <div
              key={d}
              style={{ position: "relative", borderInlineEnd: "1px solid var(--border)" }}
            >
              {Array.from({ length: totalRows }, (_, i) => (
                <div
                  key={i}
                  style={{ height: ROW_HEIGHT, borderBottom: "1px solid var(--border)" }}
                />
              ))}

              {bookings
                .filter((b) => gstDayIndex(b.scheduledStart) === colIndex)
                .map((b) => {
                  const { hour, minute } = gstHourMinute(b.scheduledStart);
                  const startMinutesFromTop = (hour - START_HOUR) * 60 + minute;
                  const top = (startMinutesFromTop / 60) * ROW_HEIGHT;
                  const durationMinutes =
                    (new Date(b.scheduledEnd).getTime() - new Date(b.scheduledStart).getTime()) /
                    60000;
                  const height = Math.max(28, (durationMinutes / 60) * ROW_HEIGHT - 2);
                  const color = STATUS_COLORS[b.status] ?? DEFAULT_COLOR;
                  if (top < 0 || top > totalRows * ROW_HEIGHT) return null;

                  return (
                    <a
                      key={b.id}
                      href={`/garage/appointments?bookingId=${b.id}`}
                      style={{
                        position: "absolute",
                        top,
                        insetInlineStart: 2,
                        insetInlineEnd: 2,
                        height,
                        backgroundColor: color.bg,
                        borderInlineStart: `3px solid ${color.border}`,
                        borderRadius: "0.25rem",
                        padding: "0.25rem 0.375rem",
                        fontSize: "0.6875rem",
                        color: color.color,
                        overflow: "hidden",
                        textDecoration: "none",
                        display: "block",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{formatTime(b.scheduledStart)}</div>
                      <div style={{ fontWeight: 600 }}>{b.customerName}</div>
                      <div>
                        {SERVICE_LABELS[b.serviceType] ?? b.serviceType} · {b.vehicleLabel}
                      </div>
                    </a>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
