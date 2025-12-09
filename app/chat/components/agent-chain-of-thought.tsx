"use client"

import { useMemo } from "react"
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from "@/src/components/ai-elements/chain-of-thought"
import { Badge } from "@/ui/badge"
import { SearchIcon, BrainIcon, CheckIcon, LoaderIcon, ClockIcon } from "lucide-react"

export interface ReasoningStep {
  id: string
  label: string
  description?: string
  status: "complete" | "active" | "pending"
  searchResults?: string[]
  duration?: number
}

interface AgentChainOfThoughtProps {
  steps: ReasoningStep[]
  isStreaming?: boolean
  defaultOpen?: boolean
  className?: string
}

export function AgentChainOfThought({
  steps,
  isStreaming = false,
  defaultOpen = true,
  className,
}: AgentChainOfThoughtProps) {
  if (!steps || steps.length === 0) {return null}

  const completedCount = useMemo(() => steps.filter((s) => s.status === "complete").length, [steps])
  const activeStep = useMemo(() => steps.find((s) => s.status === "active"), [steps])

  return (
    <ChainOfThought defaultOpen={defaultOpen} className={className}>
      <ChainOfThoughtHeader className="flex items-center gap-2">
        <span className="flex-1">
          {isStreaming
            ? activeStep?.label ?? "Thinking..."
            : "Chain of Thought"
          }
        </span>
        <Badge variant="secondary" className="text-xs font-normal">
          {completedCount}/{steps.length}
        </Badge>
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
            {step.duration && step.status === "complete" && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ClockIcon className="size-3" />
                {step.duration}s
              </span>
            )}
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

type StepType = "step" | "search" | "analysis" | "decision"

function categorizeStep(text: string): StepType {
  const lower = text.toLowerCase()
  if (lower.includes("search") || lower.includes("looking for") || lower.includes("finding")) {
    return "search"
  }
  if (lower.includes("analyzing") || lower.includes("examining") || lower.includes("reviewing")) {
    return "analysis"
  }
  if (lower.includes("decided") || lower.includes("conclusion") || lower.includes("therefore")) {
    return "decision"
  }
  return "step"
}

export function parseReasoningToSteps(reasoning: string): ReasoningStep[] {
  if (!reasoning) {return []}

  const lines = reasoning.split("\n").filter((line) => line.trim())
  const steps: ReasoningStep[] = []
  let currentSearchTerms: string[] = []

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    // Skip very short lines
    if (trimmed.length < 5) {return}

    // Check for bullet points or numbered lists
    const isBullet = trimmed.startsWith("-") || trimmed.startsWith("•") || /^\d+\./.test(trimmed)
    const content = isBullet
      ? trimmed.replace(/^[-•\d.]+\s*/, "")
      : trimmed

    // Extract search terms if mentioned
    const searchMatch = /(?:search|looking for|finding)[:\s]+["']?([^"'\n]+)["']?/i.exec(content)
    if (searchMatch) {
      currentSearchTerms.push(searchMatch[1].trim())
    }

    if (content.length > 10) {
      const stepType = categorizeStep(content)
      steps.push({
        id: `step-${index}`,
        label: content.length > 80 ? content.slice(0, 77) + "..." : content,
        description: content.length > 80 ? content : undefined,
        status: "complete",
        searchResults: stepType === "search" ? [...currentSearchTerms] : undefined,
      })

      // Reset after each step to prevent accumulation
      currentSearchTerms = []
    }
  })

  return steps.slice(0, 15)
}
