import { db } from "@/lib/db";
import type { CreateVehicleInput, UpdateVehicleInput, CreateServiceHistoryInput } from "./schemas";
import type { DocumentType } from "@prisma/client";

// ── Catalog ───────────────────────────────────────────────────────────────────

export async function findAllMakes() {
  return db.vehicleMake.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, logoUrl: true },
  });
}

export async function findModelsByMake(makeId: string) {
  return db.vehicleModel.findMany({
    where: { makeId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

export async function findTrimsByModel(modelId: string) {
  return db.vehicleTrim.findMany({
    where: { modelId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function findEnginesByTrim(trimId: string) {
  return db.engineVariant.findMany({
    where: { trimId, isActive: true },
    orderBy: { displacement: "asc" },
    select: {
      id: true,
      code: true,
      displacement: true,
      cylinders: true,
      powerKw: true,
      fuelType: true,
      transmission: true,
      driveType: true,
    },
  });
}

// ── Customer Vehicles ─────────────────────────────────────────────────────────

export async function findVehiclesByUser(userId: string) {
  return db.customerVehicle.findMany({
    where: { userId, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      makeName: true,
      modelName: true,
      trimName: true,
      year: true,
      vehicleType: true,
      fuelType: true,
      transmission: true,
      color: true,
      plateNumber: true,
      vin: true,
      mileageKm: true,
      isDefault: true,
      createdAt: true,
    },
  });
}

export async function findVehicleById(id: string, userId: string) {
  return db.customerVehicle.findFirst({
    where: { id, userId, deletedAt: null },
    include: {
      engineVariant: {
        include: { trim: { include: { model: { include: { make: true } } } } },
      },
      documents: { orderBy: { createdAt: "desc" } },
      serviceHistory: { orderBy: { date: "desc" } },
    },
  });
}

export async function createVehicle(userId: string, data: CreateVehicleInput) {
  return db.customerVehicle.create({
    data: {
      userId,
      engineVariantId: data.engineVariantId ?? null,
      makeName: data.makeName,
      modelName: data.modelName,
      trimName: data.trimName ?? null,
      year: data.year,
      vehicleType: data.vehicleType,
      fuelType: data.fuelType,
      transmission: data.transmission,
      color: data.color ?? null,
      plateNumber: data.plateNumber || null,
      vin: data.vin || null,
      mileageKm: data.mileageKm,
      notes: data.notes ?? null,
      isDefault: data.isDefault ?? false,
    },
  });
}

export async function updateVehicle(id: string, data: UpdateVehicleInput) {
  return db.customerVehicle.update({
    where: { id },
    data: {
      ...(data.engineVariantId !== undefined && { engineVariantId: data.engineVariantId }),
      ...(data.makeName !== undefined && { makeName: data.makeName }),
      ...(data.modelName !== undefined && { modelName: data.modelName }),
      ...(data.trimName !== undefined && { trimName: data.trimName }),
      ...(data.year !== undefined && { year: data.year }),
      ...(data.vehicleType !== undefined && { vehicleType: data.vehicleType }),
      ...(data.fuelType !== undefined && { fuelType: data.fuelType }),
      ...(data.transmission !== undefined && { transmission: data.transmission }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.plateNumber !== undefined && { plateNumber: data.plateNumber || null }),
      ...(data.vin !== undefined && { vin: data.vin || null }),
      ...(data.mileageKm !== undefined && { mileageKm: data.mileageKm }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
    },
  });
}

export async function softDeleteVehicle(id: string) {
  return db.customerVehicle.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function clearDefaultVehicle(userId: string) {
  return db.customerVehicle.updateMany({
    where: { userId, isDefault: true, deletedAt: null },
    data: { isDefault: false },
  });
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function createDocument(data: {
  customerVehicleId: string;
  userId: string;
  type: DocumentType;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}) {
  return db.vehicleDocument.create({ data });
}

export async function findDocumentById(id: string, userId: string) {
  return db.vehicleDocument.findFirst({ where: { id, userId } });
}

export async function deleteDocument(id: string) {
  return db.vehicleDocument.delete({ where: { id } });
}

// ── Service History ───────────────────────────────────────────────────────────

export async function findServiceHistory(customerVehicleId: string) {
  return db.serviceHistoryEntry.findMany({
    where: { customerVehicleId },
    orderBy: { date: "desc" },
  });
}

export async function createServiceHistoryEntry(
  customerVehicleId: string,
  userId: string,
  data: CreateServiceHistoryInput,
) {
  return db.serviceHistoryEntry.create({
    data: {
      customerVehicleId,
      userId,
      serviceType: data.serviceType,
      date: new Date(data.date),
      mileageKm: data.mileageKm,
      description: data.description,
      costMinorUnits: data.costMinorUnits ?? null,
      notes: data.notes ?? null,
    },
  });
}
