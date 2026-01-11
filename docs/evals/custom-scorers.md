# Custom Scorers

Mastra provides a unified `createScorer` factory that allows you to build custom evaluation logic using either JavaScript functions or LLM-based prompt objects for each step. Scorers follow a 4-step pipeline: preprocess → analyze → generateScore → generateReason.

Key points:

- Steps may be implemented as deterministic functions (JS) or as prompt objects (LLM): mix-and-match as needed.
- `generateScore` is required; other steps are optional.
- Use `judge` config for LLM-based steps (model + instructions).
- Use `type: 'agent'` for agent-typed scorers to get typed inputs/outputs.

Example (gluten checker):

```typescript
import { createScorer } from '@mastra/core/evals';
import { z } from 'zod';

export const glutenCheckerScorer = createScorer({
  name: 'Gluten Checker',
  description: 'Check if the output contains any gluten',
  judge: {
    model: 'gemini-2.5-flash-lite',
    instructions: 'You are a Chef that identifies if recipes contain gluten.'
  }
})
.analyze({ /* prompt object or function */ })
.generateScore(({ results }) => {
  return results.analyzeStepResult.isGlutenFree ? 1 : 0;
})
.generateReason({ /* optional */ });
```

For full detail, examples, and API options, see: reference/v1/evals/create-scorer and docs/v1/evals/custom-scorers.

---

*Source: Mastra docs — evals/custom-scorers.mdx*