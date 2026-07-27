import { randomBytes, randomUUID } from "node:crypto";
import type { RoleName } from "@prisma/client";
import { findUserByEmail } from "@/features/auth/repository";
import { PERMISSIONS } from "@/features/auth/permissions";
import { hasPermission } from "@/features/auth/rbac";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getEmailProvider } from "@/lib/email";
import { getStorageProvider } from "@/lib/storage";
import { getGeocodingProvider } from "@/lib/maps";
import { db } from "@/lib/db";
import { logger } from "@/lib/observability/logger";
import * as repo from "./repository";
import type {
  CreateGarageLocationInput,
  CreateGarageProfileInput,
  InviteStaffInput,
  UpdateGarageLocationInput,
  UpdateGarageProfileInput,
  UpdateMakeSpecializationsInput,
  UpdateMechanicProfileInput,
  UpdateServicesInput,
  UpdateVehicleCapabilitiesInput,
  UpdateWorkingHoursInput,
  UploadGarageDocumentInput,
} from "./schemas";

const INVITATION_TTL_DAYS = 7;
const REQUIRED_DOCUMENT_TYPES = [
  "TRADE_LICENSE",
  "VAT_CERTIFICATE",
  "EMIRATES_ID_FRONT",
  "EMIRATES_ID_BACK",
] as const;

// ── Context / authorization ───────────────────────────────────────────────────

export interface GarageContext {
  organizationId: string;
  organizationName: string;
  organizationStatus: string;
  garageId: string;
  garage: NonNullable<Awaited<ReturnType<typeof repo.getGarageByOrganizationId>>>;
  membershipRole: RoleName;
}

/** A user's garage-org membership + profile, resolved directly from the DB
 * rather than the JWT session role — same reasoning as the vendor domain's
 * getVendorContext: the session role only refreshes at next sign-in, but a
 * user must keep working through onboarding in the same session. */
export async function getGarageContext(userId: string): Promise<GarageContext | null> {
  const membership = await repo.findGarageMembership(userId);
  if (!membership || !membership.organization.garage) return null;

  const membershipRole = membership.roles[0]?.role.name;
  if (!membershipRole) return null;

  return {
    organizationId: membership.organization.id,
    organizationName: membership.organization.name,
    organizationStatus: membership.organization.status,
    garageId: membership.organization.garage.id,
    garage: membership.organization.garage,
    membershipRole,
  };
}

async function requireGarageContext(userId: string): Promise<GarageContext> {
  const context = await getGarageContext(userId);
  if (!context) throw new NotFoundError("Garage organization");
  return context;
}

async function requireOwnerContext(userId: string): Promise<GarageContext> {
  const context = await requireGarageContext(userId);
  if (!hasPermission(context.membershipRole, PERMISSIONS.GARAGE_PROFILE_MANAGE)) {
    throw new ForbiddenError("Only the garage owner can manage this.");
  }
  return context;
}

async function requireStaffManageContext(userId: string): Promise<GarageContext> {
  const context = await requireGarageContext(userId);
  if (!hasPermission(context.membershipRole, PERMISSIONS.GARAGE_STAFF_MANAGE)) {
    throw new ForbiddenError("Only the garage owner can manage staff.");
  }
  return context;
}

/** Best-effort geocoding, fired after a location create/update — never blocks
 * or fails the location save itself, same graceful-degradation posture as
 * every other provider call in this codebase when unconfigured or failing
 * (e.g. getEmailProvider() calls elsewhere in this file use the identical
 * fire-and-forget `.catch(logger.error)` shape). */
function geocodeLocationBestEffort(
  locationId: string,
  addressLine1: string,
  emirate: string,
): void {
  getGeocodingProvider()
    .geocode({ addressLine1, emirate })
    .then((outcome) => {
      if (outcome.found) {
        return repo.updateLocationCoordinates(
          locationId,
          outcome.result.latitude,
          outcome.result.longitude,
        );
      }
    })
    .catch((err: unknown) =>
      logger.error({ err, locationId }, "Failed to geocode garage location"),
    );
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "garage"
  );
}

/** Composite read for the garage portal shell (dashboard header, onboarding
 * progress, sidebar badges) — one call instead of the layout re-deriving it. */
export async function getMyGarageDashboard(userId: string) {
  const context = await getGarageContext(userId);
  if (!context) return null;

  const [full, locations, members, services, vehicleCapabilities] = await Promise.all([
    repo.getGarageById(context.garageId),
    repo.listLocations(context.organizationId),
    repo.listMemberships(context.organizationId),
    repo.listServices(context.garageId),
    repo.listVehicleCapabilities(context.garageId),
  ]);
  if (!full) return null;

  return {
    organization: {
      id: context.organizationId,
      name: context.organizationName,
      status: context.organizationStatus,
    },
    garage: full,
    membershipRole: context.membershipRole,
    locationsCount: locations.length,
    staffCount: members.length,
    servicesCount: services.length,
    vehicleCapabilitiesCount: vehicleCapabilities.length,
  };
}

export async function listGarageActivity(userId: string, limit = 5) {
  const context = await requireGarageContext(userId);
  return repo.listRecentAuditLogs([context.organizationId, context.garageId], limit);
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export async function createGarageOrganization(userId: string, input: CreateGarageProfileInput) {
  const existing = await repo.findGarageMembership(userId);
  if (existing) throw new ConflictError("You already belong to a garage organization.");

  const slug = `${slugify(input.businessName)}-${randomUUID().slice(0, 8)}`;
  const { organization, garage } = await repo.createGarageOrganization(userId, slug, input);

  await repo.createAuditLog({
    userId,
    action: "GARAGE_ORG_CREATED",
    resourceId: organization.id,
    metadata: { businessName: input.businessName },
  });

  logger.info(
    { organizationId: organization.id, garageId: garage.id },
    "Garage organization created",
  );
  return { organization, garage };
}

export async function updateGarageProfile(userId: string, input: UpdateGarageProfileInput) {
  const context = await requireOwnerContext(userId);
  if (context.garage.verificationStatus === "APPROVED") {
    throw new ConflictError("An approved garage profile cannot be edited here.");
  }
  if (context.garage.verificationStatus === "SUBMITTED") {
    throw new ConflictError("Your application is under review and cannot be edited right now.");
  }

  const updated = await repo.updateGarageProfile(context.garageId, input, input.businessName);

  await repo.createAuditLog({
    userId,
    action: "GARAGE_PROFILE_UPDATED",
    resourceId: context.garageId,
  });

  return updated;
}

export async function uploadGarageDocument(
  userId: string,
  fileData: Buffer,
  meta: UploadGarageDocumentInput,
) {
  const context = await requireOwnerContext(userId);
  if (context.garage.verificationStatus === "APPROVED") {
    throw new ConflictError("An approved garage cannot upload new onboarding documents here.");
  }

  const ext = meta.filename.split(".").pop() ?? "bin";
  const key = `garages/${context.garageId}/documents/${randomUUID()}.${ext}`;

  const storage = getStorageProvider();
  await storage.upload(key, fileData, meta.mimeType);

  const document = await repo.createGarageDocument({
    garageId: context.garageId,
    type: meta.type,
    storageKey: key,
    filename: meta.filename,
    mimeType: meta.mimeType,
    sizeBytes: meta.sizeBytes,
    uploadedById: userId,
  });

  await repo.createAuditLog({
    userId,
    action: "GARAGE_DOCUMENT_UPLOADED",
    resourceId: document.id,
    metadata: { type: meta.type },
  });

  return document;
}

export async function deleteGarageDocument(userId: string, documentId: string) {
  const context = await requireOwnerContext(userId);
  const doc = await repo.findGarageDocumentById(documentId, context.garageId);
  if (!doc) throw new NotFoundError("Document");

  const storage = getStorageProvider();
  await storage.delete(doc.storageKey);
  await repo.deleteGarageDocument(documentId);

  await repo.createAuditLog({
    userId,
    action: "GARAGE_DOCUMENT_DELETED",
    resourceId: documentId,
    metadata: { type: doc.type },
  });
}

export async function submitGarageForReview(userId: string) {
  const context = await requireOwnerContext(userId);
  const { garage } = context;

  if (garage.verificationStatus === "SUBMITTED") {
    throw new ConflictError("This application has already been submitted.");
  }
  if (garage.verificationStatus === "APPROVED") {
    throw new ConflictError("This garage is already approved.");
  }

  const full = await repo.getGarageById(context.garageId);
  if (!full) throw new NotFoundError("Garage organization");

  const uploadedTypes = new Set(full.documents.map((d) => d.type));
  const missing = REQUIRED_DOCUMENT_TYPES.filter((t) => !uploadedTypes.has(t));
  if (missing.length > 0) {
    throw new ValidationError("Required documents are missing.", { missing });
  }
  if (!garage.authorizedSignatoryName || !garage.authorizedSignatoryEmiratesId) {
    throw new ValidationError(
      "Authorized signatory name and Emirates ID are required before submitting.",
    );
  }

  const updated = await repo.submitGarage(context.garageId);

  await repo.createAuditLog({
    userId,
    action: "GARAGE_SUBMITTED",
    resourceId: context.garageId,
  });

  return updated;
}

// ── Admin review ──────────────────────────────────────────────────────────────

export async function listGarageApplications(pagination: { limit: number; offset: number }) {
  return repo.listSubmittedGarages(pagination);
}

export async function getGarageApplication(garageId: string) {
  const garage = await repo.getGarageById(garageId);
  if (!garage) throw new NotFoundError("Garage application");
  return garage;
}

export async function approveGarageApplication(garageId: string, adminUserId: string) {
  const garage = await repo.getGarageById(garageId);
  if (!garage) throw new NotFoundError("Garage application");
  if (garage.verificationStatus !== "SUBMITTED") {
    throw new ConflictError("Only submitted applications can be approved.");
  }

  const updated = await repo.approveGarage(garageId, adminUserId);

  await repo.createAuditLog({
    userId: adminUserId,
    action: "GARAGE_APPROVED",
    resourceId: garageId,
  });

  getEmailProvider()
    .sendGarageApplicationDecision(garage.contactEmail, {
      organizationName: garage.businessName,
      approved: true,
    })
    .catch((err: unknown) => logger.error({ err }, "Failed to send garage approval email"));

  return updated;
}

export async function rejectGarageApplication(
  garageId: string,
  adminUserId: string,
  reason: string,
) {
  const garage = await repo.getGarageById(garageId);
  if (!garage) throw new NotFoundError("Garage application");
  if (garage.verificationStatus !== "SUBMITTED") {
    throw new ConflictError("Only submitted applications can be rejected.");
  }

  const updated = await repo.rejectGarage(garageId, adminUserId, reason);

  await repo.createAuditLog({
    userId: adminUserId,
    action: "GARAGE_REJECTED",
    resourceId: garageId,
    metadata: { reason },
  });

  getEmailProvider()
    .sendGarageApplicationDecision(garage.contactEmail, {
      organizationName: garage.businessName,
      approved: false,
      reason,
    })
    .catch((err: unknown) => logger.error({ err }, "Failed to send garage rejection email"));

  return updated;
}

// ── Locations & working hours ────────────────────────────────────────────────

export async function listGarageLocations(userId: string) {
  const context = await requireGarageContext(userId);
  return repo.listLocations(context.organizationId);
}

export async function createGarageLocation(userId: string, input: CreateGarageLocationInput) {
  const context = await requireOwnerContext(userId);
  if (input.isPrimary) await repo.clearPrimaryLocation(context.organizationId);

  const location = await repo.createLocation(context.organizationId, input);
  geocodeLocationBestEffort(location.id, location.addressLine1, location.emirate);

  await repo.createAuditLog({
    userId,
    action: "GARAGE_LOCATION_CREATED",
    resourceId: location.id,
  });

  return location;
}

export async function updateGarageLocation(
  userId: string,
  locationId: string,
  input: UpdateGarageLocationInput,
) {
  const context = await requireOwnerContext(userId);
  const existing = await repo.findLocationById(locationId, context.organizationId);
  if (!existing) throw new NotFoundError("Location");

  if (input.isPrimary) await repo.clearPrimaryLocation(context.organizationId);

  const updated = await repo.updateLocation(locationId, input);
  if (input.addressLine1 !== undefined || input.emirate !== undefined) {
    geocodeLocationBestEffort(updated.id, updated.addressLine1, updated.emirate);
  }

  await repo.createAuditLog({
    userId,
    action: "GARAGE_LOCATION_UPDATED",
    resourceId: locationId,
  });

  return updated;
}

export async function updateGarageWorkingHours(
  userId: string,
  locationId: string,
  input: UpdateWorkingHoursInput,
) {
  const context = await requireOwnerContext(userId);
  const existing = await repo.findLocationById(locationId, context.organizationId);
  if (!existing) throw new NotFoundError("Location");

  const updated = await repo.replaceWorkingHours(locationId, input.hours);

  await repo.createAuditLog({
    userId,
    action: "GARAGE_WORKING_HOURS_UPDATED",
    resourceId: locationId,
  });

  return updated;
}

// ── Services & vehicle capabilities ──────────────────────────────────────────

export async function getGarageServiceConfig(userId: string) {
  const context = await requireGarageContext(userId);
  const [services, vehicleCapabilities, makeSpecializations] = await Promise.all([
    repo.listServices(context.garageId),
    repo.listVehicleCapabilities(context.garageId),
    repo.listMakeSpecializations(context.garageId),
  ]);
  return { services, vehicleCapabilities, makeSpecializations };
}

export async function updateGarageServices(userId: string, input: UpdateServicesInput) {
  const context = await requireOwnerContext(userId);
  const services = await repo.replaceServices(context.garageId, input.serviceTypes);

  await repo.createAuditLog({
    userId,
    action: "GARAGE_SERVICES_UPDATED",
    resourceId: context.garageId,
    metadata: { count: services.length },
  });

  return services;
}

export async function updateGarageVehicleCapabilities(
  userId: string,
  input: UpdateVehicleCapabilitiesInput,
) {
  const context = await requireOwnerContext(userId);
  const capabilities = await repo.replaceVehicleCapabilities(context.garageId, input.vehicleTypes);

  await repo.createAuditLog({
    userId,
    action: "GARAGE_VEHICLE_CAPABILITIES_UPDATED",
    resourceId: context.garageId,
    metadata: { count: capabilities.length },
  });

  return capabilities;
}

export async function updateGarageMakeSpecializations(
  userId: string,
  input: UpdateMakeSpecializationsInput,
) {
  const context = await requireOwnerContext(userId);

  if (input.makeIds.length > 0) {
    const existingCount = await db.vehicleMake.count({ where: { id: { in: input.makeIds } } });
    if (existingCount !== input.makeIds.length) {
      throw new ValidationError("One or more selected vehicle makes do not exist.");
    }
  }

  const specializations = await repo.replaceMakeSpecializations(context.garageId, input.makeIds);

  await repo.createAuditLog({
    userId,
    action: "GARAGE_MAKE_SPECIALIZATIONS_UPDATED",
    resourceId: context.garageId,
    metadata: { count: specializations.length },
  });

  return specializations;
}

// ── Staff & mechanics ─────────────────────────────────────────────────────────

export async function listGarageStaff(userId: string) {
  const context = await requireGarageContext(userId);
  const [members, invitations] = await Promise.all([
    repo.listMemberships(context.organizationId),
    repo.listInvitations(context.organizationId),
  ]);
  return { members, invitations };
}

export async function inviteGarageStaff(userId: string, input: InviteStaffInput) {
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
    action: "GARAGE_STAFF_INVITED",
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

export async function revokeGarageInvitation(userId: string, invitationId: string) {
  const context = await requireStaffManageContext(userId);
  const invitation = await repo.findInvitationById(invitationId, context.organizationId);
  if (!invitation) throw new NotFoundError("Invitation");
  if (invitation.status !== "PENDING")
    throw new ConflictError("This invitation is no longer pending.");

  await repo.markInvitationRevoked(invitationId);

  await repo.createAuditLog({
    userId,
    action: "GARAGE_STAFF_INVITE_REVOKED",
    resourceId: invitationId,
  });
}

export async function removeGarageStaffMember(userId: string, membershipId: string) {
  const context = await requireStaffManageContext(userId);
  const membership = await repo.findMembershipById(membershipId, context.organizationId);
  if (!membership) throw new NotFoundError("Staff member");

  const isOwner = membership.roles.some((r) => r.role.name === "GARAGE_OWNER");
  if (isOwner) {
    const ownerCount = await repo.countOwnerMemberships(context.organizationId);
    if (ownerCount <= 1)
      throw new ConflictError("Cannot remove the only owner of the organization.");
  }

  await repo.removeMembership(membershipId);

  await repo.createAuditLog({
    userId,
    action: "GARAGE_STAFF_REMOVED",
    resourceId: membershipId,
  });
}

export async function updateGarageMechanicProfile(
  userId: string,
  membershipId: string,
  input: UpdateMechanicProfileInput,
) {
  const context = await requireStaffManageContext(userId);
  const membership = await repo.findMembershipById(membershipId, context.organizationId);
  if (!membership) throw new NotFoundError("Staff member");

  const isMechanic = membership.roles.some((r) => r.role.name === "MECHANIC");
  if (!isMechanic) throw new ConflictError("Only mechanics have a skills profile.");

  const profile = await repo.upsertMechanicProfile(membershipId, input);

  await repo.createAuditLog({
    userId,
    action: "GARAGE_MECHANIC_PROFILE_UPDATED",
    resourceId: membershipId,
  });

  return profile;
}

export async function getInvitationByToken(token: string) {
  const invitation = await repo.findInvitationByToken(token);
  if (!invitation) throw new NotFoundError("Invitation");
  return invitation;
}

export async function acceptGarageInvitation(token: string, userId: string, userEmail: string) {
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
    action: "GARAGE_STAFF_INVITE_ACCEPTED",
    resourceId: invitation.id,
  });

  return invitation.organization;
}
