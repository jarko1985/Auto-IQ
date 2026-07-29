import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listInventoryAudit } from "@/features/inventory/service";
import { VendorInventoryAuditView } from "./_components/vendor-inventory-audit-view";

export default async function VendorInventoryAuditPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { entries, total } = await listInventoryAudit(session.user.id, { limit: 50, offset: 0 });

  return (
    <div className="px-4 py-6 sm:px-10 sm:py-8" style={{ maxWidth: "1300px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Inventory Audit Log
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        {total} recorded stock change{total === 1 ? "" : "s"}.
      </p>

      <VendorInventoryAuditView
        initialEntries={entries.map((e) => ({
          id: e.id,
          createdAt: e.createdAt.toISOString(),
          partName: e.inventoryItem.part.name,
          partNumber: e.inventoryItem.part.partNumber,
          locationName: e.inventoryItem.location.name,
          changeType: e.changeType,
          qtyAvailableDelta: e.qtyAvailableDelta,
          qtyReservedDelta: e.qtyReservedDelta,
          qtyDamagedDelta: e.qtyDamagedDelta,
          qtyAvailableAfter: e.qtyAvailableAfter,
          reason: e.reason,
          performedByName: e.performedBy?.name ?? e.performedBy?.email ?? "System",
        }))}
      />
    </div>
  );
}
