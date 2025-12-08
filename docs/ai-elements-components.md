# AI Elements Components Reference

This comprehensive guide covers all AI Elements components for building AI-native applications. Based on the official AI Elements documentation from https://ai-sdk.dev/elements.

## Installation

### Prerequisites

- Node.js 18+
- Next.js project with AI SDK
- shadcn/ui installed
- AI Gateway (recommended)

### CLI Installation

```bash
# Install individual components
npx ai-elements@latest add component-name

# Or use shadcn CLI
npx shadcn@latest add --registry ai-elements
```

---

## Chatbot Components

### Chain of Thought
**Installation:** `npx ai-elements@latest add chain-of-thought`

A collapsible component that visualizes AI reasoning steps with support for search results, images, and step-by-step progress indicators.

**Features:**

- Collapsible interface with smooth animations
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

**Key Props:**

- `open`, `defaultOpen`, `onOpenChange` - Control open state
- `children` - Component content

**Subcomponents:**

- `ChainOfThoughtHeader` - Header section
- `ChainOfThoughtStep` - Individual reasoning steps
- `ChainOfThoughtSearchResults` - Search results container
- `ChainOfThoughtContent` - Main content area
- `ChainOfThoughtImage` - Image display with captions

### Checkpoint
**Installation:** `npx ai-elements@latest add checkpoint`

A simple component for marking conversation history points and restoring the chat to a previous state.

**Features:**

- Save conversation checkpoints
- Restore to previous states
- History management
- State persistence

### Confirmation
**Installation:** `npx ai-elements@latest add confirmation`

Handle user confirmations and approval workflows in AI conversations.

**Features:**

- Confirmation dialogs
- Approval workflows
- User interaction handling
- State management

### Conversation
**Installation:** `npx ai-elements@latest add conversation`

Wraps messages and automatically scrolls to the bottom. Includes a scroll button that appears when not at the bottom.

**Features:**

- Automatic scrolling to bottom on new messages
- Smooth scrolling behavior with configurable animation
- Scroll button when not at bottom
- Responsive design with customizable padding and spacing
- Flexible content layout with consistent message spacing
- Accessible with proper ARIA roles for screen readers
- Customizable styling through className prop
- Support for any number of child message components

**Key Props:**

- `contextRef` - Reference for context management
- `instance` - Component instance
- `children` - Message components

**Subcomponents:**

- `ConversationContent` - Main content container
- `ConversationEmptyState` - Empty state display
- `ConversationScrollButton` - Scroll to bottom button

### Context
**Installation:** `npx ai-elements@latest add context`

A compound component system for displaying AI model context window usage, token consumption, and cost estimation.

**Features:**

- Context window usage tracking
- Token consumption monitoring
- Cost estimation
- Model performance metrics

### Inline Citation
**Installation:** `npx ai-elements@latest add inline-citation`

A hoverable citation component that displays source information and quotes inline with text, perfect for AI-generated content with references.

**Features:**

- Hoverable citation display
- Source information integration
- Inline text references
- Reference management

### Message
**Installation:** `npx ai-elements@latest add message`

A comprehensive suite of components for displaying chat messages, including message rendering, branching, actions, and markdown responses.

**Features:**

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

**Important Setup:**
Add to `globals.css`:

```css
@source "../node_modules/streamdown/dist/index.js";
```

**Key Props:**

- `from` - Message sender ('user' | 'assistant')
- `children` - Message content
- `parseIncompleteMarkdown` - Handle streaming markdown

**Subcomponents:**

- `MessageContent` - Main message content
- `MessageResponse` - Formatted response text
- `MessageActions` - Action buttons container
- `MessageAction` - Individual action buttons
- `MessageBranch` - Response branching
- `MessageAttachments` - File attachments
- `MessageAttachment` - Individual attachments

### Model Selector
**Installation:** `npx ai-elements@latest add model-selector`

A searchable command palette for selecting AI models in your chat interface.

**Features:**

- Searchable model selection
- Command palette interface
- Model switching
- Keyboard navigation

### Plan
**Installation:** `npx ai-elements@latest add plan`

A collapsible plan component for displaying AI-generated execution plans with streaming support and shimmer animations.

**Features:**

- Collapsible execution plans
- Streaming support
- Shimmer loading animations
- Step-by-step plan visualization

### Prompt Input
**Installation:** `npx ai-elements@latest add prompt-input`

Allows a user to send a message with file attachments to a large language model. Includes a textarea, file upload capabilities, a submit button, and a dropdown for selecting the model.

**Features:**

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

**Key Props:**

- `onSubmit` - Form submission handler
- `accept` - Accepted file types
- `multiple` - Allow multiple files
- `globalDrop` - Enable global drop zone
- `maxFiles` - Maximum file count
- `maxFileSize` - Maximum file size

**Subcomponents:**

- `PromptInputTextarea` - Main text input
- `PromptInputSubmit` - Submit button
- `PromptInputAttachments` - File attachments
- `PromptInputSelect` - Model selection
- `PromptInputSpeechButton` - Voice input
- `PromptInputTools` - Toolbar container

### Queue
**Installation:** `npx ai-elements@latest add queue`

A comprehensive queue component system for displaying message lists, todos, and collapsible task sections in AI applications.

**Features:**

- Message list display
- Todo management
- Collapsible task sections
- Queue management

### Reasoning
**Installation:** `npx ai-elements@latest add reasoning`

Display AI reasoning processes and step-by-step thinking.

**Features:**

- Step-by-step reasoning visualization
- Thinking process display
- Progress tracking

### Shimmer
**Installation:** `npx ai-elements@latest add shimmer`

An animated text shimmer component for creating eye-catching loading states and progressive reveal effects.

**Features:**

- Animated text shimmer effects
- Loading state visualization
- Progressive content reveal

### Sources
**Installation:** `npx ai-elements@latest add sources`

A component that allows a user to view the sources or citations used to generate a response.

**Features:**

- Collapsible source citations
- Customizable trigger and content components
- Support for custom sources or citations
- Responsive design with mobile-friendly controls
- Clean, modern styling with customizable themes

**Key Props:**

- `children` - Source content
- `count` - Number of sources
- `trigger` - Custom trigger component

**Subcomponents:**

- `SourcesTrigger` - Expand/collapse trigger
- `SourcesContent` - Source content container
- `Source` - Individual source items

### Suggestions
**Installation:** `npx ai-elements@latest add suggestion`

A suggestion component that displays a horizontal row of clickable suggestions for user interaction.

**Features:**

- Horizontal suggestion display
- Clickable interaction prompts
- User engagement enhancement

### Task
**Installation:** `npx ai-elements@latest add task`

Track task progress with status indicators and collapsible details.

**Features:**

- Task progress tracking
- Status indicators
- Collapsible details
- Progress visualization

### Tool
**Installation:** `npx ai-elements@latest add tool`

Display tool usage, invocation tracking, and result visualization.

**Features:**

- Tool invocation display
- Usage tracking
- Result visualization
- Tool state management

---

## Workflow Components

### Canvas
**Installation:** `npx ai-elements@latest add canvas`

Visual workflow editor and canvas interface.

**Features:**

- Drag-and-drop workflow design
- Node-based editing
- Visual workflow creation

### Connection
**Installation:** `npx ai-elements@latest add connection`

Connect workflow nodes and manage relationships.

**Features:**

- Node connections
- Relationship management
- Connection visualization

### Controls
**Installation:** `npx ai-elements@latest add controls`

Workflow control panel and management tools.

**Features:**

- Workflow controls
- Management interface
- Control panel

### Edge
**Installation:** `npx ai-elements@latest add edge`

Connection lines and edges between workflow nodes.

**Features:**

- Connection visualization
- Edge styling
- Flow representation

### Node
**Installation:** `npx ai-elements@latest add node`

Individual workflow steps and processing nodes.

**Features:**

- Workflow nodes
- Step representation
- Node management

### Panel
**Installation:** `npx ai-elements@latest add panel`

Side panels and configuration interfaces.

**Features:**

- Configuration panels
- Side panel management
- Interface components

### Toolbar
**Installation:** `npx ai-elements@latest add toolbar`

Workflow toolbar with tools and actions.

**Features:**

- Workflow tools
- Action buttons
- Toolbar management

---

## Vibe Coding Components

### Artifact
**Installation:** `npx ai-elements@latest add artifact`

Display generated code and content artifacts.

**Features:**

- Code artifact display
- Generated content visualization
- Artifact management

### Web Preview
**Installation:** `npx ai-elements@latest add web-preview`

Preview generated web content and interfaces.

**Features:**

- Web content preview
- Interface visualization
- Preview management

---

## Documentation Components

### Open in Chat
**Installation:** `npx ai-elements@latest add open-in-chat`

Link documentation to chat interfaces.

**Features:**

- Documentation integration
- Chat linking
- Reference management

---

## Utility Components

### Code Block
**Installation:** `npx ai-elements@latest add code-block`

Syntax-highlighted code display with copy functionality.

**Features:**

- Syntax highlighting
- Code formatting
- Copy to clipboard
- Language detection

### Image
**Installation:** `npx ai-elements@latest add image`

Enhanced image display and management.

**Features:**

- Image optimization
- Responsive display
- Image management

### Loader
**Installation:** `npx ai-elements@latest add loader`

Loading indicators and progress visualization.

**Features:**

- Loading animations
- Progress indicators
- State visualization

---

## Usage Examples

### Basic Chat Interface

```typescript
import { Conversation, Message, PromptInput } from '@/components/ai-elements'
import { useChat } from '@ai-sdk/react'

function ChatApp() {
  const { messages, sendMessage } = useChat()

  return (
    <div className="h-screen flex flex-col">
      <Conversation>
        {messages.map((message) => (
          <Message key={message.id} from={message.role}>
            <MessageContent>
              {message.parts?.map((part, i) => (
                <MessageResponse key={i}>
                  {part.text}
                </MessageResponse>
              ))}
            </MessageContent>
          </Message>
        ))}
      </Conversation>

      <PromptInput onSubmit={(data) => sendMessage(data)} />
    </div>
  )
}
```

### Advanced Interface with Sources

```typescript
import { Sources, Source } from '@/components/ai-elements/sources'

function ChatWithSources({ messages }) {
  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          <Message from={message.role}>
            {/* Message content */}
          </Message>

          {message.role === 'assistant' && (
            <Sources>
              <SourcesTrigger count={message.sources?.length || 0} />
              {message.sources?.map((source, i) => (
                <SourcesContent key={i}>
                  <Source href={source.url} title={source.title} />
                </SourcesContent>
              ))}
            </Sources>
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## Best Practices

1. **Component Composition**: Build complex UIs by composing simpler components
2. **State Management**: Use React Context for shared state across components
3. **Accessibility**: All components include proper ARIA labels and keyboard navigation
4. **Performance**: Components are optimized with proper memoization
5. **Customization**: Modify component styles through className props and CSS variables
6. **TypeScript**: Full TypeScript support with comprehensive type definitions

## Migration Notes

- Components are designed for React 19 with modern patterns
- No `forwardRef` usage for better performance
- Tailwind CSS 4 compatibility
- AI SDK v5 integration ready

---

*Last updated: December 8, 2025*
*Source: https://ai-sdk.dev/elements and component documentation*