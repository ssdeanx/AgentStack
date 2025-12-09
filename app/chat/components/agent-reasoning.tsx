"use client"

import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/src/components/ai-elements/reasoning"

export interface AgentReasoningProps {
  reasoning: string
  isStreaming: boolean
  duration?: number
  className?: string
}

export function AgentReasoning({
  reasoning,
  isStreaming,
  duration,
  className,
}: AgentReasoningProps) {
  if (!reasoning && !isStreaming) {return null}

  return (
    <Reasoning
      isStreaming={isStreaming}
      duration={duration}
      className={className}
    >
      <ReasoningTrigger />
      <ReasoningContent>{reasoning}</ReasoningContent>
    </Reasoning>
  )
}
