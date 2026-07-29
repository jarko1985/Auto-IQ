import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { NotFoundError } from "@/lib/errors";
import { getGarageProfile } from "@/features/bookings/service";
import { getUserVehicle } from "@/features/vehicles/service";
import { StepProgress } from "../_components/step-progress";
import { ReviewForm } from "./_components/review-form";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    locationId?: string;
    vehicleId?: string;
    serviceType?: string;
    scheduledStart?: string;
  }>;
}

const SERVICE_LABELS: Record<string, string> = {
  OIL_CHANGE: "Oil Change",
  TYRE_ROTATION: "Tyre Rotation",
  BRAKE_SERVICE: "Brake Service",
  FILTER_CHANGE: "Filter Change",
  FLUID_CHECK: "Fluid Check",
  BATTERY_REPLACEMENT: "Battery Replacement",
  TIMING_BELT: "Timing Belt",
  AC_SERVICE: "AC Service",
  TRANSMISSION_SERVICE: "Transmission Service",
  GENERAL_INSPECTION: "General Inspection",
  OTHER: "Other",
};

export default async function BookReviewPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { id } = await params;
  const { locationId, vehicleId, serviceType, scheduledStart } = await searchParams;
  if (!locationId || !vehicleId || !serviceType || !scheduledStart)
    redirect(`/garages/${id}` as never);

  let garage;
  try {
    garage = await getGarageProfile(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const location = garage.organization.garageLocations.find((l) => l.id === locationId);
  if (!location) notFound();

  const vehicle = await getUserVehicle(session.user.id, vehicleId);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-8" style={{ maxWidth: "700px" }}>
      <StepProgress step={4} />
      <h1 className="text-fluid-page-title break-words" style={{ fontWeight: 700, color: "#081a2f", margin: "0 0 0.375rem" }}>
        Confirm Your Booking
      </h1>
      <p style={{ fontSize: "0.9375rem", color: "#5b6472", marginBottom: "1.75rem" }}>
        Review the details below before submitting your request.
      </p>

      <ReviewForm
        garageId={id}
        locationId={locationId}
        vehicleId={vehicleId}
        serviceType={serviceType}
        scheduledStart={scheduledStart}
        summary={{
          garageName: garage.businessName,
          locationLabel: `${location.name}, ${location.addressLine1}`,
          vehicleLabel: `${vehicle.year} ${vehicle.makeName} ${vehicle.modelName}${vehicle.plateNumber ? ` · ${vehicle.plateNumber}` : ""}`,
          serviceLabel: SERVICE_LABELS[serviceType] ?? serviceType,
        }}
      />
    </div>
  );
}
