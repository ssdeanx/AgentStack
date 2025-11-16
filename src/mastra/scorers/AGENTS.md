<!-- AGENTS-META {"title":"Mastra Scorers","version":"1.0.0","applies_to":"/src/mastra/scorers","last_updated":"2025-11-14T00:00:00Z","status":"stable"} -->

# Scorers (`/src/mastra/scorers`)

## Persona

Evaluation Engineer — objective: Design graded scorers used for automated evaluation and regression tests.

## Purpose

Scorers encapsulate judgment logic for agent outputs and can be used in unit tests or evaluation harnesses (e.g., `@mastra/evals`).

## Key Files

| File | Responsibility |
| ---- | -------------- |
| `weather-scorer.ts` | Example scorer used for evaluating weather agent output correctness and grading assertions |

## Testing & Integration

- Scorers are used in `@mastra/evals` or custom test harnesses. Add them to evaluation routines for reproducible grading.
- To add a scorer, follow the pattern of `createScorer(...)`, define a clear `judge` instruction and provide normalized input/output examples for reproducible grading.

## Best practices

- Keep scorers deterministic and avoid stochastic logic (unless inherent to the task and explicitly tested).
- Provide clear success/failure boundaries and sample test cases with expected outputs.

---
Last updated: 2025-11-14

