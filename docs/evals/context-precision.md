# Context Precision Scorer

The `createContextPrecisionScorer()` computes Mean Average Precision (MAP) to evaluate both relevance and position of retrieved context pieces.

Parameters:
- model: MastraModelConfig — LLM to use for evaluation
- options: ContextPrecisionMetricOptions — configuration (provide `context` or `contextExtractor`)

Scoring details (MAP):
1. Classify each context piece as relevant/irrelevant
2. For each relevant item at position i, Precision@i = relevant_items_so_far / (i + 1)
3. Average Precision = sum(Precision@k) / R (R = total relevant items)

Score interpretation:
- 0.9–1.0: Excellent precision (relevant items early)
- 0.7–0.8: Good
- 0.4–0.6: Moderate
- 0.1–0.3: Poor
- 0.0: No relevant context found

Use cases:
- RAG system evaluation where ordering matters
- Context window optimization to place relevant items early

*Source: Mastra docs — reference/v1/evals/context-precision*