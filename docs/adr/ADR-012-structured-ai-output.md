# ADR-012: Structured AI Output and Prompt Versioning

**Status:** Accepted  
**Date:** 2026-07-17

## Context

Unstructured LLM text output cannot be safely parsed, audited, or used in downstream business logic. Without version tracking, prompt changes cannot be evaluated or rolled back.

## Decision

Every AI call returns a Zod-validated `DiagnosticResult` struct (defined in auto_iq.md §9.5). Prompts are versioned in a `PromptVersion` table and loaded by version ID at call time. The AI result record stores `provider`, `model`, `promptVersion`, and `knowledgeDocumentIds`.

## Rejection Policy

AI outputs are rejected and logged (never silently ignored) if they contain:

- Invalid confidence totals
- Unknown issue codes or severity values
- Unsupported service or part-category codes
- Untrusted URLs or executable content
- Missing required fields

## Prompt Structure

- `system` — role, platform context, safety constraints
- `diagnostic_reasoning` — symptom context + retrieved knowledge → ranked causes
- `next_question` — determines the next diagnostic question
- `customer_explanation` — plain-language summary for the customer
- `garage_summary` — technical summary for the mechanic
- `fallback` — safe degraded response when providers fail

## Consequences

- Prompts stored as versioned text in `docs/prompts/` and `PromptVersion` records.
- Offline evaluation dataset (`ModelEvaluation`) tracks pass/fail per prompt version.
- Provider comparison runs against the same evaluation dataset.
- Switching model versions requires a new `PromptVersion` entry, not in-place edit.
- Fine-tuning datasets may be generated from `VerifiedRepairOutcome` records after sufficient volume.
