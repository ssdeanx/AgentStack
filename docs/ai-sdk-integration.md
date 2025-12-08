# Using Vercel AI SDK with Mastra

This document provides comprehensive guidance on integrating Mastra with Vercel's AI SDK for building agentic UIs. Based on the official Mastra documentation at https://mastra.ai/docs/frameworks/agentic-uis/ai-sdk.

## Overview

Mastra integrates seamlessly with [Vercel's AI SDK](https://sdk.vercel.ai/) to support model routing, React Hooks, and data streaming methods. This enables building sophisticated AI-powered interfaces with real-time streaming capabilities.

## Installation

Install the required packages:

```bash
npm install @mastra/ai-sdk
npm install @ai-sdk/react
```

## Model Routing

When creating agents in Mastra, you can specify any AI SDK-supported model:

```typescript
import { Agent } from "@mastra/core/agent";

export const weatherAgent = new Agent({
  name: "Weather Agent",
  instructions: "Instructions for the agent...",
  model: "openai/gpt-4-turbo",
});
```

See [Using AI SDK with Mastra](https://mastra.ai/models#use-ai-sdk-with-mastra) for more information.

## Streaming Capabilities

### chatRoute()

Use the `chatRoute()` utility to create route handlers that automatically format agent streams into AI SDK-compatible format:

```typescript
import { Mastra } from '@mastra/core/mastra';
import { chatRoute } from "@mastra/ai-sdk";

export const mastra = new Mastra({
  server: {
    apiRoutes: [
      chatRoute({
        path: "/chat",
        agent: "weatherAgent",
      }),
    ],
  },
});
```

### workflowRoute()

For workflows, use `workflowRoute()` to stream workflow executions:

```typescript
import { workflowRoute } from "@mastra/ai-sdk";

export const mastra = new Mastra({
  server: {
    apiRoutes: [
      workflowRoute({
        path: "/workflow",
        workflow: "weatherWorkflow",
        includeTextStreamParts: true,
      }),
    ],
  },
});
```

### networkRoute()

For agent networks, use `networkRoute()`:

```typescript
import { networkRoute } from "@mastra/ai-sdk";

export const mastra = new Mastra({
  server: {
    apiRoutes: [
      networkRoute({
        path: "/network",
        agent: "weatherAgent",
      }),
    ],
  },
});
```

## UI Hooks

### useChat()

The `useChat()` hook handles real-time chat interactions:

```typescript
"use client"
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from 'ai';

export function Chat() {
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: 'http://localhost:4111/chat',
    }),
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage({ text: inputValue });
  };

  return (
    <div>
      <pre>{JSON.stringify(messages, null, 2)}</pre>
      <form onSubmit={handleFormSubmit}>
        <input value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Name of city" />
      </form>
    </div>
  );
}
```

### useCompletion()

For single-turn completions:

```typescript
"use client"
import { useCompletion } from "@ai-sdk/react";

export function Completion() {
  const { completion, input, handleInputChange, handleSubmit } = useCompletion({
    api: "api/completion"
  });

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} placeholder="Name of city" />
      </form>
      <p>Completion result: {completion}</p>
    </div>
  );
}
```

## Custom UI Components

### Data Parts

Mastra streams emit AI SDK-compatible data parts:

- `data-workflow`: Aggregates workflow runs
- `data-network`: Aggregates network runs
- `data-tool-agent`: Nested agent streams
- `data-tool-workflow`: Nested workflow streams
- `data-tool-network`: Nested network streams

### Example Custom Component

```typescript
"use client"
import { useChat } from "@ai-sdk/react";
import { AgentTool } from '../ui/agent-tool';
import { DefaultChatTransport } from 'ai';
import type { AgentDataPart } from "@mastra/ai-sdk";

export default function Page() {
  const { messages } = useChat({
    transport: new DefaultChatTransport({
      api: 'http://localhost:4111/chat',
    }),
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.parts?.map((part, i) => {
            switch (part.type) {
              case 'data-tool-agent':
                return (
                  <AgentTool
                    {...part.data as AgentDataPart}
                    key={`${message.id}-${i}`}
                  />
                );
              default:
                return null;
            }
          })}
        </div>
      ))}
    </div>
  );
}
```

## Custom Tool Streaming

Stream custom data from tool executions:

```typescript
import { createTool } from "@mastra/core/tools";

export const testTool = createTool({
  // ... tool config
  execute: async ({ context, writer }) => {
    await writer?.custom({
      type: "data-tool-progress",
      status: "pending"
    });

    // ... tool logic

    await writer?.custom({
      type: "data-tool-progress",
      status: "success"
    });

    return { value: "" };
  }
});
```

## Stream Transformations

### Manual Transformations

Use `toAISdkFormat()` for manual stream conversion:

```typescript
import { toAISdkFormat } from "@mastra/ai-sdk";

const stream = await myAgent.stream(messages);
const uiMessageStream = createUIMessageStream({
  execute: async ({ writer }) => {
    for await (const part of toAISdkFormat(stream, { from: "agent" })) {
      writer.write(part);
    }
  },
});
```

### Client-Side Transformations

For client-side streams:

```typescript
import { toAISdkFormat } from "@mastra/ai-sdk";

const response = await agent.stream({ messages: "What is the weather in Tokyo" });
const chunkStream = new ReadableStream({
  start(controller) {
    response.processDataStream({
      onChunk: async (chunk) => {
        controller.enqueue(chunk as ChunkType);
      },
    }).finally(() => controller.close());
  },
});

const uiMessageStream = createUIMessageStream({
  execute: async ({ writer }) => {
    for await (const part of toAISdkFormat(chunkStream, { from: "agent" })) {
      writer.write(part);
    }
  },
});
```

## Memory and Context

### Agent Memory

Configure memory for agents:

```typescript
chatRoute({
  path: "/chat/:agentId",
  defaultOptions: {
    memory: {
      thread: {
        id: ':agentIdChat',
        resourceId: 'chat',
        metadata: { agent: ':agentId' }
      },
      resource: "chat",
      options: {
        lastMessages: 500,
        semanticRecall: true,
        workingMemory: { enabled: true },
        threads: { generateTitle: true }
      },
      readOnly: false,
    },
  },
})
```

### Runtime Context

Pass additional data via middleware:

```typescript
// Server middleware
async (c, next) => {
  const runtimeContext = c.get("runtimeContext");

  if (c.req.method === "POST") {
    try {
      const clonedReq = c.req.raw.clone();
      const body = await clonedReq.json();

      if (body?.data) {
        for (const [key, value] of Object.entries(body.data)) {
          runtimeContext.set(key, value);
        }
      }
    } catch {
      // handle error
    }
  }
  await next();
}
```

## Migration from AI SDK v4 to v5

### Automatic Handling

Mastra automatically handles message format conversion between AI SDK versions.

### Manual Conversion

Use `convertMessages()` for manual conversions:

```typescript
import { convertMessages } from "@mastra/core/agent";

// Convert AI SDK v4 to v5
const aiv5Messages = convertMessages(aiv4Messages).to("AIV5.UI");

// Convert Mastra to AI SDK v5
const aiv5Messages = convertMessages(mastraMessages).to("AIV5.Core");
```

### Type Inference

Use type helpers for TypeScript support:

```typescript
import { InferUITool, InferUITools } from "@mastra/core/tools";

type WeatherUITool = InferUITool<typeof weatherTool>;
type MyUITools = InferUITools<typeof tools>;
```

## Additional Resources

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/)
- [Mastra Agent Memory](https://mastra.ai/docs/agents/agent-memory)
- [Mastra Runtime Context](https://mastra.ai/docs/server-db/runtime-context)
- [Mastra Tool Streaming](https://mastra.ai/docs/streaming/tool-streaming)
- [Mastra Workflow Streaming](https://mastra.ai/docs/streaming/workflow-streaming)

---

*Last updated: December 8, 2025*
*Source: https://mastra.ai/docs/frameworks/agentic-uis/ai-sdk*