"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/routing";
import { useIsRtl } from "@/i18n/direction";
import { ChevronLeft, ChevronRight, Calendar, Car, Wrench, MapPin } from "lucide-react";

interface Props {
  garageId: string;
  locationId: string;
  vehicleId: string;
  serviceType: string;
  scheduledStart: string;
  summary: {
    garageName: string;
    locationLabel: string;
    vehicleLabel: string;
    serviceLabel: string;
  };
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.75rem",
  padding: "0.75rem 0",
  borderBottom: "1px solid #ebeef1",
};

export function ReviewForm({
  garageId,
  locationId,
  vehicleId,
  serviceType,
  scheduledStart,
  summary,
}: Props) {
  const router = useRouter();
  const isRtl = useIsRtl();
  const BackIcon = isRtl ? ChevronRight : ChevronLeft;
  const ForwardIcon = isRtl ? ChevronLeft : ChevronRight;
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          garageId,
          locationId,
          vehicleId,
          serviceType,
          scheduledStart,
          customerNotes: notes || undefined,
        }),
      });
      const body = (await res.json()) as { data?: { id: string }; error?: { message?: string } };
      if (!res.ok || !body.data) {
        toast.error(body.error?.message ?? "Failed to submit booking request.");
        return;
      }
      toast.success("Booking request submitted.");
      router.push(`/garages/${garageId}/book/confirmation/${body.data.id}` as never);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "0.875rem",
          padding: "0.25rem 1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={row}>
          <Wrench size={16} color="#00b8d9" style={{ marginTop: "0.125rem" }} />
          <div>
            <p style={{ fontSize: "0.75rem", color: "#8a92a6", margin: "0 0 0.125rem" }}>Service</p>
            <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#081a2f", margin: 0 }}>
              {summary.serviceLabel}
            </p>
          </div>
        </div>
        <div style={row}>
          <Car size={16} color="#00b8d9" style={{ marginTop: "0.125rem" }} />
          <div>
            <p style={{ fontSize: "0.75rem", color: "#8a92a6", margin: "0 0 0.125rem" }}>Vehicle</p>
            <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#081a2f", margin: 0 }}>
              {summary.vehicleLabel}
            </p>
          </div>
        </div>
        <div style={row}>
          <MapPin size={16} color="#00b8d9" style={{ marginTop: "0.125rem" }} />
          <div>
            <p style={{ fontSize: "0.75rem", color: "#8a92a6", margin: "0 0 0.125rem" }}>
              Service Center
            </p>
            <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#081a2f", margin: 0 }}>
              {summary.garageName}
            </p>
            <p style={{ fontSize: "0.8125rem", color: "#5b6472", margin: 0 }}>
              {summary.locationLabel}
            </p>
          </div>
        </div>
        <div style={{ ...row, borderBottom: "none" }}>
          <Calendar size={16} color="#00b8d9" style={{ marginTop: "0.125rem" }} />
          <div>
            <p style={{ fontSize: "0.75rem", color: "#8a92a6", margin: "0 0 0.125rem" }}>
              Date & Time
            </p>
            <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#081a2f", margin: 0 }}>
              {formatDateTime(scheduledStart)} (GST)
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "block",
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "#081a2f",
            marginBottom: "0.5rem",
          }}
        >
          Additional Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe the issue or anything the garage should know before your visit..."
          maxLength={1000}
          style={{
            width: "100%",
            minHeight: "6rem",
            padding: "0.75rem",
            border: "1px solid var(--border)",
            borderRadius: "0.625rem",
            fontSize: "0.875rem",
            boxSizing: "border-box",
            fontFamily: "inherit",
            resize: "vertical",
          }}
        />
      </div>

      <div
        style={{
          padding: "0.75rem 1rem",
          backgroundColor: "#f7fafd",
          borderRadius: "0.625rem",
          fontSize: "0.8125rem",
          color: "#5b6472",
          marginBottom: "1.5rem",
        }}
      >
        This is a booking <strong>request</strong> — the garage will confirm, propose a new time, or
        decline. You can cancel for free any time before it's confirmed.
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "1.25rem",
          borderTop: "1px solid #ebeef1",
        }}
      >
        <Link
          href={
            `/garages/${garageId}/book/schedule?locationId=${locationId}&vehicleId=${vehicleId}&serviceType=${serviceType}` as never
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
          <BackIcon size={15} /> Back to Selection
        </Link>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
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
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Submitting..." : "Submit Booking Request"} <ForwardIcon size={15} />
        </button>
      </div>
    </div>
  );
}
