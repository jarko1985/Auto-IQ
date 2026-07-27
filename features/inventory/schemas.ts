import { z } from "zod";

export const inventoryChangeTypeValues = [
  "RESTOCK",
  "ADJUSTMENT",
  "DAMAGE",
  "RESERVATION",
  "RESERVATION_RELEASED",
  "ORDER_FULFILLED",
] as const;

export const stockStatusValues = ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"] as const;
export type StockStatus = (typeof stockStatusValues)[number];

export const createInventoryItemSchema = z.object({
  partId: z.string().uuid("A catalog part is required"),
  locationId: z.string().uuid("A location is required"),
  priceMinorUnits: z.number().int().min(0, "Price cannot be negative"),
  currency: z.string().length(3).optional().default("AED"),
  qtyAvailable: z.number().int().min(0).optional().default(0),
  qtyDamaged: z.number().int().min(0).optional().default(0),
  reorderThreshold: z.number().int().min(0).optional().default(0),
});
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;

export const updateInventoryItemSchema = z.object({
  priceMinorUnits: z.number().int().min(0).optional(),
  reorderThreshold: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;

export const adjustStockSchema = z
  .object({
    changeType: z.enum(["RESTOCK", "ADJUSTMENT", "DAMAGE"]),
    quantity: z
      .number()
      .int()
      .refine((v) => v !== 0, "Quantity cannot be zero"),
    reason: z.string().max(500).optional(),
  })
  .refine((data) => data.changeType === "ADJUSTMENT" || data.quantity > 0, {
    message: "Quantity must be positive for restock and damage adjustments",
    path: ["quantity"],
  });
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

export const listInventorySchema = z.object({
  locationId: z.string().uuid().optional(),
  stockStatus: z.enum(stockStatusValues).optional(),
  query: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListInventoryInput = z.infer<typeof listInventorySchema>;

export const listInventoryAuditSchema = z.object({
  locationId: z.string().uuid().optional(),
  changeType: z.enum(inventoryChangeTypeValues).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListInventoryAuditInput = z.infer<typeof listInventoryAuditSchema>;
