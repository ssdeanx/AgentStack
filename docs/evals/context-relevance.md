# Context Relevance Scorer

The `createContextRelevanceScorerLLM()` evaluates how relevant and useful provided context was for generating agent responses. It uses weighted relevance levels and applies penalties for unused high-relevance context and missing information.

Parameters:
- model: MastraModelConfig — LLM to use for evaluation
- options: ContextRelevanceOptions — configuration (either `context` or `contextExtractor` must be provided)

Scoring details:
- Relevance levels: high (1.0), medium (0.7), low (0.3), none (0.0)
- Tracks usage of context in response and applies penalties:
  - unusedHighRelevanceContext (default 0.1)
  - missingContextPerItem (default 0.15)
  - maxMissingContextPenalty (default 0.5)

Scoring formula:
- Base Score = Σ(relevance_weights) / (num_contexts × 1.0)
- Final Score = max(0, Base Score - Usage Penalty - Missing Penalty) × scale

Score interpretation:
- 0.9–1.0: Excellent
- 0.7–0.8: Good
- 0.4–0.6: Mixed
- 0.2–0.3: Poor
- 0.0–0.1: Very poor

Use cases:
- Content generation evaluation
- RAG pipelines where context usage matters

*Source: Mastra docs — reference/v1/evals/context-relevance*