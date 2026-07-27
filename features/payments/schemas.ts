import { z } from "zod";

export const payableTypeValues = ["VENDOR_ORDER", "REPAIR_ORDER"] as const;

/** Header-carried idempotency key for client-initiated mutating payment
 * requests — see ADR-013's IdempotencyKey reconciliation plan. */
export const idempotencyKeyHeaderSchema = z
  .string()
  .min(8, "Idempotency-Key header must be at least 8 characters")
  .max(200);

export const createRefundSchema = z.object({
  amountMinorUnits: z.number().int().min(1).optional(),
  reason: z.string().max(500).optional(),
});
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
