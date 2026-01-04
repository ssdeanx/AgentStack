"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { getAgentConfig, AGENT_CONFIGS, DEFAULT_AGENT_ID } from "../config/agents"
import { getDefaultModel, getModelConfig, type ModelConfig } from "../config/models"
import type { UIMessage, DynamicToolUIPart, TextUIPart, ReasoningUIPart, ToolUIPart } from "ai"
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { getClientIdentity, getOrCreateLocalStorageId } from "@/lib/client-identity"
import type {
  Source,
  TokenUsage,
  ChatStatus,
  ToolInvocationState,
  QueuedTask,
  PendingConfirmation,
  Checkpoint,
  WebPreviewData,
  ChatContextValue,
} from "./chat-context-types"
import { ChatContext } from "./chat-context-hooks"

export interface ChatProviderProps {
  children: ReactNode
  defaultAgent?: string
  defaultThreadId?: string
  defaultResourceId?: string
}

const MASTRA_API_URL = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"

function extractThoughtSummaryFromParts(parts: UIMessage["parts"] | undefined): string {
  if (!parts || parts.length === 0) {return ""}

  for (const part of parts) {
    const pm = (part as { providerMetadata?: unknown }).providerMetadata
    if (pm === null || typeof pm !== "object") {continue}

    const googleMeta = (pm as Record<string, unknown>).google
    if (googleMeta === null || typeof googleMeta !== "object") {continue}

    // Different SDKs/versions surface this under slightly different keys.
    const candidates = [
      (googleMeta as Record<string, unknown>).thoughtSummary,
      (googleMeta as Record<string, unknown>).thoughts,
      (googleMeta as Record<string, unknown>).thinkingSummary,
    ]

    for (const c of candidates) {
      if (typeof c === "string" && c.trim().length > 0) {
        return c
      }
    }
  }

  return ""
}

export function ChatProvider({
  children,
  defaultAgent = DEFAULT_AGENT_ID,
  defaultThreadId,
  defaultResourceId,
}: ChatProviderProps) {
  const identity = useMemo(() => getClientIdentity(), [])

  const [selectedAgent, setSelectedAgent] = useState(defaultAgent)
  // sourcesState is nullable to allow falling back to derived sources from messages.
  const [sourcesState, setSourcesState] = useState<Source[] | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [queuedTasks, setQueuedTasks] = useState<QueuedTask[]>([])
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [webPreview, setWebPreviewState] = useState<WebPreviewData | null>(null)

  const [resourceId, setResourceIdState] = useState(() => {
    return defaultResourceId ?? identity.resourceId
  })

  const threadStorageKey = useCallback(
    (agentId: string) => `agentstack.chat.threadId.${agentId}`,
    []
  )

  const [threadId, setThreadIdState] = useState(() => {
    if (defaultThreadId !== undefined && defaultThreadId.trim().length > 0) {
      return defaultThreadId
    }
    return getOrCreateLocalStorageId(
      threadStorageKey(defaultAgent),
      `thread:${identity.userId}:${defaultAgent}`
    )
  })

  const [selectedModel, setSelectedModel] = useState<ModelConfig>(getDefaultModel())
  const [isFocusMode, setFocusMode] = useState(false)

  // Ref to track message snapshots for checkpoint restore
  const messageSnapshotsRef = useRef<Map<string, UIMessage[]>>(new Map())

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${MASTRA_API_URL}/chat/${selectedAgent}`,
        // Match the network provider's request shape so the server can pick the
        // correct agent by reading body.data.agentId. Avoid sending extra
        // top-level fields which can confuse the MAStra chatRoute router.
        prepareSendMessagesRequest({ messages: outgoingMessages }) {
          const last = outgoingMessages[outgoingMessages.length - 1]
          const textPart = last?.parts?.find((p): p is TextUIPart => p.type === "text")

          return {
            api: `${MASTRA_API_URL}/chat/${selectedAgent}`,
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
    [selectedAgent, threadId, resourceId]
  )

  const {
    messages,
    setMessages,
    sendMessage: aiSendMessage,
    status: aiStatus,
    error: aiError,
    stop,
  } = useChat({
    transport,
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

      const direct = reasoningPart?.text
      if (typeof direct === "string" && direct.trim().length > 0) {
        return direct
      }

      return extractThoughtSummaryFromParts(lastMessage.parts)
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

  // Derive sources from assistant messages (no synchronous setState in effect).
  const derivedSources = useMemo<Source[]>(() => {
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
    return allSources
  }, [messages])

  // Derive web preview data from tool outputs (for chart/diagram agents)
  const derivedWebPreview = useMemo<WebPreviewData | null>(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role !== "assistant") {return null}

    const part = lastMessage.parts.find((p) => {
      if (p.type === "dynamic-tool") {return true}
      if (typeof p.type === "string" && p.type.startsWith("tool-")) {return true}
      return false
    })

    if (!part) {return null}

    let output: Record<string, unknown> | undefined

    if (part.type === "dynamic-tool") {
      output = (part as DynamicToolUIPart).output as Record<string, unknown>
    } else {
      output = (part as ToolUIPart as unknown as { output?: unknown }).output as Record<string, unknown>
    }

    const isPlainObject = (v: unknown): v is Record<string, unknown> =>
      v !== null && typeof v === "object" && !Array.isArray(v)

    if (!isPlainObject(output)) {
      return null
    }

    const out = output

    if (typeof out.previewUrl === "string") {
      return {
        id: "web-preview",
        url: out.previewUrl,
        title: (out.title as string) || "Generated Preview",
      }
    } else if (typeof out.code === "string") {
      const language = (out.language as string) || "tsx"
      const htmlCandidate = (out as { html?: unknown }).html
      if (language === "html" || typeof htmlCandidate === "string") {
        const htmlContent = typeof htmlCandidate === "string" ? htmlCandidate : out.code
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
        return {
          id: "web-preview",
          url: dataUrl,
          title: (out.title as string) || "Generated UI",
          code: out.code,
          language,
        }
      }
    }

    return null
  }, [messages])

  const sendMessage = useCallback(
    (text: string, files?: File[]) => {
      if (!text.trim() || isLoading) {return}
      setChatError(null)
      aiSendMessage({
        text: text.trim(),
        // @ts-ignore - attachments support in AI SDK v5
        attachments: files
      })
    },
    [isLoading, aiSendMessage]
  )

  const stopGeneration = useCallback(() => {
    stop()
  }, [stop])

  const clearMessages = useCallback(() => {
    setMessages([])
    setSourcesState([])
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

        // Keep per-agent thread IDs stable by default (but never hard-coded).
        if (!(defaultThreadId !== undefined && defaultThreadId.trim().length > 0)) {
          setThreadIdState(
            getOrCreateLocalStorageId(
              threadStorageKey(agentId),
              `thread:${identity.userId}:${agentId}`
            )
          )
        }

        setSourcesState([])
        setChatError(null)
        setWebPreviewState(null)
      }
    },
    [defaultThreadId, identity.userId, threadStorageKey]
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
    try {
      window.localStorage.setItem(threadStorageKey(selectedAgent), newThreadId)
    } catch {
      // ignore
    }
  }, [selectedAgent, threadStorageKey])

  const setResourceId = useCallback((newResourceId: string) => {
    setResourceIdState(newResourceId)
    try {
      window.localStorage.setItem('agentstack.resourceId', newResourceId)
    } catch {
      // ignore
    }
  }, [])

  const agentConfig = useMemo(
    () => getAgentConfig(selectedAgent),
    [selectedAgent]
  )

  const error = aiError?.message ?? chatError

  const value = useMemo<ChatContextValue>(
    () => {
      // Derive usage data from the last completed assistant message.
      // Avoid calling setState inside an effect to prevent cascading renders.
      const usage: TokenUsage | null = (() => {
        const lastMessage = messages[messages.length - 1]
        if (lastMessage?.role === "assistant" && aiStatus === "ready") {
          for (const part of lastMessage.parts) {
            const partAny = part as Record<string, unknown>
            if (partAny.type === "step-finish" || partAny.type === "finish") {
              const usageData = partAny.usage as Record<string, number> | undefined
              if (usageData) {
                return {
                  inputTokens: usageData.promptTokens ?? usageData.inputTokens ?? 0,
                  outputTokens: usageData.completionTokens ?? usageData.outputTokens ?? 0,
                  totalTokens: usageData.totalTokens ?? 0,
                }
              }
            }
          }
        }
        return null
      })()

      return {
        messages,
        isLoading,
        status,
        selectedAgent,
        streamingContent,
        streamingReasoning,
        toolInvocations,
        sources: sourcesState ?? derivedSources,
        usage,
        error,
        agentConfig,
        selectedModel,
        queuedTasks,
        pendingConfirmations,
        checkpoints,
        webPreview: webPreview ?? derivedWebPreview,
        threadId,
        resourceId,
        isFocusMode,
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
        setFocusMode,
      }
    },
    [messages, isLoading, status, selectedAgent, streamingContent, streamingReasoning, toolInvocations, sourcesState, derivedSources, error, agentConfig, selectedModel, queuedTasks, pendingConfirmations, checkpoints, webPreview, derivedWebPreview, threadId, resourceId, isFocusMode, sendMessage, stopGeneration, clearMessages, selectAgent, selectModel, dismissError, addTask, updateTask, removeTask, approveConfirmation, rejectConfirmation, createCheckpoint, restoreCheckpoint, removeCheckpoint, setWebPreview, setThreadId, setResourceId, setFocusMode, aiStatus]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
