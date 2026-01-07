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
  Settings2Icon,
  Maximize2Icon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { memo } from "react"
import { NodeResizer, NodeToolbar, Position } from "@xyflow/react"

interface WorkflowNodeData {
  step: WorkflowStep
  stepIndex: number
  totalSteps: number
  status: StepStatus
  handles: { target: boolean; source: boolean }
}

interface WorkflowNodeProps {
  data: WorkflowNodeData
  selected?: boolean
}

function getStatusIcon(status: StepStatus) {
  switch (status) {
    case "completed":
      return <CheckCircle2Icon className="size-3 text-green-500" />
    case "running":
      return <CircleDotIcon className="size-3 text-amber-500 animate-pulse" />
    case "error":
      return <AlertCircleIcon className="size-3 text-red-500" />
    case "skipped":
      return <SkipForwardIcon className="size-3 text-muted-foreground" />
    case "pending":
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
    case "skipped":
    case "pending":
    default:
      return "outline"
  }
}

export const WorkflowNode = memo(({ data, selected }: WorkflowNodeProps) => {
  const { runStep, workflowStatus, progressEvents } = useWorkflowContext()
  const { step, stepIndex, totalSteps, status, handles } = data

  const canRunStep = workflowStatus === "idle" || workflowStatus === "completed"

  // Get streaming text for this step
  const stepStreamingEvents = progressEvents.filter(event =>
    event.stepId === step.id && event.status === "in-progress"
  )

  const handleRunStep = () => {
    if (canRunStep) {
      runStep(step.id)
    }
  }

  return (
    <>
      <NodeResizer
        minWidth={280}
        minHeight={150}
        isVisible={selected}
        lineClassName="border-primary"
        handleClassName="h-3 w-3 bg-white border-2 border-primary rounded"
      />

      <NodeToolbar
        isVisible={selected}
        position={Position.Top}
        className="flex gap-1 p-1 bg-background/95 backdrop-blur border rounded-md shadow-lg"
      >
        <Button variant="ghost" size="icon-sm" className="h-6 w-6 p-0">
          <Settings2Icon className="size-3" />
        </Button>
        <Button variant="ghost" size="icon-sm" className="h-6 w-6 p-0">
          <Maximize2Icon className="size-3" />
        </Button>
      </NodeToolbar>

      <div className="card-3d group">
        <Node
          handles={handles}
          className={cn(
            "w-70 h-full transition-all card-3d-inner bg-card/40 backdrop-blur-xl border-border/50 shadow-2xl overflow-hidden",
            selected && "border-primary/50 ring-1 ring-primary/20",
            status === "running" && "ring-2 ring-amber-500/50 glow-amber animate-ambient-pulse",
            status === "completed" && "ring-1 ring-green-500/30",
            status === "error" && "ring-2 ring-red-500/50"
          )}
        >
          <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

          <NodeHeader className="border-b border-border/10 bg-muted/20">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {getStatusIcon(status)}
                <NodeTitle className="text-sm font-bold tracking-tight uppercase opacity-80">{step.label}</NodeTitle>
              </div>
              <Badge variant={getStatusBadgeVariant(status)} className="text-[10px] h-4 px-1.5 font-mono">
                {stepIndex + 1}/{totalSteps}
              </Badge>
            </div>
            <NodeDescription className="text-[11px] leading-tight opacity-60 italic">{step.description}</NodeDescription>
          </NodeHeader>

          <NodeContent className="py-3">
            <p className="text-xs font-medium text-foreground/80 leading-relaxed mb-2">{step.content}</p>

            {/* Show streaming agent text when step is running */}
            {status === "running" && stepStreamingEvents.length > 0 && (
              <div className="mt-2 p-2 bg-amber-500/5 dark:bg-amber-400/5 rounded border border-amber-500/20 backdrop-blur-sm shadow-inner overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-amber-500/50 to-transparent" />
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    Agent Thinking
                  </span>
                </div>
                <div className="text-[11px] font-mono text-amber-700/90 dark:text-amber-300/90 max-h-24 overflow-y-auto custom-scrollbar">
                  {stepStreamingEvents.map((event, idx) => (
                    <div key={idx} className="mb-1 last:mb-0 typing-effect">
                      {event.message}
                      <span className="inline-block w-1.5 h-3 bg-amber-500/50 animate-pulse ml-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </NodeContent>

          <NodeFooter className="border-t border-border/10 bg-muted/5 py-1.5">
            <div className="flex items-center justify-between w-full">
              <p className="text-[10px] text-muted-foreground/60 font-mono tracking-tighter">
                {step.footer}
              </p>
              {status === "completed" && (
                <CheckCircle2Icon className="size-2.5 text-green-500/50" />
              )}
            </div>
          </NodeFooter>

          <Toolbar className="bg-background/40 backdrop-blur border-t border-border/20 p-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 flex-1 text-[10px] opacity-70 hover:opacity-100 transition-opacity"
              title="View step details"
            >
              <InfoIcon className="size-3 mr-1" />
              DETAILS
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className={cn(
                "h-6 flex-1 text-[10px] font-bold transition-all",
                status === "completed" && "bg-green-500/10 text-green-600 hover:bg-green-500/20",
                status === "running" && "bg-amber-500/10 text-amber-600 animate-pulse"
              )}
              onClick={handleRunStep}
              disabled={!canRunStep || status === "running"}
            >
              <PlayIcon className="size-3 mr-1" />
              RUN
            </Button>
          </Toolbar>
        </Node>
      </div>
    </>
  )
})

WorkflowNode.displayName = "WorkflowNode"

export const workflowNodeTypes = {
  workflow: WorkflowNode,
}
