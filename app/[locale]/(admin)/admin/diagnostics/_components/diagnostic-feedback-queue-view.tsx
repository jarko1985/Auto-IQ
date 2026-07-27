"use client";

import { useState } from "react";
import { Star, MessageCircle, Flag, Meh } from "lucide-react";
import { Link } from "@/i18n/routing";

interface FeedbackItem {
  id: string;
  sessionId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  vehicleLabel: string;
  symptomLabel: string;
  isDegraded: boolean;
  aiProvider: string | null;
  aiModel: string | null;
  topCauseLabel: string | null;
}

interface Props {
  initialFeedback: FeedbackItem[];
  initialTotal: number;
  initialMaxRating: number | null;
}

const RATING_FILTERS: { label: string; value: number | null }[] = [
  { label: "Show: 1–3 Stars (Low ratings)", value: 3 },
  { label: "Show: 1–2 Stars", value: 2 },
  { label: "Show: 1 Star", value: 1 },
  { label: "Show: All Ratings", value: null },
];

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: "1px", color: "#d97706" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={16} fill={i < rating ? "#d97706" : "none"} strokeWidth={1.75} />
      ))}
    </div>
  );
}

export function DiagnosticFeedbackQueueView({
  initialFeedback,
  initialTotal,
  initialMaxRating,
}: Props) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [total, setTotal] = useState(initialTotal);
  const [maxRating, setMaxRating] = useState<number | null>(initialMaxRating);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function applyFilter(next: number | null) {
    setMaxRating(next);
    setLoading(true);
    try {
      const qs = next != null ? `?maxRating=${next}&limit=20&offset=0` : "?limit=20&offset=0";
      const res = await fetch(`/api/v1/admin/diagnostics/feedback${qs}`);
      if (!res.ok) return;
      const body = (await res.json()) as {
        data: Array<{
          id: string;
          sessionId: string;
          rating: number;
          comment: string | null;
          createdAt: string;
          session: {
            vehicle: { year: number; makeName: string; modelName: string };
            category: { label: string };
            symptom: { label: string } | null;
            result: {
              isDegraded: boolean;
              aiProvider: string | null;
              aiModel: string | null;
              causes: { label: string }[];
            } | null;
          };
        }>;
        meta: { total: number };
      };
      setFeedback(
        body.data.map((f) => ({
          id: f.id,
          sessionId: f.sessionId,
          rating: f.rating,
          comment: f.comment,
          createdAt: f.createdAt,
          vehicleLabel: `${f.session.vehicle.year} ${f.session.vehicle.makeName} ${f.session.vehicle.modelName}`,
          symptomLabel: f.session.symptom?.label ?? f.session.category.label,
          isDegraded: f.session.result?.isDegraded ?? false,
          aiProvider: f.session.result?.aiProvider ?? null,
          aiModel: f.session.result?.aiModel ?? null,
          topCauseLabel: f.session.result?.causes[0]?.label ?? null,
        })),
      );
      setTotal(body.meta.total);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.375rem 0.875rem",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            borderRadius: "9999px",
            fontSize: "0.8125rem",
            fontWeight: 700,
          }}
        >
          <Flag size={14} /> {total} Flagged
        </div>

        <select
          value={maxRating ?? "all"}
          onChange={(e) => void applyFilter(e.target.value === "all" ? null : Number(e.target.value))}
          disabled={loading}
          style={{
            padding: "0.5rem 0.875rem",
            border: "1px solid var(--border)",
            borderRadius: "0.625rem",
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "#081a2f",
            backgroundColor: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {RATING_FILTERS.map((f) => (
            <option key={f.label} value={f.value ?? "all"}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {feedback.length === 0 ? (
        <div
          style={{
            padding: "4rem 2rem",
            textAlign: "center",
            border: "1px dashed var(--border)",
            borderRadius: "1rem",
          }}
        >
          <div
            style={{
              width: "4rem",
              height: "4rem",
              margin: "0 auto 1.25rem",
              borderRadius: "50%",
              backgroundColor: "#f1f4f7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Meh size={28} color="#8a92a6" />
          </div>
          <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#081a2f", margin: "0 0 0.5rem" }}>
            No feedback matches this filter
          </h4>
          <p style={{ fontSize: "0.8125rem", color: "#8a92a6", maxWidth: "320px", margin: "0 auto" }}>
            All low-rated diagnostic feedback has been reviewed for this filter.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {feedback.map((f) => {
            const expanded = expandedId === f.id;
            return (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  border: "1px solid var(--border)",
                  borderRadius: "0.875rem",
                  overflow: "hidden",
                  backgroundColor: "#fff",
                }}
              >
                <div
                  style={{ width: "6px", backgroundColor: f.rating <= 2 ? "#d97706" : "#c4c6cd" }}
                />
                <div style={{ flex: 1, padding: "1.25rem 1.5rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                      marginBottom: "0.875rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                      <StarRating rating={f.rating} />
                      <span style={{ fontSize: "0.75rem", color: "#8a92a6" }}>
                        {relativeTime(f.createdAt)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {f.aiProvider && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "#5b6472",
                            backgroundColor: "#f1f4f7",
                            borderRadius: "0.5rem",
                            padding: "0.25rem 0.625rem",
                          }}
                        >
                          {f.aiProvider}
                          {f.aiModel ? ` · ${f.aiModel}` : ""}
                        </span>
                      )}
                      {f.isDegraded && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "#991b1b",
                            backgroundColor: "#fee2e2",
                            borderRadius: "0.5rem",
                            padding: "0.25rem 0.625rem",
                          }}
                        >
                          Degraded
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                      marginBottom: "0.875rem",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          color: "#8a92a6",
                          letterSpacing: "0.05em",
                          margin: "0 0 0.25rem",
                        }}
                      >
                        VEHICLE
                      </p>
                      <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
                        {f.vehicleLabel}
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          color: "#8a92a6",
                          letterSpacing: "0.05em",
                          margin: "0 0 0.25rem",
                        }}
                      >
                        SYMPTOM
                      </p>
                      <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#081a2f", margin: 0 }}>
                        {f.symptomLabel}
                      </p>
                    </div>
                  </div>

                  {f.comment && (
                    <div
                      style={{
                        padding: "0.875rem 1rem",
                        backgroundColor: "#f1f4f7",
                        borderRadius: "0.75rem",
                        marginBottom: "0.875rem",
                      }}
                    >
                      <p
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          fontSize: "0.75rem",
                          color: "#8a92a6",
                          margin: "0 0 0.25rem",
                        }}
                      >
                        <MessageCircle size={13} /> Customer Comment
                      </p>
                      <p style={{ fontSize: "0.875rem", color: "#181c1e", fontStyle: "italic", margin: 0 }}>
                        &ldquo;{f.comment}&rdquo;
                      </p>
                    </div>
                  )}

                  {expanded && f.topCauseLabel && (
                    <div
                      style={{
                        padding: "0.75rem 1rem",
                        border: "1px dashed var(--border)",
                        borderRadius: "0.75rem",
                        marginBottom: "0.875rem",
                        fontSize: "0.8125rem",
                        color: "#5b6472",
                      }}
                    >
                      Top AI-ranked cause: <strong style={{ color: "#081a2f" }}>{f.topCauseLabel}</strong>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : f.id)}
                      style={{
                        padding: "0.5rem 1.125rem",
                        backgroundColor: "transparent",
                        color: "#5b6472",
                        border: "1px solid var(--border)",
                        borderRadius: "0.625rem",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {expanded ? "Hide Details" : "Investigate"}
                    </button>
                    <Link
                      href={`/admin/diagnostics/${f.sessionId}` as never}
                      style={{
                        padding: "0.5rem 1.125rem",
                        backgroundColor: "#081a2f",
                        color: "#fff",
                        borderRadius: "0.625rem",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      View Session
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
