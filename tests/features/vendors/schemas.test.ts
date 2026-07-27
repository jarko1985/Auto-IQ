import { describe, it, expect } from "vitest";
import {
  createVendorProfileSchema,
  updateVendorProfileSchema,
  createVendorLocationSchema,
  inviteStaffSchema,
  rejectVendorSchema,
} from "@/features/vendors/schemas";

const baseProfile = {
  businessName: "Gulf Auto Spares",
  businessType: "AUTHORIZED_DISTRIBUTOR" as const,
  tradeLicenseNumber: "TL-990234",
  tradeLicenseExpiry: "2027-03-15",
  contactPersonName: "Fahad Al Marzooqi",
  contactPhone: "+971529876543",
  contactEmail: "owner@example.com",
  addressLine1: "Mussafah Industrial Area M-12",
  emirate: "ABU_DHABI" as const,
};

describe("createVendorProfileSchema", () => {
  it("accepts a fully valid profile", () => {
    expect(createVendorProfileSchema.safeParse(baseProfile).success).toBe(true);
  });

  it("rejects a non-UAE phone number", () => {
    const result = createVendorProfileSchema.safeParse({
      ...baseProfile,
      contactPhone: "0501234567",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid date format", () => {
    const result = createVendorProfileSchema.safeParse({
      ...baseProfile,
      tradeLicenseExpiry: "15-03-2027",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown business type", () => {
    const result = createVendorProfileSchema.safeParse({
      ...baseProfile,
      businessType: "SCRAPYARD",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing business name", () => {
    const { businessName: _businessName, ...rest } = baseProfile;
    expect(createVendorProfileSchema.safeParse(rest).success).toBe(false);
  });
});

describe("updateVendorProfileSchema", () => {
  it("accepts a partial update with just the authorized signatory fields", () => {
    const result = updateVendorProfileSchema.safeParse({
      authorizedSignatoryName: "Fahad Al Marzooqi",
      authorizedSignatoryEmiratesId: "784-1988-7654321-2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed Emirates ID", () => {
    const result = updateVendorProfileSchema.safeParse({
      authorizedSignatoryEmiratesId: "784-1988-1",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an empty object (no changes)", () => {
    expect(updateVendorProfileSchema.safeParse({}).success).toBe(true);
  });
});

describe("createVendorLocationSchema", () => {
  it("accepts a minimal valid location", () => {
    const result = createVendorLocationSchema.safeParse({
      name: "Dubai Main Hub",
      emirate: "DUBAI",
      addressLine1: "Al Quoz Industrial 3",
    });
    expect(result.success).toBe(true);
  });

  it("defaults isPrimary to false", () => {
    const result = createVendorLocationSchema.safeParse({
      name: "Dubai Main Hub",
      emirate: "DUBAI",
      addressLine1: "Al Quoz Industrial 3",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isPrimary).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = createVendorLocationSchema.safeParse({
      name: "Dubai Main Hub",
      emirate: "DUBAI",
      addressLine1: "Al Quoz Industrial 3",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("inviteStaffSchema", () => {
  it("accepts VENDOR_OWNER and VENDOR_STAFF roles", () => {
    expect(
      inviteStaffSchema.safeParse({ email: "a@example.com", role: "VENDOR_OWNER" }).success,
    ).toBe(true);
    expect(
      inviteStaffSchema.safeParse({ email: "a@example.com", role: "VENDOR_STAFF" }).success,
    ).toBe(true);
  });

  it("rejects a platform-level role", () => {
    const result = inviteStaffSchema.safeParse({ email: "a@example.com", role: "ADMIN" });
    expect(result.success).toBe(false);
  });
});

describe("rejectVendorSchema", () => {
  it("requires a non-empty reason", () => {
    expect(rejectVendorSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(rejectVendorSchema.safeParse({ reason: "Trade license expired" }).success).toBe(true);
  });
});
