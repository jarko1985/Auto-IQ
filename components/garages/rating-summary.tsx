import { Star } from "lucide-react";

interface Props {
  averageRating: number;
  reviewCount: number;
  size?: number;
}

/** Shared "★ 4.2 (11)" rating badge — reused by the search result card and
 * the garage profile page, per CLAUDE.md's Sprint 21 notes. Renders a
 * distinct "No reviews yet" state rather than a misleading "★ 0.0". */
export function RatingSummary({ averageRating, reviewCount, size = 13 }: Props) {
  if (reviewCount === 0) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.3rem",
          fontSize: "0.75rem",
          color: "#a1a5ab",
        }}
      >
        <Star size={size} color="#d1d5db" />
        No reviews yet
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        fontSize: "0.75rem",
        color: "#44474d",
      }}
    >
      <Star size={size} color="#d97706" fill="#d97706" />
      <strong style={{ color: "#081a2f", fontWeight: 700 }}>{averageRating.toFixed(1)}</strong>
      <span>
        ({reviewCount} review{reviewCount === 1 ? "" : "s"})
      </span>
    </span>
  );
}
