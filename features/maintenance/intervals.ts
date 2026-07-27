import type { ServiceType } from "@prisma/client";

export interface MaintenanceInterval {
  intervalKm: number;
  intervalMonths: number;
}

/**
 * Hand-curated standard maintenance intervals per ServiceType, in the spirit
 * of features/diagnostics/taxonomy.ts's placeholder taxonomy — no real
 * per-vehicle-model service schedule exists anywhere in the codebase, so this
 * is a single reasonable UAE-climate default per service type rather than a
 * make/model-specific lookup. `OTHER` has no fixed interval (free text) and is
 * deliberately omitted — predictions only ever cover the other 10 types.
 */
export const MAINTENANCE_INTERVALS: Partial<Record<ServiceType, MaintenanceInterval>> = {
  OIL_CHANGE: { intervalKm: 10_000, intervalMonths: 6 },
  TYRE_ROTATION: { intervalKm: 10_000, intervalMonths: 6 },
  BRAKE_SERVICE: { intervalKm: 20_000, intervalMonths: 12 },
  FILTER_CHANGE: { intervalKm: 15_000, intervalMonths: 12 },
  FLUID_CHECK: { intervalKm: 20_000, intervalMonths: 12 },
  BATTERY_REPLACEMENT: { intervalKm: 60_000, intervalMonths: 36 },
  TIMING_BELT: { intervalKm: 100_000, intervalMonths: 60 },
  AC_SERVICE: { intervalKm: 20_000, intervalMonths: 12 },
  TRANSMISSION_SERVICE: { intervalKm: 60_000, intervalMonths: 24 },
  GENERAL_INSPECTION: { intervalKm: 10_000, intervalMonths: 12 },
};

/** A prediction is flagged DUE_SOON once it's within this many km or days of
 * its due point — whichever threshold is crossed first. */
export const DUE_SOON_KM_THRESHOLD = 1_500;
export const DUE_SOON_DAYS_THRESHOLD = 30;
