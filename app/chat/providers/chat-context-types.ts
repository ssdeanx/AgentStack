import type {
    UIMessage,
    DynamicToolUIPart,
    ToolUIPart,
    ReasoningUIPart,
    TextUIPart,
} from 'ai'
import type { getAgentConfig } from '../config/agents'
import type { ModelConfig } from '../config/models'

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
    inputTokenDetails: any
    inputTokens: number
    outputTokens: number
    totalTokens: number
}

export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error'

export type ToolInvocationState = ToolUIPart | DynamicToolUIPart

export interface QueuedTask {
    id: string
    title: string
    description?: string
    status: 'pending' | 'running' | 'completed' | 'failed'
}

export interface PendingConfirmation {
    id: string
    toolName: string
    description: string
    approval: { id: string; approved?: boolean; reason?: string }
    state: ToolUIPart['state']
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
    // Temporarily indicates an agent switch is in progress and sends are blocked

    // Actions

    sendMessage: (text: string, files?: File[]) => void
    stopGeneration: () => void
    clearMessages: () => void

    selectAgent: (agentId: string) => void

    selectModel: (modelId: string) => void
    dismissError: () => void

    setFocusMode: (enabled: boolean) => void

    // Task management

    addTask: (task: Omit<QueuedTask, 'id'>) => string

    updateTask: (taskId: string, updates: Partial<QueuedTask>) => void

    removeTask: (taskId: string) => void

    // Confirmation management

    approveConfirmation: (confirmationId: string) => void

    rejectConfirmation: (confirmationId: string, reason?: string) => void
    // Checkpoint management

    createCheckpoint: (messageIndex: number, label?: string) => string

    restoreCheckpoint: (checkpointId: string) => void

    removeCheckpoint: (checkpointId: string) => void
    // Web Preview management

    setWebPreview: (preview: WebPreviewData | null) => void
    // Memory management

    setThreadId: (threadId: string) => void

    setResourceId: (resourceId: string) => void
}
