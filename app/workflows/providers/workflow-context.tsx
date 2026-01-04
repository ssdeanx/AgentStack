"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react"
import type { AgentDataPart } from "@mastra/ai-sdk"
import { getClientIdentity } from "@/lib/client-identity"
import {
  getWorkflowConfig,
  WORKFLOW_CONFIGS,
  type WorkflowConfig,
  type WorkflowId,
  type WorkflowStep,
} from "@/app/workflows/config/workflows"

export type WorkflowStatus = "idle" | "running" | "paused" | "completed" | "error"

export type StepStatus = "pending" | "running" | "completed" | "error" | "skipped"

export interface StepProgress {
  stepId: string
  status: StepStatus
  startedAt?: Date
  completedAt?: Date
  error?: string
  output?: unknown
}

export interface WorkflowProgressEvent {
  id: string
  stage: string
  status: "in-progress" | "done"
  message: string
  stepId?: string
  timestamp: Date
  data?: unknown
}

export interface WorkflowSuspendPayload {
  message: string
  requestId?: string
  stepId: string
  approved?: boolean
  approverName?: string
}

export interface WorkflowRun {
  id: string
  workflowId: string
  status: WorkflowStatus
  startedAt: Date
  completedAt?: Date
  stepProgress: Record<string, StepProgress>
  suspendPayload?: WorkflowSuspendPayload
  error?: string
}

export interface WorkflowDataPart {
  messageId: string
  partIndex: number
  part: {
    type: string
    data?: unknown
  }
}

/* eslint-disable no-unused-vars */
export interface WorkflowContextValue {
  selectedWorkflow: WorkflowId
  workflowConfig: WorkflowConfig | undefined
  workflowStatus: WorkflowStatus
  currentRun: WorkflowRun | null
  activeStepIndex: number
  progressEvents: WorkflowProgressEvent[]
  suspendPayload: WorkflowSuspendPayload | null
  dataParts: WorkflowDataPart[]
  selectWorkflow: (workflowId: WorkflowId) => void
  runWorkflow: (inputData?: Record<string, unknown>) => void
  pauseWorkflow: () => void
  resumeWorkflow: (resumeData?: { approved: boolean; approverName?: string }) => void
  stopWorkflow: () => void
  runStep: (stepId: string) => Promise<void>
  getStepStatus: (stepId: string) => StepStatus
  approveWorkflow: (approved: boolean, approverName?: string) => void
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  messages: ReturnType<typeof useChat>["messages"]
  streamingOutput: string
}


export interface WorkflowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    step: WorkflowStep
    stepIndex: number
    totalSteps: number
    status: StepStatus
    handles: { target: boolean; source: boolean }
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  type: "animated" | "temporary"
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkflowContext(): WorkflowContextValue {
  const context = useContext(WorkflowContext)
  if (!context) {
    throw new Error("useWorkflowContext must be used within a WorkflowProvider")
  }
  return context
}

export interface WorkflowProviderProps {
  children: ReactNode
  defaultWorkflow?: WorkflowId
}

const NODE_SPACING = 350
const MASTRA_API_URL = process.env.NEXT_PUBLIC_MASTRA_API_URL ?? "http://localhost:4111"

function buildWorkflowInputData(workflowId: string, inputText: string): Record<string, unknown> {
  // Map workflow IDs to their expected input schemas
  switch (workflowId) {
    case "weatherWorkflow":
      return { city: inputText }
    case "contentStudioWorkflow":
      return { topic: inputText }
    case "contentReviewWorkflow":
      return { content: inputText }
    case "documentProcessingWorkflow":
      return { documentPath: inputText }
    case "financialReportWorkflow":
      return { symbol: inputText }
    case "learningExtractionWorkflow":
      return { content: inputText }
    case "researchSynthesisWorkflow":
      return { topic: inputText }
    case "stockAnalysisWorkflow":
      return { symbol: inputText }
    case "telephoneGameWorkflow":
      return { message: inputText }
    case "changelogWorkflow":
      return { repository: inputText }
    default:
      return { input: inputText }
  }
}

function generateNodes(
  workflow: WorkflowConfig,
  stepProgress: Record<string, StepProgress>
): WorkflowNode[] {
  return workflow.steps.map((step, index) => ({
    id: step.id,
    type: "workflow",
    position: { x: index * NODE_SPACING, y: 0 },
    data: {
      step,
      stepIndex: index,
      totalSteps: workflow.steps.length,
      status: stepProgress[step.id]?.status ?? "pending",
      handles: {
        target: index > 0,
        source: index < workflow.steps.length - 1,
      },
    },
  }))
}

function generateEdges(
  workflow: WorkflowConfig,
  stepProgress: Record<string, StepProgress>
): WorkflowEdge[] {
  return workflow.steps.slice(0, -1).map((step, index) => {
    const nextStep = workflow.steps[index + 1]
    const currentStatus = stepProgress[step.id]?.status
    const isActive = currentStatus === "completed" || currentStatus === "running"

    return {
      id: `edge-${index}`,
      source: step.id,
      target: nextStep.id,
      type: isActive ? "animated" : ("temporary" as const),
    }
  })
}

function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function WorkflowProvider({
  children,
  defaultWorkflow = "contentStudioWorkflow",
}: WorkflowProviderProps) {
  const identity = useMemo(() => getClientIdentity(), [])

  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowId>(defaultWorkflow)
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("idle")
  const [currentRun, setCurrentRun] = useState<WorkflowRun | null>(null)
  const [activeStepIndex, setActiveStepIndex] = useState(-1)
  const [progressEvents, setProgressEvents] = useState<WorkflowProgressEvent[]>([])
  const [suspendPayload, setSuspendPayload] = useState<WorkflowSuspendPayload | null>(null)
  const [dataParts, setDataParts] = useState<WorkflowDataPart[]>([])

  const workflowConfig = useMemo(
    () => getWorkflowConfig(selectedWorkflow),
    [selectedWorkflow]
  )

  // useChat from @ai-sdk/react with DefaultChatTransport for workflow streaming
  const { messages, sendMessage, stop, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${MASTRA_API_URL}/workflow/${selectedWorkflow}`,
      prepareSendMessagesRequest({ messages: msgs }) {
        const last = msgs[msgs.length - 1]
        const textPart = last?.parts?.find(
          (p): p is { type: "text"; text: string } => p.type === "text"
        )

        const inputText = textPart?.text ?? ""

        // Build inputData based on workflow type
        const inputData = buildWorkflowInputData(selectedWorkflow, inputText)

        const metadata = (last as unknown as { metadata?: Record<string, unknown> })?.metadata
        const runId = typeof metadata?.runId === "string" ? metadata.runId : ""
        const hasRunId = runId.trim().length > 0

        return {
          body: {
            inputData,
            resourceId: identity.resourceId,
            ...(hasRunId ? { runId } : {}),
          },
        }
      },
    }),
  })

  // Extract streaming output from messages
  const streamingOutput = useMemo(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === "assistant") {
      const textPart = lastMessage.parts?.find((p) => p.type === "text")
      return textPart?.text ?? ""
    }
    return ""
  }, [messages])

  // Update workflow status based on chat status
  useEffect(() => {
    // Defer state updates to avoid synchronous setState inside effects which can
    // trigger cascading renders. Scheduling the update on the next tick keeps
    // the update asynchronous and allows cleanup if the effect re-runs.
    let timer: ReturnType<typeof setTimeout> | null = null

    if (status === "streaming" && workflowStatus !== "running") {
      timer = setTimeout(() => setWorkflowStatus("running"), 0)
    } else if (status === "ready" && workflowStatus === "running") {
      timer = setTimeout(() => setWorkflowStatus("completed"), 0)
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [status, workflowStatus])

  // Extract progress events and data parts from custom data parts
  useEffect(() => {
    const allProgressEvents: WorkflowProgressEvent[] = []
    const allDataParts: WorkflowDataPart[] = []
    let detectedSuspendPayload: WorkflowSuspendPayload | null = null

    for (const message of messages) {
      if (message.role === "assistant" && message.parts !== null) {
        for (const [partIndex, part] of message.parts.entries()) {
          // Collect all data parts for custom component rendering
          if (typeof part.type === "string" && part.type.startsWith("data-")) {
            allDataParts.push({
              messageId: message.id,
              partIndex,
              part,
            })
          }

          // Handle workflow progress events (data-workflow, data-tool-workflow)
          if (part.type === "data-workflow" || part.type === "data-tool-workflow") {
            const workflowPart = part as { data?: { text?: string; status?: string; stepId?: string } }
            const eventData = workflowPart.data

            if (eventData && eventData.text !== null && typeof eventData.text === "string" && eventData.text.trim()) {
              allProgressEvents.push({
                id: `${message.id}-${part.type}-${partIndex}`,
                stage: part.type.replace("data-", "").replace("-tool-", " "),
                status: "in-progress",
                message: eventData.text,
                stepId: eventData.stepId,
                timestamp: new Date(),
                data: eventData,
              })
            }
          }

          // Handle network aggregation events (data-network)
          if (part.type === "data-network") {
            const networkPart = part as { data?: { text?: string; status?: string; networkId?: string } }
            const eventData = networkPart.data

            if (eventData && eventData.text !== null && typeof eventData.text === "string" && eventData.text.trim()) {
              allProgressEvents.push({
                id: `${message.id}-${part.type}-${partIndex}`,
                stage: "network",
                status: "in-progress",
                message: eventData.text,
                stepId: eventData.networkId,
                timestamp: new Date(),
                data: eventData,
              })
            }
          }

          // Handle legacy tool agent events (data-tool-agent) by normalizing into progress events
          if (part.type === "data-tool-agent") {
            const agentPart = part as { data?: AgentDataPart }
            const eventData = agentPart.data as Record<string, unknown> | undefined
            const dataObj = eventData?.data as Record<string, unknown> | undefined
            const msg = typeof dataObj?.text === 'string' ? dataObj.text : (typeof dataObj?.message === 'string' ? dataObj.message : (typeof eventData?.message === 'string' ? eventData.message : `Agent executing tool`))
            const stage = typeof eventData?.stage === 'string' ? eventData.stage : 'tool agent'

            if (msg && msg.trim().length > 0) {
              allProgressEvents.push({
                id: `${message.id}-${part.type}-${partIndex}`,
                stage: String(stage),
                status: 'in-progress',
                message: msg,
                timestamp: new Date(),
                data: eventData,
              })
            }
          }

          // Handle nested workflow events (data-tool-workflow)
          if (part.type === "data-tool-workflow") {
            const nestedWorkflowPart = part as { data?: { text?: string; status?: string; workflowId?: string } }
            const eventData = nestedWorkflowPart.data

            if (eventData && eventData.text !== null && typeof eventData.text === "string" && eventData.text.trim()) {
              allProgressEvents.push({
                id: `${message.id}-${part.type}-${partIndex}`,
                stage: "nested workflow",
                status: "in-progress",
                message: eventData.text,
                stepId: eventData.workflowId,
                timestamp: new Date(),
                data: eventData,
              })
            }
          }

          // Handle nested network events (data-tool-network)
          if (part.type === "data-tool-network") {
            const nestedNetworkPart = part as { data?: { text?: string; status?: string; networkId?: string } }
            const eventData = nestedNetworkPart.data

            if (eventData && eventData.text !== null && typeof eventData.text === "string" && eventData.text.trim()) {
              allProgressEvents.push({
                id: `${message.id}-${part.type}-${partIndex}`,
                stage: "nested network",
                status: "in-progress",
                message: eventData.text,
                stepId: eventData.networkId,
                timestamp: new Date(),
                data: eventData,
              })
            }
          }

          // Handle suspend payloads (data-workflow-suspend)
          if (part.type === "data-workflow-suspend") {
            const suspendPart = part as { data?: { message?: string; requestId?: string; stepId?: string } }
            const suspendData = suspendPart.data

            if (suspendData?.message !== null && suspendData?.message !== undefined &&
                suspendData?.stepId !== null && suspendData?.stepId !== undefined) {
              detectedSuspendPayload = {
                message: suspendData.message,
                requestId: suspendData.requestId,
                stepId: suspendData.stepId,
              }
            }
          }

          // Handle custom progress events from workflow steps
          if (typeof part.type === "string" && part.type.startsWith("data-workflow-progress")) {
            const progressPart = part as { type: string; data?: { status?: string; message?: string; stage?: string; stepId?: string } }
            const eventData = progressPart.data

            if (eventData && eventData.status !== null && typeof eventData.status === "string" &&
                (eventData.status === "in-progress" || eventData.status === "done" || eventData.status === "error" || eventData.status === "pending")) {
              const normalizedStatus: WorkflowProgressEvent["status"] =
                eventData.status === 'in-progress' ? 'in-progress' : 'done'
              allProgressEvents.push({
                id: `${message.id}-${part.type}-${partIndex}`,
                stage: eventData.stage ?? "workflow",
                status: normalizedStatus,
                message: eventData.message ?? `${part.type} ${eventData.status}`,
                stepId: eventData.stepId,
                timestamp: new Date(),
                data: eventData,
              })
            }
          }

          // Handle custom tool progress events
          if (typeof part.type === "string" && part.type.startsWith("data-tool-progress")) {
            const toolProgressPart = part as { type: string; data?: { status?: string; message?: string; stage?: string } }
            const eventData = toolProgressPart.data

            if (eventData && eventData.status !== null && typeof eventData.status === "string") {
              const stage = eventData.stage ?? "tool"
              const normalizedStatus: WorkflowProgressEvent["status"] =
                eventData.status === 'in-progress' || eventData.status === 'pending' ? 'in-progress' : 'done'
              allProgressEvents.push({
                id: `${message.id}-${part.type}-${partIndex}`,
                stage,
                status: normalizedStatus,
                message: eventData.message ?? `${stage} ${eventData.status}`,
                stepId: stage,
                timestamp: new Date(),
                data: eventData,
              })
            }
          }
        }
      }
    }

    // Defer setting state to next tick to avoid cascading renders from sync setState in effects.
    const timer = setTimeout(() => {
      setProgressEvents(allProgressEvents)
      setDataParts(allDataParts)
      // Always update suspendPayload so it's cleared when not present.
      setSuspendPayload(detectedSuspendPayload ?? null)
    }, 0)

    return () => {
      clearTimeout(timer)
    }
  }, [messages])

  const selectWorkflow = useCallback((workflowId: WorkflowId) => {
    if (WORKFLOW_CONFIGS[workflowId] !== undefined) {
      setSelectedWorkflow(workflowId)
      setWorkflowStatus("idle")
      setCurrentRun(null)
      setActiveStepIndex(-1)
      setProgressEvents([])
      setSuspendPayload(null)
      setDataParts([])
    }
  }, [])

  const runWorkflow = useCallback(
    (inputData?: Record<string, unknown>) => {
      if (!workflowConfig) {return}

      const run: WorkflowRun = {
        id: generateRunId(),
        workflowId: selectedWorkflow,
        status: "running",
        startedAt: new Date(),
        stepProgress: {},
      }

      setCurrentRun(run)
      setWorkflowStatus("running")
      setActiveStepIndex(0)
      setProgressEvents([]) // Clear previous progress events
      setSuspendPayload(null) // Clear any previous suspend state
      setDataParts([]) // Clear previous data parts

      // Send message to trigger workflow via AI SDK
      const inputText = inputData?.input?.toString() ?? `Run ${workflowConfig.name}`
      sendMessage({
        text: inputText,
        // AI SDK v5 supports message metadata; we use it to pass runId through prepareSendMessagesRequest.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: { runId: run.id } as any,
      })
    },
    [workflowConfig, selectedWorkflow, sendMessage]
  )

  const pauseWorkflow = useCallback(() => {
    if (workflowStatus === "running") {
      stop()
      setWorkflowStatus("paused")
      setCurrentRun((prev) =>
        prev ? { ...prev, status: "paused" } : null
      )
    }
  }, [workflowStatus, stop])

  const resumeWorkflow = useCallback((resumeData?: { approved: boolean; approverName?: string }) => {
    if (workflowStatus === "paused" && workflowConfig) {
      setWorkflowStatus("running")
      setCurrentRun((prev) =>
        prev ? { ...prev, status: "running" } : null
      )
      setSuspendPayload(null)
      const runId = currentRun?.id
      const hasRunId = typeof runId === 'string' && runId.trim().length > 0

      sendMessage({
        text: resumeData ? `resume ${JSON.stringify(resumeData)}` : "resume",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (hasRunId ? { runId } : {}) as any,
      })
    }
  }, [workflowStatus, workflowConfig, sendMessage, currentRun?.id])

  const approveWorkflow = useCallback((approved: boolean, approverName?: string) => {
    if (suspendPayload) {
      const resumeData = { approved, approverName: approverName ?? "User" }
      resumeWorkflow(resumeData)
    }
  }, [suspendPayload, resumeWorkflow])

  const stopWorkflow = useCallback(() => {
    stop()
    setWorkflowStatus("idle")
    setCurrentRun(null)
    setActiveStepIndex(-1)
    setProgressEvents([])
    setSuspendPayload(null)
    setDataParts([])
  }, [stop])

  const runStep = useCallback(
    async (stepId: string) => {
      if (!workflowConfig) {return}

      const stepIndex = workflowConfig.steps.findIndex((s) => s.id === stepId)
      if (stepIndex === -1) {return}

      setActiveStepIndex(stepIndex)

      setCurrentRun((prev) => {
        const base = prev ?? {
          id: generateRunId(),
          workflowId: selectedWorkflow,
          status: "running" as const,
          startedAt: new Date(),
          stepProgress: {},
        }
        return {
          ...base,
          stepProgress: {
            ...base.stepProgress,
            [stepId]: {
              stepId,
              status: "running",
              startedAt: new Date(),
            },
          },
        }
      })

      // Simulate single step execution
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setCurrentRun((prev) =>
        prev
          ? {
              ...prev,
              stepProgress: {
                ...prev.stepProgress,
                [stepId]: {
                  stepId,
                  status: "completed",
                  startedAt: prev.stepProgress[stepId]?.startedAt,
                  completedAt: new Date(),
                },
              },
            }
          : null
      )
    },
    [workflowConfig, selectedWorkflow]
  )

  const getStepStatus = useCallback(
    (stepId: string): StepStatus => {
      return currentRun?.stepProgress[stepId]?.status ?? "pending"
    },
    [currentRun]
  )

  const nodes = useMemo(() => {
    if (!workflowConfig) {return []}
    return generateNodes(workflowConfig, currentRun?.stepProgress ?? {})
  }, [workflowConfig, currentRun?.stepProgress])

  const edges = useMemo(() => {
    if (!workflowConfig) {return []}
    return generateEdges(workflowConfig, currentRun?.stepProgress ?? {})
  }, [workflowConfig, currentRun?.stepProgress])

  const value = useMemo<WorkflowContextValue>(
    () => ({
      selectedWorkflow,
      workflowConfig,
      workflowStatus,
      currentRun,
      activeStepIndex,
      progressEvents,
      suspendPayload,
      dataParts,
      selectWorkflow,
      runWorkflow,
      pauseWorkflow,
      resumeWorkflow,
      stopWorkflow,
      runStep,
      getStepStatus,
      approveWorkflow,
      nodes,
      edges,
      messages,
      streamingOutput,
    }),
    [
      selectedWorkflow,
      workflowConfig,
      workflowStatus,
      currentRun,
      activeStepIndex,
      progressEvents,
      suspendPayload,
      dataParts,
      selectWorkflow,
      runWorkflow,
      pauseWorkflow,
      resumeWorkflow,
      stopWorkflow,
      runStep,
      getStepStatus,
      approveWorkflow,
      nodes,
      edges,
      messages,
      streamingOutput,
    ]
  )

  return (
    <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>
  )
}
