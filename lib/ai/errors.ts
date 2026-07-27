import { AppError } from "@/lib/errors";
import type { AIProviderName } from "./types";

export class AIProviderError extends AppError {
  constructor(
    message: string,
    public readonly provider: AIProviderName,
    public readonly transient: boolean,
    details?: unknown,
  ) {
    super(message, "AI_PROVIDER_ERROR", 502, details);
    this.name = "AIProviderError";
  }
}

/** Structured output failed Zod validation — never transient, always logged before falling back. */
export class AIValidationError extends AIProviderError {
  constructor(message: string, provider: AIProviderName, details?: unknown) {
    super(message, provider, false, details);
    this.name = "AIValidationError";
  }
}
