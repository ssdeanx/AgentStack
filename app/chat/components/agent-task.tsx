"use client"

import {
  Task,
  TaskTrigger,
  TaskContent,
  TaskItem,
  TaskItemFile,
} from "@/src/components/ai-elements/task"
import { Badge } from "@/ui/badge"
import {
  CheckCircle2Icon,
  CircleDotIcon,
  CircleIcon,
  AlertCircleIcon,
  FileIcon,
} from "lucide-react"

export type TaskStepStatus = "pending" | "running" | "completed" | "error"

export interface TaskStep {
  id: string
  text: string
  status: TaskStepStatus
  file?: {
    name: string
    icon?: string
  }
}

export interface AgentTaskData {
  title: string
  steps: TaskStep[]
}

interface AgentTaskProps {
  task: AgentTaskData
  defaultOpen?: boolean
}

function StepIcon({ status }: { status: TaskStepStatus }) {
  switch (status) {
    case "completed":
      return <CheckCircle2Icon className="size-4 text-green-500 shrink-0" />
    case "running":
      return <CircleDotIcon className="size-4 text-yellow-500 animate-pulse shrink-0" />
    case "error":
      return <AlertCircleIcon className="size-4 text-red-500 shrink-0" />
    default:
      return <CircleIcon className="size-4 text-muted-foreground shrink-0" />
  }
}

export function AgentTask({ task, defaultOpen = true }: AgentTaskProps) {
  const completedCount = task.steps.filter((s) => s.status === "completed").length
  const hasError = task.steps.some((s) => s.status === "error")
  const isRunning = task.steps.some((s) => s.status === "running")

  return (
    <Task defaultOpen={defaultOpen}>
      <TaskTrigger title={task.title}>
        <Badge
          variant={
            hasError
              ? "destructive"
              : isRunning
                ? "secondary"
                : completedCount === task.steps.length
                  ? "default"
                  : "outline"
          }
          className="text-xs ml-auto"
        >
          {completedCount}/{task.steps.length}
        </Badge>
      </TaskTrigger>
      <TaskContent>
        {task.steps.map((step) => (
          <TaskItem key={step.id}>
            <div className="flex items-start gap-2 w-full">
              <StepIcon status={step.status} />
              <div className="flex-1 min-w-0">
                <span
                  className={
                    step.status === "completed"
                      ? "text-muted-foreground line-through"
                      : step.status === "running"
                        ? "font-medium"
                        : ""
                  }
                >
                  {step.text}
                </span>
                {step.file && (
                  <TaskItemFile>
                    <FileIcon className="size-3" />
                    <span className="text-xs">{step.file.name}</span>
                  </TaskItemFile>
                )}
              </div>
            </div>
          </TaskItem>
        ))}
      </TaskContent>
    </Task>
  )
}
