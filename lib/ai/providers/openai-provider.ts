import OpenAI, { APIError } from "openai";
import type { ZodType } from "zod";
import { env } from "@/lib/env";
import { AIProviderError, AIValidationError } from "../errors";
import { toJsonSchema } from "../json-schema";
import { normalizeNullSentinels } from "../json-sanitize";
import type { AICallResult, AIProvider, AIRequestInput, AIRequestOptions } from "../types";

const DEFAULT_TIMEOUT_MS = 20_000;

function isTransientStatus(status: number | undefined): boolean {
  if (status === undefined) return true; // network/timeout errors — worth retrying
  return status === 429 || status >= 500;
}

export function createOpenAIProvider(model: string): AIProvider {
  return {
    name: "openai",
    model,
    async generateStructured<TOutput>(
      input: AIRequestInput,
      schema: ZodType<TOutput>,
      options?: AIRequestOptions,
    ): Promise<AICallResult<TOutput>> {
      if (!env.OPENAI_API_KEY) {
        throw new AIProviderError("OPENAI_API_KEY is not configured", "openai", false);
      }

      const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      const controller = new AbortController();
      const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const startedAt = Date.now();

      const userContent: OpenAI.Chat.ChatCompletionContentPart[] | string =
        input.images && input.images.length > 0
          ? [
              { type: "text", text: input.userPrompt },
              ...input.images.map((image): OpenAI.Chat.ChatCompletionContentPart => ({
                type: "image_url",
                image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
              })),
            ]
          : input.userPrompt;

      try {
        const completion = await client.chat.completions.create(
          {
            model,
            temperature: options?.temperature,
            messages: [
              { role: "system", content: input.systemPrompt },
              { role: "user", content: userContent },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: input.schemaName,
                schema: toJsonSchema(schema),
                strict: true,
              },
            },
          },
          { signal: controller.signal },
        );

        const latencyMs = Date.now() - startedAt;
        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new AIValidationError("OpenAI returned an empty response", "openai");
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          throw new AIValidationError("OpenAI response was not valid JSON", "openai", { content });
        }

        const result = schema.safeParse(normalizeNullSentinels(parsed));
        if (!result.success) {
          throw new AIValidationError(
            "OpenAI output failed schema validation",
            "openai",
            result.error.flatten(),
          );
        }

        return {
          data: result.data,
          provider: "openai",
          model,
          usage: {
            promptTokens: completion.usage?.prompt_tokens ?? 0,
            completionTokens: completion.usage?.completion_tokens ?? 0,
            totalTokens: completion.usage?.total_tokens ?? 0,
          },
          latencyMs,
        };
      } catch (err) {
        if (err instanceof AIProviderError) throw err;
        if (err instanceof APIError) {
          throw new AIProviderError(err.message, "openai", isTransientStatus(err.status), {
            status: err.status,
          });
        }
        if (err instanceof Error && err.name === "AbortError") {
          throw new AIProviderError("OpenAI request timed out", "openai", true);
        }
        throw new AIProviderError(
          err instanceof Error ? err.message : "Unknown OpenAI error",
          "openai",
          true,
        );
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
