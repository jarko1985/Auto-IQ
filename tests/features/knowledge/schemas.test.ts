import { describe, it, expect } from "vitest";
import {
  uploadKnowledgeDocumentSchema,
  rejectKnowledgeDocumentSchema,
  knowledgeSearchSchema,
} from "@/features/knowledge/schemas";

const baseUpload = {
  title: "P0300 Diagnostic Guide",
  sourceName: "OEM Service Manual",
  documentType: "REPAIR_GUIDE" as const,
  filename: "p0300.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
};

describe("uploadKnowledgeDocumentSchema", () => {
  it("accepts a minimal valid document", () => {
    expect(uploadKnowledgeDocumentSchema.safeParse(baseUpload).success).toBe(true);
  });

  it("accepts full metadata including a vehicle applicability range", () => {
    const result = uploadKnowledgeDocumentSchema.safeParse({
      ...baseUpload,
      makeName: "Toyota",
      modelName: "Camry",
      yearFrom: 2018,
      yearTo: 2022,
      engineCode: "2AR-FE",
      sourceUrl: "https://example.com/manual.pdf",
    });
    expect(result.success).toBe(true);
  });

  it("rejects yearFrom greater than yearTo", () => {
    const result = uploadKnowledgeDocumentSchema.safeParse({
      ...baseUpload,
      yearFrom: 2022,
      yearTo: 2018,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing title", () => {
    const { title: _title, ...rest } = baseUpload;
    expect(uploadKnowledgeDocumentSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an oversized file", () => {
    const result = uploadKnowledgeDocumentSchema.safeParse({
      ...baseUpload,
      sizeBytes: 21 * 1024 * 1024,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown document type", () => {
    const result = uploadKnowledgeDocumentSchema.safeParse({
      ...baseUpload,
      documentType: "NOT_A_TYPE",
    });
    expect(result.success).toBe(false);
  });
});

describe("rejectKnowledgeDocumentSchema", () => {
  it("requires a non-empty reason", () => {
    expect(rejectKnowledgeDocumentSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(
      rejectKnowledgeDocumentSchema.safeParse({ reason: "Outdated recall data" }).success,
    ).toBe(true);
  });
});

describe("knowledgeSearchSchema", () => {
  it("applies the default limit", () => {
    const result = knowledgeSearchSchema.safeParse({ query: "brake noise" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(5);
  });

  it("rejects an empty query", () => {
    expect(knowledgeSearchSchema.safeParse({ query: "" }).success).toBe(false);
  });

  it("caps the limit at 20", () => {
    const result = knowledgeSearchSchema.safeParse({ query: "brake noise", limit: 100 });
    expect(result.success).toBe(false);
  });
});
