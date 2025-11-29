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
  type WorkflowId,
} from "@/app/workflows/config/workflows"
import {
  ArrowLeftIcon,
  PlayIcon,
  PauseIcon,
  SquareIcon,
  RefreshCwIcon,
  WorkflowIcon,
} from "lucide-react"
import { useMemo } from "react"

export function WorkflowHeader() {
  const {
    selectedWorkflow,
    selectWorkflow,
    workflowConfig,
    workflowStatus,
    runWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    stopWorkflow,
  } = useWorkflowContext()

  const workflowsByCategory = useMemo(() => getWorkflowsByCategory(), [])

  const handleRunClick = () => {
    if (workflowStatus === "idle" || workflowStatus === "completed") {
      runWorkflow()
    } else if (workflowStatus === "running") {
      pauseWorkflow()
    } else if (workflowStatus === "paused") {
      resumeWorkflow()
    }
  }

  const renderRunButton = () => {
    switch (workflowStatus) {
      case "running":
        return (
          <>
            <RefreshCwIcon className="size-4 mr-2 animate-spin" />
            Running...
          </>
        )
      case "paused":
        return (
          <>
            <PlayIcon className="size-4 mr-2" />
            Resume
          </>
        )
      case "completed":
        return (
          <>
            <RefreshCwIcon className="size-4 mr-2" />
            Run Again
          </>
        )
      default:
        return (
          <>
            <PlayIcon className="size-4 mr-2" />
            Run Workflow
          </>
        )
    }
  }

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
          onValueChange={(value) => selectWorkflow(value as WorkflowId)}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_ORDER.map((category) => {
              const workflows = workflowsByCategory[category]
              if (workflows.length === 0) return null

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

        <Button
          onClick={handleRunClick}
          disabled={workflowStatus === "error"}
        >
          {renderRunButton()}
        </Button>

        {(workflowStatus === "running" || workflowStatus === "paused") && (
          <Button variant="outline" size="icon" onClick={stopWorkflow}>
            <SquareIcon className="size-4" />
          </Button>
        )}
      </div>
    </header>
  )
}
