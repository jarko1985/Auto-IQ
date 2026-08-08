import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { isRtlLocale } from "@/i18n/direction";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listUserVehicles } from "@/features/vehicles/service";
import { MakeLogoBadge } from "@/components/vehicles/make-logo-badge";

const fuelLabel: Record<string, string> = {
  PETROL: "Petrol",
  DIESEL: "Diesel",
  HYBRID: "Hybrid",
  ELECTRIC: "Electric",
  PLUG_IN_HYBRID: "Plug-in Hybrid",
  LPG: "LPG",
};

const typeLabel: Record<string, string> = {
  SEDAN: "Sedan",
  SUV: "SUV",
  HATCHBACK: "Hatchback",
  COUPE: "Coupe",
  PICKUP_TRUCK: "Pickup Truck",
  VAN: "Van",
  MINIBUS: "Minibus",
  TRUCK: "Truck",
  OTHER: "Other",
};

export default async function VehiclesPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const t = await getTranslations("Vehicles");
  const vehicles = await listUserVehicles(session.user.id);
  const ForwardIcon = isRtlLocale(await getLocale()) ? ChevronLeft : ChevronRight;

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
            {t("title")}
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", margin: 0 }}>
            {vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"} registered
          </p>
        </div>
        <Link
          href="/vehicles/new"
          className="self-start sm:self-auto"
          style={{
            display: "inline-block",
            padding: "0.5rem 1.25rem",
            backgroundColor: "var(--navy)",
            color: "#fff",
            borderRadius: "0.625rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {t("addVehicle")}
        </Link>
      </div>

      {vehicles.length === 0 ? (
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "3rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--navy)",
              margin: "0 0 0.5rem",
            }}
          >
            {t("noVehicles")}
          </p>
          <p
            style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", margin: "0 0 1.5rem" }}
          >
            {t("noVehiclesDesc")}
          </p>
          <Link
            href="/vehicles/new"
            style={{
              display: "inline-block",
              padding: "0.625rem 1.5rem",
              backgroundColor: "var(--navy)",
              color: "#fff",
              borderRadius: "0.625rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {t("addVehicle")}
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(19rem, 1fr))",
          }}
        >
          {vehicles.map((v) => (
            <Link key={v.id} href={`/vehicles/${v.id}` as never} style={{ textDecoration: "none" }}>
              <div
                className="group border border-border transition-all duration-300 ease-out hover:-translate-y-1 hover:border-cyan/40 hover:shadow-[0_16px_32px_-16px_rgba(8,26,47,0.2)]"
                style={{
                  backgroundColor: "var(--card)",
                  borderRadius: "1.25rem",
                  padding: "1.25rem 1.5rem",
                  cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                {/* Header: logo + title + default badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginBottom: "1rem",
                  }}
                >
                  <MakeLogoBadge makeName={v.makeName} size={80} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                      }}
                    >
                      <p
                        className="break-words"
                        style={{
                          fontWeight: 700,
                          color: "var(--navy)",
                          fontSize: "1rem",
                          margin: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {v.year} {v.makeName} {v.modelName}
                      </p>
                      {v.isDefault && (
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            backgroundColor: "var(--cyan)",
                            color: "#fff",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "9999px",
                            flexShrink: 0,
                          }}
                        >
                          {t("defaultBadge")}
                        </span>
                      )}
                    </div>
                    {v.trimName && (
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--muted-foreground)",
                          margin: "0.125rem 0 0",
                        }}
                      >
                        {v.trimName}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    height: "1px",
                    backgroundColor: "var(--border)",
                    marginBottom: "0.875rem",
                  }}
                />

                {/* Spec grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.75rem 1rem",
                  }}
                >
                  <Stat
                    label={t("vehicleType")}
                    value={typeLabel[v.vehicleType] ?? v.vehicleType}
                  />
                  <Stat label={t("fuelType")} value={fuelLabel[v.fuelType] ?? v.fuelType} />
                  {v.plateNumber && <Stat label="Plate No." value={v.plateNumber} />}
                  <Stat label="Mileage" value={`${v.mileageKm.toLocaleString()} km`} />
                </div>

                <div
                  style={{
                    height: "1px",
                    backgroundColor: "var(--border)",
                    marginTop: "0.875rem",
                    marginBottom: "0.75rem",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "0.25rem",
                  }}
                >
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--cyan)" }}>
                    View details
                  </span>
                  <ForwardIcon size={14} color="var(--cyan)" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p
        style={{
          fontSize: "0.6875rem",
          fontWeight: 600,
          color: "var(--muted-foreground)",
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          margin: "0 0 0.1875rem",
        }}
      >
        {label}
      </p>
      <p
        className="break-words"
        style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--navy)", margin: 0 }}
      >
        {value}
      </p>
    </div>
  );
}
