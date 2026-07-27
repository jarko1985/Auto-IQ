import { describe, it, expect } from "vitest";
import { getPostLoginPath } from "@/features/auth/route-for-role";

describe("getPostLoginPath", () => {
  it("routes vendor roles to the vendor portal", () => {
    expect(getPostLoginPath("VENDOR_OWNER")).toBe("/vendor/dashboard");
    expect(getPostLoginPath("VENDOR_STAFF")).toBe("/vendor/dashboard");
  });

  it("routes garage roles to the garage portal", () => {
    expect(getPostLoginPath("GARAGE_OWNER")).toBe("/garage/dashboard");
    expect(getPostLoginPath("GARAGE_MANAGER")).toBe("/garage/dashboard");
    expect(getPostLoginPath("MECHANIC")).toBe("/garage/dashboard");
  });

  it("routes admin-area roles to the vendor approval queue", () => {
    expect(getPostLoginPath("ADMIN")).toBe("/admin/vendors");
    expect(getPostLoginPath("SUPER_ADMIN")).toBe("/admin/vendors");
    expect(getPostLoginPath("SUPPORT_AGENT")).toBe("/admin/vendors");
    expect(getPostLoginPath("CONTENT_MANAGER")).toBe("/admin/vendors");
  });

  it("routes everyone else to the customer dashboard", () => {
    expect(getPostLoginPath("CUSTOMER")).toBe("/dashboard");
  });
});
