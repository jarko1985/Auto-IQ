import type { RoleName, UserStatus } from "@prisma/client";
import { ROLE_PERMISSIONS, type Permission } from "./permissions";

export function hasPermission(role: RoleName, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: RoleName, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: RoleName, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function isAccountActive(status: UserStatus): boolean {
  return status === "ACTIVE";
}

// Roles that can access the admin area
const ADMIN_ROLES: RoleName[] = ["ADMIN", "SUPER_ADMIN", "SUPPORT_AGENT", "CONTENT_MANAGER"];

// Roles that represent org-level staff (not platform admins)
const ORG_ROLES: RoleName[] = [
  "VENDOR_OWNER",
  "VENDOR_STAFF",
  "GARAGE_OWNER",
  "GARAGE_MANAGER",
  "MECHANIC",
];

export function isAdminRole(role: RoleName): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isOrgRole(role: RoleName): boolean {
  return ORG_ROLES.includes(role);
}

export function isCustomer(role: RoleName): boolean {
  return role === "CUSTOMER";
}

/**
 * Checks all five authorization layers from the spec.
 * Call this in every protected server action / API route handler.
 */
export function assertAuthorized(
  userId: string | undefined,
  status: UserStatus | undefined,
  requiredPermission: Permission,
  role: RoleName | undefined,
): void {
  if (!userId) throw new Error("UNAUTHORIZED");
  if (!status || !isAccountActive(status)) throw new Error("FORBIDDEN:account_inactive");
  if (!role || !hasPermission(role, requiredPermission))
    throw new Error("FORBIDDEN:insufficient_permissions");
}
