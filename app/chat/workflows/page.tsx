'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkflows } from '@/lib/hooks/use-mastra-query'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { Badge } from '@/ui/badge'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/ui/tooltip'
import { Panel } from '@/src/components/ai-elements/panel'
import {
    ArrowLeftIcon,
    CircleHelpIcon,
    Loader2Icon,
    SearchIcon,
    GitBranchIcon,
    PanelRightCloseIcon,
} from 'lucide-react'

interface WorkflowRecord {
    id?: string
    name: string
    description?: string
    steps?: unknown[] | Record<string, unknown>
}

function getStepCount(workflow: WorkflowRecord): number {
    if (Array.isArray(workflow.steps)) {
        return workflow.steps.length
    }
    if (workflow.steps && typeof workflow.steps === 'object') {
        return Object.keys(workflow.steps).length
    }
    return 0
}

export default function ChatWorkflowsPage() {
    const router = useRouter()
    const { data, isLoading, error } = useWorkflows()
    const [query, setQuery] = useState('')
    const [showHelpPanel, setShowHelpPanel] = useState(true)

    const workflows = useMemo(() => {
        if (!Array.isArray(data)) {
            return [] as WorkflowRecord[]
        }
        return data as WorkflowRecord[]
    }, [data])

    const filteredWorkflows = useMemo(() => {
        const trimmed = query.trim().toLowerCase()
        if (!trimmed) {
            return workflows
        }

        return workflows.filter((workflow) => {
            const name = workflow.name.toLowerCase()
            const description = (workflow.description ?? '').toLowerCase()
            return name.includes(trimmed) || description.includes(trimmed)
        })
    }, [query, workflows])

    return (
        <TooltipProvider delayDuration={150}>
            <div className="flex min-h-screen flex-col bg-background">
            <header className="border-b bg-card/60 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            router.push('/chat')
                        }}
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <GitBranchIcon className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">Chat Workflows</h1>
                            <p className="text-sm text-muted-foreground">
                                Browse the workflow templates available to chat workflows.
                            </p>
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="secondary" className="cursor-help">{workflows.length} workflows</Badge>
                            </TooltipTrigger>
                            <TooltipContent>Live workflow templates returned from the Mastra client.</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowHelpPanel((current) => !current)}
                                    aria-label={showHelpPanel ? 'Hide workflows help panel' : 'Show workflows help panel'}
                                >
                                    {showHelpPanel ? <PanelRightCloseIcon className="size-4" /> : <CircleHelpIcon className="size-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {showHelpPanel ? 'Hide the workflow help panel.' : 'Show the workflow help panel.'}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                {showHelpPanel ? (
                    <Panel position="top-right" className="pointer-events-auto z-20 w-88">
                        <div className="rounded-3xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold text-foreground">Workflow help</div>
                                    <div className="text-xs text-muted-foreground">
                                        Drill into a workflow to inspect details, schema, and runs.
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowHelpPanel(false)}
                                    aria-label="Close workflows help panel"
                                >
                                    <PanelRightCloseIcon className="size-4" />
                                </Button>
                            </div>

                            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                                <p>Use the search box to filter by name or description.</p>
                                <p>Each card can link into the new workflow detail route for a richer inspection experience.</p>
                            </div>
                        </div>
                    </Panel>
                ) : null}

                <div className="relative max-w-xl">
                    <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value)
                        }}
                        placeholder="Search workflows by name or description"
                        className="pl-9"
                    />
                </div>

                {isLoading ? (
                    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                        <Loader2Icon className="size-4 animate-spin" />
                        Loading workflows...
                    </div>
                ) : error ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base text-destructive">
                                Failed to load workflows
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            {error instanceof Error ? error.message : 'Failed to load workflows'}
                        </CardContent>
                    </Card>
                ) : filteredWorkflows.length === 0 ? (
                    <Card>
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            No workflows matched your search.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {filteredWorkflows.map((workflow) => (
                            <Card key={workflow.id ?? workflow.name} className="h-full">
                                <CardHeader className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <CardTitle className="text-base">{workflow.name}</CardTitle>
                                        <Badge variant="outline">{getStepCount(workflow)} steps</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm text-muted-foreground">
                                    <p>{workflow.description ?? 'No description available.'}</p>
                                    <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                                        <div className="mb-1 font-medium text-foreground">Structure</div>
                                        <div>Steps: {getStepCount(workflow)}</div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                                router.push(`/chat/workflows/${encodeURIComponent(workflow.id ?? workflow.name)}`)
                                        }}
                                    >
                                        Open workflow details
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
            </div>
        </TooltipProvider>
    )
}
