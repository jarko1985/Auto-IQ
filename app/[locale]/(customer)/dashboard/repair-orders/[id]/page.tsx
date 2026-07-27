import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyRepairOrderDetail } from "@/features/repair-orders/service";
import { MyRepairOrderDetailView } from "./_components/my-repair-order-detail-view";

export default async function MyRepairOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { id } = await params;
  const ro = await getMyRepairOrderDetail(session.user.id, id);

  return (
    <div style={{ padding: "2rem 2.5rem" }}>
      <MyRepairOrderDetailView
        repairOrder={{
          id: ro.id,
          repairOrderNumber: ro.repairOrderNumber,
          status: ro.status,
          garageName: ro.garage.businessName,
          garagePhone: ro.garage.contactPhone,
          vehicleLabel: `${ro.vehicle.year} ${ro.vehicle.makeName} ${ro.vehicle.modelName}`,
          plateNumber: ro.vehicle.plateNumber,
          aiSuggestedDiagnosis: ro.aiSuggestedDiagnosis,
          confirmedDiagnosis: ro.confirmedDiagnosis,
          rejectionReason: ro.rejectionReason,
          jobs: ro.jobs.map((j) => ({
            id: j.id,
            description: j.description,
            totalMinorUnits: j.totalMinorUnits,
          })),
          parts: ro.parts.map((p) => ({
            id: p.id,
            partName: p.partName,
            totalMinorUnits: p.totalMinorUnits,
          })),
          subtotalMinorUnits: ro.laborSubtotalMinorUnits + ro.partsSubtotalMinorUnits,
          vatMinorUnits: ro.vatMinorUnits,
          totalMinorUnits: ro.totalMinorUnits,
          currency: ro.currency,
          outcomeNotes: ro.outcomeNotes,
          customerVerifiedOutcomeAt: ro.customerVerifiedOutcomeAt?.toISOString() ?? null,
          warrantyDurationMonths: ro.warrantyDurationMonths,
          warrantyCoverageItems: ro.warrantyCoverageItems,
          statusHistory: ro.statusHistory.map((h) => ({
            id: h.id,
            toStatus: h.toStatus,
            note: h.note,
            createdAt: h.createdAt.toISOString(),
          })),
          alreadyReviewed: ro.review !== null,
        }}
      />
    </div>
  );
}
