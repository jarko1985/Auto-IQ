import type { RoleName } from "@prisma/client";
import { isAdminRole } from "./rbac";

const VENDOR_ROLES: RoleName[] = ["VENDOR_OWNER", "VENDOR_STAFF"];
const GARAGE_ROLES: RoleName[] = ["GARAGE_OWNER", "GARAGE_MANAGER", "MECHANIC"];

/** Where to land a user immediately after sign-in, based on their resolved role.
 * Centralized here so every sign-in path (credentials, OAuth, future providers)
 * and every portal (vendor, garage, ...) routes through one mapping. */
export function getPostLoginPath(role: RoleName): string {
  if (VENDOR_ROLES.includes(role)) return "/vendor/dashboard";
  if (GARAGE_ROLES.includes(role)) return "/garage/dashboard";
  // Only /admin/vendors exists so far (Sprint 7) — revisit once Sprint 13 adds
  // a general /admin landing page.
  if (isAdminRole(role)) return "/admin/vendors";
  return "/dashboard";
}
