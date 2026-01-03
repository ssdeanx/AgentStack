"use client"

import { useMemo } from "react"
import {
  Queue,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionLabel,
  QueueSectionContent,
  QueueList,
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
  QueueItemDescription,
  QueueItemActions,
  QueueItemAction,
} from "@/src/components/ai-elements/queue"
import { Badge } from "@/ui/badge"
import {
  EyeIcon,
  TrashIcon,
  RefreshCwIcon,
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Loader2Icon,
} from "lucide-react"
import { cn } from "@/lib/utils"

import type { QueuedTask } from "./chat.types"

interface AgentQueueProps {
  tasks: QueuedTask[]
  onView?: (taskId: string) => void
  onRetry?: (taskId: string) => void
  onDelete?: (taskId: string) => void
  className?: string
}

function formatRelativeTime(date: Date): string {
  if (date === null || isNaN(date.getTime())) { return "unknown" }
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  if (diffMs < 0) { return "in the future" }
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) {return "just now"}
  if (diffMins < 60) {return `${diffMins}m ago`}
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) {return `${diffHours}h ago`}
  return `${Math.floor(diffHours / 24)}d ago`
}

interface TaskSectionProps {
  title: string
  tasks: QueuedTask[]
  icon?: React.ReactNode
  defaultOpen?: boolean
  variant?: "default" | "success" | "error"
  onView?: (taskId: string) => void
  onRetry?: (taskId: string) => void
  onDelete?: (taskId: string) => void
}

function TaskSection({
  title,
  tasks,
  icon,
  defaultOpen = true,
  variant = "default",
  onView,
  onRetry,
  onDelete,
}: TaskSectionProps) {
  if (tasks.length === 0) {return null}

  return (
    <QueueSection defaultOpen={defaultOpen}>
      <QueueSectionTrigger>
        <QueueSectionLabel
          label={title}
          count={tasks.length}
          icon={icon}
        />
      </QueueSectionTrigger>
      <QueueSectionContent>
        <QueueList>
          {tasks.map((task) => (
            <QueueItem key={task.id}>
              <div className="flex items-start gap-2">
                <QueueItemIndicator
                  completed={task.status === "completed"}
                />
                <QueueItemContent
                  completed={task.status === "completed"}
                  className={cn(
                    variant === "error" && "text-destructive"
                  )}
                >
                  {task.title}
                </QueueItemContent>
                <QueueItemActions>
                  {onView && (
                    <QueueItemAction onClick={() => onView(task.id)}>
                      <EyeIcon className="size-3" />
                    </QueueItemAction>
                  )}
                  {onRetry && task.status === "failed" && (
                    <QueueItemAction onClick={() => onRetry(task.id)}>
                      <RefreshCwIcon className="size-3" />
                    </QueueItemAction>
                  )}
                  {onDelete && (
                    <QueueItemAction onClick={() => onDelete(task.id)}>
                      <TrashIcon className="size-3" />
                    </QueueItemAction>
                  )}
                </QueueItemActions>
              </div>
              {(Boolean(task.description)) && (
                <QueueItemDescription>{task.description}</QueueItemDescription>
              )}
              {(Boolean(task.error)) && (
                <QueueItemDescription className="text-destructive">
                  {task.error}
                </QueueItemDescription>
              )}
              {task.createdAt && (
                <div className="ml-6 text-xs text-muted-foreground flex items-center gap-1">
                  <ClockIcon className="size-3" />
                  {formatRelativeTime(task.createdAt)}
                </div>
              )}
            </QueueItem>
          ))}
        </QueueList>
      </QueueSectionContent>
    </QueueSection>
  )
}

export function AgentQueue({
  tasks,
  onView,
  onRetry,
  onDelete,
  className,
}: AgentQueueProps) {
  const { pending, running, completed, failed } = useMemo(() => ({
    pending: tasks.filter((t) => t.status === "pending"),
    running: tasks.filter((t) => t.status === "running"),
    completed: tasks.filter((t) => t.status === "completed"),
    failed: tasks.filter((t) => t.status === "failed"),
  }), [tasks])

  if (tasks.length === 0) {return null}

  return (
    <Queue className={className}>
      <div className="flex items-center gap-2 px-2 pb-2 border-b mb-2">
        <span className="text-sm font-medium">Task Queue</span>
        <Badge variant="secondary" className="text-xs">
          {tasks.length} total
        </Badge>
        {running.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {running.length} running
          </Badge>
        )}
      </div>

      <TaskSection
        title="Running"
        tasks={running}
        icon={<Loader2Icon className="size-3 animate-spin" />}
        onView={onView}
      />

      <TaskSection
        title="Pending"
        tasks={pending}
        icon={<ClockIcon className="size-3" />}
        onView={onView}
        onDelete={onDelete}
      />

      <TaskSection
        title="Completed"
        tasks={completed}
        icon={<CheckCircle2Icon className="size-3 text-green-500" />}
        defaultOpen={false}
        variant="success"
        onView={onView}
        onDelete={onDelete}
      />

      <TaskSection
        title="Failed"
        tasks={failed}
        icon={<XCircleIcon className="size-3 text-destructive" />}
        variant="error"
        onView={onView}
        onRetry={onRetry}
        onDelete={onDelete}
      />
    </Queue>
  )
}
