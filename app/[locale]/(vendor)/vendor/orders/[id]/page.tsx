import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getVendorOrderDetail } from "@/features/vendor-orders/service";
import { NotFoundError } from "@/lib/errors";
import { VendorOrderDetailView } from "./_components/vendor-order-detail-view";

export default async function VendorOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { id } = await params;
  const order = await getVendorOrderDetail(session.user.id, id).catch((err) => {
    if (err instanceof NotFoundError) return null;
    throw err;
  });
  if (!order) notFound();

  return (
    <div className="px-4 py-6 sm:px-10 sm:py-8" style={{ maxWidth: "1000px" }}>
      <VendorOrderDetailView
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
          customerName: order.customer.name ?? order.customer.email,
          customerEmail: order.customer.email,
          contactPhone: order.contactPhone,
          deliveryAddressLine1: order.deliveryAddressLine1,
          deliveryEmirate: order.deliveryEmirate,
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
            note: h.note,
            createdAt: h.createdAt.toISOString(),
          })),
        }}
      />
    </div>
  );
}
