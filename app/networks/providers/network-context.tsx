"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { UIMessage, TextUIPart, ReasoningUIPart, DynamicToolUIPart, SourceUrlUIPart } from "ai"
import {
  getNetworkConfig,
  NETWORK_CONFIGS,
  type NetworkConfig,
  type NetworkId,
} from "@/app/networks/config/networks"

export type NetworkStatus = "idle" | "routing" | "executing" | "completed" | "error"

export interface RoutingStep {
  agentId: string
  agentName: string
  input: string
  output?: string
  status: "pending" | "active" | "completed" | "error"
  startedAt?: Date
  completedAt?: Date
}

export interface Source {
  url: string
  title: string
}

export type ToolInvocationState = DynamicToolUIPart

export interface NetworkContextValue {
  selectedNetwork: NetworkId
  networkConfig: NetworkConfig | undefined
  networkStatus: NetworkStatus
  routingSteps: RoutingStep[]
  messages: UIMessage[]
  streamingOutput: string
  streamingReasoning: string
  toolInvocations: ToolInvocationState[]
  sources: Source[]
  error: string | null
  selectNetwork: (networkId: NetworkId) => void
  sendMessage: (text: string) => void
  stopExecution: () => void
  clearHistory: () => void
}

const NetworkContext = createContext<NetworkContextValue | null>(null)

export function useNetworkContext(): NetworkContextValue {
  const context = useContext(NetworkContext)
  if (!context) {
    throw new Error("useNetworkContext must be used within a NetworkProvider")
  }
  return context
}

export interface NetworkProviderProps {
  children: ReactNode
  defaultNetwork?: NetworkId
}

const MASTRA_API_URL = process.env.NEXT_PUBLIC_MASTRA_API_URL || "http://localhost:4111"

/**
 * Convert Mastra `data-tool-*` or `data-network` parts to DynamicToolUIPart
 */
function mapDataPartToDynamicTool(part: any): DynamicToolUIPart | null {
  if (!part || typeof part !== "object") return null
  
  const partType = part.type as string
  if (!partType?.startsWith("data-tool") && partType !== "data-network") {
    return null
  }

  const payload = part.data ?? part.payload ?? part
  const inner = payload?.data ?? payload

  const toolCallId = inner?.toolCallId ?? inner?.id ?? inner?.callId ?? `tool-${Date.now()}`
  const toolName = inner?.toolName ?? inner?.name ?? inner?.tool ?? inner?.agentName ?? "network-step"
  const input = inner?.input ?? inner?.args ?? inner?.params
  const output = inner?.output ?? inner?.result ?? inner?.value
  const errorText = inner?.errorText ?? inner?.error
  const rawState = (inner?.state ?? inner?.status ?? "").toString().toLowerCase()

  let state: DynamicToolUIPart["state"] = "input-available"
  if (rawState.includes("stream") || rawState.includes("pending")) state = "input-streaming"
  else if (rawState.includes("success") || rawState.includes("done") || rawState.includes("completed") || output) state = "output-available"
  else if (rawState.includes("error") || rawState.includes("failed")) state = "output-error"

  return {
    type: "dynamic-tool",
    toolCallId: String(toolCallId),
    toolName: String(toolName),
    input,
    output,
    errorText,
    state,
  } as DynamicToolUIPart
}

export function NetworkProvider({
  children,
  defaultNetwork = "agentNetwork",
}: NetworkProviderProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkId>(defaultNetwork)
  const [routingSteps, setRoutingSteps] = useState<RoutingStep[]>([])
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [sources, setSources] = useState<Source[]>([])

  const networkConfig = useMemo(
    () => getNetworkConfig(selectedNetwork),
    [selectedNetwork]
  )

  const {
    messages,
    setMessages,
    sendMessage: aiSendMessage,
    stop,
    status: aiStatus,
    error: aiError,
  } = useChat({
    transport: new DefaultChatTransport({
      api: `${MASTRA_API_URL}/network`,
      prepareSendMessagesRequest({ messages }) {
        const last = messages[messages.length - 1]
        const textPart = last?.parts?.find(
          (p): p is TextUIPart => p.type === "text"
        )

        return {
          body: {
            messages,
            resourceId: selectedNetwork,
            data: {
              networkId: selectedNetwork,
              input: textPart?.text ?? "",
            },
          },
        }
      },
    }),
  })

  const networkStatus: NetworkStatus = useMemo(() => {
    if (aiError || networkError) return "error"
    if (aiStatus === "streaming") return "executing"
    if (aiStatus === "submitted") return "routing"
    return "idle"
  }, [aiStatus, aiError, networkError])

  const streamingOutput = useMemo(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === "assistant") {
      const textPart = lastMessage.parts?.find(
        (p): p is TextUIPart => p.type === "text"
      )
      return textPart?.text ?? ""
    }
    return ""
  }, [messages])

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

  // Extract tool invocations from messages
  const toolInvocations = useMemo((): ToolInvocationState[] => {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== "assistant" || !lastMessage.parts) return []

    const result: ToolInvocationState[] = []
    for (const p of lastMessage.parts) {
      // Standard dynamic-tool parts
      if (p.type === "dynamic-tool") {
        result.push(p as ToolInvocationState)
        continue
      }
      // Mastra data-tool-* or data-network parts
      if (typeof p.type === "string" && (p.type.startsWith("data-tool") || p.type === "data-network")) {
        const converted = mapDataPartToDynamicTool(p)
        if (converted) result.push(converted)
      }
    }
    return result
  }, [messages])

  // Extract sources from source-url parts
  useEffect(() => {
    const allSources: Source[] = []
    for (const message of messages) {
      if (message.role === "assistant" && message.parts) {
        for (const part of message.parts) {
          if (part.type === "source-url") {
            const src = part as SourceUrlUIPart
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

  // Extract routing steps from data-network parts
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === "assistant" && networkConfig) {
      const dataParts = lastMessage.parts?.filter(
        (p) =>
          p.type === "data-network" ||
          p.type === "dynamic-tool" ||
          (typeof p.type === "string" && p.type.startsWith("data-tool-"))
      )

      if (dataParts && dataParts.length > 0) {
        const steps: RoutingStep[] = networkConfig.agents.map((agent, index) => ({
          agentId: agent.id,
          agentName: agent.name,
          input: "",
          status: index === 0 && aiStatus === "streaming" ? "active" : "pending",
        }))
        setRoutingSteps(steps)
      }
    }
  }, [messages, networkConfig, aiStatus])

  const selectNetwork = useCallback((networkId: NetworkId) => {
    if (NETWORK_CONFIGS[networkId]) {
      setSelectedNetwork(networkId)
      setRoutingSteps([])
      setNetworkError(null)
      setSources([])
    }
  }, [])

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return
      setNetworkError(null)
      setRoutingSteps([])
      aiSendMessage({ text: text.trim() })
    },
    [aiSendMessage]
  )

  const stopExecution = useCallback(() => {
    stop()
  }, [stop])

  const clearHistory = useCallback(() => {
    setMessages([])
    setRoutingSteps([])
    setNetworkError(null)
    setSources([])
  }, [setMessages])

  const error = aiError?.message ?? networkError

  const value = useMemo<NetworkContextValue>(
    () => ({
      selectedNetwork,
      networkConfig,
      networkStatus,
      routingSteps,
      messages,
      streamingOutput,
      streamingReasoning,
      toolInvocations,
      sources,
      error,
      selectNetwork,
      sendMessage,
      stopExecution,
      clearHistory,
    }),
    [
      selectedNetwork,
      networkConfig,
      networkStatus,
      routingSteps,
      messages,
      streamingOutput,
      streamingReasoning,
      toolInvocations,
      sources,
      error,
      selectNetwork,
      sendMessage,
      stopExecution,
      clearHistory,
    ]
  )

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  )
}
