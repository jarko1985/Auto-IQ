import { randomUUID } from "node:crypto";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { getStorageProvider } from "@/lib/storage";
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  CreateServiceHistoryInput,
  UploadDocumentInput,
} from "./schemas";
import * as repo from "./repository";

// ── Catalog (public) ──────────────────────────────────────────────────────────

export const getMakes = repo.findAllMakes;
export const getModelsByMake = repo.findModelsByMake;
export const getTrimsByModel = repo.findTrimsByModel;
export const getEnginesByTrim = repo.findEnginesByTrim;

// ── Customer Vehicles ─────────────────────────────────────────────────────────

export async function listUserVehicles(userId: string) {
  return repo.findVehiclesByUser(userId);
}

export async function getUserVehicle(userId: string, vehicleId: string) {
  const vehicle = await repo.findVehicleById(vehicleId, userId);
  if (!vehicle) throw new NotFoundError("Vehicle");
  return vehicle;
}

export async function createUserVehicle(userId: string, data: CreateVehicleInput) {
  // If marking as default, clear any existing default first
  if (data.isDefault) {
    await repo.clearDefaultVehicle(userId);
  }
  return repo.createVehicle(userId, data);
}

export async function updateUserVehicle(
  userId: string,
  vehicleId: string,
  data: UpdateVehicleInput,
) {
  const existing = await repo.findVehicleById(vehicleId, userId);
  if (!existing) throw new NotFoundError("Vehicle");

  if (data.isDefault) {
    await repo.clearDefaultVehicle(userId);
  }

  return repo.updateVehicle(vehicleId, data);
}

export async function deleteUserVehicle(userId: string, vehicleId: string) {
  const existing = await repo.findVehicleById(vehicleId, userId);
  if (!existing) throw new NotFoundError("Vehicle");
  return repo.softDeleteVehicle(vehicleId);
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function uploadVehicleDocument(
  userId: string,
  vehicleId: string,
  fileData: Buffer,
  meta: UploadDocumentInput,
) {
  // Verify ownership
  const vehicle = await repo.findVehicleById(vehicleId, userId);
  if (!vehicle) throw new NotFoundError("Vehicle");

  const ext = meta.filename.split(".").pop() ?? "bin";
  const key = `vehicles/${vehicleId}/documents/${randomUUID()}.${ext}`;

  const storage = getStorageProvider();
  const { url } = await storage.upload(key, fileData, meta.mimeType);

  return repo.createDocument({
    customerVehicleId: vehicleId,
    userId,
    type: meta.type,
    storageKey: key,
    filename: meta.filename,
    mimeType: meta.mimeType,
    sizeBytes: meta.sizeBytes,
  });
}

export async function deleteVehicleDocument(userId: string, vehicleId: string, documentId: string) {
  const doc = await repo.findDocumentById(documentId, userId);
  if (!doc) throw new NotFoundError("Document");
  if (doc.customerVehicleId !== vehicleId) throw new ForbiddenError();

  const storage = getStorageProvider();
  await storage.delete(doc.storageKey);
  return repo.deleteDocument(documentId);
}

// ── Service History ───────────────────────────────────────────────────────────

export async function listServiceHistory(userId: string, vehicleId: string) {
  const vehicle = await repo.findVehicleById(vehicleId, userId);
  if (!vehicle) throw new NotFoundError("Vehicle");
  return repo.findServiceHistory(vehicleId);
}

export async function addServiceHistoryEntry(
  userId: string,
  vehicleId: string,
  data: CreateServiceHistoryInput,
) {
  const vehicle = await repo.findVehicleById(vehicleId, userId);
  if (!vehicle) throw new NotFoundError("Vehicle");
  return repo.createServiceHistoryEntry(vehicleId, userId, data);
}
