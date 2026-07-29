import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGarageRepairOrderDetail } from "@/features/repair-orders/service";
import { InvoiceCompletionView } from "./_components/invoice-completion-view";

export default async function InvoiceCompletionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { id } = await params;
  const ro = await getGarageRepairOrderDetail(session.user.id, id);

  return (
    <div className="px-4 py-6 sm:px-10 sm:py-8">
      <InvoiceCompletionView
        repairOrder={{
          id: ro.id,
          repairOrderNumber: ro.repairOrderNumber,
          status: ro.status,
          customerName: ro.customer.name ?? ro.customer.email,
          vehicleLabel: `${ro.vehicle.year} ${ro.vehicle.makeName} ${ro.vehicle.modelName}`,
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
          laborSubtotalMinorUnits: ro.laborSubtotalMinorUnits,
          partsSubtotalMinorUnits: ro.partsSubtotalMinorUnits,
          vatMinorUnits: ro.vatMinorUnits,
          totalMinorUnits: ro.totalMinorUnits,
          currency: ro.currency,
          warrantyDurationMonths: ro.warrantyDurationMonths,
          warrantyCoverageItems: ro.warrantyCoverageItems,
          warrantyTerms: ro.warrantyTerms,
          outcomeNotes: ro.outcomeNotes,
          customerVerifiedOutcomeAt: ro.customerVerifiedOutcomeAt?.toISOString() ?? null,
          invoicedAt: ro.invoicedAt?.toISOString() ?? null,
        }}
      />
    </div>
  );
}
