import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getMyOrderDetail } from "@/features/vendor-orders/service";
import { NotFoundError } from "@/lib/errors";
import { MyOrderDetailView } from "./_components/my-order-detail-view";

export default async function MyOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { id } = await params;
  const order = await getMyOrderDetail(session.user.id, id).catch((err) => {
    if (err instanceof NotFoundError) return null;
    throw err;
  });
  if (!order) notFound();

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-8" style={{ maxWidth: "900px" }}>
      <MyOrderDetailView
        order={{
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          currency: order.currency,
          subtotalMinorUnits: order.subtotalMinorUnits,
          vatMinorUnits: order.vatMinorUnits,
          totalMinorUnits: order.totalMinorUnits,
          createdAt: order.createdAt.toISOString(),
          cancelledReason: order.cancelledReason,
          vendorName: order.vendor.businessName,
          locationName: order.location.name,
          items: order.items.map((i) => ({
            id: i.id,
            partNameSnapshot: i.partNameSnapshot,
            quantity: i.quantity,
            unitPriceMinorUnits: i.unitPriceMinorUnits,
            totalMinorUnits: i.totalMinorUnits,
            partNumber: i.inventoryItem.part.partNumber,
            categoryCode: i.inventoryItem.part.category.code,
          })),
          statusHistory: order.statusHistory.map((h) => ({
            id: h.id,
            toStatus: h.toStatus,
            createdAt: h.createdAt.toISOString(),
          })),
        }}
      />
    </div>
  );
}
