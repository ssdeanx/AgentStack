---
title: Chat UI & Provider - Technical Documentation
component_path: app/chat
version: 1.0
date_created: 2025-12-06
last_updated: 2025-12-06
owner: AgentStack Frontend Team
tags: [component, ui, chat, provider, documentation]
---

# Chat UI & Provider Documentation (app/chat)

A concise guide to the chat subsystem used by AgentStack's UI. This document covers responsibilities, public interfaces, internal structure and integration points for the chat page, provider, and supporting components under `app/chat`.

## 1. Component Overview

### Purpose / Responsibility

- Provide a high-quality, composable chat interface for interacting with agents (MCP / Mastra) — building UI around streaming LLM responses, tool invocation and supporting features (memory, checkpoints, tasks, sources, previews).

### Scope

- In scope: `ChatProvider` (application state + transport), `ChatPage` (layout), UI components: header, messages list, input and smaller agent-related components (artifacts, tools, previews, confirmations).
- Out of scope: backend Mastra server, agent implementations (src/mastra), and low-level transport implementations beyond DefaultChatTransport usage.

### Context and Relationships

- Frontend: Next.js 16 (app router) UI using React 19 and Tailwind.
- Integrates with: @ai-sdk/react's useChat / DefaultChatTransport and Mastra chat endpoint (MASTRA_API_URL).
- Uses shared UI primitives from `ui/` and AI Elements in `src/components/ai-elements/`.

## 2. Architecture

- Pattern: composition + provider pattern. Chat UI delegates state management to a context-backed provider (`ChatProvider`) and renders presentational components.
- Dataflow: user input → ChatProvider (useChat transport) → Mastra Chat API → streaming UI updates (messages, reasoning, tools) → render components.

Mermaid diagram (component structure):

```mermaid
graph TD
    subgraph "Frontend - Chat Subsystem"
      Page[ChatPage (page.tsx)] --> Provider[ChatProvider (providers/chat-context.tsx)]
      Provider --> Header[ChatHeader]
      Provider --> Messages[ChatMessages]
      Provider --> Input[ChatInput]
    end

    subgraph "AI Elements / UI Primitives"
      Header --> ModelSelector[ModelSelector (ai-elements)]
      Messages --> MessageParts[Message, Reasoning, Tools, Artifacts]
      Input --> PromptInput[PromptInput (ai-elements)]
    end

    Provider -.-> |uses| DefaultChatTransport[DefaultChatTransport (@ai-sdk/react)]
    DefaultChatTransport --> MastraAPI[(Mastra Chat API)]
    MastraAPI --> |streaming| Provider

    classDef external fill:#f9f,stroke:#333,stroke-width:1px
    class MastraAPI external
```

### Design patterns and choices

- Provider (React Context) to centralize chat state and actions.
- Functional/Compositional UI — small presentational components (Message, Conversation, Input) for easy testing and reuse.
- Feature flags in agentConfig (reasoning, chainOfThought, tools, artifacts, webPreview, queue) drive conditional rendering.

## 3. Interface Documentation

Primary public types and interfaces in `providers/chat-context.tsx`:

| Name | Purpose | Key Methods / Properties | Notes |
|---|---:|---|---|
| ChatProvider | App-level provider that maintains chat state and exposes actions | messages, status, selectedAgent, sendMessage(text, files?), stopGeneration(), createCheckpoint(), restoreCheckpoint(), setWebPreview(), setThreadId(), setResourceId() | Wraps @ai-sdk/react useChat with DefaultChatTransport and prepares request metadata for Mastra chat endpoint |
| useChatContext | Hook to consume ChatContext | Returns ChatContextValue (full typed API) | Throws if used outside provider |
| ChatPage | Layout component composing Header + Messages + Input | defaultAgent prop | Lightweight `page.tsx` wrapper |

ChatContextValue (high level) — partial list (see file for full list):

- messages: UIMessage[]
- status: "ready" | "submitted" | "streaming" | "error"
- selectedAgent: string
- toolInvocations: ToolInvocationState[]
- sendMessage(text: string, files?: File[]) => void
- stopGeneration() => void
- createCheckpoint(messageIndex:number, label?) => string
- restoreCheckpoint(checkpointId) => void

## 4. Implementation Details

### ChatProvider (providers/chat-context.tsx)

- Responsibilities:
  - Wire @ai-sdk/react's useChat transport with Mastra chat endpoint (DefaultChatTransport)
  - Convert messages → UI-friendly pieces (tools, reasoning, file parts)
  - Maintain derived state (streaming content/reasoning, token usage, sources, queued tasks, checkpoints, webPreview)
  - Provide state mutation helpers (sendMessage, stopGeneration, add/update/remove tasks, approval flow handlers, checkpoints management, thread/resource id mapping)

### Key algorithms / behaviors

- Tool extraction: provider inspects message.parts for dynamic-tool & Mastra `data-tool-*` parts (mapped to a unified DynamicToolUIPart shape) — used by Messages rendering.
- Web preview extraction: provider looks for tool outputs with previewUrl or code and builds a preview data object (data: URL for HTML snapshots) for AgentWebPreview rendering.
- Checkpoint snapshot: snapshots of messages are stored in a Map keyed by checkpoint id; restore operation prefers snapshot fallback and cleans up later checkpoints.

### Configuration

- Env var: `NEXT_PUBLIC_MASTRA_API_URL` (default: https://localhost:4111) — used by DefaultChatTransport to contact Mastra chat endpoint.

## 5. Usage Examples

### Basic (page composition)

```tsx
import { ChatProvider } from './providers/chat-context'
import { ChatHeader } from './components/chat-header'
import { ChatMessages } from './components/chat-messages'
import { ChatInput } from './components/chat-input'

export default function ChatPage() {
  return (
    <ChatProvider defaultAgent="researchAgent">
      <main>
        <ChatHeader />
        <ChatMessages />
        <ChatInput />
      </main>
    </ChatProvider>
  )
}
```

### Interacting programmatically

- Use `useChatContext()` inside subcomponents to call `sendMessage('hi')` or `createCheckpoint(index)` etc.

## 6. Quality Attributes

- Security: Provider constructs request metadata; ensure server-side authorization and input validation. Avoid leaking secrets in client bundles; endpoint URLs should be public-safe.
- Performance: streaming responses require careful render optimizations. Messages are memoized and parsing runs on message arrays — watch for expensive operations on long conversations.
- Reliability: provider keeps snapshots for checkpoints; ensure Map size and memory pressure are bounded when long-lived threads occur.
- Maintainability: small composable components; features driven by agentConfig — adding new features follows established pattern.

## 7. Testing & Observability

- Unit tests (Vitest) should cover:
  - `ChatProvider` helpers (createCheckpoint, restoreCheckpoint, add/update/remove tasks, approval flow)
  - `ChatInput` behavior: submit, file attachments, suggestions
  - `ChatMessages` render branches for reasoning, tools, artifacts, web previews
  - `ChatHeader` interactions: model/agent selection, memory settings, checkpoint restore

- Integration tests using mocked `useChat` transport to simulate streaming messages and tool responses — verify UI updates and checkpointing behavior.

## 8. Next Actions / Recommendations

- Small (quick): Add unit tests for `ChatProvider` core functions and provider-to-UI integration snapshots.
- Medium: Add integration tests that simulate streaming responses and dynamic-tool outputs to validate AgentTools, AgentWebPreview, artifacts handling.
- High: Add memory/long-conversation stress tests and enforce limits for snapshot storage; consider paginating or storing only last-N snapshots.

## 9. References

- File locations:
  - `app/chat/page.tsx` (entry)
  - `app/chat/providers/chat-context.tsx` (provider & types)
  - `app/chat/components/*` (header, input, messages, agent helpers)
  - `src/components/ai-elements/*` (Message, Conversation, PromptInput primitives)
  - `NEXT_PUBLIC_MASTRA_API_URL` env var

## 10. Change history

- 2025-12-06 — v1.0 — created by documentation generator
