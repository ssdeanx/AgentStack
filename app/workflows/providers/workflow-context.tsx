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

export interface WorkflowRun {
  id: string
  workflowId: string
  status: WorkflowStatus
  startedAt: Date
  completedAt?: Date
  stepProgress: Record<string, StepProgress>
  error?: string
}

export interface WorkflowContextValue {
  selectedWorkflow: WorkflowId
  workflowConfig: WorkflowConfig | undefined
  workflowStatus: WorkflowStatus
  currentRun: WorkflowRun | null
  activeStepIndex: number
  selectWorkflow: (workflowId: WorkflowId) => void
  runWorkflow: (inputData?: Record<string, unknown>) => void
  pauseWorkflow: () => void
  resumeWorkflow: () => void
  stopWorkflow: () => void
  runStep: (stepId: string) => Promise<void>
  getStepStatus: (stepId: string) => StepStatus
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
const MASTRA_API_URL = process.env.NEXT_PUBLIC_MASTRA_API_URL || "http://localhost:4111"

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
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowId>(defaultWorkflow)
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("idle")
  const [currentRun, setCurrentRun] = useState<WorkflowRun | null>(null)
  const [activeStepIndex, setActiveStepIndex] = useState(-1)

  const workflowConfig = useMemo(
    () => getWorkflowConfig(selectedWorkflow),
    [selectedWorkflow]
  )

  // useChat from @ai-sdk/react with DefaultChatTransport for workflow streaming
  const { messages, sendMessage, stop, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${MASTRA_API_URL}/workflow/${selectedWorkflow}`,
      prepareSendMessagesRequest({ messages }) {
        const last = messages[messages.length - 1]
        const textPart = last?.parts?.find(
          (p): p is { type: "text"; text: string } => p.type === "text"
        )

        const inputText = textPart?.text ?? ""

        // Build inputData based on workflow type
        const inputData = buildWorkflowInputData(selectedWorkflow, inputText)

        return {
          body: {
            inputData,
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
  useMemo(() => {
    if (status === "streaming") {
      setWorkflowStatus("running")
    } else if (status === "ready" && workflowStatus === "running") {
      setWorkflowStatus("completed")
    }
  }, [status, workflowStatus])

  const selectWorkflow = useCallback((workflowId: WorkflowId) => {
    if (WORKFLOW_CONFIGS[workflowId]) {
      setSelectedWorkflow(workflowId)
      setWorkflowStatus("idle")
      setCurrentRun(null)
      setActiveStepIndex(-1)
    }
  }, [])

  const runWorkflow = useCallback(
    (inputData?: Record<string, unknown>) => {
      if (!workflowConfig) return

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

      // Send message to trigger workflow via AI SDK
      const inputText = inputData?.input?.toString() ?? `Run ${workflowConfig.name}`
      sendMessage({ text: inputText })
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

  const resumeWorkflow = useCallback(() => {
    if (workflowStatus === "paused" && workflowConfig) {
      setWorkflowStatus("running")
      setCurrentRun((prev) =>
        prev ? { ...prev, status: "running" } : null
      )
      sendMessage({ text: "resume" })
    }
  }, [workflowStatus, workflowConfig, sendMessage])

  const stopWorkflow = useCallback(() => {
    stop()
    setWorkflowStatus("idle")
    setCurrentRun(null)
    setActiveStepIndex(-1)
  }, [stop])

  const runStep = useCallback(
    async (stepId: string) => {
      if (!workflowConfig) return

      const stepIndex = workflowConfig.steps.findIndex((s) => s.id === stepId)
      if (stepIndex === -1) return

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
    if (!workflowConfig) return []
    return generateNodes(workflowConfig, currentRun?.stepProgress ?? {})
  }, [workflowConfig, currentRun?.stepProgress])

  const edges = useMemo(() => {
    if (!workflowConfig) return []
    return generateEdges(workflowConfig, currentRun?.stepProgress ?? {})
  }, [workflowConfig, currentRun?.stepProgress])

  const value = useMemo<WorkflowContextValue>(
    () => ({
      selectedWorkflow,
      workflowConfig,
      workflowStatus,
      currentRun,
      activeStepIndex,
      selectWorkflow,
      runWorkflow,
      pauseWorkflow,
      resumeWorkflow,
      stopWorkflow,
      runStep,
      getStepStatus,
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
      selectWorkflow,
      runWorkflow,
      pauseWorkflow,
      resumeWorkflow,
      stopWorkflow,
      runStep,
      getStepStatus,
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
