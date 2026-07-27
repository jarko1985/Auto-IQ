import { describe, it, expect } from "vitest";
import { haversineDistanceKm } from "@/lib/geo";

describe("haversineDistanceKm", () => {
  it("returns 0 for the same point", () => {
    const point = { latitude: 25.2048, longitude: 55.2708 };
    expect(haversineDistanceKm(point, point)).toBeCloseTo(0, 6);
  });

  it("computes a realistic distance between Dubai and Abu Dhabi", () => {
    const dubai = { latitude: 25.2048, longitude: 55.2708 };
    const abuDhabi = { latitude: 24.4539, longitude: 54.3773 };
    const distance = haversineDistanceKm(dubai, abuDhabi);
    // Real-world road distance is ~140km; great-circle should be a bit less.
    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(130);
  });

  it("computes a realistic distance between Dubai and Fujairah", () => {
    const dubai = { latitude: 25.2048, longitude: 55.2708 };
    const fujairah = { latitude: 25.1288, longitude: 56.3265 };
    const distance = haversineDistanceKm(dubai, fujairah);
    expect(distance).toBeGreaterThan(90);
    expect(distance).toBeLessThan(115);
  });

  it("is symmetric", () => {
    const a = { latitude: 25.3373, longitude: 55.4033 };
    const b = { latitude: 25.7895, longitude: 55.9432 };
    expect(haversineDistanceKm(a, b)).toBeCloseTo(haversineDistanceKm(b, a), 9);
  });
});
