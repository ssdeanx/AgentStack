'use client'

import {
    Plan,
    PlanHeader,
    PlanTitle,
    PlanDescription,
    PlanTrigger,
    PlanContent,
    PlanFooter,
    PlanAction,
} from '@/src/components/ai-elements/plan'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { PlayIcon, XIcon, CheckIcon, CircleIcon } from 'lucide-react'
import { useMemo } from 'react'

import type { AgentPlanData, PlanStep } from '../providers/chat-context-types'

interface AgentPlanProps {
    plan: AgentPlanData
    onExecute?: () => void
    onDismiss?: () => void
    defaultOpen?: boolean
    className?: string
}

function normalizeSteps(steps: PlanStep[] | string[]): PlanStep[] {
    return steps.map((step) =>
        typeof step === 'string' ? { text: step, completed: false } : step
    )
}

export function AgentPlan({
    plan,
    onExecute,
    onDismiss,
    defaultOpen = true,
    className,
}: AgentPlanProps) {
    const normalizedSteps = useMemo(
        () => normalizeSteps(plan.steps),
        [plan.steps]
    )
    const completedCount = normalizedSteps.filter(
        (s) => s.completed ?? false
    ).length
    const progress =
        normalizedSteps.length > 0
            ? Math.round((completedCount / normalizedSteps.length) * 100)
            : 0

    return (
        <Plan
            isStreaming={plan.isStreaming}
            defaultOpen={defaultOpen}
            className={className}
        >
            <PlanHeader>
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <PlanTitle>{plan.title}</PlanTitle>
                        {completedCount > 0 && (
                            <Badge variant="secondary" className="rounded-full text-xs shadow-sm">
                                {completedCount}/{normalizedSteps.length}
                            </Badge>
                        )}
                        {progress > 0 && (
                            <Badge variant="outline" className="rounded-full text-xs">
                                {progress}%
                            </Badge>
                        )}
                    </div>
                    <PlanDescription>{plan.description}</PlanDescription>
                </div>
                <PlanTrigger />
            </PlanHeader>
            <PlanContent>
                <ol className="space-y-2.5 text-sm">
                    {normalizedSteps.map((step, index) => {
                        const isCurrentStep = plan.currentStep === index
                        const isCompleted = step.completed

                        return (
                            <li
                                key={index}
                                className={`flex items-start gap-2 leading-relaxed ${
                                    (isCompleted ?? false)
                                        ? 'text-muted-foreground line-through'
                                        : ''
                                } ${isCurrentStep ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                            >
                                <span className="shrink-0 mt-0.5">
                                    {(isCompleted ?? false) ? (
                                        <CheckIcon className="size-4 text-green-500" />
                                    ) : (
                                        <CircleIcon
                                            className={`size-4 ${isCurrentStep ? 'text-primary' : 'text-muted-foreground/50'}`}
                                        />
                                    )}
                                </span>
                                <span>{step.text}</span>
                            </li>
                        )
                    })}
                </ol>
                {progress > 0 && progress < 100 && (
                    <svg
                        className="mt-4 h-2 w-full overflow-hidden rounded-full border border-border/60 bg-muted/50"
                        viewBox="0 0 100 1"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                    >
                        <rect x="0" y="0" width="100" height="1" className="fill-muted/50" />
                        <rect
                            x="0"
                            y="0"
                            width={progress}
                            height="1"
                            className="fill-primary transition-all duration-300"
                        />
                    </svg>
                )}
            </PlanContent>
            {(onExecute ?? onDismiss) && (
                <PlanFooter>
                    <PlanAction>
                        {onDismiss && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onDismiss}
                            >
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
