"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Brain } from "lucide-react";

export function DiagnosticAnalyzeTrigger({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const locale = useLocale();
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/diagnostics/sessions/${sessionId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? "Analysis failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setAnalyzing(false);
    }
  }

  return (
    <div
      style={{
        padding: "2rem",
        backgroundColor: "#081a2f",
        borderRadius: "1rem",
        textAlign: "center",
      }}
    >
      <Brain size={36} color="#00b8d9" style={{ marginBottom: "1rem" }} />
      <p style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", margin: "0 0 0.5rem" }}>
        {analyzing ? "Analyzing…" : "Ready for AI Analysis"}
      </p>
      <p
        style={{
          fontSize: "0.875rem",
          color: "rgba(255,255,255,0.6)",
          margin: "0 0 1.25rem",
          lineHeight: 1.6,
        }}
      >
        {analyzing
          ? "Reviewing your symptoms against approved automotive knowledge. This takes a few seconds."
          : "Your session is ready. Run AI analysis to get ranked probable causes and next steps."}
      </p>
      {error && (
        <p style={{ fontSize: "0.8125rem", color: "#fca5a5", margin: "0 0 1rem" }}>{error}</p>
      )}
      <button
        type="button"
        onClick={() => void handleAnalyze()}
        disabled={analyzing}
        style={{
          padding: "0.625rem 1.5rem",
          backgroundColor: "#00b8d9",
          color: "#fff",
          borderRadius: "0.75rem",
          fontWeight: 600,
          fontSize: "0.9375rem",
          border: "none",
          cursor: analyzing ? "not-allowed" : "pointer",
          opacity: analyzing ? 0.6 : 1,
        }}
      >
        {analyzing ? "Analyzing…" : "Run Analysis"}
      </button>
    </div>
  );
}
