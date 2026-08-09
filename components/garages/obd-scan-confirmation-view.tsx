"use client";

import { CheckCircle2 } from "lucide-react";

interface Props {
  garageName: string;
  scheduledStart: string;
  onClose: () => void;
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

export function ObdScanConfirmationView({ garageName, scheduledStart, onClose }: Props) {
  return (
    <div style={{ textAlign: "center", padding: "1.5rem 0.5rem" }}>
      <div
        style={{
          width: "3.5rem",
          height: "3.5rem",
          borderRadius: "9999px",
          backgroundColor: "rgba(0,184,217,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 1rem",
        }}
      >
        <CheckCircle2 size={30} color="#00b8d9" />
      </div>
      <h3 style={{ margin: "0 0 0.375rem", fontSize: "1.1875rem", fontWeight: 700, color: "#081a2f" }}>
        Booking Requested
      </h3>
      <p style={{ margin: "0 0 1.5rem", fontSize: "0.875rem", color: "#5b6472" }}>
        Your OBD scan request has been sent to <strong>{garageName}</strong>. They'll confirm, propose
        a new time, or decline — you can track this from My Bookings.
      </p>

      <div
        style={{
          padding: "1rem 1.25rem",
          backgroundColor: "#f7fafd",
          borderRadius: "0.875rem",
          marginBottom: "1.5rem",
          textAlign: "start",
        }}
      >
        <p style={{ margin: "0 0 0.125rem", fontSize: "0.75rem", color: "#8a92a6" }}>Date & Time</p>
        <p style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600, color: "#081a2f" }}>
          {formatDateTime(scheduledStart)} (GST)
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        style={{
          padding: "0.625rem 1.5rem",
          borderRadius: "0.625rem",
          border: "none",
          backgroundColor: "#081a2f",
          color: "#fff",
          fontSize: "0.9375rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Done
      </button>
    </div>
  );
}
