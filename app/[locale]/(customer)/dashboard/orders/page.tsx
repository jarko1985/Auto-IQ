import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listMyOrders } from "@/features/vendor-orders/service";
import { formatCurrency } from "@/lib/utils";
import { MyOrdersView } from "./_components/my-orders-view";

export default async function MyOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { orders, total } = await listMyOrders(session.user.id, { limit: 50, offset: 0 });

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-8" style={{ maxWidth: "1100px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        My Orders
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Manage and track your automotive parts orders. {total} order{total === 1 ? "" : "s"} total.
      </p>

      <MyOrdersView
        initialOrders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          vendorName: o.vendor.businessName,
          status: o.status,
          itemCount: o.items.length,
          totalLabel: formatCurrency(o.totalMinorUnits, o.currency),
          createdAt: o.createdAt.toISOString(),
          representativePartNumber: o.items[0]?.inventoryItem.part.partNumber ?? null,
          representativeCategoryCode: o.items[0]?.inventoryItem.part.category.code ?? null,
        }))}
      />
    </div>
  );
}
