/**
 * Some models (observed with Anthropic tool-use output) return the literal
 * string "null" instead of JSON null for a nullable field. Recursively
 * normalizes that sentinel before schema validation — generic and
 * schema-agnostic (matches lib/ai/'s existing rule of not knowing about any
 * specific caller's field names), so every structured-output schema benefits,
 * not just diagnostics.
 */
export function normalizeNullSentinels(value: unknown): unknown {
  if (value === "null") return null;
  if (Array.isArray(value)) return value.map(normalizeNullSentinels);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, normalizeNullSentinels(v)]),
    );
  }
  return value;
}
