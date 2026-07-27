import { describe, it, expect } from "vitest";
import { cn, formatCurrency, slugify } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("handles conditional classes", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});

describe("formatCurrency", () => {
  it("formats AED from minor units", () => {
    const result = formatCurrency(10000);
    expect(result).toContain("100");
  });
});

describe("slugify", () => {
  it("converts to lowercase kebab-case", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("Ford F-150 (2022)")).toBe("ford-f-150-2022");
  });
});
