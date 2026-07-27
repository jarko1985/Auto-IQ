import type { ZodType } from "zod";

export type AIProviderName = "openai" | "anthropic";

/** A single vision-capable image input — raw bytes as base64, never a URL
 * (keeps lib/ai/ from needing to know how/where the caller stores files). */
export interface AIImageInput {
  base64: string;
  mimeType: string;
}

export interface AIRequestInput {
  systemPrompt: string;
  userPrompt: string;
  /** Name of the structured output schema, used as the tool/function name for providers that require one. */
  schemaName: string;
  /** Optional images to enrich the user prompt for vision-capable calls.
   * Omitted/empty behaves exactly like a text-only request — no caller is
   * required to pass this. */
  images?: AIImageInput[];
}

export interface AIRequestOptions {
  timeoutMs?: number;
  maxRetries?: number;
  temperature?: number;
  metadata?: Record<string, string>;
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Result returned by a single AIProvider adapter on success. */
export interface AICallResult<TOutput> {
  data: TOutput;
  provider: AIProviderName;
  model: string;
  usage: AIUsage;
  latencyMs: number;
}

export interface AIProvider {
  readonly name: AIProviderName;
  readonly model: string;
  generateStructured<TOutput>(
    input: AIRequestInput,
    schema: ZodType<TOutput>,
    options?: AIRequestOptions,
  ): Promise<AICallResult<TOutput>>;
}

export interface AIAttempt {
  provider: AIProviderName;
  model: string;
  ok: boolean;
  transient?: boolean;
  errorCode?: string;
  latencyMs: number;
}

export type AIOrchestrationResult<TOutput> =
  | ({ ok: true; attempts: AIAttempt[] } & AICallResult<TOutput>)
  | { ok: false; degraded: true; reason: string; attempts: AIAttempt[] };
