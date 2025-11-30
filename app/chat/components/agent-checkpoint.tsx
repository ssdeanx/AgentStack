"use client"

import {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from "@/src/components/ai-elements/checkpoint"
import { BookmarkIcon, RotateCcwIcon } from "lucide-react"

interface AgentCheckpointProps {
  messageIndex: number
  timestamp?: Date
  label?: string
  onRestore: () => void
}

export function AgentCheckpoint({
  messageIndex,
  timestamp,
  label,
  onRestore,
}: AgentCheckpointProps) {
  const displayLabel = label
    ? label
    : timestamp
      ? `Restore to ${timestamp.toLocaleTimeString()}`
      : "Restore checkpoint"

  return (
    <Checkpoint>
      <CheckpointIcon>
        <BookmarkIcon className="size-4 shrink-0 text-primary" />
      </CheckpointIcon>
      <CheckpointTrigger
        onClick={onRestore}
        tooltip={displayLabel}
        className="gap-1"
      >
        <RotateCcwIcon className="size-3" />
        <span className="text-xs">Restore</span>
      </CheckpointTrigger>
    </Checkpoint>
  )
}
