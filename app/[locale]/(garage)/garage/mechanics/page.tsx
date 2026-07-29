import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyGarageDashboard, listGarageStaff } from "@/features/garages/service";
import { hasPermission } from "@/features/auth/rbac";
import { PERMISSIONS } from "@/features/auth/permissions";
import { GarageMechanicsView } from "./_components/garage-mechanics-view";

export default async function GarageMechanicsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const dashboard = await getMyGarageDashboard(session.user.id);
  if (!dashboard) redirect("/garage/onboarding" as never);

  const { members, invitations } = await listGarageStaff(session.user.id);
  const canManage = hasPermission(dashboard.membershipRole, PERMISSIONS.GARAGE_STAFF_MANAGE);

  return (
    <div className="px-4 py-6 sm:px-10 sm:py-8" style={{ maxWidth: "1100px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Mechanics &amp; Staff
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Oversee your technical team, monitor specializations, and manage access.
      </p>

      <GarageMechanicsView
        currentUserId={session.user.id}
        initialMembers={members.map((m) => ({
          id: m.id,
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          role: m.roles[0]?.role.name ?? "MECHANIC",
          mechanicProfile: m.mechanicProfile
            ? {
                specialties: m.mechanicProfile.specialties,
                yearsExperience: m.mechanicProfile.yearsExperience,
                bio: m.mechanicProfile.bio,
              }
            : null,
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
