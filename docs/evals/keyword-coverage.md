# Keyword Coverage Scorer

The `createKeywordCoverageScorer()` evaluates how well an LLM's output covers the important keywords from the input. It analyzes keyword presence and matches while ignoring common words and stop words.

## Parameters

The `createKeywordCoverageScorer()` function does not take any options.

This function returns an instance of `MastraScorer`. See the [MastraScorer reference](./mastra-scorer.md) for details on the `.run()` method and its input/output.

## .run() Returns

- runId: string — The id of the run (optional)
- preprocessStepResult: object — { referenceKeywords: Set<string>, responseKeywords: Set<string> }
- analyzeStepResult: object — { totalKeywords: number, matchedKeywords: number }
- score: number — Coverage score (0-1) representing the proportion of matched keywords.

## Scoring Details

### Scoring Process

1. Processes keywords from input and output:

- Filters out common words and stop words
- Normalizes case and word forms
- Handles special terms and compounds

2. Calculates keyword coverage:

- Matches keywords between texts
- Counts successful matches
- Computes coverage ratio

Final score: `(matched_keywords / total_keywords) * scale`

### Score interpretation

A coverage score between 0 and 1:

- 1.0: Complete coverage — all keywords present.
- 0.7–0.9: High coverage — most keywords included.
- 0.4–0.6: Partial coverage — some keywords present.
- 0.1–0.3: Low coverage — few keywords matched.
- 0.0: No coverage — no keywords found.

### Special Cases

- Empty input/output: Returns score of 1.0 if both empty, 0.0 if only one is empty
- Single word: Treated as a single keyword
- Technical terms: Preserves compound technical terms (e.g., "React.js", "machine learning")
- Case differences: "JavaScript" matches "javascript"
- Common words: Ignored in scoring to focus on meaningful keywords

## Example

Evaluate keyword coverage between input queries and agent responses (use local/mocked examples in CI):

```typescript
import { runEvals } from "@mastra/core/evals";
import { createKeywordCoverageScorer } from "@mastra/evals/scorers/prebuilt";

const scorer = createKeywordCoverageScorer();
const result = await runEvals({
  data: [
    { input: "JavaScript frameworks like React and Vue" },
    { input: "TypeScript offers interfaces, generics, and type inference" },
    { input: "Machine learning models require data preprocessing, feature engineering, and hyperparameter tuning" },
  ],
  scorers: [scorer],
  target: myAgent,
});

console.log(result.scores);
```

*Source: Mastra docs — reference/v1/evals/keyword-coverage*