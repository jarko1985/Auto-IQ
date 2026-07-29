import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/features/auth/rbac";
import { PERMISSIONS } from "@/features/auth/permissions";
import { listVendorApplications } from "@/features/vendors/service";
import { VendorApprovalQueueView } from "./_components/vendor-approval-queue-view";

export default async function AdminVendorQueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!hasPermission(session.user.role, PERMISSIONS.ADMIN_VENDORS_APPROVE)) redirect("/dashboard");

  const { vendors, total } = await listVendorApplications({ limit: 20, offset: 0 });

  return (
    <div className="px-4 py-6 sm:px-10 sm:py-8" style={{ maxWidth: "1100px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Vendor Approval Queue
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        {total} pending application{total === 1 ? "" : "s"} awaiting review.
      </p>

      <VendorApprovalQueueView
        initialVendors={vendors.map((v) => ({
          id: v.id,
          businessName: v.businessName,
          tradeLicenseNumber: v.tradeLicenseNumber,
          submittedAt: v.submittedAt ? v.submittedAt.toISOString() : null,
          documentCount: v._count.documents,
        }))}
      />
    </div>
  );
}
