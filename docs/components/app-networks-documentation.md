---
title: Agent Networks - Technical Documentation
component_path: app/networks
version: 1.0
date_created: 2025-12-06
last_updated: 2025-12-06
owner: AgentStack Frontend Team
tags: [component, ui, networks, provider, documentation]
---

# Agent Networks Documentation (app/networks)

This document describes the frontend Agent Networks subsystem which provides a composable UI for routing requests across multiple specialized agents. It documents responsibilities, interfaces, design decisions, and recommended tests for `app/networks`.

## 1. Component Overview

### Purpose / Responsibility

- Provide a user-facing interface to route requests through multi-agent networks (A2A/MCP style workflows).
- Expose a well-typed provider (`NetworkProvider`) that orchestrates state (messages, routing steps, tool invocations, sources) and integrates with the Mastra `network` API for streaming multi-agent execution.

### Scope

- In scope: `NetworkProvider` (state + transport), `NetworksPage` layout, primary components: `NetworkHeader`, `NetworkChat`, `NetworkRoutingPanel` and supporting subcomponents in `components/`.
- Out of scope: server-side agent implementations (src/mastra) and backend orchestration details.

### Context and Relationships

- Frontend built on Next.js 16 (app router) + React 19 and Tailwind CSS.
- Uses `@ai-sdk/react`'s `useChat` with `DefaultChatTransport` to call `${NEXT_PUBLIC_MASTRA_API_URL}/network`.
- Integrates with AI Elements in `src/components/ai-elements/` and shared UI primitives in `ui/`.

## 2. Architecture

- Pattern: Provider + compositional UI components. The `NetworkProvider` binds transport to Mastra network endpoint and keeps derived state (routing steps, streaming output, tool invocations, sources) for components to render.
- Core design choices: Must handle streaming responses, convert multiple Mastra data parts into a unified presentation model (dynamic-tool), and maintain routing visualization state.

```mermaid
graph TD
  subgraph Frontend Chat
    Page[NetworksPage (page.tsx)] --> Provider[NetworkProvider (providers/network-context.tsx)]
    Provider --> Header[NetworkHeader]
    Provider --> Chat[NetworkChat]
    Provider --> Routing[NetworkRoutingPanel]
  end

  Provider -.-> DefaultTransport[DefaultChatTransport @ai-sdk/react]
  DefaultTransport --> MastraNetwork[(Mastra Network API: /network)]
  MastraNetwork --> |streaming messages| Provider

  subgraph UI Elements
    Chat --> Conversation[Conversation / Message / Tool / Artifact components]
    Header --> ModelSelector
    Routing --> GraphVisualization
  end

  classDef external fill:#fde68a,stroke:#333
  class MastraNetwork external
```

## 3. Interface Documentation

Top-level public interface: `NetworkContextValue` (see `providers/network-context.tsx`). Key entries:

- `selectedNetwork: NetworkId` — current network id.
- `networkConfig: NetworkConfig | undefined` — static config (agents list, name, description).
- `networkStatus: NetworkStatus` — `"idle" | "routing" | "executing" | "completed" | "error"`.
- `routingSteps: RoutingStep[]` — per-agent routing execution progress.
- `messages: UIMessage[]` — streaming messages exchanged with the backend.
- `toolInvocations: ToolInvocationState[]` — extracted dynamic-tool parts for UI display.
- `sendMessage(text: string)` — enqueue and execute a network request.
- `stopExecution()` — halts streaming execution.
- `clearHistory()` — resets messages and routing state.

Public types of interest (partial):

- RoutingStep { agentId, agentName, input, output?, status, startedAt?, completedAt? }
- ToolInvocationState (alias for DynamicToolUIPart) — normalized view of tool call parts.

## 4. Implementation Details

### NetworkProvider (providers/network-context.tsx)

- Responsibilities:
  - Configure `useChat` transport for `${MASTRA_API_URL}/network` and prepare request payload with `resourceId` and `networkId`.
  - Track derived, UI-friendly state: `routingSteps`, `toolInvocations`, `sources`, `networkStatus`, `streamingOutput` and `streamingReasoning`.
  - Convert Mastra `data-network` and `data-tool-*` parts into a consistent `dynamic-tool` representation via `mapDataPartToDynamicTool()`.
  - Initialize `routingSteps` when `data-network` parts are present and network configuration indicates applicable agents.

### Key behaviors

- Streaming extraction: `streamingOutput` and `streamingReasoning` return textual parts of the last assistant message for display while streaming.
- Tool normalization: `mapDataPartToDynamicTool` inspects Mastra parts to build a `DynamicToolUIPart` including `toolCallId`, `toolName`, `input`, `output`, `errorText`, and `state`.
- Routing steps population: when a response contains `data-network` or tool parts, `NetworkProvider` will seed an ordered `routingSteps` array using `networkConfig.agents` and set initial statuses depending on the `aiStatus`.

### Error handling

- `networkError` is surfaced via the `error` field; `networkStatus` maps `aiError` or `networkError` to `error`.

### Configuration

- `NEXT_PUBLIC_MASTRA_API_URL` — used to build the `DefaultChatTransport` endpoint. Defaults to `http://localhost:4111` in development.

## 5. Usage Examples

### Page composition

```tsx
export default function NetworksPage() {
  return (
    <NetworkProvider defaultNetwork="agentNetwork">
      <main>
        <NetworkHeader />
        <NetworkChat />
        <NetworkRoutingPanel />
      </main>
    </NetworkProvider>
  )
}
```

### Consuming context inside a component

```tsx
import { useNetworkContext } from '@/app/networks/providers/network-context'

function MyToolList() {
  const { toolInvocations } = useNetworkContext()
  return <div>{toolInvocations.length} tools invoked</div>
}
```

## 6. Quality Attributes

- Security: Keep the Mastra API on a trusted backend; the front-end should never embed secrets. Enable server-side validation for network requests and enforce RBAC at the API layer.
- Performance: Streaming messages should use incremental rendering; ensure heavy parsing is memoized. Avoid growing in-memory snapshots for long-running threads without bounds.
- Reliability: The provider must gracefully recover from network errors and update `networkStatus` appropriately.
- Maintainability: Small composable UI primitives make the system testable. Normalization logic (`mapDataPartToDynamicTool`) centralizes Mastra→UI translation.

## 7. Testing & Observability

- Unit tests (Vitest):
  - `NetworkProvider` — test `mapDataPartToDynamicTool`, `sendMessage`, `selectNetwork`, and routing state transitions.
  - `NetworkChat` — ensure rendering for different message parts (reasoning, tools, artifacts, web preview). Mock `useChat` for streaming scenarios.
  - `NetworkHeader` — model/network selection, stop/clear interactions.

- Integration tests: simulate a streaming `data-network` payload from the Mastra network endpoint and assert the routing steps are populated and update statuses correctly.

- Observability: trace streaming sessions, measure routing latency and tool execution durations in Arize / Langfuse (if enabled) for production monitoring.

## 8. Next Actions / Recommendations

- Small (quick): Add unit tests for `mapDataPartToDynamicTool` and `toolInvocations` parsing.
- Medium: Add an integration test that simulates a network run with streaming responses and tool outputs to validate UI and provider behavior.
- High: Implement limits or eviction on routing snapshots for very long sessions and add telemetry for per-step latency.

## 9. References

- Files: `app/networks/page.tsx`, `app/networks/providers/network-context.tsx`, `app/networks/components/*`.
- Uses `@ai-sdk/react` and `DefaultChatTransport` to interact with Mastra's `/network` endpoint.

## Change history

- 2025-12-06 — v1.0 — generated by documentation agent
