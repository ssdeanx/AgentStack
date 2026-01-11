# runEvals

`runEvals` enables batch evaluation of agents and workflows by running multiple test cases against scorers concurrently. Useful for CI testing, model comparisons, and systematic experiments.

Basic usage:

```typescript
import { runEvals } from "@mastra/core/evals";

const result = await runEvals({
  target: myAgent,
  data: [
    { input: "What is machine learning?" },
    { input: "Explain neural networks" },
  ],
  scorers: [myScorer1, myScorer2],
  concurrency: 2,
  onItemComplete: ({ item, targetResult, scorerResults }) => {
    console.log(`Completed: ${item.input}`);
  },
});

console.log(result.scores);
```

Key parameters:

- target: Agent | Workflow
- data: RunEvalsDataItem[] (input, optional groundTruth, optional tracing/request context)
- scorers: MastraScorer[] or WorkflowScorerConfig
- concurrency: number (optional)
- onItemComplete: optional callback

Returns an object with `scores` (averages by scorer) and `summary` including `summary.totalItems`.

*Source: Mastra docs — reference/evals/run-evals.mdx*