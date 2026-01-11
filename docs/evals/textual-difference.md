# Textual Difference Scorer

The `createTextualDifferenceScorer()` function uses sequence matching to measure textual differences between expected and actual outputs. It produces metrics for similarity, changes required, length differences, and confidence.

## Parameters

The `createTextualDifferenceScorer()` function does not take any options.

This function returns an instance of `MastraScorer`. See the [MastraScorer reference](./mastra-scorer.md) for details on the `.run()` method and its input/output.

## .run() Returns

- runId: string — The id of the run (optional)
- analyzeStepResult: object — { confidence: number, ratio: number, changes: number, lengthDiff: number }
- score: number — Similarity ratio (0-1) where 1 indicates identical texts.

## Scoring Details

### Scoring Process

1. Analyzes textual differences:

- Performs sequence matching between input and output
- Counts the number of change operations required
- Measures length differences

2. Calculates metrics:

- Computes similarity ratio
- Determines confidence score
- Combines into weighted score

Final score: `(similarity_ratio * confidence) * scale`

### Score interpretation

A textual difference score between 0 and 1:

- 1.0: Identical texts — no differences detected.
- 0.7–0.9: Minor differences — few changes needed.
- 0.4–0.6: Moderate differences — noticeable changes required.
- 0.1–0.3: Major differences — extensive changes needed.
- 0.0: Completely different texts.

## Example

Measure textual differences between expected and actual agent outputs (use local data/ground-truth in CI):

```typescript
import { runEvals } from "@mastra/core/evals";
import { createTextualDifferenceScorer } from "@mastra/evals/scorers/prebuilt";

const scorer = createTextualDifferenceScorer();
const result = await runEvals({
  data: [
    { input: "Summarize the concept of recursion", groundTruth: "Recursion is when a function calls itself to solve a problem by breaking it into smaller subproblems." },
    { input: "What is the capital of France?", groundTruth: "The capital of France is Paris." },
  ],
  scorers: [scorer],
  target: myAgent,
});

console.log(result.scores);
```

*Source: Mastra docs — reference/v1/evals/textual-difference*