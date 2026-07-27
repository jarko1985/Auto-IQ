import { describe, it, expect } from "vitest";
import {
  diagnosticResultAiSchema,
  submitFeedbackSchema,
  generatedQuestionAiSchema,
  generateQuestionsAiSchema,
  customerExplanationAiSchema,
  garageSummaryAiSchema,
  uploadAttachmentSchema,
} from "@/features/diagnostics/schemas";

function validCause(overrides: Record<string, unknown> = {}) {
  return {
    issueCode: "BRAKE_PAD_WEAR",
    label: "Worn brake pads",
    confidence: 70,
    evidence: ["Grinding noise consistent with worn pads"],
    missingEvidence: [],
    suggestedChecks: ["Inspect brake pad thickness"],
    requiredServiceCodes: ["BRAKE_SERVICE"],
    likelyPartCategoryCodes: ["BRAKE_PADS"],
    ...overrides,
  };
}

function validResult(overrides: Record<string, unknown> = {}) {
  return {
    severity: "MEDIUM",
    safeToDrive: true,
    causes: [validCause()],
    limitations: [],
    costRange: { minMinor: 20000, maxMinor: 40000, currency: "AED" },
    ...overrides,
  };
}

describe("diagnosticResultAiSchema", () => {
  it("accepts a well-formed result", () => {
    expect(diagnosticResultAiSchema.safeParse(validResult()).success).toBe(true);
  });

  it("rejects causes not sorted by descending confidence", () => {
    const result = diagnosticResultAiSchema.safeParse(
      validResult({ causes: [validCause({ confidence: 40 }), validCause({ confidence: 80 })] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects confidence totals over 100", () => {
    const result = diagnosticResultAiSchema.safeParse(
      validResult({ causes: [validCause({ confidence: 70 }), validCause({ confidence: 60 })] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects untrusted URLs in free-text fields", () => {
    const result = diagnosticResultAiSchema.safeParse(
      validResult({ causes: [validCause({ evidence: ["Visit http://example.com for details"] })] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects embedded markup/script content", () => {
    const result = diagnosticResultAiSchema.safeParse(
      validResult({ causes: [validCause({ label: "<script>alert(1)</script>" })] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects unsupported service codes", () => {
    const result = diagnosticResultAiSchema.safeParse(
      validResult({ causes: [validCause({ requiredServiceCodes: ["NOT_A_REAL_SERVICE"] })] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects unsupported part-category codes", () => {
    const result = diagnosticResultAiSchema.safeParse(
      validResult({ causes: [validCause({ likelyPartCategoryCodes: ["NOT_A_REAL_PART"] })] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects malformed issue codes", () => {
    const result = diagnosticResultAiSchema.safeParse(
      validResult({ causes: [validCause({ issueCode: "not-uppercase" })] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an inverted cost range", () => {
    const result = diagnosticResultAiSchema.safeParse(
      validResult({ costRange: { minMinor: 50000, maxMinor: 10000, currency: "AED" } }),
    );
    expect(result.success).toBe(false);
  });

  it("allows a null cost range", () => {
    const result = diagnosticResultAiSchema.safeParse(validResult({ costRange: null }));
    expect(result.success).toBe(true);
  });

  it("allows a null emergencyAction (OpenAI strict mode returns null, not an omitted key, for optional fields)", () => {
    const result = diagnosticResultAiSchema.safeParse(validResult({ emergencyAction: null }));
    expect(result.success).toBe(true);
  });

  it("still allows emergencyAction to be omitted entirely", () => {
    const result = diagnosticResultAiSchema.safeParse(validResult());
    expect(result.success).toBe(true);
  });
});

describe("submitFeedbackSchema", () => {
  it("accepts a valid rating with no comment", () => {
    expect(submitFeedbackSchema.safeParse({ rating: 4 }).success).toBe(true);
  });

  it("rejects a rating outside 1-5", () => {
    expect(submitFeedbackSchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(submitFeedbackSchema.safeParse({ rating: 0 }).success).toBe(false);
  });
});

describe("generatedQuestionAiSchema", () => {
  function validYesNo(overrides: Record<string, unknown> = {}) {
    return {
      type: "YES_NO",
      text: "Does the check engine light appear?",
      helpText: null,
      options: null,
      isRequired: true,
      ...overrides,
    };
  }

  it("accepts a well-formed YES_NO question", () => {
    expect(generatedQuestionAiSchema.safeParse(validYesNo()).success).toBe(true);
  });

  it("accepts a well-formed TEXT question", () => {
    expect(
      generatedQuestionAiSchema.safeParse(validYesNo({ type: "TEXT", options: null })).success,
    ).toBe(true);
  });

  it("accepts a well-formed SINGLE_SELECT question with 2+ options", () => {
    expect(
      generatedQuestionAiSchema.safeParse(
        validYesNo({
          type: "SINGLE_SELECT",
          options: [
            { value: "low", label: "Low speed" },
            { value: "high", label: "High speed" },
          ],
        }),
      ).success,
    ).toBe(true);
  });

  it("rejects a SINGLE_SELECT question with fewer than 2 options", () => {
    const result = generatedQuestionAiSchema.safeParse(
      validYesNo({ type: "SINGLE_SELECT", options: [{ value: "low", label: "Low speed" }] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a SINGLE_SELECT question with no options at all", () => {
    const result = generatedQuestionAiSchema.safeParse(
      validYesNo({ type: "SINGLE_SELECT", options: null }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a non-SINGLE_SELECT question that includes options", () => {
    const result = generatedQuestionAiSchema.safeParse(
      validYesNo({ options: [{ value: "yes", label: "Yes" }] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an unsupported question type", () => {
    const result = generatedQuestionAiSchema.safeParse(validYesNo({ type: "NUMERIC" }));
    expect(result.success).toBe(false);
  });

  it("rejects untrusted URLs/markup in question text", () => {
    const result = generatedQuestionAiSchema.safeParse(
      validYesNo({ text: "Visit http://example.com for details" }),
    );
    expect(result.success).toBe(false);
  });
});

describe("generateQuestionsAiSchema", () => {
  function question(overrides: Record<string, unknown> = {}) {
    return {
      type: "YES_NO",
      text: "Does the check engine light appear?",
      helpText: null,
      options: null,
      isRequired: true,
      ...overrides,
    };
  }

  it("accepts a batch of 4-8 well-formed questions", () => {
    const result = generateQuestionsAiSchema.safeParse({
      questions: [question(), question(), question(), question()],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a batch with fewer than 4 questions", () => {
    const result = generateQuestionsAiSchema.safeParse({
      questions: [question(), question()],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a batch with more than 8 questions", () => {
    const result = generateQuestionsAiSchema.safeParse({
      questions: Array.from({ length: 9 }, () => question()),
    });
    expect(result.success).toBe(false);
  });
});

describe("uploadAttachmentSchema", () => {
  function validAttachment(overrides: Record<string, unknown> = {}) {
    return {
      filename: "brake-pad.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1_000_000,
      ...overrides,
    };
  }

  it("accepts a well-formed image attachment", () => {
    expect(uploadAttachmentSchema.safeParse(validAttachment()).success).toBe(true);
  });

  it("accepts a well-formed video attachment", () => {
    expect(
      uploadAttachmentSchema.safeParse(
        validAttachment({ filename: "engine-bay.mp4", mimeType: "video/mp4" }),
      ).success,
    ).toBe(true);
  });

  it("rejects an unsupported mime type", () => {
    expect(
      uploadAttachmentSchema.safeParse(validAttachment({ mimeType: "application/pdf" })).success,
    ).toBe(false);
  });

  it("rejects a file over the 20MB cap", () => {
    expect(
      uploadAttachmentSchema.safeParse(validAttachment({ sizeBytes: 21 * 1024 * 1024 })).success,
    ).toBe(false);
  });

  it("rejects a zero-byte file", () => {
    expect(uploadAttachmentSchema.safeParse(validAttachment({ sizeBytes: 0 })).success).toBe(false);
  });
});

describe("customerExplanationAiSchema / garageSummaryAiSchema", () => {
  it("accepts well-formed explanation/summary text", () => {
    expect(
      customerExplanationAiSchema.safeParse({ explanation: "Your brake pads are worn." }).success,
    ).toBe(true);
    expect(
      garageSummaryAiSchema.safeParse({ summary: "Cause: worn brake pads, 80% confidence." })
        .success,
    ).toBe(true);
  });

  it("rejects untrusted URLs/markup in explanation or summary text", () => {
    expect(
      customerExplanationAiSchema.safeParse({ explanation: "Visit http://example.com now" })
        .success,
    ).toBe(false);
    expect(garageSummaryAiSchema.safeParse({ summary: "<script>alert(1)</script>" }).success).toBe(
      false,
    );
  });
});
