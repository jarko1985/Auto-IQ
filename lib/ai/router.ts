import type { ZodType } from "zod";
import { env } from "@/lib/env";
import { logger } from "@/lib/observability/logger";
import { AIProviderError } from "./errors";
import { createAnthropicProvider } from "./providers/anthropic-provider";
import { createOpenAIProvider } from "./providers/openai-provider";
import type {
  AIAttempt,
  AIOrchestrationResult,
  AIProvider,
  AIProviderName,
  AIRequestInput,
  AIRequestOptions,
} from "./types";

const DEFAULT_MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = 300;

function buildProvider(name: AIProviderName, model: string): AIProvider {
  return name === "openai" ? createOpenAIProvider(model) : createAnthropicProvider(model);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface AIRouter {
  generateWithFallback<TOutput>(
    input: AIRequestInput,
    schema: ZodType<TOutput>,
    options?: AIRequestOptions,
  ): Promise<AIOrchestrationResult<TOutput>>;
}

/** Builds a router from an explicit provider list — used directly by tests with fake providers. */
export function createAIRouter(providers: AIProvider[]): AIRouter {
  return {
    async generateWithFallback<TOutput>(
      input: AIRequestInput,
      schema: ZodType<TOutput>,
      options?: AIRequestOptions,
    ): Promise<AIOrchestrationResult<TOutput>> {
      const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
      const attempts: AIAttempt[] = [];
      let lastReason = "AI providers unavailable";

      for (const provider of providers) {
        let providerAttempt = 0;

        while (providerAttempt < maxRetries) {
          providerAttempt++;
          const attemptStartedAt = Date.now();

          try {
            const result = await provider.generateStructured(input, schema, options);
            attempts.push({
              provider: provider.name,
              model: result.model,
              ok: true,
              latencyMs: result.latencyMs,
            });
            return { ok: true, attempts, ...result };
          } catch (err) {
            const latencyMs = Date.now() - attemptStartedAt;
            const isProviderError = err instanceof AIProviderError;
            const transient = isProviderError ? err.transient : true;
            const reason = err instanceof Error ? err.message : "Unknown AI provider error";

            attempts.push({
              provider: provider.name,
              model: provider.model,
              ok: false,
              transient,
              errorCode: isProviderError ? err.name : "UNKNOWN_ERROR",
              latencyMs,
            });

            lastReason = reason;
            logger.warn(
              { provider: provider.name, transient, reason, attempt: providerAttempt },
              "ai_provider_failed",
            );

            // Only retry the same provider for transient failures; validation and
            // permanent failures move straight to the next provider (never retried silently).
            if (transient && providerAttempt < maxRetries) {
              await sleep(RETRY_BACKOFF_MS * providerAttempt);
              continue;
            }
            break;
          }
        }
      }

      logger.error({ attempts, reason: lastReason }, "ai_all_providers_exhausted");
      return { ok: false, degraded: true, reason: lastReason, attempts };
    },
  };
}

let cachedRouter: AIRouter | null = null;

/** Router built from env-configured providers (AI_PRIMARY_PROVIDER / AI_FALLBACK_PROVIDER). */
export function getAIRouter(): AIRouter {
  if (cachedRouter) return cachedRouter;

  const primary = buildProvider(env.AI_PRIMARY_PROVIDER, env.AI_PRIMARY_MODEL);
  const fallback = buildProvider(env.AI_FALLBACK_PROVIDER, env.AI_FALLBACK_MODEL);
  cachedRouter = createAIRouter([primary, fallback]);
  return cachedRouter;
}
