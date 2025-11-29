"use client"

import { Panel } from "@/src/components/ai-elements/panel"
import { useWorkflowContext } from "@/app/workflows/providers/workflow-context"
import {
  CircleIcon,
  CircleDotIcon,
  CheckCircle2Icon,
  ClockIcon,
} from "lucide-react"

function formatDuration(start: Date, end?: Date): string {
  const endTime = end ?? new Date()
  const diff = endTime.getTime() - start.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

export function WorkflowInfoPanel() {
  const { workflowConfig, workflowStatus, currentRun } = useWorkflowContext()

  if (!workflowConfig) return null

  const completedSteps = currentRun
    ? Object.values(currentRun.stepProgress).filter((s) => s.status === "completed").length
    : 0

  return (
    <Panel position="top-left" className="max-w-xs p-4">
      <h3 className="font-semibold text-sm">{workflowConfig.name}</h3>
      <p className="text-xs text-muted-foreground mt-1">
        {workflowConfig.description}
      </p>

      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <CircleIcon className="size-3" />
          <span>{workflowConfig.steps.length} steps</span>
        </div>

        {workflowStatus === "running" && (
          <div className="flex items-center gap-1">
            <CircleDotIcon className="size-3 text-yellow-500 animate-pulse" />
            <span className="text-yellow-500">Running</span>
          </div>
        )}

        {workflowStatus === "completed" && (
          <div className="flex items-center gap-1">
            <CheckCircle2Icon className="size-3 text-green-500" />
            <span className="text-green-500">Completed</span>
          </div>
        )}

        {workflowStatus === "idle" && (
          <div className="flex items-center gap-1">
            <CheckCircle2Icon className="size-3 text-green-500" />
            <span className="text-green-500">Ready</span>
          </div>
        )}

        {workflowStatus === "paused" && (
          <div className="flex items-center gap-1">
            <CircleDotIcon className="size-3 text-blue-500" />
            <span className="text-blue-500">Paused</span>
          </div>
        )}
      </div>

      {currentRun && (
        <div className="mt-3 pt-3 border-t space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {completedSteps}/{workflowConfig.steps.length} steps
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <ClockIcon className="size-3" />
              Duration
            </span>
            <span className="font-mono">
              {formatDuration(currentRun.startedAt, currentRun.completedAt)}
            </span>
          </div>
        </div>
      )}
    </Panel>
  )
}
