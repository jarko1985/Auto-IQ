import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  isAccountActive,
  isAdminRole,
  isCustomer,
} from "@/features/auth/rbac";
import { PERMISSIONS } from "@/features/auth/permissions";

describe("hasPermission", () => {
  it("grants CUSTOMER permission to read own vehicles", () => {
    expect(hasPermission("CUSTOMER", PERMISSIONS.VEHICLE_READ_OWN)).toBe(true);
  });

  it("denies CUSTOMER access to admin functions", () => {
    expect(hasPermission("CUSTOMER", PERMISSIONS.ADMIN_USERS_MANAGE)).toBe(false);
  });

  it("grants ADMIN all admin permissions", () => {
    expect(hasPermission("ADMIN", PERMISSIONS.ADMIN_USERS_MANAGE)).toBe(true);
    expect(hasPermission("ADMIN", PERMISSIONS.ADMIN_VENDORS_APPROVE)).toBe(true);
    expect(hasPermission("ADMIN", PERMISSIONS.ADMIN_AUDIT_READ)).toBe(true);
  });

  it("grants SUPER_ADMIN every permission", () => {
    expect(hasPermission("SUPER_ADMIN", PERMISSIONS.VEHICLE_READ_OWN)).toBe(true);
    expect(hasPermission("SUPER_ADMIN", PERMISSIONS.ADMIN_FEATURE_FLAGS)).toBe(true);
  });

  it("denies VENDOR_STAFF vendor-owner-only actions", () => {
    expect(hasPermission("VENDOR_STAFF", PERMISSIONS.VENDOR_STAFF_MANAGE)).toBe(false);
  });

  it("grants VENDOR_OWNER staff management", () => {
    expect(hasPermission("VENDOR_OWNER", PERMISSIONS.VENDOR_STAFF_MANAGE)).toBe(true);
  });

  it("grants MECHANIC only repair management", () => {
    expect(hasPermission("MECHANIC", PERMISSIONS.GARAGE_REPAIR_MANAGE)).toBe(true);
    expect(hasPermission("MECHANIC", PERMISSIONS.GARAGE_MECHANICS_MANAGE)).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("returns true when at least one permission matches", () => {
    expect(
      hasAnyPermission("CUSTOMER", [PERMISSIONS.VEHICLE_READ_OWN, PERMISSIONS.ADMIN_USERS_MANAGE]),
    ).toBe(true);
  });

  it("returns false when no permission matches", () => {
    expect(
      hasAnyPermission("CUSTOMER", [PERMISSIONS.ADMIN_USERS_MANAGE, PERMISSIONS.ADMIN_AUDIT_READ]),
    ).toBe(false);
  });
});

describe("isAccountActive", () => {
  it("returns true for ACTIVE status", () => {
    expect(isAccountActive("ACTIVE")).toBe(true);
  });

  it("returns false for SUSPENDED status", () => {
    expect(isAccountActive("SUSPENDED")).toBe(false);
  });

  it("returns false for PENDING_VERIFICATION status", () => {
    expect(isAccountActive("PENDING_VERIFICATION")).toBe(false);
  });
});

describe("isAdminRole", () => {
  it("identifies admin roles correctly", () => {
    expect(isAdminRole("ADMIN")).toBe(true);
    expect(isAdminRole("SUPER_ADMIN")).toBe(true);
    expect(isAdminRole("SUPPORT_AGENT")).toBe(true);
    expect(isAdminRole("CONTENT_MANAGER")).toBe(true);
  });

  it("rejects non-admin roles", () => {
    expect(isAdminRole("CUSTOMER")).toBe(false);
    expect(isAdminRole("VENDOR_OWNER")).toBe(false);
    expect(isAdminRole("MECHANIC")).toBe(false);
  });
});

describe("isCustomer", () => {
  it("returns true only for CUSTOMER role", () => {
    expect(isCustomer("CUSTOMER")).toBe(true);
    expect(isCustomer("ADMIN")).toBe(false);
    expect(isCustomer("VENDOR_OWNER")).toBe(false);
  });
});
