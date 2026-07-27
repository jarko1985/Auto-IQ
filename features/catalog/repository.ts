import { db } from "@/lib/db";
import type { AuditAction, Prisma, PartOrigin } from "@prisma/client";
import type {
  CreatePartCategoryInput,
  CreatePartCompatibilityInput,
  CreatePartInput,
  ListAdminPartsInput,
  SearchPartsInput,
  UpdatePartInput,
} from "./schemas";

// ── Categories ────────────────────────────────────────────────────────────────

export async function listCategories() {
  return db.partCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function findCategoryByCode(code: string) {
  return db.partCategory.findUnique({ where: { code } });
}

export async function findCategoryById(id: string) {
  return db.partCategory.findUnique({ where: { id } });
}

export async function createCategory(data: CreatePartCategoryInput) {
  return db.partCategory.create({ data });
}

// ── Parts ─────────────────────────────────────────────────────────────────────

export async function findPartByManufacturerAndNumber(
  manufacturerName: string,
  partNumber: string,
) {
  return db.part.findFirst({
    where: {
      manufacturerName: { equals: manufacturerName, mode: "insensitive" },
      partNumber: { equals: partNumber, mode: "insensitive" },
      deletedAt: null,
    },
  });
}

export async function createPart(
  data: CreatePartInput & {
    approvalState: "PENDING_REVIEW" | "APPROVED";
    submittedByVendorId?: string;
    approvedById?: string;
    approvedAt?: Date;
  },
) {
  return db.part.create({
    data: {
      categoryId: data.categoryId,
      manufacturerName: data.manufacturerName,
      partNumber: data.partNumber,
      alternatePartNumbers: data.alternatePartNumbers ?? [],
      name: data.name,
      description: data.description,
      origin: data.origin,
      approvalState: data.approvalState,
      submittedByVendorId: data.submittedByVendorId,
      approvedById: data.approvedById,
      approvedAt: data.approvedAt,
    },
  });
}

export async function getPartById(id: string) {
  return db.part.findFirst({
    where: { id, deletedAt: null },
    include: {
      category: true,
      media: { orderBy: { sortOrder: "asc" } },
      compatibilities: { orderBy: { createdAt: "desc" } },
      submittedByVendor: { select: { id: true, businessName: true } },
      _count: { select: { inventoryItems: true } },
    },
  });
}

export async function updatePart(id: string, data: UpdatePartInput) {
  return db.part.update({
    where: { id },
    data: {
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.manufacturerName !== undefined && { manufacturerName: data.manufacturerName }),
      ...(data.partNumber !== undefined && { partNumber: data.partNumber }),
      ...(data.alternatePartNumbers !== undefined && {
        alternatePartNumbers: data.alternatePartNumbers,
      }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.origin !== undefined && { origin: data.origin }),
    },
  });
}

export async function approvePart(id: string, adminUserId: string) {
  return db.part.update({
    where: { id },
    data: {
      approvalState: "APPROVED",
      approvedById: adminUserId,
      approvedAt: new Date(),
      rejectionReason: null,
    },
  });
}

export async function rejectPart(id: string, adminUserId: string, reason: string) {
  return db.part.update({
    where: { id },
    data: {
      approvalState: "REJECTED",
      approvedById: adminUserId,
      approvedAt: new Date(),
      rejectionReason: reason,
    },
  });
}

export async function listAdminParts(input: ListAdminPartsInput) {
  const where: Prisma.PartWhereInput = {
    deletedAt: null,
    ...(input.approvalState && { approvalState: input.approvalState }),
    ...(input.categoryId && { categoryId: input.categoryId }),
    ...(input.origin && { origin: input.origin }),
    ...(input.query && {
      OR: [
        { name: { contains: input.query, mode: "insensitive" } },
        { manufacturerName: { contains: input.query, mode: "insensitive" } },
        { partNumber: { contains: input.query, mode: "insensitive" } },
      ],
    }),
  };

  const [parts, total] = await Promise.all([
    db.part.findMany({
      where,
      orderBy: [{ approvalState: "asc" }, { createdAt: "desc" }],
      take: input.limit,
      skip: input.offset,
      include: {
        category: true,
        submittedByVendor: { select: { id: true, businessName: true } },
        _count: { select: { inventoryItems: true, compatibilities: true } },
      },
    }),
    db.part.count({ where }),
  ]);

  return { parts, total };
}

/** Text/category candidates for the public marketplace search — narrowed by
 * vehicle compatibility in features/catalog/service.ts using the pure
 * matchesVehicleCompatibility() matcher, same pattern as knowledge retrieval. */
export async function searchApprovedParts(input: SearchPartsInput) {
  const where: Prisma.PartWhereInput = {
    deletedAt: null,
    approvalState: "APPROVED",
    ...(input.categoryId && { categoryId: input.categoryId }),
    ...(input.query && {
      OR: [
        { name: { contains: input.query, mode: "insensitive" } },
        { manufacturerName: { contains: input.query, mode: "insensitive" } },
        { partNumber: { contains: input.query, mode: "insensitive" } },
        { alternatePartNumbers: { has: input.query } },
      ],
    }),
  };

  return db.part.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      media: { orderBy: { sortOrder: "asc" }, take: 1 },
      compatibilities: true,
      inventoryItems: {
        where: { isActive: true, qtyAvailable: { gt: 0 } },
        select: { priceMinorUnits: true, currency: true, vendorId: true },
      },
    },
  });
}

// ── Media ─────────────────────────────────────────────────────────────────────

export async function createPartMedia(data: {
  partId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
}) {
  return db.partMedia.create({ data });
}

export async function findPartMediaById(id: string, partId: string) {
  return db.partMedia.findFirst({ where: { id, partId } });
}

export async function deletePartMedia(id: string) {
  return db.partMedia.delete({ where: { id } });
}

export async function countPartMedia(partId: string) {
  return db.partMedia.count({ where: { partId } });
}

// ── Compatibility ─────────────────────────────────────────────────────────────

export async function addCompatibility(partId: string, data: CreatePartCompatibilityInput) {
  return db.partCompatibility.create({
    data: {
      partId,
      makeName: data.makeName,
      modelName: data.modelName,
      yearFrom: data.yearFrom,
      yearTo: data.yearTo,
      engineCode: data.engineCode,
      trimName: data.trimName,
      notes: data.notes,
    },
  });
}

export async function findCompatibilityById(id: string, partId: string) {
  return db.partCompatibility.findFirst({ where: { id, partId } });
}

export async function removeCompatibility(id: string) {
  return db.partCompatibility.delete({ where: { id } });
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

export type { PartOrigin };
