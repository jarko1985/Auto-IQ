import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listUserVehicles } from "@/features/vehicles/service";

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

  return (
    <div style={{ padding: "2rem 2.5rem" }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.5rem",
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
            gridTemplateColumns: "repeat(auto-fill, minmax(18rem, 1fr))",
          }}
        >
          {vehicles.map((v) => (
            <Link key={v.id} href={`/vehicles/${v.id}` as never} style={{ textDecoration: "none" }}>
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
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontWeight: 700,
                        color: "var(--navy)",
                        fontSize: "1rem",
                        margin: "0 0 0.125rem",
                      }}
                    >
                      {v.year} {v.makeName} {v.modelName}
                    </p>
                    {v.trimName && (
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--muted-foreground)",
                          margin: 0,
                        }}
                      >
                        {v.trimName}
                      </p>
                    )}
                  </div>
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
                        marginInlineStart: "0.5rem",
                      }}
                    >
                      {t("defaultBadge")}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <Tag>{typeLabel[v.vehicleType] ?? v.vehicleType}</Tag>
                  <Tag>{fuelLabel[v.fuelType] ?? v.fuelType}</Tag>
                  {v.plateNumber && <Tag>{v.plateNumber}</Tag>}
                </div>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--muted-foreground)",
                    marginTop: "0.75rem",
                    marginBottom: 0,
                  }}
                >
                  {v.mileageKm.toLocaleString()} km
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: "0.75rem",
        backgroundColor: "var(--muted)",
        color: "var(--muted-foreground)",
        padding: "0.2rem 0.6rem",
        borderRadius: "9999px",
      }}
    >
      {children}
    </span>
  );
}
