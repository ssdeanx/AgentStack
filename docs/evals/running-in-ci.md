# Running Scorers in CI

Running scorers in CI helps you track agent quality over time and ensure regressions don't slip through. Use `runEvals` within your test framework (Vitest/Jest) to run suites of test cases and assert thresholds.

Basic pattern:

1. Create test cases with `input` and optional `groundTruth`.
2. Use `runEvals` to run the data against your target and scorers.
3. Assert average/aggregate scorer results or per-item metrics.

Example (Vitest):

```typescript
import { describe, it, expect } from 'vitest';
import { createScorer, runEvals } from "@mastra/core/evals";

it('should correctly extract locations', async () => {
  const result = await runEvals({
    data: [{ input: 'weather in Berlin', groundTruth: {} }],
    target: weatherAgent,
    scorers: [locationScorer],
  });

  expect(result.scores['location-accuracy']).toBe(1);
});
```

Tip: Add noise-sensitivity tests and model comparisons in CI to prevent regressions in robustness.

*Source: Mastra docs — evals/running-in-ci.mdx*