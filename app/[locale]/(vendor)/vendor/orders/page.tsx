import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listVendorOrders } from "@/features/vendor-orders/service";
import { formatCurrency } from "@/lib/utils";
import { VendorOrdersView } from "./_components/vendor-orders-view";

export default async function VendorOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { orders, total } = await listVendorOrders(session.user.id, { limit: 50, offset: 0 });

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "1300px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Orders
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        {total} order{total === 1 ? "" : "s"} placed against your inventory.
      </p>

      <VendorOrdersView
        initialOrders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customer.name ?? o.customer.email,
          itemCount: o.items.length,
          totalLabel: formatCurrency(o.totalMinorUnits, o.currency),
          status: o.status,
          locationName: o.location.name,
          createdAt: o.createdAt.toISOString(),
          representativePartNumber: o.items[0]?.inventoryItem.part.partNumber ?? null,
          representativeCategoryCode: o.items[0]?.inventoryItem.part.category.code ?? null,
        }))}
      />
    </div>
  );
}
