import { z } from "zod";

export const vendorOrderStatusValues = [
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
] as const;

const uaePhoneRegex = /^\+971[0-9]{8,9}$/;

export const createVendorOrderSchema = z.object({
  items: z
    .array(
      z.object({
        inventoryItemId: z.string().uuid(),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .min(1, "At least one item is required")
    .max(20),
  deliveryAddressLine1: z.string().max(300).optional(),
  deliveryEmirate: z
    .enum(["DUBAI", "ABU_DHABI", "SHARJAH", "AJMAN", "UMM_AL_QUWAIN", "RAS_AL_KHAIMAH", "FUJAIRAH"])
    .optional(),
  contactPhone: z.string().regex(uaePhoneRegex, "Must be a valid UAE phone number").optional(),
});
export type CreateVendorOrderInput = z.infer<typeof createVendorOrderSchema>;

export const listVendorOrdersSchema = z.object({
  status: z.enum(vendorOrderStatusValues).optional(),
  query: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListVendorOrdersInput = z.infer<typeof listVendorOrdersSchema>;

export const cancelVendorOrderSchema = z.object({
  reason: z.string().min(1, "A cancellation reason is required").max(500),
});
export type CancelVendorOrderInput = z.infer<typeof cancelVendorOrderSchema>;
