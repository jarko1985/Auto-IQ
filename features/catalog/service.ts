import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { getStorageProvider } from "@/lib/storage";
import * as repo from "./repository";
import { matchesVehicleCompatibility } from "./compatibility";
import type {
  CreatePartCategoryInput,
  CreatePartCompatibilityInput,
  CreatePartInput,
  ListAdminPartsInput,
  SearchPartsInput,
  UpdatePartInput,
  UploadPartMediaInput,
} from "./schemas";

const MAX_PART_MEDIA = 6;

// ── Categories ────────────────────────────────────────────────────────────────

export async function listCategories() {
  return repo.listCategories();
}

export async function createCategory(input: CreatePartCategoryInput) {
  const existing = await repo.findCategoryByCode(input.code);
  if (existing) throw new ConflictError(`Category code "${input.code}" already exists.`);
  return repo.createCategory(input);
}

// ── Parts (admin) ─────────────────────────────────────────────────────────────

export async function listAdminParts(input: ListAdminPartsInput) {
  return repo.listAdminParts(input);
}

export async function getPartDetail(partId: string) {
  const part = await repo.getPartById(partId);
  if (!part) throw new NotFoundError("Part");
  return part;
}

/** Public marketplace detail — hides parts that aren't APPROVED yet, so a
 * pending/rejected proposal is never visible outside the admin catalog. */
export async function getPublicPartDetail(partId: string) {
  const part = await repo.getPartById(partId);
  if (!part || part.approvalState !== "APPROVED") throw new NotFoundError("Part");
  return part;
}

async function assertNoDuplicate(manufacturerName: string, partNumber: string) {
  const existing = await repo.findPartByManufacturerAndNumber(manufacturerName, partNumber);
  if (existing) {
    throw new ConflictError(
      `A part from "${manufacturerName}" with number "${partNumber}" already exists in the catalog (${existing.approvalState}).`,
    );
  }
}

/** Admin-authored parts are approved immediately — there is no conflicting-data
 * risk when the canonical source itself is the admin. */
export async function createPartByAdmin(adminUserId: string, input: CreatePartInput) {
  const category = await repo.findCategoryById(input.categoryId);
  if (!category) throw new ValidationError("Unknown part category.");
  await assertNoDuplicate(input.manufacturerName, input.partNumber);

  const part = await repo.createPart({
    ...input,
    approvalState: "APPROVED",
    approvedById: adminUserId,
    approvedAt: new Date(),
  });

  await repo.createAuditLog({ userId: adminUserId, action: "PART_UPDATED", resourceId: part.id });
  return part;
}

/** Vendor-proposed parts land PENDING_REVIEW and cannot back an InventoryItem
 * until approved — the review gate Prompt 13 calls for, applied by keeping
 * unapproved parts out of createInventoryItem() (features/inventory/service.ts)
 * rather than by blocking vendor submission outright. */
export async function proposePartByVendor(
  vendorUserId: string,
  vendorId: string,
  input: CreatePartInput,
) {
  const category = await repo.findCategoryById(input.categoryId);
  if (!category) throw new ValidationError("Unknown part category.");
  await assertNoDuplicate(input.manufacturerName, input.partNumber);

  const part = await repo.createPart({
    ...input,
    approvalState: "PENDING_REVIEW",
    submittedByVendorId: vendorId,
  });

  await repo.createAuditLog({
    userId: vendorUserId,
    action: "PART_PROPOSED",
    resourceId: part.id,
    metadata: { manufacturerName: input.manufacturerName, partNumber: input.partNumber },
  });
  return part;
}

export async function updatePart(adminUserId: string, partId: string, input: UpdatePartInput) {
  const part = await repo.getPartById(partId);
  if (!part) throw new NotFoundError("Part");

  if (input.categoryId) {
    const category = await repo.findCategoryById(input.categoryId);
    if (!category) throw new ValidationError("Unknown part category.");
  }
  if (input.manufacturerName || input.partNumber) {
    const manufacturerName = input.manufacturerName ?? part.manufacturerName;
    const partNumber = input.partNumber ?? part.partNumber;
    const existing = await repo.findPartByManufacturerAndNumber(manufacturerName, partNumber);
    if (existing && existing.id !== partId) {
      throw new ConflictError("Another part already uses this manufacturer + part number.");
    }
  }

  const updated = await repo.updatePart(partId, input);
  await repo.createAuditLog({ userId: adminUserId, action: "PART_UPDATED", resourceId: partId });
  return updated;
}

export async function approvePart(adminUserId: string, partId: string) {
  const part = await repo.getPartById(partId);
  if (!part) throw new NotFoundError("Part");
  if (part.approvalState === "APPROVED") throw new ConflictError("This part is already approved.");

  const updated = await repo.approvePart(partId, adminUserId);
  await repo.createAuditLog({ userId: adminUserId, action: "PART_APPROVED", resourceId: partId });
  return updated;
}

export async function rejectPart(adminUserId: string, partId: string, reason: string) {
  const part = await repo.getPartById(partId);
  if (!part) throw new NotFoundError("Part");
  if (part.approvalState === "REJECTED") throw new ConflictError("This part is already rejected.");

  const updated = await repo.rejectPart(partId, adminUserId, reason);
  await repo.createAuditLog({
    userId: adminUserId,
    action: "PART_REJECTED",
    resourceId: partId,
    metadata: { reason },
  });
  return updated;
}

// ── Media ─────────────────────────────────────────────────────────────────────

export async function uploadPartMedia(
  adminUserId: string,
  partId: string,
  fileData: Buffer,
  meta: UploadPartMediaInput,
) {
  const part = await repo.getPartById(partId);
  if (!part) throw new NotFoundError("Part");

  const existingCount = await repo.countPartMedia(partId);
  if (existingCount >= MAX_PART_MEDIA) {
    throw new ValidationError(`A part can have at most ${MAX_PART_MEDIA} images.`);
  }

  const ext = meta.filename.split(".").pop() ?? "bin";
  const key = `parts/${partId}/media/${randomUUID()}.${ext}`;

  const storage = getStorageProvider();
  await storage.upload(key, fileData, meta.mimeType);

  const media = await repo.createPartMedia({
    partId,
    storageKey: key,
    filename: meta.filename,
    mimeType: meta.mimeType,
    sizeBytes: meta.sizeBytes,
    sortOrder: existingCount,
  });

  await repo.createAuditLog({ userId: adminUserId, action: "PART_UPDATED", resourceId: partId });
  return media;
}

export async function deletePartMedia(adminUserId: string, partId: string, mediaId: string) {
  const media = await repo.findPartMediaById(mediaId, partId);
  if (!media) throw new NotFoundError("Part media");

  const storage = getStorageProvider();
  await storage.delete(media.storageKey);
  await repo.deletePartMedia(mediaId);

  await repo.createAuditLog({ userId: adminUserId, action: "PART_UPDATED", resourceId: partId });
}

// ── Compatibility ─────────────────────────────────────────────────────────────

export async function addCompatibility(
  adminUserId: string,
  partId: string,
  input: CreatePartCompatibilityInput,
) {
  const part = await repo.getPartById(partId);
  if (!part) throw new NotFoundError("Part");

  const rule = await repo.addCompatibility(partId, input);
  await repo.createAuditLog({
    userId: adminUserId,
    action: "PART_COMPATIBILITY_ADDED",
    resourceId: partId,
    metadata: { makeName: input.makeName, modelName: input.modelName },
  });
  return rule;
}

export async function removeCompatibility(adminUserId: string, partId: string, ruleId: string) {
  const rule = await repo.findCompatibilityById(ruleId, partId);
  if (!rule) throw new NotFoundError("Compatibility rule");

  await repo.removeCompatibility(ruleId);
  await repo.createAuditLog({
    userId: adminUserId,
    action: "PART_COMPATIBILITY_REMOVED",
    resourceId: partId,
  });
}

/** Vendor-facing part lookup for "Add Inventory Item" — unlike searchParts()
 * (public marketplace), this must surface APPROVED parts with zero existing
 * InventoryItem rows too, since finding one to stock for the first time is
 * exactly the point. */
export async function searchPartsForVendor(query?: string, categoryId?: string) {
  const candidates = await repo.searchApprovedParts({
    query,
    categoryId,
    limit: 20,
    offset: 0,
  });
  return candidates.map((part) => ({
    id: part.id,
    name: part.name,
    manufacturerName: part.manufacturerName,
    partNumber: part.partNumber,
    categoryName: part.category.name,
  }));
}

// ── Marketplace search (public) ────────────────────────────────────────────────

export interface PartSearchResult {
  id: string;
  name: string;
  manufacturerName: string;
  partNumber: string;
  origin: string;
  categoryName: string;
  imageUrl: string | null;
  minPriceMinorUnits: number | null;
  maxPriceMinorUnits: number | null;
  currency: string;
  vendorCount: number;
}

/** Over-fetches approved parts by text/category then narrows by vehicle
 * compatibility with the pure matchesVehicleCompatibility() matcher — same
 * two-step shape as features/knowledge's retrieveApprovedKnowledge(). */
export async function searchParts(input: SearchPartsInput): Promise<PartSearchResult[]> {
  const candidates = await repo.searchApprovedParts(input);

  const filtered = candidates.filter((part) => {
    if (part.inventoryItems.length === 0) return false; // nothing sellable
    if (!input.makeName && !input.modelName && !input.year && !input.engineCode) return true;
    if (part.compatibilities.length === 0) return true; // no rules recorded = unrestricted
    return part.compatibilities.some((rule) =>
      matchesVehicleCompatibility(rule, {
        makeName: input.makeName,
        modelName: input.modelName,
        year: input.year,
        engineCode: input.engineCode ?? undefined,
      }),
    );
  });

  return filtered.slice(input.offset, input.offset + input.limit).map((part) => {
    const prices = part.inventoryItems.map((i) => i.priceMinorUnits);
    const vendorIds = new Set(part.inventoryItems.map((i) => i.vendorId));
    return {
      id: part.id,
      name: part.name,
      manufacturerName: part.manufacturerName,
      partNumber: part.partNumber,
      origin: part.origin,
      categoryName: part.category.name,
      imageUrl: part.media[0]?.storageKey ?? null,
      minPriceMinorUnits: prices.length ? Math.min(...prices) : null,
      maxPriceMinorUnits: prices.length ? Math.max(...prices) : null,
      currency: part.inventoryItems[0]?.currency ?? "AED",
      vendorCount: vendorIds.size,
    };
  });
}
