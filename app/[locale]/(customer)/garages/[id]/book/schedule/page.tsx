import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { NotFoundError } from "@/lib/errors";
import { getGarageProfile } from "@/features/bookings/service";
import { StepProgress } from "../_components/step-progress";
import { ScheduleForm } from "./_components/schedule-form";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locationId?: string; vehicleId?: string; serviceType?: string }>;
}

export default async function BookSchedulePage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { id } = await params;
  const { locationId, vehicleId, serviceType } = await searchParams;
  if (!locationId || !vehicleId || !serviceType) redirect(`/garages/${id}` as never);

  let garage;
  try {
    garage = await getGarageProfile(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-8" style={{ maxWidth: "800px" }}>
      <StepProgress step={3} />
      <h1 className="text-fluid-page-title break-words" style={{ fontWeight: 700, color: "#081a2f", margin: "0 0 0.375rem" }}>
        Schedule Your Visit
      </h1>
      <p style={{ fontSize: "0.9375rem", color: "#5b6472", marginBottom: "1.75rem" }}>
        Choose a convenient time at {garage.businessName}.
      </p>

      <ScheduleForm
        garageId={id}
        locationId={locationId}
        vehicleId={vehicleId}
        serviceType={serviceType}
      />
    </div>
  );
}
