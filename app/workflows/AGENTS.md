# Workflows Feature

## Overview

The workflows page provides an interactive visualization of Mastra workflows using AI Elements components (Canvas, Node, Edge, Panel, Controls, Toolbar, Connection) with real-time streaming via `@ai-sdk/react` and `@mastra/ai-sdk`.

## Architecture

Follows the same modular pattern as the chat feature:

```text
app/workflows/
├── page.tsx              # Main page component (clean, minimal)
├── config/
│   └── workflows.ts      # Workflow definitions and types
├── providers/
│   └── workflow-context.tsx  # State management with useChat
└── components/
    ├── workflow-header.tsx   # Header with workflow selector
    ├── workflow-canvas.tsx   # React Flow canvas wrapper
    ├── workflow-node.tsx     # Custom node component
    ├── workflow-info-panel.tsx   # Info panel (top-left)
    ├── workflow-legend.tsx   # Legend panel (bottom-left)
    ├── workflow-actions.tsx  # Actions panel (top-right)
    └── workflow-output.tsx   # Streaming output panel (bottom-right)
```

## AI SDK Integration

Uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport` to connect to Mastra's `/workflow` route:

```tsx
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

const { messages, sendMessage, stop, status } = useChat({
  transport: new DefaultChatTransport({
    api: "http://localhost:4111/workflow",
    prepareSendMessagesRequest({ messages }) {
      return {
        body: {
          inputData: { workflowId, input: messages[messages.length - 1]?.parts?.[0]?.text },
        },
      }
    },
  }),
})
```

## AI Elements Used

- **Canvas**: React Flow wrapper with pre-configured defaults
- **Node**: Card-based node with header, content, footer
- **Edge**: Animated and temporary edge types
- **Panel**: Positioned panels for UI overlays
- **Controls**: Zoom/pan controls
- **Toolbar**: Node-attached toolbar with actions
- **Connection**: Custom bezier curve connection lines

## Workflow Configuration

All 10 Mastra workflows are configured in `config/workflows.ts`:

- weatherWorkflow
- contentStudioWorkflow
- contentReviewWorkflow
- documentProcessingWorkflow
- financialReportWorkflow
- learningExtractionWorkflow
- researchSynthesisWorkflow
- stockAnalysisWorkflow
- telephoneGameWorkflow
- changelogWorkflow

## Usage

```tsx
import { WorkflowProvider } from "./providers/workflow-context"
import { WorkflowHeader } from "./components/workflow-header"
import { WorkflowCanvas } from "./components/workflow-canvas"

<WorkflowProvider defaultWorkflow="contentStudioWorkflow">
  <WorkflowHeader />
  <WorkflowCanvas />
</WorkflowProvider>
```

## Context API

`useWorkflowContext()` provides:

- `selectedWorkflow` - Currently selected workflow ID
- `workflowConfig` - Current workflow configuration
- `workflowStatus` - idle | running | paused | completed | error
- `nodes` / `edges` - Generated React Flow nodes and edges
- `runWorkflow(inputData?)` - Execute via AI SDK streaming
- `stopWorkflow()` - Stop the streaming workflow
- `messages` - AI SDK message history
- `streamingOutput` - Current streaming text output
