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
  onRestore: (messageIndex: number) => void
}

export function AgentCheckpoint({
  messageIndex,
  timestamp,
  onRestore,
}: AgentCheckpointProps) {
  const label = timestamp
    ? `Restore to ${timestamp.toLocaleTimeString()}`
    : "Restore checkpoint"

  return (
    <Checkpoint>
      <CheckpointIcon>
        <BookmarkIcon className="size-4 shrink-0 text-primary" />
      </CheckpointIcon>
      <CheckpointTrigger
        onClick={() => onRestore(messageIndex)}
        tooltip={label}
        className="gap-1"
      >
        <RotateCcwIcon className="size-3" />
        <span className="text-xs">Restore</span>
      </CheckpointTrigger>
    </Checkpoint>
  )
}
