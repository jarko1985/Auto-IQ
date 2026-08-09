// Pure, unit-tested slot arithmetic for the booking engine — no DB access here
// (see repository.ts for the query that supplies `bookedRanges`).
//
// All wall-clock times ("HH:mm" on GarageWorkingHours, and the `date` strings
// this module accepts) are treated as Gulf Standard Time (UTC+4, no DST) —
// AutoIQ is UAE-only for the MVP. Slot starts/ends are stored and compared as
// real UTC instants so double-booking checks are correct regardless of the
// server's own timezone.

export const GST_OFFSET_MINUTES = 4 * 60;
export const SERVICE_DURATION_MINUTES = 60;
export const SLOT_GRANULARITY_MINUTES = 30;

/** Per-service-type slot duration overrides — anything not listed here uses
 * the standard SERVICE_DURATION_MINUTES. OBD_SCAN is quick (a code read/clear,
 * not a full workshop visit) so it reserves a shorter slot than every other
 * service type, which all still share the one fixed 60-minute duration. */
const SERVICE_DURATION_OVERRIDES_MINUTES: Partial<Record<string, number>> = {
  OBD_SCAN: 15,
};

export function getServiceDurationMinutes(serviceType: string): number {
  return SERVICE_DURATION_OVERRIDES_MINUTES[serviceType] ?? SERVICE_DURATION_MINUTES;
}

export interface WorkingHoursDay {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export interface BookedRange {
  scheduledStart: Date;
  scheduledEnd: Date;
}

export interface SlotCandidate {
  start: Date;
  end: Date;
  available: boolean;
}

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** "2024-10-15" -> day-of-week, 0 = Sunday .. 6 = Saturday, independent of any
 * timezone since a calendar date's weekday never depends on a clock offset. */
export function dayOfWeekFromDateStr(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/** Converts a GST wall-clock instant ("2024-10-15" + minutes-since-midnight)
 * into the equivalent real UTC Date. */
function gstToUtc(dateStr: string, minutesSinceMidnight: number): Date {
  const base = new Date(`${dateStr}T00:00:00Z`);
  return new Date(base.getTime() + (minutesSinceMidnight - GST_OFFSET_MINUTES) * 60_000);
}

/** Generates every deterministic candidate slot for one location/day, marking
 * each one available or not based on `bookedRanges` (already-active bookings
 * at that location, fetched by the caller). Slots that start in the past
 * (relative to `now`) are omitted entirely. */
export function generateSlotsForDay(
  dateStr: string,
  workingHours: WorkingHoursDay | null,
  bookedRanges: BookedRange[],
  now: Date = new Date(),
  durationMinutes: number = SERVICE_DURATION_MINUTES,
): SlotCandidate[] {
  if (!workingHours || workingHours.isClosed || !workingHours.openTime || !workingHours.closeTime) {
    return [];
  }

  const openMin = parseTimeToMinutes(workingHours.openTime);
  const closeMin = parseTimeToMinutes(workingHours.closeTime);
  const slots: SlotCandidate[] = [];

  for (
    let startMin = openMin;
    startMin + durationMinutes <= closeMin;
    startMin += SLOT_GRANULARITY_MINUTES
  ) {
    const start = gstToUtc(dateStr, startMin);
    const end = gstToUtc(dateStr, startMin + durationMinutes);
    if (start < now) continue;

    const overlaps = bookedRanges.some((b) => start < b.scheduledEnd && end > b.scheduledStart);
    slots.push({ start, end, available: !overlaps });
  }

  return slots;
}

/** Re-validates a customer-submitted slot server-side — never trust the start
 * time a client posts without confirming it actually aligns to this location's
 * deterministic grid and working hours. */
export function isSlotWithinWorkingHours(
  scheduledStart: Date,
  workingHours: WorkingHoursDay | null,
  durationMinutes: number = SERVICE_DURATION_MINUTES,
): boolean {
  if (!workingHours || workingHours.isClosed || !workingHours.openTime || !workingHours.closeTime) {
    return false;
  }

  const totalMinutesSinceEpoch = Math.floor(scheduledStart.getTime() / 60_000) + GST_OFFSET_MINUTES;
  const startMin = ((totalMinutesSinceEpoch % (24 * 60)) + 24 * 60) % (24 * 60);

  const openMin = parseTimeToMinutes(workingHours.openTime);
  const closeMin = parseTimeToMinutes(workingHours.closeTime);
  if (startMin < openMin || startMin + durationMinutes > closeMin) return false;
  if (startMin % SLOT_GRANULARITY_MINUTES !== 0) return false;
  if (scheduledStart.getUTCSeconds() !== 0 || scheduledStart.getUTCMilliseconds() !== 0)
    return false;

  return true;
}
