import type { ServiceType } from "@prisma/client";
import { MAINTENANCE_INTERVALS, DUE_SOON_KM_THRESHOLD, DUE_SOON_DAYS_THRESHOLD } from "./intervals";

export type MaintenanceUrgency = "OK" | "DUE_SOON" | "OVERDUE";

export interface ServiceHistoryRecord {
  serviceType: ServiceType;
  date: Date;
  mileageKm: number;
}

export interface VehicleMileage {
  currentMileageKm: number;
}

export interface PredictedService {
  serviceType: ServiceType;
  urgency: MaintenanceUrgency;
  lastServiceDate: Date;
  lastServiceMileageKm: number;
  dueAtMileageKm: number;
  dueByDate: Date;
  /** Negative once overdue. */
  remainingKm: number;
  /** Negative once overdue. */
  remainingDays: number;
}

export interface MaintenanceSummary {
  hasServiceHistory: boolean;
  predictions: PredictedService[];
  healthScore: number;
  overallStatus: MaintenanceUrgency;
}

const URGENCY_RANK: Record<MaintenanceUrgency, number> = { OVERDUE: 0, DUE_SOON: 1, OK: 2 };
const OVERDUE_PENALTY = 20;
const DUE_SOON_PENALTY = 8;
const MIN_HEALTH_SCORE = 30;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyFor(remainingKm: number, remainingDays: number): MaintenanceUrgency {
  if (remainingKm <= 0 || remainingDays <= 0) return "OVERDUE";
  if (remainingKm <= DUE_SOON_KM_THRESHOLD || remainingDays <= DUE_SOON_DAYS_THRESHOLD)
    return "DUE_SOON";
  return "OK";
}

/**
 * Pure prediction of upcoming/overdue services from service history and the
 * vehicle's current odometer reading. No DB access — safe to unit test
 * directly (mirrors features/diagnostics/safety.ts and features/bookings/slots.ts
 * keeping their core logic pure and separately testable from the DB-touching
 * service layer).
 *
 * "Elapsed since last service" is computed per ServiceType independently: the
 * most recent history entry of that type (by date, mileage tie-broken by the
 * higher reading) supplies the baseline odometer/date, and elapsed mileage is
 * `vehicle.currentMileageKm - thatEntry.mileageKm`. A ServiceType with no
 * history entry at all has no baseline to measure elapsed-since from, so it is
 * never predicted — fabricating a "since new" baseline would overstate
 * confidence for a car that may simply have unrecorded service history.
 */
export function predictDueServices(
  vehicle: VehicleMileage,
  serviceHistory: ServiceHistoryRecord[],
  now: Date = new Date(),
): MaintenanceSummary {
  const hasServiceHistory = serviceHistory.length > 0;

  const lastEntryByType = new Map<ServiceType, ServiceHistoryRecord>();
  for (const entry of serviceHistory) {
    const existing = lastEntryByType.get(entry.serviceType);
    if (
      !existing ||
      entry.date.getTime() > existing.date.getTime() ||
      (entry.date.getTime() === existing.date.getTime() && entry.mileageKm > existing.mileageKm)
    ) {
      lastEntryByType.set(entry.serviceType, entry);
    }
  }

  const predictions: PredictedService[] = [];
  for (const serviceType of Object.keys(MAINTENANCE_INTERVALS) as ServiceType[]) {
    const interval = MAINTENANCE_INTERVALS[serviceType];
    const lastEntry = lastEntryByType.get(serviceType);
    if (!interval || !lastEntry) continue;

    const dueAtMileageKm = lastEntry.mileageKm + interval.intervalKm;
    const dueByDate = addMonths(lastEntry.date, interval.intervalMonths);
    const remainingKm = dueAtMileageKm - vehicle.currentMileageKm;
    const remainingDays = daysBetween(now, dueByDate);

    predictions.push({
      serviceType,
      urgency: urgencyFor(remainingKm, remainingDays),
      lastServiceDate: lastEntry.date,
      lastServiceMileageKm: lastEntry.mileageKm,
      dueAtMileageKm,
      dueByDate,
      remainingKm,
      remainingDays,
    });
  }

  predictions.sort((a, b) => {
    const rankDiff = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    return rankDiff !== 0 ? rankDiff : a.remainingKm - b.remainingKm;
  });

  let healthScore = 100;
  for (const p of predictions) {
    if (p.urgency === "OVERDUE") healthScore -= OVERDUE_PENALTY;
    else if (p.urgency === "DUE_SOON") healthScore -= DUE_SOON_PENALTY;
  }
  healthScore = Math.max(MIN_HEALTH_SCORE, Math.min(100, healthScore));

  const overallStatus: MaintenanceUrgency = predictions.some((p) => p.urgency === "OVERDUE")
    ? "OVERDUE"
    : predictions.some((p) => p.urgency === "DUE_SOON")
      ? "DUE_SOON"
      : "OK";

  return { hasServiceHistory, predictions, healthScore, overallStatus };
}
