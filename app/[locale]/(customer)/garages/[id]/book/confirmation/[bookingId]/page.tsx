import { redirect, notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { CheckCircle2 } from "lucide-react";
import { auth } from "@/auth";
import { NotFoundError } from "@/lib/errors";
import { getMyBookingDetail } from "@/features/bookings/service";

interface Props {
  params: Promise<{ id: string; bookingId: string }>;
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

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export default async function BookingConfirmationPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const { bookingId } = await params;

  let booking;
  try {
    booking = await getMyBookingDetail(session.user.id, bookingId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <div style={{ padding: "3rem 2.5rem", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <CheckCircle2 size={48} color="#16a34a" style={{ margin: "0 auto 1rem" }} />
        <h1
          style={{ fontSize: "1.625rem", fontWeight: 700, color: "#081a2f", margin: "0 0 0.5rem" }}
        >
          Appointment Requested
        </h1>
        <p style={{ fontSize: "0.9375rem", color: "#5b6472", margin: 0 }}>
          {booking.garage.businessName} is reviewing your request. You'll be notified by email once
          your appointment is confirmed.
        </p>
      </div>

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "0.875rem",
          padding: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "0.8125rem", color: "#8a92a6" }}>Booking Reference</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#081a2f" }}>
            #{booking.bookingNumber}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "0.8125rem", color: "#8a92a6" }}>Garage</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#081a2f" }}>
            {booking.garage.businessName}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "0.8125rem", color: "#8a92a6" }}>Service</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#081a2f" }}>
            {SERVICE_LABELS[booking.serviceType] ?? booking.serviceType}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "0.8125rem", color: "#8a92a6" }}>Vehicle</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#081a2f" }}>
            {booking.vehicle.year} {booking.vehicle.makeName} {booking.vehicle.modelName}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.8125rem", color: "#8a92a6" }}>Date & Time</span>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#081a2f" }}>
            {formatDateTime(booking.scheduledStart.toISOString())} (GST)
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <Link
          href={"/dashboard/bookings" as never}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "0.75rem",
            backgroundColor: "#081a2f",
            color: "#fff",
            borderRadius: "0.75rem",
            fontSize: "0.9375rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          View My Bookings
        </Link>
        <Link
          href="/dashboard"
          style={{
            flex: 1,
            textAlign: "center",
            padding: "0.75rem",
            border: "1px solid var(--border)",
            color: "#44474d",
            borderRadius: "0.75rem",
            fontSize: "0.9375rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
