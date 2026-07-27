import { z } from "zod";
import { partCategoryCodeSchema } from "./taxonomy";
import { serviceTypeValues } from "@/features/vehicles/schemas";

// Sprint 21 — requiredServiceCodes now validates against the real ServiceType
// enum (the same source features/garages/schemas.ts and
// features/bookings/schemas.ts already import), not the retired
// taxonomy.ts SERVICE_CODES placeholder — so a diagnosis's suggested service
// codes can actually be matched against a garage's real GarageService rows.
const serviceCodeSchema = z.enum(serviceTypeValues);

export const createSessionSchema = z.object({
  vehicleId: z.string().uuid(),
  categoryId: z.string().uuid(),
  symptomId: z.string().uuid().optional(),
});
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const updateSessionSchema = z.object({
  symptomId: z.string().uuid().optional(),
  description: z.string().max(2000).optional(),
  obdCode: z
    .string()
    .regex(/^[A-Z][0-9]{4}$/, "Invalid OBD-II code (e.g. P0300)")
    .optional()
    .or(z.literal("")),
  currentStep: z.number().int().min(1).max(5).optional(),
  status: z
    .enum(["DRAFT", "IN_PROGRESS", "AWAITING_AI", "COMPLETE", "CANCELLED", "SAFETY_ESCALATED"])
    .optional(),
  cancelledReason: z.string().max(500).optional(),
});
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

export const submitAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        value: z.union([z.boolean(), z.string(), z.array(z.string()), z.number()]),
      }),
    )
    .min(1),
});
export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>;

// ── Locale threading (Sprint 19) ───────────────────────────────────────────────

/** The UI locale active when a diagnostic call is made — threaded from the
 * client's current `[locale]` route segment through to the analysis
 * pipeline and prompt builder, never persisted (nothing downstream needs to
 * know after the fact which locale a past result was generated in). */
export const DIAGNOSTIC_LOCALES = ["en", "ar"] as const;
export type DiagnosticLocale = (typeof DIAGNOSTIC_LOCALES)[number];

export const analyzeSessionSchema = z.object({
  locale: z.enum(DIAGNOSTIC_LOCALES).default("en"),
});
export type AnalyzeSessionInput = z.infer<typeof analyzeSessionSchema>;

export const listSessionsSchema = z.object({
  status: z
    .enum(["DRAFT", "IN_PROGRESS", "AWAITING_AI", "COMPLETE", "CANCELLED", "SAFETY_ESCALATED"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── AI diagnostic result contract (Sprint 6) ───────────────────────────────────

const UNSAFE_CONTENT_PATTERN = /<|javascript:|https?:\/\//i;

/** Rejects untrusted URLs / executable content in free-text AI output (spec §9.5). */
function noUnsafeContent(value: string): boolean {
  return !UNSAFE_CONTENT_PATTERN.test(value);
}

export const safeText = (max: number) =>
  z.string().max(max).refine(noUnsafeContent, "Contains untrusted URLs or executable content");

export const diagnosticCauseAiSchema = z.object({
  issueCode: z.string().regex(/^[A-Z][A-Z0-9_]{2,49}$/, "issueCode must be uppercase snake_case"),
  label: safeText(200),
  confidence: z.number().int().min(0).max(100),
  evidence: z.array(safeText(500)).max(10),
  missingEvidence: z.array(safeText(500)).max(10),
  suggestedChecks: z.array(safeText(500)).max(10),
  requiredServiceCodes: z.array(serviceCodeSchema).max(10),
  likelyPartCategoryCodes: z.array(partCategoryCodeSchema).max(10),
});
export type DiagnosticCauseAi = z.infer<typeof diagnosticCauseAiSchema>;

export const diagnosticResultAiSchema = z
  .object({
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    safeToDrive: z.boolean().nullable(),
    // .nullish() (not just .optional()) — OpenAI's strict json_schema mode
    // widens every non-required field's JSON Schema type to allow `null`
    // (see lib/ai/json-schema.ts), so a genuinely-absent emergencyAction is
    // returned as an explicit `null`, not an omitted key. An `.optional()`-only
    // schema rejected that null and made every OpenAI call fail validation.
    emergencyAction: safeText(1000).nullish(),
    causes: z.array(diagnosticCauseAiSchema).min(1).max(5),
    limitations: z.array(safeText(500)).max(10),
    costRange: z
      .object({
        minMinor: z.number().int().nonnegative(),
        maxMinor: z.number().int().nonnegative(),
        currency: z.literal("AED"),
      })
      .nullable(),
  })
  .superRefine((result, ctx) => {
    const confidences = result.causes.map((c) => c.confidence);
    for (let i = 1; i < confidences.length; i++) {
      const current = confidences[i] ?? 0;
      const previous = confidences[i - 1] ?? 0;
      if (current > previous) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["causes"],
          message: "causes must be sorted by descending confidence",
        });
        break;
      }
    }
    const total = confidences.reduce((sum, c) => sum + c, 0);
    if (total > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["causes"],
        message: "sum of cause confidences must not exceed 100",
      });
    }
    if (result.costRange && result.costRange.minMinor > result.costRange.maxMinor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["costRange"],
        message: "costRange.minMinor must be <= maxMinor",
      });
    }
  });
export type DiagnosticResultAi = z.infer<typeof diagnosticResultAiSchema>;

// ── Visual diagnostics (Sprint 16) ─────────────────────────────────────────────

export const ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
] as const;

/** Subset of ATTACHMENT_MIME_TYPES that can actually be passed to a vision-
 * capable AI call — video isn't, so those attachments are stored but skipped
 * for analysis rather than rejected at upload time. */
export const VISION_COMPATIBLE_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const uploadAttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(ATTACHMENT_MIME_TYPES),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(20 * 1024 * 1024), // 20 MB max, same cap as vehicle document uploads
});
export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>;

export const submitFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});
export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;

// ── AI-generated diagnostic questions (Sprint 20) ──────────────────────────────
// Replaces the Sprint 15 adaptive next-question ranking mechanism (which only
// reordered/skipped a static seeded question bank) — the AI now authors the
// question text itself, in a single batch call, constrained to the same
// structured shapes the wizard's UI already renders.

export const GENERATED_QUESTION_TYPES = ["YES_NO", "SINGLE_SELECT", "TEXT"] as const;
export type GeneratedQuestionType = (typeof GENERATED_QUESTION_TYPES)[number];

export const generatedQuestionOptionSchema = z.object({
  value: z.string().min(1).max(100),
  label: safeText(200),
});

export const generatedQuestionAiSchema = z
  .object({
    type: z.enum(GENERATED_QUESTION_TYPES),
    text: safeText(300),
    helpText: safeText(300).nullish(),
    options: z.array(generatedQuestionOptionSchema).max(6).nullish(),
    isRequired: z.boolean(),
  })
  .superRefine((q, ctx) => {
    if (q.type === "SINGLE_SELECT") {
      if (!q.options || q.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "SINGLE_SELECT questions require at least 2 options",
        });
      }
    } else if (q.options && q.options.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "options are only allowed for SINGLE_SELECT questions",
      });
    }
  });
export type GeneratedQuestionAi = z.infer<typeof generatedQuestionAiSchema>;

/** The full batch generated in one AI call right after Step 3 — never a
 * per-question round-trip. */
export const generateQuestionsAiSchema = z.object({
  questions: z.array(generatedQuestionAiSchema).min(4).max(8),
});
export type GenerateQuestionsAi = z.infer<typeof generateQuestionsAiSchema>;

export const generateQuestionsRequestSchema = z.object({
  locale: z.enum(DIAGNOSTIC_LOCALES).default("en"),
});
export type GenerateQuestionsRequestInput = z.infer<typeof generateQuestionsRequestSchema>;

// ── Dual-audience result explanations (Sprint 15) ──────────────────────────────

export const customerExplanationAiSchema = z.object({
  explanation: safeText(2000),
});
export type CustomerExplanationAi = z.infer<typeof customerExplanationAiSchema>;

export const garageSummaryAiSchema = z.object({
  summary: safeText(3000),
});
export type GarageSummaryAi = z.infer<typeof garageSummaryAiSchema>;

// ── Admin diagnostic feedback queue (Sprint 15) ────────────────────────────────

export const listFeedbackQueueSchema = z.object({
  maxRating: z.coerce.number().int().min(1).max(5).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListFeedbackQueueInput = z.infer<typeof listFeedbackQueueSchema>;
