import { describe, it, expect } from "vitest";
import { matchesKnowledgeFilters, type KnowledgeApplicability } from "@/features/knowledge/filters";

function doc(overrides: Partial<KnowledgeApplicability> = {}): KnowledgeApplicability {
  return {
    documentType: "REPAIR_GUIDE",
    makeName: null,
    modelName: null,
    yearFrom: null,
    yearTo: null,
    engineCode: null,
    ...overrides,
  };
}

describe("matchesKnowledgeFilters", () => {
  it("matches a fully generic document against any filter", () => {
    expect(
      matchesKnowledgeFilters(doc(), { makeName: "Toyota", modelName: "Camry", year: 2020 }),
    ).toBe(true);
  });

  it("matches when no filters are supplied", () => {
    expect(matchesKnowledgeFilters(doc({ makeName: "Toyota" }), {})).toBe(true);
  });

  it("rejects a make mismatch", () => {
    expect(matchesKnowledgeFilters(doc({ makeName: "Nissan" }), { makeName: "Toyota" })).toBe(
      false,
    );
  });

  it("matches makes case-insensitively", () => {
    expect(matchesKnowledgeFilters(doc({ makeName: "toyota" }), { makeName: "TOYOTA" })).toBe(true);
  });

  it("rejects a model mismatch even when make matches", () => {
    expect(
      matchesKnowledgeFilters(doc({ makeName: "Toyota", modelName: "Corolla" }), {
        makeName: "Toyota",
        modelName: "Camry",
      }),
    ).toBe(false);
  });

  it("rejects a document type mismatch", () => {
    expect(
      matchesKnowledgeFilters(doc({ documentType: "SERVICE_BULLETIN" }), {
        documentType: "REPAIR_GUIDE",
      }),
    ).toBe(false);
  });

  it("matches a year within the document's applicability range", () => {
    expect(matchesKnowledgeFilters(doc({ yearFrom: 2018, yearTo: 2022 }), { year: 2020 })).toBe(
      true,
    );
  });

  it("rejects a year outside the document's applicability range", () => {
    expect(matchesKnowledgeFilters(doc({ yearFrom: 2018, yearTo: 2022 }), { year: 2025 })).toBe(
      false,
    );
  });

  it("treats an open-ended lower bound as unbounded", () => {
    expect(matchesKnowledgeFilters(doc({ yearFrom: null, yearTo: 2022 }), { year: 1995 })).toBe(
      true,
    );
  });

  it("rejects an engine code mismatch", () => {
    expect(matchesKnowledgeFilters(doc({ engineCode: "2AR-FE" }), { engineCode: "1NZ-FE" })).toBe(
      false,
    );
  });
});
