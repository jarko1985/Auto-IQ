"use client";

import { useState } from "react";
import { Star, CheckCircle2 } from "lucide-react";

interface Props {
  repairOrderId: string;
  alreadyReviewed: boolean;
}

/** Mirrors DiagnosticFeedbackForm's exact shape (1-5 stars + optional
 * comment, read-only once submitted) — rendered only when
 * customerVerifiedOutcomeAt !== null on the repair order detail page. */
export function RateGarageForm({ repairOrderId, alreadyReviewed }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(alreadyReviewed);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (rating < 1) {
      setError("Please select a rating.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/repair-orders/${repairOrderId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment || undefined }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? "Failed to submit review");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        style={{
          backgroundColor: "#fff",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          marginBottom: "1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
        }}
      >
        <CheckCircle2 size={18} color="#16a34a" />
        <p style={{ fontSize: "0.875rem", color: "#181c1e", margin: 0 }}>
          Thanks for rating this garage.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid var(--border)",
        borderRadius: "0.75rem",
        padding: "1.5rem",
        marginBottom: "1.25rem",
      }}
    >
      <h3
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          color: "#081a2f",
          marginTop: 0,
          marginBottom: "0.75rem",
        }}
      >
        Rate this garage
      </h3>
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.75rem" }}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            aria-label={`Rate ${value} out of 5`}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "0.125rem" }}
          >
            <Star
              size={22}
              color={value <= rating ? "#d97706" : "#d1d5db"}
              fill={value <= rating ? "#d97706" : "none"}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment"
        maxLength={1000}
        rows={3}
        style={{
          width: "100%",
          padding: "0.625rem 0.75rem",
          border: "1px solid var(--border)",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          fontFamily: "inherit",
          resize: "vertical",
          marginBottom: "0.75rem",
          boxSizing: "border-box",
        }}
      />
      {error && (
        <p style={{ fontSize: "0.8125rem", color: "#dc2626", margin: "0 0 0.75rem" }}>{error}</p>
      )}
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={submitting}
        style={{
          padding: "0.5rem 1.125rem",
          backgroundColor: "#00b8d9",
          color: "#fff",
          borderRadius: "0.5rem",
          fontWeight: 600,
          fontSize: "0.875rem",
          border: "none",
          cursor: submitting ? "not-allowed" : "pointer",
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? "Submitting…" : "Submit Rating"}
      </button>
    </div>
  );
}
