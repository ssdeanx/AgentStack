---
title: "Reference: Run.stream() | Streaming | Mastra Docs v1 Beta"
source: "https://mastra.ai/reference/v1/streaming/workflows/stream"
author:
published:
created: 2026-01-13
description: "Mastra v1 Beta: Documentation for the `Run.stream()` method in workflows, which enables real-time streaming of responses."
tags:
  - "clippings"
---
The `.stream()` method enables real-time streaming of responses from a workflow. It returns a `ReadableStream` of events directly.

## Usage example

```typescript
const run = await workflow.createRun();

const stream = await run.stream({
  inputData: {
    value: "initial data",
  },
});

for await (const chunk of stream) {
  console.log(chunk);
}
```

## Parameters

### inputData?:

z.infer<TInput>

### requestContext?:

RequestContext

### tracingContext?:

TracingContext

### currentSpan?:

Span

### tracingOptions?:

TracingOptions

### metadata?:

Record<string, any>

### requestContextKeys?:

string\[\]

### traceId?:

string

### parentSpanId?:

string

### tags?:

string\[\]

### closeOnSuspend?:

boolean

## Returns

Returns a `WorkflowRunOutput` object that implements the async iterable interface (can be used directly in `for await...of` loops) and provides access to the stream and workflow execution results.

### fullStream:

ReadableStream<WorkflowStreamEvent>

### result:

Promise<WorkflowResult<TState, TInput, TOutput, TSteps>>

### status:

WorkflowRunStatus

### usage:

Promise<{ inputTokens: number; outputTokens: number; totalTokens: number, reasoningTokens?: number, cachedInputTokens?: number }>

## Extended usage example

```typescript
const run = await workflow.createRun();

const stream = run.stream({
  inputData: {
    value: "initial data",
  },
});

// Iterate over stream events (you can iterate over stream directly or use stream.fullStream)
for await (const chunk of stream) {
  console.log(chunk);
}

// Access the final result
const result = await stream.result;
console.log("Final result:", result);

// Access token usage
const usage = await stream.usage;
console.log("Token usage:", usage);

// Check current status
console.log("Status:", stream.status);
```

## Stream Events

The stream emits various event types during workflow execution. Each event has a `type` field and a `payload` containing relevant data:

- **`workflow-start`**: Workflow execution begins
- **`workflow-step-start`**: A step begins execution
- **`workflow-step-output`**: Custom output from a step
- **`workflow-step-result`**: A step completes with results
- **`workflow-finish`**: Workflow execution completes with usage statistics
- [Workflows overview](https://mastra.ai/docs/v1/workflows/overview#running-workflows)
- [Workflow.createRun()](https://mastra.ai/reference/v1/workflows/workflow-methods/create-run)
- [Run.resumeStream()](https://mastra.ai/reference/v1/streaming/workflows/resumeStream)