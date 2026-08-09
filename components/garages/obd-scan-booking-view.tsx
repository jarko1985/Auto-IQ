"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { InlineSpinner } from "@/components/ui/inline-spinner";

interface Props {
  garageId: string;
  garageName: string;
  locationId: string;
  vehicleId: string;
  diagnosticSessionId: string | null;
  onBack: () => void;
  onBooked: (bookingId: string, scheduledStart: string) => void;
}

interface Slot {
  start: string;
  end: string;
  available: boolean;
}

const DUBAI_TZ = "Asia/Dubai";
const SERVICE_TYPE = "OBD_SCAN";

function todayGstDateStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DUBAI_TZ }).format(new Date());
}
function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-AE", {
    timeZone: DUBAI_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function dateStrFor(year: number, month0: number, day: number): string {
  return `${year}-${pad2(month0 + 1)}-${pad2(day)}`;
}
function monthLabel(year: number, month0: number): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month0, 1)),
  );
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function ObdScanBookingView({
  garageId,
  garageName,
  locationId,
  vehicleId,
  diagnosticSessionId,
  onBack,
  onBooked,
}: Props) {
  const todayStr = todayGstDateStr();
  const [todayYear, todayMonth0] = todayStr.split("-").map(Number) as [number, number];
  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth0, setViewMonth0] = useState(todayMonth0 - 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedDate) return;
    setSlotsLoading(true);
    setSelectedStart(null);
    const params = new URLSearchParams({ locationId, date: selectedDate, serviceType: SERVICE_TYPE });
    fetch(`/api/v1/garages/${garageId}/slots?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((body: { data: Slot[] }) => setSlots(body.data))
      .finally(() => setSlotsLoading(false));
  }, [garageId, locationId, selectedDate]);

  const isCurrentMonthInView = viewYear === todayYear && viewMonth0 === todayMonth0 - 1;

  function goPrevMonth() {
    if (isCurrentMonthInView) return;
    const d = new Date(Date.UTC(viewYear, viewMonth0 - 1, 1));
    setViewYear(d.getUTCFullYear());
    setViewMonth0(d.getUTCMonth());
    setSelectedDate(null);
  }
  function goNextMonth() {
    const d = new Date(Date.UTC(viewYear, viewMonth0 + 1, 1));
    setViewYear(d.getUTCFullYear());
    setViewMonth0(d.getUTCMonth());
    setSelectedDate(null);
  }

  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth0 + 1, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(viewYear, viewMonth0, 1)).getUTCDay();
  const dayCells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  async function submit() {
    if (!selectedStart) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          garageId,
          locationId,
          vehicleId,
          serviceType: SERVICE_TYPE,
          scheduledStart: selectedStart,
          diagnosticSessionId: diagnosticSessionId ?? undefined,
        }),
      });
      const body = (await res.json()) as { data?: { id: string }; error?: { message?: string } };
      if (!res.ok || !body.data) {
        toast.error(body.error?.message ?? "Failed to submit booking request.");
        return;
      }
      onBooked(body.data.id, selectedStart);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to garage list"
          style={{
            padding: "0.5rem",
            borderRadius: "9999px",
            border: "none",
            backgroundColor: "#f1f4f7",
            cursor: "pointer",
            color: "#5b6472",
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "#081a2f" }}>
            OBD Scan Booking
          </h3>
          <p style={{ margin: "0.125rem 0 0", fontSize: "0.875rem", fontWeight: 600, color: "#00b8d9" }}>
            {garageName}
          </p>
          <p style={{ margin: "0.125rem 0 0", fontSize: "0.8125rem", color: "#5b6472" }}>
            Choose Booking Details
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Calendar */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.625rem" }}>
            <button
              type="button"
              onClick={goPrevMonth}
              disabled={isCurrentMonthInView}
              aria-label="Previous month"
              style={{
                width: "1.75rem",
                height: "1.75rem",
                borderRadius: "0.375rem",
                border: "none",
                backgroundColor: "transparent",
                color: isCurrentMonthInView ? "#c4c6cd" : "#5b6472",
                cursor: isCurrentMonthInView ? "not-allowed" : "pointer",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#081a2f" }}>
              {monthLabel(viewYear, viewMonth0)}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              aria-label="Next month"
              style={{
                width: "1.75rem",
                height: "1.75rem",
                borderRadius: "0.375rem",
                border: "none",
                backgroundColor: "transparent",
                color: "#5b6472",
                cursor: "pointer",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.125rem", marginBottom: "0.375rem" }}>
            {WEEKDAY_LABELS.map((w, i) => (
              <span
                key={`${w}-${i}`}
                style={{ textAlign: "center", fontSize: "0.6875rem", fontWeight: 700, color: "#8a92a6" }}
              >
                {w}
              </span>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.125rem" }}>
            {dayCells.map((day, i) => {
              if (day == null) return <div key={`blank-${i}`} />;
              const dateStr = dateStrFor(viewYear, viewMonth0, day);
              const isPast = dateStr < todayStr;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={isPast}
                  onClick={() => setSelectedDate(dateStr)}
                  style={{
                    width: "1.875rem",
                    height: "1.875rem",
                    margin: "0.0625rem auto",
                    borderRadius: "9999px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    border: isSelected ? "none" : isToday ? "1.5px solid #081a2f" : "1px solid transparent",
                    backgroundColor: isSelected ? "#00b8d9" : "transparent",
                    color: isPast ? "#c4c6cd" : isSelected ? "#fff" : "#081a2f",
                    cursor: isPast ? "not-allowed" : "pointer",
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.625rem" }}>
            <Clock size={14} color="#5b6472" />
            <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#081a2f" }}>Available Times</span>
          </div>

          {!selectedDate ? (
            <p style={{ fontSize: "0.8125rem", color: "#8a92a6" }}>Select a date to see available times.</p>
          ) : slotsLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "#8a92a6" }}>
              <InlineSpinner color="#8a92a6" size={12} /> Loading availability...
            </div>
          ) : slots.length === 0 ? (
            <p style={{ fontSize: "0.8125rem", color: "#8a92a6" }}>This garage is closed on this day.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
                maxHeight: "220px",
                overflowY: "auto",
                paddingRight: "0.25rem",
              }}
            >
              {slots.map((s) => {
                const selected = selectedStart === s.start;
                return (
                  <button
                    key={s.start}
                    type="button"
                    disabled={!s.available}
                    onClick={() => setSelectedStart(s.start)}
                    style={{
                      padding: "0.5rem 0.625rem",
                      borderRadius: "0.5rem",
                      border: selected ? "1px solid #00b8d9" : "1px solid #ebeef1",
                      backgroundColor: !s.available ? "#f7fafd" : selected ? "#00b8d9" : "#fff",
                      color: !s.available ? "#c4c6cd" : selected ? "#fff" : "#081a2f",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: s.available ? "pointer" : "not-allowed",
                      textDecoration: !s.available ? "line-through" : "none",
                    }}
                  >
                    {formatTime(s.start)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid #ebeef1" }}>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!selectedStart || submitting}
          style={{
            width: "100%",
            height: "2.75rem",
            borderRadius: "0.625rem",
            border: "none",
            backgroundColor: !selectedStart ? "#c4c6cd" : "#00b8d9",
            color: "#fff",
            fontSize: "0.9375rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            cursor: !selectedStart || submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.8 : 1,
          }}
        >
          {submitting ? (
            <>
              <InlineSpinner color="#ffffff" size={14} /> Booking...
            </>
          ) : (
            "Book Now"
          )}
        </button>
      </div>
    </div>
  );
}
