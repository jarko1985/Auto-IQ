import { db } from "@/lib/db";
import type { Prisma, AuditAction, Emirate, RoleName, VendorDocumentType } from "@prisma/client";
import type {
  CreateVendorLocationInput,
  CreateVendorProfileInput,
  UpdateVendorLocationInput,
  UpdateVendorProfileInput,
} from "./schemas";

// ── Vendor org + profile ─────────────────────────────────────────────────────

/** A user's vendor-org membership, if any — a user may belong to at most one
 * VENDOR-type organization (enforced in service.createVendorOrganization). */
export async function findVendorMembership(userId: string) {
  return db.organizationMembership.findFirst({
    where: { userId, organization: { type: "VENDOR", deletedAt: null } },
    include: {
      organization: { include: { vendor: true } },
      roles: { include: { role: true } },
    },
  });
}

export async function createVendorOrganization(
  userId: string,
  slug: string,
  input: CreateVendorProfileInput,
) {
  return db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: input.businessName, slug, type: "VENDOR", status: "PENDING_APPROVAL" },
    });

    const vendor = await tx.vendor.create({
      data: {
        organizationId: organization.id,
        businessName: input.businessName,
        businessType: input.businessType,
        tradeLicenseNumber: input.tradeLicenseNumber,
        tradeLicenseExpiry: new Date(input.tradeLicenseExpiry),
        contactPersonName: input.contactPersonName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        addressLine1: input.addressLine1,
        emirate: input.emirate,
      },
    });

    const role = await tx.role.findUnique({ where: { name: "VENDOR_OWNER" } });
    if (!role) throw new Error("VENDOR_OWNER role is not seeded");

    const membership = await tx.organizationMembership.create({
      data: { userId, organizationId: organization.id },
    });
    await tx.membershipRole.create({ data: { membershipId: membership.id, roleId: role.id } });

    return { organization, vendor };
  });
}

export async function getVendorById(id: string) {
  return db.vendor.findUnique({
    where: { id },
    include: { organization: true, documents: { orderBy: { createdAt: "desc" } } },
  });
}

export async function getVendorByOrganizationId(organizationId: string) {
  return db.vendor.findUnique({ where: { organizationId } });
}

export async function updateVendorProfile(
  vendorId: string,
  data: UpdateVendorProfileInput,
  businessName?: string,
) {
  return db.vendor.update({
    where: { id: vendorId },
    data: {
      ...(businessName !== undefined && { businessName }),
      ...(data.businessType !== undefined && { businessType: data.businessType }),
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

export async function submitVendor(vendorId: string) {
  return db.vendor.update({
    where: { id: vendorId },
    data: { verificationStatus: "SUBMITTED", submittedAt: new Date(), rejectionReason: null },
  });
}

export async function listSubmittedVendors(pagination: { limit: number; offset: number }) {
  const where: Prisma.VendorWhereInput = { verificationStatus: "SUBMITTED" };

  const [vendors, total] = await Promise.all([
    db.vendor.findMany({
      where,
      orderBy: { submittedAt: "asc" },
      take: pagination.limit,
      skip: pagination.offset,
      include: { organization: true, _count: { select: { documents: true } } },
    }),
    db.vendor.count({ where }),
  ]);

  return { vendors, total };
}

export async function approveVendor(vendorId: string, adminUserId: string) {
  return db.$transaction(async (tx) => {
    const vendor = await tx.vendor.update({
      where: { id: vendorId },
      data: {
        verificationStatus: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: adminUserId,
        rejectionReason: null,
      },
    });
    await tx.organization.update({
      where: { id: vendor.organizationId },
      data: { status: "ACTIVE" },
    });
    return vendor;
  });
}

export async function rejectVendor(vendorId: string, adminUserId: string, reason: string) {
  return db.$transaction(async (tx) => {
    const vendor = await tx.vendor.update({
      where: { id: vendorId },
      data: {
        verificationStatus: "REJECTED",
        reviewedAt: new Date(),
        reviewedById: adminUserId,
        rejectionReason: reason,
      },
    });
    await tx.organization.update({
      where: { id: vendor.organizationId },
      data: { status: "REJECTED" },
    });
    return vendor;
  });
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function createVendorDocument(data: {
  vendorId: string;
  type: VendorDocumentType;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
}) {
  return db.vendorDocument.create({ data });
}

export async function findVendorDocumentById(id: string, vendorId: string) {
  return db.vendorDocument.findFirst({ where: { id, vendorId } });
}

export async function deleteVendorDocument(id: string) {
  return db.vendorDocument.delete({ where: { id } });
}

// ── Locations ─────────────────────────────────────────────────────────────────

export async function listLocations(organizationId: string) {
  return db.vendorLocation.findMany({
    where: { organizationId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
}

export async function findLocationById(id: string, organizationId: string) {
  return db.vendorLocation.findFirst({ where: { id, organizationId } });
}

export async function createLocation(organizationId: string, data: CreateVendorLocationInput) {
  return db.vendorLocation.create({
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

export async function updateLocation(id: string, data: UpdateVendorLocationInput) {
  return db.vendorLocation.update({
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

export async function clearPrimaryLocation(organizationId: string) {
  return db.vendorLocation.updateMany({
    where: { organizationId, isPrimary: true },
    data: { isPrimary: false },
  });
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export async function listMemberships(organizationId: string) {
  return db.organizationMembership.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      roles: { include: { role: true } },
    },
  });
}

export async function findMembershipById(id: string, organizationId: string) {
  return db.organizationMembership.findFirst({
    where: { id, organizationId },
    include: { roles: { include: { role: true } } },
  });
}

export async function countOwnerMemberships(organizationId: string) {
  return db.organizationMembership.count({
    where: { organizationId, roles: { some: { role: { name: "VENDOR_OWNER" } } } },
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

export async function listRecentAuditLogs(resourceIds: string[], limit: number) {
  return db.auditLog.findMany({
    where: { resourceId: { in: resourceIds } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, email: true } } },
  });
}

// ── Audit ─────────────────────────────────────────────────────────────────────

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

export type { Emirate };
