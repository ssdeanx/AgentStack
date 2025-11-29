# AI Elements Integration with Agents - PRD

## Feature Overview

**Feature Name:** AI Elements Integration with Agents  
**Status:** Draft  
**Created:** 2025-11-28  
**Owner:** Development Team

## Problem Statement

The Mastra codebase has a powerful AI Elements UI library (30 components) that is currently underutilized:

### Available AI Elements Components (30)

| Category | Components | Current Usage |
|----------|------------|---------------|
| **Chat Core** | `message`, `conversation`, `prompt-input`, `suggestion` | Unused (basic HTML in chat page) |
| **AI Reasoning** | `reasoning`, `chain-of-thought`, `plan`, `task` | Unused |
| **Tool Display** | `tool`, `code-block`, `artifact`, `sources` | Unused |
| **Canvas** | `canvas`, `node`, `edge`, `connection`, `controls` | Unused |
| **Feedback** | `loader`, `shimmer`, `checkpoint`, `context` | Unused |
| **Interactive** | `confirmation`, `model-selector`, `open-in-chat`, `web-preview`, `image`, `inline-citation` | Unused |
| **Layout** | `panel`, `toolbar`, `queue` | Unused |

### Available Base UI Components (19 in `ui/`)

`button`, `input`, `card`, `dialog`, `select`, `tooltip`, `dropdown-menu`, `hover-card`, `badge`, `alert`, `separator`, `collapsible`, `scroll-area`, `textarea`, `carousel`, `progress`, `command`, `button-group`, `input-group`

### Available Agents (26+)

| Category | Agents | Count |
|----------|--------|-------|
| **Core** | weatherAgent, a2aCoordinatorAgent | 2 |
| **Research** | researchAgent, researchPaperAgent, documentProcessingAgent, knowledgeIndexingAgent | 4 |
| **Content** | copywriterAgent, editorAgent, contentStrategistAgent, scriptWriterAgent, reportAgent | 5 |
| **Data** | dataExportAgent, dataIngestionAgent, dataTransformationAgent | 3 |
| **Financial** | stockAnalysisAgent, chartTypeAdvisorAgent, chartDataProcessorAgent, chartGeneratorAgent, chartSupervisorAgent | 5 |
| **Diagram** | csvToExcalidrawAgent, imageToCsvAgent, excalidrawValidatorAgent | 3 |
| **Utility** | evaluationAgent, learningExtractionAgent, dane, sqlAgent | 4 |

### Current State

The `app/chat/page.tsx` uses **basic HTML elements** (`<input>`, `<button>`, `<pre>`) instead of the rich AI Elements library. This results in:

1. No streaming visualization (reasoning/thinking display)
2. No tool execution visibility
3. No model/agent selection UI
4. No file attachment support
5. No sources/citations display
6. Poor accessibility and UX

## Goals

1. Replace basic chat UI with AI Elements components
2. Create component mappings for all 26+ agents
3. Enable streaming reasoning display for research/analysis agents
4. Enable tool execution visualization for data pipeline agents
5. Enable canvas integration for diagram agents
6. Provide reusable patterns for agent-specific UI

## User Stories

### US-1: Rich Chat Interface
**As a** user  
**I want to** chat with agents using a polished interface  
**So that** I can have a professional AI interaction experience

**Acceptance Criteria:**

- [ ] Chat uses `Message`, `Conversation`, `PromptInput` components
- [ ] Messages display with proper styling (user vs assistant)
- [ ] Streaming responses render progressively
- [ ] Input supports file attachments
- [ ] Input supports speech-to-text

### US-2: Agent/Model Selection
**As a** user  
**I want to** select which agent to chat with dynamically  
**So that** I can switch contexts without leaving the page

**Acceptance Criteria:**

- [ ] ModelSelector shows all 26+ agents grouped by category
- [ ] Agent selection updates chat context
- [ ] Agent description shown on hover
- [ ] Current agent clearly indicated

### US-3: Reasoning Visualization
**As a** user  
**I want to** see the AI's reasoning process as it works  
**So that** I understand how conclusions are reached

**Acceptance Criteria:**

- [ ] Reasoning component shows "thinking" state
- [ ] ChainOfThought displays step-by-step process
- [ ] Duration tracking shows how long reasoning took
- [ ] Collapsible for clean UI

### US-4: Tool Execution Display
**As a** user  
**I want to** see when agents use tools and their results  
**So that** I understand what actions are being taken

**Acceptance Criteria:**

- [ ] Tool component shows tool name and status
- [ ] Tool input parameters visible (expandable)
- [ ] Tool output displayed with syntax highlighting
- [ ] Error states clearly shown

### US-5: Source Citations
**As a** user  
**I want to** see sources used by research agents  
**So that** I can verify information and explore further

**Acceptance Criteria:**

- [ ] Sources component shows citation count
- [ ] Individual sources linkable
- [ ] Sources collapsible by default
- [ ] InlineCitation works within message text

### US-6: Canvas Integration
**As a** user  
**I want to** view visual outputs from diagram agents  
**So that** I can see generated diagrams and charts

**Acceptance Criteria:**

- [ ] Canvas component renders React Flow diagrams
- [ ] Node/Edge components display agent-generated content
- [ ] Controls allow zoom/pan
- [ ] Artifacts can be downloaded/exported

### US-7: Context Tracking
**As a** user  
**I want to** see token usage and cost information  
**So that** I can monitor my AI usage

**Acceptance Criteria:**

- [ ] Context component shows token progress
- [ ] Input/output token breakdown visible
- [ ] Cost estimation displayed
- [ ] Warning when approaching limits

## Scope

### In Scope

- Rebuild `app/chat/page.tsx` with AI Elements
- Create agent-specific component configurations
- Integrate with Mastra Client SDK streaming
- Add ModelSelector with all agents
- Add reasoning display for applicable agents
- Add tool execution display
- Add sources display for research agents

### Out of Scope

- New agent creation (use existing 26+)
- Backend API changes
- Authentication/authorization
- Mobile-specific layouts (responsive only)
- Offline support

## Success Metrics

| Metric | Target |
|--------|--------|
| Components Used | 20+ of 30 AI Elements |
| Agents Accessible | All 26+ via UI |
| Streaming Support | 100% of agents |
| Test Coverage | E2E tests for core flows |

## Dependencies

- AI Elements library (`src/components/ai-elements/`)
- Base UI components (`ui/`)
- Mastra Client SDK (`lib/mastra-client.ts`)
- Vercel AI SDK types (`UIMessage`, `ToolUIPart`, etc.)
- Streamdown library (markdown streaming)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Component compatibility with AI SDK | Medium | Use existing patterns from components |
| Streaming performance | Low | Leverage existing Streamdown integration |
| Complex state management | Medium | Use React Context for shared state |
| Agent-specific UI complexity | High | Start with common patterns, iterate |

## Approval

- [ ] PRD Approved by: _______________
- [ ] Design Approved by: _______________
- [ ] Ready for Implementation: _______________

---

**Next Step:** `/approve prd` to proceed to design phase
