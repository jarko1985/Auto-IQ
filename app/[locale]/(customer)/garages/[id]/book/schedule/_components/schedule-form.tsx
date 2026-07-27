"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useIsRtl } from "@/i18n/direction";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { InlineSpinner } from "@/components/ui/inline-spinner";

interface Props {
  garageId: string;
  locationId: string;
  vehicleId: string;
  serviceType: string;
}

interface Slot {
  start: string;
  end: string;
  available: boolean;
}

const DUBAI_TZ = "Asia/Dubai";

function todayGstDateStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DUBAI_TZ }).format(new Date());
}
function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function dayChipLabel(dateStr: string): { weekday: string; day: string } {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat("en-US", { timeZone: DUBAI_TZ, weekday: "short" }).format(d),
    day: new Intl.DateTimeFormat("en-US", { timeZone: DUBAI_TZ, day: "numeric" }).format(d),
  };
}
function gstHour(iso: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: DUBAI_TZ, hour: "2-digit", hour12: false }).format(
      new Date(iso),
    ),
  );
}
function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-AE", {
    timeZone: DUBAI_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}
function formatFullDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DUBAI_TZ,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateStr}T12:00:00Z`));
}

const DAYS = Array.from({ length: 14 }, (_, i) => addDays(todayGstDateStr(), i));

export function ScheduleForm({ garageId, locationId, vehicleId, serviceType }: Props) {
  const router = useRouter();
  const isRtl = useIsRtl();
  const BackIcon = isRtl ? ChevronRight : ChevronLeft;
  const ForwardIcon = isRtl ? ChevronLeft : ChevronRight;
  const [date, setDate] = useState(DAYS[0]!);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setSelectedStart(null);
    const params = new URLSearchParams({ locationId, date });
    fetch(`/api/v1/garages/${garageId}/slots?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((body: { data: Slot[] }) => setSlots(body.data))
      .finally(() => setLoading(false));
  }, [garageId, locationId, date]);

  const morning = slots.filter((s) => gstHour(s.start) < 12);
  const afternoon = slots.filter((s) => gstHour(s.start) >= 12 && gstHour(s.start) < 17);
  const evening = slots.filter((s) => gstHour(s.start) >= 17);

  function next() {
    if (!selectedStart) return;
    const params = new URLSearchParams({
      locationId,
      vehicleId,
      serviceType,
      scheduledStart: selectedStart,
    });
    router.push(`/garages/${garageId}/book/review?${params.toString()}` as never);
  }

  function SlotGroup({ title, group }: { title: string; group: Slot[] }) {
    if (group.length === 0) return null;
    return (
      <div style={{ marginBottom: "1.25rem" }}>
        <p
          style={{
            fontSize: "0.6875rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#8a92a6",
            marginBottom: "0.625rem",
          }}
        >
          {title}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {group.map((s) => {
            const selected = selectedStart === s.start;
            return (
              <button
                key={s.start}
                type="button"
                disabled={!s.available}
                onClick={() => setSelectedStart(s.start)}
                style={{
                  padding: "0.5rem 0.875rem",
                  borderRadius: "0.5rem",
                  border: selected ? "2px solid #00b8d9" : "1px solid var(--border)",
                  backgroundColor: !s.available
                    ? "#f0f2f5"
                    : selected
                      ? "rgba(0,184,217,0.1)"
                      : "#fff",
                  color: !s.available ? "#c4c6cd" : selected ? "#00b8d9" : "#081a2f",
                  fontSize: "0.8125rem",
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
      </div>
    );
  }

  return (
    <div>
      {/* Date strip */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          overflowX: "auto",
          marginBottom: "1.5rem",
          paddingBottom: "0.25rem",
        }}
      >
        {DAYS.map((d) => {
          const { weekday, day } = dayChipLabel(d);
          const active = d === date;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDate(d)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: "3.25rem",
                padding: "0.5rem 0.375rem",
                borderRadius: "0.75rem",
                border: active ? "2px solid #081a2f" : "1px solid var(--border)",
                backgroundColor: active ? "#081a2f" : "#fff",
                color: active ? "#fff" : "#081a2f",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "0.6875rem", opacity: 0.75 }}>{weekday}</span>
              <span style={{ fontSize: "1rem", fontWeight: 700 }}>{day}</span>
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#081a2f", marginBottom: "1rem" }}>
        {formatFullDate(date)}
      </p>

      {loading ? (
        <p
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8125rem",
            color: "#8a92a6",
          }}
        >
          <InlineSpinner color="#8a92a6" size={12} /> Loading availability...
        </p>
      ) : slots.length === 0 ? (
        <p style={{ fontSize: "0.8125rem", color: "#8a92a6" }}>
          This garage is closed on this day.
        </p>
      ) : (
        <>
          <SlotGroup title="MORNING" group={morning} />
          <SlotGroup title="AFTERNOON" group={afternoon} />
          <SlotGroup title="EVENING" group={evening} />
        </>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "1.5rem",
          paddingTop: "1.25rem",
          borderTop: "1px solid #ebeef1",
        }}
      >
        <Link
          href={
            `/garages/${garageId}/book/service?locationId=${locationId}&vehicleId=${vehicleId}` as never
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1.25rem",
            color: "#44474d",
            border: "1px solid #c4c6cd",
            borderRadius: "0.75rem",
            fontSize: "0.9375rem",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          <BackIcon size={15} /> Back
        </Link>
        <button
          type="button"
          onClick={next}
          disabled={!selectedStart}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1.375rem",
            backgroundColor: "#081a2f",
            color: "#fff",
            border: "none",
            borderRadius: "0.75rem",
            fontSize: "0.9375rem",
            fontWeight: 600,
            cursor: selectedStart ? "pointer" : "not-allowed",
            opacity: selectedStart ? 1 : 0.6,
          }}
        >
          Continue to Summary <ForwardIcon size={15} />
        </button>
      </div>
    </div>
  );
}
