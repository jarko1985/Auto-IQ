import { db } from "@/lib/db";
import type { Prisma, SessionStatus } from "@prisma/client";

export async function getSymptomCategories() {
  return db.symptomCategory.findMany({
    where: { isActive: true },
    include: {
      symptoms: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

// ── AI-generated diagnostic questions (Sprint 20) ──────────────────────────────

/** The small, category-agnostic emergency fallback bank — shown only when a
 * session's batch question-generation call fails or times out. Filters on
 * categoryId: null (not just source: STATIC) so this never picks up the old
 * per-category seeded bank Sprint 20 retired — schema/data migrations don't
 * delete pre-existing rows, so those can still exist in an older database. */
export async function getGenericFallbackQuestions() {
  return db.diagnosticQuestion.findMany({
    where: { source: "STATIC", categoryId: null, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getSessionQuestions(sessionId: string) {
  return db.diagnosticQuestion.findMany({
    where: { sessionId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export interface CreateSessionQuestionInput {
  code: string;
  type: Prisma.DiagnosticQuestionUncheckedCreateInput["type"];
  text: string;
  helpText: string | null;
  options?: Prisma.InputJsonValue;
  isRequired: boolean;
  sortOrder: number;
}

/** Persists one session's AI-generated question batch — DiagnosticAnswer has
 * a hard FK to DiagnosticQuestion, so generated questions must be real rows,
 * scoped to this session via sessionId rather than a static categoryId. */
export async function createSessionQuestions(
  sessionId: string,
  questions: CreateSessionQuestionInput[],
) {
  await db.diagnosticQuestion.createMany({
    data: questions.map((q) => ({
      ...q,
      sessionId,
      source: "AI_GENERATED",
    })),
  });
  return getSessionQuestions(sessionId);
}

/** All question ids a session may legally submit an answer against — either
 * questions generated for this exact session, or the generic static fallback
 * bank (used when generation failed for this session). */
export async function getAnswerableQuestionIds(sessionId: string) {
  const questions = await db.diagnosticQuestion.findMany({
    where: {
      isActive: true,
      OR: [{ sessionId }, { source: "STATIC" }],
    },
    select: { id: true },
  });
  return new Set(questions.map((q) => q.id));
}

export async function createSession(data: {
  userId: string;
  vehicleId: string;
  categoryId: string;
  symptomId?: string;
}) {
  return db.diagnosticSession.create({
    data: {
      ...data,
      status: "DRAFT",
      currentStep: 1,
    },
    include: sessionIncludes,
  });
}

export async function getSessionById(id: string, userId: string) {
  return db.diagnosticSession.findFirst({
    where: { id, userId },
    include: sessionIncludes,
  });
}

export async function listUserSessions(
  userId: string,
  opts: { status?: SessionStatus; limit: number; offset: number },
) {
  const where = { userId, ...(opts.status ? { status: opts.status } : {}) };
  const [sessions, total] = await Promise.all([
    db.diagnosticSession.findMany({
      where,
      include: sessionIncludes,
      orderBy: { createdAt: "desc" },
      take: opts.limit,
      skip: opts.offset,
    }),
    db.diagnosticSession.count({ where }),
  ]);
  return { sessions, total };
}

export async function updateSession(
  id: string,
  userId: string,
  data: {
    symptomId?: string;
    description?: string;
    obdCode?: string;
    currentStep?: number;
    status?: SessionStatus;
    severity?: string;
    safeToDrive?: boolean | null;
    emergencyAction?: string;
    startedAt?: Date;
    completedAt?: Date;
    cancelledAt?: Date;
    cancelledReason?: string;
  },
) {
  return db.diagnosticSession.update({
    where: { id, userId },
    data: { ...data, updatedAt: new Date() } as Prisma.DiagnosticSessionUncheckedUpdateInput,
    include: sessionIncludes,
  });
}

export async function upsertAnswer(data: {
  sessionId: string;
  questionId: string;
  value: unknown;
}) {
  return db.diagnosticAnswer.upsert({
    where: { sessionId_questionId: { sessionId: data.sessionId, questionId: data.questionId } },
    update: { value: data.value as never, updatedAt: new Date() },
    create: { sessionId: data.sessionId, questionId: data.questionId, value: data.value as never },
  });
}

export async function getSessionAnswers(sessionId: string) {
  return db.diagnosticAnswer.findMany({
    where: { sessionId },
    include: { question: true },
  });
}

export async function getSessionForAnalysis(id: string, userId: string) {
  return db.diagnosticSession.findFirst({
    where: { id, userId },
    include: {
      vehicle: { include: { engineVariant: { select: { code: true } } } },
      category: { select: { id: true, code: true, label: true, labelAr: true } },
      symptom: {
        select: { id: true, code: true, label: true, labelAr: true, isSafetyCritical: true },
      },
      answers: { include: { question: { select: { text: true, textAr: true } } } },
      result: { include: { causes: { orderBy: { rank: "asc" } } } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });
}

export interface CreateDiagnosticResultInput {
  sessionId: string;
  severity: Prisma.DiagnosticResultUncheckedCreateInput["severity"];
  safeToDrive: boolean | null;
  emergencyAction?: string;
  limitations: string[];
  costRangeMinMinor?: number | null;
  costRangeMaxMinor?: number | null;
  costRangeCurrency?: string | null;
  isDegraded: boolean;
  degradedReason?: string;
  aiProvider?: string;
  aiModel?: string;
  promptVersionId?: string;
  knowledgeDocumentIds: string[];
  customerExplanation?: string;
  garageSummary?: string;
  causes: Array<{
    rank: number;
    issueCode: string;
    label: string;
    confidence: number;
    evidence: string[];
    missingEvidence: string[];
    suggestedChecks: string[];
    requiredServiceCodes: string[];
    likelyPartCategoryCodes: string[];
  }>;
}

export async function createDiagnosticResult(input: CreateDiagnosticResultInput) {
  const { causes, ...resultData } = input;
  return db.diagnosticResult.create({
    data: {
      ...resultData,
      causes: { create: causes },
    },
    include: { causes: { orderBy: { rank: "asc" } } },
  });
}

export async function getResultBySession(sessionId: string, userId: string) {
  return db.diagnosticResult.findFirst({
    where: { sessionId, session: { userId } },
    include: { causes: { orderBy: { rank: "asc" } } },
  });
}

// ── Garage recommendations (Sprint 21) ──────────────────────────────────────

/** Just enough of a session + its result to derive garage-search filters —
 * not the full sessionIncludes shape used elsewhere. */
export async function getSessionForGarageMatching(id: string, userId: string) {
  return db.diagnosticSession.findFirst({
    where: { id, userId },
    select: {
      id: true,
      status: true,
      vehicle: { select: { vehicleType: true, makeName: true } },
      result: {
        select: {
          isDegraded: true,
          causes: { select: { requiredServiceCodes: true } },
        },
      },
    },
  });
}

// ── Visual diagnostics (Sprint 16) ─────────────────────────────────────────────

export async function createAttachment(data: {
  sessionId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}) {
  return db.diagnosticAttachment.create({ data });
}

export async function listAttachments(sessionId: string) {
  return db.diagnosticAttachment.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
}

/** Ownership is verified through the parent session, not a userId column on
 * the attachment itself — DiagnosticAttachment has none (matches the model
 * as defined in Sprint 3). */
export async function findAttachmentById(id: string, sessionId: string) {
  return db.diagnosticAttachment.findFirst({ where: { id, sessionId } });
}

export async function deleteAttachment(id: string) {
  return db.diagnosticAttachment.delete({ where: { id } });
}

export async function createFeedback(
  sessionId: string,
  data: { rating: number; comment?: string },
) {
  return db.diagnosticFeedback.create({
    data: { sessionId, rating: data.rating, comment: data.comment },
  });
}

export async function getFeedback(sessionId: string) {
  return db.diagnosticFeedback.findUnique({ where: { sessionId } });
}

// ── Admin diagnostic feedback queue (Sprint 15) ────────────────────────────────

export async function listFeedbackForAdmin(opts: {
  maxRating?: number;
  limit: number;
  offset: number;
}) {
  const where: Prisma.DiagnosticFeedbackWhereInput =
    opts.maxRating != null ? { rating: { lte: opts.maxRating } } : {};

  const [feedback, total] = await Promise.all([
    db.diagnosticFeedback.findMany({
      where,
      include: {
        session: {
          select: {
            id: true,
            vehicle: { select: { makeName: true, modelName: true, year: true } },
            category: { select: { label: true } },
            symptom: { select: { label: true } },
            result: {
              select: {
                isDegraded: true,
                aiProvider: true,
                aiModel: true,
                causes: { orderBy: { rank: "asc" }, take: 1, select: { label: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: opts.limit,
      skip: opts.offset,
    }),
    db.diagnosticFeedback.count({ where }),
  ]);

  return { feedback, total };
}

/** Admin-only session read — no userId ownership filter, unlike getSessionById. */
export async function getSessionForAdmin(id: string) {
  return db.diagnosticSession.findUnique({
    where: { id },
    include: {
      ...sessionIncludes,
      result: { include: { causes: { orderBy: { rank: "asc" } } } },
      feedback: true,
    },
  });
}

// ── Share links (Sprint 21.1 — Share Results) ──────────────────────────────

/** The one active (non-revoked, non-expired) link for a session, if any —
 * "one active link at a time" semantics, see service.ts's getOrCreateShareLink. */
export async function findActiveShareLink(sessionId: string) {
  return db.diagnosticShareLink.findFirst({
    where: { sessionId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createShareLink(data: {
  sessionId: string;
  createdById: string;
  token: string;
  expiresAt: Date;
}) {
  return db.diagnosticShareLink.create({ data });
}

export async function revokeShareLink(id: string) {
  return db.diagnosticShareLink.update({ where: { id }, data: { revokedAt: new Date() } });
}

/** Public lookup by token — no ownership filter, this is the whole point of
 * the link. Callers must still check revokedAt/expiresAt themselves (kept
 * out of the WHERE clause so a revoked/expired token can still be
 * distinguished from a token that never existed, if ever needed for
 * diagnostics — the service layer collapses both to the same 404 either way). */
export async function findShareLinkByToken(token: string) {
  return db.diagnosticShareLink.findUnique({
    where: { token },
    include: {
      session: {
        select: {
          id: true,
          status: true,
          description: true,
          obdCode: true,
          createdAt: true,
          vehicle: { select: { makeName: true, modelName: true, year: true, plateNumber: true } },
          category: { select: { label: true, labelAr: true } },
          symptom: { select: { label: true, labelAr: true } },
          result: { include: { causes: { orderBy: { rank: "asc" } } } },
        },
      },
    },
  });
}

export async function incrementShareLinkView(id: string) {
  return db.diagnosticShareLink.update({
    where: { id },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  });
}

const sessionIncludes = {
  vehicle: { select: { id: true, makeName: true, modelName: true, year: true, plateNumber: true } },
  category: { select: { id: true, code: true, label: true, labelAr: true, iconName: true } },
  symptom: { select: { id: true, code: true, label: true, labelAr: true, isSafetyCritical: true } },
  answers: { include: { question: { select: { id: true, code: true, text: true, type: true } } } },
  result: { select: { id: true, severity: true, safeToDrive: true, isDegraded: true } },
} as const;
