import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyVendorDashboard, listVendorLocations } from "@/features/vendors/service";
import { hasPermission } from "@/features/auth/rbac";
import { PERMISSIONS } from "@/features/auth/permissions";
import { VendorLocationsView } from "./_components/vendor-locations-view";

export default async function VendorLocationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const dashboard = await getMyVendorDashboard(session.user.id);
  if (!dashboard) redirect("/vendor/onboarding" as never);

  const locations = await listVendorLocations(session.user.id);
  const canManage = hasPermission(dashboard.membershipRole, PERMISSIONS.VENDOR_PROFILE_MANAGE);

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "1100px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Locations
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Manage your warehouses and branches across the UAE.
      </p>

      <VendorLocationsView
        initialLocations={locations.map((l) => ({
          id: l.id,
          name: l.name,
          emirate: l.emirate,
          addressLine1: l.addressLine1,
          phone: l.phone,
          email: l.email,
          isPrimary: l.isPrimary,
          isActive: l.isActive,
        }))}
        canManage={canManage}
      />
    </div>
  );
}
