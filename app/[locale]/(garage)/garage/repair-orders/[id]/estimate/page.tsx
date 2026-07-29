import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGarageRepairOrderDetail, listGarageMechanics } from "@/features/repair-orders/service";
import { EstimateBuilderView } from "./_components/estimate-builder-view";

export default async function EstimateBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { id } = await params;
  const [ro, mechanics] = await Promise.all([
    getGarageRepairOrderDetail(session.user.id, id),
    listGarageMechanics(session.user.id),
  ]);

  return (
    <div className="px-4 py-6 sm:px-10 sm:py-8">
      <EstimateBuilderView
        repairOrder={{
          id: ro.id,
          repairOrderNumber: ro.repairOrderNumber,
          status: ro.status,
          customerName: ro.customer.name ?? ro.customer.email,
          vehicleLabel: `${ro.vehicle.year} ${ro.vehicle.makeName} ${ro.vehicle.modelName}`,
          confirmedDiagnosis: ro.confirmedDiagnosis,
          customerNotes: ro.customerNotes,
          jobs: ro.jobs.map((j) => ({
            id: j.id,
            description: j.description,
            mechanicMembershipId: j.mechanicMembershipId,
            hours: j.hours,
            rateMinorUnits: j.rateMinorUnits,
            totalMinorUnits: j.totalMinorUnits,
          })),
          parts: ro.parts.map((p) => ({
            id: p.id,
            partName: p.partName,
            sku: p.sku,
            quantity: p.quantity,
            unitPriceMinorUnits: p.unitPriceMinorUnits,
            totalMinorUnits: p.totalMinorUnits,
          })),
          laborSubtotalMinorUnits: ro.laborSubtotalMinorUnits,
          partsSubtotalMinorUnits: ro.partsSubtotalMinorUnits,
          vatMinorUnits: ro.vatMinorUnits,
          totalMinorUnits: ro.totalMinorUnits,
          currency: ro.currency,
        }}
        mechanics={mechanics.map((m) => ({
          membershipId: m.id,
          name: m.user.name ?? m.user.email,
        }))}
      />
    </div>
  );
}
