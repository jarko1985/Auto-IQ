import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGarageRepairOrderDetail, listGarageMechanics } from "@/features/repair-orders/service";
import { GarageRepairOrderDetailView } from "./_components/garage-repair-order-detail-view";

export default async function GarageRepairOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { id } = await params;
  const [ro, mechanics] = await Promise.all([
    getGarageRepairOrderDetail(session.user.id, id),
    listGarageMechanics(session.user.id),
  ]);

  return (
    <div className="px-4 py-6 sm:px-10 sm:py-8">
      <GarageRepairOrderDetailView
        repairOrder={{
          id: ro.id,
          repairOrderNumber: ro.repairOrderNumber,
          status: ro.status,
          serviceType: ro.serviceType,
          customerName: ro.customer.name ?? ro.customer.email,
          vehicleLabel: `${ro.vehicle.year} ${ro.vehicle.makeName} ${ro.vehicle.modelName}`,
          plateNumber: ro.vehicle.plateNumber,
          inspectionNotes: ro.inspectionNotes,
          odometerReadingKm: ro.odometerReadingKm,
          aiSuggestedDiagnosis: ro.aiSuggestedDiagnosis,
          aiConfidence: ro.aiConfidence,
          confirmedDiagnosis: ro.confirmedDiagnosis,
          garageSummary: ro.diagnosticSession?.result?.garageSummary ?? null,
          diagnosticResultDegraded: ro.diagnosticSession?.result?.isDegraded ?? false,
          leadMechanic: ro.leadMechanic
            ? {
                membershipId: ro.leadMechanic.id,
                name: ro.leadMechanic.user.name ?? ro.leadMechanic.user.email,
                bio: ro.leadMechanic.mechanicProfile?.bio ?? null,
              }
            : null,
          jobs: ro.jobs.map((j) => ({
            id: j.id,
            description: j.description,
            mechanicMembershipId: j.mechanicMembershipId,
            hours: j.hours,
            rateMinorUnits: j.rateMinorUnits,
            totalMinorUnits: j.totalMinorUnits,
            status: j.status,
          })),
          parts: ro.parts.map((p) => ({
            id: p.id,
            partName: p.partName,
            sku: p.sku,
            quantity: p.quantity,
            unitPriceMinorUnits: p.unitPriceMinorUnits,
            totalMinorUnits: p.totalMinorUnits,
          })),
          qualityChecks: ro.qualityChecks.map((q) => ({
            id: q.id,
            label: q.label,
            isChecked: q.isChecked,
          })),
          statusHistory: ro.statusHistory.map((h) => ({
            id: h.id,
            toStatus: h.toStatus,
            note: h.note,
            createdAt: h.createdAt.toISOString(),
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
