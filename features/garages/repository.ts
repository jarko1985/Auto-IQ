import { db } from "@/lib/db";
import type {
  Prisma,
  AuditAction,
  Emirate,
  RoleName,
  GarageDocumentType,
  ServiceType,
  VehicleType,
} from "@prisma/client";
import type {
  CreateGarageLocationInput,
  CreateGarageProfileInput,
  UpdateGarageLocationInput,
  UpdateGarageProfileInput,
  UpdateMechanicProfileInput,
} from "./schemas";

// ── Garage org + profile ────────────────────────────────────────────────────

/** A user's garage-org membership, if any — a user may belong to at most one
 * GARAGE-type organization (enforced in service.createGarageOrganization). */
export async function findGarageMembership(userId: string) {
  return db.organizationMembership.findFirst({
    where: { userId, organization: { type: "GARAGE", deletedAt: null } },
    include: {
      organization: { include: { garage: true } },
      roles: { include: { role: true } },
    },
  });
}

export async function createGarageOrganization(
  userId: string,
  slug: string,
  input: CreateGarageProfileInput,
) {
  return db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: input.businessName, slug, type: "GARAGE", status: "PENDING_APPROVAL" },
    });

    const garage = await tx.garage.create({
      data: {
        organizationId: organization.id,
        businessName: input.businessName,
        tradeLicenseNumber: input.tradeLicenseNumber,
        tradeLicenseExpiry: new Date(input.tradeLicenseExpiry),
        contactPersonName: input.contactPersonName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        addressLine1: input.addressLine1,
        emirate: input.emirate,
      },
    });

    const role = await tx.role.findUnique({ where: { name: "GARAGE_OWNER" } });
    if (!role) throw new Error("GARAGE_OWNER role is not seeded");

    const membership = await tx.organizationMembership.create({
      data: { userId, organizationId: organization.id },
    });
    await tx.membershipRole.create({ data: { membershipId: membership.id, roleId: role.id } });

    return { organization, garage };
  });
}

export async function getGarageById(id: string) {
  return db.garage.findUnique({
    where: { id },
    include: { organization: true, documents: { orderBy: { createdAt: "desc" } } },
  });
}

export async function getGarageByOrganizationId(organizationId: string) {
  return db.garage.findUnique({ where: { organizationId } });
}

export async function updateGarageProfile(
  garageId: string,
  data: UpdateGarageProfileInput,
  businessName?: string,
) {
  return db.garage.update({
    where: { id: garageId },
    data: {
      ...(businessName !== undefined && { businessName }),
      ...(data.tradeLicenseNumber !== undefined && { tradeLicenseNumber: data.tradeLicenseNumber }),
      ...(data.tradeLicenseExpiry !== undefined && {
        tradeLicenseExpiry: new Date(data.tradeLicenseExpiry),
      }),
      ...(data.contactPersonName !== undefined && { contactPersonName: data.contactPersonName }),
      ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
      ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
      ...(data.addressLine1 !== undefined && { addressLine1: data.addressLine1 }),
      ...(data.emirate !== undefined && { emirate: data.emirate }),
      ...(data.authorizedSignatoryName !== undefined && {
        authorizedSignatoryName: data.authorizedSignatoryName,
      }),
      ...(data.authorizedSignatoryEmiratesId !== undefined && {
        authorizedSignatoryEmiratesId: data.authorizedSignatoryEmiratesId,
      }),
    },
  });
}

export async function submitGarage(garageId: string) {
  return db.garage.update({
    where: { id: garageId },
    data: { verificationStatus: "SUBMITTED", submittedAt: new Date(), rejectionReason: null },
  });
}

export async function listSubmittedGarages(pagination: { limit: number; offset: number }) {
  const where: Prisma.GarageWhereInput = { verificationStatus: "SUBMITTED" };

  const [garages, total] = await Promise.all([
    db.garage.findMany({
      where,
      orderBy: { submittedAt: "asc" },
      take: pagination.limit,
      skip: pagination.offset,
      include: { organization: true, _count: { select: { documents: true } } },
    }),
    db.garage.count({ where }),
  ]);

  return { garages, total };
}

export async function approveGarage(garageId: string, adminUserId: string) {
  return db.$transaction(async (tx) => {
    const garage = await tx.garage.update({
      where: { id: garageId },
      data: {
        verificationStatus: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: adminUserId,
        rejectionReason: null,
      },
    });
    await tx.organization.update({
      where: { id: garage.organizationId },
      data: { status: "ACTIVE" },
    });
    return garage;
  });
}

export async function rejectGarage(garageId: string, adminUserId: string, reason: string) {
  return db.$transaction(async (tx) => {
    const garage = await tx.garage.update({
      where: { id: garageId },
      data: {
        verificationStatus: "REJECTED",
        reviewedAt: new Date(),
        reviewedById: adminUserId,
        rejectionReason: reason,
      },
    });
    await tx.organization.update({
      where: { id: garage.organizationId },
      data: { status: "REJECTED" },
    });
    return garage;
  });
}

// ── Documents ────────────────────────────────────────────────────────────────

export async function createGarageDocument(data: {
  garageId: string;
  type: GarageDocumentType;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
}) {
  return db.garageDocument.create({ data });
}

export async function findGarageDocumentById(id: string, garageId: string) {
  return db.garageDocument.findFirst({ where: { id, garageId } });
}

export async function deleteGarageDocument(id: string) {
  return db.garageDocument.delete({ where: { id } });
}

// ── Locations ────────────────────────────────────────────────────────────────

export async function listLocations(organizationId: string) {
  return db.garageLocation.findMany({
    where: { organizationId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    include: { workingHours: { orderBy: { dayOfWeek: "asc" } } },
  });
}

export async function findLocationById(id: string, organizationId: string) {
  return db.garageLocation.findFirst({
    where: { id, organizationId },
    include: { workingHours: { orderBy: { dayOfWeek: "asc" } } },
  });
}

export async function createLocation(organizationId: string, data: CreateGarageLocationInput) {
  return db.garageLocation.create({
    data: {
      organizationId,
      name: data.name,
      emirate: data.emirate,
      addressLine1: data.addressLine1,
      phone: data.phone || null,
      email: data.email || null,
      isPrimary: data.isPrimary ?? false,
    },
  });
}

export async function updateLocation(id: string, data: UpdateGarageLocationInput) {
  return db.garageLocation.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.emirate !== undefined && { emirate: data.emirate }),
      ...(data.addressLine1 !== undefined && { addressLine1: data.addressLine1 }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

/** Written by the best-effort geocoding call after create/update — never
 * blocks or fails the location save itself (see features/garages/service.ts). */
export async function updateLocationCoordinates(id: string, latitude: number, longitude: number) {
  return db.garageLocation.update({ where: { id }, data: { latitude, longitude } });
}

export async function clearPrimaryLocation(organizationId: string) {
  return db.garageLocation.updateMany({
    where: { organizationId, isPrimary: true },
    data: { isPrimary: false },
  });
}

// ── Working hours ────────────────────────────────────────────────────────────

export async function replaceWorkingHours(
  locationId: string,
  hours: {
    dayOfWeek: number;
    isClosed: boolean;
    openTime?: string | null;
    closeTime?: string | null;
  }[],
) {
  return db.$transaction(
    hours.map((h) =>
      db.garageWorkingHours.upsert({
        where: { locationId_dayOfWeek: { locationId, dayOfWeek: h.dayOfWeek } },
        create: {
          locationId,
          dayOfWeek: h.dayOfWeek,
          isClosed: h.isClosed,
          openTime: h.isClosed ? null : (h.openTime ?? null),
          closeTime: h.isClosed ? null : (h.closeTime ?? null),
        },
        update: {
          isClosed: h.isClosed,
          openTime: h.isClosed ? null : (h.openTime ?? null),
          closeTime: h.isClosed ? null : (h.closeTime ?? null),
        },
      }),
    ),
  );
}

// ── Services ─────────────────────────────────────────────────────────────────

export async function listServices(garageId: string) {
  return db.garageService.findMany({ where: { garageId, isActive: true } });
}

export async function replaceServices(garageId: string, serviceTypes: ServiceType[]) {
  return db.$transaction(async (tx) => {
    await tx.garageService.deleteMany({ where: { garageId } });
    if (serviceTypes.length > 0) {
      await tx.garageService.createMany({
        data: serviceTypes.map((serviceType) => ({ garageId, serviceType })),
      });
    }
    return tx.garageService.findMany({ where: { garageId } });
  });
}

// ── Vehicle capabilities ─────────────────────────────────────────────────────

export async function listVehicleCapabilities(garageId: string) {
  return db.garageVehicleCapability.findMany({ where: { garageId } });
}

export async function replaceVehicleCapabilities(garageId: string, vehicleTypes: VehicleType[]) {
  return db.$transaction(async (tx) => {
    await tx.garageVehicleCapability.deleteMany({ where: { garageId } });
    if (vehicleTypes.length > 0) {
      await tx.garageVehicleCapability.createMany({
        data: vehicleTypes.map((vehicleType) => ({ garageId, vehicleType })),
      });
    }
    return tx.garageVehicleCapability.findMany({ where: { garageId } });
  });
}

// ── Make specializations ─────────────────────────────────────────────────────

export async function listMakeSpecializations(garageId: string) {
  return db.garageMakeSpecialization.findMany({
    where: { garageId },
    include: { make: true },
    orderBy: { make: { name: "asc" } },
  });
}

export async function replaceMakeSpecializations(garageId: string, makeIds: string[]) {
  return db.$transaction(async (tx) => {
    await tx.garageMakeSpecialization.deleteMany({ where: { garageId } });
    if (makeIds.length > 0) {
      await tx.garageMakeSpecialization.createMany({
        data: makeIds.map((makeId) => ({ garageId, makeId })),
        skipDuplicates: true,
      });
    }
    return tx.garageMakeSpecialization.findMany({ where: { garageId }, include: { make: true } });
  });
}

// ── Staff ────────────────────────────────────────────────────────────────────

export async function listMemberships(organizationId: string) {
  return db.organizationMembership.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      roles: { include: { role: true } },
      mechanicProfile: true,
    },
  });
}

export async function findMembershipById(id: string, organizationId: string) {
  return db.organizationMembership.findFirst({
    where: { id, organizationId },
    include: { roles: { include: { role: true } }, mechanicProfile: true },
  });
}

export async function countOwnerMemberships(organizationId: string) {
  return db.organizationMembership.count({
    where: { organizationId, roles: { some: { role: { name: "GARAGE_OWNER" } } } },
  });
}

export async function removeMembership(id: string) {
  return db.organizationMembership.delete({ where: { id } });
}

export async function findMembershipByUserAndOrg(userId: string, organizationId: string) {
  return db.organizationMembership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
}

export async function createMembershipWithRole(
  userId: string,
  organizationId: string,
  roleName: RoleName,
) {
  const role = await db.role.findUnique({ where: { name: roleName } });
  if (!role) throw new Error(`${roleName} role is not seeded`);

  return db.$transaction(async (tx) => {
    const membership = await tx.organizationMembership.create({
      data: { userId, organizationId },
    });
    await tx.membershipRole.create({ data: { membershipId: membership.id, roleId: role.id } });
    return membership;
  });
}

export async function listInvitations(organizationId: string) {
  return db.staffInvitation.findMany({
    where: { organizationId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
}

export async function findPendingInvitationByEmail(organizationId: string, email: string) {
  return db.staffInvitation.findFirst({
    where: { organizationId, email: { equals: email, mode: "insensitive" }, status: "PENDING" },
  });
}

export async function createInvitation(data: {
  organizationId: string;
  email: string;
  role: RoleName;
  token: string;
  invitedById: string;
  expiresAt: Date;
}) {
  return db.staffInvitation.create({ data });
}

export async function findInvitationByToken(token: string) {
  return db.staffInvitation.findUnique({
    where: { token },
    include: { organization: true },
  });
}

export async function findInvitationById(id: string, organizationId: string) {
  return db.staffInvitation.findFirst({ where: { id, organizationId } });
}

export async function markInvitationAccepted(id: string) {
  return db.staffInvitation.update({
    where: { id },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });
}

export async function markInvitationRevoked(id: string) {
  return db.staffInvitation.update({ where: { id }, data: { status: "REVOKED" } });
}

// ── Mechanic profiles ────────────────────────────────────────────────────────

export async function upsertMechanicProfile(
  membershipId: string,
  data: UpdateMechanicProfileInput,
) {
  return db.mechanicProfile.upsert({
    where: { membershipId },
    create: {
      membershipId,
      specialties: data.specialties ?? [],
      yearsExperience: data.yearsExperience ?? null,
      bio: data.bio ?? null,
    },
    update: {
      ...(data.specialties !== undefined && { specialties: data.specialties }),
      ...(data.yearsExperience !== undefined && { yearsExperience: data.yearsExperience }),
      ...(data.bio !== undefined && { bio: data.bio }),
    },
  });
}

// ── Audit ────────────────────────────────────────────────────────────────────

export async function listRecentAuditLogs(resourceIds: string[], limit: number) {
  return db.auditLog.findMany({
    where: { resourceId: { in: resourceIds } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, email: true } } },
  });
}

export async function createAuditLog(data: {
  userId: string;
  action: AuditAction;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return db.auditLog.create({
    data: {
      action: data.action,
      resourceId: data.resourceId,
      metadata: data.metadata,
      user: { connect: { id: data.userId } },
    },
  });
}

// ── Reviews (Sprint 21) ──────────────────────────────────────────────────────

export async function findReviewByRepairOrder(repairOrderId: string) {
  return db.garageReview.findUnique({ where: { repairOrderId } });
}

/** Creates the review and recomputes the garage's cached rating in one
 * transaction — write-time aggregation, not computed live in search (see
 * CLAUDE.md's Sprint 21 notes). */
export async function createReview(
  tx: Prisma.TransactionClient,
  data: {
    garageId: string;
    customerId: string;
    repairOrderId: string;
    rating: number;
    comment?: string;
  },
) {
  const review = await tx.garageReview.create({ data });

  const agg = await tx.garageReview.aggregate({
    where: { garageId: data.garageId },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await tx.garage.update({
    where: { id: data.garageId },
    data: {
      reviewCount: agg._count._all,
      averageRating: agg._avg.rating ?? 0,
    },
  });

  return review;
}

export async function listRecentReviews(garageId: string, limit: number) {
  return db.garageReview.findMany({
    where: { garageId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { customer: { select: { name: true } } },
  });
}

export type { Emirate };
