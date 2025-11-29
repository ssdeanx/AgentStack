"use client"

import { mastraClient } from "@/lib/mastra-client"
import { getAgentConfig, AGENT_CONFIGS } from "@/app/chat/config/agents"
import type { UIMessage, DynamicToolUIPart, TextUIPart, ReasoningUIPart } from "ai"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useRef,
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
  sendMessage: (text: string, files?: File[]) => Promise<void>
  stopGeneration: () => void
  clearMessages: () => void
  selectAgent: (agentId: string) => void
  dismissError: () => void
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

function getTextFromParts(parts: UIMessage["parts"]): string {
  const textPart = parts.find((p): p is TextUIPart => p.type === "text")
  return textPart?.text ?? ""
}

export function ChatProvider({
  children,
  defaultAgent = "researchAgent",
}: ChatProviderProps) {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<ChatStatus>("ready")
  const [selectedAgent, setSelectedAgent] = useState(defaultAgent)
  const [streamingContent, setStreamingContent] = useState("")
  const [streamingReasoning, setStreamingReasoning] = useState("")
  const [toolInvocations, setToolInvocations] = useState<ToolInvocationState[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [usage, setUsage] = useState<TokenUsage | null>(null)
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const messageIdCounter = useRef(0)

  const generateMessageId = useCallback(() => {
    messageIdCounter.current += 1
    return `msg-${Date.now()}-${messageIdCounter.current}`
  }, [])

  const sendMessage = useCallback(
    async (text: string, _files?: File[]) => {
      if (!text.trim() || isLoading) return

      const userMessageId = generateMessageId()
      const userMessage: UIMessage = {
        id: userMessageId,
        role: "user",
        parts: [{ type: "text", text: text.trim() }],
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setStatus("submitted")
      setStreamingContent("")
      setStreamingReasoning("")
      setToolInvocations([])
      setSources([])
      setError(null)

      abortControllerRef.current = new AbortController()

      try {
        const agent = mastraClient.getAgent(selectedAgent)

        const allMessages = [...messages, userMessage].map((m) => ({
          role: m.role as "user" | "assistant",
          content: getTextFromParts(m.parts),
        }))

        const response = await agent.stream({
          messages: allMessages,
        })

        setStatus("streaming")
        let fullContent = ""
        let fullReasoning = ""
        const collectedTools: ToolInvocationState[] = []
        const collectedSources: Source[] = []

        await response.processDataStream({
          onChunk: async (chunk) => {
            if (abortControllerRef.current?.signal.aborted) return

            switch (chunk.type) {
              case "text-delta": {
                const text = chunk.payload?.text || ""
                fullContent += text
                setStreamingContent(fullContent)
                break
              }
              case "reasoning-delta": {
                const reasoning = chunk.payload?.text || ""
                fullReasoning += reasoning
                setStreamingReasoning(fullReasoning)
                break
              }
              case "tool-call": {
                const toolName = chunk.payload?.toolName || "unknown"
                const toolCall: ToolInvocationState = {
                  type: "dynamic-tool",
                  state: "input-available",
                  toolCallId: chunk.payload?.toolCallId || generateMessageId(),
                  toolName,
                  input: chunk.payload?.args || {},
                }
                collectedTools.push(toolCall)
                setToolInvocations([...collectedTools])
                break
              }
              case "tool-result": {
                const existingIndex = collectedTools.findIndex(
                  (t) => t.toolCallId === chunk.payload?.toolCallId
                )
                if (existingIndex >= 0) {
                  const existing = collectedTools[existingIndex]
                  collectedTools[existingIndex] = {
                    type: "dynamic-tool",
                    state: "output-available",
                    toolCallId: existing.toolCallId,
                    toolName: existing.toolName,
                    input: existing.input,
                    output: chunk.payload?.result,
                  }
                  setToolInvocations([...collectedTools])
                }
                break
              }
              case "source": {
                if (chunk.payload?.url) {
                  collectedSources.push({
                    url: chunk.payload.url,
                    title: chunk.payload.title || chunk.payload.url,
                  })
                  setSources([...collectedSources])
                }
                break
              }
              case "finish": {
                const finishUsage = chunk.payload?.output?.usage
                if (finishUsage) {
                  setUsage({
                    inputTokens: finishUsage.inputTokens || 0,
                    outputTokens: finishUsage.outputTokens || 0,
                    totalTokens: (finishUsage.inputTokens || 0) + (finishUsage.outputTokens || 0),
                  })
                }
                break
              }
            }
          },
        })

        const assistantMessageId = generateMessageId()
        
        const parts: UIMessage["parts"] = []
        
        if (fullReasoning) {
          const reasoningPart: ReasoningUIPart = {
            type: "reasoning",
            text: fullReasoning,
          }
          parts.push(reasoningPart)
        }
        
        const textPart: TextUIPart = {
          type: "text",
          text: fullContent || "No response received.",
        }
        parts.push(textPart)
        
        for (const tool of collectedTools) {
          parts.push(tool)
        }

        const assistantMessage: UIMessage = {
          id: assistantMessageId,
          role: "assistant",
          parts,
        }

        setMessages((prev) => [...prev, assistantMessage])
        setStatus("ready")
      } catch (err) {
        if (abortControllerRef.current?.signal.aborted) {
          setStatus("ready")
          return
        }

        const errorMessage =
          err instanceof Error ? err.message : "An error occurred"
        setError(errorMessage)
        setStatus("error")

        const errorAssistantMessage: UIMessage = {
          id: generateMessageId(),
          role: "assistant",
          parts: [{ type: "text", text: `Error: ${errorMessage}` }],
        }
        setMessages((prev) => [...prev, errorAssistantMessage])
      } finally {
        setIsLoading(false)
        setStreamingContent("")
        setStreamingReasoning("")
        abortControllerRef.current = null
      }
    },
    [isLoading, messages, selectedAgent, generateMessageId]
  )

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsLoading(false)
    setStatus("ready")
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setStreamingContent("")
    setStreamingReasoning("")
    setToolInvocations([])
    setSources([])
    setUsage(null)
    setError(null)
    setStatus("ready")
  }, [])

  const selectAgent = useCallback(
    (agentId: string) => {
      if (AGENT_CONFIGS[agentId]) {
        setSelectedAgent(agentId)
        setMessages([])
        setSources([])
        setError(null)
      }
    },
    []
  )

  const dismissError = useCallback(() => {
    setError(null)
    if (status === "error") {
      setStatus("ready")
    }
  }, [status])

  const agentConfig = useMemo(
    () => getAgentConfig(selectedAgent),
    [selectedAgent]
  )

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
      sendMessage,
      stopGeneration,
      clearMessages,
      selectAgent,
      dismissError,
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
      sendMessage,
      stopGeneration,
      clearMessages,
      selectAgent,
      dismissError,
    ]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
