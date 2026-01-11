# Scorer Utils

Utility functions for extracting and processing data in scorer `preprocess` and analysis steps.

Common utilities (from `@mastra/evals/scorers/utils`):

- getAssistantMessageFromRunOutput(output)
- getUserMessageFromRunInput(input)
- getReasoningFromRunOutput(output)
- getCombinedSystemPrompt(input)
- extractToolCalls(run.output)
- extractInputMessages(run.input)
- extractAgentResponseMessages(run.output)
- createTestMessage / createAgentTestRun helpers for tests

Example usage in preprocess:

```typescript
.preprocess(({ run }) => {
  const response = getAssistantMessageFromRunOutput(run.output);
  const systemPrompt = getCombinedSystemPrompt(run.input);
  return { response, systemPrompt };
})
```

Also includes helpers for generating test runs for unit testing scorers.

*Source: Mastra docs — reference/evals/scorer-utils.mdx*