import { describe, it, expect, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.stubGlobal("fetch", hoisted.fetchMock);

vi.mock("@/lib/env", () => ({
  env: { GOOGLE_MAPS_API_KEY: "test-key" },
}));

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe("google geocoding provider", () => {
  beforeEach(() => {
    hoisted.fetchMock.mockReset();
  });

  it("returns found:true with lat/lng on a successful geocode", async () => {
    hoisted.fetchMock.mockResolvedValue(
      jsonResponse({
        status: "OK",
        results: [
          {
            formatted_address: "Al Quoz Industrial 3, Dubai, UAE",
            geometry: { location: { lat: 25.1412, lng: 55.2278 } },
          },
        ],
      }),
    );

    const { createGoogleGeocodingProvider } = await import("@/lib/maps/google/provider");
    const provider = createGoogleGeocodingProvider();
    const outcome = await provider.geocode({
      addressLine1: "Al Quoz Industrial 3",
      emirate: "DUBAI",
    });

    expect(outcome.found).toBe(true);
    if (outcome.found) {
      expect(outcome.result.latitude).toBe(25.1412);
      expect(outcome.result.longitude).toBe(55.2278);
    }
  });

  it("returns found:false on ZERO_RESULTS", async () => {
    hoisted.fetchMock.mockResolvedValue(jsonResponse({ status: "ZERO_RESULTS", results: [] }));

    const { createGoogleGeocodingProvider } = await import("@/lib/maps/google/provider");
    const provider = createGoogleGeocodingProvider();
    const outcome = await provider.geocode({ addressLine1: "Nowhere", emirate: "DUBAI" });

    expect(outcome.found).toBe(false);
  });

  it("throws MapsProviderError on a non-OK API status", async () => {
    hoisted.fetchMock.mockResolvedValue(jsonResponse({ status: "REQUEST_DENIED", results: [] }));

    const { createGoogleGeocodingProvider } = await import("@/lib/maps/google/provider");
    const { MapsProviderError } = await import("@/lib/maps/errors");
    const provider = createGoogleGeocodingProvider();

    await expect(
      provider.geocode({ addressLine1: "Al Quoz Industrial 3", emirate: "DUBAI" }),
    ).rejects.toBeInstanceOf(MapsProviderError);
  });

  it("throws MapsProviderError on an HTTP-level failure", async () => {
    hoisted.fetchMock.mockResolvedValue(jsonResponse({}, false, 500));

    const { createGoogleGeocodingProvider } = await import("@/lib/maps/google/provider");
    const { MapsProviderError } = await import("@/lib/maps/errors");
    const provider = createGoogleGeocodingProvider();

    await expect(
      provider.geocode({ addressLine1: "Al Quoz Industrial 3", emirate: "DUBAI" }),
    ).rejects.toBeInstanceOf(MapsProviderError);
  });
});

describe("google geocoding provider — no API key", () => {
  it("returns found:false without calling fetch when GOOGLE_MAPS_API_KEY is unset", async () => {
    vi.resetModules();
    vi.doMock("@/lib/env", () => ({ env: {} }));
    hoisted.fetchMock.mockReset();

    const { createGoogleGeocodingProvider } = await import("@/lib/maps/google/provider");
    const provider = createGoogleGeocodingProvider();
    const outcome = await provider.geocode({
      addressLine1: "Al Quoz Industrial 3",
      emirate: "DUBAI",
    });

    expect(outcome.found).toBe(false);
    expect(hoisted.fetchMock).not.toHaveBeenCalled();
  });
});
