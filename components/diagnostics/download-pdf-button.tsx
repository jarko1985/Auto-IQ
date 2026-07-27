"use client";

import { Download } from "lucide-react";

interface Props {
  variant?: "solid" | "outline";
}

/** Print-to-PDF, matching the existing Invoice Detail page's precedent
 * (Sprint 13) — no new dependency. A print stylesheet (app/globals.css)
 * hides portal chrome (sidebar/topbar/this button itself/action buttons) so
 * only the diagnostic report content prints; the user picks "Save as PDF" in
 * their browser's own print dialog. */
export function DownloadPdfButton({ variant = "outline" }: Props) {
  const solid = variant === "solid";
  return (
    <button
      type="button"
      className="no-print"
      onClick={() => window.print()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 1rem",
        borderRadius: "0.625rem",
        border: solid ? "none" : "1px solid #d7dce1",
        backgroundColor: solid ? "#081a2f" : "#fff",
        color: solid ? "#fff" : "#081a2f",
        fontSize: "0.8125rem",
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <Download size={14} /> Download PDF Report
    </button>
  );
}
