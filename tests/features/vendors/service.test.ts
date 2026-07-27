import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendStaffInvitation = vi.fn();
const mockSendVendorApplicationDecision = vi.fn();
const mockUpload = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/features/vendors/repository", () => ({
  findVendorMembership: vi.fn(),
  createVendorOrganization: vi.fn(),
  getVendorById: vi.fn(),
  getVendorByOrganizationId: vi.fn(),
  updateVendorProfile: vi.fn(),
  submitVendor: vi.fn(),
  listSubmittedVendors: vi.fn(),
  approveVendor: vi.fn(),
  rejectVendor: vi.fn(),
  createVendorDocument: vi.fn(),
  findVendorDocumentById: vi.fn(),
  deleteVendorDocument: vi.fn(),
  listLocations: vi.fn(),
  findLocationById: vi.fn(),
  createLocation: vi.fn(),
  updateLocation: vi.fn(),
  clearPrimaryLocation: vi.fn(),
  listMemberships: vi.fn(),
  findMembershipById: vi.fn(),
  countOwnerMemberships: vi.fn(),
  removeMembership: vi.fn(),
  findMembershipByUserAndOrg: vi.fn(),
  createMembershipWithRole: vi.fn(),
  listInvitations: vi.fn(),
  findPendingInvitationByEmail: vi.fn(),
  createInvitation: vi.fn(),
  findInvitationByToken: vi.fn(),
  findInvitationById: vi.fn(),
  markInvitationAccepted: vi.fn(),
  markInvitationRevoked: vi.fn(),
  listRecentAuditLogs: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock("@/features/auth/repository", () => ({
  findUserByEmail: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  getEmailProvider: () => ({
    sendStaffInvitation: mockSendStaffInvitation,
    sendVendorApplicationDecision: mockSendVendorApplicationDecision,
    sendEmailVerification: vi.fn(),
    sendPasswordReset: vi.fn(),
    sendWelcome: vi.fn(),
  }),
}));

vi.mock("@/lib/storage", () => ({
  getStorageProvider: () => ({ upload: mockUpload, delete: mockDelete, getUrl: vi.fn() }),
}));

import * as repo from "@/features/vendors/repository";
import { findUserByEmail } from "@/features/auth/repository";
import {
  createVendorOrganization,
  getVendorContext,
  updateVendorProfile,
  submitVendorForReview,
  approveVendorApplication,
  rejectVendorApplication,
  inviteVendorStaff,
  removeVendorStaffMember,
  acceptVendorInvitation,
} from "@/features/vendors/service";
import type {
  CreateVendorProfileInput,
  UpdateVendorProfileInput,
} from "@/features/vendors/schemas";

const baseProfileInput: CreateVendorProfileInput = {
  businessName: "Gulf Auto Spares",
  businessType: "AUTHORIZED_DISTRIBUTOR",
  tradeLicenseNumber: "TL-990234",
  tradeLicenseExpiry: "2027-03-15",
  contactPersonName: "Fahad Al Marzooqi",
  contactPhone: "+971529876543",
  contactEmail: "owner@example.com",
  addressLine1: "Mussafah Industrial Area M-12",
  emirate: "ABU_DHABI",
};

function ownerMembership(
  overrides: Partial<{ verificationStatus: string; documents: unknown[] }> = {},
) {
  return {
    id: "membership-1",
    organization: {
      id: "org-1",
      name: "Gulf Auto Spares",
      status: "PENDING_APPROVAL",
      vendor: {
        id: "vendor-1",
        organizationId: "org-1",
        verificationStatus: overrides.verificationStatus ?? "DRAFT",
        authorizedSignatoryName: "Fahad Al Marzooqi",
        authorizedSignatoryEmiratesId: "784-1988-7654321-2",
      },
    },
    roles: [{ role: { name: "VENDOR_OWNER" } }],
  };
}

function staffMembership() {
  const m = ownerMembership();
  return { ...m, roles: [{ role: { name: "VENDOR_STAFF" } }] };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSendStaffInvitation.mockResolvedValue(undefined);
  mockSendVendorApplicationDecision.mockResolvedValue(undefined);
});

describe("createVendorOrganization", () => {
  it("throws ConflictError when the user already belongs to a vendor organization", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(ownerMembership() as never);

    await expect(createVendorOrganization("user-1", baseProfileInput)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(repo.createVendorOrganization).not.toHaveBeenCalled();
  });

  it("creates the organization, vendor, and audit log when the user has no vendor org", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(null);
    vi.mocked(repo.createVendorOrganization).mockResolvedValue({
      organization: { id: "org-1" },
      vendor: { id: "vendor-1" },
    } as never);

    const result = await createVendorOrganization("user-1", baseProfileInput);

    expect(result.organization.id).toBe("org-1");
    expect(repo.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", action: "VENDOR_ORG_CREATED" }),
    );
  });
});

describe("getVendorContext", () => {
  it("returns null when the user has no vendor membership", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(null);
    expect(await getVendorContext("user-1")).toBeNull();
  });

  it("returns null when the organization has no vendor profile yet", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue({
      organization: { id: "org-1", name: "X", status: "PENDING_APPROVAL", vendor: null },
      roles: [{ role: { name: "VENDOR_OWNER" } }],
    } as never);
    expect(await getVendorContext("user-1")).toBeNull();
  });

  it("returns the resolved context when membership and vendor exist", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(ownerMembership() as never);
    const context = await getVendorContext("user-1");
    expect(context?.membershipRole).toBe("VENDOR_OWNER");
    expect(context?.vendorId).toBe("vendor-1");
  });
});

describe("updateVendorProfile", () => {
  const patch: UpdateVendorProfileInput = { businessName: "Updated Name" };

  it("throws NotFoundError when the user has no vendor organization", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(null);
    await expect(updateVendorProfile("user-1", patch)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws ForbiddenError when the membership role lacks VENDOR_PROFILE_MANAGE", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(staffMembership() as never);
    await expect(updateVendorProfile("user-1", patch)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.updateVendorProfile).not.toHaveBeenCalled();
  });

  it("throws ConflictError when the application is already under review", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(
      ownerMembership({ verificationStatus: "SUBMITTED" }) as never,
    );
    await expect(updateVendorProfile("user-1", patch)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("throws ConflictError when the vendor is already approved", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(
      ownerMembership({ verificationStatus: "APPROVED" }) as never,
    );
    await expect(updateVendorProfile("user-1", patch)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("updates the profile when the owner edits a DRAFT application", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(ownerMembership() as never);
    vi.mocked(repo.updateVendorProfile).mockResolvedValue({ id: "vendor-1" } as never);

    await updateVendorProfile("user-1", patch);

    expect(repo.updateVendorProfile).toHaveBeenCalledWith("vendor-1", patch, "Updated Name");
    expect(repo.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "VENDOR_PROFILE_UPDATED" }),
    );
  });
});

describe("submitVendorForReview", () => {
  it("throws ValidationError when required documents are missing", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(ownerMembership() as never);
    vi.mocked(repo.getVendorById).mockResolvedValue({
      id: "vendor-1",
      authorizedSignatoryName: "Fahad",
      authorizedSignatoryEmiratesId: "784-1988-7654321-2",
      documents: [{ type: "TRADE_LICENSE" }],
    } as never);

    await expect(submitVendorForReview("user-1")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(repo.submitVendor).not.toHaveBeenCalled();
  });

  it("throws ValidationError when the authorized signatory fields are missing", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue({
      ...ownerMembership(),
      organization: {
        ...ownerMembership().organization,
        vendor: { ...ownerMembership().organization.vendor, authorizedSignatoryName: null },
      },
    } as never);
    vi.mocked(repo.getVendorById).mockResolvedValue({
      id: "vendor-1",
      authorizedSignatoryName: null,
      authorizedSignatoryEmiratesId: null,
      documents: [
        { type: "TRADE_LICENSE" },
        { type: "VAT_CERTIFICATE" },
        { type: "EMIRATES_ID_FRONT" },
        { type: "EMIRATES_ID_BACK" },
      ],
    } as never);

    await expect(submitVendorForReview("user-1")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("submits successfully once all required documents and signatory fields are present", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(ownerMembership() as never);
    vi.mocked(repo.getVendorById).mockResolvedValue({
      id: "vendor-1",
      authorizedSignatoryName: "Fahad",
      authorizedSignatoryEmiratesId: "784-1988-7654321-2",
      documents: [
        { type: "TRADE_LICENSE" },
        { type: "VAT_CERTIFICATE" },
        { type: "EMIRATES_ID_FRONT" },
        { type: "EMIRATES_ID_BACK" },
      ],
    } as never);
    vi.mocked(repo.submitVendor).mockResolvedValue({
      id: "vendor-1",
      verificationStatus: "SUBMITTED",
    } as never);

    const result = await submitVendorForReview("user-1");

    expect(result.verificationStatus).toBe("SUBMITTED");
    expect(repo.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "VENDOR_SUBMITTED" }),
    );
  });
});

describe("approveVendorApplication / rejectVendorApplication", () => {
  it("throws NotFoundError when the vendor does not exist", async () => {
    vi.mocked(repo.getVendorById).mockResolvedValue(null);
    await expect(approveVendorApplication("vendor-1", "admin-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws ConflictError when approving a non-submitted application", async () => {
    vi.mocked(repo.getVendorById).mockResolvedValue({
      id: "vendor-1",
      verificationStatus: "DRAFT",
      contactEmail: "x@example.com",
      businessName: "X",
    } as never);
    await expect(approveVendorApplication("vendor-1", "admin-1")).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("approves a submitted application and notifies the vendor", async () => {
    vi.mocked(repo.getVendorById).mockResolvedValue({
      id: "vendor-1",
      verificationStatus: "SUBMITTED",
      contactEmail: "x@example.com",
      businessName: "Gulf Auto Spares",
    } as never);
    vi.mocked(repo.approveVendor).mockResolvedValue({
      id: "vendor-1",
      verificationStatus: "APPROVED",
    } as never);

    await approveVendorApplication("vendor-1", "admin-1");

    expect(repo.approveVendor).toHaveBeenCalledWith("vendor-1", "admin-1");
    await vi.waitFor(() => expect(mockSendVendorApplicationDecision).toHaveBeenCalled());
  });

  it("throws ConflictError when rejecting a non-submitted application", async () => {
    vi.mocked(repo.getVendorById).mockResolvedValue({
      id: "vendor-1",
      verificationStatus: "APPROVED",
      contactEmail: "x@example.com",
      businessName: "X",
    } as never);
    await expect(rejectVendorApplication("vendor-1", "admin-1", "reason")).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});

describe("inviteVendorStaff", () => {
  const input = { email: "new-staff@example.com", role: "VENDOR_STAFF" as const };

  it("throws ForbiddenError when the inviter lacks VENDOR_STAFF_MANAGE", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(staffMembership() as never);
    await expect(inviteVendorStaff("user-1", input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.createInvitation).not.toHaveBeenCalled();
  });

  it("throws ConflictError when the invitee is already a member", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(ownerMembership() as never);
    vi.mocked(findUserByEmail).mockResolvedValue({ id: "user-2" } as never);
    vi.mocked(repo.findMembershipByUserAndOrg).mockResolvedValue({ id: "membership-2" } as never);

    await expect(inviteVendorStaff("user-1", input)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("throws ConflictError when a pending invitation already exists for that email", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(ownerMembership() as never);
    vi.mocked(findUserByEmail).mockResolvedValue(null);
    vi.mocked(repo.findPendingInvitationByEmail).mockResolvedValue({ id: "invite-1" } as never);

    await expect(inviteVendorStaff("user-1", input)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("creates the invitation and sends an email when checks pass", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(ownerMembership() as never);
    vi.mocked(findUserByEmail).mockResolvedValue(null);
    vi.mocked(repo.findPendingInvitationByEmail).mockResolvedValue(null);
    vi.mocked(repo.createInvitation).mockResolvedValue({
      id: "invite-1",
      email: input.email,
    } as never);

    await inviteVendorStaff("user-1", input);

    expect(repo.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        email: input.email,
        role: "VENDOR_STAFF",
      }),
    );
    await vi.waitFor(() => expect(mockSendStaffInvitation).toHaveBeenCalled());
  });
});

describe("removeVendorStaffMember", () => {
  it("throws ConflictError when removing the organization's only owner", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(ownerMembership() as never);
    vi.mocked(repo.findMembershipById).mockResolvedValue({
      id: "membership-2",
      roles: [{ role: { name: "VENDOR_OWNER" } }],
    } as never);
    vi.mocked(repo.countOwnerMemberships).mockResolvedValue(1);

    await expect(removeVendorStaffMember("user-1", "membership-2")).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(repo.removeMembership).not.toHaveBeenCalled();
  });

  it("removes a non-owner staff member", async () => {
    vi.mocked(repo.findVendorMembership).mockResolvedValue(ownerMembership() as never);
    vi.mocked(repo.findMembershipById).mockResolvedValue({
      id: "membership-2",
      roles: [{ role: { name: "VENDOR_STAFF" } }],
    } as never);

    await removeVendorStaffMember("user-1", "membership-2");

    expect(repo.removeMembership).toHaveBeenCalledWith("membership-2");
  });
});

describe("acceptVendorInvitation", () => {
  const invitation = {
    id: "invite-1",
    organizationId: "org-1",
    email: "invitee@example.com",
    role: "VENDOR_STAFF",
    status: "PENDING",
    expiresAt: new Date(Date.now() + 60_000),
    organization: { id: "org-1", name: "Gulf Auto Spares" },
  };

  it("throws ConflictError when the invitation is no longer pending", async () => {
    vi.mocked(repo.findInvitationByToken).mockResolvedValue({
      ...invitation,
      status: "REVOKED",
    } as never);
    await expect(
      acceptVendorInvitation("token", "user-2", "invitee@example.com"),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("throws ConflictError when the invitation has expired", async () => {
    vi.mocked(repo.findInvitationByToken).mockResolvedValue({
      ...invitation,
      expiresAt: new Date(Date.now() - 60_000),
    } as never);
    await expect(
      acceptVendorInvitation("token", "user-2", "invitee@example.com"),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("throws ForbiddenError when the signed-in email doesn't match the invited email", async () => {
    vi.mocked(repo.findInvitationByToken).mockResolvedValue(invitation as never);
    await expect(
      acceptVendorInvitation("token", "user-2", "someone-else@example.com"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates a membership and marks the invitation accepted on success", async () => {
    vi.mocked(repo.findInvitationByToken).mockResolvedValue(invitation as never);
    vi.mocked(repo.findMembershipByUserAndOrg).mockResolvedValue(null);

    await acceptVendorInvitation("token", "user-2", "invitee@example.com");

    expect(repo.createMembershipWithRole).toHaveBeenCalledWith("user-2", "org-1", "VENDOR_STAFF");
    expect(repo.markInvitationAccepted).toHaveBeenCalledWith("invite-1");
  });

  it("does not create a duplicate membership if the user already belongs to the org", async () => {
    vi.mocked(repo.findInvitationByToken).mockResolvedValue(invitation as never);
    vi.mocked(repo.findMembershipByUserAndOrg).mockResolvedValue({ id: "existing" } as never);

    await acceptVendorInvitation("token", "user-2", "invitee@example.com");

    expect(repo.createMembershipWithRole).not.toHaveBeenCalled();
    expect(repo.markInvitationAccepted).toHaveBeenCalledWith("invite-1");
  });
});
