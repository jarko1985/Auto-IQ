/**
 * Google's cross-platform "universal" maps link — opens the native Google
 * Maps app if one is installed (iOS or Android), otherwise falls back to
 * Google Maps in the browser. Same URL works everywhere, so this is the one
 * link every map view in the app hands off to when a user wants turn-by-turn
 * directions in their own maps app instead of the embedded view.
 *
 * Deliberately queries the raw "lat,lng" pair, not a place name — mixing a
 * label into the query string turns this into a text search that can drift
 * off the exact pin, when the whole point is linking to the precise
 * coordinates already stored on the garage location.
 */
export function buildGoogleMapsLink(latitude: number, longitude: number): string {
  const params = new URLSearchParams({ api: "1", query: `${latitude},${longitude}` });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}
