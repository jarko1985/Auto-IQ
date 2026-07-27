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

vi.mock("@anthropic-ai/sdk", () => ({
  default: class FakeAnthropic {
    messages = { create: hoisted.createMock };
  },
  APIError: hoisted.FakeAPIError,
}));

vi.mock("@/lib/env", () => ({ env: { ANTHROPIC_API_KEY: "test-key" } }));

const schema = z.object({ answer: z.string() });
const input = { systemPrompt: "system", userPrompt: "user", schemaName: "test_output" };

describe("anthropic-provider", () => {
  beforeEach(() => {
    hoisted.createMock.mockReset();
  });

  it("returns validated structured data from the tool_use block", async () => {
    hoisted.createMock.mockResolvedValue({
      content: [{ type: "tool_use", name: "test_output", input: { answer: "42" } }],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    const { createAnthropicProvider } = await import("@/lib/ai/providers/anthropic-provider");
    const provider = createAnthropicProvider("claude-sonnet-5");
    const result = await provider.generateStructured(input, schema);

    expect(result.data).toEqual({ answer: "42" });
    expect(result.provider).toBe("anthropic");
    expect(result.usage.totalTokens).toBe(15);
  });

  it("throws AIValidationError when no tool_use block is returned", async () => {
    hoisted.createMock.mockResolvedValue({
      content: [{ type: "text", text: "I refuse" }],
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    const { createAnthropicProvider } = await import("@/lib/ai/providers/anthropic-provider");
    const { AIValidationError } = await import("@/lib/ai/errors");
    const provider = createAnthropicProvider("claude-sonnet-5");

    await expect(provider.generateStructured(input, schema)).rejects.toBeInstanceOf(
      AIValidationError,
    );
  });

  it("throws AIValidationError when the tool input fails schema validation", async () => {
    hoisted.createMock.mockResolvedValue({
      content: [{ type: "tool_use", name: "test_output", input: { wrong: "shape" } }],
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    const { createAnthropicProvider } = await import("@/lib/ai/providers/anthropic-provider");
    const { AIValidationError } = await import("@/lib/ai/errors");
    const provider = createAnthropicProvider("claude-sonnet-5");

    await expect(provider.generateStructured(input, schema)).rejects.toBeInstanceOf(
      AIValidationError,
    );
  });

  it("marks 503 responses as transient", async () => {
    hoisted.createMock.mockRejectedValue(new hoisted.FakeAPIError("overloaded", 503));

    const { createAnthropicProvider } = await import("@/lib/ai/providers/anthropic-provider");
    const provider = createAnthropicProvider("claude-sonnet-5");

    await expect(provider.generateStructured(input, schema)).rejects.toMatchObject({
      transient: true,
    });
  });

  it("sends a plain string user message when no images are attached", async () => {
    hoisted.createMock.mockResolvedValue({
      content: [{ type: "tool_use", name: "test_output", input: { answer: "42" } }],
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    const { createAnthropicProvider } = await import("@/lib/ai/providers/anthropic-provider");
    const provider = createAnthropicProvider("claude-sonnet-5");
    await provider.generateStructured(input, schema);

    const call = hoisted.createMock.mock.calls[0]?.[0];
    expect(call.messages[0]).toEqual({ role: "user", content: "user" });
  });

  it("builds image content blocks before the text block when images are attached", async () => {
    hoisted.createMock.mockResolvedValue({
      content: [{ type: "tool_use", name: "test_output", input: { answer: "42" } }],
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    const { createAnthropicProvider } = await import("@/lib/ai/providers/anthropic-provider");
    const provider = createAnthropicProvider("claude-sonnet-5");
    await provider.generateStructured(
      { ...input, images: [{ base64: "ZmFrZQ==", mimeType: "image/jpeg" }] },
      schema,
    );

    const call = hoisted.createMock.mock.calls[0]?.[0];
    expect(call.messages[0].content).toEqual([
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "ZmFrZQ==" } },
      { type: "text", text: "user" },
    ]);
  });

  // NOTE: keep this last — it vi.doMock's @/lib/env with an empty object and
  // resets the module registry, which leaks into any later test in this file
  // that dynamically imports the provider again.
  it("throws a non-transient error when the API key is missing", async () => {
    vi.doMock("@/lib/env", () => ({ env: {} }));
    vi.resetModules();

    const { createAnthropicProvider } = await import("@/lib/ai/providers/anthropic-provider");
    const provider = createAnthropicProvider("claude-sonnet-5");

    await expect(provider.generateStructured(input, schema)).rejects.toMatchObject({
      transient: false,
    });
  });
});
