"use client"

import Link from "next/link"
import { Button } from "@/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/ui/select"
import { Badge } from "@/ui/badge"
import { useWorkflowContext } from "@/app/workflows/providers/workflow-context"
import {
  WORKFLOW_CONFIGS,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getWorkflowsByCategory,
} from "@/app/workflows/config/workflows"
import {
  ArrowLeftIcon,
  PauseIcon,
  SquareIcon,
  RefreshCwIcon,
  WorkflowIcon,
  AlertCircleIcon,
  RotateCcwIcon,
} from "lucide-react"
import { useMemo } from "react"

export function WorkflowHeader() {
  const {
    selectedWorkflow,
    selectWorkflow,
    workflowStatus,
    pauseWorkflow,
    resumeWorkflow,
    stopWorkflow,
  } = useWorkflowContext()

  const workflowsByCategory = useMemo(() => getWorkflowsByCategory(), [])

  const isWorkflowActive = workflowStatus === "running" || workflowStatus === "paused"

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="size-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-3">
          <WorkflowIcon className="size-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold">Workflow Visualization</h1>
            <p className="text-sm text-muted-foreground">
              Interactive view of {Object.keys(WORKFLOW_CONFIGS).length} Mastra workflows
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={selectedWorkflow}
          onValueChange={(value) => selectWorkflow(value)}
          disabled={isWorkflowActive}
        >
          <SelectTrigger className="w-70">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_ORDER.map((category) => {
              const workflows = workflowsByCategory[category]
              if (workflows.length === 0) {return null}

              return (
                <SelectGroup key={category}>
                  <SelectLabel>{CATEGORY_LABELS[category]}</SelectLabel>
                  {workflows.map((wf) => (
                    <SelectItem key={wf.id} value={wf.id}>
                      <div className="flex items-center gap-2">
                        <span>{wf.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {wf.steps.length} steps
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            })}
          </SelectContent>
        </Select>

        {/* Status indicators */}
        {workflowStatus === "running" && (
          <Badge variant="outline" className="gap-1.5 text-yellow-600 border-yellow-300 dark:text-yellow-400">
            <RefreshCwIcon className="size-3 animate-spin" />
            Running
          </Badge>
        )}

        {workflowStatus === "paused" && (
          <Badge variant="outline" className="gap-1.5 text-blue-600 border-blue-300 dark:text-blue-400">
            <PauseIcon className="size-3" />
            Paused
          </Badge>
        )}

        {workflowStatus === "completed" && (
          <Badge variant="outline" className="gap-1.5 text-green-600 border-green-300 dark:text-green-400">
            Completed
          </Badge>
        )}

        {workflowStatus === "error" && (
          <Badge variant="outline" className="gap-1.5 text-red-600 border-red-300 dark:text-red-400">
            <AlertCircleIcon className="size-3" />
            Error
          </Badge>
        )}

        {/* Action buttons */}
        {isWorkflowActive && (
          <div className="flex items-center gap-2">
            {workflowStatus === "running" ? (
              <Button variant="outline" size="sm" onClick={pauseWorkflow}>
                <PauseIcon className="size-4 mr-1" />
                Pause
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => resumeWorkflow()}>
                <RefreshCwIcon className="size-4 mr-1" />
                Resume
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={stopWorkflow} title="Stop workflow">
              <SquareIcon className="size-4" />
            </Button>
          </div>
        )}

        {/* Reset button after completion or error */}
        {(workflowStatus === "completed" || workflowStatus === "error") && (
          <Button variant="outline" size="sm" onClick={stopWorkflow} title="Reset workflow">
            <RotateCcwIcon className="size-4 mr-1" />
            Reset
          </Button>
        )}
      </div>
    </header>
  )
}
