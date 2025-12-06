"use client"

import {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanTrigger,
  PlanContent,
  PlanFooter,
  PlanAction,
} from "@/src/components/ai-elements/plan"
import { Button } from "@/ui/button"
import { PlayIcon, XIcon } from "lucide-react"

export interface AgentPlanData {
  title: string
  description: string
  steps: string[]
  isStreaming?: boolean
}

interface AgentPlanProps {
  plan: AgentPlanData
  onExecute?: () => void
  onDismiss?: () => void
  defaultOpen?: boolean
}

export function AgentPlan({
  plan,
  onExecute,
  onDismiss,
  defaultOpen = true,
}: AgentPlanProps) {
  return (
    <Plan isStreaming={plan.isStreaming} defaultOpen={defaultOpen}>
      <PlanHeader>
        <div className="flex-1">
          <PlanTitle>{plan.title}</PlanTitle>
          <PlanDescription>{plan.description}</PlanDescription>
        </div>
        <PlanTrigger />
      </PlanHeader>
      <PlanContent>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          {plan.steps.map((step, index) => (
            <li key={index} className="leading-relaxed">
              {step}
            </li>
          ))}
        </ol>
      </PlanContent>
      {(onExecute ?? onDismiss) && (
        <PlanFooter>
          <PlanAction>
            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                <XIcon className="size-4 mr-1" />
                Dismiss
              </Button>
            )}
            {onExecute && (
              <Button size="sm" onClick={onExecute}>
                <PlayIcon className="size-4 mr-1" />
                Execute Plan
              </Button>
            )}
          </PlanAction>
        </PlanFooter>
      )}
    </Plan>
  )
}

export function extractPlanFromText(text: string): AgentPlanData | null {
  const planMatch = /(?:plan|steps|approach|strategy)[:.]?\s*\n((?:[-•\d.].+\n?)+)/i.exec(text)
  if (!planMatch) {return null}

  const stepsText = planMatch[1]
  const steps = stepsText
    .split("\n")
    .map((line) => line.replace(/^[-•\d.]+\s*/, "").trim())
    .filter((line) => line.length > 0)

  if (steps.length < 2) {return null}

  return {
    title: "Execution Plan",
    description: `${steps.length} steps to complete this task`,
    steps,
    isStreaming: false,
  }
}
