import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

const hoisted = vi.hoisted(() => {
  class FakeAPIError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.name = "APIError";
      this.status = status;
    }
  }
  return { FakeAPIError, createMock: vi.fn() };
});

vi.mock("openai", () => ({
  default: class FakeOpenAI {
    chat = { completions: { create: hoisted.createMock } };
  },
  APIError: hoisted.FakeAPIError,
}));

vi.mock("@/lib/env", () => ({ env: { OPENAI_API_KEY: "test-key" } }));

const schema = z.object({ answer: z.string() });
const input = { systemPrompt: "system", userPrompt: "user", schemaName: "test_output" };

describe("openai-provider", () => {
  beforeEach(() => {
    hoisted.createMock.mockReset();
  });

  it("returns validated structured data on success", async () => {
    hoisted.createMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ answer: "42" }) } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });

    const { createOpenAIProvider } = await import("@/lib/ai/providers/openai-provider");
    const provider = createOpenAIProvider("gpt-4o");
    const result = await provider.generateStructured(input, schema);

    expect(result.data).toEqual({ answer: "42" });
    expect(result.provider).toBe("openai");
    expect(result.usage.totalTokens).toBe(15);
  });

  it("throws AIValidationError when the response fails schema validation", async () => {
    hoisted.createMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ wrong: "shape" }) } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });

    const { createOpenAIProvider } = await import("@/lib/ai/providers/openai-provider");
    const { AIValidationError } = await import("@/lib/ai/errors");
    const provider = createOpenAIProvider("gpt-4o");

    await expect(provider.generateStructured(input, schema)).rejects.toBeInstanceOf(
      AIValidationError,
    );
  });

  it("marks 429 responses as transient", async () => {
    hoisted.createMock.mockRejectedValue(new hoisted.FakeAPIError("rate limited", 429));

    const { createOpenAIProvider } = await import("@/lib/ai/providers/openai-provider");
    const provider = createOpenAIProvider("gpt-4o");

    await expect(provider.generateStructured(input, schema)).rejects.toMatchObject({
      transient: true,
    });
  });

  it("sends a plain string user message when no images are attached", async () => {
    hoisted.createMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ answer: "42" }) } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });

    const { createOpenAIProvider } = await import("@/lib/ai/providers/openai-provider");
    const provider = createOpenAIProvider("gpt-4o");
    await provider.generateStructured(input, schema);

    const call = hoisted.createMock.mock.calls[0]?.[0];
    expect(call.messages[1]).toEqual({ role: "user", content: "user" });
  });

  it("builds image_url content parts alongside the text prompt when images are attached", async () => {
    hoisted.createMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ answer: "42" }) } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });

    const { createOpenAIProvider } = await import("@/lib/ai/providers/openai-provider");
    const provider = createOpenAIProvider("gpt-4o");
    await provider.generateStructured(
      { ...input, images: [{ base64: "ZmFrZQ==", mimeType: "image/jpeg" }] },
      schema,
    );

    const call = hoisted.createMock.mock.calls[0]?.[0];
    expect(call.messages[1].content).toEqual([
      { type: "text", text: "user" },
      { type: "image_url", image_url: { url: "data:image/jpeg;base64,ZmFrZQ==" } },
    ]);
  });

  // NOTE: keep this last — it vi.doMock's @/lib/env with an empty object and
  // resets the module registry, which leaks into any later test in this file
  // that dynamically imports the provider again.
  it("throws a non-transient error when the API key is missing", async () => {
    vi.doMock("@/lib/env", () => ({ env: {} }));
    vi.resetModules();

    const { createOpenAIProvider } = await import("@/lib/ai/providers/openai-provider");
    const provider = createOpenAIProvider("gpt-4o");

    await expect(provider.generateStructured(input, schema)).rejects.toMatchObject({
      transient: false,
    });
  });
});
