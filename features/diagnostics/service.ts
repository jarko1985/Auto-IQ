import { randomBytes, randomUUID } from "node:crypto";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/observability/logger";
import { getAIRouter, type AIImageInput } from "@/lib/ai";
import { getStorageProvider } from "@/lib/storage";
import { db } from "@/lib/db";
import { getActivePrompt } from "@/features/ai/service";
import { retrieveApprovedKnowledge, getCitationDocuments } from "@/features/knowledge/service";
import { notifyDiagnosticComplete } from "@/features/notifications/service";
import { searchGarages } from "@/features/bookings/service";
import type { SearchGaragesInput } from "@/features/bookings/schemas";
import { deriveGarageSearchFilters, garageSearchFiltersToQueryString } from "./garage-matching";
import * as repo from "./repository";
import { evaluateSafety, isSafetyEscalated } from "./safety";
import {
  buildDiagnosticPrompt,
  buildQuestionGenerationPrompt,
  buildExplanationPrompt,
  localizeSystemPrompt,
} from "./prompt";
import {
  diagnosticResultAiSchema,
  generateQuestionsAiSchema,
  customerExplanationAiSchema,
  garageSummaryAiSchema,
  VISION_COMPATIBLE_MIME_TYPES,
} from "./schemas";
import type {
  CreateSessionInput,
  UpdateSessionInput,
  SubmitAnswersInput,
  SubmitFeedbackInput,
  ListFeedbackQueueInput,
  UploadAttachmentInput,
  DiagnosticLocale,
} from "./schemas";
import { Prisma, type SessionStatus } from "@prisma/client";

const KNOWLEDGE_RETRIEVAL_LIMIT = 6;
const MAX_VISION_IMAGES = 4;

/** Picks the Arabic variant of a piece of seeded catalog text (category/
 * symptom/question labels) when the session's active locale is Arabic and a
 * translation exists, else the English original. Not used for AI-authored
 * text — that's localized via localizeSystemPrompt instead. */
function localizedText(
  en: string,
  ar: string | null | undefined,
  locale: DiagnosticLocale,
): string {
  return locale === "ar" && ar ? ar : en;
}

/** The safety rule's emergencyAction text is deterministic and hand-authored
 * in both languages (features/diagnostics/safety.ts) — never passed through
 * AI translation, since rule #10 makes this text binding regardless of what
 * the AI call returns. */
function localizedSafetyAction(
  safety: { emergencyAction?: string; emergencyActionAr?: string } | null,
  locale: DiagnosticLocale,
): string | undefined {
  if (!safety) return undefined;
  return locale === "ar"
    ? (safety.emergencyActionAr ?? safety.emergencyAction)
    : safety.emergencyAction;
}

const DEGRADED_LIMITATIONS_MESSAGE: Record<DiagnosticLocale, string> = {
  en: "AI analysis unavailable — showing safety-rule guidance only.",
  ar: "تحليل الذكاء الاصطناعي غير متاح حاليًا — يُعرض إرشاد قواعد السلامة فقط.",
};

export async function listSessions(
  userId: string,
  opts: { status?: SessionStatus; limit: number; offset: number },
) {
  return repo.listUserSessions(userId, opts);
}

export async function startSession(userId: string, input: CreateSessionInput) {
  // Verify vehicle belongs to the user — never trust client-supplied IDs
  const { db } = await import("@/lib/db");
  const vehicle = await db.customerVehicle.findFirst({
    where: { id: input.vehicleId, userId, deletedAt: null },
  });
  if (!vehicle) throw new AppError("VEHICLE_NOT_FOUND", "Vehicle not found", 404);

  const session = await repo.createSession({
    userId,
    vehicleId: input.vehicleId,
    categoryId: input.categoryId,
    symptomId: input.symptomId,
  });

  logger.info({ sessionId: session.id, userId }, "diagnostic session created");
  return session;
}

export async function getSession(sessionId: string, userId: string) {
  const session = await repo.getSessionById(sessionId, userId);
  if (!session) throw new AppError("SESSION_NOT_FOUND", "Diagnostic session not found", 404);
  return session;
}

export async function updateSession(sessionId: string, userId: string, input: UpdateSessionInput) {
  const session = await repo.getSessionById(sessionId, userId);
  if (!session) throw new AppError("SESSION_NOT_FOUND", "Diagnostic session not found", 404);

  if (session.status === "CANCELLED" || session.status === "COMPLETE") {
    throw new AppError("SESSION_CLOSED", "This session is already closed", 409);
  }

  const updates: Parameters<typeof repo.updateSession>[2] = { ...input };

  // Apply safety rules when a symptom is set
  const symptomCode = input.symptomId
    ? (
        await (
          await import("@/lib/db")
        ).db.symptom.findUnique({ where: { id: input.symptomId }, select: { code: true } })
      )?.code
    : session.symptom?.code;

  if (symptomCode) {
    const safety = evaluateSafety(symptomCode);
    if (safety) {
      updates.severity = safety.severity;
      updates.safeToDrive = safety.safeToDrive;
      updates.emergencyAction = safety.emergencyAction;
      if (isSafetyEscalated(symptomCode)) {
        updates.status = "SAFETY_ESCALATED";
      }
    }
  }

  // Transition to IN_PROGRESS on first real step
  if (session.status === "DRAFT" && input.currentStep && input.currentStep > 1) {
    updates.status = "IN_PROGRESS";
    updates.startedAt = new Date();
  }

  // Mark as AWAITING_AI when wizard is submitted
  if (input.status === "AWAITING_AI") {
    updates.completedAt = new Date();
  }

  // Handle cancellation
  if (input.status === "CANCELLED") {
    updates.cancelledAt = new Date();
  }

  const updated = await repo.updateSession(sessionId, userId, updates);
  logger.info({ sessionId, status: updated.status }, "diagnostic session updated");
  return updated;
}

export async function submitAnswers(sessionId: string, userId: string, input: SubmitAnswersInput) {
  const session = await repo.getSessionById(sessionId, userId);
  if (!session) throw new AppError("SESSION_NOT_FOUND", "Diagnostic session not found", 404);

  if (session.status === "CANCELLED" || session.status === "COMPLETE") {
    throw new AppError("SESSION_CLOSED", "This session is already closed", 409);
  }

  // Valid questionIds are either this session's own AI-generated batch or the
  // generic static fallback bank — never another session's questions.
  const validIds = await repo.getAnswerableQuestionIds(sessionId);
  const invalid = input.answers.filter((a) => !validIds.has(a.questionId));
  if (invalid.length > 0) {
    throw new AppError(
      "INVALID_QUESTION",
      "One or more question IDs are invalid for this session",
      400,
    );
  }

  await Promise.all(
    input.answers.map((a) =>
      repo.upsertAnswer({ sessionId, questionId: a.questionId, value: a.value }),
    ),
  );

  logger.info({ sessionId, count: input.answers.length }, "diagnostic answers saved");
  return repo.getSessionAnswers(sessionId);
}

export async function getSymptomCategories() {
  return repo.getSymptomCategories();
}

// ── Visual diagnostics (Sprint 16) ──────────────────────────────────────────────

function assertSessionOpen(session: { status: SessionStatus }) {
  if (session.status === "CANCELLED" || session.status === "COMPLETE") {
    throw new ConflictError("This session is already closed");
  }
}

export async function uploadAttachment(
  sessionId: string,
  userId: string,
  fileData: Buffer,
  meta: UploadAttachmentInput,
) {
  const session = await repo.getSessionById(sessionId, userId);
  if (!session) throw new NotFoundError("Diagnostic session");
  assertSessionOpen(session);

  const ext = meta.filename.split(".").pop() ?? "bin";
  const key = `diagnostics/${sessionId}/attachments/${randomUUID()}.${ext}`;

  const storage = getStorageProvider();
  await storage.upload(key, fileData, meta.mimeType);

  const attachment = await repo.createAttachment({
    sessionId,
    storageKey: key,
    filename: meta.filename,
    mimeType: meta.mimeType,
    sizeBytes: meta.sizeBytes,
  });

  logger.info({ sessionId, attachmentId: attachment.id }, "diagnostic_attachment_uploaded");
  return attachment;
}

export async function listSessionAttachments(sessionId: string, userId: string) {
  const session = await repo.getSessionById(sessionId, userId);
  if (!session) throw new NotFoundError("Diagnostic session");
  return repo.listAttachments(sessionId);
}

export async function deleteAttachment(sessionId: string, userId: string, attachmentId: string) {
  const session = await repo.getSessionById(sessionId, userId);
  if (!session) throw new NotFoundError("Diagnostic session");
  assertSessionOpen(session);

  const attachment = await repo.findAttachmentById(attachmentId, sessionId);
  if (!attachment) throw new NotFoundError("Attachment");

  const storage = getStorageProvider();
  await storage.delete(attachment.storageKey);
  return repo.deleteAttachment(attachmentId);
}

/** Reads back an attachment's raw bytes for authenticated serving (thumbnail
 * display) — never exposes the storage key itself to the client, only this
 * route's own opaque attachment id. */
export async function getAttachmentFile(sessionId: string, userId: string, attachmentId: string) {
  const session = await repo.getSessionById(sessionId, userId);
  if (!session) throw new NotFoundError("Diagnostic session");

  const attachment = await repo.findAttachmentById(attachmentId, sessionId);
  if (!attachment) throw new NotFoundError("Attachment");

  const storage = getStorageProvider();
  const data = await storage.download(attachment.storageKey);
  return { data, mimeType: attachment.mimeType, filename: attachment.filename };
}

/** Downloads whatever attachments are vision-compatible (images only — video
 * is stored but never sent to a vision call) and base64-encodes them for the
 * AI request. Best-effort per attachment: a download failure is logged and
 * that attachment is skipped, never thrown — a bad/missing file must not
 * block text-only analysis (mirrors the graceful-degradation pattern used
 * throughout analyzeSession). */
async function loadAttachmentImages(
  sessionId: string,
  attachments: Array<{ id: string; storageKey: string; mimeType: string }>,
): Promise<AIImageInput[]> {
  const candidates = attachments
    .filter((a) => VISION_COMPATIBLE_MIME_TYPES.has(a.mimeType))
    .slice(0, MAX_VISION_IMAGES);

  if (candidates.length === 0) return [];

  const storage = getStorageProvider();
  const images: AIImageInput[] = [];
  for (const attachment of candidates) {
    try {
      const buffer = await storage.download(attachment.storageKey);
      images.push({ base64: buffer.toString("base64"), mimeType: attachment.mimeType });
    } catch (err) {
      logger.warn(
        {
          sessionId,
          attachmentId: attachment.id,
          reason: err instanceof Error ? err.message : "unknown",
        },
        "diagnostic_attachment_unavailable",
      );
    }
  }
  return images;
}

export interface GeneratedQuestionsResult {
  questions: Awaited<ReturnType<typeof repo.getSessionQuestions>>;
  source: "ai" | "static";
}

/**
 * Generates the full Step 4 question set for a session in a single batch AI
 * call, tailored to the vehicle/symptom category/free-text description
 * collected in Step 3 — replaces the Sprint 15 mechanism that only
 * reordered/skipped a static seeded bank. Idempotent: a session that already
 * has generated questions (a page reload mid-wizard, or a retried call)
 * returns the same set rather than generating twice. Falls back to a small,
 * generic, category-agnostic static question set whenever there's no active
 * "generate_questions" prompt version or the AI call itself fails — never
 * throws, so the wizard never breaks.
 */
export async function generateSessionQuestions(
  sessionId: string,
  userId: string,
  locale: DiagnosticLocale = "en",
): Promise<GeneratedQuestionsResult> {
  const session = await repo.getSessionById(sessionId, userId);
  if (!session) throw new NotFoundError("Diagnostic session");

  const existing = await repo.getSessionQuestions(sessionId);
  if (existing.length > 0) {
    return { questions: existing, source: "ai" };
  }

  const staticFallback = async (): Promise<GeneratedQuestionsResult> => {
    const fallback = await repo.getGenericFallbackQuestions();
    return {
      questions: fallback.map((q) => ({ ...q, text: localizedText(q.text, q.textAr, locale) })),
      source: "static",
    };
  };

  let systemTemplate: { content: string };
  let generationTemplate: { content: string };
  try {
    [systemTemplate, generationTemplate] = await Promise.all([
      getActivePrompt("system"),
      getActivePrompt("generate_questions"),
    ]);
  } catch (err) {
    logger.warn(
      { sessionId, reason: err instanceof Error ? err.message : "unknown" },
      "question_generation_prompt_unavailable",
    );
    return staticFallback();
  }

  const userPrompt = buildQuestionGenerationPrompt({
    template: generationTemplate.content,
    vehicle: {
      makeName: session.vehicle.makeName,
      modelName: session.vehicle.modelName,
      trimName: null,
      year: session.vehicle.year,
      engineCode: null,
    },
    categoryLabel: localizedText(session.category.label, session.category.labelAr, locale),
    symptomLabel: session.symptom
      ? localizedText(session.symptom.label, session.symptom.labelAr, locale)
      : null,
    description: session.description,
    obdCode: session.obdCode,
  });

  const systemPrompt = localizeSystemPrompt(systemTemplate.content, locale);

  const aiResult = await getAIRouter().generateWithFallback(
    { systemPrompt, userPrompt, schemaName: "generate_questions" },
    generateQuestionsAiSchema,
  );

  if (!aiResult.ok) {
    logger.warn({ sessionId, reason: aiResult.reason }, "question_generation_fallback_static");
    return staticFallback();
  }

  const created = await repo.createSessionQuestions(
    sessionId,
    aiResult.data.questions.map((q, index) => ({
      code: randomUUID(),
      type: q.type,
      text: q.text,
      helpText: q.helpText ?? null,
      options: q.type === "SINGLE_SELECT" && q.options ? q.options : undefined,
      isRequired: q.isRequired,
      sortOrder: index,
    })),
  );

  logger.info({ sessionId, count: created.length }, "diagnostic_questions_generated");
  return { questions: created, source: "ai" };
}

/**
 * Runs the end-to-end diagnostic analysis: deterministic safety rules ->
 * knowledge retrieval -> AI reasoning -> validated structured result.
 * Idempotent — a session that already has a result short-circuits without a
 * second AI call, and a unique-constraint race on create returns the winner's
 * row instead of erroring.
 */
export async function analyzeSession(
  sessionId: string,
  userId: string,
  locale: DiagnosticLocale = "en",
) {
  const session = await repo.getSessionForAnalysis(sessionId, userId);
  if (!session) throw new NotFoundError("Diagnostic session");

  if (session.result) {
    logger.info({ sessionId }, "diagnostic_analyze_idempotent_hit");
    return session.result;
  }

  // SAFETY_ESCALATED is also analyzable, not just AWAITING_AI — a safety-critical
  // symptom re-applies the rule on every update (features/diagnostics/service.ts's
  // updateSession) and overwrites the caller's requested "AWAITING_AI" status with
  // "SAFETY_ESCALATED", so a critical session can never otherwise reach AWAITING_AI.
  // Analysis must still run for these — the rule locks severity/safeToDrive below,
  // it doesn't skip AI-enriched causes/evidence/checks.
  if (session.status !== "AWAITING_AI" && session.status !== "SAFETY_ESCALATED") {
    throw new ConflictError(
      session.status === "CANCELLED" || session.status === "COMPLETE"
        ? "This session is already closed"
        : "Submit answers before requesting analysis",
    );
  }

  // Deterministic safety rules are binding — computed independently of the AI call.
  const safety = evaluateSafety(session.symptom?.code ?? "");

  const query = [session.category.label, session.symptom?.label, session.description]
    .filter((v): v is string => Boolean(v))
    .join(" — ");

  const knowledge = await retrieveApprovedKnowledge(
    query,
    {
      makeName: session.vehicle.makeName,
      modelName: session.vehicle.modelName,
      year: session.vehicle.year,
      engineCode: session.vehicle.engineVariant?.code ?? undefined,
    },
    KNOWLEDGE_RETRIEVAL_LIMIT,
  );

  // Best-effort — a missing/unreadable attachment never blocks text-only
  // analysis (rule #5: AI is probabilistic; images are enrichment, not a
  // prerequisite). No attachments at all resolves to an empty array, which
  // behaves identically to a text-only request downstream.
  const images = await loadAttachmentImages(sessionId, session.attachments ?? []);
  if (images.length > 0) {
    logger.info({ sessionId, imageCount: images.length }, "diagnostic_vision_images_attached");
  }

  const [systemVersion, reasoningVersion] = await Promise.all([
    getActivePrompt("system"),
    getActivePrompt("diagnostic_reasoning"),
  ]);

  // Explanation templates are non-critical — a missing/misconfigured ACTIVE
  // version must never fail the core diagnostic result below (rule #5: AI is
  // probabilistic, and the dual-audience explanations are an enrichment of an
  // already-computed result, not a prerequisite for it).
  const [customerExplanationVersion, garageSummaryVersion] = await Promise.all([
    getActivePrompt("customer_explanation").catch(() => null),
    getActivePrompt("garage_summary").catch(() => null),
  ]);

  const { systemPrompt, userPrompt } = buildDiagnosticPrompt({
    systemTemplate: systemVersion.content,
    reasoningTemplate: reasoningVersion.content,
    vehicle: {
      makeName: session.vehicle.makeName,
      modelName: session.vehicle.modelName,
      trimName: null,
      year: session.vehicle.year,
      engineCode: session.vehicle.engineVariant?.code ?? null,
    },
    categoryLabel: localizedText(session.category.label, session.category.labelAr, locale),
    symptomLabel: session.symptom
      ? localizedText(session.symptom.label, session.symptom.labelAr, locale)
      : null,
    description: session.description,
    obdCode: session.obdCode,
    answers: session.answers.map((a) => ({
      questionText: localizedText(a.question.text, a.question.textAr, locale),
      value: a.value,
    })),
    knowledge: knowledge.map((k) => ({
      citationId: k.citationId,
      documentTitle: k.documentTitle,
      content: k.content,
    })),
    locale,
  });

  const aiResult = await getAIRouter().generateWithFallback(
    { systemPrompt, userPrompt, schemaName: "diagnostic_result", images },
    diagnosticResultAiSchema,
  );

  const knowledgeDocumentIds = [...new Set(knowledge.map((k) => k.documentId))];

  let resultInput: repo.CreateDiagnosticResultInput;

  if (aiResult.ok) {
    const ai = aiResult.data;
    // Safety rules always win over AI output (CLAUDE.md rule #10).
    resultInput = {
      sessionId,
      severity: safety?.severity ?? ai.severity,
      safeToDrive: safety ? safety.safeToDrive : ai.safeToDrive,
      emergencyAction: localizedSafetyAction(safety, locale) ?? ai.emergencyAction ?? undefined,
      limitations: ai.limitations,
      costRangeMinMinor: ai.costRange?.minMinor ?? null,
      costRangeMaxMinor: ai.costRange?.maxMinor ?? null,
      costRangeCurrency: ai.costRange?.currency ?? null,
      isDegraded: false,
      aiProvider: aiResult.provider,
      aiModel: aiResult.model,
      promptVersionId: reasoningVersion.id,
      knowledgeDocumentIds,
      causes: ai.causes.map((c, index) => ({
        rank: index + 1,
        issueCode: c.issueCode,
        label: c.label,
        confidence: c.confidence,
        evidence: c.evidence,
        missingEvidence: c.missingEvidence,
        suggestedChecks: c.suggestedChecks,
        requiredServiceCodes: c.requiredServiceCodes,
        likelyPartCategoryCodes: c.likelyPartCategoryCodes,
      })),
    };

    // Dual-audience explanations of the final (safety-merged) result above —
    // never the raw pre-override AI values. Best-effort: either or both may
    // come back empty if their prompt version is missing or the AI call
    // fails; the structured result itself is unaffected either way.
    const resultForPrompt = {
      severity: resultInput.severity,
      safeToDrive: resultInput.safeToDrive,
      emergencyAction: resultInput.emergencyAction,
      causes: ai.causes,
      limitations: resultInput.limitations,
      costRange: ai.costRange,
    };

    // Both explanations are generated once, in the same locale as the main
    // reasoning call above — there's no separate "garage locale" to target
    // the technical summary at, since nothing today records a garage staff
    // member's locale preference independent of the analyzing customer's.
    const localizedExplanationSystemPrompt = localizeSystemPrompt(systemVersion.content, locale);

    const [explanationResult, summaryResult] = await Promise.all([
      customerExplanationVersion
        ? getAIRouter().generateWithFallback(
            {
              systemPrompt: localizedExplanationSystemPrompt,
              userPrompt: buildExplanationPrompt(
                customerExplanationVersion.content,
                resultForPrompt,
              ),
              schemaName: "customer_explanation",
            },
            customerExplanationAiSchema,
          )
        : null,
      garageSummaryVersion
        ? getAIRouter().generateWithFallback(
            {
              systemPrompt: localizedExplanationSystemPrompt,
              userPrompt: buildExplanationPrompt(garageSummaryVersion.content, resultForPrompt),
              schemaName: "garage_summary",
            },
            garageSummaryAiSchema,
          )
        : null,
    ]);

    if (explanationResult?.ok) {
      resultInput.customerExplanation = explanationResult.data.explanation;
    } else if (explanationResult) {
      logger.warn(
        { sessionId, reason: explanationResult.reason },
        "customer_explanation_unavailable",
      );
    }

    if (summaryResult?.ok) {
      resultInput.garageSummary = summaryResult.data.summary;
    } else if (summaryResult) {
      logger.warn({ sessionId, reason: summaryResult.reason }, "garage_summary_unavailable");
    }
  } else {
    // Every provider exhausted (or produced invalid output past retries) — degrade
    // to rule-based guidance only. Never guess severity/safeToDrive from nothing.
    resultInput = {
      sessionId,
      severity: safety?.severity ?? "MEDIUM",
      safeToDrive: safety ? safety.safeToDrive : null,
      emergencyAction: localizedSafetyAction(safety, locale),
      limitations: [DEGRADED_LIMITATIONS_MESSAGE[locale]],
      isDegraded: true,
      degradedReason: aiResult.reason,
      knowledgeDocumentIds,
      causes: [],
    };
  }

  let result;
  try {
    result = await repo.createDiagnosticResult(resultInput);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await repo.getResultBySession(sessionId, userId);
      if (existing) {
        logger.info({ sessionId }, "diagnostic_analyze_race_detected");
        return existing;
      }
    }
    throw err;
  }

  await repo.updateSession(sessionId, userId, {
    status: "COMPLETE",
    completedAt: new Date(),
    severity: result.severity,
    safeToDrive: result.safeToDrive,
    emergencyAction: result.emergencyAction ?? undefined,
  });

  void notifyDiagnosticComplete(
    userId,
    sessionId,
    `${session.vehicle.makeName} ${session.vehicle.modelName}`,
  );

  logger.info(
    {
      sessionId,
      locale,
      provider: aiResult.ok ? aiResult.provider : "degraded",
      attempts: aiResult.attempts.length,
      isDegraded: result.isDegraded,
    },
    "diagnostic_analysis_completed",
  );

  return result;
}

export async function getResult(sessionId: string, userId: string) {
  const result = await repo.getResultBySession(sessionId, userId);
  if (!result) throw new NotFoundError("Diagnostic result");
  return result;
}

// ── Garage recommendations (Sprint 21) ──────────────────────────────────────

const RECOMMENDED_GARAGES_LIMIT = 3;

/** Top garage matches for a completed session's diagnosis, plus the same
 * filter set as a deep-link query string — both derived from the one shared
 * pure deriveGarageSearchFilters() call so the sidebar card and the "Find a
 * Garage" CTA button can never disagree with each other. */
export async function getRecommendedGarages(
  sessionId: string,
  userId: string,
  geo?: { lat: number; lng: number },
) {
  const session = await repo.getSessionForGarageMatching(sessionId, userId);
  if (!session) throw new NotFoundError("Diagnostic session");
  if (session.status !== "COMPLETE" || !session.result) {
    throw new ConflictError("Garage recommendations are only available once results are ready.");
  }

  let makeId: string | undefined;
  if (session.vehicle.makeName) {
    const make = await db.vehicleMake.findFirst({
      where: { name: { equals: session.vehicle.makeName, mode: "insensitive" } },
      select: { id: true },
    });
    makeId = make?.id;
  }

  const filters = deriveGarageSearchFilters({
    causes: session.result.causes,
    vehicleType: session.vehicle.vehicleType,
    makeId,
  });

  // Safe cast: filters.serviceTypes/vehicleType are sourced from values
  // already validated against the same enums at AI-output/DB-write time.
  const { garages } = await searchGarages({
    serviceTypes: filters.serviceTypes.length > 0 ? filters.serviceTypes : undefined,
    vehicleType: filters.vehicleType,
    makeId: filters.makeId,
    limit: RECOMMENDED_GARAGES_LIMIT,
    offset: 0,
    sort: geo ? "distance" : "rating",
    lat: geo?.lat,
    lng: geo?.lng,
  } as SearchGaragesInput);

  return { garages, deepLinkQuery: garageSearchFiltersToQueryString(filters) };
}

export async function submitFeedback(
  sessionId: string,
  userId: string,
  input: SubmitFeedbackInput,
) {
  const session = await repo.getSessionById(sessionId, userId);
  if (!session) throw new NotFoundError("Diagnostic session");
  if (session.status !== "COMPLETE") {
    throw new ConflictError("Feedback can only be submitted once results are available");
  }

  const existing = await repo.getFeedback(sessionId);
  if (existing) {
    throw new ConflictError("Feedback has already been submitted for this session");
  }

  const feedback = await repo.createFeedback(sessionId, input);
  logger.info({ sessionId, rating: input.rating }, "diagnostic_feedback_submitted");
  return feedback;
}

// ── Admin diagnostic feedback queue (Sprint 15) ────────────────────────────────

export async function listDiagnosticFeedback(opts: ListFeedbackQueueInput) {
  return repo.listFeedbackForAdmin(opts);
}

/** Admin-only read of any session (no ownership check) — used by the
 * feedback queue's "View Session" / "Investigate" actions. */
export async function getSessionForAdmin(sessionId: string) {
  const session = await repo.getSessionForAdmin(sessionId);
  if (!session) throw new NotFoundError("Diagnostic session");
  return session;
}

// ── Share links (Sprint 21.1 — Share Results) ──────────────────────────────

const SHARE_LINK_TTL_DAYS = 30;

/** Returns the session's existing active link if one hasn't expired/been
 * revoked, otherwise mints a new one — "one active link at a time" per
 * session, so repeat clicks on "Share Results" don't spawn a pile of
 * live tokens that would each need separate revocation. */
export async function getOrCreateShareLink(sessionId: string, userId: string) {
  const session = await repo.getSessionById(sessionId, userId);
  if (!session) throw new NotFoundError("Diagnostic session");
  if (session.status !== "COMPLETE") {
    throw new ConflictError("Results can only be shared once they're available.");
  }

  const existing = await repo.findActiveShareLink(sessionId);
  if (existing) return existing;

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + SHARE_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
  const link = await repo.createShareLink({ sessionId, createdById: userId, token, expiresAt });

  logger.info({ sessionId }, "diagnostic_share_link_created");
  return link;
}

export async function revokeSessionShareLink(sessionId: string, userId: string) {
  const session = await repo.getSessionById(sessionId, userId);
  if (!session) throw new NotFoundError("Diagnostic session");

  const existing = await repo.findActiveShareLink(sessionId);
  if (!existing) throw new NotFoundError("Share link");

  await repo.revokeShareLink(existing.id);
  logger.info({ sessionId }, "diagnostic_share_link_revoked");
}

/** Public, unauthenticated read for the shared read-only page — no
 * ownership check by design (the token itself is the credential). Revoked
 * or expired links 404 the same as a token that never existed, so a
 * requester can't distinguish "wrong token" from "link was revoked". */
export async function getSharedDiagnosticResult(token: string) {
  const link = await repo.findShareLinkByToken(token);
  if (!link || link.revokedAt || link.expiresAt.getTime() < Date.now()) {
    throw new NotFoundError("Shared diagnostic report");
  }

  void repo.incrementShareLinkView(link.id).catch((err: unknown) => {
    logger.error({ err, linkId: link.id }, "Failed to record share-link view");
  });

  const { session } = link;
  const citations = session.result
    ? await getCitationDocuments(session.result.knowledgeDocumentIds)
    : [];

  return { session, citations };
}
