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
import type { ReasoningStep } from "./chat.types"

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
