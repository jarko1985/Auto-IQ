import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { NotFoundError } from "@/lib/errors";
import { getGarageProfile } from "@/features/bookings/service";
import { StepProgress } from "../_components/step-progress";
import { SelectServiceForm } from "./_components/select-service-form";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locationId?: string; vehicleId?: string }>;
}

export default async function BookSelectServicePage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { id } = await params;
  const { locationId, vehicleId } = await searchParams;
  if (!locationId || !vehicleId) redirect(`/garages/${id}` as never);

  let garage;
  try {
    garage = await getGarageProfile(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  if (garage.services.length === 0) notFound();

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-8" style={{ maxWidth: "700px" }}>
      <StepProgress step={2} />
      <h1
        className="text-fluid-page-title break-words"
        style={{ fontWeight: 700, color: "#081a2f", margin: "0 0 0.375rem" }}
      >
        Select Service
      </h1>
      <p style={{ fontSize: "0.9375rem", color: "#5b6472", marginBottom: "1.75rem" }}>
        What does {garage.businessName} need to do for your vehicle?
      </p>

      <SelectServiceForm
        garageId={id}
        locationId={locationId}
        vehicleId={vehicleId}
        services={garage.services.map((s) => s.serviceType)}
      />
    </div>
  );
}
