import type { UIMessage, DynamicToolUIPart, ToolUIPart, ReasoningUIPart, TextUIPart } from "ai"
import type { getAgentConfig } from "../config/agents"
import type { ModelConfig } from "../config/models"

/**
 * Explicitly model the AI SDK message parts we rely on in the UI.
 *
 * These exports intentionally reference `TextUIPart` and `ReasoningUIPart` so:
 * - the types are available to consumers (components/providers)
 * - TypeScript/ESLint correctly treat these imports as used
 */
export type ChatTextPart = TextUIPart

export type ChatReasoningPart = ReasoningUIPart

export type ChatToolPart = ToolUIPart | DynamicToolUIPart

export type ChatCorePart = ChatTextPart | ChatReasoningPart | ChatToolPart

export interface Source {
  url: string
  title: string
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export type ChatStatus = "ready" | "submitted" | "streaming" | "error"

export type ToolInvocationState = ToolUIPart | DynamicToolUIPart

export interface QueuedTask {
  id: string
  title: string
  description?: string
  status: "pending" | "running" | "completed" | "failed"
}

export interface PendingConfirmation {
  id: string
  toolName: string
  description: string
  approval: { id: string; approved?: boolean; reason?: string }
  state: ToolUIPart["state"]
}

export interface Checkpoint {
  id: string
  messageIndex: number
  timestamp: Date
  messageCount: number
  label?: string
}

export interface WebPreviewData {
  id: string
  url: string
  title?: string
  code?: string
  language?: string
}

export interface ChatContextValue {
  // Core state
  messages: UIMessage[]
  isLoading: boolean
  status: ChatStatus
  selectedAgent: string
  streamingContent: string
  streamingReasoning: string
  toolInvocations: ToolInvocationState[]
  sources: Source[]
  usage: TokenUsage | null
  error: string | null
  agentConfig: ReturnType<typeof getAgentConfig>
  selectedModel: ModelConfig

  // Queue & Tasks
  queuedTasks: QueuedTask[]
  pendingConfirmations: PendingConfirmation[]

  // Checkpoints
  checkpoints: Checkpoint[]

  // Web Preview
  webPreview: WebPreviewData | null

  // Memory settings
  threadId: string
  resourceId: string

  // Focus Mode
  isFocusMode: boolean

  // Actions
  // eslint-disable-next-line no-unused-vars
  sendMessage: (text: string, files?: File[]) => void
  stopGeneration: () => void
  clearMessages: () => void
  // eslint-disable-next-line no-unused-vars
  selectAgent: (agentId: string) => void
  // eslint-disable-next-line no-unused-vars
  selectModel: (modelId: string) => void
  dismissError: () => void
  // eslint-disable-next-line no-unused-vars
  setFocusMode: (enabled: boolean) => void

  // Task management
  // eslint-disable-next-line no-unused-vars
  addTask: (task: Omit<QueuedTask, "id">) => string
  // eslint-disable-next-line no-unused-vars
  updateTask: (taskId: string, updates: Partial<QueuedTask>) => void
  // eslint-disable-next-line no-unused-vars
  removeTask: (taskId: string) => void

  // Confirmation management
  // eslint-disable-next-line no-unused-vars
  approveConfirmation: (confirmationId: string) => void
  // eslint-disable-next-line no-unused-vars
  rejectConfirmation: (confirmationId: string, reason?: string) => void
  // Checkpoint management
  // eslint-disable-next-line no-unused-vars
  createCheckpoint: (messageIndex: number, label?: string) => string
  // eslint-disable-next-line no-unused-vars
  restoreCheckpoint: (checkpointId: string) => void
  // eslint-disable-next-line no-unused-vars
  removeCheckpoint: (checkpointId: string) => void
  // Web Preview management
  // eslint-disable-next-line no-unused-vars
  setWebPreview: (preview: WebPreviewData | null) => void
  // Memory management
  // eslint-disable-next-line no-unused-vars
  setThreadId: (threadId: string) => void
  // eslint-disable-next-line no-unused-vars
  setResourceId: (resourceId: string) => void
}
