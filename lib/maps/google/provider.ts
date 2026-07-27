/**
 * Google Geocoding adapter for the GeocodingProvider interface (Sprint 21).
 *
 * Calls Google's Geocoding REST API directly via fetch — no SDK needed
 * server-side, same reasoning the Stripe adapter documents for why an SDK is
 * warranted there but not always required. GOOGLE_MAPS_API_KEY is read lazily
 * inside geocode() — construction never throws, matching every other
 * provider factory in this codebase (lib/ai, lib/payments): the factory
 * always returns successfully regardless of whether a key is configured, and
 * only the actual call fails if one is missing.
 */
import { env } from "@/lib/env";
import { logger } from "@/lib/observability/logger";
import { MapsProviderError } from "../errors";
import type { GeocodeInput, GeocodeOutcome, GeocodingProvider } from "../types";

const GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

interface GoogleGeocodeResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
  }>;
}

export function createGoogleGeocodingProvider(): GeocodingProvider {
  return {
    name: "google",

    async geocode(input: GeocodeInput): Promise<GeocodeOutcome> {
      if (!env.GOOGLE_MAPS_API_KEY) {
        logger.info({ addressLine1: input.addressLine1 }, "geocode_skipped_no_api_key");
        return { found: false };
      }

      const address = `${input.addressLine1}, ${input.emirate}, ${input.country ?? "United Arab Emirates"}`;
      const url = new URL(GEOCODE_ENDPOINT);
      url.searchParams.set("address", address);
      url.searchParams.set("key", env.GOOGLE_MAPS_API_KEY);

      let response: Response;
      try {
        response = await fetch(url.toString());
      } catch (err) {
        throw new MapsProviderError(
          err instanceof Error ? err.message : "Unknown network error",
          "google",
          true,
        );
      }

      if (!response.ok) {
        throw new MapsProviderError(
          `Google Geocoding API returned HTTP ${response.status}`,
          "google",
          response.status >= 500,
        );
      }

      const body = (await response.json()) as GoogleGeocodeResponse;

      if (body.status === "ZERO_RESULTS") return { found: false };
      if (body.status !== "OK") {
        const transient = body.status === "OVER_QUERY_LIMIT" || body.status === "UNKNOWN_ERROR";
        throw new MapsProviderError(
          `Google Geocoding API returned status ${body.status}`,
          "google",
          transient,
        );
      }

      const first = body.results[0];
      if (!first) return { found: false };

      return {
        found: true,
        result: {
          latitude: first.geometry.location.lat,
          longitude: first.geometry.location.lng,
          formattedAddress: first.formatted_address,
        },
      };
    },
  };
}
