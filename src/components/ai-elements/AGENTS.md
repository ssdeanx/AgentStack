<!-- AGENTS-META {"title":"AI Elements","version":"1.0.0","applies_to":"src/components/ai-elements/","last_updated":"2026-02-16T00:00:00Z","status":"stable"} -->

# AI Elements

## Overview

AI Elements is a specialized component library (30 components) for building AI-driven user interfaces. These components provide rich conversational, reasoning, and tooling experiences for chat applications, agent dashboards, and workflow visualizations.

## Component Categories

### Conversation & Messaging

- **`message.tsx`**: Core message bubble with role, content, and metadata
- **`conversation.tsx`**: Full conversation thread container with scrolling
- **`attachments.tsx`**: File/image attachments in messages
- **`inline-citation.tsx`**: Citation/reference inline within content

### Code & Development

- **`code-block.tsx`**: Syntax-highlighted code display
- **`terminal.tsx`**: Terminal/shell output component
- **`schema-display.tsx`**: JSON/TypeScript schema visualization
- **`stack-trace.tsx`**: Error stack trace display
- **`environment-variables.tsx`**: Env var configuration UI

### Reasoning & Debugging

- **`reasoning.tsx`**: LLM reasoning/thought process display
- **`chain-of-thought.tsx`**: Step-by-step reasoning visualization
- **`checkpoint.tsx`**: Execution checkpoint indicator
- **`test-results.tsx`**: Test output display

### Input & Controls

- **`prompt-input.tsx`**: Chat input with streaming support
- **`toolbar.tsx`**: Action toolbar component
- **`controls.tsx`**: Playback/control buttons
- **`model-selector.tsx`**: Model selection dropdown

### Visualization & Canvas

- **`canvas.tsx`**: Infinite canvas for workflow visualization
- **`node.tsx`**: Canvas node element
- **`edge.tsx`**: Canvas connection edge
- **`panel.tsx`**: Side panel/drawer component

### Media & Audio

- **`audio-player.tsx`**: Audio playback component
- **`speech-input.tsx`**: Voice/speech input
- **`transcription.tsx`**: Speech-to-text display
- **`image.tsx`**: Image display with optimization

### Agent & Tool Components

- **`agent.tsx`**: Agent status/avatar display
- **`tool.tsx`**: Tool invocation display
- **`artifact.tsx`**: Generated artifact preview
- **`sandbox.tsx`**: Code execution sandbox

## Subdirectories

- **`custom/`**: Custom extended components
- **`tools/`**: Tool-specific UI components (has existing AGENTS.md)

## Where to Look

- `src/components/ai-elements/`: Main component implementations
- `src/components/ai-elements/custom/`: Extended variant components
- `src/components/ai-elements/tools/`: Tool-specific components
- `app/chat/`: Real-world usage in chat interface

## Usage

Import components directly from the ai-elements package:

```tsx
import { Message, Reasoning, CodeBlock } from '@/components/ai-elements'

;<Message role="assistant">
    <Reasoning steps={['Analyzing...', 'Processing...']} />
    <CodeBlock code={result} language="typescript" />
</Message>
```
