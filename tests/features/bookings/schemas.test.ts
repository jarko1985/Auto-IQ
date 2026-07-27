import { describe, it, expect } from "vitest";
import { searchGaragesSchema } from "@/features/bookings/schemas";

describe("searchGaragesSchema", () => {
  it("defaults sort to relevance and leaves geo fields undefined", () => {
    const result = searchGaragesSchema.parse({});
    expect(result.sort).toBe("relevance");
    expect(result.lat).toBeUndefined();
    expect(result.lng).toBeUndefined();
    expect(result.serviceTypes).toBeUndefined();
  });

  it("parses a comma-separated serviceTypes query param into an array", () => {
    const result = searchGaragesSchema.parse({ serviceTypes: "BRAKE_SERVICE,AC_SERVICE" });
    expect(result.serviceTypes).toEqual(["BRAKE_SERVICE", "AC_SERVICE"]);
  });

  it("accepts the Sprint 21 repair-category ServiceType values", () => {
    const result = searchGaragesSchema.parse({ serviceTypes: "ENGINE_REPAIR,STEERING_REPAIR" });
    expect(result.serviceTypes).toEqual(["ENGINE_REPAIR", "STEERING_REPAIR"]);
  });

  it("rejects an invalid service type in the comma-separated list", () => {
    const result = searchGaragesSchema.safeParse({ serviceTypes: "BRAKE_SERVICE,NOT_A_SERVICE" });
    expect(result.success).toBe(false);
  });

  it("coerces lat/lng/radiusKm to numbers", () => {
    const result = searchGaragesSchema.parse({ lat: "25.2048", lng: "55.2708", radiusKm: "25" });
    expect(result.lat).toBe(25.2048);
    expect(result.lng).toBe(55.2708);
    expect(result.radiusKm).toBe(25);
  });

  it("rejects an out-of-range latitude", () => {
    const result = searchGaragesSchema.safeParse({ lat: "200" });
    expect(result.success).toBe(false);
  });

  it("accepts an explicit sort value", () => {
    const result = searchGaragesSchema.parse({ sort: "rating" });
    expect(result.sort).toBe("rating");
  });
});
