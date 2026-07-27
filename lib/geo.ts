/**
 * Pure Haversine distance helper (Sprint 21). Deliberately not PostGIS — see
 * CLAUDE.md's Sprint 21 notes: garage counts are small (dozens, not
 * thousands), so a full-scan Haversine sort in the service layer is trivially
 * fast, and this repo's only precedent for a raw-SQL escape hatch
 * (db:vector-index) was reached for because pgvector's HNSW index syntax has
 * no Prisma DSL equivalent at all — not true here.
 */

const EARTH_RADIUS_KM = 6371;

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two lat/lng points, in kilometers. */
export function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_KM * c;
}
