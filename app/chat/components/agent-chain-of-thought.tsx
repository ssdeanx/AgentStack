"use client"

import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from "@/src/components/ai-elements/chain-of-thought"
import { SearchIcon, BrainIcon, CheckIcon, LoaderIcon } from "lucide-react"

export interface ReasoningStep {
  id: string
  label: string
  description?: string
  status: "complete" | "active" | "pending"
  searchResults?: string[]
}

interface AgentChainOfThoughtProps {
  steps: ReasoningStep[]
  isStreaming?: boolean
  defaultOpen?: boolean
}

export function AgentChainOfThought({
  steps,
  isStreaming = false,
  defaultOpen = true,
}: AgentChainOfThoughtProps) {
  if (!steps || steps.length === 0) return null

  return (
    <ChainOfThought defaultOpen={defaultOpen}>
      <ChainOfThoughtHeader>
        {isStreaming ? "Thinking..." : "Chain of Thought"}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {steps.map((step) => (
          <ChainOfThoughtStep
            key={step.id}
            icon={
              step.status === "active"
                ? LoaderIcon
                : step.status === "complete"
                  ? CheckIcon
                  : BrainIcon
            }
            label={step.label}
            description={step.description}
            status={step.status}
          >
            {step.searchResults && step.searchResults.length > 0 && (
              <ChainOfThoughtSearchResults>
                {step.searchResults.map((result, i) => (
                  <ChainOfThoughtSearchResult key={i}>
                    <SearchIcon className="size-3" />
                    {result}
                  </ChainOfThoughtSearchResult>
                ))}
              </ChainOfThoughtSearchResults>
            )}
          </ChainOfThoughtStep>
        ))}
      </ChainOfThoughtContent>
    </ChainOfThought>
  )
}

export function parseReasoningToSteps(reasoning: string): ReasoningStep[] {
  if (!reasoning) return []

  const lines = reasoning.split("\n").filter((line) => line.trim())
  const steps: ReasoningStep[] = []

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.match(/^\d+\./)) {
      steps.push({
        id: `step-${index}`,
        label: trimmed.replace(/^[-•\d.]+\s*/, ""),
        status: "complete",
      })
    } else if (trimmed.length > 10) {
      steps.push({
        id: `step-${index}`,
        label: trimmed.slice(0, 80) + (trimmed.length > 80 ? "..." : ""),
        description: trimmed.length > 80 ? trimmed : undefined,
        status: "complete",
      })
    }
  })

  return steps.slice(0, 10)
}
