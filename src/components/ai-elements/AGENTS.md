<!-- AGENTS-META {"title":"AI Elements Components","version":"1.0.0","applies_to":"src/components/ai-elements/","last_updated":"2025-11-27T00:00:00Z","status":"stable"} -->

# AI Elements Components

## Purpose

This folder contains **30 AI-focused React components** for building chat interfaces, reasoning displays, canvas workflows, and AI interaction patterns. These components are designed to work with the Vercel AI SDK and Mastra agents.

## Component Categories

### Chat Components (4)

| Component | File | Purpose |
|-----------|------|---------|
| Message | `message.tsx` | Chat message display with user/assistant roles |
| Conversation | `conversation.tsx` | Threaded message list container |
| Prompt Input | `prompt-input.tsx` | Chat input with attachments support |
| Suggestion | `suggestion.tsx` | Quick action suggestions |

### AI Display Components (4)

| Component | File | Purpose |
|-----------|------|---------|
| Reasoning | `reasoning.tsx` | AI reasoning process visualization |
| Chain of Thought | `chain-of-thought.tsx` | Step-by-step thinking display |
| Plan | `plan.tsx` | Task planning visualization |
| Task | `task.tsx` | Individual task status cards |

### Tool Components (4)

| Component | File | Purpose |
|-----------|------|---------|
| Tool | `tool.tsx` | Tool execution status display |
| Code Block | `code-block.tsx` | Syntax-highlighted code (Shiki) |
| Artifact | `artifact.tsx` | Generated content artifacts |
| Sources | `sources.tsx` | Citation and source references |

### Canvas Components (5)

| Component | File | Purpose |
|-----------|------|---------|
| Canvas | `canvas.tsx` | Main canvas container (XY Flow) |
| Node | `node.tsx` | Canvas node elements |
| Edge | `edge.tsx` | Node connection lines |
| Connection | `connection.tsx` | Interactive connections |
| Controls | `controls.tsx` | Canvas zoom/pan controls |

### Feedback Components (4)

| Component | File | Purpose |
|-----------|------|---------|
| Loader | `loader.tsx` | Loading states |
| Shimmer | `shimmer.tsx` | Skeleton loading animations |
| Progress | `progress.tsx` | Progress indicators |
| Checkpoint | `checkpoint.tsx` | Workflow checkpoints |

### Context Components (4)

| Component | File | Purpose |
|-----------|------|---------|
| Context | `context.tsx` | Context provider |
| Panel | `panel.tsx` | Side panels |
| Toolbar | `toolbar.tsx` | Action toolbars |
| Queue | `queue.tsx` | Task/message queues |

### Interactive Components (5)

| Component | File | Purpose |
|-----------|------|---------|
| Confirmation | `confirmation.tsx` | Action confirmations |
| Model Selector | `model-selector.tsx` | AI model picker |
| Open in Chat | `open-in-chat.tsx` | Launch in chat action |
| Web Preview | `web-preview.tsx` | URL/iframe previews |
| Image | `image.tsx` | AI-generated image display |
| Inline Citation | `inline-citation.tsx` | In-text citations |

## Tech Stack

- **React 19**: Latest React features
- **Vercel AI SDK**: `ai` package integration (`UIMessage`, `FileUIPart`)
- **XY Flow**: `@xyflow/react` for canvas
- **Streamdown**: Markdown streaming
- **Shiki**: Syntax highlighting
- **Motion**: Animations (`motion`)

## Usage

Import from `@/components/ai-elements/*`:

```tsx
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput } from "@/components/ai-elements/prompt-input";
import { Reasoning } from "@/components/ai-elements/reasoning";
import { CodeBlock } from "@/components/ai-elements/code-block";
```

## Integration with Mastra

These components are designed to display output from Mastra agents:

```tsx
// Example: Display agent message with reasoning
<Message from="assistant">
  <Reasoning steps={agentThinkingSteps} />
  <MessageContent>
    <MessageResponse>{agentResponse}</MessageResponse>
  </MessageContent>
</Message>
```

## Related

- `ui/`: Base shadcn/ui components (19) these build upon
- `app/`: Next.js pages using these components
- `src/mastra/agents/`: Backend agents that power these UIs

---
Last updated: 2025-11-27
