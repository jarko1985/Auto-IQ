import type { KnowledgeDocumentType } from "@prisma/client";

/** Vehicle/document-type context used to narrow retrieval. All fields optional — an
 * omitted filter matches any document. */
export interface KnowledgeRetrievalFilters {
  documentType?: KnowledgeDocumentType;
  makeName?: string;
  modelName?: string;
  year?: number;
  engineCode?: string;
}

/** Applicability fields carried on a document or chunk row. A null field on the
 * document side means "applies to all" for that dimension (see ADR-007). */
export interface KnowledgeApplicability {
  documentType: KnowledgeDocumentType;
  makeName: string | null;
  modelName: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  engineCode: string | null;
}

function matchesText(filterValue: string | undefined, docValue: string | null): boolean {
  if (!filterValue) return true;
  if (!docValue) return true; // generic document — applies to all
  return filterValue.trim().toLowerCase() === docValue.trim().toLowerCase();
}

function matchesYear(
  filterYear: number | undefined,
  yearFrom: number | null,
  yearTo: number | null,
): boolean {
  if (filterYear === undefined) return true;
  if (yearFrom !== null && filterYear < yearFrom) return false;
  if (yearTo !== null && filterYear > yearTo) return false;
  return true;
}

/** Pure matcher used to narrow an over-fetched similarity candidate set down to
 * documents applicable to the requesting vehicle/document-type context. */
export function matchesKnowledgeFilters(
  doc: KnowledgeApplicability,
  filters: KnowledgeRetrievalFilters,
): boolean {
  if (filters.documentType && filters.documentType !== doc.documentType) return false;
  if (!matchesText(filters.makeName, doc.makeName)) return false;
  if (!matchesText(filters.modelName, doc.modelName)) return false;
  if (!matchesText(filters.engineCode, doc.engineCode)) return false;
  if (!matchesYear(filters.year, doc.yearFrom, doc.yearTo)) return false;
  return true;
}
