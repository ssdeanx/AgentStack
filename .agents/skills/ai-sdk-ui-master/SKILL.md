---
name: ai-sdk-ui-master
description: Expert guidance for AI SDK UI (v6), @ai-sdk/react, and ai-elements in AgentStack. Use when building or modifying chat interfaces, streaming UIs, message rendering, tool displays, Mastra integration, or ai-elements components. Covers useChat, DefaultChatTransport, UIMessage parts, type guards, and Mastra toAISdkStream.
---

# AI SDK UI Master

Expert skill for AI SDK UI (v6), `ai` package, and ai-elements in AgentStack with Mastra backend.

## Stack Overview

| Package | Version | Purpose |
|---------|---------|---------|
| `ai` | ^6.0.97 | UIMessage, parts, createUIMessageStream, createUIMessageStreamResponse, type guards |
| `@ai-sdk/react` | ^3.0.99 | useChat hook |
| `@mastra/ai-sdk` | ^1.0.5 | toAISdkStream, chatRoute, networkRoute, workflowRoute |
| ai-elements | local | 50+ components in `src/components/ai-elements/` |

## Key File Map

| Purpose | Location |
|---------|----------|
| Chat provider | `app/chat/providers/chat-context.tsx` |
| Chat types | `app/chat/providers/chat-context-types.ts` |
| Message rendering | `app/chat/components/chat-messages.tsx` |
| Stream conversion | `lib/client-stream-to-ai-sdk.ts` |
| API chat route | `app/api/chat/route.ts` |
| MastraClient | `lib/mastra-client.ts` |
| Agent config | `app/chat/config/agents.ts` |

### Base ai-elements (library components)

Reusable building blocks in `src/components/ai-elements/` — **not** in `tools/` or `custom/`.

| Category | Location | Reference |
|----------|----------|-----------|
| Conversation & Messaging | `src/components/ai-elements/` | [Base: conversation-messaging](ai-elements-reference.md#base-conversation-messaging) |
| Code & Development | `src/components/ai-elements/` | [Base: code-development](ai-elements-reference.md#base-code-development) |
| Reasoning & Debugging | `src/components/ai-elements/` | [Base: reasoning-debugging](ai-elements-reference.md#base-reasoning-debugging) |
| Input & Controls | `src/components/ai-elements/` | [Base: input-controls](ai-elements-reference.md#base-input-controls) |
| Visualization & Canvas | `src/components/ai-elements/` | [Base: visualization-canvas](ai-elements-reference.md#base-visualization-canvas) |
| Media & Audio | `src/components/ai-elements/` | [Base: media-audio](ai-elements-reference.md#base-media-audio) |
| Agent & Tool (base) | `src/components/ai-elements/` — Tool, ToolHeader, ToolContent, etc. | [Base: agent-tool](ai-elements-reference.md#base-agent-tool) |
| Other (base) | `src/components/ai-elements/` — loader, context, sources, plan, … | [Base: other](ai-elements-reference.md#base-other) |

### Custom tool UIs (project-specific)

Mastra tool result renderers in `src/components/ai-elements/tools/`. They **use** base ai-elements (e.g. `tool.tsx`).

| What | Location | Reference |
|------|----------|-----------|
| Custom tool UIs ↔ Mastra | `src/components/ai-elements/tools/` | [Part 3: Custom tool UIs](ai-elements-reference.md#part-3-custom-tool-uis-project-specific) |
| Backend → toolName → UI table | — | [Backend → stream toolName → UI mapping](ai-elements-reference.md#backend--stream-toolname--ui-mapping) |
| Other project-specific | `src/components/ai-elements/custom/` | [Part 4: Other project-specific (custom/)](ai-elements-reference.md#part-4-other-project-specific-custom) |

**Tool name → UI:** Stream `toolName` is matched in `app/chat/components/agent-tools.tsx`; custom UIs live in `src/components/ai-elements/tools/`. Fallback uses **base** `Tool`/`ToolHeader`/`ToolContent` from `tool.tsx`. Types from `ai-elements/tools/types.ts` via `InferUITool<typeof mastraTool>`.

### Mastra Backend (one reference per subdirectory)

| Purpose | Location | Reference |
|---------|----------|-----------|
| Mastra entry | `src/mastra/index.ts` | [mastra-reference.md](mastra-reference.md#src-mastra-index) |
| Agents (31+) | `src/mastra/agents/` | [mastra-reference.md](mastra-reference.md#src-mastra-agents) |
| Tools (60+) | `src/mastra/tools/` | [mastra-reference.md](mastra-reference.md#src-mastra-tools) |
| Networks (13) | `src/mastra/networks/` | [mastra-reference.md](mastra-reference.md#src-mastra-networks) |
| Workflows (15+) | `src/mastra/workflows/` | [mastra-reference.md](mastra-reference.md#src-mastra-workflows) |
| Config | `src/mastra/config/` | [mastra-reference.md](mastra-reference.md#src-mastra-config) |
| A2A coordination | `src/mastra/a2a/` | [mastra-reference.md](mastra-reference.md#src-mastra-a2a) |
| MCP server | `src/mastra/mcp/` | [mastra-reference.md](mastra-reference.md#src-mastra-mcp) |
| Evals/scorers | `src/mastra/evals/` | [mastra-reference.md](mastra-reference.md#src-mastra-evals) |
| Services | `src/mastra/services/` | [mastra-reference.md](mastra-reference.md#src-mastra-services) |
| Data | `src/mastra/data/` | [mastra-reference.md](mastra-reference.md#src-mastra-data) |
| Policy | `src/mastra/policy/` | [mastra-reference.md](mastra-reference.md#src-mastra-policy) |

## Transport Pattern

Chat connects **directly** to Mastra API (`NEXT_PUBLIC_MASTRA_API_URL`, default `http://localhost:4111`). Do not use MastraClient for chat streaming.

```tsx
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { RequestContext, MASTRA_RESOURCE_ID_KEY, MASTRA_THREAD_ID_KEY } from '@mastra/core/request-context'

const MASTRA_API_URL = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? 'http://localhost:4111'

const transport = new DefaultChatTransport({
  api: `${MASTRA_API_URL}/chat/${selectedAgent}`,
  prepareSendMessagesRequest({ messages: outgoingMessages }) {
    const last = outgoingMessages[outgoingMessages.length - 1]
    const textPart = last?.parts?.find((p): p is TextUIPart => p.type === 'text')
    const requestContext = new RequestContext()
    requestContext.set(MASTRA_RESOURCE_ID_KEY, resourceId)
    requestContext.set(MASTRA_THREAD_ID_KEY, threadId)

    return {
      body: {
        id: selectedAgent,
        messages: outgoingMessages,
        memory: { thread: threadId, resource: resourceId },
        resourceId,
        data: { agentId: selectedAgent, threadId, input: textPart?.text ?? '' },
        requestContext,
      },
    }
  },
})

const { messages, sendMessage, stop, status } = useChat({ transport })
```

## UIMessage Parts (AI SDK v6)

Use `message.parts`, not `message.content`. Each part has a `type` discriminator.

| Part Type | Type Guard | Purpose |
|-----------|------------|---------|
| `text` | `isTextUIPart` | Text content |
| `reasoning` | `isReasoningUIPart` | Thinking/reasoning |
| `tool-*` / `dynamic-tool` | `isToolUIPart` / `isToolOrDynamicToolUIPart` | Tool invocations |
| `file` | `isFileUIPart` | Attachments |
| `source-url` / `source-document` | — | Citations |
| `data` | `isDataUIPart` | Structured data |

```tsx
import {
  isTextUIPart,
  isReasoningUIPart,
  isToolOrDynamicToolUIPart,
  isFileUIPart,
  isDataUIPart,
} from 'ai'

const textPart = message.parts?.find(isTextUIPart)
const content = textPart?.text ?? ''

const tools = message.parts?.filter(isToolOrDynamicToolUIPart)
const fileParts = message.parts?.filter(isFileUIPart)
```

## AI Elements Integration Map

| Component File | AI Elements Used |
|----------------|------------------|
| `chat-messages.tsx` | Conversation, Message, CodeBlock, Attachments, AudioPlayer, Transcription, Image |
| `agent-reasoning.tsx` | Reasoning, ReasoningTrigger, ReasoningContent |
| `agent-chain-of-thought.tsx` | ChainOfThought, ChainOfThoughtHeader, ChainOfThoughtContent, ChainOfThoughtStep |
| `agent-tools.tsx` | Tool, ToolHeader, ToolInput, ToolOutput |
| `agent-sources.tsx` | Sources, SourcesTrigger, SourcesContent, Source |
| `agent-artifact.tsx` | Artifact, ArtifactHeader, ArtifactContent, ArtifactActions, ArtifactCode |
| `agent-sandbox.tsx` | Sandbox, FileTree, Terminal, TestResults, SchemaDisplay, StackTrace |
| `agent-workflow.tsx` | Canvas, Node, Edge, Panel |
| `chat-input.tsx` | PromptInput, SpeechInput, Context (token usage), ModelSelector |

Import from `@/src/components/ai-elements/<component>`:

```tsx
import { Message, MessageContent, MessageResponse } from '@/src/components/ai-elements/message'
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/src/components/ai-elements/reasoning'
import { Tool, ToolHeader, ToolInput, ToolOutput } from '@/src/components/ai-elements/tool'
```

## Agent Config Features

`agentConfig.features` controls which agent-* components render. Check before rendering:

```tsx
const { agentConfig } = useChatContext()

if (agentConfig.features.reasoning) {
  // Render AgentReasoning
}
if (agentConfig.features.tools) {
  // Render AgentTools
}
if (agentConfig.features.sources) {
  // Render AgentSources
}
if (agentConfig.features.artifacts) {
  // Render AgentArtifact
}
```

See `app/chat/config/agents.ts` for full `AgentFeatures` schema.

## Mastra Stream Conversion

### Server-side (Next.js API routes)

```tsx
import { toAISdkStream } from '@mastra/ai-sdk'
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'

const stream = await agent.stream(messages, { threadId, resourceId, requestContext })

const uiStream = createUIMessageStream({
  originalMessages: messages,
  execute: async ({ writer }) => {
    const aiStream = toAISdkStream(stream, {
      from: 'agent',
      sendReasoning: true,
      sendSources: true,
    })
    for await (const value of aiStream) {
      await writer.write(value)
    }
  },
})

return createUIMessageStreamResponse({ stream: uiStream })
```

### Mastra chatRoute config (src/mastra/index.ts)

```ts
chatRoute({
  path: '/chat/:agentId',
  sendStart: true,
  sendFinish: true,
  sendReasoning: true,
  sendSources: true,
})
```

## MastraClient vs Direct Transport

| Use Case | Approach |
|----------|----------|
| Chat streaming | `DefaultChatTransport` → Mastra API directly |
| Network streaming | `DefaultChatTransport` → `/network/:agentId` |
| Workflow streaming | `DefaultChatTransport` → `/workflow/:workflowId` |
| Dashboard (agents, workflows, traces, threads) | `MastraClient` from `lib/mastra-client.ts` |

**Do not** use MastraClient for chat/network/workflow streaming.

## Anti-Patterns

1. **Do not use MastraClient for chat streaming** — use DefaultChatTransport.
2. **Use `message.parts` not `message.content`** — AI SDK v6 is parts-based.
3. **Import type guards from `ai`** — not custom implementations.
4. **Check agentConfig.features** before rendering agent-* components.
5. **Use RequestContext** for multi-tenancy (resourceId, threadId) in prepareSendMessagesRequest.

## Quick Reference

### ChatContext value (useChatContext)

- `messages`, `status`, `isLoading`, `error`
- `sendMessage(text, files?)`, `stopGeneration()`, `clearMessages()`
- `selectedAgent`, `agentConfig`, `selectAgent(id)`
- `streamingContent`, `streamingReasoning`, `toolInvocations`, `sources`
- `threadId`, `resourceId`, `setThreadId`, `setResourceId`
- `webPreview`, `setWebPreview`, `checkpoints`, `createCheckpoint`, `restoreCheckpoint`

### Endpoints

- Chat: `${MASTRA_API_URL}/chat/${agentId}`
- Network: `${MASTRA_API_URL}/network/${agentId}`
- Workflow: `${MASTRA_API_URL}/workflow/${workflowId}`

## Additional Resources

- **AI Elements (one ref per category):** [ai-elements-reference.md](ai-elements-reference.md)
- **Mastra backend (one ref per subdir):** [mastra-reference.md](mastra-reference.md)
- Agent config, API routes: [reference.md](reference.md)
- Agent config schema: `app/chat/config/agents.ts`
- app/api/mastra routes: agents, workflows, threads, traces, tools, vectors, memory
