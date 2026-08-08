import { db } from "@/lib/db";

const RESULTS_PER_CATEGORY = 5;

function ci(query: string) {
  return { contains: query, mode: "insensitive" as const };
}

// ── Customer ──────────────────────────────────────────────────────────────────

export async function searchCustomerVehicles(userId: string, query: string) {
  return db.customerVehicle.findMany({
    where: {
      userId,
      deletedAt: null,
      OR: [
        { plateNumber: ci(query) },
        { vin: ci(query) },
        { makeName: ci(query) },
        { modelName: ci(query) },
      ],
    },
    select: { id: true, makeName: true, modelName: true, year: true, plateNumber: true },
    take: RESULTS_PER_CATEGORY,
  });
}

export async function searchCustomerBookings(userId: string, query: string) {
  return db.appointment.findMany({
    where: { customerId: userId, bookingNumber: ci(query) },
    select: {
      id: true,
      bookingNumber: true,
      status: true,
      garage: { select: { businessName: true } },
    },
    take: RESULTS_PER_CATEGORY,
    orderBy: { createdAt: "desc" },
  });
}

export async function searchCustomerRepairOrders(userId: string, query: string) {
  return db.repairOrder.findMany({
    where: { customerId: userId, repairOrderNumber: ci(query) },
    select: { id: true, repairOrderNumber: true, status: true },
    take: RESULTS_PER_CATEGORY,
    orderBy: { createdAt: "desc" },
  });
}

export async function searchCustomerOrders(userId: string, query: string) {
  return db.vendorOrder.findMany({
    where: { customerId: userId, orderNumber: ci(query) },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      vendor: { select: { businessName: true } },
    },
    take: RESULTS_PER_CATEGORY,
    orderBy: { createdAt: "desc" },
  });
}

export async function searchCustomerDiagnosticSessions(userId: string, query: string) {
  return db.diagnosticSession.findMany({
    where: {
      userId,
      OR: [
        { description: ci(query) },
        { obdCode: ci(query) },
        { vehicle: { is: { OR: [{ makeName: ci(query) }, { modelName: ci(query) }] } } },
      ],
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      vehicle: { select: { makeName: true, modelName: true } },
    },
    take: RESULTS_PER_CATEGORY,
    orderBy: { createdAt: "desc" },
  });
}

export async function searchGarages(query: string) {
  return db.garage.findMany({
    where: { verificationStatus: "APPROVED", businessName: ci(query) },
    select: { id: true, businessName: true, emirate: true },
    take: RESULTS_PER_CATEGORY,
  });
}

// ── Vendor ────────────────────────────────────────────────────────────────────

export async function searchVendorInventory(vendorId: string, query: string) {
  return db.inventoryItem.findMany({
    where: { vendorId, part: { is: { OR: [{ name: ci(query) }, { partNumber: ci(query) }] } } },
    select: { id: true, part: { select: { name: true, partNumber: true } } },
    take: RESULTS_PER_CATEGORY,
  });
}

export async function searchVendorOrders(vendorId: string, query: string) {
  return db.vendorOrder.findMany({
    where: { vendorId, orderNumber: ci(query) },
    select: { id: true, orderNumber: true, status: true },
    take: RESULTS_PER_CATEGORY,
    orderBy: { createdAt: "desc" },
  });
}

export async function searchVendorLocations(organizationId: string, query: string) {
  return db.vendorLocation.findMany({
    where: { organizationId, OR: [{ name: ci(query) }, { addressLine1: ci(query) }] },
    select: { id: true, name: true, emirate: true },
    take: RESULTS_PER_CATEGORY,
  });
}

// ── Garage ────────────────────────────────────────────────────────────────────

export async function searchGarageRepairOrders(garageId: string, query: string) {
  return db.repairOrder.findMany({
    where: { garageId, repairOrderNumber: ci(query) },
    select: { id: true, repairOrderNumber: true, status: true },
    take: RESULTS_PER_CATEGORY,
    orderBy: { createdAt: "desc" },
  });
}

export async function searchGarageBookings(garageId: string, query: string) {
  return db.appointment.findMany({
    where: { garageId, bookingNumber: ci(query) },
    select: { id: true, bookingNumber: true, status: true },
    take: RESULTS_PER_CATEGORY,
    orderBy: { createdAt: "desc" },
  });
}

export async function searchGarageLocations(organizationId: string, query: string) {
  return db.garageLocation.findMany({
    where: { organizationId, OR: [{ name: ci(query) }, { addressLine1: ci(query) }] },
    select: { id: true, name: true, emirate: true },
    take: RESULTS_PER_CATEGORY,
  });
}

export async function searchGarageMechanics(organizationId: string, query: string) {
  return db.mechanicProfile.findMany({
    where: { membership: { organizationId, user: { name: ci(query) } } },
    select: { id: true, membership: { select: { user: { select: { name: true, email: true } } } } },
    take: RESULTS_PER_CATEGORY,
  });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function searchAdminVendors(query: string) {
  return db.vendor.findMany({
    where: { businessName: ci(query) },
    select: { id: true, businessName: true, verificationStatus: true },
    take: RESULTS_PER_CATEGORY,
  });
}

export async function searchAdminGarages(query: string) {
  return db.garage.findMany({
    where: { businessName: ci(query) },
    select: { id: true, businessName: true, verificationStatus: true },
    take: RESULTS_PER_CATEGORY,
  });
}

export async function searchAdminParts(query: string) {
  return db.part.findMany({
    where: {
      deletedAt: null,
      OR: [{ name: ci(query) }, { partNumber: ci(query) }, { manufacturerName: ci(query) }],
    },
    select: { id: true, name: true, manufacturerName: true, approvalState: true },
    take: RESULTS_PER_CATEGORY,
  });
}

export async function searchAdminDiagnosticFeedback(query: string) {
  return db.diagnosticFeedback.findMany({
    where: { comment: ci(query) },
    select: {
      id: true,
      rating: true,
      sessionId: true,
      session: { select: { vehicle: { select: { makeName: true, modelName: true } } } },
    },
    take: RESULTS_PER_CATEGORY,
    orderBy: { createdAt: "desc" },
  });
}
