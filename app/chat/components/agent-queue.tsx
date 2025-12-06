"use client"

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
import { EyeIcon, TrashIcon, RefreshCwIcon } from "lucide-react"

export interface QueuedTask {
  id: string
  title: string
  description?: string
  status: "pending" | "running" | "completed" | "failed"
}

interface AgentQueueProps {
  tasks: QueuedTask[]
  onView?: (taskId: string) => void
  onRetry?: (taskId: string) => void
  onDelete?: (taskId: string) => void
}

export function AgentQueue({ tasks, onView, onRetry, onDelete }: AgentQueueProps) {
  const pending = tasks.filter((t) => t.status === "pending")
  const running = tasks.filter((t) => t.status === "running")
  const completed = tasks.filter((t) => t.status === "completed")
  const failed = tasks.filter((t) => t.status === "failed")

  if (tasks.length === 0) {return null}

  return (
    <Queue>
      {running.length > 0 && (
        <QueueSection defaultOpen>
          <QueueSectionTrigger>
            <QueueSectionLabel
              label="Running"
              count={running.length}
              icon={<RefreshCwIcon className="size-3 animate-spin" />}
            />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              {running.map((task) => (
                <QueueItem key={task.id}>
                  <QueueItemIndicator completed={false} />
                  <QueueItemContent>
                    {task.title}
                    {(Boolean(task.description)) && (
                      <QueueItemDescription>{task.description}</QueueItemDescription>
                    )}
                  </QueueItemContent>
                  <QueueItemActions>
                    {onView && (
                      <QueueItemAction onClick={() => onView(task.id)}>
                        <EyeIcon className="size-3" />
                      </QueueItemAction>
                    )}
                  </QueueItemActions>
                </QueueItem>
              ))}
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      )}

      {pending.length > 0 && (
        <QueueSection defaultOpen>
          <QueueSectionTrigger>
            <QueueSectionLabel label="Pending" count={pending.length} />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              {pending.map((task) => (
                <QueueItem key={task.id}>
                  <QueueItemIndicator completed={false} />
                  <QueueItemContent>
                    {task.title}
                    {(Boolean(task.description)) && (
                      <QueueItemDescription>{task.description}</QueueItemDescription>
                    )}
                  </QueueItemContent>
                  <QueueItemActions>
                    {onDelete && (
                      <QueueItemAction onClick={() => onDelete(task.id)}>
                        <TrashIcon className="size-3" />
                      </QueueItemAction>
                    )}
                  </QueueItemActions>
                </QueueItem>
              ))}
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      )}

      {completed.length > 0 && (
        <QueueSection>
          <QueueSectionTrigger>
            <QueueSectionLabel label="Completed" count={completed.length} />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              {completed.map((task) => (
                <QueueItem key={task.id}>
                  <QueueItemIndicator completed />
                  <QueueItemContent completed>
                    {task.title}
                  </QueueItemContent>
                  <QueueItemActions>
                    {onView && (
                      <QueueItemAction onClick={() => onView(task.id)}>
                        <EyeIcon className="size-3" />
                      </QueueItemAction>
                    )}
                  </QueueItemActions>
                </QueueItem>
              ))}
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      )}

      {failed.length > 0 && (
        <QueueSection>
          <QueueSectionTrigger>
            <QueueSectionLabel label="Failed" count={failed.length} />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              {failed.map((task) => (
                <QueueItem key={task.id}>
                  <QueueItemIndicator completed={false} />
                  <QueueItemContent>
                    <span className="text-destructive">{task.title}</span>
                    {(Boolean(task.description)) && (
                      <QueueItemDescription>{task.description}</QueueItemDescription>
                    )}
                  </QueueItemContent>
                  <QueueItemActions>
                    {onRetry && (
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
                </QueueItem>
              ))}
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      )}
    </Queue>
  )
}
