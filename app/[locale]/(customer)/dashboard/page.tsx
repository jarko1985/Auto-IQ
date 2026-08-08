import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { listUserVehicles } from "@/features/vehicles/service";
import { MakeLogoBadge } from "@/components/vehicles/make-logo-badge";
import { getVehicleMaintenanceSummary } from "@/features/maintenance/service";
import type { MaintenanceSummary, MaintenanceUrgency } from "@/features/maintenance/predict";
import { DUE_SOON_KM_THRESHOLD, DUE_SOON_DAYS_THRESHOLD } from "@/features/maintenance/intervals";

const STATUS_BADGE: Record<
  MaintenanceUrgency | "NO_DATA",
  { label: string; bg: string; fg: string }
> = {
  OK: { label: "GOOD", bg: "rgba(34,197,94,0.1)", fg: "#16a34a" },
  DUE_SOON: { label: "DUE SOON", bg: "rgba(245,158,11,0.1)", fg: "#d97706" },
  OVERDUE: { label: "ATTENTION NEEDED", bg: "rgba(220,38,38,0.1)", fg: "#dc2626" },
  NO_DATA: { label: "NO DATA", bg: "var(--surface-container)", fg: "var(--muted-foreground)" },
};

const URGENCY_DOT: Record<MaintenanceUrgency, string> = {
  OK: "#22c55e",
  DUE_SOON: "#f59e0b",
  OVERDUE: "#dc2626",
};

function humanizeServiceType(serviceType: string): string {
  return serviceType
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function dueLabel(prediction: MaintenanceSummary["predictions"][number]): string {
  const { urgency, remainingKm, remainingDays } = prediction;
  if (urgency === "OVERDUE") {
    return remainingKm <= 0
      ? `Overdue by ${Math.abs(remainingKm).toLocaleString()} km`
      : `Overdue by ${Math.abs(remainingDays)} days`;
  }
  // Default to the km label (odometer-based scheduling is the dominant UAE
  // convention); only switch to a days label when time, not mileage, is what
  // actually drove this prediction's urgency.
  if (remainingDays <= DUE_SOON_DAYS_THRESHOLD && remainingKm > DUE_SOON_KM_THRESHOLD) {
    return `Due in ${remainingDays} days`;
  }
  return `Due in ${remainingKm.toLocaleString()} km`;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const t = await getTranslations("Dashboard");
  const vehicles = await listUserVehicles(session.user.id);
  const defaultVehicle = vehicles.find((v) => v.isDefault) ?? vehicles[0];
  const firstName = session.user.name?.split(" ")[0] ?? "there";

  // Lazy, on-demand computation — recomputed fresh on every dashboard read,
  // never cached (see features/maintenance/service.ts).
  const maintenance = defaultVehicle
    ? await getVehicleMaintenanceSummary(session.user.id, defaultVehicle.id)
    : null;
  const badgeKey: MaintenanceUrgency | "NO_DATA" =
    maintenance && maintenance.hasServiceHistory ? maintenance.overallStatus : "NO_DATA";
  const badge = STATUS_BADGE[badgeKey];

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-8">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1
            className="text-fluid-page-title break-words"
            style={{
              fontWeight: 700,
              color: "var(--navy)",
              margin: "0 0 0.25rem",
              letterSpacing: "-0.01em",
            }}
          >
            Good morning, {firstName}
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", margin: 0 }}>
            {t("subtitle")}
          </p>
        </div>

        {/* Vehicle selector pill */}
        {defaultVehicle && (
          <Link
            href="/vehicles"
            className="max-w-full self-start truncate sm:self-auto"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              padding: "0.5rem 1rem",
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--navy)",
              textDecoration: "none",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: "#22c55e",
                flexShrink: 0,
              }}
            />
            <span className="truncate">
              {defaultVehicle.year} {defaultVehicle.makeName} {defaultVehicle.modelName}
            </span>
            <span style={{ color: "var(--muted-foreground)", flexShrink: 0 }}>▾</span>
          </Link>
        )}
      </div>

      {/* Top row: Vehicle Health + AI Diagnostics */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Vehicle Health Score */}
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "1.5rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.25rem",
            }}
          >
            <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--navy)", margin: 0 }}>
              Vehicle Health
            </h2>
            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 700,
                backgroundColor: badge.bg,
                color: badge.fg,
                padding: "0.2rem 0.625rem",
                borderRadius: "9999px",
              }}
            >
              {badge.label}
            </span>
          </div>

          {defaultVehicle ? (
            <>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "1.5rem",
                  marginBottom: "1.25rem",
                }}
              >
                {/* SVG health gauge */}
                <div style={{ position: "relative", width: "80px", height: "80px", flexShrink: 0 }}>
                  <svg
                    viewBox="0 0 80 80"
                    style={{ width: "80px", height: "80px", transform: "rotate(-90deg)" }}
                  >
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      fill="none"
                      stroke="var(--surface-container)"
                      strokeWidth="7"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      fill="none"
                      stroke={maintenance!.hasServiceHistory ? "#00b8d9" : "var(--border)"}
                      strokeWidth="7"
                      strokeDasharray={`${2 * Math.PI * 34 * (maintenance!.hasServiceHistory ? maintenance!.healthScore / 100 : 1)} ${2 * Math.PI * 34}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--navy)" }}>
                      {maintenance!.hasServiceHistory ? maintenance!.healthScore : "–"}
                    </span>
                    <span style={{ fontSize: "0.5625rem", color: "var(--muted-foreground)" }}>
                      {maintenance!.hasServiceHistory ? "/ 100" : "no data"}
                    </span>
                  </div>
                </div>

                <MakeLogoBadge makeName={defaultVehicle.makeName} size={80} />

                <div style={{ minWidth: "140px", flex: "1 1 140px" }}>
                  <p
                    className="break-words"
                    style={{
                      fontWeight: 700,
                      color: "var(--navy)",
                      fontSize: "0.9375rem",
                      margin: "0 0 0.25rem",
                    }}
                  >
                    {defaultVehicle.year} {defaultVehicle.makeName} {defaultVehicle.modelName}
                  </p>
                  {defaultVehicle.trimName && (
                    <p
                      className="break-words"
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--muted-foreground)",
                        margin: "0 0 0.375rem",
                      }}
                    >
                      {defaultVehicle.trimName}
                    </p>
                  )}
                  {defaultVehicle.plateNumber && (
                    <span
                      className="overflow-wrap-anywhere"
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: "var(--surface-container)",
                        color: "var(--muted-foreground)",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "0.375rem",
                        fontFamily: "monospace",
                      }}
                    >
                      {defaultVehicle.plateNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Predicted maintenance */}
              {maintenance!.hasServiceHistory ? (
                maintenance!.predictions.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {maintenance!.predictions.slice(0, 3).map((p) => (
                      <div
                        key={p.serviceType}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.5rem 0.75rem",
                          backgroundColor: "var(--background)",
                          borderRadius: "0.5rem",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: URGENCY_DOT[p.urgency],
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--navy)" }}
                          >
                            {humanizeServiceType(p.serviceType)}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: URGENCY_DOT[p.urgency],
                          }}
                        >
                          {dueLabel(p)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", margin: 0 }}>
                    No upcoming services predicted from your recorded history.
                  </p>
                )
              ) : (
                <div
                  style={{
                    padding: "0.875rem 1rem",
                    backgroundColor: "var(--background)",
                    borderRadius: "0.625rem",
                    border: "1px dashed var(--border)",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--muted-foreground)",
                      margin: "0 0 0.5rem",
                      lineHeight: 1.5,
                    }}
                  >
                    No service history yet — add past services to get maintenance predictions.
                  </p>
                  <Link
                    href={`/vehicles/${defaultVehicle.id}` as "/vehicles"}
                    style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--cyan)" }}
                  >
                    View Vehicle →
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <p
                style={{
                  color: "var(--muted-foreground)",
                  fontSize: "0.875rem",
                  margin: "0 0 1rem",
                }}
              >
                No vehicle added yet
              </p>
              <Link
                href="/vehicles/new"
                style={{
                  display: "inline-block",
                  padding: "0.5rem 1.25rem",
                  backgroundColor: "var(--navy)",
                  color: "#fff",
                  borderRadius: "0.5rem",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Add Vehicle
              </Link>
            </div>
          )}
        </div>

        {/* AI Diagnostics */}
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "1.5rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.25rem",
            }}
          >
            <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--navy)", margin: 0 }}>
              AI Diagnostics
            </h2>
            <span style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)" }}>
              No scans yet
            </span>
          </div>

          <div
            style={{
              padding: "1.5rem 1rem",
              backgroundColor: "var(--background)",
              borderRadius: "0.75rem",
              border: "1px dashed var(--border)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "50%",
                backgroundColor: "rgba(0,184,217,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 0.75rem",
                fontSize: "1.25rem",
              }}
            >
              ⚡
            </div>
            <p
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--navy)",
                margin: "0 0 0.375rem",
              }}
            >
              Start AI Diagnosis
            </p>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--muted-foreground)",
                margin: "0 0 1rem",
                lineHeight: 1.6,
              }}
            >
              Describe your symptoms and get instant AI analysis
            </p>
            <Link
              href="/diagnostics"
              style={{
                display: "inline-block",
                padding: "0.5rem 1.25rem",
                backgroundColor: "#00b8d9",
                color: "#fff",
                borderRadius: "0.5rem",
                fontSize: "0.8125rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              New Diagnostic
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom row: quick-nav cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <QuickCard
          title={t("myVehicles")}
          desc={t("myVehiclesDesc")}
          href="/vehicles"
          badge={vehicles.length > 0 ? String(vehicles.length) : undefined}
        />
        <QuickCard title={t("bookings")} desc={t("bookingsDesc")} href="/bookings" />
        <QuickCard
          title="Marketplace"
          desc="Find genuine spare parts for your vehicle"
          href="/marketplace"
        />
      </div>

      {process.env.NODE_ENV !== "production" && (
        <p
          style={{
            marginTop: "2rem",
            fontSize: "0.75rem",
            color: "var(--muted-foreground)",
          }}
        >
          Role: {session.user.role} · Sprint 2 complete
        </p>
      )}
    </div>
  );
}

function QuickCard({
  title,
  desc,
  href,
  badge,
}: {
  title: string;
  desc: string;
  href: string;
  badge?: string;
}) {
  return (
    <Link href={href as "/vehicles"} style={{ textDecoration: "none" }}>
      <div
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "1rem",
          padding: "1.25rem 1.5rem",
          cursor: "pointer",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.375rem",
          }}
        >
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--navy)", margin: 0 }}>
            {title}
          </h3>
          {badge && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                backgroundColor: "var(--cyan)",
                color: "#fff",
                padding: "0.1rem 0.5rem",
                borderRadius: "9999px",
                marginInlineStart: "0.5rem",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", margin: 0 }}>{desc}</p>
      </div>
    </Link>
  );
}
