# Evals

This folder contains evaluation helpers and prebuilt scorers aligned with Mastra's evals reference.

Purpose: Provide scorer utils, prebuilt scorers (bias, completeness, prompt-alignment, tool-call-accuracy, noise-sensitivity), and typed local experiment helpers for CI and manual evaluation.

Guidelines:

- Use `createScorer` and `runEvals` from `@mastra/core/evals` when building scorers.
- Keep prebuilt scorers small and well-tested; use judge (LLM) configuration for LLM-based scorers.
- For this repo's local agent experiments, prefer `agent.generate(..., { returnScorerData: true })` followed by `scorer.run(...)` using the returned `scoringData` payloads. This is the currently verified production-safe path for the installed Mastra version.
- For dataset-style/manual batch runs against agents, the installed Mastra typings support `runEvals<TAgent extends Agent>({ data, scorers, target })`. Each dataset item should be shaped like `{ input, groundTruth?, requestContext?: RequestContext }`.
- All judge-backed scorers in this folder should use the explicit model string `google/gemini-3.1-flash-lite-preview` unless there is a documented reason to diverge.
- Custom scorers intended for agent outputs should declare `type: 'agent'` so `run.output` / `run.input` use `ScorerRunOutputForAgent` / `ScorerRunInputForAgent` instead of falling back to weak inference.
- Avoid `any`/unsafe request-context access in scorers; narrow `requestContext`, parsed JSON output, and message content explicitly.

Local Prebuilt Scorers (registered in Mastra instance):

- completeness (createCompletenessScorer) — see src/mastra/evals/scorers/prebuilt.ts
- keywordCoverage (keywordCoverageScorer) — src/mastra/evals/scorers/keyword-coverage.ts and docs/evals/keyword-coverage.md
- textualDifference (createTextualDifferenceScorer) — src/mastra/evals/scorers/prebuilt.ts and docs/evals/textual-difference.md
- noiseSensitivity (createNoiseSensitivityScorerLLM) — src/mastra/evals/scorers/prebuilt.ts and docs/evals/noise-sensitivity.md
- toolCallAccuracy (createToolCallAccuracyScorerCode) — src/mastra/evals/scorers/prebuilt.ts and docs/evals/overview.md (tool-call-accuracy ref)
- sourceDiversity (sourceDiversityScorer) — src/mastra/evals/scorers/custom-scorers.ts
- toneConsistency (createToneScorer) — src/mastra/evals/scorers/prebuilt.ts and docs/evals/tone-consistency.md
- toolCallAccuracy (code & LLM) — src/mastra/evals/scorers/prebuilt.ts and docs/evals/tool-call-accuracy.md
- contextRelevance (createContextRelevanceScorerLLM) — docs/evals/context-relevance.md
- contextPrecision (createContextPrecisionScorer) — docs/evals/context-precision.md

Docs & local references:

- docs/evals/overview.md — Scorers overview and live evaluations
- docs/evals/custom-scorers.md — How to create custom scorers (createScorer)
- docs/evals/built-in-scorers.md — List of built-in scorers
- docs/evals/keyword-coverage.md — Keyword coverage reference
- docs/evals/textual-difference.md — Textual difference reference
- docs/evals/noise-sensitivity.md — Noise sensitivity reference
- docs/evals/scorer-utils.md — Helper utilities and test helpers

Add new experiments in `src/mastra/evals/agent-experiments.ts` for targeted scorer experiments (keyword coverage, textual difference, source diversity). Keep experiment helpers aligned with the installed Mastra eval typings and verify changes with targeted `get_errors` on `src/mastra/evals`.
