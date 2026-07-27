import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listMyBookings } from "@/features/bookings/service";
import { MyBookingsView } from "./_components/my-bookings-view";

export default async function MyBookingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { bookings, total } = await listMyBookings(session.user.id, { limit: 50, offset: 0 });

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "1000px" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        My Bookings
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Track your garage appointment requests. {total} booking{total === 1 ? "" : "s"} total.
      </p>

      <MyBookingsView
        initialBookings={bookings.map((b) => ({
          id: b.id,
          bookingNumber: b.bookingNumber,
          status: b.status,
          serviceType: b.serviceType,
          garageName: b.garage.businessName,
          locationName: b.location.name,
          vehicleLabel: `${b.vehicle.year} ${b.vehicle.makeName} ${b.vehicle.modelName}`,
          scheduledStart: b.scheduledStart.toISOString(),
        }))}
      />
    </div>
  );
}
