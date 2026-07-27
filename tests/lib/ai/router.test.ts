import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { createAIRouter } from "@/lib/ai/router";
import { AIProviderError, AIValidationError } from "@/lib/ai/errors";
import type { AICallResult, AIProvider, AIRequestInput } from "@/lib/ai/types";

const schema = z.object({ answer: z.string() });
const input: AIRequestInput = {
  systemPrompt: "system",
  userPrompt: "user",
  schemaName: "test_output",
};

function fakeProvider(
  name: "openai" | "anthropic",
  model: string,
  impl: () => Promise<AICallResult<z.infer<typeof schema>>>,
): AIProvider {
  return {
    name,
    model,
    generateStructured: vi.fn(impl) as unknown as AIProvider["generateStructured"],
  };
}

function success(
  name: "openai" | "anthropic",
  model = "test-model",
): AICallResult<z.infer<typeof schema>> {
  return {
    data: { answer: "ok" },
    provider: name,
    model,
    usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    latencyMs: 5,
  };
}

describe("createAIRouter.generateWithFallback", () => {
  it("returns success from the primary provider on first try", async () => {
    const primary = fakeProvider("openai", "gpt-4o", () => Promise.resolve(success("openai")));
    const fallback = fakeProvider("anthropic", "claude-sonnet-5", () =>
      Promise.resolve(success("anthropic")),
    );
    const router = createAIRouter([primary, fallback]);

    const result = await router.generateWithFallback(input, schema);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBe("openai");
      expect(result.attempts).toHaveLength(1);
    }
    expect(fallback.generateStructured).not.toHaveBeenCalled();
  });

  it("retries the same provider on transient failures before succeeding", async () => {
    let calls = 0;
    const primary = fakeProvider("openai", "gpt-4o", () => {
      calls++;
      if (calls < 3) {
        return Promise.reject(new AIProviderError("rate limited", "openai", true));
      }
      return Promise.resolve(success("openai"));
    });
    const fallback = fakeProvider("anthropic", "claude-sonnet-5", () =>
      Promise.resolve(success("anthropic")),
    );
    const router = createAIRouter([primary, fallback]);

    const result = await router.generateWithFallback(input, schema, { maxRetries: 3 });

    expect(result.ok).toBe(true);
    expect(calls).toBe(3);
    expect(fallback.generateStructured).not.toHaveBeenCalled();
  });

  it("falls back to the secondary provider on a non-transient failure without retrying the primary", async () => {
    const primary = fakeProvider("openai", "gpt-4o", () =>
      Promise.reject(new AIProviderError("unauthorized", "openai", false)),
    );
    const fallback = fakeProvider("anthropic", "claude-sonnet-5", () =>
      Promise.resolve(success("anthropic")),
    );
    const router = createAIRouter([primary, fallback]);

    const result = await router.generateWithFallback(input, schema, { maxRetries: 3 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBe("anthropic");
    }
    expect(primary.generateStructured).toHaveBeenCalledTimes(1);
  });

  it("falls back after a schema validation failure and logs the reason instead of silently retrying", async () => {
    const primary = fakeProvider("openai", "gpt-4o", () =>
      Promise.reject(new AIValidationError("bad output", "openai", { issues: [] })),
    );
    const fallback = fakeProvider("anthropic", "claude-sonnet-5", () =>
      Promise.resolve(success("anthropic")),
    );
    const router = createAIRouter([primary, fallback]);

    const result = await router.generateWithFallback(input, schema);

    expect(result.ok).toBe(true);
    expect(primary.generateStructured).toHaveBeenCalledTimes(1);
    if (result.ok) {
      expect(result.attempts[0]).toMatchObject({
        provider: "openai",
        ok: false,
        errorCode: "AIValidationError",
      });
    }
  });

  it("returns a degraded result without throwing when every provider is exhausted", async () => {
    const primary = fakeProvider("openai", "gpt-4o", () =>
      Promise.reject(new AIProviderError("down", "openai", true)),
    );
    const fallback = fakeProvider("anthropic", "claude-sonnet-5", () =>
      Promise.reject(new AIProviderError("down", "anthropic", true)),
    );
    const router = createAIRouter([primary, fallback]);

    const result = await router.generateWithFallback(input, schema, { maxRetries: 1 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.degraded).toBe(true);
      expect(result.reason).toBeTruthy();
      expect(result.attempts.length).toBeGreaterThan(0);
    }
  });
});
