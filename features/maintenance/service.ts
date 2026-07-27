import { getUserVehicle, listServiceHistory } from "@/features/vehicles/service";
import { predictDueServices } from "./predict";
import type { MaintenanceSummary } from "./predict";

/**
 * Lazily computes a vehicle's maintenance summary on every read — no cached
 * column, no scheduled job, matching the stale-order/stale-booking expiry
 * precedent (features/vendor-orders' autoExpireStaleOrders, features/bookings)
 * of recomputing opportunistically instead of via a background worker. Unlike
 * those, this path is pure read-only: there is no state to reconcile, just
 * arithmetic over the vehicle's current mileage and its service history, so
 * there is nothing to write back.
 */
export async function getVehicleMaintenanceSummary(
  userId: string,
  vehicleId: string,
): Promise<MaintenanceSummary> {
  const vehicle = await getUserVehicle(userId, vehicleId);
  const history = await listServiceHistory(userId, vehicleId);
  return predictDueServices(
    { currentMileageKm: vehicle.mileageKm },
    history.map((entry) => ({
      serviceType: entry.serviceType,
      date: entry.date,
      mileageKm: entry.mileageKm,
    })),
  );
}
