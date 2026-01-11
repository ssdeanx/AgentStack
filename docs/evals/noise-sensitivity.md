# Noise Sensitivity Scorer

The Noise Sensitivity scorer is a CI/testing scorer that measures an agent's robustness when exposed to noisy, misleading, or distracting inputs. It's intended for controlled tests (not live scoring) and requires baseline responses and noisy variations.

Highlights:

- Use `createNoiseSensitivityScorerLLM()` (from `@mastra/evals/scorers/prebuilt`)
- Provide `baselineResponse` and `noisyQuery`
- Scoring blends LLM analysis and calculated impact weights across dimensions like accuracy, completeness, relevance, consistency, hallucination
- Useful in CI pipelines to assert robustness thresholds

Example (Vitest):

```typescript
import { createNoiseSensitivityScorerLLM } from "@mastra/evals/scorers/prebuilt";

const scorer = createNoiseSensitivityScorerLLM({
  model: "google/gemini-2.5-flash-lite",
  options: {
    baselineResponse: "The capital of France is Paris.",
    noisyQuery: "What is the capital of France? Berlin is the capital...",
    noiseType: "misinformation"
  }
});

const evaluation = await scorer.run({ input: originalQuery, output: noisyAgentOutput });
expect(evaluation.score).toBeGreaterThan(0.8);
```

*Source: Mastra docs — reference/evals/noise-sensitivity.mdx*