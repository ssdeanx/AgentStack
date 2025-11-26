# Context: Network-Ready Workflows Feature (Master Level)

## Feature Overview

Creating 6 production-ready workflows showcasing ALL Mastra workflow capabilities:

- **Streaming:** Real-time progress via `writer` argument
- **AI Tracing:** Child spans via `tracingContext`
- **Control Flow:** All patterns (then, branch, parallel, dowhile, foreach, suspend/resume)
- **Network Integration:** Seamless routing with clear schemas

## Current State

**Existing Workflows (5):**

- weather-workflow.ts (Sequential with `.then()`)
- content-studio-workflow.ts (Sequential with `.dowhile()`)
- changelog.ts
- new-contributor.ts
- telephone-game.ts

**Existing Networks (4):**

- agentNetwork (Primary routing)
- dataPipelineNetwork (CSV/JSON operations)
- reportGenerationNetwork (Report workflows)
- researchPipelineNetwork (Research papers)

**Target: 6 New Workflows:**

| Workflow | Technique | Description |
|----------|-----------|-------------|
| stockAnalysisWorkflow | `.then()` + retries | Sequential stock analysis |
| documentProcessingWorkflow | `.branch()` + `.map()` | Conditional PDF/text processing |
| contentReviewWorkflow | `.dowhile()` + state | Quality loop with iteration tracking |
| financialReportWorkflow | `.parallel()` | Concurrent data fetching |
| researchSynthesisWorkflow | `.foreach()` | Multi-topic research with rate limiting |
| learningExtractionWorkflow | `suspend()`/`resume()` | Human-in-the-loop approval |

## Control Flow Techniques Reference

### 1. Sequential (`.then()`)

```typescript
workflow
  .then(step1)
  .then(step2)
  .then(step3)
  .commit();
```

### 2. Conditional (`.branch()`)

```typescript
workflow
  .branch([
    [async ({ inputData }) => condition1, stepA],
    [async ({ inputData }) => condition2, stepB]
  ])
  .commit();
```

### 3. Schema Transformation (`.map()`)

```typescript
workflow
  .then(step1)
  .map(async ({ inputData }) => ({
    transformedField: inputData.originalField
  }))
  .then(step2)
  .commit();
```

### 4. Parallel (`.parallel()`)

```typescript
workflow
  .parallel([stepA, stepB, stepC])
  .then(mergeStep) // Access via inputData['step-id']
  .commit();
```

### 5. Loop Until (`.dountil()`)

```typescript
workflow
  .dountil(step, async ({ inputData }) => inputData.value > 10)
  .commit();
```

### 6. Loop While (`.dowhile()`)

```typescript
workflow
  .then(step1)
  .dowhile(refineStep, async ({ inputData }) => inputData.score < threshold)
  .commit();
```

### 7. ForEach (`.foreach()`)

```typescript
workflow
  .foreach(processItemStep, { concurrency: 2 })
  .then(aggregateStep)
  .commit();
```

### 8. Suspend/Resume

```typescript
const step = createStep({
  suspendSchema: z.object({ message: z.string() }),
  resumeSchema: z.object({ approved: z.boolean() }),
  execute: async ({ inputData, resumeData, suspend }) => {
    if (!resumeData?.approved) {
      return await suspend({ message: 'Approval needed' });
    }
    return { result: 'approved' };
  }
});
```

## Streaming Patterns

### Writer Events

```typescript
execute: async ({ inputData, writer }) => {
  await writer?.write({ type: 'step-start', stepId: 'my-step' });
  await writer?.write({ type: 'progress', percent: 50, message: 'Processing...' });
  await writer?.write({ type: 'step-complete', stepId: 'my-step', success: true });
  return result;
}
```

### Event Types

- `step-start`: Beginning of step
- `progress`: Incremental progress (0-100%)
- `step-complete`: Successful completion
- `step-error`: Failure with error info
- `iteration`: Loop iteration info
- `parallel-progress`: Status of parallel branches
- `topic-progress`: ForEach item progress
- `suspend-request`: HITL approval needed

## AI Tracing Patterns

### Child Span Creation

```typescript
execute: async ({ inputData, tracingContext }) => {
  const span = tracingContext.currentSpan?.createChildSpan({
    type: 'generic',
    name: 'api-call',
    input: { url },
    metadata: { service: 'polygon' }
  });
  
  try {
    const result = await fetchData();
    span?.end({ output: result });
    return result;
  } catch (error) {
    span?.error({ error, endSpan: true });
    throw error;
  }
}
```

### Workflow Options

```typescript
const workflow = createWorkflow({
  id: 'my-workflow',
  options: {
    tracingPolicy: { internal: InternalSpans.NONE },
    validateInputs: true
  }
})
```

## Dependencies

**Internal:**

- src/mastra/agents/* (23 existing agents)
- src/mastra/tools/* (30+ existing tools)
- src/mastra/config/* (models, storage, tracing)

**External (already installed):**

- @mastra/core/workflows (createStep, createWorkflow)
- @mastra/core/ai-tracing (InternalSpans)
- zod (schema validation)

## Implementation Checklist

### Per Workflow

- [ ] Create step files with proper schemas
- [ ] Implement streaming via `writer`
- [ ] Add AI tracing with child spans
- [ ] Add step-level retries for API calls
- [ ] Export from workflows/index.ts
- [ ] Add to appropriate networks
- [ ] Register in mastra/index.ts

### Testing

- [ ] Input validation tests
- [ ] Happy path execution tests
- [ ] Streaming event verification
- [ ] Error handling tests

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| API rate limits | Step-level retries, foreach concurrency |
| Large documents | Chunking with progress streaming |
| Infinite loops | Max iterations safeguard |
| Parallel failures | Individual step error handling |
| HITL timeouts | suspendSchema with timestamps |
| Missing spans | try/catch with span?.error() |

## Network Integration Matrix

| Workflow | agentNetwork | dataPipelineNetwork | reportGenerationNetwork | researchPipelineNetwork |
|----------|:------------:|:-------------------:|:-----------------------:|:-----------------------:|
| stockAnalysis | ✓ | ✓ | | |
| documentProcessing | | ✓ | | ✓ |
| contentReview | | | ✓ | |
| financialReport | ✓ | | ✓ | |
| researchSynthesis | | | ✓ | ✓ |
| learningExtraction | | ✓ | | |
