---
title: "Reference: ChunkType | Streaming | Mastra Docs v1 Beta"
source: "https://mastra.ai/reference/v1/streaming/ChunkType"
author:
published:
created: 2026-01-13
description: "Mastra v1 Beta: Documentation for the ChunkType type used in Mastra streaming responses, defining all possible chunk types and their payloads."
tags:
  - "clippings"
---
The `ChunkType` type defines the mastra format of stream chunks that can be emitted during streaming responses from agents.

## Base Properties

All chunks include these base properties:

### type:

string

### runId:

string

### from:

ChunkFrom

enum

### AGENT:

'AGENT'

### USER:

'USER'

### SYSTEM:

'SYSTEM'

### WORKFLOW:

'WORKFLOW'

## Text Chunks

### text-start

Signals the beginning of text generation.

### text-delta

Incremental text content during generation.

### text-end

Signals the end of text generation.

## Reasoning Chunks

### reasoning-start

Signals the beginning of reasoning generation (for models that support reasoning).

### reasoning-delta

Incremental reasoning text during generation.

### reasoning-end

Signals the end of reasoning generation.

### reasoning-signature

Contains the reasoning signature from models that support advanced reasoning (like OpenAI's o1 series). The signature represents metadata about the model's internal reasoning process, such as effort level or reasoning approach, but not the actual reasoning content itself.

## Tool Chunks

### tool-call

A tool is being called.

### tool-result

Result from a tool execution.

### tool-call-input-streaming-start

Signals the start of streaming tool call arguments.

### tool-call-delta

Incremental tool call arguments during streaming.

### tool-call-input-streaming-end

Signals the end of streaming tool call arguments.

An error occurred during tool execution.

## Source and File Chunks

### source

Contains source information for content.

### file

Contains file data.

## Control Chunks

### start

Signals the start of streaming.

### type:

"start"

### step-start

Signals the start of a processing step.

### type:

"step-start"

### step-finish

Signals the completion of a processing step.

### raw

Contains raw data from the provider.

### type:

"raw"

### finish

Stream has completed successfully.

### type:

"finish"

### error

An error occurred during streaming.

### type:

"error"

### abort

Stream was aborted.

### type:

"abort"

## Object and Output Chunks

### object

Emitted when using output generation with defined schemas. Contains partial or complete structured data that conforms to the specified Zod or JSON schema. This chunk is typically skipped in some execution contexts and used for streaming structured object generation.

### type:

"object"

### object:

PartialSchemaOutput<OUTPUT>

### tool-output

Contains output from agent or workflow execution, particularly used for tracking usage statistics and completion events. Often wraps other chunk types (like finish chunks) to provide nested execution context.

### type:

"tool-output"

### step-output

Contains output from workflow step execution, used primarily for usage tracking and step completion events. Similar to tool-output but specifically for individual workflow steps.

### type:

"step-output"

Contains metadata about the LLM provider's response. Emitted by some providers after text generation to provide additional context like model ID, timestamps, and response headers. This chunk is used internally for state tracking and doesn't affect message assembly.

### watch

Contains monitoring and observability data from agent execution. Can include workflow state information, execution progress, or other runtime details depending on the context where `stream()` is used.

### type:

"watch"

### tripwire

Emitted when the stream is forcibly terminated due to content being blocked by a processor. This acts as a safety mechanism to prevent harmful or inappropriate content from being streamed. The payload includes information about why the content was blocked and whether a retry was requested.

### type:

"tripwire"

## Usage Example

```typescript
const stream = await agent.stream("Hello");

for await (const chunk of stream.fullStream) {
  switch (chunk.type) {
    case "text-delta":
      console.log("Text:", chunk.payload.text);
      break;

    case "tool-call":
      console.log("Calling tool:", chunk.payload.toolName);
      break;

    case "tool-result":
      console.log("Tool result:", chunk.payload.result);
      break;

    case "reasoning-delta":
      console.log("Reasoning:", chunk.payload.text);
      break;

    case "finish":
      console.log("Finished:", chunk.payload.stepResult.reason);
      console.log("Usage:", chunk.payload.output.usage);
      break;

    case "error":
      console.error("Error:", chunk.payload.error);
      break;
  }
}
```
- [.stream()](https://mastra.ai/reference/v1/streaming/agents/stream) - Method that returns streams emitting these chunks
- [MastraModelOutput](https://mastra.ai/reference/v1/streaming/agents/MastraModelOutput) - The stream object that emits these chunks
- [workflow.stream()](https://mastra.ai/reference/v1/streaming/workflows/stream) - Method that returns streams emitting these chunks for workflows