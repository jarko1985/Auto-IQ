import { describe, it, expect } from "vitest";
import {
  renderTemplate,
  buildDiagnosticPrompt,
  buildQuestionGenerationPrompt,
  formatDiagnosticResultForPrompt,
  buildExplanationPrompt,
  localizeSystemPrompt,
} from "@/features/diagnostics/prompt";

describe("renderTemplate", () => {
  it("substitutes known {{key}} placeholders", () => {
    expect(renderTemplate("Hello {{name}}!", { name: "World" })).toBe("Hello World!");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(renderTemplate("Hello {{name}}!", {})).toBe("Hello {{name}}!");
  });

  it("substitutes the same key repeated multiple times", () => {
    expect(renderTemplate("{{x}} + {{x}} = 2{{x}}", { x: "1" })).toBe("1 + 1 = 21");
  });
});

describe("buildDiagnosticPrompt", () => {
  const baseCtx = {
    systemTemplate: "System rules.",
    reasoningTemplate:
      "Vehicle: {{vehicle}}\nCategory: {{category}}\nSymptom: {{symptom}}\nDescription: {{description}}\nOBD: {{obdCode}}\nAnswers:\n{{answers}}\nKnowledge:\n{{knowledge}}",
    vehicle: {
      makeName: "Toyota",
      modelName: "Land Cruiser",
      trimName: "VXR",
      year: 2022,
      engineCode: "1GD-FTV",
    },
    categoryLabel: "Brakes",
    symptomLabel: "Grinding noise",
    description: "Grinding when braking at low speed",
    obdCode: null,
    answers: [{ questionText: "Does it happen at low speed?", value: true }],
    knowledge: [
      {
        citationId: "k1",
        documentTitle: "Brake Guide",
        content: "Grinding usually means worn pads.",
      },
    ],
  };

  it("passes the system template through unchanged", () => {
    const { systemPrompt } = buildDiagnosticPrompt(baseCtx);
    expect(systemPrompt).toBe("System rules.");
  });

  it("renders vehicle context with year/make/model/trim/engine", () => {
    const { userPrompt } = buildDiagnosticPrompt(baseCtx);
    expect(userPrompt).toContain("2022 Toyota Land Cruiser VXR (engine 1GD-FTV)");
  });

  it("formats boolean and list answer values readably", () => {
    const { userPrompt } = buildDiagnosticPrompt(baseCtx);
    expect(userPrompt).toContain("- Does it happen at low speed?: Yes");
  });

  it("cites knowledge chunks by their citationId", () => {
    const { userPrompt } = buildDiagnosticPrompt(baseCtx);
    expect(userPrompt).toContain("[k1] Brake Guide: Grinding usually means worn pads.");
  });

  it("falls back to placeholder copy when description/OBD/knowledge are absent", () => {
    const { userPrompt } = buildDiagnosticPrompt({
      ...baseCtx,
      description: null,
      obdCode: null,
      knowledge: [],
    });
    expect(userPrompt).toContain("(no free-text description provided)");
    expect(userPrompt).toContain("(none provided)");
    expect(userPrompt).toContain("(no approved knowledge documents matched this vehicle/symptom)");
  });
});

describe("localizeSystemPrompt", () => {
  it("returns the template unchanged for 'en'", () => {
    expect(localizeSystemPrompt("System rules.", "en")).toBe("System rules.");
  });

  it("appends an Arabic response directive for 'ar' without altering the original rules", () => {
    const result = localizeSystemPrompt("System rules.", "ar");
    expect(result).toContain("System rules.");
    expect(result).toContain("Modern Standard Arabic");
  });

  it("instructs fixed identifiers/enums to stay untranslated", () => {
    const result = localizeSystemPrompt("System rules.", "ar");
    expect(result).toContain("issueCode");
    expect(result).toContain("severity");
  });
});

describe("buildDiagnosticPrompt locale handling", () => {
  const baseCtx = {
    systemTemplate: "System rules.",
    reasoningTemplate: "Vehicle: {{vehicle}}",
    vehicle: {
      makeName: "Toyota",
      modelName: "Land Cruiser",
      trimName: null,
      year: 2022,
      engineCode: null,
    },
    categoryLabel: "Brakes",
    symptomLabel: null,
    description: null,
    obdCode: null,
    answers: [],
    knowledge: [],
  };

  it("defaults to an unlocalized system prompt when locale is omitted", () => {
    const { systemPrompt } = buildDiagnosticPrompt(baseCtx);
    expect(systemPrompt).toBe("System rules.");
  });

  it("localizes the system prompt when locale is 'ar'", () => {
    const { systemPrompt } = buildDiagnosticPrompt({ ...baseCtx, locale: "ar" });
    expect(systemPrompt).toContain("Modern Standard Arabic");
  });

  it("leaves the system prompt unlocalized when locale is explicitly 'en'", () => {
    const { systemPrompt } = buildDiagnosticPrompt({ ...baseCtx, locale: "en" });
    expect(systemPrompt).toBe("System rules.");
  });
});

describe("buildQuestionGenerationPrompt", () => {
  const ctx = {
    template:
      "Vehicle: {{vehicle}}\nCategory: {{category}}\nSymptom: {{symptom}}\nDescription: {{description}}\nOBD: {{obdCode}}",
    vehicle: {
      makeName: "Toyota",
      modelName: "Land Cruiser",
      trimName: null,
      year: 2022,
      engineCode: null,
    },
    categoryLabel: "Brakes",
    symptomLabel: "Grinding noise",
    description: "Grinding when braking at low speed",
    obdCode: null,
  };

  it("renders vehicle, category, and symptom context", () => {
    const prompt = buildQuestionGenerationPrompt(ctx);
    expect(prompt).toContain("Vehicle: 2022 Toyota Land Cruiser");
    expect(prompt).toContain("Category: Brakes");
    expect(prompt).toContain("Symptom: Grinding noise");
    expect(prompt).toContain("Description: Grinding when braking at low speed");
  });

  it("falls back to placeholder copy when symptom/description/OBD are absent", () => {
    const prompt = buildQuestionGenerationPrompt({
      ...ctx,
      symptomLabel: null,
      description: null,
      obdCode: null,
    });
    expect(prompt).toContain("Symptom: (not specified)");
    expect(prompt).toContain("Description: (no free-text description provided)");
    expect(prompt).toContain("OBD: (none provided)");
  });
});

describe("formatDiagnosticResultForPrompt / buildExplanationPrompt", () => {
  const result = {
    severity: "HIGH",
    safeToDrive: false,
    emergencyAction: "Pull over immediately.",
    causes: [
      {
        label: "Worn brake pads",
        confidence: 80,
        evidence: ["Grinding noise"],
        missingEvidence: ["Pad thickness reading"],
        suggestedChecks: ["Inspect pads"],
      },
    ],
    limitations: ["Not a certified inspection"],
    costRange: { minMinor: 20000, maxMinor: 40000, currency: "AED" },
  };

  it("renders severity, safe-to-drive, and emergency action", () => {
    const text = formatDiagnosticResultForPrompt(result);
    expect(text).toContain("Severity: HIGH");
    expect(text).toContain("Safe to drive: No");
    expect(text).toContain("Emergency action: Pull over immediately.");
  });

  it("renders each cause with confidence, evidence, missing evidence, and checks", () => {
    const text = formatDiagnosticResultForPrompt(result);
    expect(text).toContain("Cause 1 (80% confidence): Worn brake pads");
    expect(text).toContain("Evidence: Grinding noise");
    expect(text).toContain("Missing evidence: Pad thickness reading");
    expect(text).toContain("Suggested checks: Inspect pads");
  });

  it("renders 'Uncertain' when safeToDrive is null", () => {
    const text = formatDiagnosticResultForPrompt({ ...result, safeToDrive: null });
    expect(text).toContain("Safe to drive: Uncertain");
  });

  it("buildExplanationPrompt substitutes the formatted result into {{result}}", () => {
    const prompt = buildExplanationPrompt("Explain this:\n{{result}}", result);
    expect(prompt).toContain("Explain this:");
    expect(prompt).toContain("Severity: HIGH");
  });
});
