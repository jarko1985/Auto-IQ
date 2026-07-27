import Anthropic, { APIError } from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
import { env } from "@/lib/env";
import { AIProviderError, AIValidationError } from "../errors";
import { toJsonSchema } from "../json-schema";
import { normalizeNullSentinels } from "../json-sanitize";
import type { AICallResult, AIProvider, AIRequestInput, AIRequestOptions } from "../types";

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_TOKENS = 4096;

function isTransientStatus(status: number | undefined): boolean {
  if (status === undefined) return true;
  return status === 429 || status >= 500;
}

export function createAnthropicProvider(model: string): AIProvider {
  return {
    name: "anthropic",
    model,
    async generateStructured<TOutput>(
      input: AIRequestInput,
      schema: ZodType<TOutput>,
      options?: AIRequestOptions,
    ): Promise<AICallResult<TOutput>> {
      if (!env.ANTHROPIC_API_KEY) {
        throw new AIProviderError("ANTHROPIC_API_KEY is not configured", "anthropic", false);
      }

      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
      const controller = new AbortController();
      const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const startedAt = Date.now();

      // Images before text, per Anthropic's documented recommendation for
      // best vision performance when a message mixes both.
      const userContent: Anthropic.Messages.ContentBlockParam[] | string =
        input.images && input.images.length > 0
          ? [
              ...input.images.map((image): Anthropic.Messages.ContentBlockParam => ({
                type: "image",
                source: {
                  type: "base64",
                  media_type: image.mimeType as Anthropic.Messages.Base64ImageSource["media_type"],
                  data: image.base64,
                },
              })),
              { type: "text", text: input.userPrompt },
            ]
          : input.userPrompt;

      try {
        const message = await client.messages.create(
          {
            model,
            max_tokens: DEFAULT_MAX_TOKENS,
            temperature: options?.temperature,
            system: input.systemPrompt,
            messages: [{ role: "user", content: userContent }],
            tools: [
              {
                name: input.schemaName,
                input_schema: toJsonSchema(schema) as Anthropic.Tool.InputSchema,
              },
            ],
            tool_choice: { type: "tool", name: input.schemaName },
          },
          { signal: controller.signal },
        );

        const latencyMs = Date.now() - startedAt;
        const toolUse = message.content.find((block) => block.type === "tool_use");
        if (!toolUse) {
          throw new AIValidationError("Anthropic did not return a tool_use block", "anthropic");
        }

        const result = schema.safeParse(normalizeNullSentinels(toolUse.input));
        if (!result.success) {
          throw new AIValidationError(
            "Anthropic output failed schema validation",
            "anthropic",
            result.error.flatten(),
          );
        }

        return {
          data: result.data,
          provider: "anthropic",
          model,
          usage: {
            promptTokens: message.usage.input_tokens,
            completionTokens: message.usage.output_tokens,
            totalTokens: message.usage.input_tokens + message.usage.output_tokens,
          },
          latencyMs,
        };
      } catch (err) {
        if (err instanceof AIProviderError) throw err;
        if (err instanceof APIError) {
          throw new AIProviderError(err.message, "anthropic", isTransientStatus(err.status), {
            status: err.status,
          });
        }
        if (err instanceof Error && err.name === "AbortError") {
          throw new AIProviderError("Anthropic request timed out", "anthropic", true);
        }
        throw new AIProviderError(
          err instanceof Error ? err.message : "Unknown Anthropic error",
          "anthropic",
          true,
        );
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
