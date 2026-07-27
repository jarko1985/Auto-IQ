/**
 * Geocoding provider abstraction — interface only (Sprint 21).
 *
 * Mirrors lib/payments/types.ts's shape and rules: no gateway SDK is imported
 * here or anywhere outside `lib/maps/{provider}/` once that adapter exists —
 * same rule Sprint 4 set for `lib/ai/providers/` and Sprint 12 set for
 * `lib/payments/`. This file stays domain-agnostic: it knows nothing about
 * GarageLocation.
 *
 * Selected via `MAPS_PROVIDER` env var, mirroring `PAYMENT_PROVIDER`.
 */

export type MapsProviderName = "google";

export interface GeocodeInput {
  addressLine1: string;
  emirate: string;
  country?: string;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Distinguishes "the provider ran fine but found nothing" from a real
 * provider failure (which throws MapsProviderError) — mirrors how
 * WebhookSignatureError is distinguished from a generic PaymentProviderError
 * rather than both being folded into one boolean.
 */
export type GeocodeOutcome = { found: true; result: GeocodeResult } | { found: false };

export interface GeocodingProvider {
  readonly name: MapsProviderName;

  geocode(input: GeocodeInput): Promise<GeocodeOutcome>;
}
