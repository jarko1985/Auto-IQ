import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/features/auth/rbac";
import { PERMISSIONS } from "@/features/auth/permissions";
import { listAdminParts, listCategories } from "@/features/catalog/service";
import { AdminPartsCatalogView } from "./_components/admin-parts-catalog-view";

export default async function AdminPartsCatalogPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!hasPermission(session.user.role, PERMISSIONS.ADMIN_PARTS_MANAGE)) redirect("/dashboard");

  const [{ parts, total }, categories] = await Promise.all([
    listAdminParts({ limit: 50, offset: 0 }),
    listCategories(),
  ]);

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "1300px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Parts Catalog
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        {total} canonical part{total === 1 ? "" : "s"} in the catalog.
      </p>

      <AdminPartsCatalogView
        initialParts={parts.map((p) => ({
          id: p.id,
          name: p.name,
          manufacturerName: p.manufacturerName,
          partNumber: p.partNumber,
          origin: p.origin,
          approvalState: p.approvalState,
          categoryName: p.category.name,
          submittedByVendorName: p.submittedByVendor?.businessName ?? null,
          inventoryCount: p._count.inventoryItems,
          compatibilityCount: p._count.compatibilities,
        }))}
        categories={categories.map((c) => ({ id: c.id, code: c.code, name: c.name }))}
      />
    </div>
  );
}
