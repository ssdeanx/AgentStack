# MastraScorer

`MastraScorer` is the base class for scorers and is typically created via `createScorer`. It implements `.run()` which executes the pipeline (preprocess → analyze → generateScore → generateReason) and returns an object with `score`, `reason`, `preprocessStepResult`, `analyzeStepResult`, etc.

Example:

```typescript
const scorer = createScorer({ name: "Quality Scorer" })
  .preprocess(({ run }) => ({ wordCount: run.output.split(" ").length }))
  .analyze(({ run, results }) => ({ hasSubstance: results.preprocessStepResult.wordCount > 10 }))
  .generateScore(({ results }) => (results.analyzeStepResult.hasSubstance ? 1 : 0))
  .generateReason(({ score, results }) => `Score: ${score}.`);

const result = await scorer.run({ input: "...", output: "..." });
console.log(result.score);
```

*Source: Mastra docs — reference/evals/mastra-scorer.mdx*