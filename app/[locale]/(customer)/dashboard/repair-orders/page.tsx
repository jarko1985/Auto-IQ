import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listMyRepairOrders } from "@/features/repair-orders/service";
import { MyRepairOrdersView } from "./_components/my-repair-orders-view";

export default async function MyRepairOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { repairOrders, total } = await listMyRepairOrders(session.user.id, { limit: 100, offset: 0 });

  return (
    <div style={{ padding: "2rem 2.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}>
        My Repair Orders
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Track your ongoing and past vehicle repairs. {total} total.
      </p>

      <MyRepairOrdersView
        initialRepairOrders={repairOrders.map((ro) => ({
          id: ro.id,
          repairOrderNumber: ro.repairOrderNumber,
          status: ro.status,
          garageName: ro.garage.businessName,
          vehicleLabel: `${ro.vehicle.year} ${ro.vehicle.makeName} ${ro.vehicle.modelName}`,
          plateNumber: ro.vehicle.plateNumber,
          confirmedDiagnosis: ro.confirmedDiagnosis,
          totalMinorUnits: ro.totalMinorUnits,
          currency: ro.currency,
        }))}
      />
    </div>
  );
}
