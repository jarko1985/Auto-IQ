import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Car } from "lucide-react";
import { NotFoundError } from "@/lib/errors";
import { getSharedDiagnosticResult } from "@/features/diagnostics/service";
import { DiagnosticResultView } from "@/components/diagnostics/diagnostic-result-view";
import { DownloadPdfButton } from "@/components/diagnostics/download-pdf-button";

interface Props {
  params: Promise<{ token: string; locale: string }>;
}

/**
 * Public, unauthenticated read-only view of a shared diagnostic report
 * (Sprint 21.1 — Share Results). Deliberately a plain top-level route (same
 * pattern as app/[locale]/invitations/[token]/page.tsx) rather than nested
 * under any auth-gated portal layout — no sidebar/topbar, own minimal
 * branded header instead.
 */
export default async function SharedDiagnosticPage({ params }: Props) {
  const { token, locale } = await params;

  let shared: Awaited<ReturnType<typeof getSharedDiagnosticResult>>;
  try {
    shared = await getSharedDiagnosticResult(token);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const { session, citations } = shared;

  if (!session.result) {
    // Should not happen (links are only ever minted for COMPLETE sessions),
    // but a link surviving a session somehow left incomplete shouldn't crash.
    notFound();
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f7fafd" }}>
      <header
        className="no-print"
        style={{
          borderBottom: "1px solid #ebeef1",
          backgroundColor: "#fff",
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href={`/${locale}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "0.5rem",
              backgroundColor: "#081a2f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={16} color="#00b8d9" />
          </div>
          <span style={{ fontSize: "1rem", fontWeight: 800, color: "#081a2f" }}>AutoIQ UAE</span>
        </Link>
        <DownloadPdfButton />
      </header>

      <div className="px-4 py-6 sm:px-6 sm:py-8" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1rem",
            backgroundColor: "#e0f7fa",
            border: "1px solid rgba(8,145,178,0.2)",
            borderRadius: "0.75rem",
            marginBottom: "1.5rem",
            fontSize: "0.8125rem",
            color: "#0891b2",
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={15} /> You're viewing a shared, read-only AutoIQ diagnostic report.
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1.75rem",
          }}
        >
          <div
            style={{
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "0.75rem",
              background: "linear-gradient(135deg, #0f2744, #1a3a5c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Car size={16} color="rgba(255,255,255,0.6)" />
          </div>
          <div>
            <h1
              style={{
                fontSize: "1.375rem",
                fontWeight: 800,
                color: "#081a2f",
                margin: "0 0 0.125rem",
                letterSpacing: "-0.02em",
              }}
            >
              {session.vehicle.year} {session.vehicle.makeName} {session.vehicle.modelName}
            </h1>
            <p style={{ fontSize: "0.8125rem", color: "#74777d", margin: 0 }}>
              {session.category.label}
              {session.symptom ? ` · ${session.symptom.label}` : ""} ·{" "}
              {new Date(session.createdAt).toLocaleDateString("en-AE", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {session.description && (
          <div
            style={{
              padding: "1.25rem 1.5rem",
              backgroundColor: "#fff",
              border: "1px solid #ebeef1",
              borderRadius: "1rem",
              marginBottom: "1.25rem",
            }}
          >
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#74777d",
                letterSpacing: "0.06em",
                margin: "0 0 0.625rem",
              }}
            >
              ISSUE DESCRIPTION
            </p>
            <p style={{ fontSize: "0.9375rem", color: "#181c1e", margin: 0, lineHeight: 1.65 }}>
              {session.description}
            </p>
          </div>
        )}

        <DiagnosticResultView result={session.result} citations={citations} />

        <div
          className="no-print"
          style={{
            marginTop: "2rem",
            padding: "1.5rem",
            textAlign: "center",
            borderRadius: "1rem",
            border: "1px dashed #d7dce1",
          }}
        >
          <p style={{ fontSize: "0.875rem", color: "#5b6472", margin: "0 0 0.75rem" }}>
            Want AI-powered diagnostics for your own vehicle?
          </p>
          <Link
            href={`/${locale}/sign-up`}
            style={{
              display: "inline-flex",
              padding: "0.625rem 1.5rem",
              backgroundColor: "#081a2f",
              color: "#fff",
              borderRadius: "0.625rem",
              fontWeight: 700,
              fontSize: "0.875rem",
              textDecoration: "none",
            }}
          >
            Get Started with AutoIQ
          </Link>
        </div>
      </div>
    </div>
  );
}
