import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const mockGenerate = vi.fn();
const mockRetrieve = vi.fn();
const mockDownload = vi.fn();

vi.mock("@/features/diagnostics/repository", () => ({
  getSessionForAnalysis: vi.fn(),
  createDiagnosticResult: vi.fn(),
  getResultBySession: vi.fn(),
  updateSession: vi.fn(),
  getSessionById: vi.fn(),
  createFeedback: vi.fn(),
  getFeedback: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  getStorageProvider: () => ({ download: mockDownload }),
}));

vi.mock("@/features/knowledge/service", () => ({
  retrieveApprovedKnowledge: (...args: unknown[]) => mockRetrieve(...args),
}));

vi.mock("@/features/ai/service", () => ({
  getActivePrompt: vi.fn(),
}));

vi.mock("@/lib/ai", () => ({
  getAIRouter: () => ({ generateWithFallback: mockGenerate }),
}));

import * as repo from "@/features/diagnostics/repository";
import { getActivePrompt } from "@/features/ai/service";
import { analyzeSession, getResult, submitFeedback } from "@/features/diagnostics/service";

function baseSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-1",
    status: "AWAITING_AI",
    description: "Grinding noise when braking",
    obdCode: null,
    symptom: {
      id: "sym-1",
      code: "BRAKE_PAD_WEAR",
      label: "Brake pad wear noise",
      isSafetyCritical: false,
    },
    category: { id: "cat-1", code: "BRAKES", label: "Brakes" },
    vehicle: {
      makeName: "Toyota",
      modelName: "Land Cruiser",
      year: 2022,
      engineVariant: { code: "1GD-FTV" },
    },
    answers: [{ value: "Yes", question: { text: "Does it happen at low speed?" } }],
    result: null,
    ...overrides,
  };
}

function validAiResult(overrides: Record<string, unknown> = {}) {
  return {
    severity: "MEDIUM",
    safeToDrive: true,
    causes: [
      {
        issueCode: "BRAKE_PAD_WEAR",
        label: "Worn brake pads",
        confidence: 80,
        evidence: ["Grinding noise consistent with metal-on-metal contact [k1]"],
        missingEvidence: [],
        suggestedChecks: ["Inspect brake pad thickness"],
        requiredServiceCodes: ["BRAKE_SERVICE"],
        likelyPartCategoryCodes: ["BRAKE_PADS"],
      },
    ],
    limitations: [],
    costRange: { minMinor: 20000, maxMinor: 40000, currency: "AED" },
    ...overrides,
  };
}

const knowledgeChunks = [
  {
    citationId: "k1",
    documentId: "doc-1",
    documentTitle: "Brake Guide",
    sourceName: "OEM",
    sourceUrl: null,
    documentType: "REPAIR_GUIDE",
    chunkIndex: 0,
    content: "Grinding noise usually indicates worn brake pads.",
    similarity: 0.92,
  },
];

beforeEach(() => {
  vi.mocked(repo.getSessionForAnalysis).mockReset();
  vi.mocked(repo.createDiagnosticResult).mockReset();
  vi.mocked(repo.getResultBySession).mockReset();
  vi.mocked(repo.updateSession)
    .mockReset()
    .mockResolvedValue({} as never);
  vi.mocked(repo.getSessionById).mockReset();
  vi.mocked(repo.createFeedback).mockReset();
  vi.mocked(repo.getFeedback).mockReset();
  vi.mocked(getActivePrompt)
    .mockReset()
    .mockImplementation((key: string) =>
      Promise.resolve({
        id: `v-${key}`,
        content: `${key} template {{vehicle}} {{category}} {{symptom}} {{description}} {{obdCode}} {{answers}} {{knowledge}}`,
      } as never),
    );
  mockRetrieve.mockReset().mockResolvedValue(knowledgeChunks);
  mockGenerate.mockReset();
  mockDownload.mockReset();
});

describe("analyzeSession", () => {
  it("throws NotFoundError when the session does not exist or isn't owned by the user", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(null);
    await expect(analyzeSession("missing", "user-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws ConflictError when the session isn't ready for analysis", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(
      baseSession({ status: "DRAFT" }) as never,
    );
    await expect(analyzeSession("session-1", "user-1")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("is idempotent — returns the existing result without calling the AI router", async () => {
    const existing = { id: "result-1", sessionId: "session-1" };
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(
      baseSession({ result: existing }) as never,
    );

    const result = await analyzeSession("session-1", "user-1");

    expect(result).toBe(existing);
    expect(mockRetrieve).not.toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("persists a successful AI result and marks the session COMPLETE", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(baseSession() as never);
    mockGenerate.mockResolvedValue({
      ok: true,
      provider: "openai",
      model: "gpt-4o",
      data: validAiResult(),
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 10,
      attempts: [{ provider: "openai", model: "gpt-4o", ok: true, latencyMs: 10 }],
    });
    vi.mocked(repo.createDiagnosticResult).mockResolvedValue({
      id: "result-1",
      sessionId: "session-1",
      severity: "MEDIUM",
      safeToDrive: true,
      emergencyAction: null,
      isDegraded: false,
      causes: [{ id: "cause-1", rank: 1 }],
    } as never);

    const result = await analyzeSession("session-1", "user-1");

    expect(repo.createDiagnosticResult).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        severity: "MEDIUM",
        safeToDrive: true,
        isDegraded: false,
        aiProvider: "openai",
        causes: [expect.objectContaining({ rank: 1, issueCode: "BRAKE_PAD_WEAR" })],
      }),
    );
    expect(repo.updateSession).toHaveBeenCalledWith(
      "session-1",
      "user-1",
      expect.objectContaining({ status: "COMPLETE" }),
    );
    expect(result).toMatchObject({ id: "result-1" });
  });

  it("records which provider actually answered when the router falls back internally", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(baseSession() as never);
    mockGenerate.mockResolvedValue({
      ok: true,
      provider: "anthropic",
      model: "claude-sonnet-5",
      data: validAiResult(),
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 20,
      attempts: [
        { provider: "openai", model: "gpt-4o", ok: false, transient: true, latencyMs: 5 },
        { provider: "anthropic", model: "claude-sonnet-5", ok: true, latencyMs: 20 },
      ],
    });
    vi.mocked(repo.createDiagnosticResult).mockResolvedValue({
      id: "result-1",
      causes: [],
    } as never);

    await analyzeSession("session-1", "user-1");

    expect(repo.createDiagnosticResult).toHaveBeenCalledWith(
      expect.objectContaining({ aiProvider: "anthropic", aiModel: "claude-sonnet-5" }),
    );
  });

  it("degrades to rule-based guidance only when every AI provider is exhausted", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(baseSession() as never);
    mockGenerate.mockResolvedValue({
      ok: false,
      degraded: true,
      reason: "All AI providers unavailable",
      attempts: [{ provider: "openai", model: "gpt-4o", ok: false, transient: true, latencyMs: 5 }],
    });
    vi.mocked(repo.createDiagnosticResult).mockResolvedValue({
      id: "result-1",
      isDegraded: true,
      severity: "MEDIUM",
      safeToDrive: null,
      causes: [],
    } as never);

    await analyzeSession("session-1", "user-1");

    expect(repo.createDiagnosticResult).toHaveBeenCalledWith(
      expect.objectContaining({
        isDegraded: true,
        degradedReason: "All AI providers unavailable",
        causes: [],
        safeToDrive: null,
      }),
    );
  });

  it("lets deterministic safety rules override the AI output for critical symptoms", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(
      baseSession({
        symptom: {
          id: "sym-2",
          code: "BRAKE_FAILURE",
          label: "Brake failure",
          isSafetyCritical: true,
        },
      }) as never,
    );
    // AI disagrees with the rule engine — it must lose.
    mockGenerate.mockResolvedValue({
      ok: true,
      provider: "openai",
      model: "gpt-4o",
      data: validAiResult({ severity: "LOW", safeToDrive: true }),
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 10,
      attempts: [{ provider: "openai", model: "gpt-4o", ok: true, latencyMs: 10 }],
    });
    vi.mocked(repo.createDiagnosticResult).mockResolvedValue({
      id: "result-1",
      causes: [],
    } as never);

    await analyzeSession("session-1", "user-1");

    expect(repo.createDiagnosticResult).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "CRITICAL", safeToDrive: false }),
    );
    expect(repo.createDiagnosticResult).toHaveBeenCalledWith(
      expect.objectContaining({ emergencyAction: expect.stringContaining("Stop") as unknown }),
    );
  });

  it("locale='ar': builds the prompt from Arabic labels and adds the Arabic response directive to every AI call's system prompt", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(
      baseSession({
        category: { id: "cat-1", code: "BRAKES", label: "Brakes", labelAr: "الفرامل" },
        symptom: {
          id: "sym-1",
          code: "BRAKE_PAD_WEAR",
          label: "Brake pad wear noise",
          labelAr: "صوت تآكل تيل الفرامل",
          isSafetyCritical: false,
        },
        answers: [
          {
            value: "Yes",
            question: {
              text: "Does it happen at low speed?",
              textAr: "هل يحدث عند السرعة المنخفضة؟",
            },
          },
        ],
      }) as never,
    );
    mockGenerate.mockResolvedValue({
      ok: true,
      provider: "openai",
      model: "gpt-4o",
      data: validAiResult(),
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 10,
      attempts: [{ provider: "openai", model: "gpt-4o", ok: true, latencyMs: 10 }],
    });
    vi.mocked(repo.createDiagnosticResult).mockResolvedValue({
      id: "result-1",
      causes: [],
    } as never);

    await analyzeSession("session-1", "user-1", "ar");

    const reasoningCallArgs = mockGenerate.mock.calls[0]![0]!;
    expect(reasoningCallArgs.userPrompt).toContain("الفرامل");
    expect(reasoningCallArgs.userPrompt).toContain("صوت تآكل تيل الفرامل");
    expect(reasoningCallArgs.userPrompt).toContain("هل يحدث عند السرعة المنخفضة؟");
    expect(reasoningCallArgs.systemPrompt).toContain("Modern Standard Arabic");

    for (const call of mockGenerate.mock.calls) {
      expect(call[0].systemPrompt).toContain("Modern Standard Arabic");
    }
  });

  it("locale='ar': overrides the AI emergencyAction with the hand-authored Arabic safety text, not an English or AI-translated one", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(
      baseSession({
        symptom: {
          id: "sym-2",
          code: "BRAKE_FAILURE",
          label: "Brake failure",
          labelAr: "فشل الفرامل",
          isSafetyCritical: true,
        },
      }) as never,
    );
    mockGenerate.mockResolvedValue({
      ok: true,
      provider: "openai",
      model: "gpt-4o",
      data: validAiResult({ severity: "LOW", safeToDrive: true }),
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 10,
      attempts: [{ provider: "openai", model: "gpt-4o", ok: true, latencyMs: 10 }],
    });
    vi.mocked(repo.createDiagnosticResult).mockResolvedValue({
      id: "result-1",
      causes: [],
    } as never);

    await analyzeSession("session-1", "user-1", "ar");

    expect(repo.createDiagnosticResult).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "CRITICAL",
        safeToDrive: false,
        emergencyAction: expect.stringContaining("فرامل") as unknown,
      }),
    );
  });

  it("locale='ar': degraded fallback uses the Arabic limitations message and Arabic safety text", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(
      baseSession({
        symptom: {
          id: "sym-2",
          code: "BRAKE_FAILURE",
          label: "Brake failure",
          labelAr: "فشل الفرامل",
          isSafetyCritical: true,
        },
      }) as never,
    );
    mockGenerate.mockResolvedValue({
      ok: false,
      degraded: true,
      reason: "All AI providers unavailable",
      attempts: [{ provider: "openai", model: "gpt-4o", ok: false, transient: true, latencyMs: 5 }],
    });
    vi.mocked(repo.createDiagnosticResult).mockResolvedValue({
      id: "result-1",
      isDegraded: true,
      causes: [],
    } as never);

    await analyzeSession("session-1", "user-1", "ar");

    expect(repo.createDiagnosticResult).toHaveBeenCalledWith(
      expect.objectContaining({
        limitations: [expect.stringContaining("الذكاء الاصطناعي") as unknown],
        emergencyAction: expect.stringContaining("فرامل") as unknown,
      }),
    );
  });

  it("locale defaults to 'en' when not passed — no Arabic directive, English labels used as-is", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(baseSession() as never);
    mockGenerate.mockResolvedValue({
      ok: true,
      provider: "openai",
      model: "gpt-4o",
      data: validAiResult(),
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 10,
      attempts: [{ provider: "openai", model: "gpt-4o", ok: true, latencyMs: 10 }],
    });
    vi.mocked(repo.createDiagnosticResult).mockResolvedValue({
      id: "result-1",
      causes: [],
    } as never);

    await analyzeSession("session-1", "user-1");

    const reasoningCallArgs = mockGenerate.mock.calls[0]![0]!;
    expect(reasoningCallArgs.systemPrompt).not.toContain("Modern Standard Arabic");
  });

  it("returns the winning row instead of erroring when a concurrent request races the create", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(baseSession() as never);
    mockGenerate.mockResolvedValue({
      ok: true,
      provider: "openai",
      model: "gpt-4o",
      data: validAiResult(),
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 10,
      attempts: [{ provider: "openai", model: "gpt-4o", ok: true, latencyMs: 10 }],
    });
    const raceError = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6.19.3",
    });
    vi.mocked(repo.createDiagnosticResult).mockRejectedValue(raceError);
    const winner = { id: "result-1", sessionId: "session-1" };
    vi.mocked(repo.getResultBySession).mockResolvedValue(winner as never);

    const result = await analyzeSession("session-1", "user-1");

    expect(result).toBe(winner);
    expect(repo.updateSession).not.toHaveBeenCalled();
  });
});

describe("analyzeSession — dual-audience explanations (Sprint 15)", () => {
  it("persists customerExplanation and garageSummary when both explanation calls succeed", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(baseSession() as never);
    mockGenerate
      .mockResolvedValueOnce({
        ok: true,
        provider: "openai",
        model: "gpt-4o",
        data: validAiResult(),
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        latencyMs: 10,
        attempts: [{ provider: "openai", model: "gpt-4o", ok: true, latencyMs: 10 }],
      })
      .mockResolvedValueOnce({
        ok: true,
        provider: "openai",
        model: "gpt-4o",
        data: { explanation: "Your brake pads are worn and should be replaced soon." },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        latencyMs: 5,
        attempts: [],
      })
      .mockResolvedValueOnce({
        ok: true,
        provider: "openai",
        model: "gpt-4o",
        data: { summary: "Worn brake pads, 80% confidence, grinding noise reported." },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        latencyMs: 5,
        attempts: [],
      });
    vi.mocked(repo.createDiagnosticResult).mockResolvedValue({
      id: "result-1",
      causes: [],
    } as never);

    await analyzeSession("session-1", "user-1");

    expect(mockGenerate).toHaveBeenCalledTimes(3);
    expect(repo.createDiagnosticResult).toHaveBeenCalledWith(
      expect.objectContaining({
        customerExplanation: "Your brake pads are worn and should be replaced soon.",
        garageSummary: "Worn brake pads, 80% confidence, grinding noise reported.",
      }),
    );
  });

  it("leaves customerExplanation/garageSummary unset when their AI calls fail, without affecting the main result", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(baseSession() as never);
    mockGenerate
      .mockResolvedValueOnce({
        ok: true,
        provider: "openai",
        model: "gpt-4o",
        data: validAiResult(),
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        latencyMs: 10,
        attempts: [{ provider: "openai", model: "gpt-4o", ok: true, latencyMs: 10 }],
      })
      .mockResolvedValueOnce({ ok: false, degraded: true, reason: "down", attempts: [] })
      .mockResolvedValueOnce({ ok: false, degraded: true, reason: "down", attempts: [] });
    vi.mocked(repo.createDiagnosticResult).mockResolvedValue({
      id: "result-1",
      causes: [],
    } as never);

    const result = await analyzeSession("session-1", "user-1");

    expect(result).toMatchObject({ id: "result-1" });
    expect(repo.createDiagnosticResult).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "MEDIUM", isDegraded: false }),
    );
    const call = vi.mocked(repo.createDiagnosticResult).mock.calls[0]?.[0];
    expect(call?.customerExplanation).toBeUndefined();
    expect(call?.garageSummary).toBeUndefined();
  });

  it("never calls the explanation prompts or AI router when the main result itself is degraded", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(baseSession() as never);
    mockGenerate.mockResolvedValue({
      ok: false,
      degraded: true,
      reason: "All AI providers unavailable",
      attempts: [],
    });
    vi.mocked(repo.createDiagnosticResult).mockResolvedValue({
      id: "result-1",
      isDegraded: true,
      causes: [],
    } as never);

    await analyzeSession("session-1", "user-1");

    // Only the main diagnostic_result call happens — no explanation calls follow.
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it("still succeeds when the customer_explanation/garage_summary prompt templates are unavailable", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(baseSession() as never);
    vi.mocked(getActivePrompt).mockImplementation((key: string) => {
      if (key === "customer_explanation" || key === "garage_summary") {
        return Promise.reject(new Error("not found"));
      }
      return Promise.resolve({
        id: `v-${key}`,
        content: `${key} template {{vehicle}} {{category}} {{symptom}} {{description}} {{obdCode}} {{answers}} {{knowledge}}`,
      } as never);
    });
    mockGenerate.mockResolvedValue({
      ok: true,
      provider: "openai",
      model: "gpt-4o",
      data: validAiResult(),
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 10,
      attempts: [{ provider: "openai", model: "gpt-4o", ok: true, latencyMs: 10 }],
    });
    vi.mocked(repo.createDiagnosticResult).mockResolvedValue({
      id: "result-1",
      causes: [],
    } as never);

    const result = await analyzeSession("session-1", "user-1");

    expect(result).toMatchObject({ id: "result-1" });
    // Only the main diagnostic_result call — both explanation calls were skipped
    // since neither prompt version resolved.
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });
});

describe("analyzeSession — visual diagnostics (Sprint 16)", () => {
  it("passes no images to the AI call when the session has no attachments", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(baseSession() as never);
    mockGenerate.mockResolvedValue({
      ok: true,
      provider: "openai",
      model: "gpt-4o",
      data: validAiResult(),
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 10,
      attempts: [{ provider: "openai", model: "gpt-4o", ok: true, latencyMs: 10 }],
    });
    vi.mocked(repo.createDiagnosticResult).mockResolvedValue({
      id: "result-1",
      causes: [],
    } as never);

    await analyzeSession("session-1", "user-1");

    expect(mockDownload).not.toHaveBeenCalled();
    const call = mockGenerate.mock.calls[0]?.[0];
    expect(call.images).toEqual([]);
  });

  it("downloads image attachments and passes them as base64 to the diagnostic_reasoning call", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(
      baseSession({
        attachments: [
          {
            id: "att-1",
            storageKey: "diagnostics/session-1/attachments/a.jpg",
            mimeType: "image/jpeg",
          },
          {
            id: "att-2",
            storageKey: "diagnostics/session-1/attachments/b.mp4",
            mimeType: "video/mp4",
          },
        ],
      }) as never,
    );
    mockDownload.mockResolvedValue(Buffer.from("fake-image-bytes"));
    mockGenerate.mockResolvedValue({
      ok: true,
      provider: "openai",
      model: "gpt-4o",
      data: validAiResult(),
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 10,
      attempts: [{ provider: "openai", model: "gpt-4o", ok: true, latencyMs: 10 }],
    });
    vi.mocked(repo.createDiagnosticResult).mockResolvedValue({
      id: "result-1",
      causes: [],
    } as never);

    await analyzeSession("session-1", "user-1");

    // Only the vision-compatible (image/*) attachment is downloaded — the
    // video attachment is stored but never sent to the vision call.
    expect(mockDownload).toHaveBeenCalledTimes(1);
    expect(mockDownload).toHaveBeenCalledWith("diagnostics/session-1/attachments/a.jpg");
    const call = mockGenerate.mock.calls[0]?.[0];
    expect(call.images).toEqual([
      { base64: Buffer.from("fake-image-bytes").toString("base64"), mimeType: "image/jpeg" },
    ]);
  });

  it("skips an unreadable attachment without failing the analysis", async () => {
    vi.mocked(repo.getSessionForAnalysis).mockResolvedValue(
      baseSession({
        attachments: [
          {
            id: "att-1",
            storageKey: "diagnostics/session-1/attachments/missing.jpg",
            mimeType: "image/jpeg",
          },
        ],
      }) as never,
    );
    mockDownload.mockRejectedValue(new Error("ENOENT"));
    mockGenerate.mockResolvedValue({
      ok: true,
      provider: "openai",
      model: "gpt-4o",
      data: validAiResult(),
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 10,
      attempts: [{ provider: "openai", model: "gpt-4o", ok: true, latencyMs: 10 }],
    });
    vi.mocked(repo.createDiagnosticResult).mockResolvedValue({
      id: "result-1",
      causes: [],
    } as never);

    const result = await analyzeSession("session-1", "user-1");

    expect(result).toMatchObject({ id: "result-1" });
    const call = mockGenerate.mock.calls[0]?.[0];
    expect(call.images).toEqual([]);
  });
});

describe("getResult", () => {
  it("throws NotFoundError when no result exists yet", async () => {
    vi.mocked(repo.getResultBySession).mockResolvedValue(null);
    await expect(getResult("session-1", "user-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("submitFeedback", () => {
  it("rejects feedback before the session has a result", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue({ status: "AWAITING_AI" } as never);
    await expect(submitFeedback("session-1", "user-1", { rating: 5 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("rejects a second feedback submission for the same session", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue({ status: "COMPLETE" } as never);
    vi.mocked(repo.getFeedback).mockResolvedValue({ id: "fb-1" } as never);
    await expect(submitFeedback("session-1", "user-1", { rating: 5 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});
