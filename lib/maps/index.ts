import { env } from "@/lib/env";
import { createGoogleGeocodingProvider } from "./google/provider";
import type { GeocodingProvider } from "./types";

let cached: GeocodingProvider | undefined;

/** Env-driven factory, mirroring lib/payments's getPaymentProvider(). Only
 * "google" is implemented — MAPS_PROVIDER is typed to match. Never throws on
 * construction, even with no API key configured — only an actual geocode()
 * call fails lazily, same graceful-degradation posture as every other
 * provider in this codebase. */
export function getGeocodingProvider(): GeocodingProvider {
  if (cached) return cached;

  switch (env.MAPS_PROVIDER) {
    case "google":
      cached = createGoogleGeocodingProvider();
      return cached;
    default:
      throw new Error(`Unsupported MAPS_PROVIDER: ${env.MAPS_PROVIDER as string}`);
  }
}
