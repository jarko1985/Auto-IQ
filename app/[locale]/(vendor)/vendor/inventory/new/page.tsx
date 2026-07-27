import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listVendorLocations } from "@/features/vendors/service";
import { AddInventoryItemForm } from "./_components/add-inventory-item-form";

export default async function AddInventoryItemPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const locations = await listVendorLocations(session.user.id);

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "700px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Add Inventory Item
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Register a new SKU to your warehouse inventory.
      </p>

      <AddInventoryItemForm locations={locations.map((l) => ({ id: l.id, name: l.name }))} />
    </div>
  );
}
