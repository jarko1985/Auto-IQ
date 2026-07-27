import { describe, it, expect } from "vitest";
import {
  createVehicleSchema,
  updateVehicleSchema,
  createServiceHistorySchema,
} from "@/features/vehicles/schemas";

const validVehicle = {
  makeName: "Toyota",
  modelName: "Camry",
  year: 2021,
  vehicleType: "SEDAN" as const,
  fuelType: "PETROL" as const,
  transmission: "AUTOMATIC" as const,
  mileageKm: 45000,
};

describe("createVehicleSchema", () => {
  it("accepts a minimal valid vehicle", () => {
    expect(createVehicleSchema.safeParse(validVehicle).success).toBe(true);
  });

  it("accepts a fully populated vehicle", () => {
    const full = {
      ...validVehicle,
      engineVariantId: "123e4567-e89b-12d3-a456-426614174000",
      trimName: "SE",
      color: "White",
      plateNumber: "A 12345",
      vin: "1HGBH41JXMN109186",
      notes: "Regular maintenance done.",
      isDefault: true,
    };
    expect(createVehicleSchema.safeParse(full).success).toBe(true);
  });

  it("rejects missing make", () => {
    expect(createVehicleSchema.safeParse({ ...validVehicle, makeName: "" }).success).toBe(false);
  });

  it("rejects missing model", () => {
    expect(createVehicleSchema.safeParse({ ...validVehicle, modelName: "" }).success).toBe(false);
  });

  it("rejects year before 1990", () => {
    expect(createVehicleSchema.safeParse({ ...validVehicle, year: 1989 }).success).toBe(false);
  });

  it("rejects negative mileage", () => {
    expect(createVehicleSchema.safeParse({ ...validVehicle, mileageKm: -1 }).success).toBe(false);
  });

  it("rejects invalid VIN (wrong length)", () => {
    expect(createVehicleSchema.safeParse({ ...validVehicle, vin: "1HGBH41J" }).success).toBe(false);
  });

  it("rejects VIN with invalid characters (I, O, Q)", () => {
    expect(
      createVehicleSchema.safeParse({ ...validVehicle, vin: "1HGOH41JXMN109186" }).success,
    ).toBe(false);
  });

  it("accepts empty string VIN (treated as not provided)", () => {
    expect(createVehicleSchema.safeParse({ ...validVehicle, vin: "" }).success).toBe(true);
  });

  it("accepts empty string plateNumber", () => {
    expect(createVehicleSchema.safeParse({ ...validVehicle, plateNumber: "" }).success).toBe(true);
  });

  it("rejects invalid vehicleType", () => {
    expect(createVehicleSchema.safeParse({ ...validVehicle, vehicleType: "BICYCLE" }).success).toBe(
      false,
    );
  });

  it("rejects invalid fuelType", () => {
    expect(createVehicleSchema.safeParse({ ...validVehicle, fuelType: "COAL" }).success).toBe(
      false,
    );
  });

  it("rejects invalid transmission", () => {
    expect(createVehicleSchema.safeParse({ ...validVehicle, transmission: "NONE" }).success).toBe(
      false,
    );
  });
});

describe("updateVehicleSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(updateVehicleSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with mileage only", () => {
    expect(updateVehicleSchema.safeParse({ mileageKm: 60000 }).success).toBe(true);
  });

  it("rejects negative mileage on update", () => {
    expect(updateVehicleSchema.safeParse({ mileageKm: -5 }).success).toBe(false);
  });

  it("rejects invalid VIN on update", () => {
    expect(updateVehicleSchema.safeParse({ vin: "TOOSHORT" }).success).toBe(false);
  });
});

describe("createServiceHistorySchema", () => {
  const validEntry = {
    serviceType: "OIL_CHANGE" as const,
    date: "2024-03-15",
    mileageKm: 50000,
    description: "Full synthetic oil change",
  };

  it("accepts a valid service history entry", () => {
    expect(createServiceHistorySchema.safeParse(validEntry).success).toBe(true);
  });

  it("accepts with optional cost", () => {
    expect(
      createServiceHistorySchema.safeParse({ ...validEntry, costMinorUnits: 15000 }).success,
    ).toBe(true);
  });

  it("rejects invalid date format", () => {
    expect(
      createServiceHistorySchema.safeParse({ ...validEntry, date: "15-03-2024" }).success,
    ).toBe(false);
  });

  it("rejects empty description", () => {
    expect(createServiceHistorySchema.safeParse({ ...validEntry, description: "" }).success).toBe(
      false,
    );
  });

  it("rejects negative mileage", () => {
    expect(createServiceHistorySchema.safeParse({ ...validEntry, mileageKm: -1 }).success).toBe(
      false,
    );
  });

  it("rejects invalid serviceType", () => {
    expect(
      createServiceHistorySchema.safeParse({ ...validEntry, serviceType: "WASHING" }).success,
    ).toBe(false);
  });
});
