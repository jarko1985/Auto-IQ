# ADR-005: OpenAI Primary, Claude Fallback

**Status:** Accepted  
**Date:** 2026-07-17

## Context

AI-powered diagnostics require a capable LLM. A single provider creates an availability risk. Structured JSON output and Zod validation are mandatory for safety.

## Decision

OpenAI as primary provider, Anthropic Claude as fallback, both behind a shared `AIProvider` interface. Provider selection is runtime-configurable via env vars (`AI_PRIMARY_PROVIDER`, `AI_FALLBACK_PROVIDER`).

```ts
interface AIProvider {
  generateStructured<TInput, TOutput>(
    input: TInput,
    schema: ZodSchema<TOutput>,
    options?: AIRequestOptions,
  ): Promise<AIResult<TOutput>>;
}
```

## Consequences

- Provider SDKs live only in `lib/ai/` — never in client code or route handlers.
- Retry for transient errors (429, 5xx) before falling back to Claude.
- Never silently switch providers on validation failures — log the reason.
- All AI outputs validated with Zod; rejected outputs increment an error metric and trigger fallback or safe degraded response.
- Prompt versions tracked in `PromptVersion` table; every AI call stores `provider`, `model`, `promptVersion`, `knowledgeDocumentIds`.
- AI must not: guarantee diagnosis, invent inventory/prices, book/charge/refund, override safety rules.
