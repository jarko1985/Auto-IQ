import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getMyBookingDetail } from "@/features/bookings/service";
import { NotFoundError } from "@/lib/errors";
import { MyBookingDetailView } from "./_components/my-booking-detail-view";

export default async function MyBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { id } = await params;
  const booking = await getMyBookingDetail(session.user.id, id).catch((err) => {
    if (err instanceof NotFoundError) return null;
    throw err;
  });
  if (!booking) notFound();

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-8" style={{ maxWidth: "800px" }}>
      <MyBookingDetailView
        booking={{
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          status: booking.status,
          serviceType: booking.serviceType,
          scheduledStart: booking.scheduledStart.toISOString(),
          scheduledEnd: booking.scheduledEnd.toISOString(),
          proposedStart: booking.proposedStart?.toISOString() ?? null,
          proposedEnd: booking.proposedEnd?.toISOString() ?? null,
          rescheduleNote: booking.rescheduleNote,
          customerNotes: booking.customerNotes,
          rejectionReason: booking.rejectionReason,
          cancelledReason: booking.cancelledReason,
          garageName: booking.garage.businessName,
          garagePhone: booking.garage.contactPhone,
          garageEmail: booking.garage.contactEmail,
          locationName: booking.location.name,
          locationAddress: booking.location.addressLine1,
          vehicleLabel: `${booking.vehicle.year} ${booking.vehicle.makeName} ${booking.vehicle.modelName}`,
          statusHistory: booking.statusHistory.map((h) => ({
            id: h.id,
            toStatus: h.toStatus,
            note: h.note,
            createdAt: h.createdAt.toISOString(),
          })),
        }}
      />
    </div>
  );
}
