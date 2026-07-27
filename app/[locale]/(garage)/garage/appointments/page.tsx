import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listGarageBookings } from "@/features/bookings/service";
import { GarageAppointmentsView } from "./_components/garage-appointments-view";

export default async function GarageAppointmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { bookings, total } = await listGarageBookings(session.user.id, { limit: 100, offset: 0 });

  return (
    <div style={{ padding: "2rem 2.5rem" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Appointment Requests
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Review and respond to incoming booking requests. {total} total.
      </p>

      <GarageAppointmentsView
        initialBookings={bookings.map((b) => ({
          id: b.id,
          bookingNumber: b.bookingNumber,
          status: b.status,
          serviceType: b.serviceType,
          scheduledStart: b.scheduledStart.toISOString(),
          scheduledEnd: b.scheduledEnd.toISOString(),
          proposedStart: b.proposedStart?.toISOString() ?? null,
          customerName: b.customer.name ?? b.customer.email,
          customerNotes: b.customerNotes,
          vehicleLabel: `${b.vehicle.year} ${b.vehicle.makeName} ${b.vehicle.modelName}${b.vehicle.plateNumber ? ` · ${b.vehicle.plateNumber}` : ""}`,
        }))}
      />
    </div>
  );
}
