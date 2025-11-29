# Networks Feature

## Overview

The networks page provides an interface for interacting with Mastra agent networks using `@ai-sdk/react` and `DefaultChatTransport` to stream responses from the `/network` route.

## Architecture

Follows the same modular pattern as chat and workflows:

```text
app/networks/
├── page.tsx                  # Main page component
├── config/
│   └── networks.ts           # Network definitions and types
├── providers/
│   └── network-context.tsx   # State management with useChat
└── components/
    ├── network-header.tsx    # Header with network selector
    ├── network-agents.tsx    # Agent list sidebar
    ├── network-messages.tsx  # Conversation display
    └── network-input.tsx     # Message input
```

## AI SDK Integration

Uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport` to connect to Mastra's `/network` route:

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

- agentNetwork - Intelligent routing to specialized agents
- dataPipelineNetwork - Data ingestion, transformation, export
- reportGenerationNetwork - Research, analysis, report generation
- researchPipelineNetwork - Multi-source research aggregation

## Usage

```tsx
import { NetworkProvider } from "./providers/network-context"
import { NetworkHeader } from "./components/network-header"
import { NetworkAgents } from "./components/network-agents"
import { NetworkMessages } from "./components/network-messages"
import { NetworkInput } from "./components/network-input"

<NetworkProvider defaultNetwork="agentNetwork">
  <NetworkHeader />
  <NetworkAgents />
  <NetworkMessages />
  <NetworkInput />
</NetworkProvider>
```

## Context API

`useNetworkContext()` provides:

- `selectedNetwork` - Currently selected network ID
- `networkConfig` - Current network configuration
- `networkStatus` - idle | routing | executing | completed | error
- `messages` - AI SDK message history
- `streamingOutput` - Current streaming text
- `sendMessage(text)` - Send message to network
- `stopExecution()` - Stop streaming
