import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { NotFoundError } from "@/lib/errors";
import { getGarageProfile } from "@/features/bookings/service";
import { GarageProfileView } from "./_components/garage-profile-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GarageProfilePage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { id } = await params;

  let garage;
  try {
    garage = await getGarageProfile(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const primaryLocation = garage.organization.garageLocations[0] ?? null;

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "1000px" }}>
      <GarageProfileView
        garage={{
          id: garage.id,
          businessName: garage.businessName,
          contactPhone: garage.contactPhone,
          contactEmail: garage.contactEmail,
          services: garage.services.map((s) => s.serviceType),
          vehicleCapabilities: garage.vehicleCapabilities.map((c) => c.vehicleType),
          makeNames: garage.makeSpecializations.map((m) => m.make.name),
          averageRating: garage.averageRating,
          reviewCount: garage.reviewCount,
          reviews: garage.reviews.map((r) => ({
            id: r.id,
            customerName: r.customer.name ?? "AutoIQ Customer",
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt.toISOString(),
          })),
          locations: garage.organization.garageLocations.map((l) => ({
            id: l.id,
            name: l.name,
            emirate: l.emirate,
            addressLine1: l.addressLine1,
            phone: l.phone,
            latitude: l.latitude,
            longitude: l.longitude,
            workingHours: l.workingHours.map((h) => ({
              dayOfWeek: h.dayOfWeek,
              isClosed: h.isClosed,
              openTime: h.openTime,
              closeTime: h.closeTime,
            })),
          })),
        }}
        primaryLocationId={primaryLocation?.id ?? null}
      />
    </div>
  );
}
