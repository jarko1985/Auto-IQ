import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { AddVehicleForm } from "./_components/add-vehicle-form";
import { cardMobilePaddingClass } from "@/components/forms/field-styles";

export default async function NewVehiclePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const t = await getTranslations("Vehicles");

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-8">
      {/* Back breadcrumb */}
      <Link
        href="/vehicles"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          color: "var(--muted-foreground)",
          textDecoration: "none",
          fontSize: "0.875rem",
          marginBottom: "1.5rem",
        }}
      >
        ← {t("title")}
      </Link>

      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--navy)",
          margin: "0 0 0.375rem",
          letterSpacing: "-0.01em",
        }}
      >
        {t("addVehicle")}
      </h1>
      <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", margin: "0 0 2rem" }}>
        Enter your vehicle details. Fields marked * are required.
      </p>

      <div style={{ maxWidth: "48rem" }}>
        <div
          className={cardMobilePaddingClass}
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <AddVehicleForm />
        </div>
      </div>
    </div>
  );
}
