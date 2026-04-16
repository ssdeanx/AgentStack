'use client'

import Link from 'next/link'
import { Button } from '@/ui/button'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/ui/select'
import { Badge } from '@/ui/badge'
import { useWorkflowContext } from '@/app/chat/providers/workflow-context'
import {
    WORKFLOW_CONFIGS,
    CATEGORY_ORDER,
    CATEGORY_LABELS,
    getWorkflowsByCategory,
} from '@/app/chat/config/workflows'
import {
    ArrowLeftIcon,
    PauseIcon,
    SquareIcon,
    RefreshCwIcon,
    WorkflowIcon,
    AlertCircleIcon,
    RotateCcwIcon,
    CheckCircle2Icon,
} from 'lucide-react'
import { useMemo } from 'react'

export function WorkflowHeader() {
    const {
        selectedWorkflow,
        selectWorkflow,
        workflowStatus,
        pauseWorkflow,
        resumeWorkflow,
        stopWorkflow,
    } = useWorkflowContext()

    const workflowsByCategory = useMemo(() => getWorkflowsByCategory(), [])

    const isWorkflowActive =
        workflowStatus === 'running' || workflowStatus === 'paused'

    return (
        <header className="chat-toolbar z-20 mx-4 mt-4 rounded-2xl px-4 py-3 sm:mx-6 sm:px-5">
            <div className="flex flex-1 flex-wrap items-center gap-4">
                <Link href="/chat">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-xl px-3 hover:bg-background/80"
                    >
                        <ArrowLeftIcon className="size-4 mr-2" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                            Chat hub
                        </span>
                    </Button>
                </Link>
                <div className="hidden h-6 w-px bg-border/40 sm:block" />
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                        <WorkflowIcon className="size-5" />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/90">
                            Workflow studio
                        </h1>
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/75">
                            Available runtimes:{' '}
                            {Object.keys(WORKFLOW_CONFIGS).length} / ACTIVE
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <Select
                    value={selectedWorkflow}
                    onValueChange={(value) => selectWorkflow(value)}
                    disabled={isWorkflowActive}
                >
                    <SelectTrigger className="h-10 w-[min(100%,22rem)] rounded-xl border-border/70 bg-background/80 text-xs font-semibold focus:ring-primary/30">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/70 bg-popover text-popover-foreground shadow-2xl">
                        {CATEGORY_ORDER.map((category) => {
                            const workflows = workflowsByCategory[category]
                            if (workflows.length === 0) {
                                return null
                            }

                            return (
                                <SelectGroup key={category}>
                                    <SelectLabel>
                                        {CATEGORY_LABELS[category]}
                                    </SelectLabel>
                                    {workflows.map((wf) => (
                                        <SelectItem key={wf.id} value={wf.id}>
                                            <div className="flex items-center gap-2">
                                                <span>{wf.name}</span>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs"
                                                >
                                                    {wf.steps.length} steps
                                                </Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            )
                        })}
                    </SelectContent>
                </Select>

                {/* Status indicators */}
                {workflowStatus === 'running' && (
                    <Badge
                        variant="outline"
                        className="h-8 gap-2 rounded-full border-amber-500/30 bg-amber-500/8 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300"
                    >
                        <RefreshCwIcon className="size-3 animate-spin" />
                        Operational
                    </Badge>
                )}

                {workflowStatus === 'paused' && (
                    <Badge
                        variant="outline"
                        className="h-8 gap-2 rounded-full border-sky-500/30 bg-sky-500/8 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300"
                    >
                        <PauseIcon className="size-3" />
                        Suspended
                    </Badge>
                )}

                {workflowStatus === 'completed' && (
                    <Badge
                        variant="outline"
                        className="h-8 gap-2 rounded-full border-emerald-500/30 bg-emerald-500/8 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300"
                    >
                        <CheckCircle2Icon className="size-3" />
                        Synchronized
                    </Badge>
                )}

                {workflowStatus === 'error' && (
                    <Badge
                        variant="outline"
                        className="h-8 gap-2 rounded-full border-destructive/35 bg-destructive/8 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-destructive"
                    >
                        <AlertCircleIcon className="size-3" />
                        Critical Error
                    </Badge>
                )}

                {/* Action buttons */}
                {isWorkflowActive && (
                    <div className="flex items-center gap-2">
                        {workflowStatus === 'running' ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={pauseWorkflow}
                                className="h-9 w-24 rounded-xl border-border/70 bg-background/70 text-[9px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-background"
                            >
                                <PauseIcon className="size-3 mr-2" />
                                Suspend
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resumeWorkflow()}
                                className="h-9 w-24 rounded-xl border-border/70 bg-background/70 text-[9px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-background"
                            >
                                <RefreshCwIcon className="size-3 mr-2" />
                                Resume
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={stopWorkflow}
                            className="h-9 w-9 rounded-xl border-border/70 bg-background/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                            title="Kill process"
                        >
                            <SquareIcon className="size-3" />
                        </Button>
                    </div>
                )}

                {/* Reset button after completion or error */}
                {(workflowStatus === 'completed' ||
                    workflowStatus === 'error') && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={stopWorkflow}
                        className="h-9 rounded-xl border-border/70 bg-background/70 text-[9px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-primary/10 hover:text-primary"
                        title="Reset system"
                    >
                        <RotateCcwIcon className="size-4 mr-1" />
                        Reset Sequence
                    </Button>
                )}
            </div>
        </header>
    )
}
