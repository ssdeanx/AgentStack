# Example: Bird Checker (Evaluation)

This example demonstrates using a simple scorer in a small Next.js example that verifies whether an image is a bird and the species.

Key files shown from the example: `lib/evals/index.eval.ts` — defines an Eval with a `containsScorer` that checks `bird` boolean and species substring matching.

containsScorer (concept):

```ts
const containsScorer = ({ output, expected }) => {
  const birdDataCorrect = output?.bird === expected?.bird;
  const speciesDataCorrect = output?.species?.toLocaleLowerCase()?.includes(expected?.species?.toLocaleLowerCase());
  return { name: 'containsScorer', score: birdDataCorrect && speciesDataCorrect ? 1 : 0 };
};

Eval("Is a bird", { data: () => [ /* pairs */ ], task: async (input) => { /* call agent */ }, scores: [containsScorer] });
```

The example also shows integration with Mastra agents and a simple Vitest-compatible evaluation runner using `braintrust` Eval wrapper.

Important: Do not fetch or validate external image URLs during tests or CI. Instead:

- Use local test assets or data URIs
- Mock network responses (e.g., mock fetch or the image loader)
- Avoid external network access in CI for deterministic tests

Example IMAGES object (use placeholders or local paths in tests):

```ts
export const IMAGES = {
  notBird: {
    bird: false,
    species: "Panthera leo",
    image: "IMAGE_URL_PLACEHOLDER_NOTBIRD" // Replace with local test asset or mock
  },
  isBird: {
    bird: true,
    species: "Ardea herodias",
    image: "IMAGE_URL_PLACEHOLDER_ISBIRD" // Replace with local test asset or mock
  }
};
```

Agent example (configure model to gemini-2.5-flash-lite for tests):

```ts
import { Agent } from "@mastra/core/agent";
import { gemini } from "@ai-sdk/google";

export const birdAgent = new Agent({
  id: "bird-agent",
  name: "Bird Agent",
  instructions:
    "You can view an image and figure out if it is a bird or not. You can also figure out the species of the bird and where the picture was taken.",
  model: gemini("gemini-2.5-flash-lite"),
});
```

Source files included in the example (selected):

- lib/evals/index.eval.ts — eval definition and scorer
- lib/mastra/actions.ts — queries Mastra agent to classify images (mock network calls in tests)
- mastra/agents/index.ts — birdAgent definition

*Example source: examples/bird-checker-with-nextjs-and-eval*