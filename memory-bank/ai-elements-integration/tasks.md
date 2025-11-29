# AI Elements Integration with Agents - Tasks

## Task Overview

| ID | Task | Status | Priority | Estimate | Dependencies |
|----|------|--------|----------|----------|--------------|
| AIEL-001 | Create ChatContext provider | ✅ Complete | High | 2h | None |
| AIEL-002 | Create agent configuration system | ✅ Complete | High | 1h | None |
| AIEL-003 | Implement ChatHeader with ModelSelector | ✅ Complete | High | 2h | AIEL-002 |
| AIEL-004 | Implement ChatMessages with AI Elements | ✅ Complete | High | 3h | AIEL-001 |
| AIEL-005 | Implement ChatInput with PromptInput | ✅ Complete | High | 2h | AIEL-001 |
| AIEL-006 | Add Reasoning display for applicable agents | ✅ Complete | Medium | 2h | AIEL-004 |
| AIEL-007 | Add Tool execution display | ✅ Complete | Medium | 2h | AIEL-004 |
| AIEL-008 | Add Sources display for research agents | ✅ Complete | Medium | 1.5h | AIEL-004 |
| AIEL-009 | Add Context (token usage) tracking | ✅ Complete | Low | 1h | AIEL-003 |
| AIEL-010 | Add file upload support | ✅ Complete | Medium | 2h | AIEL-005 |
| AIEL-011 | Add Artifact display for generated content | ✅ Complete | Medium | 1.5h | AIEL-004 |
| AIEL-012 | Integrate chat page with all components | ✅ Complete | High | 2h | AIEL-001 to AIEL-005 |
| AIEL-013 | Add E2E tests for core flows | Not Started | Medium | 3h | AIEL-012 |

**Total Estimate:** ~24 hours  
**Completed:** ~23 hours (AIEL-001 through AIEL-012)

---

## Critical Fix: AI SDK v5 Compatibility

### Issue
The chat components were using deprecated AI SDK v4 types and patterns.

### Changes Made

#### chat-context.tsx
- Replaced `UIToolInvocation` with `DynamicToolUIPart`
- Removed `content` field from `UIMessage` (v5 uses parts only)
- Changed `reasoning` chunk type to `reasoning-delta` (Mastra format)
- Fixed finish payload: `chunk.payload.output.usage.inputTokens`
- Added `getTextFromParts()` helper for text extraction

#### chat-messages.tsx  
- Using AI SDK v5 type guards: `isTextUIPart`, `isReasoningUIPart`, `isToolOrDynamicToolUIPart`
- Extracting content from parts instead of `message.content`

#### agent-tools.tsx
- Always constructing `tool-${toolName}` for ToolHeader type prop
- Using `DynamicToolUIPart` for type safety

---

## AIEL-001: Create ChatContext Provider

**Status:** Not Started  
**Priority:** High  
**Estimate:** 2 hours  
**Dependencies:** None

### Description
Create a React Context provider for managing chat state across all components.

### Acceptance Criteria

- [ ] Create `app/chat/providers/chat-context.tsx`
- [ ] Implement `ChatState` interface with messages, loading, status, agent
- [ ] Implement `ChatActions` interface with sendMessage, stopGeneration, clearMessages, selectAgent
- [ ] Create `ChatProvider` component with Mastra Client SDK integration
- [ ] Create `useChatContext` hook with error boundary
- [ ] Handle streaming via `processDataStream` callback
- [ ] Export all types and components

### Implementation Notes

```typescript
// File: app/chat/providers/chat-context.tsx
interface ChatState {
  messages: UIMessage[]
  isLoading: boolean
  status: 'ready' | 'submitted' | 'streaming' | 'error'
  selectedAgent: string
  streamingContent: string
  usage: LanguageModelUsage | null
  error: string | null
}
```

### Files to Create/Modify

- Create: `app/chat/providers/chat-context.tsx`

---

## AIEL-002: Create Agent Configuration System

**Status:** Not Started  
**Priority:** High  
**Estimate:** 1 hour  
**Dependencies:** None

### Description
Create a centralized configuration system for all 26+ agents with their UI features.

### Acceptance Criteria

- [ ] Create `app/chat/config/agents.ts`
- [ ] Define `AgentConfig` interface with features flags
- [ ] Create `AGENT_CONFIGS` map for all 26+ agents
- [ ] Group agents by category (core, research, content, data, financial, diagram, utility)
- [ ] Create `getAgentConfig(agentId)` helper function
- [ ] Create `getAgentsByCategory()` helper for ModelSelector

### Implementation Notes

```typescript
// File: app/chat/config/agents.ts
export interface AgentConfig {
  id: string
  name: string
  description: string
  category: 'core' | 'research' | 'content' | 'data' | 'financial' | 'diagram' | 'utility'
  features: {
    reasoning: boolean
    chainOfThought: boolean
    tools: boolean
    sources: boolean
    canvas: boolean
    artifacts: boolean
    fileUpload: boolean
  }
}

// Must include ALL 26+ agents:
// weatherAgent, a2aCoordinatorAgent, researchAgent, researchPaperAgent,
// documentProcessingAgent, knowledgeIndexingAgent, copywriterAgent, editorAgent,
// contentStrategistAgent, scriptWriterAgent, reportAgent, dataExportAgent,
// dataIngestionAgent, dataTransformationAgent, stockAnalysisAgent,
// chartTypeAdvisorAgent, chartDataProcessorAgent, chartGeneratorAgent,
// chartSupervisorAgent, csvToExcalidrawAgent, imageToCsvAgent,
// excalidrawValidatorAgent, evaluationAgent, learningExtractionAgent,
// dane, sqlAgent
```

### Files to Create/Modify

- Create: `app/chat/config/agents.ts`

---

## AIEL-003: Implement ChatHeader with ModelSelector

**Status:** Not Started  
**Priority:** High  
**Estimate:** 2 hours  
**Dependencies:** AIEL-002

### Description
Create the chat header component with agent/model selection using the ModelSelector AI Element.

### Acceptance Criteria

- [ ] Create `app/chat/components/chat-header.tsx`
- [ ] Use `ModelSelector` component for agent selection
- [ ] Group agents by category in ModelSelectorGroup
- [ ] Show agent description on hover/focus
- [ ] Display current agent clearly
- [ ] Add Context (token usage) trigger in header
- [ ] Integrate with ChatContext for agent selection

### Implementation Notes

```typescript
// File: app/chat/components/chat-header.tsx
// Use these AI Elements:
import { 
  ModelSelector, ModelSelectorTrigger, ModelSelectorContent,
  ModelSelectorInput, ModelSelectorList, ModelSelectorGroup,
  ModelSelectorItem, ModelSelectorName
} from '@/components/ai-elements/model-selector'

import {
  Context, ContextTrigger, ContextContent,
  ContextContentHeader, ContextContentBody, ContextContentFooter
} from '@/components/ai-elements/context'
```

### Files to Create/Modify

- Create: `app/chat/components/chat-header.tsx`

---

## AIEL-004: Implement ChatMessages with AI Elements

**Status:** Not Started  
**Priority:** High  
**Estimate:** 3 hours  
**Dependencies:** AIEL-001

### Description
Create the chat messages component using Conversation and Message AI Elements.

### Acceptance Criteria

- [ ] Create `app/chat/components/chat-messages.tsx`
- [ ] Use `Conversation`, `ConversationContent`, `ConversationScrollButton`
- [ ] Use `ConversationEmptyState` for no messages
- [ ] Use `Message`, `MessageContent`, `MessageResponse` for each message
- [ ] Render user messages with right alignment
- [ ] Render assistant messages with left alignment
- [ ] Display streaming content progressively
- [ ] Integrate with ChatContext for messages

### Implementation Notes

```typescript
// File: app/chat/components/chat-messages.tsx
import {
  Conversation, ConversationContent, ConversationEmptyState,
  ConversationScrollButton
} from '@/components/ai-elements/conversation'

import {
  Message, MessageContent, MessageResponse, MessageToolbar,
  MessageActions, MessageAction
} from '@/components/ai-elements/message'
```

### Files to Create/Modify

- Create: `app/chat/components/chat-messages.tsx`

---

## AIEL-005: Implement ChatInput with PromptInput

**Status:** Not Started  
**Priority:** High  
**Estimate:** 2 hours  
**Dependencies:** AIEL-001

### Description
Create the chat input component using the PromptInput AI Element.

### Acceptance Criteria

- [ ] Create `app/chat/components/chat-input.tsx`
- [ ] Use `PromptInput` with form handling
- [ ] Use `PromptInputTextarea` with placeholder
- [ ] Use `PromptInputFooter` with tools and submit
- [ ] Use `PromptInputSubmit` with status indicator
- [ ] Use `PromptInputSpeechButton` for voice input (optional)
- [ ] Integrate with ChatContext for sending messages

### Implementation Notes

```typescript
// File: app/chat/components/chat-input.tsx
import {
  PromptInput, PromptInputTextarea, PromptInputFooter,
  PromptInputTools, PromptInputSubmit, PromptInputButton,
  PromptInputSpeechButton
} from '@/components/ai-elements/prompt-input'
```

### Files to Create/Modify

- Create: `app/chat/components/chat-input.tsx`

---

## AIEL-006: Add Reasoning Display for Applicable Agents

**Status:** Not Started  
**Priority:** Medium  
**Estimate:** 2 hours  
**Dependencies:** AIEL-004

### Description
Add Reasoning and ChainOfThought components for agents that support reasoning.

### Acceptance Criteria

- [ ] Create `app/chat/components/agent-reasoning.tsx`
- [ ] Use `Reasoning`, `ReasoningTrigger`, `ReasoningContent` components
- [ ] Use `ChainOfThought` for multi-step processes
- [ ] Show reasoning based on agent config features
- [ ] Handle streaming reasoning content
- [ ] Auto-collapse when reasoning complete

### Implementation Notes

```typescript
// Agents with reasoning: true
// researchAgent, researchPaperAgent, copywriterAgent, editorAgent,
// contentStrategistAgent, scriptWriterAgent, stockAnalysisAgent,
// chartTypeAdvisorAgent, chartSupervisorAgent, evaluationAgent, learningExtractionAgent

import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning'
import {
  ChainOfThought, ChainOfThoughtHeader, ChainOfThoughtContent,
  ChainOfThoughtStep
} from '@/components/ai-elements/chain-of-thought'
```

### Files to Create/Modify

- Create: `app/chat/components/agent-reasoning.tsx`
- Modify: `app/chat/components/chat-messages.tsx`

---

## AIEL-007: Add Tool Execution Display

**Status:** Not Started  
**Priority:** Medium  
**Estimate:** 2 hours  
**Dependencies:** AIEL-004

### Description
Add Tool component to display tool calls and results.

### Acceptance Criteria

- [ ] Create `app/chat/components/agent-tools.tsx`
- [ ] Use `Tool`, `ToolHeader`, `ToolContent` components
- [ ] Use `ToolInput` for input parameters
- [ ] Use `ToolOutput` for results and errors
- [ ] Show tool status badges (streaming, running, completed, error)
- [ ] Use `CodeBlock` for JSON display
- [ ] Handle tool approval with `Confirmation` component

### Implementation Notes

```typescript
// Almost all agents have tools: true in their features
import {
  Tool, ToolHeader, ToolContent, ToolInput, ToolOutput
} from '@/components/ai-elements/tool'

import { CodeBlock, CodeBlockCopyButton } from '@/components/ai-elements/code-block'
import {
  Confirmation, ConfirmationTitle, ConfirmationActions, ConfirmationAction
} from '@/components/ai-elements/confirmation'
```

### Files to Create/Modify

- Create: `app/chat/components/agent-tools.tsx`
- Modify: `app/chat/components/chat-messages.tsx`

---

## AIEL-008: Add Sources Display for Research Agents

**Status:** Not Started  
**Priority:** Medium  
**Estimate:** 1.5 hours  
**Dependencies:** AIEL-004

### Description
Add Sources component for research agents that cite sources.

### Acceptance Criteria

- [ ] Create `app/chat/components/agent-sources.tsx`
- [ ] Use `Sources`, `SourcesTrigger`, `SourcesContent`, `Source` components
- [ ] Show source count in trigger
- [ ] Display source title and URL
- [ ] Open links in new tab
- [ ] Integrate with ChatContext for source data

### Implementation Notes

```typescript
// Agents with sources: true
// researchAgent, researchPaperAgent, documentProcessingAgent, reportAgent, stockAnalysisAgent

import {
  Sources, SourcesTrigger, SourcesContent, Source
} from '@/components/ai-elements/sources'
```

### Files to Create/Modify

- Create: `app/chat/components/agent-sources.tsx`
- Modify: `app/chat/components/chat-messages.tsx`

---

## AIEL-009: Add Context (Token Usage) Tracking

**Status:** Not Started  
**Priority:** Low  
**Estimate:** 1 hour  
**Dependencies:** AIEL-003

### Description
Add Context component to display token usage and cost estimates.

### Acceptance Criteria

- [ ] Integrate `Context` into `chat-header.tsx`
- [ ] Track input/output token usage from stream
- [ ] Display usage progress and cost
- [ ] Update in real-time during streaming
- [ ] Show breakdown by category (input, output, reasoning, cache)

### Implementation Notes

```typescript
// Already imported in chat-header.tsx
// Use usage from ChatContext.usage
// Get modelId from ChatContext.selectedAgent mapping
```

### Files to Create/Modify

- Modify: `app/chat/components/chat-header.tsx`
- Modify: `app/chat/providers/chat-context.tsx` (add usage tracking)

---

## AIEL-010: Add File Upload Support

**Status:** Not Started  
**Priority:** Medium  
**Estimate:** 2 hours  
**Dependencies:** AIEL-005

### Description
Add file attachment support using PromptInput attachment components.

### Acceptance Criteria

- [ ] Use `PromptInputAttachments` and `PromptInputAttachment` components
- [ ] Use `PromptInputActionMenu` with `PromptInputActionAddAttachments`
- [ ] Support image and document file types
- [ ] Preview attachments before sending
- [ ] Remove attachments with click
- [ ] Send files with message via Mastra SDK

### Implementation Notes

```typescript
// Agents with fileUpload: true
// documentProcessingAgent, dataIngestionAgent, imageToCsvAgent, dataTransformationAgent

import {
  PromptInputAttachments, PromptInputAttachment,
  PromptInputActionMenu, PromptInputActionMenuTrigger,
  PromptInputActionMenuContent, PromptInputActionAddAttachments
} from '@/components/ai-elements/prompt-input'
```

### Files to Create/Modify

- Modify: `app/chat/components/chat-input.tsx`

---

## AIEL-011: Add Artifact Display for Generated Content

**Status:** Not Started  
**Priority:** Medium  
**Estimate:** 1.5 hours  
**Dependencies:** AIEL-004

### Description
Add Artifact component for displaying generated code, diagrams, and reports.

### Acceptance Criteria

- [ ] Create `app/chat/components/agent-artifact.tsx`
- [ ] Use `Artifact`, `ArtifactHeader`, `ArtifactContent` components
- [ ] Use `ArtifactActions`, `ArtifactAction` for copy/download
- [ ] Display code with syntax highlighting
- [ ] Support multiple artifact types (code, markdown, diagram)
- [ ] Add close functionality

### Implementation Notes

```typescript
// Agents with artifacts: true
// researchPaperAgent, documentProcessingAgent, copywriterAgent, editorAgent,
// scriptWriterAgent, reportAgent, dataExportAgent, stockAnalysisAgent,
// chartGeneratorAgent, chartSupervisorAgent, csvToExcalidrawAgent,
// imageToCsvAgent, evaluationAgent, sqlAgent

import {
  Artifact, ArtifactHeader, ArtifactTitle, ArtifactDescription,
  ArtifactActions, ArtifactAction, ArtifactClose, ArtifactContent
} from '@/components/ai-elements/artifact'

import { CodeBlock, CodeBlockCopyButton } from '@/components/ai-elements/code-block'
```

### Files to Create/Modify

- Create: `app/chat/components/agent-artifact.tsx`
- Modify: `app/chat/components/chat-messages.tsx`

---

## AIEL-012: Integrate Chat Page with All Components

**Status:** Not Started  
**Priority:** High  
**Estimate:** 2 hours  
**Dependencies:** AIEL-001 through AIEL-005

### Description
Rebuild the main chat page integrating all created components.

### Acceptance Criteria

- [ ] Rebuild `app/chat/page.tsx` with ChatProvider
- [ ] Include ChatHeader, ChatMessages, ChatInput
- [ ] Remove all basic HTML elements
- [ ] Ensure proper layout with flexbox
- [ ] Add dark mode support via globals.css
- [ ] Verify all agents accessible via ModelSelector
- [ ] Verify streaming works with all components

### Implementation Notes

```typescript
// File: app/chat/page.tsx
import { ChatProvider } from './providers/chat-context'
import { ChatHeader } from './components/chat-header'
import { ChatMessages } from './components/chat-messages'
import { ChatInput } from './components/chat-input'

export default function ChatPage() {
  return (
    <ChatProvider>
      <main className="min-h-screen bg-background flex flex-col">
        <ChatHeader />
        <ChatMessages />
        <ChatInput />
      </main>
    </ChatProvider>
  )
}
```

### Files to Create/Modify

- Modify: `app/chat/page.tsx`

---

## AIEL-013: Add E2E Tests for Core Flows

**Status:** Not Started  
**Priority:** Medium  
**Estimate:** 3 hours  
**Dependencies:** AIEL-012

### Description
Create end-to-end tests for the core chat functionality.

### Acceptance Criteria

- [ ] Create test file `app/chat/__tests__/chat.test.tsx`
- [ ] Test agent selection workflow
- [ ] Test message sending and receiving
- [ ] Test streaming content display
- [ ] Test tool execution display
- [ ] Test error handling
- [ ] All tests pass with `npm test`

### Implementation Notes

```typescript
// File: app/chat/__tests__/chat.test.tsx
// Use Vitest + React Testing Library
// Mock Mastra Client for predictable responses
```

### Files to Create/Modify

- Create: `app/chat/__tests__/chat.test.tsx`

---

## Progress Tracking

### Phase 1: Foundation (Required First)

- [x] AIEL-001: ChatContext provider
- [x] AIEL-002: Agent configuration

### Phase 2: Core UI (Main Chat Experience)

- [x] AIEL-003: ChatHeader with ModelSelector
- [x] AIEL-004: ChatMessages
- [x] AIEL-005: ChatInput

### Phase 3: Enhanced Features

- [x] AIEL-006: Reasoning display
- [x] AIEL-007: Tool execution display
- [x] AIEL-008: Sources display
- [x] AIEL-009: Context tracking
- [x] AIEL-010: File upload
- [x] AIEL-011: Artifact display

### Phase 4: Integration & Testing

- [x] AIEL-012: Full page integration
- [ ] AIEL-013: E2E tests

---

## Component Reference

### AI Elements Used (23 of 30)

| Component | Task(s) | Status |
|-----------|---------|--------|
| message | AIEL-004 | Not Started |
| conversation | AIEL-004 | Not Started |
| prompt-input | AIEL-005, AIEL-010 | Not Started |
| suggestion | Future | - |
| reasoning | AIEL-006 | Not Started |
| chain-of-thought | AIEL-006 | Not Started |
| plan | Future | - |
| task | Future | - |
| tool | AIEL-007 | Not Started |
| code-block | AIEL-007, AIEL-011 | Not Started |
| artifact | AIEL-011 | Not Started |
| sources | AIEL-008 | Not Started |
| canvas | Future (diagram agents) | - |
| node | Future | - |
| edge | Future | - |
| connection | Future | - |
| controls | Future | - |
| loader | AIEL-004 | Not Started |
| shimmer | AIEL-006 | Not Started |
| checkpoint | Future | - |
| context | AIEL-009 | Not Started |
| confirmation | AIEL-007 | Not Started |
| model-selector | AIEL-003 | Not Started |
| open-in-chat | Future | - |
| web-preview | Future | - |
| image | Future | - |
| inline-citation | Future | - |
| panel | Future | - |
| toolbar | Future | - |
| queue | Future | - |

---

**Next Step:** `/approve tasks` to begin implementation
