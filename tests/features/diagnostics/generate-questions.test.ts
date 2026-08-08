import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerate = vi.fn();

vi.mock("@/features/diagnostics/repository", () => ({
  getSessionById: vi.fn(),
  getSessionQuestions: vi.fn(),
  getGenericFallbackQuestions: vi.fn(),
  createSessionQuestions: vi.fn(),
}));

vi.mock("@/features/ai/service", () => ({
  getActivePrompt: vi.fn(),
}));

vi.mock("@/lib/ai", () => ({
  getAIRouter: () => ({ generateWithFallback: mockGenerate }),
}));

import * as repo from "@/features/diagnostics/repository";
import { getActivePrompt } from "@/features/ai/service";
import { generateSessionQuestions } from "@/features/diagnostics/service";

function baseSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-1",
    categoryId: "cat-1",
    description: "Grinding noise when braking",
    obdCode: null,
    category: { id: "cat-1", code: "BRAKES", label: "Brakes" },
    symptom: { id: "sym-1", code: "BRAKE_PAD_WEAR", label: "Brake pad wear noise" },
    vehicle: { makeName: "Toyota", modelName: "Land Cruiser", year: 2022 },
    ...overrides,
  };
}

function fallbackQuestion(overrides: Record<string, unknown> = {}) {
  return {
    id: "fallback-1",
    code: "GENERIC_ONSET",
    type: "YES_NO",
    text: "Did this start suddenly?",
    textAr: "هل بدأت هذه المشكلة فجأة؟",
    helpText: null,
    options: null,
    isRequired: false,
    sortOrder: 1,
    ...overrides,
  };
}

function generatedQuestion(overrides: Record<string, unknown> = {}) {
  return {
    type: "YES_NO",
    text: "Does it happen at low speed?",
    helpText: "Helps narrow down the cause.",
    options: null,
    isRequired: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(repo.getSessionById)
    .mockReset()
    .mockResolvedValue(baseSession() as never);
  vi.mocked(repo.getSessionQuestions).mockReset().mockResolvedValue([]);
  vi.mocked(repo.getGenericFallbackQuestions)
    .mockReset()
    .mockResolvedValue([fallbackQuestion()] as never);
  vi.mocked(repo.createSessionQuestions)
    .mockReset()
    .mockImplementation((_sessionId, questions) =>
      Promise.resolve(questions.map((q, i) => ({ id: `generated-${i}`, ...q })) as never),
    );
  vi.mocked(getActivePrompt)
    .mockReset()
    .mockImplementation((key: string) =>
      Promise.resolve({
        id: `v-${key}`,
        content: `${key} {{vehicle}} {{category}} {{symptom}} {{description}} {{obdCode}}`,
      } as never),
    );
  mockGenerate.mockReset();
});

describe("generateSessionQuestions", () => {
  it("throws NotFoundError when the session doesn't exist or isn't owned by the user", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(null);
    await expect(generateSessionQuestions("missing", "user-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("is idempotent — returns the already-generated session questions without calling the AI router", async () => {
    vi.mocked(repo.getSessionQuestions).mockResolvedValue([
      fallbackQuestion({ id: "q-1" }),
    ] as never);

    const result = await generateSessionQuestions("session-1", "user-1");

    expect(result).toEqual({ questions: [fallbackQuestion({ id: "q-1" })], source: "ai" });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("falls back to the generic static bank when the active prompt is unavailable", async () => {
    vi.mocked(getActivePrompt).mockRejectedValue(new Error("not found"));

    const result = await generateSessionQuestions("session-1", "user-1");

    expect(result.source).toBe("static");
    expect(result.questions).toEqual([fallbackQuestion()]);
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(repo.createSessionQuestions).not.toHaveBeenCalled();
  });

  it("falls back to the generic static bank when the AI call fails", async () => {
    mockGenerate.mockResolvedValue({ ok: false, degraded: true, reason: "down", attempts: [] });

    const result = await generateSessionQuestions("session-1", "user-1");

    expect(result.source).toBe("static");
    expect(repo.createSessionQuestions).not.toHaveBeenCalled();
  });

  it("localizes the static fallback bank's text when locale is 'ar'", async () => {
    vi.mocked(getActivePrompt).mockRejectedValue(new Error("not found"));

    const result = await generateSessionQuestions("session-1", "user-1", "ar");

    expect(result.questions[0]?.text).toBe("هل بدأت هذه المشكلة فجأة؟");
  });

  it("persists a successful batch generation as session-scoped questions", async () => {
    mockGenerate.mockResolvedValue({
      ok: true,
      provider: "openai",
      model: "gpt-4o",
      data: {
        questions: [
          generatedQuestion({ text: "Does it happen at low speed?" }),
          generatedQuestion({
            type: "SINGLE_SELECT",
            text: "How often does it happen?",
            options: [
              { value: "always", label: "Every time" },
              { value: "sometimes", label: "Sometimes" },
            ],
          }),
        ],
      },
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 10,
      attempts: [],
    });

    const result = await generateSessionQuestions("session-1", "user-1");

    expect(repo.createSessionQuestions).toHaveBeenCalledWith(
      "session-1",
      expect.arrayContaining([
        expect.objectContaining({ type: "YES_NO", text: "Does it happen at low speed?" }),
        expect.objectContaining({
          type: "SINGLE_SELECT",
          options: [
            { value: "always", label: "Every time" },
            { value: "sometimes", label: "Sometimes" },
          ],
        }),
      ]),
    );
    expect(result.source).toBe("ai");
    expect(result.questions).toHaveLength(2);
  });

  it("locale='ar': builds the prompt from Arabic category/symptom labels and localizes the system prompt", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValue(
      baseSession({
        category: { id: "cat-1", code: "BRAKES", label: "Brakes", labelAr: "الفرامل" },
        symptom: {
          id: "sym-1",
          code: "BRAKE_PAD_WEAR",
          label: "Brake pad wear noise",
          labelAr: "صوت تآكل تيل الفرامل",
        },
      }) as never,
    );
    mockGenerate.mockResolvedValue({
      ok: true,
      provider: "openai",
      model: "gpt-4o",
      data: { questions: [generatedQuestion()] },
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 10,
      attempts: [],
    });

    await generateSessionQuestions("session-1", "user-1", "ar");

    const call = mockGenerate.mock.calls[0]![0]!;
    expect(call.userPrompt).toContain("الفرامل");
    expect(call.userPrompt).toContain("صوت تآكل تيل الفرامل");
    expect(call.systemPrompt).toContain("Modern Standard Arabic");
  });
});
