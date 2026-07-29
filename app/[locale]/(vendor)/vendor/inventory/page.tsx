import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listInventory } from "@/features/inventory/service";
import { listVendorLocations } from "@/features/vendors/service";
import { VendorInventoryView } from "./_components/vendor-inventory-view";

export default async function VendorInventoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const [{ items, total }, locations] = await Promise.all([
    listInventory(session.user.id, { limit: 50, offset: 0 }),
    listVendorLocations(session.user.id),
  ]);

  return (
    <div className="px-4 py-6 sm:px-10 sm:py-8" style={{ maxWidth: "1300px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Inventory
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        {total} SKU{total === 1 ? "" : "s"} across your locations.
      </p>

      <VendorInventoryView
        initialItems={items.map((i) => ({
          id: i.id,
          partName: i.part.name,
          manufacturerName: i.part.manufacturerName,
          partNumber: i.part.partNumber,
          categoryName: i.part.category.name,
          locationId: i.locationId,
          locationName: i.location.name,
          priceMinorUnits: i.priceMinorUnits,
          currency: i.currency,
          qtyAvailable: i.qtyAvailable,
          qtyReserved: i.qtyReserved,
          qtyDamaged: i.qtyDamaged,
          reorderThreshold: i.reorderThreshold,
          stockStatus: i.stockStatus,
          isActive: i.isActive,
        }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
      />
    </div>
  );
}
