import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyVendorDashboard } from "@/features/vendors/service";
import { VendorOnboardingWizard, type InitialVendor } from "./_components/vendor-onboarding-wizard";

export default async function VendorOnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const dashboard = await getMyVendorDashboard(session.user.id);

  if (dashboard?.vendor.verificationStatus === "APPROVED") {
    redirect("/vendor/dashboard" as never);
  }

  const initialVendor: InitialVendor | null = dashboard
    ? {
        id: dashboard.vendor.id,
        verificationStatus: dashboard.vendor.verificationStatus,
        businessName: dashboard.vendor.businessName,
        businessType: dashboard.vendor.businessType,
        tradeLicenseNumber: dashboard.vendor.tradeLicenseNumber,
        tradeLicenseExpiry: dashboard.vendor.tradeLicenseExpiry.toISOString(),
        contactPersonName: dashboard.vendor.contactPersonName,
        contactPhone: dashboard.vendor.contactPhone,
        contactEmail: dashboard.vendor.contactEmail,
        addressLine1: dashboard.vendor.addressLine1,
        emirate: dashboard.vendor.emirate,
        authorizedSignatoryName: dashboard.vendor.authorizedSignatoryName,
        authorizedSignatoryEmiratesId: dashboard.vendor.authorizedSignatoryEmiratesId,
        rejectionReason: dashboard.vendor.rejectionReason,
        documents: dashboard.vendor.documents.map((d) => ({
          id: d.id,
          type: d.type,
          filename: d.filename,
        })),
      }
    : null;

  return <VendorOnboardingWizard initialVendor={initialVendor} />;
}
