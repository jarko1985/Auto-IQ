/** Vehicle context used to narrow a part search to compatible vehicles. All
 * fields optional — an omitted filter matches any compatibility rule. */
export interface VehicleCompatibilityFilters {
  makeName?: string;
  modelName?: string;
  year?: number;
  engineCode?: string;
}

/** A compatibility rule row. makeName/modelName are always set (a rule always
 * targets a specific make/model); yearFrom/yearTo/engineCode null means "applies
 * to all" for that dimension — same convention as features/knowledge/filters.ts. */
export interface PartCompatibilityRule {
  makeName: string;
  modelName: string;
  yearFrom: number | null;
  yearTo: number | null;
  engineCode: string | null;
}

function matchesText(filterValue: string | undefined, ruleValue: string): boolean {
  if (!filterValue) return true;
  return filterValue.trim().toLowerCase() === ruleValue.trim().toLowerCase();
}

function matchesOptionalText(filterValue: string | undefined, ruleValue: string | null): boolean {
  if (!filterValue) return true;
  if (!ruleValue) return true; // rule applies to all values of this dimension
  return filterValue.trim().toLowerCase() === ruleValue.trim().toLowerCase();
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

/** Pure matcher: does this compatibility rule apply to the given vehicle context? */
export function matchesVehicleCompatibility(
  rule: PartCompatibilityRule,
  filters: VehicleCompatibilityFilters,
): boolean {
  if (!matchesText(filters.makeName, rule.makeName)) return false;
  if (!matchesText(filters.modelName, rule.modelName)) return false;
  if (!matchesOptionalText(filters.engineCode, rule.engineCode)) return false;
  if (!matchesYear(filters.year, rule.yearFrom, rule.yearTo)) return false;
  return true;
}
