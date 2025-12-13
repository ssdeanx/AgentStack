---
name: AI Elements Usage Guide
description: A comprehensive guide on using AI Elements for building AI-native applications.
glob: ["app/**/*", "ui/**/*", "src/components/**/*"]
tags: ["AI", "Elements", "shadcn/ui", "React", "Tailwind CSS", "AI SDK"]
---
# AI Elements Usage Guide

This document provides comprehensive guidance on using AI Elements, a component library built on shadcn/ui for building AI-native applications. Based on the official documentation at https://ai-sdk.dev/elements and https://ai-sdk.dev/elements/usage.

## What is AI Elements?

AI Elements is a component library and custom registry built on top of [shadcn/ui](https://ui.shadcn.com/) to help you build AI-native applications faster. It provides pre-built components like conversations, messages, and more.

## Prerequisites

Before installing AI Elements, ensure your environment meets these requirements:

- **Node.js**: Version 18 or later
- **Next.js project**: With the [AI SDK](https://ai-sdk.dev/) installed
- **shadcn/ui**: Installed in your project (will be auto-installed if missing)
- **AI Gateway** (recommended): Add `AI_GATEWAY_API_KEY` to your `.env.local` for $5/month free usage

AI Elements targets React 19 and Tailwind CSS 4.

## Installation

### Using AI Elements CLI (Recommended)

```bash
npx ai-elements@latest
```

### Using shadcn/ui CLI

```bash
npx shadcn@latest add --registry ai-elements
```

Components are installed to `@/components/ai-elements/` by default. The CLI downloads component code and integrates it into your project.

## Quick Start Examples

AI Elements enables building sophisticated AI interfaces:

- **Chat interfaces** with streaming responses
- **Multi-modal interactions** (text, voice, attachments)
- **Workflow visualizations**
- **Real-time data processing** displays
- **Context-aware conversations**

## Usage

### Basic Example

After installation, use components like any React component:

```typescript
"use client"

import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message'
import { useChat } from '@ai-sdk/react'

const Example = () => {
  const { messages } = useChat()

  return (
    <>
      {messages.map(({ role, parts }, index) => (
        <Message from={role} key={index}>
          <MessageContent>
            {parts.map((part, i) => {
              switch (part.type) {
                case 'text':
                  return <MessageResponse key={`${role}-${i}`}>{part.text}</MessageResponse>
              }
            })}
          </MessageContent>
        </Message>
      ))}
    </>
  )
}

export default Example
```

## Component Categories

### Chatbot Components

- **Chain of Thought**: Display reasoning processes
- **Checkpoint**: Save/restore conversation states
- **Confirmation**: Handle user confirmations
- **Conversation**: Main chat container
- **Context**: Display relevant context
- **Inline Citation**: Reference sources
- **Message**: Individual message component
- **Model Selector**: Choose AI models
- **Plan**: Show execution plans
- **Prompt Input**: Enhanced input field
- **Queue**: Manage queued tasks
- **Reasoning**: Display AI reasoning
- **Shimmer**: Loading animations
- **Sources**: Display source citations
- **Suggestions**: Offer follow-up prompts
- **Task**: Track task progress
- **Tool**: Display tool usage

### Workflow Components

- **Canvas**: Visual workflow editor
- **Connection**: Connect workflow nodes
- **Controls**: Workflow controls
- **Edge**: Connection lines
- **Node**: Workflow steps
- **Panel**: Side panels
- **Toolbar**: Workflow tools

### Vibe Coding Components

- **Artifact**: Display generated code/content
- **Web Preview**: Preview generated content

### Documentation Components

- **Open in Chat**: Link to chat interface

### Utilities

- **Code Block**: Syntax-highlighted code
- **Image**: Enhanced image display
- **Loader**: Loading indicators

## Extensibility

All AI Elements components extend primitive HTML attributes:

```typescript
// Message extends HTMLAttributes<HTMLDivElement>
<Message
  className="custom-styles"
  onClick={handleClick}
  data-testid="message"
>
  {/* content */}
</Message>
```

## Customization

### Modifying Components

Components are added to your codebase, so you can modify them directly:

```typescript
// components/ai-elements/message.tsx
export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      'flex flex-col gap-2 text-sm text-foreground',
      // Remove rounded-lg for custom styling
      'group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground group-[.is-user]:px-4 group-[.is-user]:py-3',
      className,
    )}
    {...props}
  >
    <div className="is-user:dark">{children}</div>
  </div>
)
```

### Re-installation

When re-installing, the CLI asks before overwriting to preserve custom changes.

## Integration with AI SDK

AI Elements works seamlessly with the AI SDK:

```typescript
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Conversation } from '@/components/ai-elements/conversation'

function ChatApp() {
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat'
    })
  })

  return (
    <Conversation messages={messages} onSend={sendMessage} />
  )
}
```

## Advanced Features

### Streaming Support

Components handle real-time streaming data:

```typescript
const { messages } = useChat()

return (
  <div>
    {messages.map((message) => (
      <Message key={message.id} from={message.role}>
        {message.parts?.map((part) => {
          switch (part.type) {
            case 'text':
              return <MessageResponse>{part.text}</MessageResponse>
            case 'reasoning':
              return <Reasoning>{part.text}</Reasoning>
            case 'tool-call':
              return <Tool name={part.toolName} args={part.args} />
          }
        })}
      </Message>
    ))}
  </div>
)
```

### Multi-modal Interactions

Support for various input types:

```typescript
<PromptInput
  onSend={sendMessage}
  supportsAttachments={true}
  supportsVoice={true}
  placeholder="Ask me anything..."
/>
```

## Best Practices

### Component Composition

Compose components for complex UIs:

```typescript
const ChatInterface = () => (
  <Conversation>
    <ModelSelector />
    <PromptInput />
    <div className="messages">
      {/* Message components */}
    </div>
    <Suggestions />
  </Conversation>
)
```

### Styling

Use Tailwind classes for customization:

```typescript
<Message
  className="border-2 border-blue-500 rounded-xl shadow-lg"
/>
```

### Performance

Components are optimized for performance with proper memoization and minimal re-renders.

## Troubleshooting

If you encounter issues:

1. Ensure all prerequisites are met
2. Check that shadcn/ui is properly configured
3. Verify AI SDK installation
4. Clear node_modules and reinstall if needed

## Examples

- [Chatbot Example](https://ai-sdk.dev/elements/examples/chatbot)
- [v0 Clone](https://ai-sdk.dev/elements/examples/v0)
- [Workflow Example](https://ai-sdk.dev/elements/examples/workflow)

## Additional Resources

- [AI SDK Documentation](https://ai-sdk.dev/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)
- [AI Elements MCP Server](https://ai-sdk.dev/elements/mcp)

---

*Last updated: December 8, 2025*
*Sources: https://ai-sdk.dev/elements, https://ai-sdk.dev/elements/usage*
