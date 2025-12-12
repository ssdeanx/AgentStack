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
import type { UIMessage, TextUIPart, ReasoningUIPart, DynamicToolUIPart, SourceUrlUIPart, ToolUIPart } from "ai"
import {
  getNetworkConfig,
  NETWORK_CONFIGS,
  type NetworkConfig,
  type NetworkId,
} from "@/app/networks/config/networks"
import type { AgentDataPart, NetworkDataPart } from "@mastra/ai-sdk";
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

export interface ProgressEvent {
  id: string
  stage: string
  status: "in-progress" | "done" | "error"
  message: string
  agentId?: string
  timestamp: Date
  data?: unknown
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
  progressEvents: ProgressEvent[]
  messages: UIMessage[]
  streamingOutput: string
  streamingReasoning: string
  toolInvocations: ToolInvocationState[]
  sources: Source[]
  error: string | null
  selectNetwork: (_networkId: NetworkId) => void
  sendMessage: (_text: string) => void
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

const MASTRA_API_URL = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"

/**
 * Convert Mastra `data-tool-*` or `data-network` parts to DynamicToolUIPart
 */
interface MastraPart {
  [key: string]: unknown
  type: string
  data?: unknown
  payload?: unknown

}

interface ToolData {
  toolCallId?: string
  id?: string
  callId?: string
  toolName?: string
  name?: string
  tool?: string
  agentName?: string
  input?: unknown
  args?: unknown
  params?: unknown
  output?: unknown
  result?: unknown
  value?: unknown
  errorText?: string
  error?: string
  state?: string
  status?: string
  data?: ToolData
}

interface NetworkAgentData {
  id?: string
  agentId?: string
  agent?: { id?: string; name?: string }
  name?: string
  agentName?: string
  input?: unknown
  args?: unknown
  params?: unknown
  output?: unknown
  result?: unknown
  value?: unknown
  state?: string
  status?: string
  startedAt?: string | number | Date
  completedAt?: string | number | Date
}

interface NetworkPayload {
  agents?: NetworkAgentData[]
  nodes?: NetworkAgentData[]
  steps?: NetworkAgentData[]
}

function mapDataPartToDynamicTool(part: MastraPart): DynamicToolUIPart | null {
  if (part === null || typeof part !== "object") {return null}

  const partType = part.type
  if (!partType?.startsWith("data-tool") && partType !== "data-network") {
    return null
  }

  const payload = (part.data ?? part.payload ?? part) as ToolData
  const inner = payload?.data ?? payload

  const toolCallId = inner?.toolCallId ?? inner?.id ?? inner?.callId ?? `tool-${Date.now()}`
  const toolName = inner?.toolName ?? inner?.name ?? inner?.tool ?? inner?.agentName ?? "network-step"
  const input = inner?.input ?? inner?.args ?? inner?.params
  const output = inner?.output ?? inner?.result ?? inner?.value
  const errorText = inner?.errorText ?? inner?.error
  const rawState = (inner?.state ?? inner?.status ?? "").toString().toLowerCase()

  let state: DynamicToolUIPart["state"] = "input-available"
  if ((Boolean(rawState.includes("stream"))) || (Boolean(rawState.includes("pending")))) {state = "input-streaming"}
  else if ((Boolean(rawState.includes("success"))) || (Boolean(rawState.includes("done"))) || (Boolean(rawState.includes("completed"))) || (Boolean(output))) {state = "output-available"}
  else if ((Boolean(rawState.includes("error"))) || (Boolean(rawState.includes("failed")))) {state = "output-error"}

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
  defaultNetwork = "agent-network",
}: NetworkProviderProps) {
  // Validate default network exists
  const validDefaultNetwork = NETWORK_CONFIGS[defaultNetwork] !== undefined ? defaultNetwork : Object.keys(NETWORK_CONFIGS)[0]
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkId>(validDefaultNetwork)
  const [routingSteps, setRoutingSteps] = useState<RoutingStep[]>([])
  const [progressEvents, setProgressEvents] = useState<ProgressEvent[]>([])
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [sources, setSources] = useState<Source[]>([])

  const networkConfig = useMemo(
    () => NETWORK_CONFIGS[selectedNetwork],
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
      api: `${MASTRA_API_URL}/network/${selectedNetwork}`,
      prepareSendMessagesRequest({ messages: msgs }) {
        const last = msgs[msgs.length - 1]
        const textPart = last?.parts?.find(
          (p): p is TextUIPart => p.type === "text"
        )

        return {
          body: {
            messages: msgs,
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
    if (aiError || (Boolean(networkError))) {return "error"}
    if (aiStatus === "streaming") {return "executing"}
    if (aiStatus === "submitted") {return "routing"}
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
    if (lastMessage?.role !== "assistant" || !lastMessage.parts?.length) {return []}

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
        if (converted) {result.push(converted)}
      }
    }
    return result
  }, [messages])

  // Extract sources from source-url parts
  useEffect(() => {
    const allSources: Source[] = []
    for (const message of messages) {
      if (message.role === "assistant" && message.parts !== null) {
        for (const part of message.parts) {
          if (part.type === "source-url") {
            const src: SourceUrlUIPart = part
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

  // Extract progress events from custom data parts
  useEffect(() => {
    const allProgressEvents: ProgressEvent[] = []
    for (const message of messages) {
      if (message.role === "assistant" && message.parts !== null) {
        for (const [partIndex, part] of message.parts.entries()) {
          // Handle agent and workflow progress events
          if (part.type === "data-tool-agent" || part.type === "data-tool-workflow") {
            const agentPart = part as { data: AgentDataPart }
            const eventData = agentPart.data

            if (eventData?.data?.text?.trim()) {
              allProgressEvents.push({
                id: `${message.id}-${part.type}-${partIndex}`,
                stage: part.type.replace("data-tool-", ""),
                status: "in-progress",
                message: eventData.data.text,
                agentId: eventData.id,
                timestamp: new Date(),
                data: eventData,
              })
            }
          }

          // Handle custom progress events from tools
          if (typeof part.type === "string" && part.type.startsWith("data-tool-progress")) {
            const progressPart = part as { type: string; data?: { status?: string; message?: string; stage?: string; agentId?: string } }
            const eventData = progressPart.data

            if (eventData?.status && (eventData.status === "in-progress" || eventData.status === "done" || eventData.status === "error")) {
              allProgressEvents.push({
                id: `${message.id}-${part.type}-${partIndex}`,
                stage: eventData.stage ?? "progress",
                status: eventData.status,
                message: eventData.message ?? `${part.type} ${eventData.status}`,
                agentId: eventData.agentId,
                timestamp: new Date(),
                data: eventData,
              })
            }
          }
        }
      }
    }
    setProgressEvents(allProgressEvents)
  }, [messages])

  // Extract routing steps from data-network parts
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role !== "assistant" || !lastMessage.parts?.length) {return}

    const dataParts = lastMessage.parts.filter(
      (p) => p.type === "data-network" || p.type === "dynamic-tool" || (typeof p.type === "string" && p.type.startsWith("data-tool-"))
    )
    if (!dataParts?.length) {return}

    // Helper: map raw state to routing step status
    const mapRawStateToStatus = (raw: unknown, hasOutput = false): RoutingStep["status"] => {
      const rs = (raw ?? "").toString().toLowerCase()
      if (rs.includes("stream") || rs.includes("running") || rs.includes("active")) {return "active"}
      if (rs.includes("success") || rs.includes("done") || rs.includes("completed") || hasOutput) {return "completed"}
      if (rs.includes("error") || rs.includes("failed")) {return "error"}
      return "pending"
    }

    // Prefer a data-network part that includes explicit per-agent details
    const networkPart = dataParts.find((p) => p.type === "data-network") as NetworkDataPart | undefined
    if (networkPart) {
      const payload = (networkPart as { data?: NetworkPayload; payload?: NetworkPayload }).data ?? (networkPart as { data?: NetworkPayload; payload?: NetworkPayload }).payload ?? networkPart as NetworkPayload
      const agentsFromPart = (payload?.agents ?? payload?.nodes ?? payload?.steps ?? [])

      if (Array.isArray(agentsFromPart) && agentsFromPart.length > 0) {
        const steps = agentsFromPart.map((agent, idx) => {
          const agentId = agent.id ?? agent.agentId ?? agent.agent?.id ?? `agent-${idx}`
          const agentName = agent.name ?? agent.agentName ?? agent.agent?.name ?? String(agentId)
          const input = agent.input ?? agent.args ?? agent.params ?? ""
          const output = agent.output ?? agent.result ?? agent.value
          const status = mapRawStateToStatus(agent.state ?? agent.status, Boolean(output))
          const startedAt = agent.startedAt !== null && agent.startedAt !== undefined ? new Date(agent.startedAt) : undefined
          const completedAt = agent.completedAt !== null && agent.completedAt !== undefined ? new Date(agent.completedAt) : undefined
          return {
            agentId: String(agentId),
            agentName: String(agentName),
            input,
            output,
            status,
            startedAt,
            completedAt,
          } as RoutingStep
        })
        setRoutingSteps(steps)
        return
      }
    }

    // Fallback: create steps from the network configuration (if available) or from dynamic-tool parts
    if (networkConfig?.agents?.length) {
      const steps: RoutingStep[] = networkConfig.agents.map((agent, index) => ({
        agentId: agent.id,
        agentName: agent.name,
        input: "",
        status: index === 0 && aiStatus === "streaming" ? "active" : "pending",
      }))
      setRoutingSteps(steps)
      return
    }

    const toolParts = dataParts.filter((p) => p.type === "dynamic-tool" || (typeof p.type === "string" && p.type.startsWith("data-tool-")))
    if (toolParts.length > 0) {
      const steps: RoutingStep[] = toolParts.map((tp, idx) => {
        const converted = mapDataPartToDynamicTool(tp as MastraPart)
        return {
          agentId: converted?.toolCallId ?? `tool-${idx}`,
          agentName: converted?.toolName ?? `tool-${idx}`,
          input: converted?.input ?? "",
          output: converted?.output ?? undefined,
          status: converted ? (converted.state === "input-streaming" ? "active" : (converted.state === "output-error" ? "error" : (converted.state === "output-available" ? "completed" : "pending"))) : "pending",
        } as RoutingStep
      })
      setRoutingSteps(steps)
    }
  }, [messages, networkConfig, aiStatus])

  const selectNetwork = useCallback((networkId: NetworkId) => {
    const config = getNetworkConfig(networkId)
    if (config) {
      setSelectedNetwork(networkId)
      setRoutingSteps([])
      setProgressEvents([])
      setNetworkError(null)
      setSources([])
    }
  }, [])

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) {return}
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
    setProgressEvents([])
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
      progressEvents,
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
      progressEvents,
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
