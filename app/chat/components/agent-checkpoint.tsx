"use client"

import React from "react"
import {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from "@/src/components/ai-elements/checkpoint"
import { Badge } from "@/ui/badge"
import {
  BookmarkIcon,
  RotateCcwIcon,
  MessageSquareIcon,
  ClockIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Props for the AgentCheckpoint component.
 * @param messageIndex - The index of the message.
 * @param timestamp - The timestamp of the checkpoint. Can be a Date object or a valid ISO string. Assumed to be in local timezone.
 * @param label - Optional label for the checkpoint.
 * @param messageCount - Number of messages included in this checkpoint. If 0, shows 0; if undefined, not shown.
 * @param onRestore - Callback to restore to this checkpoint.
 * @param className - Optional CSS class.
 */
interface AgentCheckpointProps {
  messageIndex: number
  timestamp?: Date | string
  label?: string
  messageCount?: number
  onRestore: () => void
  className?: string
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) {return "just now"}
  if (diffMins < 60) {return `${diffMins}m ago`}
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) {return `${diffHours}h ago`}
  return formatTime(date)
}

export function AgentCheckpoint({
  messageIndex,
  timestamp,
  label,
  messageCount,
  onRestore,
  className,
}: AgentCheckpointProps) {
  const date = timestamp ? (typeof timestamp === 'string' ? new Date(timestamp) : timestamp) : undefined
  const displayLabel = label ?? (date
    ? `Checkpoint at ${formatTime(date)}`
    : `Checkpoint ${messageIndex + 1}`)

  return (
    <Checkpoint className={cn("group", className)}>
      <CheckpointIcon>
        <div className="relative">
          <BookmarkIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="absolute -top-1 -right-1 size-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CheckpointIcon>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xs text-muted-foreground truncate">
          {displayLabel}
        </span>

        {messageCount !== undefined && (
          <Badge variant="secondary" className="text-xs gap-1 shrink-0">
            <MessageSquareIcon className="size-3" aria-hidden="true" />
            {messageCount}
          </Badge>
        )}

        {date && (
          <span className="text-xs text-muted-foreground/60 hidden sm:flex items-center gap-1 shrink-0">
            <ClockIcon className="size-3" aria-hidden="true" />
            {formatRelativeTime(date)}
          </span>
        )}
      </div>

      <CheckpointTrigger
        onClick={onRestore}
        tooltip={`Restore to ${displayLabel}`}
        aria-label={`Restore to ${displayLabel}`}
        className="gap-1.5 opacity-60 hover:opacity-100 transition-opacity"
      >
        <RotateCcwIcon className="size-3" aria-hidden="true" />
        <span className="text-xs hidden sm:inline">Restore</span>
      </CheckpointTrigger>
    </Checkpoint>
  )
}
