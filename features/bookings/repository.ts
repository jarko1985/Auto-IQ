import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { AuditAction, BookingStatus, Prisma, ServiceType, VehicleType } from "@prisma/client";
import type { SearchGaragesInput } from "./schemas";

type TxClient = Prisma.TransactionClient;

export function generateBookingNumber(): string {
  return `BKG-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/** Statuses that hold a real claim on a location's schedule — anything else
 * (REJECTED/CANCELLED/COMPLETED/NO_SHOW) has vacated the slot. */
const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["REQUESTED", "RESCHEDULE_PROPOSED", "ACCEPTED"];

const bookingInclude = {
  vehicle: {
    select: { id: true, makeName: true, modelName: true, year: true, plateNumber: true },
  },
  garage: { select: { id: true, businessName: true, contactPhone: true, contactEmail: true } },
  location: {
    select: { id: true, name: true, emirate: true, addressLine1: true, phone: true },
  },
  customer: { select: { id: true, name: true, email: true } },
  statusHistory: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.AppointmentInclude;

// ── Public garage search & profile ───────────────────────────────────────────

const garageSearchInclude = {
  organization: {
    include: {
      garageLocations: { where: { isActive: true }, orderBy: { isPrimary: "desc" as const } },
    },
  },
  services: { where: { isActive: true } },
  vehicleCapabilities: true,
  makeSpecializations: { include: { make: true } },
} satisfies Prisma.GarageInclude;

/** Capped candidate window for the geo-sort path — small enough to fetch and
 * sort in JS entirely (garage counts are dozens post-reseed, not thousands;
 * see CLAUDE.md's Sprint 21 notes on why this doesn't warrant PostGIS). */
const GEO_CANDIDATE_WINDOW = 500;

function buildGarageSearchWhere(input: SearchGaragesInput): Prisma.GarageWhereInput {
  return {
    verificationStatus: "APPROVED",
    ...(input.query && {
      businessName: { contains: input.query, mode: "insensitive" },
    }),
    ...(input.serviceTypes &&
      input.serviceTypes.length > 0 && {
        services: { some: { serviceType: { in: input.serviceTypes }, isActive: true } },
      }),
    ...(input.vehicleType && { vehicleCapabilities: { some: { vehicleType: input.vehicleType } } }),
    ...(input.makeId && { makeSpecializations: { some: { makeId: input.makeId } } }),
    ...(input.emirate && {
      organization: { garageLocations: { some: { emirate: input.emirate, isActive: true } } },
    }),
  };
}

export async function searchGarages(input: SearchGaragesInput) {
  const where = buildGarageSearchWhere(input);

  if (input.lat != null && input.lng != null) {
    // Geo path — over-fetch a capped candidate window and let the service
    // layer compute distance, filter by radius, sort, and paginate in JS.
    const candidates = await db.garage.findMany({
      where,
      take: GEO_CANDIDATE_WINDOW,
      include: garageSearchInclude,
    });
    return { garages: candidates, total: candidates.length };
  }

  const [garages, total] = await Promise.all([
    db.garage.findMany({
      where,
      orderBy: input.sort === "rating" ? { averageRating: "desc" } : { createdAt: "desc" },
      take: input.limit,
      skip: input.offset,
      include: garageSearchInclude,
    }),
    db.garage.count({ where }),
  ]);

  return { garages, total };
}

export async function getPublicGarageProfile(garageId: string) {
  return db.garage.findFirst({
    where: { id: garageId, verificationStatus: "APPROVED" },
    include: {
      organization: {
        include: {
          garageLocations: {
            where: { isActive: true },
            orderBy: { isPrimary: "desc" },
            include: { workingHours: { orderBy: { dayOfWeek: "asc" } } },
          },
        },
      },
      services: { where: { isActive: true } },
      vehicleCapabilities: true,
      makeSpecializations: { include: { make: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { customer: { select: { name: true } } },
      },
    },
  });
}

export async function getActiveLocationForGarage(locationId: string, garageId: string) {
  return db.garageLocation.findFirst({
    where: { id: locationId, isActive: true, organization: { garage: { id: garageId } } },
    include: { workingHours: { orderBy: { dayOfWeek: "asc" } } },
  });
}

export async function getWorkingHoursForLocationDay(locationId: string, dayOfWeek: number) {
  return db.garageWorkingHours.findUnique({
    where: { locationId_dayOfWeek: { locationId, dayOfWeek } },
  });
}

/** Active bookings at a location whose slot could plausibly overlap the given
 * UTC day window — used to mark candidate slots unavailable. */
export async function listActiveBookingsInWindow(
  locationId: string,
  windowStart: Date,
  windowEnd: Date,
) {
  return db.appointment.findMany({
    where: {
      locationId,
      status: { in: ACTIVE_BOOKING_STATUSES },
      scheduledStart: { lt: windowEnd },
      scheduledEnd: { gt: windowStart },
    },
    select: { scheduledStart: true, scheduledEnd: true },
  });
}

// ── Booking creation (with double-booking prevention) ───────────────────────

/** Takes a transaction-scoped Postgres advisory lock keyed on the location —
 * serializes concurrent booking attempts for the same location so the
 * conflict-check + insert below behaves atomically even under READ COMMITTED.
 * Released automatically when the transaction commits or rolls back. */
export async function lockLocationForBooking(tx: TxClient, locationId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${locationId}::text, 0))`;
}

export async function findConflictingBooking(
  tx: TxClient,
  locationId: string,
  start: Date,
  end: Date,
  excludeBookingId?: string,
) {
  return tx.appointment.findFirst({
    where: {
      locationId,
      status: { in: ACTIVE_BOOKING_STATUSES },
      scheduledStart: { lt: end },
      scheduledEnd: { gt: start },
      ...(excludeBookingId && { id: { not: excludeBookingId } }),
    },
  });
}

export async function createBooking(
  tx: TxClient,
  data: {
    bookingNumber: string;
    customerId: string;
    vehicleId: string;
    garageId: string;
    locationId: string;
    serviceType: ServiceType;
    scheduledStart: Date;
    scheduledEnd: Date;
    customerNotes?: string;
    diagnosticSessionId?: string;
  },
) {
  return tx.appointment.create({
    data: {
      bookingNumber: data.bookingNumber,
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      garageId: data.garageId,
      locationId: data.locationId,
      serviceType: data.serviceType,
      scheduledStart: data.scheduledStart,
      scheduledEnd: data.scheduledEnd,
      customerNotes: data.customerNotes,
      diagnosticSessionId: data.diagnosticSessionId,
      statusHistory: {
        create: { toStatus: "REQUESTED", changedById: data.customerId, note: "Booking requested" },
      },
    },
    include: bookingInclude,
  });
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getBookingById(id: string) {
  return db.appointment.findUnique({ where: { id }, include: bookingInclude });
}

export async function getBookingForCustomer(id: string, customerId: string) {
  return db.appointment.findFirst({ where: { id, customerId }, include: bookingInclude });
}

export async function getBookingForGarage(id: string, garageId: string) {
  return db.appointment.findFirst({ where: { id, garageId }, include: bookingInclude });
}

export async function listBookingsForCustomer(
  customerId: string,
  input: { status?: BookingStatus; limit: number; offset: number },
) {
  const where: Prisma.AppointmentWhereInput = {
    customerId,
    ...(input.status && { status: input.status }),
  };

  const [bookings, total] = await Promise.all([
    db.appointment.findMany({
      where,
      orderBy: { scheduledStart: "desc" },
      take: input.limit,
      skip: input.offset,
      include: bookingInclude,
    }),
    db.appointment.count({ where }),
  ]);
  return { bookings, total };
}

export async function listBookingsForGarage(
  garageId: string,
  input: { status?: BookingStatus; limit: number; offset: number },
) {
  const where: Prisma.AppointmentWhereInput = {
    garageId,
    ...(input.status && { status: input.status }),
  };

  const [bookings, total] = await Promise.all([
    db.appointment.findMany({
      where,
      orderBy: { scheduledStart: "asc" },
      take: input.limit,
      skip: input.offset,
      include: bookingInclude,
    }),
    db.appointment.count({ where }),
  ]);
  return { bookings, total };
}

/** All active bookings for a garage in a date window — feeds the weekly
 * calendar view (no separate pagination; a week's worth of slots is small). */
export async function listGarageBookingsInWindow(
  garageId: string,
  windowStart: Date,
  windowEnd: Date,
) {
  return db.appointment.findMany({
    where: {
      garageId,
      status: { in: [...ACTIVE_BOOKING_STATUSES, "COMPLETED"] },
      scheduledStart: { lt: windowEnd },
      scheduledEnd: { gt: windowStart },
    },
    orderBy: { scheduledStart: "asc" },
    include: bookingInclude,
  });
}

// ── Status transitions ───────────────────────────────────────────────────────

export async function updateBookingStatus(
  tx: TxClient,
  bookingId: string,
  data: {
    fromStatus: BookingStatus;
    status: BookingStatus;
    timestampField?: "acceptedAt" | "completedAt" | "noShowAt" | "cancelledAt";
    changedById: string | null;
    note?: string;
    rejectionReason?: string;
    cancelledReason?: string;
    cancelledById?: string;
    scheduledStart?: Date;
    scheduledEnd?: Date;
    proposedStart?: Date | null;
    proposedEnd?: Date | null;
    rescheduleNote?: string | null;
  },
) {
  return tx.appointment.update({
    where: { id: bookingId },
    data: {
      status: data.status,
      ...(data.timestampField && { [data.timestampField]: new Date() }),
      ...(data.rejectionReason !== undefined && { rejectionReason: data.rejectionReason }),
      ...(data.cancelledReason !== undefined && { cancelledReason: data.cancelledReason }),
      ...(data.cancelledById !== undefined && { cancelledById: data.cancelledById }),
      ...(data.scheduledStart !== undefined && { scheduledStart: data.scheduledStart }),
      ...(data.scheduledEnd !== undefined && { scheduledEnd: data.scheduledEnd }),
      ...(data.proposedStart !== undefined && { proposedStart: data.proposedStart }),
      ...(data.proposedEnd !== undefined && { proposedEnd: data.proposedEnd }),
      ...(data.rescheduleNote !== undefined && { rescheduleNote: data.rescheduleNote }),
      statusHistory: {
        create: {
          fromStatus: data.fromStatus,
          toStatus: data.status,
          changedById: data.changedById,
          note: data.note,
        },
      },
    },
    include: bookingInclude,
  });
}

// ── Vehicle types (for filter/vehicle ownership checks) ──────────────────────

export async function getOwnedVehicle(vehicleId: string, customerId: string) {
  return db.customerVehicle.findFirst({
    where: { id: vehicleId, userId: customerId, deletedAt: null },
  });
}

export type { VehicleType };

// ── Audit ────────────────────────────────────────────────────────────────────

export async function createAuditLog(data: {
  userId: string;
  action: AuditAction;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return db.auditLog.create({
    data: {
      action: data.action,
      resourceId: data.resourceId,
      metadata: data.metadata,
      user: { connect: { id: data.userId } },
    },
  });
}
