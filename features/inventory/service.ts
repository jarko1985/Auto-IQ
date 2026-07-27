import { db } from "@/lib/db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { PERMISSIONS } from "@/features/auth/permissions";
import { hasPermission } from "@/features/auth/rbac";
import { getVendorContext } from "@/features/vendors/service";
import * as vendorRepo from "@/features/vendors/repository";
import { getPartDetail } from "@/features/catalog/service";
import * as repo from "./repository";
import type {
  AdjustStockInput,
  CreateInventoryItemInput,
  ListInventoryAuditInput,
  ListInventoryInput,
  StockStatus,
  UpdateInventoryItemInput,
} from "./schemas";

async function requireInventoryContext(userId: string) {
  const context = await getVendorContext(userId);
  if (!context) throw new NotFoundError("Vendor organization");
  if (!hasPermission(context.membershipRole, PERMISSIONS.VENDOR_INVENTORY_MANAGE)) {
    throw new ForbiddenError("You do not have permission to manage inventory.");
  }
  return context;
}

export function computeStockStatus(qtyAvailable: number, reorderThreshold: number): StockStatus {
  if (qtyAvailable <= 0) return "OUT_OF_STOCK";
  if (qtyAvailable <= reorderThreshold) return "LOW_STOCK";
  return "IN_STOCK";
}

// ── Inventory items ───────────────────────────────────────────────────────────

export async function listInventory(userId: string, input: ListInventoryInput) {
  const context = await requireInventoryContext(userId);
  const items = await repo.listInventoryItems(context.vendorId, input);

  const withStatus = items.map((item) => ({
    ...item,
    stockStatus: computeStockStatus(item.qtyAvailable, item.reorderThreshold),
  }));

  const filtered = input.stockStatus
    ? withStatus.filter((i) => i.stockStatus === input.stockStatus)
    : withStatus;

  const total = filtered.length;
  const page = filtered.slice(input.offset, input.offset + input.limit);
  return { items: page, total };
}

export async function createInventoryItem(userId: string, input: CreateInventoryItemInput) {
  const context = await requireInventoryContext(userId);

  const part = await getPartDetail(input.partId);
  if (part.approvalState !== "APPROVED") {
    throw new ValidationError("Only approved catalog parts can be stocked.");
  }

  const location = await vendorRepo.findLocationById(input.locationId, context.organizationId);
  if (!location) throw new NotFoundError("Location");

  const existing = await repo.findExistingInventoryItem(
    context.vendorId,
    input.locationId,
    input.partId,
  );
  if (existing) {
    throw new ConflictError("This part already has an inventory record at this location.");
  }

  const item = await repo.createInventoryItem(context.vendorId, input);

  if (input.qtyAvailable > 0) {
    await repo.createStockAdjustmentRecord(db, {
      inventoryItemId: item.id,
      changeType: "RESTOCK",
      qtyAvailableDelta: input.qtyAvailable,
      qtyAvailableAfter: item.qtyAvailable,
      qtyReservedAfter: item.qtyReserved,
      qtyDamagedAfter: item.qtyDamaged,
      reason: "Initial stock",
      performedById: userId,
    });
  }

  await repo.createAuditLog({
    userId,
    action: "INVENTORY_ITEM_CREATED",
    resourceId: item.id,
    metadata: { partId: input.partId, locationId: input.locationId },
  });

  return item;
}

export async function getInventoryItem(userId: string, itemId: string) {
  const context = await requireInventoryContext(userId);
  const item = await repo.getInventoryItemById(itemId, context.vendorId);
  if (!item) throw new NotFoundError("Inventory item");
  return { ...item, stockStatus: computeStockStatus(item.qtyAvailable, item.reorderThreshold) };
}

export async function updateInventoryItem(
  userId: string,
  itemId: string,
  input: UpdateInventoryItemInput,
) {
  const context = await requireInventoryContext(userId);
  const item = await repo.getInventoryItemById(itemId, context.vendorId);
  if (!item) throw new NotFoundError("Inventory item");

  const updated = await repo.updateInventoryItemFields(itemId, input);

  await repo.createAuditLog({
    userId,
    action: "INVENTORY_ITEM_UPDATED",
    resourceId: itemId,
  });

  return updated;
}

export async function adjustStock(userId: string, itemId: string, input: AdjustStockInput) {
  const context = await requireInventoryContext(userId);
  const item = await repo.getInventoryItemById(itemId, context.vendorId);
  if (!item) throw new NotFoundError("Inventory item");

  const { before, after } = await repo.applyManualAdjustment(
    itemId,
    context.vendorId,
    (current) => {
      if (input.changeType === "DAMAGE") {
        return {
          qtyAvailable: current.qtyAvailable - input.quantity,
          qtyDamaged: current.qtyDamaged + input.quantity,
        };
      }
      // RESTOCK: always positive; ADJUSTMENT: signed correction
      return {
        qtyAvailable: current.qtyAvailable + input.quantity,
        qtyDamaged: current.qtyDamaged,
      };
    },
  );

  await repo.createStockAdjustmentRecord(db, {
    inventoryItemId: itemId,
    changeType: input.changeType,
    qtyAvailableDelta: after.qtyAvailable - before.qtyAvailable,
    qtyDamagedDelta: after.qtyDamaged - before.qtyDamaged,
    qtyAvailableAfter: after.qtyAvailable,
    qtyReservedAfter: after.qtyReserved,
    qtyDamagedAfter: after.qtyDamaged,
    reason: input.reason,
    performedById: userId,
  });

  await repo.createAuditLog({
    userId,
    action: "INVENTORY_STOCK_ADJUSTED",
    resourceId: itemId,
    metadata: { changeType: input.changeType, quantity: input.quantity },
  });

  return after;
}

export async function listInventoryAudit(userId: string, input: ListInventoryAuditInput) {
  const context = await requireInventoryContext(userId);
  return repo.listVendorInventoryAudit(context.vendorId, input);
}

/** Public marketplace vendor-offers list for one part — no auth required. */
export async function listOffersForPart(partId: string) {
  const offers = await repo.listOffersForPart(partId);
  return offers.map((offer) => ({
    ...offer,
    stockStatus: computeStockStatus(offer.qtyAvailable, offer.reorderThreshold),
  }));
}

export { requireInventoryContext };
