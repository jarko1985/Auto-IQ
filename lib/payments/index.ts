import { env } from "@/lib/env";
import { createStripeProvider } from "./stripe/provider";
import type { PaymentProvider } from "./types";

let cached: PaymentProvider | undefined;

/** Env-driven factory, mirroring lib/ai's provider selection (ADR-013). Only
 * "stripe" is implemented this sprint — PAYMENT_PROVIDER is typed to match. */
export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;

  switch (env.PAYMENT_PROVIDER) {
    case "stripe":
      cached = createStripeProvider();
      return cached;
    default:
      throw new Error(`Unsupported PAYMENT_PROVIDER: ${env.PAYMENT_PROVIDER}`);
  }
}
