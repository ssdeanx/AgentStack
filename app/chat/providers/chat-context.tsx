"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { getAgentConfig, AGENT_CONFIGS } from "../config/agents"
import { getDefaultModel, getModelConfig, type ModelConfig } from "../config/models"
import type { UIMessage, DynamicToolUIPart, TextUIPart, ReasoningUIPart, ToolUIPart } from "ai"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

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

  // Actions
  sendMessage: (_text: string, _files?: File[]) => void
  stopGeneration: () => void
  clearMessages: () => void
  selectAgent: (_agentId: string) => void
  selectModel: (_modelId: string) => void
  dismissError: () => void

  // Task management
  addTask: (_task: Omit<QueuedTask, "id">) => string
  updateTask: (_taskId: string, _updates: Partial<QueuedTask>) => void
  removeTask: (_taskId: string) => void

  // Confirmation management
  approveConfirmation: (_confirmationId: string) => void
  rejectConfirmation: (_confirmationId: string, _reason?: string) => void

  // Checkpoint management
  createCheckpoint: (_messageIndex: number, _label?: string) => string
  restoreCheckpoint: (_checkpointId: string) => void
  removeCheckpoint: (_checkpointId: string) => void

  // Web Preview management
  setWebPreview: (_preview: WebPreviewData | null) => void

  // Memory management
  setThreadId: (_threadId: string) => void
  setResourceId: (_resourceId: string) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider")
  }
  return context
}

export interface ChatProviderProps {
  children: ReactNode
  defaultAgent?: string
  defaultThreadId?: string
  defaultResourceId?: string
}

const MASTRA_API_URL = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"

export function ChatProvider({
  children,
  defaultAgent = "researchAgent",
  defaultThreadId = "user-1",
  defaultResourceId = "user-1",
}: ChatProviderProps) {
  const [selectedAgent, setSelectedAgent] = useState(defaultAgent)
  const [sources, setSources] = useState<Source[]>([])
  const [usage, setUsage] = useState<TokenUsage | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [queuedTasks, setQueuedTasks] = useState<QueuedTask[]>([])
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [webPreview, setWebPreviewState] = useState<WebPreviewData | null>(null)
  const [threadId, setThreadIdState] = useState(defaultThreadId)
  const [resourceId, setResourceIdState] = useState(defaultResourceId)
  const [selectedModel, setSelectedModel] = useState<ModelConfig>(getDefaultModel())

  // Ref to track message snapshots for checkpoint restore
  const messageSnapshotsRef = useRef<Map<string, UIMessage[]>>(new Map())

  const {
    messages,
    setMessages,
    sendMessage: aiSendMessage,
    status: aiStatus,
    error: aiError,
    stop,
  } = useChat({
    transport: new DefaultChatTransport({
      api: `${MASTRA_API_URL}/chat/${selectedAgent}`,
      // Match the network provider's request shape so the server can pick the
      // correct agent by reading body.data.agentId. Avoid sending extra
      // top-level fields which can confuse the MAStra chatRoute router.
      prepareSendMessagesRequest({ messages: outgoingMessages }) {
        const last = outgoingMessages[outgoingMessages.length - 1]
        const textPart = last?.parts?.find((p): p is TextUIPart => p.type === "text")

        return {
              body: {
                // id at top-level is used by chatRoute to select the agent when
                // multiple chatRoute handlers are registered at the same path.
                id: selectedAgent,
            messages: outgoingMessages,
            memory: {
            thread: threadId,
            resource: resourceId,
          },
          requestMetadata: {
            agentId: selectedAgent,
            resourceId,
          },
            // set resourceId so server can use it for tracing/memory if needed
            resourceId,
            data: {
              agentId: selectedAgent,
              threadId,
              input: textPart?.text ?? "",
            },
          },
        }
      },
    }),
  })

  const status: ChatStatus = useMemo(() => {
    if (aiError || (Boolean(chatError))) {return "error"}
    if (aiStatus === "streaming") {return "streaming"}
    if (aiStatus === "submitted") {return "submitted"}
    return "ready"
  }, [aiStatus, aiError, chatError])

  const isLoading = status === "streaming" || status === "submitted"

  const streamingContent = useMemo(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === "assistant" && aiStatus === "streaming") {
      const textPart = lastMessage.parts?.find((p): p is TextUIPart => p.type === "text")
      return textPart?.text ?? ""
    }
    return ""
  }, [messages, aiStatus])

  const streamingReasoning = useMemo(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === "assistant") {
      const reasoningPart = lastMessage.parts?.find(
        (p): p is ReasoningUIPart => p.type === "reasoning"
      )
      return reasoningPart?.text ?? ""
    }
    return ""
  }, [messages])

  const toolInvocations = useMemo((): ToolInvocationState[] => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role !== "assistant") {return []}

    // Collect native AI SDK tool parts (tool-*) and dynamic-tool parts.
    const {parts} = lastMessage
    const result: ToolInvocationState[] = []

    for (const p of parts) {
      if (p.type === "dynamic-tool") {
        result.push(p as DynamicToolUIPart)
      } else if (typeof p.type === "string" && p.type.startsWith("tool-")) {
        result.push(p as ToolUIPart)
      }
    }

    return result
  }, [messages])

  // Extract sources from source-url parts
  useEffect(() => {
    const allSources: Source[] = []
    for (const message of messages) {
      if (message.role === "assistant") {
        for (const part of message.parts) {
          if (part.type === "source-url") {
            const src = part as { url: string; title?: string }
            allSources.push({
              url: src.url,
              title: src.title ?? src.url,
            })
          }
        }
      }
    }
    setSources(allSources)
  }, [messages])

  // Extract web preview data from tool outputs (for chart/diagram agents)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === "assistant") {
      for (const part of lastMessage.parts) {
        // Check for generated HTML/React code in tool outputs
        let output: Record<string, unknown> | undefined

        if (part.type === "dynamic-tool") {
          output = (part as DynamicToolUIPart).output as Record<string, unknown> | undefined
        } else if (typeof part.type === "string" && part.type.startsWith("tool-")) {
          const toolPart = part as ToolUIPart
          output = (toolPart as unknown as { output?: unknown }).output as Record<string, unknown> | undefined
        } else {
          continue
        }

        if (output && typeof output === "object") {
          const out = output

          // Check for preview URL or generated code
          if ((Boolean(out.previewUrl)) && typeof out.previewUrl === "string") {
            setWebPreviewState({
              id: `preview-${Date.now()}`,
              url: out.previewUrl,
              title: (out.title as string) || "Generated Preview",
            })
          } else if ((Boolean(out.code)) && typeof out.code === "string") {
            // For code generation (like Recharts), create a data URL or sandbox
            const language = (out.language as string) || "tsx"
            const htmlCandidate = (out as { html?: unknown }).html
            if (language === "html" || typeof htmlCandidate === "string") {
              const htmlContent = typeof htmlCandidate === "string" ? htmlCandidate : out.code
              const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
              setWebPreviewState({
                id: `preview-${Date.now()}`,
                url: dataUrl,
                title: (out.title as string) || "Generated UI",
                code: out.code,
                language,
              })
            }
          }
        }
      }
    }
  }, [messages])

  const sendMessage = useCallback(
    (text: string, _files?: File[]) => {
      if (!text.trim() || isLoading) {return}
      setChatError(null)
      aiSendMessage({ text: text.trim() })
    },
    [isLoading, aiSendMessage]
  )

  const stopGeneration = useCallback(() => {
    stop()
  }, [stop])

  const clearMessages = useCallback(() => {
    setMessages([])
    setSources([])
    setUsage(null)
    setChatError(null)
    setQueuedTasks([])
    setPendingConfirmations([])
    setCheckpoints([])
    setWebPreviewState(null)
    messageSnapshotsRef.current.clear()
  }, [setMessages])

  const selectAgent = useCallback(
    (agentId: string) => {
      if (Object.prototype.hasOwnProperty.call(AGENT_CONFIGS, agentId)) {
        setSelectedAgent(agentId)
        setSources([])
        setChatError(null)
        setWebPreviewState(null)
      }
    },
    []
  )

  const selectModel = useCallback(
    (modelId: string) => {
      const model = getModelConfig(modelId)
      if (model) {
        setSelectedModel(model)
      }
    },
    []
  )

  const dismissError = useCallback(() => {
    setChatError(null)
  }, [])

  // Task management
  const addTask = useCallback((task: Omit<QueuedTask, "id">): string => {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setQueuedTasks((prev) => [...prev, { ...task, id }])
    return id
  }, [])

  const updateTask = useCallback((taskId: string, updates: Partial<QueuedTask>) => {
    setQueuedTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task))
    )
  }, [])

  const removeTask = useCallback((taskId: string) => {
    setQueuedTasks((prev) => prev.filter((task) => task.id !== taskId))
  }, [])

  // Confirmation management
  const approveConfirmation = useCallback((confirmationId: string) => {
    setPendingConfirmations((prev) =>
      prev.map((c) =>
        c.id === confirmationId
          ? { ...c, approval: { ...c.approval, approved: true } }
          : c
      )
    )
  }, [])

  const rejectConfirmation = useCallback((confirmationId: string, reason?: string) => {
    setPendingConfirmations((prev) =>
      prev.map((c) =>
        c.id === confirmationId
          ? { ...c, approval: { ...c.approval, approved: false, reason } }
          : c
      )
    )
  }, [])

  // Checkpoint management
  const createCheckpoint = useCallback(
    (messageIndex: number, label?: string): string => {
      const id = `checkpoint-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const checkpoint: Checkpoint = {
        id,
        messageIndex,
        timestamp: new Date(),
        messageCount: messageIndex + 1,
        label,
      }

      // Store snapshot of messages up to this point
      messageSnapshotsRef.current.set(id, messages.slice(0, messageIndex + 1))

      setCheckpoints((prev) => {
        // Remove any existing checkpoint at this index
        const filtered = prev.filter((cp) => cp.messageIndex !== messageIndex)
        return [...filtered, checkpoint].sort((a, b) => a.messageIndex - b.messageIndex)
      })

      return id
    },
    [messages]
  )

  const restoreCheckpoint = useCallback(
    (checkpointId: string) => {
      const checkpoint = checkpoints.find((cp) => cp.id === checkpointId)
      if (!checkpoint) {return}

      // Try to restore from snapshot first
      const snapshot = messageSnapshotsRef.current.get(checkpointId)
      if (snapshot) {
        setMessages(snapshot)
      } else {
        // Fallback: slice current messages to checkpoint index
        setMessages(messages.slice(0, checkpoint.messageIndex + 1))
      }

      // Remove checkpoints after the restored one
      setCheckpoints((prev) =>
        prev.filter((cp) => cp.messageIndex <= checkpoint.messageIndex)
      )

      // Clean up snapshots for removed checkpoints
      const removedIds = checkpoints
        .filter((cp) => cp.messageIndex > checkpoint.messageIndex)
        .map((cp) => cp.id)
      removedIds.forEach((id) => messageSnapshotsRef.current.delete(id))

      // Clear web preview when restoring
      setWebPreviewState(null)
    },
    [checkpoints, messages, setMessages]
  )

  const removeCheckpoint = useCallback((checkpointId: string) => {
    setCheckpoints((prev) => prev.filter((cp) => cp.id !== checkpointId))
    messageSnapshotsRef.current.delete(checkpointId)
  }, [])

  // Web Preview management
  const setWebPreview = useCallback((preview: WebPreviewData | null) => {
    setWebPreviewState(preview)
  }, [])

  // Memory management
  const setThreadId = useCallback((newThreadId: string) => {
    setThreadIdState(newThreadId)
  }, [])

  const setResourceId = useCallback((newResourceId: string) => {
    setResourceIdState(newResourceId)
  }, [])

  const agentConfig = useMemo(
    () => getAgentConfig(selectedAgent),
    [selectedAgent]
  )

  // Extract usage data from completed messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === "assistant" && aiStatus === "ready") {
      for (const part of lastMessage.parts) {
        // Look for step-finish part with usage data (from Mastra server)
        const partAny = part as Record<string, unknown>
        if (partAny.type === "step-finish" || partAny.type === "finish") {
          const usageData = partAny.usage as Record<string, number> | undefined
          if (usageData) {
            setUsage({
              inputTokens: usageData.promptTokens ?? usageData.inputTokens ?? 0,
              outputTokens: usageData.completionTokens ?? usageData.outputTokens ?? 0,
              totalTokens: usageData.totalTokens ?? 0,
            })
            break
          }
        }
      }
    }
  }, [messages, aiStatus])

  const error = aiError?.message ?? chatError

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      isLoading,
      status,
      selectedAgent,
      streamingContent,
      streamingReasoning,
      toolInvocations,
      sources,
      usage,
      error,
      agentConfig,
      selectedModel,
      queuedTasks,
      pendingConfirmations,
      checkpoints,
      webPreview,
      threadId,
      resourceId,
      sendMessage,
      stopGeneration,
      clearMessages,
      selectAgent,
      selectModel,
      dismissError,
      addTask,
      updateTask,
      removeTask,
      approveConfirmation,
      rejectConfirmation,
      createCheckpoint,
      restoreCheckpoint,
      removeCheckpoint,
      setWebPreview,
      setThreadId,
      setResourceId,
    }),
    [
      messages,
      isLoading,
      status,
      selectedAgent,
      streamingContent,
      streamingReasoning,
      toolInvocations,
      sources,
      usage,
      error,
      agentConfig,
      selectedModel,
      queuedTasks,
      pendingConfirmations,
      checkpoints,
      webPreview,
      threadId,
      resourceId,
      sendMessage,
      stopGeneration,
      clearMessages,
      selectAgent,
      selectModel,
      dismissError,
      addTask,
      updateTask,
      removeTask,
      approveConfirmation,
      rejectConfirmation,
      createCheckpoint,
      restoreCheckpoint,
      removeCheckpoint,
      setWebPreview,
      setThreadId,
      setResourceId,
    ]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
