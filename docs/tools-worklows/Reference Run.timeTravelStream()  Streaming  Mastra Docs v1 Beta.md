---
title: "Reference: Run.timeTravelStream() | Streaming | Mastra Docs v1 Beta"
source: "https://mastra.ai/reference/v1/streaming/workflows/timeTravelStream"
author:
published:
created: 2026-01-13
description: "Mastra v1 Beta: Documentation for the `Run.timeTravelStream()` method for streaming workflow time travel execution."
tags:
  - "clippings"
---
The `.timeTravelStream()` method re-executes a workflow starting from any specific step with streaming events. This allows you to receive real-time updates during time travel execution while maintaining full visibility into each step's progress.

## Usage example

```typescript
const run = await workflow.createRun();

const output = run.timeTravelStream({
  step: "step2",
  inputData: { value: 10 },
});

// Process events as they arrive
for await (const event of output.fullStream) {
  console.log(event.type, event.payload);
}

// Get the final result
const result = await output.result;
```

## Parameters

All parameters are the same as [`Run.timeTravel()`](https://mastra.ai/reference/v1/workflows/run-methods/timeTravel#parameters). See the [timeTravel reference](https://mastra.ai/reference/v1/workflows/run-methods/timeTravel#parameters) for detailed parameter documentation.

## Returns

### output:

WorkflowRunOutput<WorkflowResult<TState, TInput, TOutput, TSteps>>

### output.fullStream:

ReadableStream<WorkflowStreamEvent>

### output.result:

Promise<WorkflowResult<TState, TInput, TOutput, TSteps>>

### output.traceId?:

string

## Stream events

The stream emits various workflow events during execution:

- `workflow-step-start`: Emitted when a step begins execution
- `workflow-step-finish`: Emitted when a step completes successfully
- `workflow-step-error`: Emitted when a step encounters an error
- `workflow-step-suspended`: Emitted when a step suspends
- Additional events depending on step types (agents, tools, etc.)

## Extended usage examples

### Processing events during time travel

```typescript
const run = await workflow.createRun();

const output = run.timeTravelStream({
  step: "step2",
  inputData: { value: 10 },
});

for await (const event of output.fullStream) {
  switch (event.type) {
    case "workflow-step-start":
      console.log(\`Starting step: ${event.payload.stepName}\`);
      break;
    case "workflow-step-finish":
      console.log(\`Completed step: ${event.payload.stepName}\`);
      break;
    case "workflow-step-error":
      console.error(\`Error in step: ${event.payload.stepName}\`, event.payload.error);
      break;
  }
}

const result = await output.result;
console.log("Time travel completed:", result);
```

### Time travel stream with context

```typescript
const output = run.timeTravelStream({
  step: "step2",
  context: {
    step1: {
      status: "success",
      payload: { value: 0 },
      output: { step1Result: 2 },
      startedAt: Date.now(),
      endedAt: Date.now(),
    },
  },
});

for await (const event of output.fullStream) {
  // Handle events
  console.log(event);
}

const result = await output.result;
```

### Time travel stream with nested workflows

```typescript
const output = run.timeTravelStream({
  step: ["nestedWorkflow", "step3"],
  inputData: { value: 10 },
  nestedStepsContext: {
    nestedWorkflow: {
      step2: {
        status: "success",
        payload: { step1Result: 2 },
        output: { step2Result: 3 },
        startedAt: Date.now(),
        endedAt: Date.now(),
      },
    },
  },
});

for await (const event of output.fullStream) {
  console.log(event.type, event.payload);
}

const result = await output.result;
```

## Notes

- The stream closes automatically when time travel execution completes or encounters an error
- You can process events from the stream while the workflow is still executing
- The `result` promise resolves only after all steps have completed
- Stream events follow the same format as regular workflow streaming
- Time travel streaming requires storage to be configured since it relies on persisted workflow snapshots
- [Run.timeTravel()](https://mastra.ai/reference/v1/workflows/run-methods/timeTravel)
- [Time Travel](https://mastra.ai/docs/v1/workflows/time-travel)
- [Workflow Streaming](https://mastra.ai/docs/v1/streaming/workflow-streaming)
- [Run.stream()](https://mastra.ai/reference/v1/streaming/workflows/stream)
- [Run.resumeStream()](https://mastra.ai/reference/v1/streaming/workflows/resumeStream)