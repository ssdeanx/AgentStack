# Tone Consistency Scorer

The `createToneScorer()` evaluates emotional tone and sentiment consistency. It supports two modes:

- Comparison mode: compares sentiment between input and output (response vs reference)
- Stability mode: analyzes sentiment variance within a single text for tone stability

.run() returns:
- runId: string
- analyzeStepResult: { responseSentiment?, referenceSentiment?, difference?, avgSentiment?, sentimentVariance? }
- score: number (0-1)

Scoring process:
1. Extract sentiment features
2. Compute sentiment scores for input and output or across sentences
3. Mode-specific scoring: 1 - (sentiment_difference / max_difference) or 1 - (variance / max_variance)

Score interpretation:
- 1.0: Perfect consistency
- 0.7–0.9: Strong consistency
- 0.4–0.6: Moderate consistency
- 0.0–0.3: Poor consistency

*Source: Mastra docs — reference/v1/evals/tone-consistency*