import type { ReactNode } from "react"
import type { DynamicToolUIPart } from "ai"
import type { ToolInvocationState as ChatToolInvocationState } from "../providers/chat-context-types"

export interface Citation {
  id: string
  number: string
  title: string
  url: string
  description?: string
  quote?: string
}

export interface AgentToolsProps {
  tools: Array<ChatToolInvocationState | DynamicToolUIPart>
  className?: string
}

export type TaskStepStatus = "pending" | "running" | "completed" | "error"

export interface TaskStep {
  id: string
  text: string
  status: TaskStepStatus
  file?: {
    name: string
    icon?: string
  }
}

export interface AgentTaskData {
  title: string
  steps: TaskStep[]
}

export interface ArtifactData {
  id: string
  title: string
  description?: string
  type: "code" | "markdown" | "json" | "text" | "html" | "react"
  language?: string
  content: string
}

export interface PlanStep {
  text: string
  completed?: boolean
}

export interface AgentPlanData {
  title: string
  description: string
  steps: PlanStep[] | string[]
  isStreaming?: boolean
  currentStep?: number
}

export interface ReasoningStep {
  id: string
  label: string
  description?: string
  status: "complete" | "active" | "pending"
  searchResults?: string[]
  duration?: number
}

export interface AgentSuggestionsProps {
  suggestions: string[]
  // eslint-disable-next-line no-unused-vars
  onSelect: (suggestion: string) => void
  disabled?: boolean
  className?: string
}

export interface AgentSourcesProps {
  sources: Array<{ url: string; title: string }>
  className?: string
  maxVisible?: number
}

export interface AgentReasoningProps {
  reasoning: string
  isStreaming: boolean
  duration?: number
  className?: string
}

export type ConfirmationSeverity = "info" | "warning" | "danger"

export interface QueuedTask {
  id: string
  title: string
  description?: string
  status: "pending" | "running" | "completed" | "failed"
  createdAt?: Date
  completedAt?: Date
  error?: string
}

export interface WebPreviewData {
  id: string
  url: string
  title?: string
  code?: string
  language?: string
  html?: string
  editable?: boolean
  showConsole?: boolean
  height?: number
}

export type InlineCitationRender = ReactNode[]
