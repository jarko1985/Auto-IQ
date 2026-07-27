/**
 * Maps a vehicle make/model to a representative stock photo for vehicle
 * picker cards. Purely illustrative of the model (like a dealership spec
 * sheet photo) — never implies it's a photo of any specific customer's
 * actual vehicle. Returns null for anything outside this small curated set;
 * callers should fall back to their existing gradient/icon placeholder.
 */
const MAKE_MODEL_IMAGES: Record<string, string> = {
  "toyota|land cruiser": "/images/vehicles/toyota-land-cruiser.jpg",
  "nissan|patrol": "/images/vehicles/nissan-patrol.jpg",
  "tesla|model x": "/images/vehicles/tesla-model-x.jpg",
};

export function getVehicleImage(vehicle: {
  makeName?: string | null;
  modelName?: string | null;
}): string | null {
  if (!vehicle.makeName || !vehicle.modelName) return null;
  const key = `${vehicle.makeName.toLowerCase()}|${vehicle.modelName.toLowerCase()}`;
  return MAKE_MODEL_IMAGES[key] ?? null;
}
