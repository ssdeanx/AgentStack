# createScorer

`createScorer` is the factory for building custom scorers. It returns a builder that you can chain step methods onto: preprocess → analyze → generateScore → generateReason. You must provide at least a `generateScore` step.

Options:
- id (string) — Unique scorer id
- name (string) — Optional, defaults to id
- description (string)
- judge (object) — Optional judge configuration for LLM-based steps: { model, instructions }
- type (string) — Use `type: 'agent'` for automatic agent typing

Judge object:
- model: LanguageModel instance
- instructions: string — system prompt for LLM judge

Type safety:
- Use `type: 'agent'` to get `ScorerRunInputForAgent` and `ScorerRunOutputForAgent` types
- Use generics for custom input/output types

Step methods:
- preprocess (optional): function or prompt object
- analyze (optional): function or prompt object
- generateScore (required): function or prompt object (must return number)
  - When using prompt object mode, also provide `calculateScore` to convert LLM output to a number
- generateReason (optional): function or prompt object

All step functions can be async. Use `createScorer` to produce reusable, type-safe, and testable evaluation logic.

*Source: Mastra docs — reference/v1/evals/create-scorer*