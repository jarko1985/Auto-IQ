import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listGarageCalendar } from "@/features/bookings/service";
import { GarageCalendarView } from "./_components/garage-calendar-view";

interface Props {
  searchParams: Promise<{ week?: string }>;
}

function currentGstSundayStr(): string {
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(new Date());
  const d = new Date(`${todayStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

export default async function GarageCalendarPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { week } = await searchParams;
  const weekStart = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : currentGstSundayStr();

  const windowStart = new Date(`${weekStart}T00:00:00Z`);
  windowStart.setUTCHours(windowStart.getUTCHours() - 8);
  const windowEnd = new Date(windowStart);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 7);
  windowEnd.setUTCHours(windowEnd.getUTCHours() + 16);

  const bookings = await listGarageCalendar(session.user.id, windowStart, windowEnd);

  return (
    <div style={{ padding: "2rem 2.5rem" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "#081a2f", marginBottom: "0.25rem" }}
      >
        Garage Calendar
      </h1>
      <p style={{ fontSize: "0.875rem", color: "#5b6472", marginBottom: "1.5rem" }}>
        Weekly view of confirmed and requested appointments.
      </p>

      <GarageCalendarView
        weekStart={weekStart}
        bookings={bookings.map((b) => ({
          id: b.id,
          bookingNumber: b.bookingNumber,
          status: b.status,
          serviceType: b.serviceType,
          customerName: b.customer.name ?? b.customer.email,
          vehicleLabel: `${b.vehicle.makeName} ${b.vehicle.modelName}`,
          scheduledStart: b.scheduledStart.toISOString(),
          scheduledEnd: b.scheduledEnd.toISOString(),
        }))}
      />
    </div>
  );
}
