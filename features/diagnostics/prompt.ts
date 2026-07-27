import type { DiagnosticLocale } from "./schemas";

/** Minimal {{key}} substitution for stored prompt content — no templating
 * library exists anywhere in the repo, so this stays intentionally small. */
export function renderTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = vars[key];
    return value !== undefined ? value : match;
  });
}

/**
 * Appends a locale directive to a system prompt at call time — deliberately
 * NOT a separate Arabic PromptVersion. Investigated first (Sprint 19,
 * Prompt 25): the model already reasons natively in Arabic given a plain
 * instruction, so a second stored template per language would only add a
 * drift risk (the safety-critical "must NOT" rules in the system prompt
 * would exist in two copies that could silently diverge) for no quality
 * gain. Only the natural-language output fields are localized — fixed
 * identifiers (issueCode, requiredServiceCodes, likelyPartCategoryCodes,
 * severity, and the JSON keys themselves) must stay exactly as instructed
 * regardless of locale, since those are matched against static enums/taxonomy
 * codes downstream, not read by a human.
 */
export function localizeSystemPrompt(systemTemplate: string, locale: DiagnosticLocale): string {
  if (locale !== "ar") return systemTemplate;
  return `${systemTemplate}

Respond in Modern Standard Arabic (اللغة العربية الفصحى) for every natural-language field in your output — labels, evidence, missing evidence, suggested checks, limitations, emergency action text, explanations, and summaries. Do not translate fixed identifier or enum values (issueCode, requiredServiceCodes, likelyPartCategoryCodes, severity, currency codes, or any JSON key) — return those exactly as instructed, in their original form.`;
}

export interface DiagnosticPromptVehicle {
  makeName: string;
  modelName: string;
  trimName: string | null;
  year: number;
  engineCode: string | null;
}

export interface DiagnosticPromptAnswer {
  questionText: string;
  value: unknown;
}

export interface DiagnosticPromptKnowledgeChunk {
  citationId: string;
  documentTitle: string;
  content: string;
}

export interface DiagnosticPromptContext {
  systemTemplate: string;
  reasoningTemplate: string;
  vehicle: DiagnosticPromptVehicle;
  categoryLabel: string;
  symptomLabel: string | null;
  description: string | null;
  obdCode: string | null;
  answers: DiagnosticPromptAnswer[];
  knowledge: DiagnosticPromptKnowledgeChunk[];
  /** Defaults to "en" — callers building an English-only prompt (existing
   * tests, any future non-diagnostic caller) don't need to pass this. */
  locale?: DiagnosticLocale;
}

function formatAnswerValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatVehicle(vehicle: DiagnosticPromptVehicle): string {
  const parts = [String(vehicle.year), vehicle.makeName, vehicle.modelName];
  if (vehicle.trimName) parts.push(vehicle.trimName);
  let line = parts.join(" ");
  if (vehicle.engineCode) line += ` (engine ${vehicle.engineCode})`;
  return line;
}

/** Builds the system + user prompt for the diagnostic reasoning AI call from
 * versioned template content plus session/vehicle/knowledge context. */
export function buildDiagnosticPrompt(ctx: DiagnosticPromptContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = localizeSystemPrompt(
    renderTemplate(ctx.systemTemplate, {}),
    ctx.locale ?? "en",
  );

  const answersBlock =
    ctx.answers.map((a) => `- ${a.questionText}: ${formatAnswerValue(a.value)}`).join("\n") ||
    "(no additional answers provided)";

  const knowledgeBlock =
    ctx.knowledge.map((k) => `[${k.citationId}] ${k.documentTitle}: ${k.content}`).join("\n\n") ||
    "(no approved knowledge documents matched this vehicle/symptom)";

  const userPrompt = renderTemplate(ctx.reasoningTemplate, {
    vehicle: formatVehicle(ctx.vehicle),
    category: ctx.categoryLabel,
    symptom: ctx.symptomLabel ?? "(not specified)",
    description: ctx.description ?? "(no free-text description provided)",
    obdCode: ctx.obdCode ?? "(none provided)",
    answers: answersBlock,
    knowledge: knowledgeBlock,
  });

  return { systemPrompt, userPrompt };
}

// ── AI-generated diagnostic questions (Sprint 20) ──────────────────────────────

export interface QuestionGenerationPromptContext {
  template: string;
  vehicle: DiagnosticPromptVehicle;
  categoryLabel: string;
  symptomLabel: string | null;
  description: string | null;
  obdCode: string | null;
}

/** Builds the user prompt for the batch question-generation call — the AI
 * authors the full Step 4 question set for a session in one call, tailored to
 * the vehicle/category/symptom/free-text description, replacing the Sprint 15
 * mechanism that only reordered a static seeded bank. */
export function buildQuestionGenerationPrompt(ctx: QuestionGenerationPromptContext): string {
  return renderTemplate(ctx.template, {
    vehicle: formatVehicle(ctx.vehicle),
    category: ctx.categoryLabel,
    symptom: ctx.symptomLabel ?? "(not specified)",
    description: ctx.description ?? "(no free-text description provided)",
    obdCode: ctx.obdCode ?? "(none provided)",
  });
}

// ── Dual-audience result explanations (Sprint 15) ──────────────────────────────

export interface DiagnosticResultPromptCause {
  label: string;
  confidence: number;
  evidence: string[];
  missingEvidence: string[];
  suggestedChecks: string[];
}

export interface DiagnosticResultPromptInput {
  severity: string;
  safeToDrive: boolean | null;
  emergencyAction?: string | null;
  causes: DiagnosticResultPromptCause[];
  limitations: string[];
  costRange: { minMinor: number; maxMinor: number; currency: string } | null;
}

/** Renders the final (safety-merged) diagnostic result as plain text for the
 * explanation prompts below — never the raw pre-safety-override AI output. */
export function formatDiagnosticResultForPrompt(result: DiagnosticResultPromptInput): string {
  const lines: string[] = [];
  lines.push(`Severity: ${result.severity}`);
  lines.push(
    `Safe to drive: ${result.safeToDrive === null ? "Uncertain" : result.safeToDrive ? "Yes" : "No"}`,
  );
  if (result.emergencyAction) lines.push(`Emergency action: ${result.emergencyAction}`);

  result.causes.forEach((cause, index) => {
    lines.push(`Cause ${index + 1} (${cause.confidence}% confidence): ${cause.label}`);
    if (cause.evidence.length) lines.push(`  Evidence: ${cause.evidence.join("; ")}`);
    if (cause.missingEvidence.length)
      lines.push(`  Missing evidence: ${cause.missingEvidence.join("; ")}`);
    if (cause.suggestedChecks.length)
      lines.push(`  Suggested checks: ${cause.suggestedChecks.join("; ")}`);
  });

  if (result.costRange) {
    lines.push(
      `Estimated cost: ${result.costRange.minMinor}-${result.costRange.maxMinor} minor units (${result.costRange.currency})`,
    );
  }
  if (result.limitations.length) lines.push(`Limitations: ${result.limitations.join("; ")}`);

  return lines.join("\n");
}

/** Builds the user prompt for a customer_explanation / garage_summary call —
 * both templates take the same rendered {{result}} block. */
export function buildExplanationPrompt(
  template: string,
  result: DiagnosticResultPromptInput,
): string {
  return renderTemplate(template, { result: formatDiagnosticResultForPrompt(result) });
}
