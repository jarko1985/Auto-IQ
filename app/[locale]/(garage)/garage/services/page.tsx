import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyGarageDashboard, getGarageServiceConfig } from "@/features/garages/service";
import { hasPermission } from "@/features/auth/rbac";
import { PERMISSIONS } from "@/features/auth/permissions";
import { GarageServicesView } from "./_components/garage-services-view";

export default async function GarageServicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const dashboard = await getMyGarageDashboard(session.user.id);
  if (!dashboard) redirect("/garage/onboarding" as never);

  const config = await getGarageServiceConfig(session.user.id);
  const canManage = hasPermission(dashboard.membershipRole, PERMISSIONS.GARAGE_PROFILE_MANAGE);

  return (
    <div className="px-4 py-6 sm:px-10 sm:py-8" style={{ maxWidth: "1100px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Services &amp; Vehicle Capabilities
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Manage your core automotive maintenance offerings and the vehicle types and makes you
        service.
      </p>

      <GarageServicesView
        initialServices={config.services.map((s) => s.serviceType)}
        initialVehicleTypes={config.vehicleCapabilities.map((c) => c.vehicleType)}
        initialMakeIds={config.makeSpecializations.map((m) => m.makeId)}
        canManage={canManage}
      />
    </div>
  );
}
