# ADR-006: Hybrid Diagnostic Engine

**Status:** Accepted  
**Date:** 2026-07-17

## Context

Pure LLM diagnosis is unsafe (non-deterministic, can miss critical conditions). Pure rule-based systems cannot handle the long tail of symptom combinations. A hybrid approach balances safety and intelligence.

## Decision

Seven-layer diagnostic pipeline (all layers must run in order):

1. **Deterministic safety rules** — versioned in application data and code. Critical conditions (brake failure, oil pressure, fire, severe overheating, fuel leak, steering loss) force an immediate stop-driving result regardless of LLM output.
2. **Structured symptom and OBD-code rules** — maps known codes to issue codes.
3. **Automotive knowledge retrieval** — pgvector RAG over approved documents.
4. **LLM reasoning** — ranked probable causes with confidence and evidence.
5. **Confidence calibration** — validates confidence totals; rejects implausible outputs.
6. **Business-data matching** — maps causes to available parts and garage services.
7. **Human repair confirmation** — final diagnosis by a qualified mechanic closes the loop.

## Consequences

- Safety rules in Layer 1 cannot be overridden by AI in Layers 4–5.
- Safety rule definitions live in versioned DB records (`DiagnosticRule`), not only in prompts.
- The `DiagnosticResult` Zod schema is the single contract between all layers.
- Invalid AI outputs (unknown issue codes, bad confidence, forbidden content) are rejected and logged.
- Layer 7 verified outcomes feed back into retrieval improvement and evaluation — not direct model retraining.
