import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { isRtlLocale } from "@/i18n/direction";
import { db } from "@/lib/db";
import {
  ChevronLeft,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Brain,
  Car,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { DiagnosticResultView } from "@/components/diagnostics/diagnostic-result-view";
import { DiagnosticFeedbackForm } from "@/components/diagnostics/diagnostic-feedback-form";
import { DiagnosticAnalyzeTrigger } from "@/components/diagnostics/diagnostic-analyze-trigger";
import { DownloadPdfButton } from "@/components/diagnostics/download-pdf-button";
import { ShareResultsButton } from "@/components/diagnostics/share-results-button";
import { getCitationDocuments } from "@/features/knowledge/service";
import { getRecommendedGarages } from "@/features/diagnostics/service";

const STATUS_META = {
  DRAFT: { label: "Draft", color: "#74777d", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "#0891b2", icon: Clock },
  AWAITING_AI: { label: "Awaiting AI", color: "#d97706", icon: Brain },
  COMPLETE: { label: "Complete", color: "#16a34a", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "#74777d", icon: XCircle },
  SAFETY_ESCALATED: { label: "Safety Alert", color: "#dc2626", icon: AlertTriangle },
} as const;

const cardStyle = {
  padding: "1.25rem 1.5rem",
  backgroundColor: "#fff",
  border: "1px solid #ebeef1",
  borderRadius: "1rem",
} as const;

const sectionLabelStyle = {
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "#74777d",
  letterSpacing: "0.06em",
  margin: 0,
} as const;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DiagnosticSessionPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in" as never);

  const { id } = await params;
  const isRtl = isRtlLocale(await getLocale());
  const BackIcon = isRtl ? ChevronRight : ChevronLeft;
  const ForwardIcon = isRtl ? ChevronLeft : ChevronRight;

  const diagSession = await db.diagnosticSession.findFirst({
    where: { id, userId: session.user.id },
    include: {
      vehicle: { select: { makeName: true, modelName: true, year: true, plateNumber: true } },
      category: { select: { code: true, label: true, iconName: true } },
      symptom: { select: { label: true, isSafetyCritical: true } },
      _count: { select: { answers: true } },
      result: { include: { causes: { orderBy: { rank: "asc" } } } },
      feedback: { select: { id: true } },
      attachments: {
        orderBy: { createdAt: "asc" },
        select: { id: true, filename: true, mimeType: true, sizeBytes: true },
      },
    },
  });

  if (!diagSession) redirect("/diagnostics" as never);

  const citations = diagSession.result
    ? await getCitationDocuments(diagSession.result.knowledgeDocumentIds)
    : [];

  const recommendedGarages =
    diagSession.status === "COMPLETE" && diagSession.result
      ? await getRecommendedGarages(diagSession.id, session.user.id).catch(() => null)
      : null;

  const meta = STATUS_META[diagSession.status as keyof typeof STATUS_META] ?? STATUS_META.DRAFT;
  const Icon = meta.icon;
  const isResumable = diagSession.status === "DRAFT" || diagSession.status === "IN_PROGRESS";
  const isComplete = diagSession.status === "COMPLETE" && diagSession.result != null;

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-8" style={{ maxWidth: "1440px" }}>
      {/* Back link */}
      <Link
        href="/diagnostics"
        className="no-print"
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
        <BackIcon size={14} /> All Sessions
      </Link>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        <div>
          <h1
            className="text-fluid-page-title break-words"
            style={{
              fontWeight: 700,
              color: "#081a2f",
              margin: "0 0 0.375rem",
              letterSpacing: "-0.02em",
            }}
          >
            {diagSession.vehicle.year} {diagSession.vehicle.makeName}{" "}
            {diagSession.vehicle.modelName}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: meta.color,
                backgroundColor: `${meta.color}18`,
                borderRadius: "9999px",
                padding: "0.25rem 0.625rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <Icon size={11} /> {meta.label}
            </span>
            <span style={{ fontSize: "0.8125rem", color: "#74777d" }}>
              {diagSession.category.label}
              {diagSession.symptom ? ` · ${diagSession.symptom.label}` : ""}
            </span>
            <span style={{ fontSize: "0.8125rem", color: "#74777d" }}>
              {new Date(diagSession.createdAt).toLocaleDateString("en-AE", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          {isComplete && (
            <>
              <DownloadPdfButton />
              <ShareResultsButton sessionId={diagSession.id} />
            </>
          )}
          {isResumable && (
            <Link
              href={`/diagnostics/new?session=${diagSession.id}` as never}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.625rem 1.25rem",
                backgroundColor: "#00b8d9",
                color: "#fff",
                borderRadius: "0.75rem",
                fontWeight: 600,
                fontSize: "0.9375rem",
                textDecoration: "none",
              }}
            >
              Resume <ForwardIcon size={15} />
            </Link>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Context strip — description / vehicle / session details side by side,
            using the full page width instead of a cramped single column. */}
        <div
          className={`grid grid-cols-1 items-stretch gap-5 ${
            diagSession.description || diagSession.attachments.length > 0
              ? "lg:grid-cols-[2fr_1fr_1fr]"
              : "lg:grid-cols-2"
          }`}
        >
          {(diagSession.description || diagSession.attachments.length > 0) && (
            <div style={{ ...cardStyle, display: "flex", flexDirection: "column" }}>
              <p
                style={{
                  ...sectionLabelStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4375rem",
                  marginBottom: "0.875rem",
                }}
              >
                <FileText size={13} color="#74777d" /> ISSUE DESCRIPTION
              </p>
              <p style={{ fontSize: "1.0625rem", color: "#181c1e", margin: 0, lineHeight: 1.75 }}>
                {diagSession.description ?? "No written description was provided for this session."}
              </p>

              <div
                style={{
                  marginTop: "1rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.375rem 0.75rem",
                  backgroundColor: "#f1f4f7",
                  borderRadius: "0.5rem",
                  alignSelf: "flex-start",
                }}
              >
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0891b2" }}>OBD</span>
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: diagSession.obdCode ? "#181c1e" : "#a1a5ab",
                    fontFamily: diagSession.obdCode ? "monospace" : "inherit",
                  }}
                >
                  {diagSession.obdCode ?? "No OBD code reported"}
                </span>
              </div>

              {diagSession.attachments.length > 0 && (
                <div style={{ marginTop: "1.25rem" }}>
                  <p
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      color: "#74777d",
                      letterSpacing: "0.06em",
                      margin: "0 0 0.625rem",
                    }}
                  >
                    PHOTOS &amp; VIDEOS ({diagSession.attachments.length})
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem" }}>
                    {diagSession.attachments.map((attachment) => {
                      const isVideo = attachment.mimeType.startsWith("video/");
                      return (
                        <div
                          key={attachment.id}
                          title={attachment.filename}
                          style={{
                            width: "5rem",
                            height: "5rem",
                            borderRadius: "0.5rem",
                            overflow: "hidden",
                            border: "1px solid #ebeef1",
                            backgroundColor: "#f1f4f7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isVideo ? (
                            <Video size={20} color="#74777d" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/v1/diagnostics/sessions/${diagSession.id}/attachments/${attachment.id}/file`}
                              alt={attachment.filename}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "#00b8d9",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      margin: "0.75rem 0 0",
                    }}
                  >
                    <ImageIcon size={13} /> Analyzed by AI alongside your description
                  </p>
                </div>
              )}

              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#a1a5ab",
                  margin: 0,
                  marginTop: "auto",
                  paddingTop: "1.25rem",
                  borderTop: "1px solid #f1f4f7",
                }}
              >
                Reported on{" "}
                {new Date(diagSession.createdAt).toLocaleDateString("en-AE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          )}

          <div style={cardStyle}>
            <p style={{ ...sectionLabelStyle, marginBottom: "0.75rem" }}>VEHICLE</p>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
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
                <p
                  style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#081a2f", margin: "0 0 0.125rem" }}
                >
                  {diagSession.vehicle.year} {diagSession.vehicle.makeName}{" "}
                  {diagSession.vehicle.modelName}
                </p>
                {diagSession.vehicle.plateNumber && (
                  <p style={{ fontSize: "0.75rem", color: "#74777d", margin: 0 }}>
                    {diagSession.vehicle.plateNumber}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <p style={{ ...sectionLabelStyle, marginBottom: "0.75rem" }}>SESSION DETAILS</p>
            {[
              { label: "Session ID", value: diagSession.id.slice(0, 8).toUpperCase() },
              { label: "Category", value: diagSession.category.label },
              { label: "Answers", value: `${diagSession._count.answers} recorded` },
              {
                label: "Created",
                value: new Date(diagSession.createdAt).toLocaleDateString("en-AE"),
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}
              >
                <span style={{ fontSize: "0.8125rem", color: "#74777d" }}>{label}</span>
                <span style={{ fontSize: "0.8125rem", color: "#181c1e", fontWeight: 500 }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI analysis trigger — SAFETY_ESCALATED sessions are analyzable too */}
        {(diagSession.status === "AWAITING_AI" || diagSession.status === "SAFETY_ESCALATED") &&
          !diagSession.result && <DiagnosticAnalyzeTrigger sessionId={diagSession.id} />}

        {/* AI results */}
        {isComplete && diagSession.result && (
          <>
            <DiagnosticResultView
              result={diagSession.result}
              citations={citations}
              recommendedGarages={
                recommendedGarages
                  ? {
                      garages: recommendedGarages.garages.map((g) => {
                        const primaryLocation = g.organization.garageLocations[0];
                        return {
                          id: g.id,
                          businessName: g.businessName,
                          emirate: primaryLocation?.emirate ?? null,
                          addressLine1: primaryLocation?.addressLine1 ?? null,
                          latitude: primaryLocation?.latitude ?? null,
                          longitude: primaryLocation?.longitude ?? null,
                          primaryLocationId: primaryLocation?.id ?? null,
                          services: g.services.map((s) => s.serviceType),
                          makeNames: g.makeSpecializations.map((m) => m.make.name),
                          averageRating: g.averageRating,
                          reviewCount: g.reviewCount,
                          distanceKm: g.distanceKm,
                        };
                      }),
                      deepLinkQuery: recommendedGarages.deepLinkQuery,
                    }
                  : undefined
              }
            />
            <DiagnosticFeedbackForm
              sessionId={diagSession.id}
              alreadySubmitted={diagSession.feedback !== null}
            />
          </>
        )}

        {diagSession.status === "SAFETY_ESCALATED" && diagSession.emergencyAction && (
          <div
            style={{
              padding: "1.25rem 1.5rem",
              backgroundColor: "#fee2e2",
              border: "1.5px solid #fca5a5",
              borderRadius: "1rem",
            }}
          >
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#991b1b", margin: "0 0 0.375rem" }}>
                  Safety Alert — Immediate Action Required
                </p>
                <p style={{ fontSize: "0.875rem", color: "#7f1d1d", margin: 0, lineHeight: 1.6 }}>
                  {diagSession.emergencyAction}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
