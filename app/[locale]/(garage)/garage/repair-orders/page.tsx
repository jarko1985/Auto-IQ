import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listGarageRepairOrders } from "@/features/repair-orders/service";
import { GarageRepairOrdersView } from "./_components/garage-repair-orders-view";

export default async function GarageRepairOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { repairOrders, total } = await listGarageRepairOrders(session.user.id, {
    limit: 100,
    offset: 0,
  });

  return (
    <div className="px-4 py-6 sm:px-10 sm:py-8">
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Repair Orders
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Track every vehicle currently checked in for service. {total} total.
      </p>

      <GarageRepairOrdersView
        initialRepairOrders={repairOrders.map((ro) => ({
          id: ro.id,
          repairOrderNumber: ro.repairOrderNumber,
          status: ro.status,
          serviceType: ro.serviceType,
          customerName: ro.customer.name ?? ro.customer.email,
          vehicleLabel: `${ro.vehicle.year} ${ro.vehicle.makeName} ${ro.vehicle.modelName}`,
          totalMinorUnits: ro.totalMinorUnits,
          currency: ro.currency,
          createdAt: ro.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
