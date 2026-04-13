'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { useEffect, useState } from 'react'

import { ChatProvider } from './providers/chat-context'
import { ChatPageShell } from './components/chat-page-shell'
import { MainSidebar } from './components/main-sidebar'
import {
    useAgents,
    useDatasets,
    useMcpServers,
    useScorers,
    useTools,
    useTraces,
    useWorkflows,
    useWorkspaces,
} from '@/lib/hooks/use-mastra-query'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/ui/tooltip'
import { Panel } from '@/src/components/ai-elements/panel'
import { useAuthQuery } from '@/lib/hooks/use-auth-query'
import {
    ActivityIcon,
    ArrowRightIcon,
    BotIcon,
    Code2Icon,
    DatabaseIcon,
    InfoIcon,
    Loader2Icon,
    PanelRightCloseIcon,
    PanelRightOpenIcon,
    ServerIcon,
    WrenchIcon,
    WorkflowIcon,
} from 'lucide-react'

function countArray(value: unknown): number {
    return Array.isArray(value) ? value.length : 0
}

/**
 * Dashboard home for the chat workspace.
 */
export default function ChatDashboardPage() {
    return (
        <Suspense fallback={null}>
            <ChatAuthGate />
        </Suspense>
    )
}

function ChatAuthGate() {
    const router = useRouter()
    const authQuery = useAuthQuery()

    useEffect(() => {
        if (authQuery.isPending) {
            return
        }

        if (!authQuery.data) {
            router.replace('/login?next=/chat')
        }
    }, [authQuery.data, authQuery.isPending, router])

    if (authQuery.isPending) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
                Loading your chat workspace...
            </div>
        )
    }

    if (!authQuery.data) {
        return null
    }

    return (
        <ChatProvider>
            <ChatDashboardContent />
        </ChatProvider>
    )
}

function ChatDashboardContent() {
    const [showHelpPanel, setShowHelpPanel] = useState(true)
    const agentsResult = useAgents()
    const workspacesResult = useWorkspaces()
    const datasetsResult = useDatasets()
    const scorersResult = useScorers()
    const toolsResult = useTools()
    const workflowsResult = useWorkflows()
    const mcpServersResult = useMcpServers({ page: 0, perPage: 8 })
    const tracesResult = useTraces({ pagination: { page: 1, perPage: 8 } })

    const quickLinks = [
        { label: 'Agents', href: '/chat/agents', icon: BotIcon, detail: 'Choose an agent and open chat or IDE.' },
        { label: 'Code', href: '/chat/Code', icon: Code2Icon, detail: 'Pick an agent for the code studio.' },
        { label: 'Workspaces', href: '/chat/workspaces', icon: DatabaseIcon, detail: 'Inspect files, sandbox, and skills.' },
        { label: 'Evaluation', href: '/chat/evaluation', icon: ActivityIcon, detail: 'Review datasets and scorers.' },
        { label: 'Dataset', href: '/chat/dataset', icon: DatabaseIcon, detail: 'Manage dataset items and experiments.' },
        { label: 'Observability', href: '/chat/observability', icon: ActivityIcon, detail: 'Inspect traces and runtime health.' },
        { label: 'Tools', href: '/chat/tools', icon: WrenchIcon, detail: 'Browse tool schemas and capabilities.' },
        { label: 'Workflows', href: '/chat/workflows', icon: WorkflowIcon, detail: 'Review workflow inventory and metadata.' },
        { label: 'MCP / A2A', href: '/chat/mcp-a2a', icon: ServerIcon, detail: 'Inspect servers, tools, and agent cards.' },
    ]

    const stats = [
        { label: 'Agents', value: countArray(agentsResult.data), icon: BotIcon },
        { label: 'Workspaces', value: countArray(workspacesResult.data), icon: DatabaseIcon },
        { label: 'Datasets', value: countArray(datasetsResult.data), icon: ActivityIcon },
        { label: 'Scorers', value: countArray(scorersResult.data), icon: ActivityIcon },
        { label: 'Tools', value: countArray(toolsResult.data), icon: WrenchIcon },
        { label: 'Workflows', value: countArray(workflowsResult.data), icon: WorkflowIcon },
        { label: 'MCP servers', value: countArray(mcpServersResult.data?.servers), icon: ServerIcon },
        { label: 'Traces', value: countArray(tracesResult.data?.spans), icon: ActivityIcon },
    ]

    return (
        <TooltipProvider delayDuration={150}>
            <ChatPageShell
                title="Command center"
                description="A production-grade launchpad for agents, workspaces, memory, evaluation, observability, datasets, tools, workflows, logs, and protocol surfaces."
                sidebar={<MainSidebar />}
                actions={
                    <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button asChild variant="outline" className="gap-2">
                                    <Link href="/chat/agents">
                                        Browse agents <ArrowRightIcon className="size-4" />
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open the live agent list and pick a target.</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button asChild className="gap-2">
                                    <Link href="/chat/Code">
                                        Open code studio <ArrowRightIcon className="size-4" />
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Jump into the code studio with filesystem tools.</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowHelpPanel((current) => !current)}
                                    aria-label={showHelpPanel ? 'Hide dashboard help' : 'Show dashboard help'}
                                >
                                    {showHelpPanel ? (
                                        <PanelRightCloseIcon className="size-4" />
                                    ) : (
                                        <PanelRightOpenIcon className="size-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {showHelpPanel ? 'Hide the dashboard help panel.' : 'Show the dashboard help panel.'}
                            </TooltipContent>
                        </Tooltip>
                    </>
                }
            >
                {showHelpPanel ? (
                    <Panel position="top-right" className="pointer-events-auto z-20 w-88">
                        <div className="rounded-3xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <InfoIcon className="size-4 text-primary" />
                                        <div className="text-sm font-semibold text-foreground">Dashboard help</div>
                                    </div>
                                    <div className="text-xs text-muted-foreground">Navigate to the right surface faster.</div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowHelpPanel(false)}
                                    aria-label="Close dashboard help panel"
                                >
                                    <PanelRightCloseIcon className="size-4" />
                                </Button>
                            </div>

                            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                                <p>These counts come from live hooks, so they’re useful for quick sanity checks.</p>
                                <p>Use the launch buttons to jump into agents or the code studio.</p>
                                <p>Hover the metric cards and quick links to understand what each section does.</p>
                            </div>
                        </div>
                    </Panel>
                ) : null}

                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {stats.map((stat) => {
                            const Icon = stat.icon

                            return (
                                <Tooltip key={stat.label}>
                                    <TooltipTrigger asChild>
                                        <Card className="border-border/60 bg-card/70 shadow-sm cursor-help">
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                                            {stat.label}
                                                        </p>
                                                        <div className="text-3xl font-semibold tracking-tight">{stat.value}</div>
                                                    </div>
                                                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                                                        <Icon className="size-5" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TooltipTrigger>
                                    <TooltipContent>Live count for {stat.label.toLowerCase()}.</TooltipContent>
                                </Tooltip>
                            )
                        })}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                        <Card className="border-border/60 bg-card/70 shadow-sm">
                            <CardHeader className="flex-row items-center justify-between space-y-0">
                                <div>
                                    <CardTitle className="text-base">Launch points</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Start from the top-level dashboard, then branch into the right workflow.
                                    </p>
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="secondary" className="cursor-help">{countArray(agentsResult.data)} agents</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Number of agents available from the live catalog.</TooltipContent>
                                </Tooltip>
                            </CardHeader>
                            <CardContent>
                                {agentsResult.isLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2Icon className="size-4 animate-spin" />
                                        Loading agents...
                                    </div>
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {quickLinks.map((link) => {
                                            const Icon = link.icon

                                            return (
                                                <Tooltip key={link.href}>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            asChild
                                                            variant="ghost"
                                                            className="h-auto justify-start gap-3 rounded-2xl border border-border/60 px-4 py-3 text-left hover:bg-muted/60"
                                                        >
                                                            <Link href={link.href}>
                                                                <span className="rounded-xl bg-primary/10 p-2 text-primary">
                                                                    <Icon className="size-4" />
                                                                </span>
                                                                <span className="flex min-w-0 flex-1 flex-col">
                                                                    <span className="text-sm font-medium text-foreground">{link.label}</span>
                                                                    <span className="text-xs text-muted-foreground">{link.detail}</span>
                                                                </span>
                                                                <ArrowRightIcon className="size-4 text-muted-foreground" />
                                                            </Link>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{link.detail}</TooltipContent>
                                                </Tooltip>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-border/60 bg-card/70 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base">Operational summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-muted-foreground">
                                {[
                                    ['Agents', countArray(agentsResult.data)],
                                    ['Tools', countArray(toolsResult.data)],
                                    ['Datasets', countArray(datasetsResult.data)],
                                    ['Scorers', countArray(scorersResult.data)],
                                    ['Workflows', countArray(workflowsResult.data)],
                                    ['MCP servers', countArray(mcpServersResult.data?.servers)],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                                        <span>{label}</span>
                                        <Badge variant="secondary">{value}</Badge>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </ChatPageShell>
        </TooltipProvider>
    )
}