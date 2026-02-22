# AI Elements Reference

Two distinct layers:

1. **Base ai-elements** — Reusable library components in `src/components/ai-elements/` (conversation, code, reasoning, input, visualization, media, **agent-tool**, **other**). These are the building blocks; they use `ui/` and are used by the app and by our custom tool UIs.
2. **Custom tool UIs** — Project-specific components in `src/components/ai-elements/tools/` that render Mastra tool results in chat. They **use** base ai-elements (especially `tool.tsx`: Tool, ToolHeader, ToolContent, ToolInput, ToolOutput) and are wired by `app/chat/components/agent-tools.tsx`.

**See also:** [src/components/ai-elements/AGENTS.md](../../../src/components/ai-elements/AGENTS.md)

---

# Part 1: Base layer (ui/)

---

## ui-base

AI Elements are built on **shadcn/ui** primitives in `ui/`. Import from `@/ui/<filename>`.

### ui/ component list

| Category | Files | Purpose |
|----------|-------|---------|
| Layout | `card.tsx`, `layout.tsx`, `sidebar.tsx`, `resizable.tsx`, `separator.tsx`, `scroll-area.tsx`, `breadcrumb.tsx`, `pagination.tsx` | Containers, scroll, structure |
| Forms & inputs | `button.tsx`, `button-group.tsx`, `input.tsx`, `textarea.tsx`, `input-group.tsx`, `input-otp.tsx`, `checkbox.tsx`, `radio-group.tsx`, `select.tsx`, `switch.tsx`, `slider.tsx`, `label.tsx`, `kbd.tsx` | Actions, text, selection |
| Feedback | `progress.tsx`, `spinner.tsx`, `skeleton.tsx`, `alert.tsx`, `sonner.tsx`, `empty.tsx` | Loading, notifications |
| Overlays | `dialog.tsx`, `sheet.tsx`, `popover.tsx`, `tooltip.tsx`, `dropdown-menu.tsx`, `hover-card.tsx`, `navigation-menu.tsx`, `tabs.tsx`, `command.tsx` | Modals, menus |
| Data display | `table.tsx`, `chart.tsx`, `carousel.tsx`, `accordion.tsx`, `avatar.tsx`, `badge.tsx`, `typography.tsx` | Tables, charts, content |
| Effects | `ui/effects/` — `animated-beam.tsx`, `background-beams.tsx`, `border-beam.tsx`, `bento-grid.tsx`, `card-spotlight.tsx`, `spotlight.tsx`, `text-generate.tsx` | Motion, layout |

### ui/agent-tool.tsx

**Path:** `ui/agent-tool.tsx`

Thin wrapper for **AgentDataPart** (Mastra network/custom data parts). Renders a generic tool card using **base** ai-elements from `tool.tsx`: `Tool`, `ToolHeader`, `ToolContent`, `ToolOutput`.

```tsx
import { Tool, ToolContent, ToolHeader, ToolOutput } from '../src/components/ai-elements/tool'
import type { AgentDataPart } from '@mastra/ai-sdk'

export const AgentTool = ({ id, type, data }: AgentDataPart) => (
  <Tool>
    <ToolHeader title={`Agent Tool: ${id}`} type={type.replace('data-', '')} state="output-available" />
    <ToolContent>
      <ToolOutput output={data.text} errorText={undefined} />
    </ToolContent>
  </Tool>
)
```

Use for network/custom data parts. For chat agent tool calls use `app/chat/components/agent-tools.tsx` and the **custom** tool UIs in `src/components/ai-elements/tools/`.

### Which base ai-elements use which ui/

(Base ai-elements only — see next section for custom tools.)

| ui component | Used by base ai-elements (e.g. tool, agent, message, code-block, …) |
|--------------|----------------------------------------------------------------------|
| `accordion` | agent.tsx |
| `alert` | confirmation.tsx |
| `avatar` | commit.tsx |
| `badge` | agent, artifact, chain-of-thought, code-block, inline-citation, message, package-info, reasoning, sandbox, schema-display, stack-trace, suggestion, task, terminal, test-results, **tool**, custom/* |
| `button` | conversation, message, artifact, prompt-input, etc. |
| `button-group` | audio-player, message |
| `card` | node, plan |
| `carousel` | inline-citation |
| `collapsible` | chain-of-thought, checkpoint, file-tree, plan, queue, reasoning, sandbox, schema-display, sources, stack-trace, task, test-results, web-preview, custom/tool-execution-card |
| `command` | model-selector, prompt-input, voice-selector, mic-selector |
| `dialog` | model-selector, voice-selector |
| `dropdown-menu` | prompt-input, open-in-chat |
| `hover-card` | attachments, context, prompt-input, inline-citation |
| `input` | web-preview |
| `input-group` | prompt-input, snippet |
| `progress` | context, custom/workflow-execution |
| `scroll-area` | queue, suggestion |
| `select` | code-block, prompt-input |
| `separator` | checkpoint |
| `spinner` | prompt-input, speech-input, voice-selector |
| `switch` | environment-variables |
| `tabs` | sandbox |
| `tooltip` | artifact, attachments, checkpoint, message, web-preview, custom/* |

**Custom tool UIs** (`src/components/ai-elements/tools/`) also use many of the same ui components (e.g. badge, card, scroll-area, tabs, input) — see Part 3.

---

# Part 2: Base ai-elements

Reusable components in `src/components/ai-elements/` (not in `tools/` or `custom/`). Import from `@/src/components/ai-elements/<filename>`.

---

## Base: conversation-messaging

**Files:** `conversation.tsx`, `message.tsx`, `attachments.tsx`, `inline-citation.tsx`

| File | Exports | Purpose |
|------|---------|---------|
| `conversation.tsx` | Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton | Message container with scroll |
| `message.tsx` | Message, MessageContent, MessageResponse, MessageToolbar, MessageActions, MessageAction, MessageBranch* | Message bubbles |
| `attachments.tsx` | Attachments, Attachment, AttachmentPreview, AttachmentInfo, AttachmentRemove | File/image attachments |
| `inline-citation.tsx` | InlineCitation | Citation inline in content |

**Used in:** `chat-messages.tsx`, `chat-input.tsx`

---

## Base: code-development

**Files:** `code-block.tsx`, `terminal.tsx`, `schema-display.tsx`, `stack-trace.tsx`, `environment-variables.tsx`

| File | Exports | Purpose |
|------|---------|---------|
| `code-block.tsx` | CodeBlock, CodeBlockCopyButton, CodeBlockHeader, CodeBlockContent, CodeBlockLanguageSelector* | Syntax highlighting |
| `terminal.tsx` | Terminal, TerminalHeader, TerminalContent, TerminalCopyButton, TerminalClearButton | Terminal output |
| `schema-display.tsx` | SchemaDisplay, SchemaDisplayHeader, SchemaDisplayProperty, SchemaDisplayContent | JSON schema viz |
| `stack-trace.tsx` | StackTrace, StackTraceHeader, StackTraceContent, StackTraceFrames, StackTraceItem | Error stack |
| `environment-variables.tsx` | EnvironmentVariables | Env var config |

**Used in:** `chat-messages.tsx`, `agent-sandbox.tsx`, `agent-artifact.tsx`

---

## Base: reasoning-debugging

**Files:** `reasoning.tsx`, `chain-of-thought.tsx`, `checkpoint.tsx`, `test-results.tsx`

| File | Exports | Purpose |
|------|---------|---------|
| `reasoning.tsx` | Reasoning, ReasoningTrigger, ReasoningContent, useReasoning | Collapsible reasoning |
| `chain-of-thought.tsx` | ChainOfThought, ChainOfThoughtHeader, ChainOfThoughtContent, ChainOfThoughtStep, ChainOfThoughtSearchResults, ChainOfThoughtSearchResult | Step-by-step reasoning |
| `checkpoint.tsx` | Checkpoint, CheckpointHeader, CheckpointContent | Save points |
| `test-results.tsx` | TestResults, TestSuite, Test, TestStatus, TestName, TestDuration, TestError | Test output | This is for coding....

**Used in:** `agent-reasoning.tsx`, `agent-chain-of-thought.tsx`, `agent-checkpoint.tsx`, `agent-sandbox.tsx`

---

## Base: input-controls

**Files:** `prompt-input.tsx`, `model-selector.tsx`, `toolbar.tsx`, `controls.tsx`

| File | Exports | Purpose |
|------|---------|---------|
| `prompt-input.tsx` | PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit, PromptInputActions | Chat input |
| `model-selector.tsx` | ModelSelector, ModelSelectorTrigger, ModelSelectorContent, ModelSelectorItem | Model/agent picker |
| `toolbar.tsx` | Toolbar | Action toolbar |
| `controls.tsx` | Controls, ControlsPlay, ControlsPause, ControlsStop | Playback controls |

**Used in:** `chat-input.tsx`, `chat-header.tsx`

---

## Base: visualization-canvas

**Files:** `canvas.tsx`, `node.tsx`, `edge.tsx`, `panel.tsx`

| File | Exports | Purpose |
|------|---------|---------|
| `canvas.tsx` | Canvas, CanvasHeader, CanvasContent | Workflow canvas |
| `node.tsx` | Node, NodeHeader, NodeContent | Canvas node |
| `edge.tsx` | Edge, EdgeLabel | Canvas edge |
| `panel.tsx` | Panel, PanelHeader, PanelContent | Side panel |

**Used in:** `agent-workflow.tsx`

---

## Base: media-audio

**Files:** `audio-player.tsx`, `speech-input.tsx`, `transcription.tsx`, `image.tsx`

| File | Exports | Purpose |
|------|---------|---------|
| `audio-player.tsx` | AudioPlayer, AudioPlayerElement, AudioPlayerControlBar, AudioPlayerPlayButton | Audio playback |
| `speech-input.tsx` | SpeechInput | Voice input |
| `transcription.tsx` | Transcription, TranscriptionSegment | Speech-to-text |
| `image.tsx` | Image | Image display |

**Used in:** `chat-messages.tsx`, `chat-input.tsx`

---

## Base: agent-tool

**Files:** `agent.tsx`, `tool.tsx`, `artifact.tsx`, `sandbox.tsx`, `file-tree.tsx`, `web-preview.tsx`

These are **base** building blocks. `tool.tsx` exports the generic tool card pieces that our **custom** tool UIs in `tools/` use (or that `agent-tools.tsx` uses as fallback).

| File | Exports | Purpose |
|------|---------|---------|
| `agent.tsx` | Agent, AgentHeader, AgentContent, AgentTools, AgentTool, AgentOutput | Agent display |
| `tool.tsx` | Tool, ToolHeader, ToolContent, ToolInput, ToolOutput | Generic tool invocation (used by custom tools + fallback) |
| `artifact.tsx` | Artifact, ArtifactHeader, ArtifactContent, ArtifactActions, ArtifactCode | Artifact preview |
| `sandbox.tsx` | Sandbox, SandboxHeader, SandboxContent, SandboxTabs | Code sandbox |
| `file-tree.tsx` | FileTree, FileTreeItem | File structure |
| `web-preview.tsx` | WebPreview, WebPreviewBody, WebPreviewNavigation | HTML preview |

**Used in:** `agent-tools.tsx` (base Tool/Header/Content for fallback; custom tools from `tools/` for specific toolNames), `agent-artifact.tsx`, `agent-sandbox.tsx`, `agent-web-preview.tsx`

---

## Base: other

**Files:** `loader.tsx`, `context.tsx`, `sources.tsx`, `plan.tsx`, `queue.tsx`, `task.tsx`, `suggestion.tsx`, `confirmation.tsx`, `shimmer.tsx`, `snippet.tsx`, `commit.tsx`, `package-info.tsx`

(Base ai-elements — miscellaneous building blocks.)

| File | Exports | Purpose | Section |

|------|---------|---------|
| `loader.tsx` | Loader | Loading indicator |
| `context.tsx` | Context, ContextContent, ContextItem | Token usage display |
| `sources.tsx` | Sources, SourcesTrigger, SourcesContent, Source | Citations | **This is for Web** |
| `plan.tsx` | Plan, PlanHeader, PlanContent, PlanItem | Execution plans |
| `queue.tsx` | Queue, QueueItem, QueueSection | Task queue |
| `task.tsx` | Task, TaskTrigger, TaskContent | Task display |
| `suggestion.tsx` | Suggestions, Suggestion | Input suggestions |
| `confirmation.tsx` | Confirmation | Confirmation dialog |
| `shimmer.tsx` | Shimmer | Loading skeleton |
| `snippet.tsx` | Snippet | Code snippet |  **This is for Coding** |
| `commit.tsx` | Commit, CommitHeader, CommitContent | Git commit display | **This is for Coding** |
| `package-info.tsx` | PackageInfo | Package metadata | **This is for Coding** |

**Used in:** `agent-sources.tsx`, `agent-plan.tsx`, `agent-queue.tsx`, `agent-task.tsx`, `agent-suggestions.tsx`, `agent-confirmation.tsx`, `chat-input.tsx`

---

# Part 3: Custom tool UIs (project-specific)

**Path:** `src/components/ai-elements/tools/`

These are **not** base ai-elements. They are our app-specific components that render Mastra tool results in chat. Each uses **base** ai-elements (e.g. `Tool`, `ToolHeader`, `ToolContent` from `tool.tsx`) and is typed from Mastra tools via `tools/types.ts` (`InferUITool<typeof mastraTool>`). Backend tools live in `src/mastra/tools/`.

### Backend → stream toolName → UI mapping

The **toolName** in the chat stream is the **agent’s tool key** (e.g. `weatherTool`), not necessarily the tool’s `id`. `app/chat/components/agent-tools.tsx` branches on `toolName` and `hasOutput` to pick a custom UI or the generic `Tool`/`ToolHeader`/`ToolContent`/`ToolInput`/`ToolOutput`.

| Mastra backend (file → export) | Tool id (createTool) | toolName in stream | ai-elements/tools UI | agent-tools.tsx check |
|--------------------------------|----------------------|-------------------|----------------------|------------------------|
| `web-scraper-tool.ts` | `web:scraper` | `web:scraper` | WebScraperTool | `toolName === 'web:scraper' && hasOutput` |
| `web-scraper-tool.ts` | `batch-web-scraper` | `batch-web-scraper` | BatchWebScraperTool | `toolName === 'batch-web-scraper' && hasOutput` |
| `web-scraper-tool.ts` | `site-map-extractor` | `site-map-extractor` | SiteMapExtractorTool | `toolName === 'site-map-extractor' && hasOutput` |
| `web-scraper-tool.ts` | `link-extractor` | `link-extractor` | LinkExtractorTool | `toolName === 'link-extractor' && hasOutput` |
| `weather-tool.ts` | `get-weather` | `weatherTool` (agent key) | WeatherCard | `toolName === 'weatherTool' && hasOutput` |
| `github.ts` | `github:listRepositories`, `github:listPullRequests`, `github:getIssue`, `github:listCommits` | Same or kebab (agent key) | GithubTools | `github-list-repositories`, `github-list-pull-requests`, `github-get-issue`, `github-list-commits` (each with hasOutput) |
| `finnhub-tools.ts` | `finnhub-quotes`, `finnhub-company` | same | FinancialTools | `finnhub-quotes` \|\| `polygon-stock-quotes`; `finnhub-company` \|\| `polygon-stock-fundamentals` |
| `polygon-tools.ts` | `polygon-stock-quotes`, `polygon-stock-fundamentals` | same | PolygonTools | (see FinancialTools row for quote/fundamentals) |
| (chart agent) | — | `chart-supervisor` | (chart UI) | `toolName === 'chart-supervisor' && hasOutput` |
| `arxiv.tool.ts` | `arxiv` | `arxiv-search` (or agent key) | ResearchTools | `toolName === 'arxiv-search' && hasOutput` |
| `browser-tool.ts` | `browserTool`, `screenshotTool`, … | same | BrowserTool | (add check per id if needed) |
| e2b / calculator / execa | (per-tool ids) | (agent keys) | E2BSandboxTool, CalculatorTool, ExecaTool | (extend agent-tools.tsx per toolName) |

When no custom match: `agent-tools.tsx` uses **base** ai-elements: `Tool`, `ToolHeader`, `ToolContent`, `ToolInput`, `ToolOutput` from `@/src/components/ai-elements/tool`.

### Chat tool rendering: app/chat/components/agent-tools.tsx

**Path:** `app/chat/components/agent-tools.tsx`

Flow:

1. **Message parts** from the stream include tool invocations (tool-call / tool-result or Mastra equivalents). Each has a **toolName** (agent tool key) and optional **input** / **output**.
2. **Progress** (tool running): when there is `input` but no result yet, the component can show `input.message` or a progress state.
3. **Branch on toolName + hasOutput**: for each known tool, if `hasOutput` is true, render the matching **custom** component from `@/src/components/ai-elements/tools` (e.g. `WebScraperTool`, `WeatherCard`, `GithubTools`), passing typed `input`/`output` from the part.
4. **Fallback**: otherwise render the generic tool card using **base** ai-elements: `Tool`, `ToolHeader`, `ToolContent`, `ToolInput`, `ToolOutput` from `@/src/components/ai-elements/tool`.

Types for custom tool UIs come from `ai-elements/tools/types.ts`, which re-exports `InferUITool<typeof backendTool>` so props match the Mastra tool’s input/output schemas.

### Custom tool UI files (tools/)

| File | Purpose |
|------|---------|
| `types.ts` | `InferUITool<typeof tool>` from `@/src/mastra/tools` → *UITool types for type-safe props |
| `weather-tool.tsx` | WeatherCard — weather tool display |
| `research-tools.tsx` | ResearchTools |
| `financial-tools.tsx` | FinancialTools |
| `polygon-tools.tsx` | PolygonTools (stock/crypto) |
| `github-tools.tsx` | GithubTools |
| `browser-tool.tsx` | BrowserTool |
| `e2b-sandbox-tool.tsx` | E2BSandboxTool |
| `calculator-tool.tsx` | CalculatorTool |
| `execa-tool.tsx` | ExecaTool |
| `web-scraper-tool.tsx` | WebScraperTool, BatchWebScraperTool, SiteMapExtractorTool, LinkExtractorTool |

---

# Part 4: Other project-specific (custom/)

**Path:** `src/components/ai-elements/custom/`

App-specific components that are not base ai-elements and not Mastra tool UIs. They may use base ai-elements and `ui/`.

| File | Purpose |
|------|---------|
| `workflow-execution.tsx` | Workflow execution |
| `tool-execution-card.tsx` | Tool execution card |
| `thinking-indicator.tsx` | Thinking indicator |
| `agent-response.tsx` | Agent response |
