import OpenAI, { APIError } from "openai";
import { env } from "@/lib/env";
import { AIProviderError } from "./errors";

const DEFAULT_TIMEOUT_MS = 20_000;

function isTransientStatus(status: number | undefined): boolean {
  if (status === undefined) return true; // network/timeout errors — worth retrying
  return status === 429 || status >= 500;
}

export interface EmbeddingProvider {
  readonly name: "openai";
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

/** OpenAI embeddings adapter — the only supported embedding provider for MVP (see ADR-007). */
export function createOpenAIEmbeddingProvider(
  model: string,
  dimensions: number,
): EmbeddingProvider {
  return {
    name: "openai",
    model,
    dimensions,
    async embed(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return [];
      if (!env.OPENAI_API_KEY) {
        throw new AIProviderError("OPENAI_API_KEY is not configured", "openai", false);
      }

      const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

      try {
        const response = await client.embeddings.create(
          { model, input: texts, dimensions },
          { signal: controller.signal },
        );

        const vectors = response.data
          .sort((a, b) => a.index - b.index)
          .map((item) => item.embedding);

        if (vectors.length !== texts.length) {
          throw new AIProviderError(
            "OpenAI returned a different number of embeddings than requested",
            "openai",
            false,
          );
        }

        return vectors;
      } catch (err) {
        if (err instanceof AIProviderError) throw err;
        if (err instanceof APIError) {
          throw new AIProviderError(err.message, "openai", isTransientStatus(err.status), {
            status: err.status,
          });
        }
        if (err instanceof Error && err.name === "AbortError") {
          throw new AIProviderError("OpenAI embeddings request timed out", "openai", true);
        }
        throw new AIProviderError(
          err instanceof Error ? err.message : "Unknown OpenAI embeddings error",
          "openai",
          true,
        );
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

let cachedProvider: EmbeddingProvider | null = null;

/** Embedding provider built from env config (AI_EMBEDDING_MODEL / AI_EMBEDDING_DIMENSIONS). */
export function getEmbeddingProvider(): EmbeddingProvider {
  if (cachedProvider) return cachedProvider;
  cachedProvider = createOpenAIEmbeddingProvider(
    env.AI_EMBEDDING_MODEL,
    env.AI_EMBEDDING_DIMENSIONS,
  );
  return cachedProvider;
}
