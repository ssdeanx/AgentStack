"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { UIMessage, TextUIPart, DynamicToolUIPart } from "ai"
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

export interface NetworkContextValue {
  selectedNetwork: NetworkId
  networkConfig: NetworkConfig | undefined
  networkStatus: NetworkStatus
  routingSteps: RoutingStep[]
  messages: UIMessage[]
  streamingOutput: string
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

export function NetworkProvider({
  children,
  defaultNetwork = "agentNetwork",
}: NetworkProviderProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkId>(defaultNetwork)
  const [routingSteps, setRoutingSteps] = useState<RoutingStep[]>([])
  const [networkError, setNetworkError] = useState<string | null>(null)

  const networkConfig = useMemo(
    () => getNetworkConfig(selectedNetwork),
    [selectedNetwork]
  )

  // useChat from @ai-sdk/react with DefaultChatTransport for network streaming
  const {
    messages,
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

  // Map status
  const networkStatus: NetworkStatus = useMemo(() => {
    if (aiError || networkError) return "error"
    if (aiStatus === "streaming") return "executing"
    if (aiStatus === "submitted") return "routing"
    return "idle"
  }, [aiStatus, aiError, networkError])

  // Extract streaming output from messages
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

  // Extract routing steps from data-network parts
  useMemo(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === "assistant" && networkConfig) {
      const dataParts = lastMessage.parts?.filter(
        (p) => p.type === "data-network" || p.type === "dynamic-tool"
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
    setRoutingSteps([])
    setNetworkError(null)
    window.location.reload()
  }, [])

  const error = aiError?.message ?? networkError

  const value = useMemo<NetworkContextValue>(
    () => ({
      selectedNetwork,
      networkConfig,
      networkStatus,
      routingSteps,
      messages,
      streamingOutput,
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
