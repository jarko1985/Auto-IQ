import { db } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getEmailProvider } from "@/lib/email";
import { logger } from "@/lib/observability/logger";
import { haversineDistanceKm } from "@/lib/geo";
import { notifyBookingAccepted, notifyBookingRequested } from "@/features/notifications/service";
import { PERMISSIONS } from "@/features/auth/permissions";
import { hasPermission } from "@/features/auth/rbac";
import { getGarageContext } from "@/features/garages/service";
import * as repo from "./repository";
import {
  dayOfWeekFromDateStr,
  generateSlotsForDay,
  getServiceDurationMinutes,
  isSlotWithinWorkingHours,
} from "./slots";
import type {
  CancelBookingInput,
  CreateBookingInput,
  ListBookingsInput,
  ListSlotsInput,
  ProposeRescheduleInput,
  RejectBookingInput,
  RespondToRescheduleInput,
  SearchGaragesInput,
} from "./schemas";

// ── Public garage search & availability ──────────────────────────────────────

/** Distance-sort/filter/paginate happens here, not in the repository — the
 * repository's geo path only over-fetches a capped candidate window (see
 * GEO_CANDIDATE_WINDOW), the service layer does the actual haversine math,
 * radius filtering, and pagination on the resulting JS array. */
export async function searchGarages(input: SearchGaragesInput) {
  const { garages, total } = await repo.searchGarages(input);

  if (input.lat == null || input.lng == null) {
    return { garages: garages.map((g) => ({ ...g, distanceKm: null as number | null })), total };
  }

  const origin = { latitude: input.lat, longitude: input.lng };
  const withDistance = garages.map((g) => {
    const primaryLocation = g.organization.garageLocations[0];
    const distanceKm =
      primaryLocation?.latitude != null && primaryLocation?.longitude != null
        ? haversineDistanceKm(origin, {
            latitude: primaryLocation.latitude,
            longitude: primaryLocation.longitude,
          })
        : null;
    return { ...g, distanceKm };
  });

  const filtered =
    input.radiusKm != null
      ? withDistance.filter((g) => g.distanceKm != null && g.distanceKm <= input.radiusKm!)
      : withDistance;

  filtered.sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0;
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });

  const paged = filtered.slice(input.offset, input.offset + input.limit);
  return { garages: paged, total: filtered.length };
}

type SearchedGarage = Awaited<ReturnType<typeof searchGarages>>["garages"][number];

export interface GarageSearchResult {
  id: string;
  businessName: string;
  description: string | null;
  photoUrl: string | null;
  // The primary location's id — search results (and the search result shape
  // generally) only ever surface the primary location's fields, same
  // simplification already applied to emirate/addressLine1/lat/lng below.
  locationId: string | null;
  emirate: string | null;
  addressLine1: string | null;
  latitude: number | null;
  longitude: number | null;
  locationCount: number;
  services: string[];
  vehicleCapabilities: string[];
  makeNames: string[];
  averageRating: number;
  reviewCount: number;
  distanceKm: number | null;
}

/** Flattens a raw searchGarages() row to the shape both the SSR page and the
 * client-side re-search fetch (garage-search-view.tsx) render — a single
 * shared mapper so the two can never disagree with each other about what a
 * "garage search result" looks like over the wire. */
export function toGarageSearchResult(g: SearchedGarage): GarageSearchResult {
  const primaryLocation = g.organization.garageLocations[0];
  return {
    id: g.id,
    businessName: g.businessName,
    description: g.description,
    photoUrl: g.photoUrl,
    locationId: primaryLocation?.id ?? null,
    emirate: primaryLocation?.emirate ?? null,
    addressLine1: primaryLocation?.addressLine1 ?? null,
    latitude: primaryLocation?.latitude ?? null,
    longitude: primaryLocation?.longitude ?? null,
    locationCount: g.organization.garageLocations.length,
    services: g.services.map((s) => s.serviceType),
    vehicleCapabilities: g.vehicleCapabilities.map((c) => c.vehicleType),
    makeNames: g.makeSpecializations.map((m) => m.make.name),
    averageRating: g.averageRating,
    reviewCount: g.reviewCount,
    distanceKm: g.distanceKm,
  };
}

export async function getGarageProfile(garageId: string) {
  const garage = await repo.getPublicGarageProfile(garageId);
  if (!garage) throw new NotFoundError("Garage");
  return garage;
}

export async function listAvailableSlots(garageId: string, input: ListSlotsInput) {
  const location = await repo.getActiveLocationForGarage(input.locationId, garageId);
  if (!location) throw new NotFoundError("Garage location");

  const dayOfWeek = dayOfWeekFromDateStr(input.date);
  const workingHours =
    location.workingHours.find((h) => h.dayOfWeek === dayOfWeek) ??
    (await repo.getWorkingHoursForLocationDay(input.locationId, dayOfWeek));

  // Query a generous UTC window around the calendar day to safely capture any
  // GST-local slot that falls near a UTC day boundary.
  const windowStart = new Date(`${input.date}T00:00:00Z`);
  windowStart.setUTCHours(windowStart.getUTCHours() - 8);
  const windowEnd = new Date(`${input.date}T00:00:00Z`);
  windowEnd.setUTCHours(windowEnd.getUTCHours() + 32);

  const bookedRanges = await repo.listActiveBookingsInWindow(
    input.locationId,
    windowStart,
    windowEnd,
  );
  const durationMinutes = getServiceDurationMinutes(input.serviceType ?? "");
  const slots = generateSlotsForDay(
    input.date,
    workingHours ?? null,
    bookedRanges,
    new Date(),
    durationMinutes,
  );

  return slots.map((s) => ({
    start: s.start.toISOString(),
    end: s.end.toISOString(),
    available: s.available,
  }));
}

// ── Customer: create / view / cancel ─────────────────────────────────────────

export async function createBooking(customerId: string, input: CreateBookingInput) {
  const vehicle = await repo.getOwnedVehicle(input.vehicleId, customerId);
  if (!vehicle) throw new NotFoundError("Vehicle");

  const garage = await repo.getPublicGarageProfile(input.garageId);
  if (!garage) throw new NotFoundError("Garage");

  const location = garage.organization.garageLocations.find((l) => l.id === input.locationId);
  if (!location) throw new NotFoundError("Garage location");

  const offersService = garage.services.some((s) => s.serviceType === input.serviceType);
  if (!offersService) {
    throw new ValidationError("This garage does not offer the selected service.");
  }

  if (input.diagnosticSessionId) {
    const session = await db.diagnosticSession.findFirst({
      where: { id: input.diagnosticSessionId, userId: customerId, vehicleId: input.vehicleId },
    });
    if (!session) throw new NotFoundError("Diagnostic session");
  }

  const scheduledStart = new Date(input.scheduledStart);
  if (Number.isNaN(scheduledStart.getTime())) {
    throw new ValidationError("Invalid scheduled start time.");
  }
  if (scheduledStart.getTime() < Date.now()) {
    throw new ValidationError("Cannot book a time in the past.");
  }

  // scheduledStart's GST calendar day (not its UTC date) determines which
  // working-hours row applies.
  const gstDate = new Date(scheduledStart.getTime() + 4 * 60 * 60_000);
  const workingHours =
    location.workingHours.find((h) => h.dayOfWeek === gstDate.getUTCDay()) ?? null;

  const durationMinutes = getServiceDurationMinutes(input.serviceType);
  if (!isSlotWithinWorkingHours(scheduledStart, workingHours, durationMinutes)) {
    throw new ValidationError("The selected time is outside this garage's working hours.");
  }

  const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60_000);
  const bookingNumber = repo.generateBookingNumber();

  const booking = await db.$transaction(async (tx) => {
    await repo.lockLocationForBooking(tx, input.locationId);
    const conflict = await repo.findConflictingBooking(
      tx,
      input.locationId,
      scheduledStart,
      scheduledEnd,
    );
    if (conflict) {
      throw new ConflictError(
        "This time slot was just booked by someone else. Please pick another.",
      );
    }

    return repo.createBooking(tx, {
      bookingNumber,
      customerId,
      vehicleId: input.vehicleId,
      garageId: input.garageId,
      locationId: input.locationId,
      serviceType: input.serviceType,
      scheduledStart,
      scheduledEnd,
      customerNotes: input.customerNotes,
      diagnosticSessionId: input.diagnosticSessionId,
    });
  });

  await repo.createAuditLog({
    userId: customerId,
    action: "BOOKING_REQUESTED",
    resourceId: booking.id,
    metadata: { bookingNumber, garageId: input.garageId, serviceType: input.serviceType },
  });

  getEmailProvider()
    .sendBookingRequested(garage.contactEmail, {
      garageName: garage.businessName,
      bookingNumber,
      scheduledStart: scheduledStart.toISOString(),
    })
    .catch((err: unknown) => logger.error({ err }, "Failed to send booking-requested email"));

  void notifyBookingRequested(garage.organization.id, booking.id, {
    garageName: garage.businessName,
    bookingNumber,
    scheduledStart: scheduledStart.toISOString(),
  });

  return booking;
}

export async function listMyBookings(customerId: string, input: ListBookingsInput) {
  return repo.listBookingsForCustomer(customerId, input);
}

export async function getMyBookingDetail(customerId: string, bookingId: string) {
  const booking = await repo.getBookingForCustomer(bookingId, customerId);
  if (!booking) throw new NotFoundError("Booking");
  return booking;
}

const CUSTOMER_CANCELLABLE_STATUSES = ["REQUESTED", "RESCHEDULE_PROPOSED", "ACCEPTED"] as const;

export async function cancelMyBooking(
  customerId: string,
  bookingId: string,
  input: CancelBookingInput,
) {
  const booking = await repo.getBookingForCustomer(bookingId, customerId);
  if (!booking) throw new NotFoundError("Booking");
  if (!(CUSTOMER_CANCELLABLE_STATUSES as readonly string[]).includes(booking.status)) {
    throw new ConflictError("This booking can no longer be cancelled.");
  }

  const updated = await db.$transaction((tx) =>
    repo.updateBookingStatus(tx, bookingId, {
      fromStatus: booking.status,
      status: "CANCELLED",
      timestampField: "cancelledAt",
      changedById: customerId,
      cancelledById: customerId,
      cancelledReason: input.reason,
      note: input.reason,
    }),
  );

  await repo.createAuditLog({
    userId: customerId,
    action: "BOOKING_CANCELLED",
    resourceId: bookingId,
    metadata: { reason: input.reason },
  });

  return updated;
}

export async function respondToReschedule(
  customerId: string,
  bookingId: string,
  input: RespondToRescheduleInput,
) {
  const booking = await repo.getBookingForCustomer(bookingId, customerId);
  if (!booking) throw new NotFoundError("Booking");
  if (booking.status !== "RESCHEDULE_PROPOSED" || !booking.proposedStart || !booking.proposedEnd) {
    throw new ConflictError("There is no pending reschedule proposal for this booking.");
  }

  const updated = await db.$transaction(async (tx) => {
    if (input.accept) {
      await repo.lockLocationForBooking(tx, booking.locationId);
      const conflict = await repo.findConflictingBooking(
        tx,
        booking.locationId,
        booking.proposedStart!,
        booking.proposedEnd!,
        bookingId,
      );
      if (conflict) {
        throw new ConflictError("The proposed slot is no longer available.");
      }

      return repo.updateBookingStatus(tx, bookingId, {
        fromStatus: booking.status,
        status: "ACCEPTED",
        timestampField: "acceptedAt",
        changedById: customerId,
        scheduledStart: booking.proposedStart!,
        scheduledEnd: booking.proposedEnd!,
        proposedStart: null,
        proposedEnd: null,
        rescheduleNote: null,
        note: "Customer accepted the proposed time",
      });
    }

    return repo.updateBookingStatus(tx, bookingId, {
      fromStatus: booking.status,
      status: "CANCELLED",
      timestampField: "cancelledAt",
      changedById: customerId,
      cancelledById: customerId,
      cancelledReason: "Customer declined the proposed reschedule",
      proposedStart: null,
      proposedEnd: null,
      rescheduleNote: null,
      note: "Customer declined the proposed reschedule",
    });
  });

  await repo.createAuditLog({
    userId: customerId,
    action: input.accept ? "BOOKING_RESCHEDULE_ACCEPTED" : "BOOKING_RESCHEDULE_DECLINED",
    resourceId: bookingId,
  });

  return updated;
}

// ── Garage: manage incoming requests ─────────────────────────────────────────

async function requireBookingManageContext(userId: string) {
  const context = await getGarageContext(userId);
  if (!context) throw new NotFoundError("Garage organization");
  if (!hasPermission(context.membershipRole, PERMISSIONS.GARAGE_APPOINTMENTS_MANAGE)) {
    throw new ForbiddenError("You do not have permission to manage appointments.");
  }
  return context;
}

export async function listGarageBookings(userId: string, input: ListBookingsInput) {
  const context = await requireBookingManageContext(userId);
  return repo.listBookingsForGarage(context.garageId, input);
}

export async function getGarageBookingDetail(userId: string, bookingId: string) {
  const context = await requireBookingManageContext(userId);
  const booking = await repo.getBookingForGarage(bookingId, context.garageId);
  if (!booking) throw new NotFoundError("Booking");
  return booking;
}

export async function listGarageCalendar(userId: string, weekStart: Date, weekEnd: Date) {
  const context = await requireBookingManageContext(userId);
  return repo.listGarageBookingsInWindow(context.garageId, weekStart, weekEnd);
}

async function notifyCustomer(
  booking: Awaited<ReturnType<typeof repo.getBookingForGarage>>,
  status: string,
  note?: string,
) {
  if (!booking) return;
  getEmailProvider()
    .sendBookingStatusUpdate(booking.customer.email, {
      garageName: booking.garage.businessName,
      bookingNumber: booking.bookingNumber,
      status,
      note,
    })
    .catch((err: unknown) => logger.error({ err }, "Failed to send booking status update email"));
}

export async function acceptBooking(userId: string, bookingId: string) {
  const context = await requireBookingManageContext(userId);
  const booking = await repo.getBookingForGarage(bookingId, context.garageId);
  if (!booking) throw new NotFoundError("Booking");
  if (booking.status !== "REQUESTED") {
    throw new ConflictError("Only a requested booking can be accepted.");
  }

  const updated = await db.$transaction((tx) =>
    repo.updateBookingStatus(tx, bookingId, {
      fromStatus: booking.status,
      status: "ACCEPTED",
      timestampField: "acceptedAt",
      changedById: userId,
      note: "Garage accepted the appointment",
    }),
  );

  await repo.createAuditLog({ userId, action: "BOOKING_ACCEPTED", resourceId: bookingId });
  await notifyCustomer(booking, "ACCEPTED");
  void notifyBookingAccepted(booking.customerId, bookingId, {
    garageName: booking.garage.businessName,
    bookingNumber: booking.bookingNumber,
    scheduledStart: booking.scheduledStart.toISOString(),
  });
  return updated;
}

export async function rejectBooking(userId: string, bookingId: string, input: RejectBookingInput) {
  const context = await requireBookingManageContext(userId);
  const booking = await repo.getBookingForGarage(bookingId, context.garageId);
  if (!booking) throw new NotFoundError("Booking");
  if (booking.status !== "REQUESTED") {
    throw new ConflictError("Only a requested booking can be rejected.");
  }

  const updated = await db.$transaction((tx) =>
    repo.updateBookingStatus(tx, bookingId, {
      fromStatus: booking.status,
      status: "REJECTED",
      changedById: userId,
      rejectionReason: input.reason,
      note: input.reason,
    }),
  );

  await repo.createAuditLog({
    userId,
    action: "BOOKING_REJECTED",
    resourceId: bookingId,
    metadata: { reason: input.reason },
  });
  await notifyCustomer(booking, "REJECTED", input.reason);
  return updated;
}

const RESCHEDULABLE_STATUSES = ["REQUESTED", "ACCEPTED"] as const;

export async function proposeReschedule(
  userId: string,
  bookingId: string,
  input: ProposeRescheduleInput,
) {
  const context = await requireBookingManageContext(userId);
  const booking = await repo.getBookingForGarage(bookingId, context.garageId);
  if (!booking) throw new NotFoundError("Booking");
  if (!(RESCHEDULABLE_STATUSES as readonly string[]).includes(booking.status)) {
    throw new ConflictError("This booking cannot be rescheduled right now.");
  }

  const proposedStart = new Date(input.proposedStart);
  if (Number.isNaN(proposedStart.getTime()) || proposedStart.getTime() < Date.now()) {
    throw new ValidationError("Proposed time must be a valid, future date.");
  }

  const location = await repo.getActiveLocationForGarage(booking.locationId, context.garageId);
  if (!location) throw new NotFoundError("Garage location");
  const gstDate = new Date(proposedStart.getTime() + 4 * 60 * 60_000);
  const workingHours =
    location.workingHours.find((h) => h.dayOfWeek === gstDate.getUTCDay()) ?? null;
  const durationMinutes = getServiceDurationMinutes(booking.serviceType);
  if (!isSlotWithinWorkingHours(proposedStart, workingHours, durationMinutes)) {
    throw new ValidationError("The proposed time is outside this garage's working hours.");
  }

  const proposedEnd = new Date(proposedStart.getTime() + durationMinutes * 60_000);

  const updated = await db.$transaction(async (tx) => {
    await repo.lockLocationForBooking(tx, booking.locationId);
    const conflict = await repo.findConflictingBooking(
      tx,
      booking.locationId,
      proposedStart,
      proposedEnd,
      bookingId,
    );
    if (conflict) throw new ConflictError("The proposed time overlaps another booking.");

    return repo.updateBookingStatus(tx, bookingId, {
      fromStatus: booking.status,
      status: "RESCHEDULE_PROPOSED",
      changedById: userId,
      proposedStart,
      proposedEnd,
      rescheduleNote: input.note,
      note: input.note ?? "Garage proposed a new time",
    });
  });

  await repo.createAuditLog({
    userId,
    action: "BOOKING_RESCHEDULE_PROPOSED",
    resourceId: bookingId,
  });
  await notifyCustomer(booking, "RESCHEDULE_PROPOSED", input.note);
  return updated;
}

export async function markBookingCompleted(userId: string, bookingId: string) {
  const context = await requireBookingManageContext(userId);
  const booking = await repo.getBookingForGarage(bookingId, context.garageId);
  if (!booking) throw new NotFoundError("Booking");
  if (booking.status !== "ACCEPTED") {
    throw new ConflictError("Only an accepted booking can be marked completed.");
  }
  if (booking.scheduledStart.getTime() > Date.now()) {
    throw new ConflictError("This appointment has not started yet.");
  }

  const updated = await db.$transaction((tx) =>
    repo.updateBookingStatus(tx, bookingId, {
      fromStatus: booking.status,
      status: "COMPLETED",
      timestampField: "completedAt",
      changedById: userId,
      note: "Appointment completed",
    }),
  );

  await repo.createAuditLog({ userId, action: "BOOKING_COMPLETED", resourceId: bookingId });
  return updated;
}

export async function markBookingNoShow(userId: string, bookingId: string) {
  const context = await requireBookingManageContext(userId);
  const booking = await repo.getBookingForGarage(bookingId, context.garageId);
  if (!booking) throw new NotFoundError("Booking");
  if (booking.status !== "ACCEPTED") {
    throw new ConflictError("Only an accepted booking can be marked as a no-show.");
  }
  if (booking.scheduledStart.getTime() > Date.now()) {
    throw new ConflictError("This appointment has not started yet.");
  }

  const updated = await db.$transaction((tx) =>
    repo.updateBookingStatus(tx, bookingId, {
      fromStatus: booking.status,
      status: "NO_SHOW",
      timestampField: "noShowAt",
      changedById: userId,
      note: "Customer did not show up",
    }),
  );

  await repo.createAuditLog({ userId, action: "BOOKING_NO_SHOW", resourceId: bookingId });
  return updated;
}

const GARAGE_CANCELLABLE_STATUSES = ["REQUESTED", "RESCHEDULE_PROPOSED", "ACCEPTED"] as const;

export async function cancelBookingByGarage(
  userId: string,
  bookingId: string,
  input: CancelBookingInput,
) {
  const context = await requireBookingManageContext(userId);
  const booking = await repo.getBookingForGarage(bookingId, context.garageId);
  if (!booking) throw new NotFoundError("Booking");
  if (!(GARAGE_CANCELLABLE_STATUSES as readonly string[]).includes(booking.status)) {
    throw new ConflictError("This booking can no longer be cancelled.");
  }

  const updated = await db.$transaction((tx) =>
    repo.updateBookingStatus(tx, bookingId, {
      fromStatus: booking.status,
      status: "CANCELLED",
      timestampField: "cancelledAt",
      changedById: userId,
      cancelledById: userId,
      cancelledReason: input.reason,
      note: input.reason,
    }),
  );

  await repo.createAuditLog({
    userId,
    action: "BOOKING_CANCELLED",
    resourceId: bookingId,
    metadata: { reason: input.reason },
  });
  await notifyCustomer(booking, "CANCELLED", input.reason);
  return updated;
}
