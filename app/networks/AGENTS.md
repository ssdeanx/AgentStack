# Networks Feature

## Overview

The networks page provides an advanced chat interface for interacting with Mastra agent networks. It uses `@ai-sdk/react` with `DefaultChatTransport` to stream responses from the `/network` route, and leverages **AI Elements** components for a rich chat experience.

## Architecture

```text
app/networks/
├── page.tsx                      # Main page with chat + routing panel
├── config/
│   └── networks.ts               # Network definitions and types
├── providers/
│   └── network-context.tsx       # State management with useChat
└── components/
    ├── network-header.tsx        # Header with network selector
    ├── network-chat.tsx          # AI Elements chat (Conversation, Message, Reasoning, Tool)
    ├── network-routing-panel.tsx # Visual routing flow sidebar
    ├── network-agents.tsx        # Agent list (legacy, optional)
    ├── network-messages.tsx      # Basic messages (legacy)
    └── network-input.tsx         # Basic input (legacy)
```

## AI Elements Integration

The network chat uses AI Elements components for a rich chat experience:

- **Conversation** - Auto-scrolling message container
- **Message/MessageContent/MessageResponse** - Styled message bubbles with markdown
- **Reasoning** - Collapsible reasoning display for chain-of-thought
- **Tool** - Tool invocation visualization with input/output
- **PromptInput** - Enhanced input with network selector

## AI SDK Integration

Uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport`:

```tsx
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

const { messages, sendMessage, stop, status } = useChat({
  transport: new DefaultChatTransport({
    api: "http://localhost:4111/network",
    prepareSendMessagesRequest({ messages }) {
      return {
        body: {
          messages,
          resourceId: selectedNetwork,
          data: { networkId, input },
        },
      }
    },
  }),
})
```

## Network Configuration

All 4 Mastra networks are configured in `config/networks.ts`:

| Network | Description |
|---------|-------------|
| agentNetwork | Intelligent routing to specialized agents |
| dataPipelineNetwork | Data ingestion, transformation, export |
| reportGenerationNetwork | Research, analysis, report generation |
| researchPipelineNetwork | Multi-source research aggregation |

## Usage

```tsx
import { NetworkProvider } from "./providers/network-context"
import { NetworkHeader } from "./components/network-header"
import { NetworkChat } from "./components/network-chat"
import { NetworkRoutingPanel } from "./components/network-routing-panel"

<NetworkProvider defaultNetwork="agentNetwork">
  <NetworkHeader />
  <NetworkChat />
  <NetworkRoutingPanel />
</NetworkProvider>
```

## Context API

`useNetworkContext()` provides:

| Property | Type | Description |
|----------|------|-------------|
| `selectedNetwork` | string | Currently selected network ID |
| `networkConfig` | NetworkConfig | Current network configuration |
| `networkStatus` | Status | idle \| routing \| executing \| completed \| error |
| `messages` | UIMessage[] | AI SDK message history |
| `streamingOutput` | string | Current streaming text |
| `routingSteps` | RoutingStep[] | Agent routing visualization |
| `sendMessage(text)` | function | Send message to network |
| `stopExecution()` | function | Stop streaming |
| `clearHistory()` | function | Clear conversation |

## Features

- **Real-time streaming** with stop/cancel support
- **Reasoning visualization** for chain-of-thought models
- **Tool invocation display** showing agent tool calls
- **Network selector** in both header and input
- **Routing flow panel** showing agent execution steps
- **Responsive layout** with collapsible sidebar on mobile
