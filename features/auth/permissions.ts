import type { RoleName } from "@prisma/client";

// Permission action codes: resource:action
export const PERMISSIONS = {
  // Vehicles
  VEHICLE_READ_OWN: "vehicle:read:own",
  VEHICLE_CREATE: "vehicle:create",
  VEHICLE_UPDATE_OWN: "vehicle:update:own",
  VEHICLE_DELETE_OWN: "vehicle:delete:own",

  // Diagnostics
  DIAGNOSTIC_CREATE: "diagnostic:create",
  DIAGNOSTIC_READ_OWN: "diagnostic:read:own",

  // Vendor
  VENDOR_PROFILE_MANAGE: "vendor:profile:manage",
  VENDOR_INVENTORY_MANAGE: "vendor:inventory:manage",
  VENDOR_ORDERS_MANAGE: "vendor:orders:manage",
  VENDOR_STAFF_MANAGE: "vendor:staff:manage",

  // Garage
  GARAGE_PROFILE_MANAGE: "garage:profile:manage",
  GARAGE_STAFF_MANAGE: "garage:staff:manage",
  GARAGE_REPAIR_MANAGE: "garage:repair:manage",
  GARAGE_MECHANICS_MANAGE: "garage:mechanics:manage",
  GARAGE_APPOINTMENTS_MANAGE: "garage:appointments:manage",

  // Orders (customer placing/viewing vendor orders)
  ORDER_CREATE: "order:create",
  ORDER_READ_OWN: "order:read:own",

  // Bookings (customer requesting/viewing garage appointments)
  BOOKING_CREATE: "booking:create",
  BOOKING_READ_OWN: "booking:read:own",

  // Repair orders (customer viewing/approving their own; garage-side actions
  // reuse the existing GARAGE_REPAIR_MANAGE permission below)
  REPAIR_ORDER_READ_OWN: "repair-order:read:own",

  // Payments (customer viewing their own invoices/payment status; garage/vendor
  // "what am I owed" reuses GARAGE_REPAIR_MANAGE/VENDOR_ORDERS_MANAGE per ADR-013
  // rather than a new permission)
  PAYMENT_READ_OWN: "payment:read:own",

  // Admin
  ADMIN_USERS_MANAGE: "admin:users:manage",
  ADMIN_VENDORS_APPROVE: "admin:vendors:approve",
  ADMIN_GARAGES_APPROVE: "admin:garages:approve",
  ADMIN_KNOWLEDGE_MANAGE: "admin:knowledge:manage",
  ADMIN_PARTS_MANAGE: "admin:parts:manage",
  // Low-rated diagnostic feedback queue + read access to any session for
  // investigation (Sprint 15) — same "admin moderation surface" shape as
  // ADMIN_PARTS_MANAGE/ADMIN_KNOWLEDGE_MANAGE.
  ADMIN_DIAGNOSTICS_MANAGE: "admin:diagnostics:manage",
  ADMIN_FEATURE_FLAGS: "admin:feature-flags:manage",
  ADMIN_AUDIT_READ: "admin:audit:read",
  // Refunds, dispute handling (ADR-013) — no route uses this yet beyond refunds.
  ADMIN_PAYMENTS_MANAGE: "admin:payments:manage",
  // Initiating/reviewing payouts (ADR-013) — reserved for Prompt 21 (Admin
  // Console); no route in this sprint uses it yet.
  ADMIN_PAYOUTS_MANAGE: "admin:payouts:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Base permissions by global role (org-level memberships grant additional permissions)
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  CUSTOMER: [
    PERMISSIONS.VEHICLE_READ_OWN,
    PERMISSIONS.VEHICLE_CREATE,
    PERMISSIONS.VEHICLE_UPDATE_OWN,
    PERMISSIONS.VEHICLE_DELETE_OWN,
    PERMISSIONS.DIAGNOSTIC_CREATE,
    PERMISSIONS.DIAGNOSTIC_READ_OWN,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDER_READ_OWN,
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_READ_OWN,
    PERMISSIONS.REPAIR_ORDER_READ_OWN,
    PERMISSIONS.PAYMENT_READ_OWN,
  ],
  VENDOR_OWNER: [
    PERMISSIONS.VENDOR_PROFILE_MANAGE,
    PERMISSIONS.VENDOR_INVENTORY_MANAGE,
    PERMISSIONS.VENDOR_ORDERS_MANAGE,
    PERMISSIONS.VENDOR_STAFF_MANAGE,
  ],
  VENDOR_STAFF: [PERMISSIONS.VENDOR_INVENTORY_MANAGE, PERMISSIONS.VENDOR_ORDERS_MANAGE],
  GARAGE_OWNER: [
    PERMISSIONS.GARAGE_PROFILE_MANAGE,
    PERMISSIONS.GARAGE_STAFF_MANAGE,
    PERMISSIONS.GARAGE_REPAIR_MANAGE,
    PERMISSIONS.GARAGE_MECHANICS_MANAGE,
    PERMISSIONS.GARAGE_APPOINTMENTS_MANAGE,
  ],
  GARAGE_MANAGER: [PERMISSIONS.GARAGE_REPAIR_MANAGE, PERMISSIONS.GARAGE_APPOINTMENTS_MANAGE],
  MECHANIC: [PERMISSIONS.GARAGE_REPAIR_MANAGE],
  SUPPORT_AGENT: [PERMISSIONS.ADMIN_USERS_MANAGE, PERMISSIONS.ADMIN_AUDIT_READ],
  CONTENT_MANAGER: [PERMISSIONS.ADMIN_KNOWLEDGE_MANAGE],
  ADMIN: [
    PERMISSIONS.ADMIN_USERS_MANAGE,
    PERMISSIONS.ADMIN_VENDORS_APPROVE,
    PERMISSIONS.ADMIN_GARAGES_APPROVE,
    PERMISSIONS.ADMIN_KNOWLEDGE_MANAGE,
    PERMISSIONS.ADMIN_PARTS_MANAGE,
    PERMISSIONS.ADMIN_FEATURE_FLAGS,
    PERMISSIONS.ADMIN_AUDIT_READ,
    PERMISSIONS.ADMIN_PAYMENTS_MANAGE,
    PERMISSIONS.ADMIN_PAYOUTS_MANAGE,
    PERMISSIONS.ADMIN_DIAGNOSTICS_MANAGE,
  ],
  SUPER_ADMIN: Object.values(PERMISSIONS),
};
