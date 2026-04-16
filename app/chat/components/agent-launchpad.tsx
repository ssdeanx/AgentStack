'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
    useAgent,
    useAgents,
    useCreateThreadMutation,
} from '@/lib/hooks/use-mastra-query'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/ui/tooltip'
import {
    CodeBlock,
    CodeBlockActions,
    CodeBlockCopyButton,
    CodeBlockHeader,
    CodeBlockTitle,
} from '@/src/components/ai-elements/code-block'
import {
    BotIcon,
    ChevronRightIcon,
    Code2Icon,
    Loader2Icon,
    SearchIcon,
    SparklesIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentLaunchpadProps {
    mode: 'chat' | 'code'
    limit?: number
    className?: string
}

interface LaunchAgent {
    id: string
    name: string
    description?: string
    [key: string]: unknown
}

function normalizeAgent(input: unknown): LaunchAgent | null {
    if (!input || typeof input !== 'object') {
        return null
    }

    const agent = input as Record<string, unknown>
    const id = typeof agent.id === 'string' ? agent.id : ''

    if (!id) {
        return null
    }

    return {
        id,
        name: typeof agent.name === 'string' && agent.name.trim().length > 0 ? agent.name : id,
        description:
            typeof agent.description === 'string' && agent.description.trim().length > 0
                ? agent.description
                : undefined,
        ...agent,
    }
}

function getHref(agentId: string, mode: 'chat' | 'code'): string {
    return mode === 'chat' ? `/chat/agents/${agentId}` : `/chat/Code/${agentId}`
}

function getAgentSurfaceLabel(agent: LaunchAgent): string {
    const provider = typeof agent.provider === 'string' ? agent.provider : ''
    const model = typeof agent.modelId === 'string' ? agent.modelId : ''

    if (provider && model) {
        return `${provider} • ${model}`
    }

    if (provider) {
        return provider
    }

    if (model) {
        return model
    }

    return 'Live agent'
}

function getAgentStatus(agent: LaunchAgent): string {
    const state = typeof agent.status === 'string' ? agent.status : ''
    const ready = typeof agent.ready === 'boolean' ? agent.ready : undefined

    if (state) {
        return state
    }

    if (ready === true) {
        return 'ready'
    }

    return 'available'
}

function safeJson(value: unknown): string {
    try {
        return JSON.stringify(value, null, 2)
    } catch {
        return 'null'
    }
}

function safeText(value: unknown): string {
    return typeof value === 'string' ? value : ''
}

function countItems(value: unknown): number {
    if (Array.isArray(value)) {
        return value.length
    }

    if (value && typeof value === 'object') {
        return Object.keys(value as Record<string, unknown>).length
    }

    return 0
}

function getAgentMeta(agent: LaunchAgent) {
    return {
        provider: safeText(agent.provider ?? agent.providerId ?? agent.providerName),
        modelId: safeText(agent.modelId ?? agent.model ?? agent.modelName),
        workspaceId: safeText(agent.workspaceId ?? agent.workspace ?? agent.resourceId),
        toolCount: countItems(agent.tools),
        workflowCount: countItems(agent.workflows),
        workspaceToolCount: countItems(agent.workspaceTools),
    }
}

/**
 * Card grid used to launch chat or code sessions for agents.
 */
export function AgentLaunchpad({ mode, limit, className }: AgentLaunchpadProps) {
    const router = useRouter()
    const agentsResult = useAgents()
    const createThreadMutation = useCreateThreadMutation()
    const [query, setQuery] = useState('')
    const [creatingAgentId, setCreatingAgentId] = useState<string | null>(null)
    const [selectedAgentId, setSelectedAgentId] = useState('')

    const agents = useMemo<LaunchAgent[]>(() => {
        const data = agentsResult.data ?? []
        const source = Array.isArray(data)
            ? data
            : Object.values(data as Record<string, unknown>)
        const normalizedAgents: LaunchAgent[] = []

        for (const item of source) {
            const agent = normalizeAgent(item)
            if (agent) {
                normalizedAgents.push(agent)
            }
        }

        return normalizedAgents
    }, [agentsResult.data])

    const visibleAgents = useMemo(() => {
        const trimmed = query.trim().toLowerCase()
        const nextAgents = trimmed
            ? agents.filter((agent) => {
                  const searchable = [
                      agent.id,
                      agent.name,
                      agent.description ?? '',
                      getAgentSurfaceLabel(agent),
                      getAgentStatus(agent),
                  ]
                      .join(' ')
                      .toLowerCase()

                  return searchable.includes(trimmed)
              })
            : agents

        return typeof limit === 'number' ? nextAgents.slice(0, limit) : nextAgents
    }, [agents, limit, query])

    useEffect(() => {
        if (!selectedAgentId && visibleAgents[0]?.id) {
            setSelectedAgentId(visibleAgents[0].id)
        }
    }, [selectedAgentId, visibleAgents])

    const selectedAgent = useMemo(
        () => visibleAgents.find((agent) => agent.id === selectedAgentId) ?? visibleAgents[0],
        [selectedAgentId, visibleAgents]
    )

    const selectedAgentDetailsQuery = useAgent(selectedAgent?.id ?? '')

    const summary = useMemo(
        () => ({
            total: agents.length,
            visible: visibleAgents.length,
            withDescriptions: agents.filter((agent) => Boolean(agent.description)).length,
        }),
        [agents, visibleAgents.length]
    )

    const handleCreateThread = async (agent: LaunchAgent) => {
        setCreatingAgentId(agent.id)

        try {
            const result = await createThreadMutation.mutateAsync({
                agentId: agent.id,
                resourceId: agent.id,
                title: `${agent.name} session`,
                metadata: {
                    source: 'agent-launchpad',
                    surface: mode,
                },
            })

            const threadId =
                result && typeof result === 'object' && 'threadId' in result
                    ? String((result as { threadId?: string }).threadId ?? '')
                    : ''

            router.push(
                threadId.length > 0
                    ? `/chat/agents/${agent.id}?threadId=${encodeURIComponent(threadId)}`
                    : `/chat/agents/${agent.id}`
            )
        } finally {
            setCreatingAgentId(null)
        }
    }

    const selectedAgentSummary = useMemo<{
        id: string
        name: string
        provider: string | null
        modelId: string | null
        toolCount: number
        workflowCount: number
        workspaceToolCount: number
        modelVersion: string | null
        status: string | null
        workspaceId: string | null
        source: string | null
        skills: string[]
        hasDraft: boolean
    }>(
        () => ({
            id: safeText(selectedAgentDetailsQuery.data?.id ?? selectedAgent?.id ?? ''),
            name: safeText(selectedAgentDetailsQuery.data?.name ?? selectedAgent?.name ?? ''),
            provider: safeText(selectedAgentDetailsQuery.data?.provider ?? selectedAgent?.provider ?? '') || null,
            modelId: safeText(selectedAgentDetailsQuery.data?.modelId ?? selectedAgent?.modelId ?? '') || null,
            toolCount: countItems(selectedAgentDetailsQuery.data?.tools ?? selectedAgent?.tools),
            workflowCount: countItems(selectedAgentDetailsQuery.data?.workflows ?? selectedAgent?.workflows),
            workspaceToolCount: countItems(selectedAgentDetailsQuery.data?.workspaceTools ?? selectedAgent?.workspaceTools),
            modelVersion: safeText(selectedAgentDetailsQuery.data?.modelVersion ?? selectedAgent?.modelVersion ?? '') || null,
            status: safeText(selectedAgentDetailsQuery.data?.status ?? selectedAgent?.status ?? '') || null,
            workspaceId: safeText(selectedAgentDetailsQuery.data?.workspaceId ?? selectedAgent?.workspaceId ?? '') || null,
            source: safeText(selectedAgentDetailsQuery.data?.source ?? selectedAgent?.source ?? '') || null,
            skills: (selectedAgentDetailsQuery.data?.skills ?? []).map((skill) => safeText(skill.name)),
            hasDraft: Boolean(selectedAgentDetailsQuery.data?.hasDraft),
        }),
        [selectedAgent, selectedAgentDetailsQuery.data]
    )

    return (
        <TooltipProvider delayDuration={150}>
            <section className={cn('space-y-6', className)}>
            <Card className="overflow-hidden rounded-3xl border-border/60 bg-card/80 shadow-sm shadow-black/5">
                <CardContent className="grid gap-5 bg-linear-to-br from-background to-muted/20 p-5 lg:grid-cols-[1.5fr_1fr] lg:items-center lg:p-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            <SparklesIcon className="size-3.5" />
                            Live agents
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold tracking-tight text-foreground">
                                {mode === 'chat' ? 'Chat agents' : 'Code agents'}
                            </h2>
                            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                                Browse the live agent catalog, launch the correct surface, or create a fresh thread directly from the card.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary">{summary.total} total</Badge>
                            <Badge variant="secondary">{summary.visible} visible</Badge>
                            <Badge variant="secondary">{summary.withDescriptions} described</Badge>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="relative">
                            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={query}
                                onChange={(event) => {
                                    setQuery(event.target.value)
                                }}
                                placeholder="Search agents by name, description, provider, or status"
                                className="pl-9"
                            />
                        </div>

                        <p className="text-xs leading-relaxed text-muted-foreground">
                            Tip: use the new thread button to jump directly into a fresh session for that agent.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {selectedAgent ? (
                <Card className="overflow-hidden rounded-3xl border-border/60 bg-card/80 shadow-sm shadow-black/5">
                    <CardHeader className="space-y-4 border-b border-border/40 bg-linear-to-br from-background to-muted/20 px-5 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                                <CardTitle className="text-base">Selected agent</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Focus on one live agent and inspect its provider, model, workspace, and draft state before you launch a session.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">{selectedAgentSummary.status ?? getAgentStatus(selectedAgent)}</Badge>
                                <Badge variant="secondary">{selectedAgentSummary.provider ?? 'Unknown provider'}</Badge>
                                <Badge variant="secondary">{selectedAgentSummary.modelId ?? 'Unknown model'}</Badge>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="grid gap-5 p-5 xl:grid-cols-[1.05fr_0.95fr] xl:p-6">
                        <div className="space-y-5">
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-3xl border border-border/60 bg-background/70 p-4 shadow-sm">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Provider</div>
                                    <div className="mt-2 text-sm font-medium text-foreground">
                                        {selectedAgentSummary.provider ?? 'Unknown'}
                                    </div>
                                </div>
                                <div className="rounded-3xl border border-border/60 bg-background/70 p-4 shadow-sm">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Model</div>
                                    <div className="mt-2 text-sm font-medium text-foreground">
                                        {selectedAgentSummary.modelId ?? 'Unknown'}
                                    </div>
                                </div>
                                <div className="rounded-3xl border border-border/60 bg-background/70 p-4 shadow-sm">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Workspace</div>
                                    <div className="mt-2 text-sm font-medium text-foreground">
                                        {selectedAgentSummary.workspaceId ?? 'No workspace'}
                                    </div>
                                </div>
                                <div className="rounded-3xl border border-border/60 bg-background/70 p-4 shadow-sm">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Draft</div>
                                    <div className="mt-2 text-sm font-medium text-foreground">
                                        {selectedAgentSummary.hasDraft ? 'Yes' : 'No'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.2em] cursor-help">
                                            {selectedAgentSummary.id}
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Agent identifier.</TooltipContent>
                                </Tooltip>
                                {selectedAgentSummary.source ? (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant="secondary" className="capitalize cursor-help">
                                                {selectedAgentSummary.source}
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>Agent source or surface.</TooltipContent>
                                    </Tooltip>
                                ) : null}
                                {selectedAgentSummary.skills.map((skill) => (
                                    <Tooltip key={skill}>
                                        <TooltipTrigger asChild>
                                            <Badge variant="secondary" className="cursor-help">
                                                {skill}
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>Skill attached to the selected agent.</TooltipContent>
                                    </Tooltip>
                                ))}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline" className="cursor-help">{selectedAgentSummary.toolCount} tools</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Tools available to the selected agent.</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline" className="cursor-help">{selectedAgentSummary.workflowCount} workflows</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Workflows registered on this agent.</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline" className="cursor-help">{selectedAgentSummary.workspaceToolCount} workspace tools</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Integration count for the selected agent.</TooltipContent>
                                </Tooltip>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                                <div className="rounded-3xl border border-border/60 bg-background/70 p-4 shadow-sm">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Tools</div>
                                    <div className="mt-2 text-lg font-semibold">{selectedAgentSummary.toolCount}</div>
                                </div>
                                <div className="rounded-3xl border border-border/60 bg-background/70 p-4 shadow-sm">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Workflows</div>
                                    <div className="mt-2 text-lg font-semibold">{selectedAgentSummary.workflowCount}</div>
                                </div>
                                <div className="rounded-3xl border border-border/60 bg-background/70 p-4 shadow-sm">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Workspace tools</div>
                                    <div className="mt-2 text-lg font-semibold">{selectedAgentSummary.workspaceToolCount}</div>
                                </div>
                            </div>

                            {selectedAgentDetailsQuery.isLoading ? (
                                <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
                                    <Loader2Icon className="size-4 animate-spin" />
                                    Loading selected agent details...
                                </div>
                            ) : selectedAgentDetailsQuery.data ? (
                                <CodeBlock code={safeJson(selectedAgentSummary)} language="json" showLineNumbers>
                                    <CodeBlockHeader>
                                        <CodeBlockTitle>agent.json</CodeBlockTitle>
                                        <CodeBlockActions>
                                            <CodeBlockCopyButton />
                                        </CodeBlockActions>
                                    </CodeBlockHeader>
                                </CodeBlock>
                            ) : null}
                        </div>

                        <div className="space-y-4 rounded-3xl border border-border/60 bg-background/70 p-4 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <div className="text-sm font-medium text-foreground">Quick actions</div>
                                    <div className="text-xs text-muted-foreground">
                                        Launch the selected agent in the correct surface or create a fresh session.
                                    </div>
                                </div>
                                <Badge variant="secondary" className="capitalize">
                                    {mode}
                                </Badge>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                                <Button asChild className="gap-2">
                                    <Link href={getHref(selectedAgent.id, mode)}>
                                        <span>{mode === 'chat' ? 'Open chat' : 'Open IDE'}</span>
                                        {mode === 'chat' ? (
                                            <ChevronRightIcon className="size-4" />
                                        ) : (
                                            <Code2Icon className="size-4" />
                                        )}
                                    </Link>
                                </Button>

                                <Button
                                    variant="secondary"
                                    className="gap-2"
                                    onClick={async () => {
                                        await handleCreateThread(selectedAgent)
                                    }}
                                    disabled={creatingAgentId === selectedAgent.id}
                                >
                                    {creatingAgentId === selectedAgent.id ? (
                                        <Loader2Icon className="size-4 animate-spin" />
                                    ) : (
                                        <SparklesIcon className="size-4" />
                                    )}
                                    New thread
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            {agentsResult.isLoading ? (
                <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/60 px-4 py-5 text-sm text-muted-foreground">
                    <Loader2Icon className="size-4 animate-spin" />
                    Loading live agents...
                </div>
            ) : visibleAgents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
                    No agents matched your search.
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visibleAgents.map((agent) => {
                        const surfaceLabel = getAgentSurfaceLabel(agent)
                        const statusLabel = getAgentStatus(agent)
                        const featureBadges = [surfaceLabel, statusLabel].filter(Boolean)
                        const primaryHref = getHref(agent.id, mode)
                        const secondaryHref =
                            mode === 'chat' ? `/chat/Code/${agent.id}` : `/chat/agents/${agent.id}`
                        const isCreating = creatingAgentId === agent.id
                        const isSelected = selectedAgentId === agent.id

                        return (
                            <Card
                                key={agent.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                    setSelectedAgentId(agent.id)
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        setSelectedAgentId(agent.id)
                                    }
                                }}
                                className="group overflow-hidden border-border/60 bg-card/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-2xl"
                            >
                                <CardHeader className="space-y-4 border-b border-border/40 bg-linear-to-br from-background to-muted/20">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 space-y-2">
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <BotIcon className="size-4 text-primary" />
                                                <span className="truncate">{agent.name}</span>
                                            </CardTitle>
                                            <p className="line-clamp-3 text-sm text-muted-foreground">
                                                {agent.description ?? 'A live agent is available for chat and code launch.'}
                                            </p>
                                        </div>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant={isSelected ? 'default' : 'secondary'} className="shrink-0 capitalize cursor-help">
                                                    {statusLabel}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>Live agent status.</TooltipContent>
                                        </Tooltip>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.2em] cursor-help">
                                                    {agent.id}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>Agent identifier.</TooltipContent>
                                        </Tooltip>
                                        {featureBadges.map((feature) => (
                                            <Tooltip key={feature}>
                                                <TooltipTrigger asChild>
                                                    <Badge variant="secondary" className="text-[10px] cursor-help">
                                                        {feature}
                                                    </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>Surface and status metadata.</TooltipContent>
                                            </Tooltip>
                                        ))}
                                        {(() => {
                                            const meta = getAgentMeta(agent)

                                            return (
                                                <>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge variant="outline" className="text-[10px] cursor-help">
                                                                {meta.provider || 'Unknown provider'}
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Provider for this agent.</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge variant="outline" className="text-[10px] cursor-help">
                                                                {meta.modelId || 'Unknown model'}
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Primary model assigned to this agent.</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge variant="outline" className="text-[10px] cursor-help">
                                                                {meta.workspaceId || 'Workspace unavailable'}
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Workspace or resource context for this agent.</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge variant="outline" className="text-[10px] cursor-help">
                                                                {meta.toolCount} tools
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Number of tools exposed by the agent.</TooltipContent>
                                                    </Tooltip>
                                                </>
                                            )
                                        })()}
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4 p-4">
                                    <div className="rounded-2xl border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">Surface:</span> {surfaceLabel}
                                    </div>

                                    <div className="grid gap-2 sm:grid-cols-3">
                                        <Button asChild className="gap-2">
                                            <Link href={primaryHref}>
                                                <span>{mode === 'chat' ? 'Open chat' : 'Open IDE'}</span>
                                                {mode === 'chat' ? (
                                                    <ChevronRightIcon className="size-4" />
                                                ) : (
                                                    <Code2Icon className="size-4" />
                                                )}
                                            </Link>
                                        </Button>

                                        <Button asChild variant="outline" className="gap-2">
                                            <Link href={secondaryHref}>
                                                {mode === 'chat' ? 'Open code' : 'Open chat'}
                                            </Link>
                                        </Button>

                                        <Button
                                            variant="secondary"
                                            className="gap-2"
                                            onClick={async () => {
                                                await handleCreateThread(agent)
                                            }}
                                            disabled={isCreating}
                                        >
                                            {isCreating ? (
                                                <Loader2Icon className="size-4 animate-spin" />
                                            ) : (
                                                <SparklesIcon className="size-4" />
                                            )}
                                            New thread
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
            </section>
        </TooltipProvider>
    )
}
