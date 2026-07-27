import { describe, it, expect } from "vitest";
import { normalizeNullSentinels } from "@/lib/ai/json-sanitize";

describe("normalizeNullSentinels", () => {
  it("converts a top-level string 'null' to actual null", () => {
    expect(normalizeNullSentinels("null")).toBeNull();
  });

  it("converts a nested field's string 'null' to actual null", () => {
    expect(normalizeNullSentinels({ costRange: "null", severity: "MEDIUM" })).toEqual({
      costRange: null,
      severity: "MEDIUM",
    });
  });

  it("recurses into arrays", () => {
    expect(normalizeNullSentinels([{ a: "null" }, { a: "keep" }])).toEqual([
      { a: null },
      { a: "keep" },
    ]);
  });

  it("leaves real null, numbers, booleans, and other strings untouched", () => {
    expect(
      normalizeNullSentinels({ a: null, b: 5, c: true, d: "hello null world" }),
    ).toEqual({ a: null, b: 5, c: true, d: "hello null world" });
  });
});
