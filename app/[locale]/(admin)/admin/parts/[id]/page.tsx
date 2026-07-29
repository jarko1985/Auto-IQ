import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/features/auth/rbac";
import { PERMISSIONS } from "@/features/auth/permissions";
import { getPartDetail, listCategories } from "@/features/catalog/service";
import { NotFoundError } from "@/lib/errors";
import { AdminPartDetailView } from "./_components/admin-part-detail-view";

export default async function AdminPartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!hasPermission(session.user.role, PERMISSIONS.ADMIN_PARTS_MANAGE)) redirect("/dashboard");

  const { id } = await params;

  const [part, categories] = await Promise.all([
    getPartDetail(id).catch((err) => {
      if (err instanceof NotFoundError) return null;
      throw err;
    }),
    listCategories(),
  ]);
  if (!part) notFound();

  return (
    <div className="px-4 py-6 sm:px-10 sm:py-8" style={{ maxWidth: "1100px" }}>
      <AdminPartDetailView
        part={{
          id: part.id,
          name: part.name,
          manufacturerName: part.manufacturerName,
          partNumber: part.partNumber,
          alternatePartNumbers: part.alternatePartNumbers,
          categoryId: part.categoryId,
          categoryName: part.category.name,
          origin: part.origin,
          description: part.description,
          approvalState: part.approvalState,
          rejectionReason: part.rejectionReason,
          submittedByVendorName: part.submittedByVendor?.businessName ?? null,
          media: part.media.map((m) => ({
            id: m.id,
            filename: m.filename,
            storageKey: m.storageKey,
          })),
          compatibilities: part.compatibilities.map((c) => ({
            id: c.id,
            makeName: c.makeName,
            modelName: c.modelName,
            yearFrom: c.yearFrom,
            yearTo: c.yearTo,
            engineCode: c.engineCode,
            trimName: c.trimName,
            notes: c.notes,
          })),
        }}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
