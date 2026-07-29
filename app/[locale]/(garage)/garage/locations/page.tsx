import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyGarageDashboard, listGarageLocations } from "@/features/garages/service";
import { hasPermission } from "@/features/auth/rbac";
import { PERMISSIONS } from "@/features/auth/permissions";
import { GarageLocationsView } from "./_components/garage-locations-view";

export default async function GarageLocationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const dashboard = await getMyGarageDashboard(session.user.id);
  if (!dashboard) redirect("/garage/onboarding" as never);

  const locations = await listGarageLocations(session.user.id);
  const canManage = hasPermission(dashboard.membershipRole, PERMISSIONS.GARAGE_PROFILE_MANAGE);

  return (
    <div className="px-4 py-6 sm:px-10 sm:py-8" style={{ maxWidth: "1100px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Locations &amp; Working Hours
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Manage your service centers and their operational schedules across the UAE.
      </p>

      <GarageLocationsView
        initialLocations={locations.map((l) => ({
          id: l.id,
          name: l.name,
          emirate: l.emirate,
          addressLine1: l.addressLine1,
          phone: l.phone,
          email: l.email,
          isPrimary: l.isPrimary,
          isActive: l.isActive,
          workingHours: l.workingHours.map((h) => ({
            dayOfWeek: h.dayOfWeek,
            isClosed: h.isClosed,
            openTime: h.openTime,
            closeTime: h.closeTime,
          })),
        }))}
        canManage={canManage}
      />
    </div>
  );
}
