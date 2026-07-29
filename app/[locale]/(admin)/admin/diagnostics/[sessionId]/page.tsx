import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { hasPermission } from "@/features/auth/rbac";
import { PERMISSIONS } from "@/features/auth/permissions";
import { Link } from "@/i18n/routing";
import { isRtlLocale } from "@/i18n/direction";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { getSessionForAdmin } from "@/features/diagnostics/service";
import { getCitationDocuments } from "@/features/knowledge/service";
import { DiagnosticResultView } from "@/components/diagnostics/diagnostic-result-view";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function AdminDiagnosticSessionPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!hasPermission(session.user.role, PERMISSIONS.ADMIN_DIAGNOSTICS_MANAGE))
    redirect("/dashboard");

  const { sessionId } = await params;
  const diagSession = await getSessionForAdmin(sessionId);
  const citations = diagSession.result
    ? await getCitationDocuments(diagSession.result.knowledgeDocumentIds)
    : [];
  const BackIcon = isRtlLocale(await getLocale()) ? ChevronRight : ChevronLeft;

  return (
    <div className="px-4 py-6 sm:px-10 sm:py-8" style={{ maxWidth: "820px" }}>
      <Link
        href="/admin/diagnostics"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          fontSize: "0.875rem",
          color: "#44474d",
          textDecoration: "none",
          marginBottom: "1.5rem",
        }}
      >
        <BackIcon size={14} /> Diagnostic Feedback
      </Link>

      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.375rem" }}
      >
        {diagSession.vehicle.year} {diagSession.vehicle.makeName} {diagSession.vehicle.modelName}
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#74777d", marginBottom: "1.5rem" }}>
        {diagSession.category.label}
        {diagSession.symptom ? ` · ${diagSession.symptom.label}` : ""} · Session{" "}
        {diagSession.id.slice(0, 8).toUpperCase()}
      </p>

      {diagSession.feedback && (
        <div
          style={{
            padding: "1.25rem 1.5rem",
            backgroundColor: "#fff7ed",
            border: "1px solid #fdba74",
            borderRadius: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", gap: "2px", marginBottom: "0.625rem" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={16}
                color="#d97706"
                fill={i < diagSession.feedback!.rating ? "#d97706" : "none"}
              />
            ))}
          </div>
          {diagSession.feedback.comment && (
            <p style={{ fontSize: "0.9375rem", color: "#181c1e", fontStyle: "italic", margin: 0 }}>
              &ldquo;{diagSession.feedback.comment}&rdquo;
            </p>
          )}
        </div>
      )}

      {diagSession.description && (
        <div
          style={{
            padding: "1.25rem 1.5rem",
            backgroundColor: "#fff",
            border: "1px solid #ebeef1",
            borderRadius: "1rem",
            marginBottom: "1rem",
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
            {diagSession.description}
          </p>
        </div>
      )}

      {diagSession.answers.length > 0 && (
        <div
          style={{
            padding: "1.25rem 1.5rem",
            backgroundColor: "#fff",
            border: "1px solid #ebeef1",
            borderRadius: "1rem",
            marginBottom: "1rem",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#74777d",
              letterSpacing: "0.06em",
              margin: "0 0 1rem",
            }}
          >
            QUESTIONNAIRE ANSWERS ({diagSession.answers.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {diagSession.answers.map((answer) => (
              <div key={answer.id}>
                <p style={{ fontSize: "0.8125rem", color: "#44474d", margin: "0 0 0.25rem" }}>
                  {answer.question.text}
                </p>
                <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#081a2f", margin: 0 }}>
                  {String(answer.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {diagSession.result && (
        <>
          <DiagnosticResultView result={diagSession.result} citations={citations} />
          {diagSession.result.garageSummary && (
            <div
              style={{
                padding: "1.25rem 1.5rem",
                backgroundColor: "#f1f4f7",
                borderRadius: "1rem",
                marginTop: "1rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#5b6472",
                  letterSpacing: "0.06em",
                  margin: "0 0 0.625rem",
                }}
              >
                GARAGE TECHNICAL BRIEF
              </p>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#181c1e",
                  margin: 0,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {diagSession.result.garageSummary}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
