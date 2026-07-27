/**
 * Pure translation from a completed diagnostic result to a garage-search
 * filter set (Sprint 21) — shared by getRecommendedGarages (the sidebar
 * card's top matches) and the CTA button's deep link, so the two can never
 * drift apart the way two independently-derived filter sets could.
 */
import { serviceTypeValues } from "@/features/vehicles/schemas";

const VALID_SERVICE_TYPES: ReadonlySet<string> = new Set(serviceTypeValues);

export interface GarageMatchFilters {
  serviceTypes: string[];
  vehicleType: string;
  makeId?: string;
}

export interface GarageMatchSourceCause {
  requiredServiceCodes: string[];
}

/** Union of every cause's requiredServiceCodes, deduplicated — a diagnosis
 * with multiple ranked causes may recommend several different repair
 * categories, and any garage offering at least one is a candidate.
 *
 * requiredServiceCodes is a plain String[] column, not DB-enum-typed (see
 * DiagnosticCause in schema.prisma) — a DiagnosticResult created before
 * Sprint 21 retired the old SERVICE_CODES placeholder taxonomy can still
 * contain stale codes (e.g. "BRAKES") that aren't real ServiceType values.
 * Passing one straight into a Prisma `serviceType: { in: [...] }` filter
 * throws rather than matching nothing, so invalid codes are filtered out
 * here rather than trusted as-is — the same "degrade, don't crash" posture
 * every other AI-output consumer in this codebase takes. */
export function deriveGarageSearchFilters(input: {
  causes: GarageMatchSourceCause[];
  vehicleType: string;
  makeId?: string | null;
}): GarageMatchFilters {
  const serviceTypes = Array.from(
    new Set(
      input.causes
        .flatMap((c) => c.requiredServiceCodes)
        .filter((code) => VALID_SERVICE_TYPES.has(code)),
    ),
  );

  return {
    serviceTypes,
    vehicleType: input.vehicleType,
    ...(input.makeId ? { makeId: input.makeId } : {}),
  };
}

/** Query string for the "See all matches" / "Find a Garage for This Repair"
 * deep link to /garages — never re-derived client-side (CLAUDE.md's Sprint 21
 * notes). */
export function garageSearchFiltersToQueryString(filters: GarageMatchFilters): string {
  const params = new URLSearchParams();
  if (filters.serviceTypes.length > 0) params.set("serviceTypes", filters.serviceTypes.join(","));
  if (filters.vehicleType) params.set("vehicleType", filters.vehicleType);
  if (filters.makeId) params.set("makeId", filters.makeId);
  return params.toString();
}
