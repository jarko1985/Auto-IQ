import type { RoleName } from "@prisma/client";
import { isAdminRole } from "@/features/auth/rbac";
import { getVendorContext } from "@/features/vendors/service";
import { getGarageContext } from "@/features/garages/service";
import type { GlobalSearchResponse, SearchResultCategory } from "./types";
import * as repo from "./repository";

const VENDOR_ROLES: RoleName[] = ["VENDOR_OWNER", "VENDOR_STAFF"];
const GARAGE_ROLES: RoleName[] = ["GARAGE_OWNER", "GARAGE_MANAGER", "MECHANIC"];

const MIN_QUERY_LENGTH = 2;

function category(key: string, label: string, items: SearchResultCategory["items"]): SearchResultCategory | null {
  return items.length > 0 ? { key, label, items } : null;
}

async function searchAsCustomer(userId: string, query: string): Promise<SearchResultCategory[]> {
  const [vehicles, bookings, repairOrders, orders, sessions, garages] = await Promise.all([
    repo.searchCustomerVehicles(userId, query),
    repo.searchCustomerBookings(userId, query),
    repo.searchCustomerRepairOrders(userId, query),
    repo.searchCustomerOrders(userId, query),
    repo.searchCustomerDiagnosticSessions(userId, query),
    repo.searchGarages(query),
  ]);

  return [
    category(
      "vehicles",
      "My Vehicles",
      vehicles.map((v) => ({
        id: v.id,
        title: `${v.makeName} ${v.modelName} ${v.year}`,
        subtitle: v.plateNumber,
        href: `/vehicles/${v.id}`,
      })),
    ),
    category(
      "bookings",
      "Bookings",
      bookings.map((b) => ({
        id: b.id,
        title: b.bookingNumber,
        subtitle: `${b.garage.businessName} • ${b.status}`,
        href: `/dashboard/bookings/${b.id}`,
      })),
    ),
    category(
      "repair-orders",
      "Repair Orders",
      repairOrders.map((r) => ({
        id: r.id,
        title: r.repairOrderNumber,
        subtitle: r.status,
        href: `/dashboard/repair-orders/${r.id}`,
      })),
    ),
    category(
      "orders",
      "Parts Orders",
      orders.map((o) => ({
        id: o.id,
        title: o.orderNumber,
        subtitle: `${o.vendor.businessName} • ${o.status}`,
        href: `/dashboard/orders/${o.id}`,
      })),
    ),
    category(
      "diagnostics",
      "Diagnostic Sessions",
      sessions.map((s) => ({
        id: s.id,
        title: `${s.vehicle.makeName} ${s.vehicle.modelName}`,
        subtitle: s.status,
        href: `/diagnostics/${s.id}`,
      })),
    ),
    category(
      "garages",
      "Garages",
      garages.map((g) => ({ id: g.id, title: g.businessName, subtitle: g.emirate, href: `/garages/${g.id}` })),
    ),
  ].filter((c): c is SearchResultCategory => c !== null);
}

async function searchAsVendor(userId: string, query: string): Promise<SearchResultCategory[]> {
  const context = await getVendorContext(userId);
  if (!context) return [];

  const [inventory, orders, locations] = await Promise.all([
    repo.searchVendorInventory(context.vendorId, query),
    repo.searchVendorOrders(context.vendorId, query),
    repo.searchVendorLocations(context.organizationId, query),
  ]);

  return [
    category(
      "inventory",
      "Inventory",
      inventory.map((i) => ({
        id: i.id,
        title: i.part.name,
        subtitle: i.part.partNumber,
        href: "/vendor/inventory",
      })),
    ),
    category(
      "orders",
      "Orders",
      orders.map((o) => ({ id: o.id, title: o.orderNumber, subtitle: o.status, href: `/vendor/orders/${o.id}` })),
    ),
    category(
      "locations",
      "Locations",
      locations.map((l) => ({ id: l.id, title: l.name, subtitle: l.emirate, href: "/vendor/locations" })),
    ),
  ].filter((c): c is SearchResultCategory => c !== null);
}

async function searchAsGarage(userId: string, query: string): Promise<SearchResultCategory[]> {
  const context = await getGarageContext(userId);
  if (!context) return [];

  const [repairOrders, bookings, locations, mechanics] = await Promise.all([
    repo.searchGarageRepairOrders(context.garageId, query),
    repo.searchGarageBookings(context.garageId, query),
    repo.searchGarageLocations(context.organizationId, query),
    repo.searchGarageMechanics(context.organizationId, query),
  ]);

  return [
    category(
      "repair-orders",
      "Repair Orders",
      repairOrders.map((r) => ({
        id: r.id,
        title: r.repairOrderNumber,
        subtitle: r.status,
        href: `/garage/repair-orders/${r.id}`,
      })),
    ),
    category(
      "bookings",
      "Appointments",
      bookings.map((b) => ({ id: b.id, title: b.bookingNumber, subtitle: b.status, href: "/garage/appointments" })),
    ),
    category(
      "locations",
      "Locations",
      locations.map((l) => ({ id: l.id, title: l.name, subtitle: l.emirate, href: "/garage/locations" })),
    ),
    category(
      "mechanics",
      "Mechanics",
      mechanics.map((m) => ({
        id: m.id,
        title: m.membership.user.name ?? m.membership.user.email,
        subtitle: null,
        href: "/garage/mechanics",
      })),
    ),
  ].filter((c): c is SearchResultCategory => c !== null);
}

async function searchAsAdmin(query: string): Promise<SearchResultCategory[]> {
  const [vendors, garages, parts, feedback] = await Promise.all([
    repo.searchAdminVendors(query),
    repo.searchAdminGarages(query),
    repo.searchAdminParts(query),
    repo.searchAdminDiagnosticFeedback(query),
  ]);

  return [
    category(
      "vendors",
      "Vendors",
      vendors.map((v) => ({ id: v.id, title: v.businessName, subtitle: v.verificationStatus, href: "/admin/vendors" })),
    ),
    category(
      "garages",
      "Garages",
      garages.map((g) => ({ id: g.id, title: g.businessName, subtitle: g.verificationStatus, href: "/admin/garages" })),
    ),
    category(
      "parts",
      "Parts Catalog",
      parts.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: `${p.manufacturerName} • ${p.approvalState}`,
        href: `/admin/parts/${p.id}`,
      })),
    ),
    category(
      "diagnostic-feedback",
      "Diagnostic Feedback",
      feedback.map((f) => ({
        id: f.id,
        title: `${f.rating}★ — ${f.session.vehicle.makeName} ${f.session.vehicle.modelName}`,
        subtitle: null,
        href: `/admin/diagnostics/${f.sessionId}`,
      })),
    ),
  ].filter((c): c is SearchResultCategory => c !== null);
}

export async function search(userId: string, role: RoleName, rawQuery: string): Promise<GlobalSearchResponse> {
  const query = rawQuery.trim();
  if (query.length < MIN_QUERY_LENGTH) return { query, categories: [] };

  let categories: SearchResultCategory[];
  if (isAdminRole(role)) {
    categories = await searchAsAdmin(query);
  } else if (VENDOR_ROLES.includes(role)) {
    categories = await searchAsVendor(userId, query);
  } else if (GARAGE_ROLES.includes(role)) {
    categories = await searchAsGarage(userId, query);
  } else {
    categories = await searchAsCustomer(userId, query);
  }

  return { query, categories };
}
