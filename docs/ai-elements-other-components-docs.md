# AI Elements Other Components Documentation

This document contains fetched documentation for all non-workflow AI Elements components and related Mastra documentation from various sources.

## AI-SDK - Mastra Next.js Framework

### Using Vercel AI SDK

#### Model Routing

When creating agents in Mastra, you can specify any AI SDK-supported model.

```typescript
import { Agent } from "@mastra/core/agent";

export const weatherAgent = new Agent({
  name: "Weather Agent",
  instructions: "Instructions for the agent...",
  model: "openai/gpt-4-turbo",
});
```

See [Using AI SDK with Mastra](https://mastra.ai/models#use-ai-sdk-with-mastra) for more information.

#### Streaming

##### `chatRoute()`

When setting up a [custom API route](https://mastra.ai/docs/server-db/custom-api-routes), use the `chatRoute()` utility to create a route handler that automatically formats the agent stream into an AI SDK-compatible format.

```typescript
import { Mastra } from "@mastra/core/mastra";
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

Once you have your `/chat` API route set up, you can call the `useChat()` hook in your application.

```typescript
const { error, status, sendMessage, messages, regenerate, stop } = useChat({
  transport: new DefaultChatTransport({
    api: "http://localhost:4111/chat",
  }),
});
```

Pass extra agent stream execution options:

```typescript
const { error, status, sendMessage, messages, regenerate, stop } = useChat({
  transport: new DefaultChatTransport({
    api: "http://localhost:4111/chat",
    prepareSendMessagesRequest({ messages }) {
      return {
        body: {
          messages,
          // Pass memory config
          memory: {
            thread: "user-1",
            resource: "user-1",
          },
        },
      };
    },
  }),
});
```

##### `workflowRoute()`

Use the `workflowRoute()` utility to create a route handler that automatically formats the workflow stream into an AI SDK-compatible format.

```typescript
import { Mastra } from "@mastra/core/mastra";
import { workflowRoute } from "@mastra/ai-sdk";

export const mastra = new Mastra({
  server: {
    apiRoutes: [
      workflowRoute({
        path: "/workflow",
        workflow: "weatherWorkflow",
      }),
    ],
  },
});
```

Once you have your `/workflow` API route set up, you can call the `useChat()` hook in your application.

```typescript
const { error, status, sendMessage, messages, regenerate, stop } = useChat({
  transport: new DefaultChatTransport({
    api: "http://localhost:4111/workflow",
    prepareSendMessagesRequest({ messages }) {
      return {
        body: {
          inputData: {
            city: messages[messages.length - 1].parts[0].text,
          },
          //Or resumeData for resuming a suspended workflow
          resumeData: {
            confirmation: messages[messages.length - 1].parts[0].text
          }
        },
      };
    },
  }),
});
```

To enable agent text chunks and tool calls streaming when a workflow step pipes an agent's stream to the workflow writer (see [Workflow Streaming](https://mastra.ai/docs/streaming/workflow-streaming#workflow-using-an-agent)).

Set the `includeTextStreamParts` `workflowRoute` option to `true`

```typescript
import { Mastra } from "@mastra/core/mastra";
import { workflowRoute } from "@mastra/ai-sdk";

export const mastra = new Mastra({
  server: {
    apiRoutes: [
      workflowRoute({
        path: "/workflow",
        workflow: "weatherWorkflow",
        //This provides a seamless streaming experience even when agents are running inside workflow steps.
        includeTextStreamParts: true
      }),
    ],
  },
});
```

##### `networkRoute()`

Use the `networkRoute()` utility to create a route handler that automatically formats the agent network stream into an AI SDK-compatible format.

```typescript
import { Mastra } from "@mastra/core/mastra";
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

Once you have your `/network` API route set up, you can call the `useChat()` hook in your application.

```typescript
const { error, status, sendMessage, messages, regenerate, stop } = useChat({
  transport: new DefaultChatTransport({
    api: "http://localhost:4111/network",
  }),
});
```

##### Custom UI

The `@mastra/ai-sdk` package transforms and emits Mastra streams (e.g workflow, network streams) into AI SDK-compatible [uiMessages DataParts](https://ai-sdk.dev/docs/reference/ai-sdk-core/ui-message#datauipart) format.

- Top-level parts: These are streamed via direct workflow and network stream transformations (e.g in `workflowRoute()` and `networkRoute()`)
  - `data-workflow`: Aggregates a workflow run with step inputs/outputs and final usage.
  - `data-network`: Aggregates a routing/network run with ordered steps (agent/workflow/tool executions) and outputs.
- Nested parts: These are streamed via nested and merged streams from within a tool's `execute()` method.
  - `data-tool-workflow`: Nested workflow emitted from within a tool stream.
  - `data-tool-network`: Nested network emitted from within an tool stream.
  - `data-tool-agent`: Nested agent emitted from within an tool stream.

Here's an example: For a [nested agent stream within a tool](https://mastra.ai/docs/streaming/tool-streaming#tool-using-an-agent), `data-tool-agent` UI message parts will be emitted and can be leveraged on the client as documented below:

```typescript
"use client";
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
          {message.parts.map((part, i) => {
            switch (part.type) {
              case 'data-tool-agent':
                return (
                  <AgentTool {...part.data as AgentDataPart} key={`${message.id}-${i}`} />
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

```typescript
import { Tool, ToolContent, ToolHeader, ToolOutput } from "../ai-elements/tool";
import type { AgentDataPart } from "@mastra/ai-sdk";

export const AgentTool = ({ id, text, status }: AgentDataPart) => {
  return (
    <Tool>
      <ToolHeader type={`${id}`} state={status === 'finished' ? 'output-available' : 'input-available'} />
      <ToolContent>
        <ToolOutput output={<MessageResponse>{text}</MessageResponse>} />
      </ToolContent>
    </Tool>
  );
};
```

##### Custom Tool streaming

To stream custom data parts from within your tool execution function, use the `writer.custom()` method.

```typescript
import { createTool } from "@mastra/core/tools";

export const testTool = createTool({
  // ...
  execute: async ({ context, writer }) => {
    const { value } = context;

    await writer?.custom({
      type: "data-tool-progress",
      status: "pending"
    });

    const response = await fetch(...);

    await writer?.custom({
      type: "data-tool-progress",
      status: "success"
    });

    return {
      value: ""
    };
  }
});
```

For more information about tool streaming see [Tool streaming documentation](https://mastra.ai/docs/streaming/tool-streaming)

##### Stream Transformations

To manually transform Mastra's streams to AI SDK-compatible format, use the `toAISdkFormat()` utility.

```typescript
import { mastra } from "../../mastra";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { toAISdkFormat } from "@mastra/ai-sdk";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const myAgent = mastra.getAgent("weatherAgent");
  const stream = await myAgent.stream(messages);

  // Transform stream into AI SDK format and create UI messages stream
  const uiMessageStream = createUIMessageStream({
    execute: async ({ writer }) => {
      for await (const part of toAISdkFormat(stream, { from: "agent" })!) {
        writer.write(part);
      }
    },
  });

  // Create a Response that streams the UI message stream to the client
  return createUIMessageStreamResponse({
    stream: uiMessageStream,
  });
}
```

##### Client Side Stream Transformations

If you have a client-side `response` from `agent.stream(...)` and want AI SDK-formatted parts without custom SSE parsing, wrap `response.processDataStream` into a `ReadableStream<ChunkType>` and pipe it through `toAISdkFormat`:

```typescript
import { createUIMessageStream } from "ai";
import { toAISdkFormat } from "@mastra/ai-sdk";
import type { ChunkType, MastraModelOutput } from "@mastra/core/stream";

// Client SDK agent stream
const response = await agent.stream({
  messages: "What is the weather in Tokyo",
});

// Transform to AI SDK format
const chunkStream: ReadableStream<ChunkType> = new ReadableStream<ChunkType>({
  start(controller) {
    response
      .processDataStream({
        onChunk: async (chunk) => {
          controller.enqueue(chunk as ChunkType);
        },
      })
      .finally(() => controller.close());
  },
});

const uiMessageStream = createUIMessageStream({
  execute: async ({ writer }) => {
    for await (const part of toAISdkFormat(
      chunkStream as unknown as MastraModelOutput,
      { from: "agent" },
    )) {
      writer.write(part);
    }
  },
});

for await (const part of uiMessageStream) {
  console.log(part);
}
```

#### UI Hooks

Mastra supports AI SDK UI hooks for connecting frontend components directly to agents using HTTP streams.

Install the required AI SDK React package:

```
npm install @ai-sdk/react
```

##### Using `useChat()`

The `useChat()` hook handles real-time chat interactions between your frontend and a Mastra agent, enabling you to send prompts and receive streaming responses over HTTP.

```typescript
"use client";
import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { DefaultChatTransport } from 'ai';

export function Chat() {
  const [inputValue, setInputValue] = useState('')
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
        <input value={inputValue} onChange={e=>setInputValue(e.target.value)} placeholder="Name of city" />
      </form>
    </div>
  );
}
```

Requests sent using the `useChat()` hook are handled by a standard server route. This example shows how to define a POST route using a Next.js Route Handler.

```typescript
import { mastra } from "../../mastra";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const myAgent = mastra.getAgent("weatherAgent");
  const stream = await myAgent.stream(messages, { format: "aisdk" });
  return stream.toUIMessageStreamResponse();
}
```

When using `useChat()` with agent memory, refer to the [Agent Memory section](https://mastra.ai/docs/agents/agent-memory) for key implementation details.

##### Using `useCompletion()`

The `useCompletion()` hook handles single-turn completions between your frontend and a Mastra agent, allowing you to send a prompt and receive a streamed response over HTTP.

```typescript
"use client";
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

Requests sent using the `useCompletion()` hook are handled by a standard server route. This example shows how to define a POST route using a Next.js Route Handler.

```typescript
import { mastra } from "../../../mastra";

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const myAgent = mastra.getAgent("weatherAgent");
  const stream = await myAgent.stream([{ role: "user", content: prompt }], {
    format: "aisdk",
  });
  return stream.toUIMessageStreamResponse();
}
```

##### Passing additional data

`sendMessage()` allows you to pass additional data from the frontend to Mastra. This data can then be used on the server as `RuntimeContext`.

```typescript
"use client";
import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { DefaultChatTransport } from 'ai';

export function ChatExtra() {
  const [inputValue, setInputValue] = useState('')
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: 'http://localhost:4111/chat',
    }),
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage({ text: inputValue }, {
      body: {
        data: {
          userId: "user123",
          preferences: {
            language: "en",
            temperature: "celsius"
          }
        }
      }
    });
  };

  return (
    <div>
      <pre>{JSON.stringify(messages, null, 2)}</pre>
      <form onSubmit={handleFormSubmit}>
        <input value={inputValue} onChange={e=>setInputValue(e.target.value)} placeholder="Name of city" />
      </form>
    </div>
  );
}
```

```typescript
import { mastra } from "../../../mastra";
import { RuntimeContext } from "@mastra/core/runtime-context";

export async function POST(req: Request) {
  const { messages, data } = await req.json();
  const myAgent = mastra.getAgent("weatherAgent");

  const runtimeContext = new RuntimeContext();
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      runtimeContext.set(key, value);
    }
  }

  const stream = await myAgent.stream(messages, {
    runtimeContext,
    format: "aisdk",
  });
  return stream.toUIMessageStreamResponse();
}
```

##### Handling `runtimeContext` with `server.middleware`

You can also populate the `RuntimeContext` by reading custom data in a server middleware:

```typescript
import { Mastra } from "@mastra/core/mastra";

export const mastra = new Mastra({
  agents: { weatherAgent },
  server: {
    middleware: [
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
          } catch {}
        }
        await next();
      },
    ],
  },
});
```

You can then access this data in your tools via the `runtimeContext` parameter. See the [Runtime Context documentation](https://mastra.ai/docs/server-db/runtime-context) for more details.

#### Migrating from AI SDK v4 to v5

##### Memory and Storage

Mastra automatically handles AI SDK v4 data using its internal `MessageList` class, which manages format conversion—including v4 to v5. No database migrations are required; your existing messages are translated on the fly and continue working after you upgrade.

##### Message Format Conversion

For cases where you need to manually convert messages between AI SDK and Mastra formats, use the `convertMessages()` utility:

```typescript
import { convertMessages } from "@mastra/core/agent";

// Convert AI SDK v4 messages to v5
const aiv5Messages = convertMessages(aiv4Messages).to("AIV5.UI");

// Convert Mastra messages to AI SDK v5
const aiv5Messages = convertMessages(mastraMessages).to("AIV5.Core");

// Supported output formats:
// 'Mastra.V2', 'AIV4.UI', 'AIV5.UI', 'AIV5.Core', 'AIV5.Model'
```

This utility is helpful when you want to fetch messages directly from your storage DB and convert them for use in AI SDK.

##### Type Inference for Tools

When using tools with TypeScript in AI SDK v5, Mastra provides type inference helpers to ensure type safety for your tool inputs and outputs.

###### `InferUITool`

The `InferUITool` type helper infers the input and output types of a single Mastra tool:

```typescript
import { InferUITool, createTool } from "@mastra/core/tools";
import { z } from "zod";

const weatherTool = createTool({
  id: "get-weather",
  description: "Get the current weather",
  inputSchema: z.object({
    location: z.string().describe("The city and state"),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    conditions: z.string(),
  }),
  execute: async ({ context }) => {
    return {
      temperature: 72,
      conditions: "sunny",
    };
  },
});

// Infer the types from the tool
type WeatherUITool = InferUITool<typeof weatherTool>;
// This creates:
// {
//   input: { location: string };
//   output: { temperature: number; conditions: string };
// }
```

###### `InferUITools`

The `InferUITools` type helper infers the input and output types of multiple tools:

```typescript
import { InferUITools, createTool } from "@mastra/core/tools";
import { z } from "zod";

// Using weatherTool from the previous example
const tools = {
  weather: weatherTool,
  calculator: createTool({
    id: "calculator",
    description: "Perform basic arithmetic",
    inputSchema: z.object({
      operation: z.enum(["add", "subtract", "multiply", "divide"]),
      a: z.number(),
      b: z.number(),
    }),
    outputSchema: z.object({
      result: z.number(),
    }),
    execute: async ({ context }) => {
      // implementation...
      return { result: 0 };
    },
  }),
};

// Infer types from the tool set
export type MyUITools = InferUITools<typeof tools>;
// This creates:
// {
//   weather: { input: { location: string }; output: { temperature: number; conditions: string } };
//   calculator: { input: { operation: "add" | "subtract" | "multiply" | "divide"; a: number; b: number }; output: { result: number } };
// }
```

These type helpers provide full TypeScript support when using Mastra tools with AI SDK v5 UI components, ensuring type safety across your application.

## AI Elements Frontend Components

### Introduction

AI Elements is a component library and custom registry built on top of shadcn/ui to help you build AI-native applications faster. It provides pre-built components like conversations, messages and more.

#### Prerequisites

Before installing AI Elements, make sure your environment meets the following requirements:

- Node.js, version 18 or later
- A Next.js project with the AI SDK installed.
- shadcn/ui installed in your project. If you don't have it installed, running any install command will automatically install it for you.
- We also highly recommend using the AI Gateway and adding `AI_GATEWAY_API_KEY` to your `env.local` so you don't have to use an API key from every provider. AI Gateway also gives $5 in usage per month so you can experiment with models. You can obtain an API key here.

AI Elements is built targeting React 19 (no `forwardRef` usage) and Tailwind CSS 4.

#### Installing Components

You can install AI Elements components using either the AI Elements CLI or the shadcn/ui CLI. Both achieve the same result: adding the selected component's code and any needed dependencies to your project.

The CLI will download the component's code and integrate it into your project's directory (usually under your components folder). By default, AI Elements components are added to the `@/components/ai-elements/` directory (or whatever folder you've configured in your shadcn components settings).

After running the command, you should see a confirmation in your terminal that the files were added. You can then proceed to use the component in your code.

### Usage

Learn how to use AI Elements components in your application.

Once an AI Elements component is installed, you can import it and use it in your application like any other React component. The components are added as part of your codebase (not hidden in a library), so the usage feels very natural.

#### Example

```typescript
'use client';

import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { useChat } from '@ai-sdk/react';

const Example = () => {
  const { messages } = useChat();

  return (
    <>
      {messages.map(({ role, parts }, index) => (
        <Message from={role} key={index}>
          <MessageContent>
            {parts.map((part, i) => {
              switch (part.type) {
                case 'text':
                  return <MessageResponse key={`${role}-${i}`}>{part.text}</MessageResponse>;
              }
            })}
          </MessageContent>
        </Message>
      ))}
    </>
  );
};
```

In the example above, we import the `Message` component from our AI Elements directory and include it in our JSX. Then, we compose the component with the `MessageContent` and `MessageResponse` subcomponents. You can style or configure the component just as you would if you wrote it yourself – since the code lives in your project, you can even open the component file to see how it works or make custom modifications.

#### Extensibility

All AI Elements components take as many primitive attributes as possible. For example, the `Message` component extends `HTMLAttributes<HTMLDivElement>`, so you can pass any props that a `div` supports. This makes it easy to extend the component with your own styles or functionality.

#### Customization

If you re-install AI Elements by rerunning `npx ai-elements@latest`, the CLI will ask before overwriting the file so you can save any custom changes you made.

After installation, no additional setup is needed. The component's styles (Tailwind CSS classes) and scripts are already integrated. You can start interacting with the component in your app immediately.

For example, if you'd like to remove the rounding on `Message`, you can go to `components/ai-elements/message.tsx` and remove `rounded-lg` as follows:

```typescript
export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      'flex flex-col gap-2 text-sm text-foreground',
      'group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground group-[.is-user]:px-4 group-[.is-user]:py-3',
      className,
    )}
    {...props}
  >
    <div className="is-user:dark">{children}</div>
  </div>
);
```

## Chatbot Components

### Chain of Thought

A collapsible component that visualizes AI reasoning steps with support for search results, images, and step-by-step progress indicators.

#### Features

- Collapsible interface with smooth animations powered by Radix UI
- Step-by-step visualization of AI reasoning process
- Support for different step statuses (complete, active, pending)
- Built-in search results display with badge styling
- Image support with captions for visual content
- Custom icons for different step types
- Context-aware components using React Context API
- Fully typed with TypeScript
- Accessible with keyboard navigation support
- Responsive design that adapts to different screen sizes
- Smooth fade and slide animations for content transitions
- Composable architecture for flexible customization

#### Props

- `open`, `defaultOpen`, `onOpenChange` - Control open state
- `children` - Component content

#### Subcomponents

- `ChainOfThoughtHeader` - Header section
- `ChainOfThoughtStep` - Individual reasoning steps
- `ChainOfThoughtSearchResults` - Search results container
- `ChainOfThoughtContent` - Main content area
- `ChainOfThoughtImage` - Image display with captions

### Checkpoint

A simple component for marking conversation history points and restoring the chat to a previous state.

#### Features

- Simple flex layout with icon, trigger, and separator
- Visual separator line for clear conversation breaks
- Clickable restore button for reverting to checkpoint
- Customizable icon (defaults to BookmarkIcon)
- Keyboard accessible with proper ARIA labels
- Responsive design that adapts to different screen sizes
- Seamless light/dark theme integration

#### Usage with AI SDK

Build a chat interface with conversation checkpoints that allow users to restore to previous states.

```typescript
'use client';

import { useState, Fragment } from 'react';
import { useChat } from '@ai-sdk/react';
import { Checkpoint, CheckpointIcon, CheckpointTrigger } from '@/components/ai-elements/checkpoint';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Conversation, ConversationContent } from '@/components/ai-elements/conversation';

type CheckpointType = {
  id: string;
  messageIndex: number;
  timestamp: Date;
  messageCount: number;
};

const CheckpointDemo = () => {
  const { messages, setMessages } = useChat();
  const [checkpoints, setCheckpoints] = useState<CheckpointType[]>([]);

  const createCheckpoint = (messageIndex: number) => {
    const checkpoint: CheckpointType = {
      id: nanoid(),
      messageIndex,
      timestamp: new Date(),
      messageCount: messageIndex + 1,
    };
    setCheckpoints([...checkpoints, checkpoint]);
  };

  const restoreToCheckpoint = (messageIndex: number) => {
    // Restore messages to checkpoint state
    setMessages(messages.slice(0, messageIndex + 1));
    // Remove checkpoints after this point
    setCheckpoints(checkpoints.filter(cp => cp.messageIndex <= messageIndex));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <Conversation>
        <ConversationContent>
          {messages.map((message, index) => {
            const checkpoint = checkpoints.find(cp => cp.messageIndex === index);

            return (
              <Fragment key={message.id}>
                <Message from={message.role}>
                  <MessageContent>
                    <MessageResponse>{message.content}</MessageResponse>
                  </MessageContent>
                </Message>
                {checkpoint && (
                  <Checkpoint>
                    <CheckpointIcon />
                    <CheckpointTrigger onClick={() => restoreToCheckpoint(checkpoint.messageIndex)}>
                      Restore checkpoint
                    </CheckpointTrigger>
                  </Checkpoint>
                )}
              </Fragment>
            );
          })}
        </ConversationContent>
      </Conversation>
    </div>
  );
};

export default CheckpointDemo;
```

#### Use Cases

##### Manual Checkpoints

Allow users to manually create checkpoints at important conversation points:

```typescript
<Button onClick={() => createCheckpoint(messages.length - 1)}>
  Create Checkpoint
</Button>
```

##### Automatic Checkpoints

Create checkpoints automatically after significant conversation milestones:

```typescript
useEffect(() => {
  // Create checkpoint every 5 messages
  if (messages.length > 0 && messages.length % 5 === 0) {
    createCheckpoint(messages.length - 1);
  }
}, [messages.length]);
```

##### Branching Conversations

Use checkpoints to enable conversation branching where users can explore different conversation paths:

```typescript
const restoreAndBranch = (messageIndex: number) => {
  // Save current branch
  const currentBranch = messages.slice(messageIndex + 1);
  saveBranch(currentBranch);
  // Restore to checkpoint
  restoreToCheckpoint(messageIndex);
};
```

### Confirmation

An alert-based component for managing tool execution approval workflows with request, accept, and reject states.

#### Features

- Context-based state management for approval workflow
- Conditional rendering based on approval state
- Support for approval-requested, approval-responded, output-denied, and output-available states
- Built on shadcn/ui Alert and Button components
- TypeScript support with comprehensive type definitions
- Customizable styling with Tailwind CSS
- Keyboard navigation and accessibility support
- Theme-aware with automatic dark mode support

#### Examples

##### Approval Request State

Shows the approval request with action buttons when state is `approval-requested`.

##### Approved State

Shows the accepted status when user approves and state is `approval-responded` or `output-available`.

##### Rejected State

Shows the rejected status when user rejects and state is `output-denied`.

#### Props

- `approval` - Approval object
- `state` - Current approval state
- `className` - Additional CSS classes
- `...props` - Standard div props

### Context

A compound component system for displaying AI model context window usage, token consumption, and cost estimation.

#### Features

- Compound Component Architecture: Flexible composition of context display elements
- Visual Progress Indicator: Circular SVG progress ring showing context usage percentage
- Token Breakdown: Detailed view of input, output, reasoning, and cached tokens
- Cost Estimation: Real-time cost calculation using the `tokenlens` library
- Intelligent Formatting: Automatic token count formatting (K, M, B suffixes)
- Interactive Hover Card: Detailed information revealed on hover
- Context Provider Pattern: Clean data flow through React Context API
- TypeScript Support: Full type definitions for all components
- Accessible Design: Proper ARIA labels and semantic HTML
- Theme Integration: Uses currentColor for automatic theme adaptation

#### Props

- `maxTokens` - Maximum tokens allowed
- `usedTokens` - Current tokens used
- `usage` - Token usage breakdown
- `modelId` - Model identifier for cost calculation
- `...props` - Standard div props

#### Component Architecture

The Context component uses a compound component pattern with React Context for data sharing:

1. `<Context>` - Root provider component that holds all context data
2. `<ContextTrigger>` - Interactive trigger element (default: button with percentage)
3. `<ContextContent>` - Hover card content container
4. `<ContextContentHeader>` - Header section with progress visualization
5. `<ContextContentBody>` - Body section for usage breakdowns
6. `<ContextContentFooter>` - Footer section for total cost
7. Usage Components - Individual token usage displays (Input, Output, Reasoning, Cache)

#### Token Formatting

The component uses `Intl.NumberFormat` with compact notation for automatic formatting:

- Under 1,000: Shows exact count (e.g., "842")
- 1,000+: Shows with K suffix (e.g., "32K")
- 1,000,000+: Shows with M suffix (e.g., "1.5M")
- 1,000,000,000+: Shows with B suffix (e.g., "2.1B")

#### Cost Calculation

When a `modelId` is provided, the component automatically calculates costs using the `tokenlens` library:

- Input tokens: Cost based on model's input pricing
- Output tokens: Cost based on model's output pricing
- Reasoning tokens: Special pricing for reasoning-capable models
- Cached tokens: Reduced pricing for cached input tokens
- Total cost: Sum of all token type costs

Costs are formatted using `Intl.NumberFormat` with USD currency.

#### Styling

The component uses Tailwind CSS classes and follows your design system:

- Progress indicator uses `currentColor` for theme adaptation
- Hover card has customizable width and padding
- Footer has a secondary background for visual separation
- All text sizes use the `text-xs` class for consistency
- Muted foreground colors for secondary information

### Conversation

Wraps messages and automatically scrolls to the bottom. Also includes a scroll button that appears when not at the bottom.

#### Features

- Automatic scrolling to the bottom when new messages are added
- Smooth scrolling behavior with configurable animation
- Scroll button that appears when not at the bottom
- Responsive design with customizable padding and spacing
- Flexible content layout with consistent message spacing
- Accessible with proper ARIA roles for screen readers
- Customizable styling through className prop
- Support for any number of child message components

#### Props

- `contextRef` - Reference for context management
- `instance` - Component instance
- `children` - Message components
- `...props` - Standard div props

#### Usage with AI SDK

Build a simple conversational UI with `Conversation` and [PromptInput](https://ai-sdk.dev/elements/components/prompt-input):

```typescript
'use client';

import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Input, PromptInputTextarea, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { useChat } from '@ai-sdk/react';

const ConversationDemo = () => {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <Conversation>
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={<MessageSquare className="size-12" />}
                title="Start a conversation"
                description="Type a message below to begin chatting"
              />
            ) : (
              messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case 'text':
                          // we don't use any reasoning or tool calls in this example
                          return (
                            <MessageResponse key={`${message.id}-${i}`}>
                              {part.text}
                            </MessageResponse>
                          );
                        default:
                          return null;
                      }
                    })}
                  </MessageContent>
                </Message>
              ))
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <Input onSubmit={handleSubmit} className="mt-4 w-full max-w-2xl mx-auto relative">
          <PromptInputTextarea
            value={input}
            placeholder="Say something..."
            onChange={(e) => setInput(e.currentTarget.value)}
            className="pr-12"
          />
          <PromptInputSubmit
            status={status === 'streaming' ? 'streaming' : 'ready'}
            disabled={!input.trim()}
            className="absolute bottom-1 right-1"
          />
        </Input>
      </div>
    </div>
  );
};

export default ConversationDemo;
```

### Inline Citation

A hoverable citation component that displays source information and quotes inline with text, perfect for AI-generated content with references.

#### Features

- Hover interaction to reveal detailed citation information
- Carousel navigation for multiple citations with prev/next controls
- Live index tracking showing current slide position (e.g., "1/5")
- Support for source titles, URLs, and descriptions
- Optional quote blocks for relevant excerpts
- Composable architecture for flexible citation formats
- Accessible design with proper keyboard navigation
- Seamless integration with AI-generated content
- Clean visual design that doesn't disrupt reading flow
- Smart badge display showing source hostname and count

#### Usage with AI SDK

Build citations for AI-generated content using [experimental_generateObject](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-object).

```typescript
'use client';

import { experimental_useObject as useObject } from '@ai-sdk/react';
import { InlineCitation, InlineCitationText, InlineCitationCard, InlineCitationCardTrigger, InlineCitationCardBody, InlineCitationCarousel, InlineCitationCarouselContent, InlineCitationCarouselItem, InlineCitationCarouselHeader, InlineCitationCarouselIndex, InlineCitationCarouselPrev, InlineCitationCarouselNext, InlineCitationSource, InlineCitationQuote } from '@/components/ai-elements/inline-citation';
import { Button } from '@/components/ui/button';
import { citationSchema } from '@/app/api/citation/route';

const CitationDemo = () => {
  const { object, submit, isLoading } = useObject({
    api: '/api/citation',
    schema: citationSchema,
  });

  const handleSubmit = (topic: string) => {
    submit({ prompt: topic });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex gap-2 mb-6">
        <Button onClick={() => handleSubmit('artificial intelligence')} disabled={isLoading} variant="outline">
          Generate AI Content
        </Button>
        <Button onClick={() => handleSubmit('climate change')} disabled={isLoading} variant="outline">
          Generate Climate Content
        </Button>
      </div>

      {isLoading && !object && (
        <div className="text-muted-foreground">
          Generating content with citations...
        </div>
      )}

      {object?.content && (
        <div className="prose prose-sm max-w-none">
          <p className="leading-relaxed">
            {object.content.split(/(\[\d+\])/).map((part, index) => {
              const citationMatch = part.match(/\[(\d+)\]/);
              if (citationMatch) {
                const citationNumber = citationMatch[1];
                const citation = object.citations?.find((c: any) => c.number === citationNumber);

                if (citation) {
                  return (
                    <InlineCitation key={index}>
                      <InlineCitationCard>
                        <InlineCitationCardTrigger sources={[citation.url]} />
                        <InlineCitationCardBody>
                          <InlineCitationCarousel>
                            <InlineCitationCarouselHeader>
                              <InlineCitationCarouselPrev />
                              <InlineCitationCarouselNext />
                              <InlineCitationCarouselIndex />
                            </InlineCitationCarouselHeader>
                            <InlineCitationCarouselContent>
                              <InlineCitationCarouselItem>
                                <InlineCitationSource
                                  title={citation.title}
                                  url={citation.url}
                                  description={citation.description}
                                />
                                {citation.quote && (
                                  <InlineCitationQuote>{citation.quote}</InlineCitationQuote>
                                )}
                              </InlineCitationCarouselItem>
                            </InlineCitationCarouselContent>
                          </InlineCitationCarousel>
                        </InlineCitationCardBody>
                      </InlineCitationCard>
                    </InlineCitation>
                  );
                }
              }
              return part;
            })}
          </p>
        </div>
      )}
    </div>
  );
};

export default CitationDemo;
```

### Message

A comprehensive suite of components for displaying chat messages, including message rendering, branching, actions, and markdown responses.

#### Features

- Displays messages from both user and AI assistant with distinct styling and automatic alignment
- Minimalist flat design with user messages in secondary background and assistant messages full-width
- Response branching with navigation controls to switch between multiple AI response versions
- Markdown rendering with GFM support (tables, task lists, strikethrough), math equations, and smart streaming
- Action buttons for common operations (retry, like, dislike, copy, share) with tooltips and state management
- File attachments display with support for images and generic files with preview and remove functionality
- Code blocks with syntax highlighting and copy-to-clipboard functionality
- Keyboard accessible with proper ARIA labels
- Responsive design that adapts to different screen sizes
- Seamless light/dark theme integration

#### Important Setup

Add to `globals.css`:

```css
@source "../node_modules/streamdown/dist/index.js";
```

This is required for the MessageResponse component to work properly. Without this import, the Streamdown styles will not be applied to your project. See [Streamdown's documentation](https://streamdown.ai/) for more details.

#### Props

- `from` - Message sender ('user' | 'assistant')
- `children` - Message content
- `parseIncompleteMarkdown` - Handle streaming markdown

#### Subcomponents

- `MessageContent` - Main message content
- `MessageResponse` - Formatted response text
- `MessageActions` - Action buttons container
- `MessageAction` - Individual action buttons
- `MessageBranch` - Response branching
- `MessageAttachments` - File attachments
- `MessageAttachment` - Individual attachments

#### Usage with AI SDK

Build a simple chat UI where the user can copy or regenerate the most recent message.

```typescript
'use client';

import { useState } from 'react';
import { MessageActions, MessageAction } from '@/components/ai-elements/message';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Input, PromptInputTextarea, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { RefreshCcwIcon, CopyIcon } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { Fragment } from 'react';

const ActionsDemo = () => {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, regenerate } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <Conversation>
          <ConversationContent>
            {messages.map((message, messageIndex) => (
              <Fragment key={message.id}>
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case 'text':
                      const isLastMessage = messageIndex === messages.length - 1;

                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message from={message.role}>
                            <MessageContent>
                              <MessageResponse>{part.text}</MessageResponse>
                            </MessageContent>
                          </Message>
                          {message.role === 'assistant' && isLastMessage && (
                            <MessageActions>
                              <MessageAction onClick={() => regenerate()} label="Retry">
                                <RefreshCcwIcon className="size-3" />
                              </MessageAction>
                              <MessageAction
                                onClick={() => navigator.clipboard.writeText(part.text)}
                                label="Copy"
                              >
                                <CopyIcon className="size-3" />
                              </MessageAction>
                            </MessageActions>
                          )}
                        </Fragment>
                      );
                    default:
                      return null;
                  }
                })}
              </Fragment>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <Input onSubmit={handleSubmit} className="mt-4 w-full max-w-2xl mx-auto relative">
          <PromptInputTextarea
            value={input}
            placeholder="Say something..."
            onChange={(e) => setInput(e.currentTarget.value)}
            className="pr-12"
          />
          <PromptInputSubmit
            status={status === 'streaming' ? 'streaming' : 'ready'}
            disabled={!input.trim()}
            className="absolute bottom-1 right-1"
          />
        </Input>
      </div>
    </div>
  );
};

export default ActionsDemo;
```

### Model Selector

A searchable command palette for selecting AI models in your chat interface.

#### Features

- Searchable interface with keyboard navigation
- Fuzzy search filtering across model names
- Grouped model organization by provider
- Keyboard shortcuts support
- Empty state handling
- Customizable styling with Tailwind CSS
- Built on cmdk for excellent accessibility
- Support for both inline and dialog modes
- TypeScript support with proper type definitions

### Plan

A collapsible plan component for displaying AI-generated execution plans with streaming support and shimmer animations.

#### Features

- Collapsible content with smooth animations
- Streaming support with shimmer loading states
- Built on shadcn/ui Card and Collapsible components
- TypeScript support with comprehensive type definitions
- Customizable styling with Tailwind CSS
- Responsive design with mobile-friendly interactions
- Keyboard navigation and accessibility support
- Theme-aware with automatic dark mode support
- Context-based state management for streaming

#### Props

- `isStreaming` - Whether content is streaming
- `defaultOpen` - Default open state
- `...props` - Standard div props

### Prompt Input

Allows a user to send a message with file attachments to a large language model. It includes a textarea, file upload capabilities, a submit button, and a dropdown for selecting the model.

#### Features

- Auto-resizing textarea that adjusts height based on content
- File attachment support with drag-and-drop
- Image preview for image attachments
- Configurable file constraints (max files, max size, accepted types)
- Automatic submit button icons based on status
- Support for keyboard shortcuts (Enter to submit, Shift+Enter for new line)
- Customizable min/max height for the textarea
- Flexible toolbar with support for custom actions and tools
- Built-in model selection dropdown
- Built-in native speech recognition button (Web Speech API)
- Optional provider for lifted state management
- Form automatically resets on submit
- Responsive design with mobile-friendly controls
- Clean, modern styling with customizable themes
- Form-based submission handling
- Hidden file input sync for native form posts
- Global document drop support (opt-in)

#### Props

- `onSubmit` - Form submission handler
- `accept` - Accepted file types
- `multiple` - Allow multiple files
- `globalDrop` - Enable global drop zone
- `maxFiles` - Maximum file count
- `maxFileSize` - Maximum file size
- `onError` - Error handler
- `...props` - Standard form props

#### Usage with AI SDK

Build a fully functional chat app using `PromptInput`, [Conversation](https://ai-sdk.dev/elements/components/conversation) with a model picker:

```typescript
'use client';

import { PromptInput, PromptInputActionAddAttachments, PromptInputActionMenu, PromptInputActionMenuContent, PromptInputActionMenuTrigger, PromptInputAttachment, PromptInputAttachments, PromptInputBody, PromptInputButton, PromptInputHeader, type PromptInputMessage, PromptInputSelect, PromptInputSelectContent, PromptInputSelectItem, PromptInputSelectTrigger, PromptInputSelectValue, PromptInputSubmit, PromptInputTextarea, PromptInputFooter, PromptInputTools } from '@/components/ai-elements/prompt-input';
import { GlobeIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';

const models = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'claude-opus-4-20250514', name: 'Claude 4 Opus' },
];

const InputDemo = () => {
  const [text, setText] = useState<string>('');
  const [model, setModel] = useState<string>(models[0].id);
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, status, sendMessage } = useChat();

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(
      {
        text: message.text || 'Sent with attachments',
        files: message.files
      },
      {
        body: {
          model: model,
          webSearch: useWebSearch,
        },
      },
    );
    setText('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <Conversation>
          <ConversationContent>
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case 'text':
                        return (
                          <MessageResponse key={`${message.id}-${i}`}>
                            {part.text}
                          </MessageResponse>
                        );
                      default:
                        return null;
                    }
                  })}
                </MessageContent>
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="mt-4" globalDrop multiple>
          <PromptInputHeader>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setText(e.target.value)}
              ref={textareaRef}
              value={text}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <PromptInputSpeechButton
                onTranscriptionChange={setText}
                textareaRef={textareaRef}
              />
              <PromptInputButton
                onClick={() => setUseWebSearch(!useWebSearch)}
                variant={useWebSearch ? 'default' : 'ghost'}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>
              <PromptInputSelect
                onValueChange={(value) => {
                  setModel(value);
                }}
                value={model}
              >
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {models.map((model) => (
                    <PromptInputSelectItem key={model.id} value={model.id}>
                      {model.name}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>
            <PromptInputSubmit disabled={!text && !status} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};

export default InputDemo;
```

### Queue

A comprehensive queue component system for displaying message lists, todos, and collapsible task sections in AI applications.

#### Features

- Flexible component system with composable parts
- Collapsible sections with smooth animations
- Support for completed/pending state indicators
- Built-in scroll area for long lists
- Attachment display with images and file indicators
- Hover-revealed action buttons for queue items
- TypeScript support with comprehensive type definitions
- Customizable styling with Tailwind CSS
- Responsive design with mobile-friendly interactions
- Keyboard navigation and accessibility support
- Theme-aware with automatic dark mode support

#### Examples

##### With PromptInput

### Reasoning

A collapsible component that displays AI reasoning content, automatically opening during streaming and closing when finished.

#### Features

- Automatically opens when streaming content and closes when finished
- Manual toggle control for user interaction
- Smooth animations and transitions powered by Radix UI
- Visual streaming indicator with pulsing animation
- Composable architecture with separate trigger and content components
- Built with accessibility in mind including keyboard navigation
- Responsive design that works across different screen sizes
- Seamlessly integrates with both light and dark themes
- Built on top of shadcn/ui Collapsible primitives
- TypeScript support with proper type definitions

#### Usage with AI SDK

Build a chatbot with reasoning using Deepseek R1.

```typescript
'use client';

import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { PromptInput, PromptInputTextarea, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { Loader } from '@/components/ai-elements/loader';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { useState } from 'react';
import { useChat } from '@ai-sdk/react';

const ReasoningDemo = () => {
  const [input, setInput] = useState('');

  const { messages, sendMessage, status } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <Conversation>
          <ConversationContent>
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case 'text':
                        return (
                          <MessageResponse key={`${message.id}-${i}`}>
                            {part.text}
                          </MessageResponse>
                        );
                      case 'reasoning':
                        return (
                          <Reasoning
                            key={`${message.id}-${i}`}
                            className="w-full"
                            isStreaming={status === 'streaming' && i === message.parts.length - 1 && message.id === messages.at(-1)?.id}
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
                        );
                    }
                  })}
                </MessageContent>
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="mt-4 w-full max-w-2xl mx-auto relative">
          <PromptInputTextarea
            value={input}
            placeholder="Say something..."
            onChange={(e) => setInput(e.currentTarget.value)}
            className="pr-12"
          />
          <PromptInputSubmit
            status={status === 'streaming' ? 'streaming' : 'ready'}
            disabled={!input.trim()}
            className="absolute bottom-1 right-1"
          />
        </PromptInput>
      </div>
    </div>
  );
};

export default ReasoningDemo;
```

### Shimmer

An animated text shimmer component for creating eye-catching loading states and progressive reveal effects.

#### Features

- Smooth animated shimmer effect using CSS gradients and Framer Motion
- Customizable animation duration and spread
- Polymorphic component - render as any HTML element via the `as` prop
- Automatic spread calculation based on text length
- Theme-aware styling using CSS custom properties
- Infinite looping animation with linear easing
- TypeScript support with proper type definitions
- Memoized for optimal performance
- Responsive and accessible design
- Uses `text-transparent` with background-clip for crisp text rendering

#### Examples

##### Different Durations

##### Custom Elements

### Sources

A component that allows a user to view the sources or citations used to generate a response.

#### Features

- Collapsible component that allows a user to view the sources or citations used to generate a response
- Customizable trigger and content components
- Support for custom sources or citations
- Responsive design with mobile-friendly controls
- Clean, modern styling with customizable themes

#### Examples

##### Custom rendering

#### Usage with AI SDK

Build a simple web search agent with Perplexity Sonar.

```typescript
'use client';

import { useChat } from '@ai-sdk/react';
import { Source, Sources, SourcesContent, SourcesTrigger } from '@/components/ai-elements/sources';
import { Input, PromptInputTextarea, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { useState } from 'react';
import { DefaultChatTransport } from 'ai';

const SourceDemo = () => {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/sources',
    }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto mb-4">
          <Conversation>
            <ConversationContent>
              {messages.map((message) => (
                <div key={message.id}>
                  {message.role === 'assistant' && (
                    <Sources>
                      <SourcesTrigger
                        count={
                          message.parts
                            .filter((part) => part.type === 'source-url')
                            .length
                        }
                      />
                      {message.parts
                        .map((part, i) => {
                          switch (part.type) {
                            case 'source-url':
                              return (
                                <SourcesContent key={`${message.id}-${i}`}>
                                  <Source
                                    key={`${message.id}-${i}`}
                                    href={part.url}
                                    title={part.url}
                                  />
                                </SourcesContent>
                              );
                          }
                        })}
                    </Sources>
                  )}
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case 'text':
                            return (
                              <MessageResponse key={`${message.id}-${i}`}>
                                {part.text}
                              </MessageResponse>
                            );
                          default:
                            return null;
                        }
                      })}
                    </MessageContent>
                  </Message>
                </div>
              ))}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>

        <Input onSubmit={handleSubmit} className="mt-4 w-full max-w-2xl mx-auto relative">
          <PromptInputTextarea
            value={input}
            placeholder="Ask a question and search the..."
            onChange={(e) => setInput(e.currentTarget.value)}
            className="pr-12"
          />
          <PromptInputSubmit
            status={status === 'streaming' ? 'streaming' : 'ready'}
            disabled={!input.trim()}
            className="absolute bottom-1 right-1"
          />
        </Input>
      </div>
    </div>
  );
};

export default SourceDemo;
```

### Suggestions

A suggestion component that displays a horizontal row of clickable suggestions for user interaction.

#### Features

- Horizontal suggestion display
- Clickable interaction prompts
- User engagement enhancement

### Task

A collapsible task list component for displaying AI workflow progress, with status indicators and optional descriptions.

#### Features

- Visual icons for pending, in-progress, completed, and error states
- Expandable content for task descriptions and additional information
- Built-in progress counter showing completed vs total tasks
- Optional progressive reveal of tasks with customizable timing
- Support for custom content within task items
- Full type safety with proper TypeScript definitions
- Keyboard navigation and screen reader support

#### Usage with AI SDK

Build a mock async programming agent using [experimental_generateObject](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-object).

```typescript
'use client';

import { experimental_useObject as useObject } from '@ai-sdk/react';
import { Task, TaskItem, TaskItemFile, TaskTrigger, TaskContent } from '@/components/ai-elements/task';
import { Button } from '@/components/ui/button';
import { tasksSchema } from '@/app/api/task/route';
import { SiReact, SiTypescript, SiJavascript, SiCss, SiHtml5, SiJson, SiMarkdown } from '@icons-pack/react-simple-icons';

const iconMap = {
  react: { component: SiReact, color: '#149ECA' },
  typescript: { component: SiTypescript, color: '#3178C6' },
  javascript: { component: SiJavascript, color: '#F7DF1E' },
  css: { component: SiCss, color: '#1572B6' },
  html: { component: SiHtml5, color: '#E34F26' },
  json: { component: SiJson, color: '#000000' },
  markdown: { component: SiMarkdown, color: '#000000' },
};

const TaskDemo = () => {
  const { object, submit, isLoading } = useObject({
    api: '/api/agent',
    schema: tasksSchema,
  });

  const handleSubmit = (taskType: string) => {
    submit({ prompt: taskType });
  };

  const renderTaskItem = (item: any, index: number) => {
    if (item?.type === 'file' && item.file) {
      const iconInfo = iconMap[item.file.icon as keyof typeof iconMap];
      if (iconInfo) {
        const IconComponent = iconInfo.component;
        return (
          <span className="inline-flex items-center gap-1" key={index}>
            {item.text}
            <TaskItemFile>
              <IconComponent color={item.file.color || iconInfo.color} className="size-4" />
              <span>{item.file.name}</span>
            </TaskItemFile>
          </span>
        );
      }
    }
    return item?.text || '';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button onClick={() => handleSubmit('React component development')} disabled={isLoading} variant="outline">
            React Development
          </Button>
        </div>

        <div className="flex-1 overflow-auto space-y-4">
          {isLoading && !object && (
            <div className="text-muted-foreground">Generating tasks...</div>
          )}

          {object?.tasks?.map((task: any, taskIndex: number) => (
            <Task key={taskIndex} defaultOpen={taskIndex === 0}>
              <TaskTrigger title={task.title || 'Loading...'} />
              <TaskContent>
                {task.items?.map((item: any, itemIndex: number) => (
                  <TaskItem key={itemIndex}>
                    {renderTaskItem(item, itemIndex)}
                  </TaskItem>
                ))}
              </TaskContent>
            </Task>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskDemo;
```

### Tool

A collapsible component for displaying tool invocation details in AI chatbot interfaces.

#### Features

- Collapsible interface for showing/hiding tool details
- Visual status indicators with icons and badges
- Support for multiple tool execution states (pending, running, completed, error)
- Formatted parameter display with JSON syntax highlighting
- Result and error handling with appropriate styling
- Composable structure for flexible layouts
- Accessible keyboard navigation and screen reader support
- Consistent styling that matches your design system
- Auto-opens completed tools by default for better UX

#### Examples

##### Input Streaming (Pending)

Shows a tool in its initial state while parameters are being processed.

##### Input Available (Running)

Shows a tool that's actively executing with its parameters.

##### Output Available (Completed)

Shows a completed tool with successful results. Opens by default to show the results. In this instance, the output is a JSON object, so we can use the `CodeBlock` component to display it.

##### Output Error

Shows a tool that encountered an error during execution. Opens by default to display the error.

#### Usage in AI SDK

Build a simple stateful weather app that renders the last message in a tool using [useChat](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat).

```typescript
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type ToolUIPart } from 'ai';
import { Button } from '@/components/ui/button';
import { MessageResponse } from '@/components/ai-elements/message';
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from '@/components/ai-elements/tool';

type WeatherToolInput = {
  location: string;
  units: 'celsius' | 'fahrenheit';
};

type WeatherToolOutput = {
  location: string;
  temperature: string;
  conditions: string;
  humidity: string;
  windSpeed: string;
  lastUpdated: string;
};

type WeatherToolUIPart = ToolUIPart<{
  fetch_weather_data: {
    input: WeatherToolInput;
    output: WeatherToolOutput;
  };
}>;

const Example = () => {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/weather',
    }),
  });

  const handleWeatherClick = () => {
    sendMessage({ text: 'Get weather data for San Francisco in fahrenheit' });
  };

  const latestMessage = messages[messages.length - 1];
  const weatherTool = latestMessage?.parts?.find(
    (part) => part.type === 'tool-fetch_weather_data',
  ) as WeatherToolUIPart | undefined;

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <div className="space-y-4">
          <Button onClick={handleWeatherClick} disabled={status !== 'ready'}>
            Get Weather for San Francisco
          </Button>

          {weatherTool && (
            <Tool defaultOpen={true}>
              <ToolHeader type="tool-fetch_weather_data" state={weatherTool.state} />
              <ToolContent>
                <ToolInput input={weatherTool.input} />
                <ToolOutput
                  output={
                    <MessageResponse>
                      {formatWeatherResult(weatherTool.output)}
                    </MessageResponse>
                  }
                  errorText={weatherTool.errorText}
                />
              </ToolContent>
            </Tool>
          )}
        </div>
      </div>
    </div>
  );
};

function formatWeatherResult(result: WeatherToolOutput): string {
  return `**Weather for ${result.location}**

**Temperature:** ${result.temperature}
**Conditions:** ${result.conditions}
**Humidity:** ${result.humidity}
**Wind Speed:** ${result.windSpeed}

*Last updated: ${result.lastUpdated}*`;
}

export default Example;
```

## Vibe Coding Components

### Artifact

A container component for displaying generated content like code, documents, or other outputs with built-in actions.

#### Features

- Structured container with header and content areas
- Built-in header with title and description support
- Customizable action buttons with tooltips
- Flexible styling for all subcomponents
- Support for close buttons and action groups
- Clean, modern design with border and shadow
- Responsive layout that adapts to content
- TypeScript support with proper type definitions
- Composable architecture for maximum flexibility

#### Examples

##### With Code Display

### Web Preview

A composable component for previewing the result of a generated UI, with support for live examples and code display.

#### Features

- Live preview of UI components
- Composable architecture with dedicated sub-components
- Responsive design modes (Desktop, Tablet, Mobile)
- Navigation controls with back/forward functionality
- URL input and example selector
- Full screen mode support
- Console logging with timestamps
- Context-based state management
- Consistent styling with the design system
- Easy integration into documentation pages

#### Usage with AI SDK

Build a simple v0 clone using the [v0 Platform API](https://v0.dev/docs/api/platform).

Install the `v0-sdk` package:

```
npm i v0-sdk
```

```typescript
'use client';

import { WebPreview, WebPreviewBody, WebPreviewNavigation, WebPreviewUrl } from '@/components/ai-elements/web-preview';
import { useState } from 'react';
import { Input, PromptInputTextarea, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { Loader } from '@/components/ai-elements/loader';

const WebPreviewDemo = () => {
  const [previewUrl, setPreviewUrl] = useState('');
  const [prompt, setPrompt] = useState('A futuristic cityscape at sunset');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setPrompt('');

    setIsGenerating(true);
    try {
      const response = await fetch('/api/v0', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      setPreviewUrl(data.demo || '/');
      console.log('Generation finished:', data);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <div className="flex-1 mb-4">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader />
              <p className="mt-4 text-muted-foreground">
                Generating app, this may take a few seconds...
              </p>
            </div>
          ) : previewUrl ? (
            <WebPreview defaultUrl={previewUrl}>
              <WebPreviewNavigation>
                <WebPreviewUrl />
              </WebPreviewNavigation>
              <WebPreviewBody src={previewUrl} />
            </WebPreview>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Your generated app will appear here
            </div>
          )}
        </div>

        <Input onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto relative">
          <PromptInputTextarea
            value={prompt}
            placeholder="Describe the app you want to build..."
            onChange={(e) => setPrompt(e.currentTarget.value)}
            className="pr-12 min-h-[60px]"
          />
          <PromptInputSubmit
            status={isGenerating ? 'streaming' : 'ready'}
            disabled={!prompt.trim()}
            className="absolute bottom-1 right-1"
          />
        </Input>
      </div>
    </div>
  );
};

export default WebPreviewDemo;
```

## Documentation Components

### Open In Chat

A dropdown menu for opening queries in various AI chat platforms including ChatGPT, Claude, T3, Scira, and v0.

#### Features

- Pre-configured links to popular AI chat platforms
- Context-based query passing for cleaner API
- Customizable dropdown trigger button
- Automatic URL parameter encoding for queries
- Support for ChatGPT, Claude, T3 Chat, Scira AI, v0, and Cursor
- Branded icons for each platform
- TypeScript support with proper type definitions
- Accessible dropdown menu with keyboard navigation
- External link indicators for clarity

#### Supported Platforms

- ChatGPT - Opens query in OpenAI's ChatGPT with search hints
- Claude - Opens query in Anthropic's Claude AI
- T3 Chat - Opens query in T3 Chat platform
- Scira AI - Opens query in Scira's AI assistant
- v0 - Opens query in Vercel's v0 platform
- Cursor - Opens query in Cursor AI editor

## Utilities

### Code Block

Provides syntax highlighting, line numbers, and copy to clipboard functionality for code blocks.

#### Features

- Syntax highlighting with shiki
- Line numbers (optional)
- Copy to clipboard functionality
- Automatic light/dark theme switching
- Customizable styles

#### Examples

##### Dark Mode

##### Usage with AI SDK

Build a simple code generation tool using the [experimental_useObject](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-object) hook.

```typescript
'use client';

import { experimental_useObject as useObject } from '@ai-sdk/react';
import { codeBlockSchema } from '@/app/api/codegen/route';
import { Input, PromptInputTextarea, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { CodeBlock, CodeBlockCopyButton } from '@/components/ai-elements/code-block';
import { useState } from 'react';

export default function Page() {
  const [input, setInput] = useState('');

  const { object, submit, isLoading } = useObject({
    api: '/api/codegen',
    schema: codeBlockSchema,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      submit(input);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto mb-4">
          {object?.code && object?.language && (
            <CodeBlock code={object.code} language={object.language} showLineNumbers={true}>
              <CodeBlockCopyButton />
            </CodeBlock>
          )}
        </div>

        <Input onSubmit={handleSubmit} className="mt-4 w-full max-w-2xl mx-auto relative">
          <PromptInputTextarea
            value={input}
            placeholder="Generate a React todolist component"
            onChange={(e) => setInput(e.currentTarget.value)}
            className="pr-12"
          />
          <PromptInputSubmit
            status={isLoading ? 'streaming' : 'ready'}
            disabled={!input.trim()}
            className="absolute bottom-1 right-1"
          />
        </Input>
      </div>
    </div>
  );
}
```

### Image

Displays AI-generated images from the AI SDK.

#### Features

- Accepts `Experimental_GeneratedImage` objects directly from the AI SDK
- Automatically creates proper data URLs from base64-encoded image data
- Supports all standard HTML image attributes
- Responsive by default with `max-w-full h-auto` styling
- Customizable with additional CSS classes

#### Usage with AI SDK

Build a simple app allowing a user to generate an image given a prompt.

Install the `@ai-sdk/openai` package:

```
npm i @ai-sdk/openai
```

```typescript
'use client';

import { Image } from '@/components/ai-elements/image';
import { Input, PromptInputTextarea, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { useState } from 'react';
import { Loader } from '@/components/ai-elements/loader';

const ImageDemo = () => {
  const [prompt, setPrompt] = useState('A futuristic cityscape at sunset');
  const [imageData, setImageData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setPrompt('');

    setIsLoading(true);
    try {
      const response = await fetch('/api/image', {
        method: 'POST',
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();
      setImageData(data);
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4">
          {imageData && (
            <div className="flex justify-center">
              <Image
                {...imageData}
                alt="Generated image"
                className="h-[300px] aspect-square border rounded-lg"
              />
            </div>
          )}
          {isLoading && <Loader />}
        </div>

        <Input onSubmit={handleSubmit} className="mt-4 w-full max-w-2xl mx-auto relative">
          <PromptInputTextarea
            value={prompt}
            placeholder="Describe the image you want to generate..."
            onChange={(e) => setPrompt(e.currentTarget.value)}
            className="pr-12"
          />
          <PromptInputSubmit
            status={isLoading ? 'submitted' : 'ready'}
            disabled={!prompt.trim()}
            className="absolute bottom-1 right-1"
          />
        </Input>
      </div>
    </div>
  );
};

export default ImageDemo;
```

### Loader

A spinning loader component for indicating loading states in AI applications.

#### Features

- Clean, modern spinning animation using CSS animations
- Configurable size with the `size` prop
- Customizable styling with CSS classes
- Built-in `animate-spin` animation with proper centering
- Exports both `AILoader` wrapper and `LoaderIcon` for flexible usage
- Supports all standard HTML div attributes
- TypeScript support with proper type definitions
- Optimized SVG icon with multiple opacity levels for smooth animation
- Uses `currentColor` for proper theme integration
- Responsive and accessible design

#### Examples

##### Different Sizes

##### Custom Styling

#### Usage with AI SDK

Build a simple chat app that displays a loader before the response starts streaming by using `status === "submitted"`.

```typescript
'use client';

import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Input, PromptInputTextarea, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { Loader } from '@/components/ai-elements/loader';
import { useState } from 'react';
import { useChat } from '@ai-sdk/react';

const LoaderDemo = () => {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <Conversation>
          <ConversationContent>
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case 'text':
                        return (
                          <div key={`${message.id}-${i}`}>{part.text}</div>
                        );
                      default:
                        return null;
                    }
                  })}
                </MessageContent>
              </Message>
            ))}
            {status === 'submitted' && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <Input onSubmit={handleSubmit} className="mt-4 w-full max-w-2xl mx-auto relative">
          <PromptInputTextarea
            value={input}
            placeholder="Say something..."
            onChange={(e) => setInput(e.currentTarget.value)}
            className="pr-12"
          />
          <PromptInputSubmit
            status={status === 'streaming' ? 'streaming' : 'ready'}
            disabled={!input.trim()}
            className="absolute bottom-1 right-1"
          />
        </Input>
      </div>
    </div>
  );
};

export default LoaderDemo;
```

## Mastra Framework Documentation

### Runtime Context

Agents, tools, and workflows can all accept `RuntimeContext` as a parameter, making request-specific values available to the underlying primitives.

#### When to use `RuntimeContext`

Use `RuntimeContext` when a primitive's behavior should change based on runtime conditions. For example, you might switch models or storage backends based on user attributes, or adjust instructions and tool selection based on language.

#### Setting values

Pass `runtimeContext` into an agent, network, workflow, or tool call to make values available to all underlying primitives during execution. Use `.set()` to define values before making the call.

The `.set()` method takes two arguments:

1. key: The name used to identify the value.
2. value: The data to associate with that key.

```typescript
import { RuntimeContext } from "@mastra/core/runtime-context";

export type UserTier = {
  "user-tier": "enterprise" | "pro";
};

const runtimeContext = new RuntimeContext<UserTier>();
runtimeContext.set("user-tier", "enterprise");

const agent = mastra.getAgent("weatherAgent");
await agent.generate("What's the weather in London?", {
  runtimeContext,
});

const routingAgent = mastra.getAgent("routingAgent");
routingAgent.network("What's the weather in London?", {
  runtimeContext,
});

const run = await mastra.getWorkflow("weatherWorkflow").createRunAsync();
await run.start({
  inputData: {
    city: "London",
  },
  runtimeContext,
});
await run.resume({
  resumeData: {
    city: "New York",
  },
  runtimeContext,
});

await weatherTool.execute({
  context: {
    location: "London",
  },
  runtimeContext,
});
```

##### Setting values based on request headers

You can populate `runtimeContext` dynamically in server middleware by extracting information from the request. In this example, the `temperature-unit` is set based on the Cloudflare `CF-IPCountry` header to ensure responses match the user's locale.

```typescript
import { Mastra } from "@mastra/core/mastra";
import { RuntimeContext } from "@mastra/core/runtime-context";

export const mastra = new Mastra({
  agents: { testWeatherAgent },
  server: {
    middleware: [
      async (context, next) => {
        const country = context.req.header("CF-IPCountry");
        const runtimeContext = context.get("runtimeContext");

        runtimeContext.set(
          "temperature-unit",
          country === "US" ? "fahrenheit" : "celsius",
        );

        await next();
      },
    ],
  },
});
```

#### Accessing values with agents

You can access the `runtimeContext` argument from any supported configuration options in agents. These functions can be sync or `async`. Use the `.get()` method to read values from `runtimeContext`.

```typescript
export type UserTier = {
  "user-tier": "enterprise" | "pro";
};

export const weatherAgent = new Agent({
  name: "weather-agent",
  instructions: async ({ runtimeContext }) => {
    const userTier = runtimeContext.get("user-tier") as UserTier["user-tier"];

    if (userTier === "enterprise") {
      // ...
    }
    // ...
  },
  model: ({ runtimeContext }) => {
    // ...
  },
  tools: ({ runtimeContext }) => {
    // ...
  },
  memory: ({ runtimeContext }) => {
    // ...
  },
});
```

You can also use `runtimeContext` with other options like `agents`, `workflows`, `scorers`, `inputProcessors`, and `outputProcessors`.

#### Accessing values from workflow steps

You can access the `runtimeContext` argument from a workflow step's `execute` function. This function can be sync or async. Use the `.get()` method to read values from `runtimeContext`.

```typescript
export type UserTier = {
  "user-tier": "enterprise" | "pro";
};

const stepOne = createStep({
  id: "step-one",
  execute: async ({ runtimeContext }) => {
    const userTier = runtimeContext.get("user-tier") as UserTier["user-tier"];

    if (userTier === "enterprise") {
      // ...
    }
    // ...
  },
});
```

#### Accessing values with tools

You can access the `runtimeContext` argument from a tool's `execute` function. This function is `async`. Use the `.get()` method to read values from `runtimeContext`.

```typescript
export type UserTier = {
  "user-tier": "enterprise" | "pro";
};

export const weatherTool = createTool({
  id: "weather-tool",
  execute: async ({ runtimeContext }) => {
    const userTier = runtimeContext.get("user-tier") as UserTier["user-tier"];

    if (userTier === "enterprise") {
      // ...
    }
    // ...
  },
});
```

### Middleware

Mastra servers can execute custom middleware functions before or after an API route handler is invoked. This is useful for things like authentication, logging, injecting request-specific context or adding CORS headers.

A middleware receives the [Hono](https://hono.dev/) `Context` (`c`) and a `next` function. If it returns a `Response` the request is short-circuited. Calling `next()` continues processing the next middleware or route handler.

```typescript
import { Mastra } from "@mastra/core/mastra";

export const mastra = new Mastra({
  // ...
  server: {
    middleware: [
      {
        handler: async (c, next) => {
          // Example: Add authentication check
          const authHeader = c.req.header("Authorization");
          if (!authHeader) {
            return new Response("Unauthorized", { status: 401 });
          }

          await next();
        },
        path: "/api/*",
      },
      // Add a global request logger
      async (c, next) => {
        console.log(`${c.req.method} ${c.req.url}`);
        await next();
      },
    ],
  },
});
```

To attach middleware to a single route pass the `middleware` option to `registerApiRoute`:

```typescript
registerApiRoute("/my-custom-route", {
  method: "GET",
  middleware: [
    async (c, next) => {
      console.log(`${c.req.method} ${c.req.url}`);
      await next();
    },
  ],
  handler: async (c) => {
    const mastra = c.get("mastra");
    return c.json({ message: "Custom route" });
  },
});
```

#### Common examples

##### Using `runtimeContext`

##### Authentication

```typescript
{
  handler: async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }
    // Validate token here
    await next();
  },
  path: '/api/*',
}
```

##### CORS support

```typescript
{
  handler: async (c, next) => {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (c.req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }
    await next();
  },
}
```

##### Request logging

```typescript
{
  handler: async (c, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    console.log(`${c.req.method} ${c.req.url} - ${duration}ms`);
  },
}
```

##### Special Mastra headers

When integrating with Mastra Cloud or custom clients the following headers can be inspected by middleware to tailor behavior:

```typescript
{
  handler: async (c, next) => {
    const isFromMastraCloud = c.req.header('x-mastra-cloud') === 'true';
    const clientType = c.req.header('x-mastra-client-type');
    const isStudio = c.req.header('x-studio') === 'true';
    if (isFromMastraCloud) {
      // Special handling
    }
    await next();
  },
}
```

- `x-mastra-cloud`: request originates from Mastra Cloud
- `x-mastra-client-type`: identifies the client SDK, e.g. `js` or `python`
- `x-studio`: request triggered from Studio

### Custom API Routes

By default Mastra automatically exposes registered agents and workflows via the server. For additional behavior you can define your own HTTP routes.

Routes are provided with a helper `registerApiRoute` from `@mastra/core/server`. Routes can live in the same file as the `Mastra` instance but separating them helps keep configuration concise.

```typescript
import { Mastra } from "@mastra/core/mastra";
import { registerApiRoute } from "@mastra/core/server";

export const mastra = new Mastra({
  // ...
  server: {
    apiRoutes: [
      registerApiRoute("/my-custom-route", {
        method: "GET",
        handler: async (c) => {
          const mastra = c.get("mastra");
          const agents = await mastra.getAgent("my-agent");

          return c.json({ message: "Custom route" });
        },
      }),
    ],
  },
});
```

Once registered, a custom route will be accessible from the root of the server. For example:

```
curl http://localhost:4111/my-custom-route
```

Each route's handler receives the Hono `Context`. Within the handler you can access the `Mastra` instance to fetch or call agents and workflows.

To add route-specific middleware pass the `middleware` array when calling `registerApiRoute`.

```typescript
import { Mastra } from "@mastra/core/mastra";
import { registerApiRoute } from "@mastra/core/server";

export const mastra = new Mastra({
  // ...
  server: {
    apiRoutes: [
      registerApiRoute("/my-custom-route", {
        method: "GET",
        middleware: [
          async (c, next) => {
            console.log(`${c.req.method} ${c.req.url}`);
            await next();
          },
        ],
        handler: async (c) => {
          return c.json({ message: "Custom route with middleware" });
        },
      }),
    ],
  },
});
```

### Integrate Mastra in your Next.js project

Mastra integrates with Next.js, making it easy to:

- Build flexible APIs to serve AI-powered features
- Simplify deployment with a unified codebase for frontend and backend
- Take advantage of Next.js's built-in server actions (App Router) or API Routes (Pages Router) for efficient server-client workflows

Use this guide to scaffold and integrate Mastra with your Next.js project.

#### Prerequisites

- Node.js 18+
- Next.js project
- AI SDK installed

#### Setup

1. To integrate Mastra into your project, you have two options:

   - Use the One-Liner

   Run the following command to quickly scaffold the default Weather agent with sensible defaults:

   ```
   npx mastra@latest init --dir . --components agents,tools --example --llm openai
   ```

   - Use the Interactive CLI

   If you prefer to customize the setup, run the `init` command and choose from the options when prompted:

   ```
   npx mastra@latest init
   ```

2. Set Up API Key

   ```
   OPENAI_API_KEY=<your-api-key>
   ```

   Each LLM provider uses a different env var. See [Model Capabilities](https://sdk.vercel.ai/providers) for more information.

3. Add to your `next.config.ts`:

   ```typescript
   import type { NextConfig } from "next";

   const nextConfig: NextConfig = {
     serverExternalPackages: ["@mastra/*"],
   };

   export default nextConfig;
   ```

4. You can start your Next.js app in the usual way.

5. Create a new directory that will contain a Page, Action, and Form for testing purposes.

   ```
   mkdir app/test
   ```

6. Create a new Action, and add the example code:

   ```typescript
   "use server";

   import { mastra } from "../../mastra";

   export async function getWeatherInfo(formData: FormData) {
     const city = formData.get("city")?.toString();
     const agent = mastra.getAgent("weatherAgent");

     const result = await agent.generate(`What's the weather like in ${city}?`);

     return result.text;
   }
   ```

7. Create a new Form component, and add the example code:

   ```typescript
   "use client";

   import { useState } from "react";
   import { getWeatherInfo } from "./action";

   export function Form() {
     const [result, setResult] = useState<string | null>(null);

     async function handleSubmit(formData: FormData) {
       const res = await getWeatherInfo(formData);
       setResult(res);
     }

     return (
       <form action={handleSubmit}>
         <input name="city" placeholder="Enter city" required />
         <button type="submit">Get Weather</button>
       </form>
       {result && <pre>{result}</pre>}
     );
   }
   ```

8. Create a new Page, and add the example code:

   ```typescript
   import { Form } from "./form";

   export default async function Page() {
     return (
       <>
         <h1>Test</h1>
         <Form />
       </>
     );
   }
   ```

You can now navigate to `/test` in your browser to try it out.

---

*Documentation fetched from various sources on December 8, 2025*