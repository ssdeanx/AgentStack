"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { getAgentConfig, AGENT_CONFIGS } from "@/app/chat/config/agents"
import type { UIMessage, DynamicToolUIPart, TextUIPart, ReasoningUIPart, ToolUIPart } from "ai"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

export type ToolInvocationState = DynamicToolUIPart

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

export interface ChatContextValue {
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
  queuedTasks: QueuedTask[]
  pendingConfirmations: PendingConfirmation[]
  sendMessage: (text: string, files?: File[]) => void
  stopGeneration: () => void
  clearMessages: () => void
  selectAgent: (agentId: string) => void
  dismissError: () => void
  addTask: (task: Omit<QueuedTask, "id">) => string
  updateTask: (taskId: string, updates: Partial<QueuedTask>) => void
  removeTask: (taskId: string) => void
  approveConfirmation: (confirmationId: string) => void
  rejectConfirmation: (confirmationId: string, reason?: string) => void
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
}

const MASTRA_API_URL = process.env.NEXT_PUBLIC_MASTRA_API_URL || "http://localhost:4111"

export function ChatProvider({
  children,
  defaultAgent = "researchAgent",
}: ChatProviderProps) {
  const [selectedAgent, setSelectedAgent] = useState(defaultAgent)
  const [sources, setSources] = useState<Source[]>([])
  const [usage, setUsage] = useState<TokenUsage | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [queuedTasks, setQueuedTasks] = useState<QueuedTask[]>([])
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([])

  const {
    regenerate,
    stop,
    messages,
    sendMessage: aiSendMessage,
    status: aiStatus,
    error: aiError,
  } = useChat({
    transport: new DefaultChatTransport({
      api: `${MASTRA_API_URL}/chat`,
//      fetch: globalThis.fetch,
      prepareSendMessagesRequest({ messages }) {
        return {
          id: selectedAgent,
          messages,
          memory: {
            thread: "user-1",
            resource: "user-1",
          },
          requestMetadata: {
            agentId: selectedAgent,
            resourceId: selectedAgent
          },
          body: {
            messages,
            resourceId: selectedAgent,
            data: {
              agentId: selectedAgent,
            },
          },
        }
      },
    }),
  })

  const status: ChatStatus = useMemo(() => {
    if (aiError || chatError) return "error"
    if (aiStatus === "streaming") return "streaming"
    if (aiStatus === "submitted") return "submitted"
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
    if (lastMessage?.role === "assistant") {
      return lastMessage.parts?.filter(
        (p): p is DynamicToolUIPart => p.type === "dynamic-tool"
      ) ?? []
    }
    return []
  }, [messages])

  // Extract sources from source-url parts
  useEffect(() => {
    const allSources: Source[] = []
    for (const message of messages) {
      if (message.role === "assistant" && message.parts) {
        for (const part of message.parts) {
          if (part.type === "source-url") {
            const src = part as { url: string; title?: string }
            allSources.push({
              url: src.url,
              title: src.title || src.url,
            })
          }
        }
      }
    }
    if (allSources.length > 0) {
      setSources(allSources)
    } else if (allSources.length === 0) {
      // clear when there are no sources
      setSources([])
    }
  }, [messages])

  const sendMessage = useCallback(
    (text: string, _files?: File[]) => {
      if (!text.trim() || isLoading) return
      setChatError(null)
      setSources([])
      aiSendMessage({ text: text.trim() })
    },
    [isLoading, aiSendMessage]
  )

  const stopGeneration = useCallback(() => {
    stop()
  }, [stop])

  const clearMessages = useCallback(() => {
    setSources([])
    setUsage(null)
    setChatError(null)
    setQueuedTasks([])
    setPendingConfirmations([])
    window.location.reload()
  }, [])

  const selectAgent = useCallback(
    (agentId: string) => {
      if (AGENT_CONFIGS[agentId]) {
        setSelectedAgent(agentId)
        setSources([])
        setChatError(null)
      }
    },
    []
  )

  const dismissError = useCallback(() => {
    setChatError(null)
  }, [])

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

  const approveConfirmation = useCallback((confirmationId: string) => {
    setPendingConfirmations((prev) =>
      prev.map((c) =>
        c.id === confirmationId
          ? { ...c, approval: { ...c.approval, approved: true } }
          : c
      )
    )
    // TODO: Send approval to backend via AI SDK when available
  }, [])

  const rejectConfirmation = useCallback((confirmationId: string, reason?: string) => {
    setPendingConfirmations((prev) =>
      prev.map((c) =>
        c.id === confirmationId
          ? { ...c, approval: { ...c.approval, approved: false, reason } }
          : c
      )
    )
    // TODO: Send rejection to backend via AI SDK when available
  }, [])

  const agentConfig = useMemo(
    () => getAgentConfig(selectedAgent),
    [selectedAgent]
  )

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
      queuedTasks,
      pendingConfirmations,
      sendMessage,
      stopGeneration,
      clearMessages,
      selectAgent,
      dismissError,
      addTask,
      updateTask,
      removeTask,
      approveConfirmation,
      rejectConfirmation,
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
      queuedTasks,
      pendingConfirmations,
      sendMessage,
      stopGeneration,
      clearMessages,
      selectAgent,
      dismissError,
      addTask,
      updateTask,
      removeTask,
      approveConfirmation,
      rejectConfirmation,
    ]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
