<!-- AGENTS-META {"title":"Mastra Workflows","version":"2.0.0","applies_to":"/src/mastra/workflows","last_updated":"2025-11-26T00:00:00Z","status":"stable"} -->

# Workflows (`/src/mastra/workflows`)

## Persona

Workflow Engineer — objective: Orchestrate tools and agents into reliable, testable multi-step processes.

## Purpose

Workflows orchestrate agents and tools into multi-step scenarios (e.g., data ingestion → indexing → RAG retrieval → evaluation) and implement long-running or stateful operations where necessary.

## Key Files (10 Workflows)

| File                              | Export                      | Purpose                                                                             | Features                                    |
| --------------------------------- | --------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------- |
| `weather-workflow.ts`             | `weatherWorkflow`           | Multi-step weather forecast with activity planning                                  | Basic sequential workflow                   |
| `content-studio-workflow.ts`      | `contentStudioWorkflow`     | Orchestrates content creation using research, strategy, and scripting agents        | Agent coordination                          |
| `content-review-workflow.ts`      | `contentReviewWorkflow`     | Content creation with iterative quality review                                      | `.dowhile()` loop for refinement            |
| `document-processing-workflow.ts` | `documentProcessingWorkflow`| Full document ingestion: load → convert → chunk → index                             | `.branch()` for conditional PDF handling    |
| `financial-report-workflow.ts`    | `financialReportWorkflow`   | Multi-source financial reports with parallel data fetching from Polygon/Finnhub     | `.parallel()` for concurrent API calls      |
| `learning-extraction-workflow.ts` | `learningExtractionWorkflow`| Extract learnings from content with human-in-the-loop approval                      | `suspend()`/`resume()` for human approval   |
| `research-synthesis-workflow.ts`  | `researchSynthesisWorkflow` | Multi-topic research with synthesis across topics                                   | `.foreach()` for concurrent topic research  |
| `stock-analysis-workflow.ts`      | `stockAnalysisWorkflow`     | Sequential stock analysis with data enrichment at each step                         | Sequential with API integrations            |
| `changelog.ts`                    | `changelogWorkflow`         | Generate changelogs from git diffs using AI                                         | Git integration, Slack notification         |
| `telephone-game.ts`               | `telephoneGameWorkflow`     | Interactive telephone game demonstrating user input workflows                       | User prompts, sequential steps              |

## Workflow Patterns Demonstrated

- **Sequential (`.then()`)**: weatherWorkflow, stockAnalysisWorkflow, changelogWorkflow
- **Parallel (`.parallel()`)**: financialReportWorkflow
- **Conditional Branch (`.branch()`)**: documentProcessingWorkflow  
- **Loop (`.dowhile()`)**: contentReviewWorkflow
- **Iteration (`.foreach()`)**: researchSynthesisWorkflow
- **Human-in-the-Loop (`suspend()`/`resume()`)**: learningExtractionWorkflow

## How to add a workflow

1. Define the workflow using Mastra DSL patterns (see existing workflows).
2. Use tools and agents as building blocks; prefer composition over duplication.
3. Add tests and, where appropriate, add e2e test harnesses to validate integrations.
4. Register in `src/mastra/index.ts` workflows object.

## Execution & debugging

- Workflows are executed by the Mastra runtime and can be invoked in development using `npm run dev` and programmatic calls from the code.
- Use `TracingContext` to instrument workflow steps with spans and useful metadata.
- Access workflows via `/workflow` API route.

## Best practices

- Keep steps idempotent when possible; implement checkpointing for long-running operations.
- Reuse tools across workflows to reduce duplication.
- Add logs and robust error handling.
- Use `writer` for streaming progress updates to clients.

## Standardized Writer Pattern

All workflows must use the following standardized `writer` pattern for consistent progress tracking:

### Step Start

```typescript
await writer?.custom({
  type: 'data-workflow-step-start',
  data: {
    type: "workflow",
    data: "step-id",
    id: "step-id",
  },
  id: 'step-id'
});
```

### Progress Updates

```typescript
await writer?.custom({
  type: 'data-workflow-progress',
  data: {
    status: "XX%",  // Percentage: "20%", "50%", "90%", "100%"
    message: "Descriptive progress message...",
    stage: "workflow",
  },
  id: 'step-id'
});
```

### Step Complete

```typescript
await writer?.custom({
  type: 'data-workflow-step-complete',
  data: {
    stepId: 'step-id',
    success: true,
    duration: Date.now() - startTime,
  },
  id: 'step-id'
});
```

### Step Error

```typescript
await writer?.custom({
  type: 'data-workflow-step-error',
  data: {
    stepId: 'step-id',
    error: error instanceof Error ? error.message : 'Unknown error',
  },
  id: 'step-id'
});
```

### Pattern Requirements

1. **Always include step-start** at the beginning of each step's execute function
2. **Use percentage-based status** (e.g., "20%", "50%") instead of "in-progress"/"done"
3. **Include step-complete** with success status and duration
4. **Include step-error** in catch blocks
5. **Add progress updates** at logical checkpoints (20%, 50%, 90%, etc.)

### Example Implementation

```typescript
execute: async ({ inputData, writer }) => {
  const startTime = Date.now();
  
  // Step start
  await writer?.custom({
    type: 'data-workflow-step-start',
    data: {
      type: "workflow",
      data: "my-step",
      id: "my-step",
    },
    id: 'my-step'
  });

  try {
    // Progress update
    await writer?.custom({
      type: 'data-workflow-progress',
      data: {
        status: "20%",
        message: "Starting processing...",
        stage: "workflow",
      },
      id: 'my-step'
    });

    // ... step logic ...

    // Completion
    await writer?.custom({
      type: 'data-workflow-step-complete',
      data: {
        stepId: 'my-step',
        success: true,
        duration: Date.now() - startTime,
      },
      id: 'my-step'
    });

    return result;
  } catch (error) {
    // Error handling
    await writer?.custom({
      type: 'data-workflow-step-error',
      data: {
        stepId: 'my-step',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      id: 'my-step'
    });

    throw error;
  }
}
```

---
## Change Log

| Version | Date (UTC) | Changes                                                                      |
| ------- | ---------- | ---------------------------------------------------------------------------- |
| 2.0.0   | 2025-11-26 | Major update: 10 workflows documented with pattern examples and API routes.  |
| 1.1.0   | 2025-11-19 | Added Content Studio workflow.                                               |
| 1.0.0   | 2025-11-14 | Initial version.                                                             |
