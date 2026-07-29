import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { NotFoundError } from "@/lib/errors";
import { getGarageProfile } from "@/features/bookings/service";
import { listUserVehicles } from "@/features/vehicles/service";
import { StepProgress } from "../_components/step-progress";
import { SelectVehicleForm } from "./_components/select-vehicle-form";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locationId?: string }>;
}

export default async function BookSelectVehiclePage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { id } = await params;
  const { locationId } = await searchParams;

  let garage;
  try {
    garage = await getGarageProfile(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const location = garage.organization.garageLocations.find((l) => l.id === locationId);
  if (!location) notFound();

  const vehicles = await listUserVehicles(session.user.id);
  if (vehicles.length === 0) redirect("/vehicles/new" as never);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-8" style={{ maxWidth: "900px" }}>
      <StepProgress step={1} />
      <h1 className="text-fluid-page-title break-words" style={{ fontWeight: 700, color: "#081a2f", margin: "0 0 0.375rem" }}>
        Book an Appointment at {garage.businessName}
      </h1>
      <p style={{ fontSize: "0.9375rem", color: "#5b6472", marginBottom: "1.75rem" }}>
        Choose which vehicle you'd like serviced.
      </p>

      <SelectVehicleForm
        garageId={id}
        locationId={location.id}
        vehicles={vehicles.map((v) => ({
          id: v.id,
          makeName: v.makeName,
          modelName: v.modelName,
          trimName: v.trimName,
          year: v.year,
          plateNumber: v.plateNumber,
          isDefault: v.isDefault,
        }))}
      />
    </div>
  );
}
