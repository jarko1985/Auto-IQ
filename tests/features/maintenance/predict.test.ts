import { describe, it, expect } from "vitest";
import { predictDueServices, type ServiceHistoryRecord } from "@/features/maintenance/predict";

const NOW = new Date("2026-07-25T00:00:00Z");

function entry(overrides: Partial<ServiceHistoryRecord> = {}): ServiceHistoryRecord {
  return {
    serviceType: "OIL_CHANGE",
    date: new Date("2026-01-01T00:00:00Z"),
    mileageKm: 40_000,
    ...overrides,
  };
}

describe("predictDueServices", () => {
  it("returns no predictions and hasServiceHistory=false for a vehicle with no history at all", () => {
    const result = predictDueServices({ currentMileageKm: 22_000 }, [], NOW);

    expect(result.hasServiceHistory).toBe(false);
    expect(result.predictions).toEqual([]);
    expect(result.overallStatus).toBe("OK");
    expect(result.healthScore).toBe(100);
  });

  it("never predicts a ServiceType with zero history entries, even if others exist", () => {
    const result = predictDueServices(
      { currentMileageKm: 42_000 },
      [
        entry({
          serviceType: "OIL_CHANGE",
          date: new Date("2026-06-01T00:00:00Z"),
          mileageKm: 41_000,
        }),
      ],
      NOW,
    );

    expect(result.hasServiceHistory).toBe(true);
    expect(result.predictions).toHaveLength(1);
    expect(result.predictions[0]?.serviceType).toBe("OIL_CHANGE");
  });

  it("marks a service OVERDUE once elapsed mileage exceeds the interval", () => {
    // OIL_CHANGE interval is 10,000km; last done at 30,000km, vehicle is now at 45,000km => overdue by 5,000km
    const result = predictDueServices(
      { currentMileageKm: 45_000 },
      [
        entry({
          serviceType: "OIL_CHANGE",
          date: new Date("2026-01-01T00:00:00Z"),
          mileageKm: 30_000,
        }),
      ],
      NOW,
    );

    const prediction = result.predictions[0];
    expect(prediction?.urgency).toBe("OVERDUE");
    expect(prediction?.remainingKm).toBe(-5_000);
    expect(result.overallStatus).toBe("OVERDUE");
    expect(result.healthScore).toBeLessThan(100);
  });

  it("marks a service OVERDUE once the elapsed-time interval has passed, even with low mileage", () => {
    // OIL_CHANGE interval is 6 months; last done 8 months ago
    const result = predictDueServices(
      { currentMileageKm: 30_500 },
      [
        entry({
          serviceType: "OIL_CHANGE",
          date: new Date("2025-11-01T00:00:00Z"),
          mileageKm: 30_000,
        }),
      ],
      NOW,
    );

    expect(result.predictions[0]?.urgency).toBe("OVERDUE");
  });

  it("marks a service DUE_SOON when within the km threshold but not yet overdue", () => {
    // OIL_CHANGE interval 10,000km; last done at 35,000km; now at 44,100km => 900km remaining (< 1,500 threshold)
    const result = predictDueServices(
      { currentMileageKm: 44_100 },
      [
        entry({
          serviceType: "OIL_CHANGE",
          date: new Date("2026-07-01T00:00:00Z"),
          mileageKm: 35_000,
        }),
      ],
      NOW,
    );

    expect(result.predictions[0]?.urgency).toBe("DUE_SOON");
    expect(result.overallStatus).toBe("DUE_SOON");
  });

  it("marks a service OK when well within both thresholds", () => {
    const result = predictDueServices(
      { currentMileageKm: 36_000 },
      [
        entry({
          serviceType: "OIL_CHANGE",
          date: new Date("2026-07-01T00:00:00Z"),
          mileageKm: 35_000,
        }),
      ],
      NOW,
    );

    expect(result.predictions[0]?.urgency).toBe("OK");
    expect(result.overallStatus).toBe("OK");
    expect(result.healthScore).toBe(100);
  });

  it("uses the most recent entry per service type when multiple exist", () => {
    const result = predictDueServices(
      { currentMileageKm: 42_000 },
      [
        entry({
          serviceType: "OIL_CHANGE",
          date: new Date("2025-01-01T00:00:00Z"),
          mileageKm: 20_000,
        }),
        entry({
          serviceType: "OIL_CHANGE",
          date: new Date("2026-06-01T00:00:00Z"),
          mileageKm: 40_000,
        }),
      ],
      NOW,
    );

    expect(result.predictions).toHaveLength(1);
    expect(result.predictions[0]?.lastServiceMileageKm).toBe(40_000);
  });

  it("sorts predictions most-urgent first", () => {
    const result = predictDueServices(
      { currentMileageKm: 50_000 },
      [
        // OK: brake service interval 20,000km, done recently at 45,000km => 15,000km remaining
        entry({
          serviceType: "BRAKE_SERVICE",
          date: new Date("2026-06-01T00:00:00Z"),
          mileageKm: 45_000,
        }),
        // OVERDUE: oil change interval 10,000km, done at 30,000km => -10,000km remaining
        entry({
          serviceType: "OIL_CHANGE",
          date: new Date("2025-01-01T00:00:00Z"),
          mileageKm: 30_000,
        }),
      ],
      NOW,
    );

    expect(result.predictions[0]?.serviceType).toBe("OIL_CHANGE");
    expect(result.predictions[0]?.urgency).toBe("OVERDUE");
    expect(result.predictions[1]?.serviceType).toBe("BRAKE_SERVICE");
  });

  it("never predicts OTHER, which has no defined interval", () => {
    const result = predictDueServices(
      { currentMileageKm: 42_000 },
      [entry({ serviceType: "OTHER", date: new Date("2026-01-01T00:00:00Z"), mileageKm: 40_000 })],
      NOW,
    );

    expect(result.predictions).toEqual([]);
    expect(result.hasServiceHistory).toBe(true);
  });

  it("floors the health score at MIN_HEALTH_SCORE even with many overdue services", () => {
    const result = predictDueServices(
      { currentMileageKm: 200_000 },
      [
        entry({
          serviceType: "OIL_CHANGE",
          date: new Date("2020-01-01T00:00:00Z"),
          mileageKm: 10_000,
        }),
        entry({
          serviceType: "TYRE_ROTATION",
          date: new Date("2020-01-01T00:00:00Z"),
          mileageKm: 10_000,
        }),
        entry({
          serviceType: "BRAKE_SERVICE",
          date: new Date("2020-01-01T00:00:00Z"),
          mileageKm: 10_000,
        }),
        entry({
          serviceType: "FILTER_CHANGE",
          date: new Date("2020-01-01T00:00:00Z"),
          mileageKm: 10_000,
        }),
        entry({
          serviceType: "FLUID_CHECK",
          date: new Date("2020-01-01T00:00:00Z"),
          mileageKm: 10_000,
        }),
        entry({
          serviceType: "AC_SERVICE",
          date: new Date("2020-01-01T00:00:00Z"),
          mileageKm: 10_000,
        }),
        entry({
          serviceType: "GENERAL_INSPECTION",
          date: new Date("2020-01-01T00:00:00Z"),
          mileageKm: 10_000,
        }),
      ],
      NOW,
    );

    expect(result.healthScore).toBe(30);
    expect(result.overallStatus).toBe("OVERDUE");
  });
});
