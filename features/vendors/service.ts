import { randomBytes, randomUUID } from "node:crypto";
import type { RoleName } from "@prisma/client";
import { findUserByEmail } from "@/features/auth/repository";
import { PERMISSIONS } from "@/features/auth/permissions";
import { hasPermission } from "@/features/auth/rbac";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getEmailProvider } from "@/lib/email";
import { getStorageProvider } from "@/lib/storage";
import { logger } from "@/lib/observability/logger";
import * as repo from "./repository";
import type {
  CreateVendorLocationInput,
  CreateVendorProfileInput,
  InviteStaffInput,
  UpdateVendorLocationInput,
  UpdateVendorProfileInput,
  UploadVendorDocumentInput,
} from "./schemas";

const INVITATION_TTL_DAYS = 7;
const REQUIRED_DOCUMENT_TYPES = [
  "TRADE_LICENSE",
  "VAT_CERTIFICATE",
  "EMIRATES_ID_FRONT",
  "EMIRATES_ID_BACK",
] as const;

// ── Context / authorization ───────────────────────────────────────────────────

export interface VendorContext {
  organizationId: string;
  organizationName: string;
  organizationStatus: string;
  vendorId: string;
  vendor: NonNullable<Awaited<ReturnType<typeof repo.getVendorByOrganizationId>>>;
  membershipRole: RoleName;
}

/** A user's vendor-org membership + profile, resolved directly from the DB rather
 * than the JWT session role. The session role only refreshes at next sign-in, but a
 * user must keep working through onboarding (business profile -> documents -> submit)
 * in the same session immediately after their membership is created — so every
 * vendor-portal check here queries OrganizationMembership fresh instead. */
export async function getVendorContext(userId: string): Promise<VendorContext | null> {
  const membership = await repo.findVendorMembership(userId);
  if (!membership || !membership.organization.vendor) return null;

  const membershipRole = membership.roles[0]?.role.name;
  if (!membershipRole) return null;

  return {
    organizationId: membership.organization.id,
    organizationName: membership.organization.name,
    organizationStatus: membership.organization.status,
    vendorId: membership.organization.vendor.id,
    vendor: membership.organization.vendor,
    membershipRole,
  };
}

async function requireVendorContext(userId: string): Promise<VendorContext> {
  const context = await getVendorContext(userId);
  if (!context) throw new NotFoundError("Vendor organization");
  return context;
}

/** Composite read for the vendor portal shell (dashboard header, onboarding
 * progress, sidebar badges) — one call instead of the layout re-deriving it. */
export async function getMyVendorDashboard(userId: string) {
  const context = await getVendorContext(userId);
  if (!context) return null;

  const [full, locations, members] = await Promise.all([
    repo.getVendorById(context.vendorId),
    repo.listLocations(context.organizationId),
    repo.listMemberships(context.organizationId),
  ]);
  if (!full) return null;

  return {
    organization: {
      id: context.organizationId,
      name: context.organizationName,
      status: context.organizationStatus,
    },
    vendor: full,
    membershipRole: context.membershipRole,
    locationsCount: locations.length,
    staffCount: members.length,
  };
}

export async function listVendorActivity(userId: string, limit = 5) {
  const context = await requireVendorContext(userId);
  return repo.listRecentAuditLogs([context.organizationId, context.vendorId], limit);
}

async function requireOwnerContext(userId: string): Promise<VendorContext> {
  const context = await requireVendorContext(userId);
  if (!hasPermission(context.membershipRole, PERMISSIONS.VENDOR_PROFILE_MANAGE)) {
    throw new ForbiddenError("Only the vendor owner can manage this.");
  }
  return context;
}

async function requireStaffManageContext(userId: string): Promise<VendorContext> {
  const context = await requireVendorContext(userId);
  if (!hasPermission(context.membershipRole, PERMISSIONS.VENDOR_STAFF_MANAGE)) {
    throw new ForbiddenError("Only the vendor owner can manage staff.");
  }
  return context;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "vendor"
  );
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export async function createVendorOrganization(userId: string, input: CreateVendorProfileInput) {
  const existing = await repo.findVendorMembership(userId);
  if (existing) throw new ConflictError("You already belong to a vendor organization.");

  const slug = `${slugify(input.businessName)}-${randomUUID().slice(0, 8)}`;
  const { organization, vendor } = await repo.createVendorOrganization(userId, slug, input);

  await repo.createAuditLog({
    userId,
    action: "VENDOR_ORG_CREATED",
    resourceId: organization.id,
    metadata: { businessName: input.businessName },
  });

  logger.info(
    { organizationId: organization.id, vendorId: vendor.id },
    "Vendor organization created",
  );
  return { organization, vendor };
}

export async function updateVendorProfile(userId: string, input: UpdateVendorProfileInput) {
  const context = await requireOwnerContext(userId);
  if (context.vendor.verificationStatus === "APPROVED") {
    throw new ConflictError("An approved vendor profile cannot be edited here.");
  }
  if (context.vendor.verificationStatus === "SUBMITTED") {
    throw new ConflictError("Your application is under review and cannot be edited right now.");
  }

  const updated = await repo.updateVendorProfile(context.vendorId, input, input.businessName);

  await repo.createAuditLog({
    userId,
    action: "VENDOR_PROFILE_UPDATED",
    resourceId: context.vendorId,
  });

  return updated;
}

export async function uploadVendorDocument(
  userId: string,
  fileData: Buffer,
  meta: UploadVendorDocumentInput,
) {
  const context = await requireOwnerContext(userId);
  if (context.vendor.verificationStatus === "APPROVED") {
    throw new ConflictError("An approved vendor cannot upload new onboarding documents here.");
  }

  const ext = meta.filename.split(".").pop() ?? "bin";
  const key = `vendors/${context.vendorId}/documents/${randomUUID()}.${ext}`;

  const storage = getStorageProvider();
  await storage.upload(key, fileData, meta.mimeType);

  const document = await repo.createVendorDocument({
    vendorId: context.vendorId,
    type: meta.type,
    storageKey: key,
    filename: meta.filename,
    mimeType: meta.mimeType,
    sizeBytes: meta.sizeBytes,
    uploadedById: userId,
  });

  await repo.createAuditLog({
    userId,
    action: "VENDOR_DOCUMENT_UPLOADED",
    resourceId: document.id,
    metadata: { type: meta.type },
  });

  return document;
}

export async function deleteVendorDocument(userId: string, documentId: string) {
  const context = await requireOwnerContext(userId);
  const doc = await repo.findVendorDocumentById(documentId, context.vendorId);
  if (!doc) throw new NotFoundError("Document");

  const storage = getStorageProvider();
  await storage.delete(doc.storageKey);
  await repo.deleteVendorDocument(documentId);

  await repo.createAuditLog({
    userId,
    action: "VENDOR_DOCUMENT_DELETED",
    resourceId: documentId,
    metadata: { type: doc.type },
  });
}

export async function submitVendorForReview(userId: string) {
  const context = await requireOwnerContext(userId);
  const { vendor } = context;

  if (vendor.verificationStatus === "SUBMITTED") {
    throw new ConflictError("This application has already been submitted.");
  }
  if (vendor.verificationStatus === "APPROVED") {
    throw new ConflictError("This vendor is already approved.");
  }

  const full = await repo.getVendorById(context.vendorId);
  if (!full) throw new NotFoundError("Vendor organization");

  const uploadedTypes = new Set(full.documents.map((d) => d.type));
  const missing = REQUIRED_DOCUMENT_TYPES.filter((t) => !uploadedTypes.has(t));
  if (missing.length > 0) {
    throw new ValidationError("Required documents are missing.", { missing });
  }
  if (!vendor.authorizedSignatoryName || !vendor.authorizedSignatoryEmiratesId) {
    throw new ValidationError(
      "Authorized signatory name and Emirates ID are required before submitting.",
    );
  }

  const updated = await repo.submitVendor(context.vendorId);

  await repo.createAuditLog({
    userId,
    action: "VENDOR_SUBMITTED",
    resourceId: context.vendorId,
  });

  return updated;
}

// ── Admin review ──────────────────────────────────────────────────────────────

export async function listVendorApplications(pagination: { limit: number; offset: number }) {
  return repo.listSubmittedVendors(pagination);
}

export async function getVendorApplication(vendorId: string) {
  const vendor = await repo.getVendorById(vendorId);
  if (!vendor) throw new NotFoundError("Vendor application");
  return vendor;
}

export async function approveVendorApplication(vendorId: string, adminUserId: string) {
  const vendor = await repo.getVendorById(vendorId);
  if (!vendor) throw new NotFoundError("Vendor application");
  if (vendor.verificationStatus !== "SUBMITTED") {
    throw new ConflictError("Only submitted applications can be approved.");
  }

  const updated = await repo.approveVendor(vendorId, adminUserId);

  await repo.createAuditLog({
    userId: adminUserId,
    action: "VENDOR_APPROVED",
    resourceId: vendorId,
  });

  getEmailProvider()
    .sendVendorApplicationDecision(vendor.contactEmail, {
      organizationName: vendor.businessName,
      approved: true,
    })
    .catch((err: unknown) => logger.error({ err }, "Failed to send vendor approval email"));

  return updated;
}

export async function rejectVendorApplication(
  vendorId: string,
  adminUserId: string,
  reason: string,
) {
  const vendor = await repo.getVendorById(vendorId);
  if (!vendor) throw new NotFoundError("Vendor application");
  if (vendor.verificationStatus !== "SUBMITTED") {
    throw new ConflictError("Only submitted applications can be rejected.");
  }

  const updated = await repo.rejectVendor(vendorId, adminUserId, reason);

  await repo.createAuditLog({
    userId: adminUserId,
    action: "VENDOR_REJECTED",
    resourceId: vendorId,
    metadata: { reason },
  });

  getEmailProvider()
    .sendVendorApplicationDecision(vendor.contactEmail, {
      organizationName: vendor.businessName,
      approved: false,
      reason,
    })
    .catch((err: unknown) => logger.error({ err }, "Failed to send vendor rejection email"));

  return updated;
}

// ── Locations ─────────────────────────────────────────────────────────────────

export async function listVendorLocations(userId: string) {
  const context = await requireVendorContext(userId);
  return repo.listLocations(context.organizationId);
}

export async function createVendorLocation(userId: string, input: CreateVendorLocationInput) {
  const context = await requireOwnerContext(userId);
  if (input.isPrimary) await repo.clearPrimaryLocation(context.organizationId);

  const location = await repo.createLocation(context.organizationId, input);

  await repo.createAuditLog({
    userId,
    action: "VENDOR_LOCATION_CREATED",
    resourceId: location.id,
  });

  return location;
}

export async function updateVendorLocation(
  userId: string,
  locationId: string,
  input: UpdateVendorLocationInput,
) {
  const context = await requireOwnerContext(userId);
  const existing = await repo.findLocationById(locationId, context.organizationId);
  if (!existing) throw new NotFoundError("Location");

  if (input.isPrimary) await repo.clearPrimaryLocation(context.organizationId);

  const updated = await repo.updateLocation(locationId, input);

  await repo.createAuditLog({
    userId,
    action: "VENDOR_LOCATION_UPDATED",
    resourceId: locationId,
  });

  return updated;
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export async function listVendorStaff(userId: string) {
  const context = await requireVendorContext(userId);
  const [members, invitations] = await Promise.all([
    repo.listMemberships(context.organizationId),
    repo.listInvitations(context.organizationId),
  ]);
  return { members, invitations };
}

export async function inviteVendorStaff(userId: string, input: InviteStaffInput) {
  const context = await requireStaffManageContext(userId);

  const invitedUser = await findUserByEmail(input.email);
  if (invitedUser) {
    const existingMembership = await repo.findMembershipByUserAndOrg(
      invitedUser.id,
      context.organizationId,
    );
    if (existingMembership) {
      throw new ConflictError("This person is already a member of your organization.");
    }
  }

  const existingInvite = await repo.findPendingInvitationByEmail(
    context.organizationId,
    input.email,
  );
  if (existingInvite) {
    throw new ConflictError("An invitation is already pending for this email address.");
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await repo.createInvitation({
    organizationId: context.organizationId,
    email: input.email,
    role: input.role,
    token,
    invitedById: userId,
    expiresAt,
  });

  await repo.createAuditLog({
    userId,
    action: "VENDOR_STAFF_INVITED",
    resourceId: invitation.id,
    metadata: { email: input.email, role: input.role },
  });

  getEmailProvider()
    .sendStaffInvitation(input.email, {
      organizationName: context.organizationName,
      role: input.role,
      token,
    })
    .catch((err: unknown) => logger.error({ err }, "Failed to send staff invitation email"));

  return invitation;
}

export async function revokeVendorInvitation(userId: string, invitationId: string) {
  const context = await requireStaffManageContext(userId);
  const invitation = await repo.findInvitationById(invitationId, context.organizationId);
  if (!invitation) throw new NotFoundError("Invitation");
  if (invitation.status !== "PENDING")
    throw new ConflictError("This invitation is no longer pending.");

  await repo.markInvitationRevoked(invitationId);

  await repo.createAuditLog({
    userId,
    action: "VENDOR_STAFF_INVITE_REVOKED",
    resourceId: invitationId,
  });
}

export async function removeVendorStaffMember(userId: string, membershipId: string) {
  const context = await requireStaffManageContext(userId);
  const membership = await repo.findMembershipById(membershipId, context.organizationId);
  if (!membership) throw new NotFoundError("Staff member");

  const isOwner = membership.roles.some((r) => r.role.name === "VENDOR_OWNER");
  if (isOwner) {
    const ownerCount = await repo.countOwnerMemberships(context.organizationId);
    if (ownerCount <= 1)
      throw new ConflictError("Cannot remove the only owner of the organization.");
  }

  await repo.removeMembership(membershipId);

  await repo.createAuditLog({
    userId,
    action: "VENDOR_STAFF_REMOVED",
    resourceId: membershipId,
  });
}

export async function getInvitationByToken(token: string) {
  const invitation = await repo.findInvitationByToken(token);
  if (!invitation) throw new NotFoundError("Invitation");
  return invitation;
}

export async function acceptVendorInvitation(token: string, userId: string, userEmail: string) {
  const invitation = await repo.findInvitationByToken(token);
  if (!invitation) throw new NotFoundError("Invitation");

  if (invitation.status !== "PENDING") {
    throw new ConflictError("This invitation is no longer valid.");
  }
  if (invitation.expiresAt < new Date()) {
    throw new ConflictError("This invitation has expired.");
  }
  if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new ForbiddenError("This invitation was sent to a different email address.");
  }

  const existingMembership = await repo.findMembershipByUserAndOrg(
    userId,
    invitation.organizationId,
  );
  if (!existingMembership) {
    await repo.createMembershipWithRole(userId, invitation.organizationId, invitation.role);
  }

  await repo.markInvitationAccepted(invitation.id);

  await repo.createAuditLog({
    userId,
    action: "VENDOR_STAFF_INVITE_ACCEPTED",
    resourceId: invitation.id,
  });

  return invitation.organization;
}
