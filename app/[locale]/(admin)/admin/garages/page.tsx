import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/features/auth/rbac";
import { PERMISSIONS } from "@/features/auth/permissions";
import { listGarageApplications } from "@/features/garages/service";
import { GarageApprovalQueueView } from "./_components/garage-approval-queue-view";

export default async function AdminGarageQueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!hasPermission(session.user.role, PERMISSIONS.ADMIN_GARAGES_APPROVE)) redirect("/dashboard");

  const { garages, total } = await listGarageApplications({ limit: 20, offset: 0 });

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "1100px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Garage Approval Queue
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        {total} pending application{total === 1 ? "" : "s"} awaiting review.
      </p>

      <GarageApprovalQueueView
        initialGarages={garages.map((g) => ({
          id: g.id,
          businessName: g.businessName,
          tradeLicenseNumber: g.tradeLicenseNumber,
          submittedAt: g.submittedAt ? g.submittedAt.toISOString() : null,
          documentCount: g._count.documents,
        }))}
      />
    </div>
  );
}
