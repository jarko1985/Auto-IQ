/**
 * Maps a catalog part to a real product photo, keyed by the stable part
 * number seeded in prisma/seed.ts. Falls back to the part's category code
 * since not every view fetches partNumber. Returns null for any part outside
 * the 4 seeded catalog items — callers should fall back to their existing
 * icon placeholder in that case.
 */
const PART_NUMBER_IMAGES: Record<string, string> = {
  "BRM-9921-X": "/images/parts/brembo-brake-pads.jpg",
  "90915-YZZD4": "/images/parts/toyota-oil-filter.jpg",
  "DEN-CAF-100": "/images/parts/denso-cabin-filter.jpg",
  "NGK-7092": "/images/parts/ngk-spark-plugs.jpg",
};

const CATEGORY_CODE_IMAGES: Record<string, string> = {
  BRAKE_PADS: "/images/parts/brembo-brake-pads.jpg",
  OIL_FILTER: "/images/parts/toyota-oil-filter.jpg",
  AIR_FILTER: "/images/parts/denso-cabin-filter.jpg",
  SPARK_PLUGS: "/images/parts/ngk-spark-plugs.jpg",
};

export function getPartImage(part: {
  partNumber?: string | null;
  categoryCode?: string | null;
}): string | null {
  if (part.partNumber && PART_NUMBER_IMAGES[part.partNumber]) {
    return PART_NUMBER_IMAGES[part.partNumber] ?? null;
  }
  if (part.categoryCode && CATEGORY_CODE_IMAGES[part.categoryCode]) {
    return CATEGORY_CODE_IMAGES[part.categoryCode] ?? null;
  }
  return null;
}
