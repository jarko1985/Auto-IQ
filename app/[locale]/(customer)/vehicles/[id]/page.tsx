import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getUserVehicle } from "@/features/vehicles/service";
import { NotFoundError } from "@/lib/errors";

const fuelLabel: Record<string, string> = {
  PETROL: "Petrol",
  DIESEL: "Diesel",
  HYBRID: "Hybrid",
  ELECTRIC: "Electric",
  PLUG_IN_HYBRID: "Plug-in Hybrid",
  LPG: "LPG",
};
const transmissionLabel: Record<string, string> = {
  AUTOMATIC: "Automatic",
  MANUAL: "Manual",
  CVT: "CVT",
  DCT: "DCT",
  SEMI_AUTOMATIC: "Semi-Automatic",
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

type Params = { params: Promise<{ id: string }> };

export default async function VehicleDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const t = await getTranslations("Vehicles");

  let vehicle;
  try {
    vehicle = await getUserVehicle(session.user.id, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  const rows: Array<{ label: string; value: string | null | undefined }> = [
    { label: t("vehicleType"), value: typeLabel[vehicle.vehicleType] ?? vehicle.vehicleType },
    { label: t("fuelType"), value: fuelLabel[vehicle.fuelType] ?? vehicle.fuelType },
    {
      label: t("transmission"),
      value: transmissionLabel[vehicle.transmission] ?? vehicle.transmission,
    },
    { label: t("mileageKm"), value: `${vehicle.mileageKm.toLocaleString()} km` },
    { label: t("color"), value: vehicle.color },
    { label: t("plateNumber"), value: vehicle.plateNumber },
    { label: t("vin"), value: vehicle.vin },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-8">
      {/* Back breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <Link
          href="/vehicles"
          style={{
            color: "var(--muted-foreground)",
            textDecoration: "none",
            fontSize: "0.875rem",
          }}
        >
          ← {t("title")}
        </Link>
        {vehicle.isDefault && (
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              backgroundColor: "var(--cyan)",
              color: "#fff",
              padding: "0.2rem 0.6rem",
              borderRadius: "9999px",
            }}
          >
            {t("defaultBadge")}
          </span>
        )}
      </div>

      <h1
        className="text-fluid-page-title break-words"
        style={{
          fontWeight: 700,
          color: "var(--navy)",
          margin: "0 0 0.25rem",
          letterSpacing: "-0.01em",
        }}
      >
        {vehicle.year} {vehicle.makeName} {vehicle.modelName}
      </h1>
      {vehicle.trimName && (
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", margin: "0 0 2rem" }}>
          {vehicle.trimName}
        </p>
      )}

      <div style={{ maxWidth: "48rem" }}>
        {/* Details card */}
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <h2
            style={{
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "var(--navy)",
              margin: "0 0 1rem",
            }}
          >
            Vehicle Details
          </h2>
          <dl className="grid grid-cols-1 gap-y-3.5 gap-x-4 sm:grid-cols-2" style={{ margin: 0 }}>
            {rows
              .filter((r) => r.value)
              .map(({ label, value }) => (
                <div key={label}>
                  <dt
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--muted-foreground)",
                      marginBottom: "0.125rem",
                    }}
                  >
                    {label}
                  </dt>
                  <dd
                    className="overflow-wrap-anywhere"
                    style={{
                      fontSize: "0.9375rem",
                      fontWeight: 500,
                      color: "var(--foreground)",
                      margin: 0,
                    }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
          </dl>
          {vehicle.notes && (
            <div
              style={{
                marginTop: "1rem",
                paddingTop: "1rem",
                borderTop: "1px solid var(--border)",
              }}
            >
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--muted-foreground)",
                  marginBottom: "0.25rem",
                }}
              >
                Notes
              </p>
              <p style={{ fontSize: "0.875rem", color: "var(--foreground)", margin: 0 }}>
                {vehicle.notes}
              </p>
            </div>
          )}
        </div>

        {/* Documents */}
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <h2
            style={{
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "var(--navy)",
              margin: "0 0 1rem",
            }}
          >
            {t("documents")}
          </h2>
          {vehicle.documents.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
              No documents uploaded yet.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {vehicle.documents.map((doc) => (
                <li
                  key={doc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: "0.875rem", color: "var(--foreground)" }}>
                    {doc.filename}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--muted-foreground)",
                      textTransform: "capitalize",
                    }}
                  >
                    {doc.type.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Service History */}
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "1.5rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <h2
            style={{
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "var(--navy)",
              margin: "0 0 1rem",
            }}
          >
            {t("serviceHistory")}
          </h2>
          {vehicle.serviceHistory.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
              No service history recorded yet.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {vehicle.serviceHistory.map((entry) => (
                <li
                  key={entry.id}
                  style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "var(--foreground)",
                      }}
                    >
                      {entry.serviceType.replace(/_/g, " ")}
                    </span>
                    <span style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                      {new Date(entry.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", margin: 0 }}>
                    {entry.description} · {entry.mileageKm.toLocaleString()} km
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
