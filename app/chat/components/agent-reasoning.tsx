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
}

export function AgentReasoning({
  reasoning,
  isStreaming,
  duration,
}: AgentReasoningProps) {
  if (!reasoning) return null

  return (
    <Reasoning isStreaming={isStreaming} duration={duration}>
      <ReasoningTrigger />
      <ReasoningContent>{reasoning}</ReasoningContent>
    </Reasoning>
  )
}
