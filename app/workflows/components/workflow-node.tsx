"use client"

import {
  Node,
  NodeContent,
  NodeDescription,
  NodeFooter,
  NodeHeader,
  NodeTitle,
} from "@/src/components/ai-elements/node"
import { Toolbar } from "@/src/components/ai-elements/toolbar"
import { Button } from "@/ui/button"
import { Badge } from "@/ui/badge"
import { useWorkflowContext, type StepStatus } from "@/app/workflows/providers/workflow-context"
import type { WorkflowStep } from "@/app/workflows/config/workflows"
import {
  InfoIcon,
  PlayIcon,
  CheckCircle2Icon,
  CircleIcon,
  CircleDotIcon,
  AlertCircleIcon,
  SkipForwardIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkflowNodeData {
  step: WorkflowStep
  stepIndex: number
  totalSteps: number
  status: StepStatus
  handles: { target: boolean; source: boolean }
}

interface WorkflowNodeProps {
  data: WorkflowNodeData
}

function getStatusIcon(status: StepStatus) {
  switch (status) {
    case "completed":
      return <CheckCircle2Icon className="size-3 text-green-500" />
    case "running":
      return <CircleDotIcon className="size-3 text-yellow-500 animate-pulse" />
    case "error":
      return <AlertCircleIcon className="size-3 text-red-500" />
    case "skipped":
      return <SkipForwardIcon className="size-3 text-muted-foreground" />
    case "pending": { throw new Error('Not implemented yet: "pending" case') }
    default:
      return <CircleIcon className="size-3 text-muted-foreground" />
  }
}

function getStatusBadgeVariant(status: StepStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default"
    case "running":
      return "secondary"
    case "error":
      return "destructive"
    case "pending": { throw new Error('Not implemented yet: "pending" case') }
    case "skipped": { throw new Error('Not implemented yet: "skipped" case') }
    default:
      return "outline"
  }
}

export function WorkflowNode({ data }: WorkflowNodeProps) {
  const { runStep, workflowStatus } = useWorkflowContext()
  const { step, stepIndex, totalSteps, status, handles } = data

  const canRunStep = workflowStatus === "idle" || workflowStatus === "completed"

  const handleRunStep = () => {
    if (canRunStep) {
      runStep(step.id)
    }
  }

  return (
    <Node
      handles={handles}
      className={cn(
        "w-[280px] transition-all",
        status === "running" && "ring-2 ring-yellow-500/50",
        status === "completed" && "ring-2 ring-green-500/50",
        status === "error" && "ring-2 ring-red-500/50"
      )}
    >
      <NodeHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {getStatusIcon(status)}
            <NodeTitle className="text-sm font-semibold">{step.label}</NodeTitle>
          </div>
          <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
            {stepIndex + 1}/{totalSteps}
          </Badge>
        </div>
        <NodeDescription className="text-xs">{step.description}</NodeDescription>
      </NodeHeader>

      <NodeContent>
        <p className="text-sm text-muted-foreground">{step.content}</p>
      </NodeContent>

      <NodeFooter>
        <p className="text-muted-foreground text-xs font-mono">{step.footer}</p>
      </NodeFooter>

      <Toolbar>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          title="View step details"
        >
          <InfoIcon className="size-3 mr-1" />
          Details
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={handleRunStep}
          disabled={!canRunStep || status === "running"}
          title="Run this step"
        >
          <PlayIcon className="size-3 mr-1" />
          Run Step
        </Button>
      </Toolbar>
    </Node>
  )
}

export const workflowNodeTypes = {
  workflow: WorkflowNode,
}
