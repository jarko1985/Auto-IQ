import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { isRtlLocale } from "@/i18n/direction";
import { db } from "@/lib/db";
import {
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const STATUS_META = {
  DRAFT: { label: "Draft", color: "#74777d", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "#0891b2", icon: Clock },
  AWAITING_AI: { label: "Awaiting AI", color: "#d97706", icon: Clock },
  COMPLETE: { label: "Complete", color: "#16a34a", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "#74777d", icon: XCircle },
  SAFETY_ESCALATED: { label: "Safety Alert", color: "#dc2626", icon: AlertTriangle },
} as const;

const SEVERITY_META = {
  LOW: { key: "severityBadgeLow", color: "#16a34a" },
  MEDIUM: { key: "severityBadgeModerate", color: "#d97706" },
  HIGH: { key: "severityBadgeHigh", color: "#ea580c" },
  CRITICAL: { key: "severityBadgeCritical", color: "#dc2626" },
} as const;

export default async function DiagnosticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const t = await getTranslations("Diagnostics");
  const ForwardIcon = isRtlLocale(await getLocale()) ? ChevronLeft : ChevronRight;

  const sessions = await db.diagnosticSession.findMany({
    where: { userId: session.user.id },
    include: {
      vehicle: { select: { makeName: true, modelName: true, year: true } },
      category: { select: { label: true, iconName: true } },
      symptom: { select: { label: true } },
      result: { select: { severity: true, safeToDrive: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10" style={{ maxWidth: "900px" }}>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-fluid-page-title break-words" style={{ fontWeight: 700, color: "#081a2f", margin: "0 0 0.25rem" }}>
            {t("title")}
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "#44474d", margin: 0 }}>{t("subtitle")}</p>
        </div>
        <Link
          href="/diagnostics/new"
          className="self-start sm:self-auto"
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
          <Plus size={17} />
          {t("newDiagnosis")}
        </Link>
      </div>

      {sessions.length === 0 ? (
        /* Empty state */
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            backgroundColor: "#fff",
            borderRadius: "1rem",
            border: "1px solid #ebeef1",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "#081a2f",
              margin: "0 0 0.5rem",
            }}
          >
            {t("noSessions")}
          </h2>
          <p style={{ fontSize: "0.9375rem", color: "#44474d", margin: "0 0 1.5rem" }}>
            {t("noSessionsDesc")}
          </p>
          <Link
            href="/diagnostics/new"
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
            <Plus size={17} />
            {t("startFirst")}
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {sessions.map((s) => {
            const meta = STATUS_META[s.status as keyof typeof STATUS_META] ?? STATUS_META.DRAFT;
            const Icon = meta.icon;
            const isResumable = s.status === "DRAFT" || s.status === "IN_PROGRESS";
            return (
              <Link
                key={s.id}
                href={
                  isResumable
                    ? (`/diagnostics/new?session=${s.id}` as never)
                    : (`/diagnostics/${s.id}` as never)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem 1.25rem",
                  backgroundColor: "#fff",
                  border:
                    s.status === "SAFETY_ESCALATED" ? "1.5px solid #fca5a5" : "1px solid #ebeef1",
                  borderRadius: "1rem",
                  textDecoration: "none",
                  transition: "box-shadow 0.15s",
                }}
              >
                {/* Category icon placeholder */}
                <div
                  style={{
                    width: "2.75rem",
                    height: "2.75rem",
                    borderRadius: "0.75rem",
                    backgroundColor:
                      s.status === "SAFETY_ESCALATED" ? "#fee2e2" : "rgba(0,184,217,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.25rem",
                    flexShrink: 0,
                  }}
                >
                  {s.status === "SAFETY_ESCALATED" ? "⚠️" : "🔧"}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <span
                      className="break-words"
                      style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#081a2f" }}
                    >
                      {s.vehicle.year} {s.vehicle.makeName} {s.vehicle.modelName}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: meta.color,
                        backgroundColor: `${meta.color}18`,
                        borderRadius: "9999px",
                        padding: "0.125rem 0.5rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <Icon size={11} />
                      {meta.label}
                    </span>
                    {s.result && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: SEVERITY_META[s.result.severity].color,
                          backgroundColor: `${SEVERITY_META[s.result.severity].color}18`,
                          borderRadius: "9999px",
                          padding: "0.125rem 0.5rem",
                        }}
                      >
                        {t(SEVERITY_META[s.result.severity].key)}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "#44474d", margin: 0 }}>
                    {s.category.label}
                    {s.symptom ? ` · ${s.symptom.label}` : ""}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "#74777d", margin: "0.25rem 0 0" }}>
                    {new Date(s.createdAt).toLocaleDateString("en-AE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}
                >
                  {isResumable && (
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#00b8d9" }}>
                      Resume
                    </span>
                  )}
                  <ForwardIcon size={16} color="#74777d" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
