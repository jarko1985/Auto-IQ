import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyVendorDashboard, listVendorStaff } from "@/features/vendors/service";
import { hasPermission } from "@/features/auth/rbac";
import { PERMISSIONS } from "@/features/auth/permissions";
import { VendorStaffView } from "./_components/vendor-staff-view";

export default async function VendorStaffPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const dashboard = await getMyVendorDashboard(session.user.id);
  if (!dashboard) redirect("/vendor/onboarding" as never);

  const { members, invitations } = await listVendorStaff(session.user.id);
  const canManage = hasPermission(dashboard.membershipRole, PERMISSIONS.VENDOR_STAFF_MANAGE);

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "1100px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Staff
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Manage who has access to your vendor organization.
      </p>

      <VendorStaffView
        currentUserId={session.user.id}
        initialMembers={members.map((m) => ({
          id: m.id,
          name: m.user.name,
          email: m.user.email,
          role: m.roles[0]?.role.name ?? "VENDOR_STAFF",
          userId: m.user.id,
          createdAt: m.createdAt.toISOString(),
        }))}
        initialInvitations={invitations.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt.toISOString(),
        }))}
        canManage={canManage}
      />
    </div>
  );
}
