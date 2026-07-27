import type { ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

type JsonSchemaNode = Record<string, unknown>;

function widenToNullable(propertySchema: JsonSchemaNode): void {
  if (Array.isArray(propertySchema.type)) {
    if (!propertySchema.type.includes("null")) propertySchema.type.push("null");
  } else if (typeof propertySchema.type === "string") {
    propertySchema.type = [propertySchema.type, "null"];
  } else if (Array.isArray(propertySchema.anyOf)) {
    propertySchema.anyOf.push({ type: "null" });
  }
  // Property has no `type`/`anyOf` we can widen (e.g. a bare `$ref` or `const`)
  // — leave it as-is rather than guess.
}

/**
 * OpenAI's strict structured-output mode requires every key in an object's
 * `properties` to also appear in `required` — Zod's `.optional()` fields
 * don't satisfy that by default (zod-to-json-schema just omits them from
 * `required`, which OpenAI's API rejects outright before generating anything).
 * OpenAI's own docs recommend the fix: keep the key required, but widen its
 * type to also allow `null` so the model can express "not provided".
 */
function applyOpenAIStrictRequired(node: unknown): void {
  if (typeof node !== "object" || node === null) return;
  const obj = node as JsonSchemaNode;

  if (obj.type === "object" && obj.properties && typeof obj.properties === "object") {
    const properties = obj.properties as Record<string, JsonSchemaNode>;
    const alreadyRequired = new Set(Array.isArray(obj.required) ? (obj.required as string[]) : []);
    const allKeys = Object.keys(properties);

    for (const key of allKeys) {
      const property = properties[key];
      if (!alreadyRequired.has(key) && property) {
        widenToNullable(property);
      }
    }
    obj.required = allKeys;
  }

  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      value.forEach(applyOpenAIStrictRequired);
    } else {
      applyOpenAIStrictRequired(value);
    }
  }
}

/** Converts a Zod schema to a flat JSON Schema object usable as OpenAI's strict json_schema or Anthropic's tool input_schema. */
export function toJsonSchema(schema: ZodType<unknown>): Record<string, unknown> {
  const jsonSchema = zodToJsonSchema(schema, {
    $refStrategy: "none",
    target: "openApi3",
  }) as Record<string, unknown>;
  applyOpenAIStrictRequired(jsonSchema);
  return jsonSchema;
}
