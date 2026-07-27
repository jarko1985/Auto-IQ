import { describe, it, expect } from "vitest";
import {
  deriveGarageSearchFilters,
  garageSearchFiltersToQueryString,
} from "@/features/diagnostics/garage-matching";

describe("deriveGarageSearchFilters", () => {
  it("unions and deduplicates requiredServiceCodes across causes", () => {
    const filters = deriveGarageSearchFilters({
      causes: [
        { requiredServiceCodes: ["BRAKE_SERVICE", "GENERAL_INSPECTION"] },
        { requiredServiceCodes: ["BRAKE_SERVICE", "SUSPENSION_REPAIR"] },
      ],
      vehicleType: "SUV",
      makeId: null,
    });

    expect(filters.serviceTypes.sort()).toEqual(
      ["BRAKE_SERVICE", "GENERAL_INSPECTION", "SUSPENSION_REPAIR"].sort(),
    );
    expect(filters.vehicleType).toBe("SUV");
    expect(filters.makeId).toBeUndefined();
  });

  it("omits makeId entirely when not resolved", () => {
    const filters = deriveGarageSearchFilters({
      causes: [{ requiredServiceCodes: [] }],
      vehicleType: "SEDAN",
      makeId: undefined,
    });
    expect(filters).not.toHaveProperty("makeId");
  });

  it("includes makeId when resolved", () => {
    const filters = deriveGarageSearchFilters({
      causes: [{ requiredServiceCodes: ["OIL_CHANGE"] }],
      vehicleType: "SEDAN",
      makeId: "make-123",
    });
    expect(filters.makeId).toBe("make-123");
  });

  it("returns an empty serviceTypes array for a degraded result with no causes", () => {
    const filters = deriveGarageSearchFilters({
      causes: [],
      vehicleType: "HATCHBACK",
      makeId: null,
    });
    expect(filters.serviceTypes).toEqual([]);
  });

  it("filters out stale codes from the retired pre-Sprint-21 taxonomy", () => {
    // A DiagnosticResult created before Sprint 21 retired SERVICE_CODES can
    // still have old placeholder codes like "BRAKES" (not a real ServiceType)
    // sitting in its plain-String[] requiredServiceCodes column.
    const filters = deriveGarageSearchFilters({
      causes: [{ requiredServiceCodes: ["BRAKES", "BRAKE_SERVICE", "ENGINE"] }],
      vehicleType: "SEDAN",
      makeId: null,
    });
    expect(filters.serviceTypes).toEqual(["BRAKE_SERVICE"]);
  });
});

describe("garageSearchFiltersToQueryString", () => {
  it("builds a query string with all filters present", () => {
    const qs = garageSearchFiltersToQueryString({
      serviceTypes: ["BRAKE_SERVICE", "AC_SERVICE"],
      vehicleType: "SUV",
      makeId: "make-123",
    });
    const params = new URLSearchParams(qs);
    expect(params.get("serviceTypes")).toBe("BRAKE_SERVICE,AC_SERVICE");
    expect(params.get("vehicleType")).toBe("SUV");
    expect(params.get("makeId")).toBe("make-123");
  });

  it("omits empty serviceTypes and missing makeId", () => {
    const qs = garageSearchFiltersToQueryString({ serviceTypes: [], vehicleType: "SEDAN" });
    const params = new URLSearchParams(qs);
    expect(params.has("serviceTypes")).toBe(false);
    expect(params.has("makeId")).toBe(false);
    expect(params.get("vehicleType")).toBe("SEDAN");
  });
});
