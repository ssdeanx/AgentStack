# Evals

This folder contains evaluation helpers and prebuilt scorers aligned with Mastra's evals reference.

Purpose: Provide scorer utils, prebuilt scorers (bias, completeness, prompt-alignment, tool-call-accuracy, noise-sensitivity), and runEvals helper exports for local experiments and CI tests.

Guidelines:
- Use `createScorer` and `runEvals` from `@mastra/core/evals` when building scorers.
- Keep prebuilt scorers small and well-tested; use judge (LLM) configuration for LLM-based scorers.
