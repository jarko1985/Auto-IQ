import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyGarageDashboard } from "@/features/garages/service";
import { GarageOnboardingWizard, type InitialGarage } from "./_components/garage-onboarding-wizard";

export default async function GarageOnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const dashboard = await getMyGarageDashboard(session.user.id);

  if (dashboard?.garage.verificationStatus === "APPROVED") {
    redirect("/garage/dashboard" as never);
  }

  const initialGarage: InitialGarage | null = dashboard
    ? {
        id: dashboard.garage.id,
        verificationStatus: dashboard.garage.verificationStatus,
        businessName: dashboard.garage.businessName,
        tradeLicenseNumber: dashboard.garage.tradeLicenseNumber,
        tradeLicenseExpiry: dashboard.garage.tradeLicenseExpiry.toISOString(),
        contactPersonName: dashboard.garage.contactPersonName,
        contactPhone: dashboard.garage.contactPhone,
        contactEmail: dashboard.garage.contactEmail,
        addressLine1: dashboard.garage.addressLine1,
        emirate: dashboard.garage.emirate,
        authorizedSignatoryName: dashboard.garage.authorizedSignatoryName,
        authorizedSignatoryEmiratesId: dashboard.garage.authorizedSignatoryEmiratesId,
        rejectionReason: dashboard.garage.rejectionReason,
        documents: dashboard.garage.documents.map((d) => ({
          id: d.id,
          type: d.type,
          filename: d.filename,
        })),
      }
    : null;

  return <GarageOnboardingWizard initialGarage={initialGarage} />;
}
