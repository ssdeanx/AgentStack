---
title: "Reference: Run.resumeStream() | Streaming | Mastra Docs v1 Beta"
source: "https://mastra.ai/reference/v1/streaming/workflows/resumeStream"
author:
published:
created: 2026-01-13
description: "Mastra v1 Beta: Documentation for the `Run.resumeStream()` method in workflows, which enables real-time resumption and streaming of suspended workflow runs."
tags:
  - "clippings"
---
The `.resumeStream()` method resumes a suspended workflow run with new data, allowing you to continue execution from a specific step and to observe the stream of events.

## Usage example

```typescript
const run = await workflow.createRun();

const stream = run.stream({
  inputData: {
    value: "initial data",
  },
});

const result = await stream.result;

if (result!.status === "suspended") {
  const resumedStream = await run.resumeStream({
    resumeData: {
      value: "resume data",
    },
  });
}
```

## Parameters

### resumeData?:

z.infer<TInput>

### requestContext?:

RequestContext

### step?:

Step<string, any, any, any, any, TEngineType>

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

## Returns

### stream:

MastraWorkflowStream<ChunkType>

### stream.status:

Promise<RunStatus>

### stream.result:

Promise<WorkflowResult<TState, TOutput, TSteps>>

### stream.usage:

Promise<{ inputTokens: number; outputTokens: number; totalTokens: number, reasoningTokens?: number, cacheInputTokens?: number }>

## Stream Events

The stream emits various event types during workflow execution. Each event has a `type` field and a `payload` containing relevant data:

- **`workflow-start`**: Workflow execution begins
- **`workflow-step-start`**: A step begins execution
- **`workflow-step-output`**: Custom output from a step
- **`workflow-step-result`**: A step completes with results
- **`workflow-finish`**: Workflow execution completes with usage statistics

## Related

- [Workflows overview](https://mastra.ai/docs/v1/workflows/overview#running-workflows)
- [Workflow.createRun()](https://mastra.ai/reference/v1/workflows/workflow-methods/create-run)
- [Run.stream()](https://mastra.ai/reference/v1/streaming/workflows/stream)