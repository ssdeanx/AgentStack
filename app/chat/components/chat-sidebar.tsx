'use client'

import { useChatContext } from '@/app/chat/providers/chat-context-hooks'
import { useMastraQuery } from '@/lib/hooks/use-mastra-query'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs'
import {
    BotIcon,
    CpuIcon,
    HistoryIcon,
    BookmarkIcon,
    SettingsIcon,
    DatabaseIcon,
    HashIcon,
    UserIcon,
    CheckCircle2Icon,
    CircleIcon,
    InfoIcon,
    SearchIcon,
    MessageSquareIcon,
    BrainIcon,
    WorkflowIcon,
    ActivityIcon,
    LayersIcon,
    Loader2Icon,
    ScrollTextIcon,
} from 'lucide-react'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { CATEGORY_LABELS } from '../config/agents'
import { cn } from '@/lib/utils'

type TabKey =
    | 'threads'
    | 'agents'
    | 'tools'
    | 'workflows'
    | 'traces'
    | 'vectors'
    | 'logs'
    | 'memory'
    | 'config'

export function ChatSidebar() {
    const {
        agentConfig,
        checkpoints,
        restoreCheckpoint,
        threadId,
        resourceId,
        setThreadId,
        setResourceId,
        selectedAgent,
    } = useChatContext()

    const [tempThreadId, setTempThreadId] = useState(threadId)
    const [tempResourceId, setTempResourceId] = useState(resourceId)
    const [memorySearchQuery, setMemorySearchQuery] = useState('')
    const [selectedTransport, setSelectedTransport] = useState<string>('')
    const [instructions, setInstructions] = useState('')
    const [isEditingInstructions, setIsEditingInstructions] = useState(false)
    const [activeTab, setActiveTab] = useState<TabKey>('threads')

    const {
        useAgents,
        useTools,
        useWorkflows,
        useTraces,
        useThreads,
        useVectorIndexes,
        useLogs,
        useLogTransports,
        useMemoryStatus,
        useAgent,
        useAgentEnhanceInstructionsMutation,
    } = useMastraQuery()

    // Queries (avoid unsafe destructuring of error-typed values)
    const agentsQuery = useAgents()
    const toolsQuery = useTools()
    const workflowsQuery = useWorkflows()
    const tracesQuery = useTraces({ pagination: { page: 1, perPage: 20 } })
    const threadsQuery = useThreads({ resourceId })
    const vectorsQuery = useVectorIndexes()
    const logsQuery = useLogs({ transportId: selectedTransport })
    const transportsQuery = useLogTransports()
    const memoryStatusQuery = useMemoryStatus(agentConfig?.id ?? '')
    const agentDetailsQuery = useAgent(selectedAgent)

    const onRefreshAgents = useCallback(() => {
        void agentsQuery.refetch()
    }, [agentsQuery])

    const onRefreshTools = useCallback(() => {
        void toolsQuery.refetch()
    }, [toolsQuery])

    const onRefreshWorkflows = useCallback(() => {
        void workflowsQuery.refetch()
    }, [workflowsQuery])

    const onRefreshTraces = useCallback(() => {
        void tracesQuery.refetch()
    }, [tracesQuery])

    const onRefreshVectors = useCallback(() => {
        void vectorsQuery.refetch()
    }, [vectorsQuery])

    const onRefreshLogs = useCallback(() => {
        void logsQuery.refetch()
    }, [logsQuery])

    const onRefreshThreads = useCallback(() => {
        void threadsQuery.refetch()
    }, [threadsQuery])

    const agents = agentsQuery.data ?? []
    const loadingAgents = agentsQuery.isLoading

    const tools = toolsQuery.data ?? []
    const loadingTools = toolsQuery.isLoading

    const workflows = workflowsQuery.data ?? []
    const loadingWorkflows = workflowsQuery.isLoading

    const tracesRes: unknown = tracesQuery.data
    const loadingTraces = tracesQuery.isLoading

    const threads = threadsQuery.data ?? []
    const loadingThreads = threadsQuery.isLoading

    const vectors = vectorsQuery.data ?? []
    const loadingVectors = vectorsQuery.isLoading

    const logs = logsQuery.data ?? []
    const loadingLogs = logsQuery.isLoading

    const transportsRes = useMemo<string[]>(() => {
        const v = transportsQuery.data
        return Array.isArray(v) ? v : []
    }, [transportsQuery.data])
    const loadingTransports = transportsQuery.isLoading

    const memoryStatusRes = memoryStatusQuery.data
    const loadingMemory = memoryStatusQuery.isLoading

    const agentDetails: unknown = agentDetailsQuery.data
    const loadingAgentDetails = agentDetailsQuery.isLoading

    const { mutate: enhanceInstructions, isPending: isEnhancing } =
        useAgentEnhanceInstructionsMutation(selectedAgent)

    useEffect(() => {
        if (
            typeof agentDetails === 'object' &&
            agentDetails !== null &&
            'instructions' in agentDetails
        ) {
            const instructionsValue = (agentDetails as { instructions?: unknown })
                .instructions
            const content =
                typeof instructionsValue === 'string'
                    ? instructionsValue
                    : typeof instructionsValue === 'object' &&
                        instructionsValue !== null &&
                        'content' in instructionsValue &&
                        typeof (instructionsValue as { content?: unknown })
                            .content === 'string'
                      ? (instructionsValue as { content: string }).content
                      : ''
            setInstructions(content)
        }
    }, [agentDetails])

    const handleUpdateInstructions = () => {
        enhanceInstructions(
            { instructions, comment: 'Update from sidebar' },
            {
                onSuccess: (data) => {
                    setInstructions(data.new_prompt)
                    setIsEditingInstructions(false)
                },
            }
        )
    }

    const traces = useMemo<unknown[]>(() => {
        const raw: unknown = tracesRes
        if (raw === null || raw === undefined || typeof raw !== 'object') {
            return []
        }
        const {spans} = raw as { spans?: unknown }
        return Array.isArray(spans) ? (spans as unknown[]) : []
    }, [tracesRes])

    const logTransports = useMemo(() => transportsRes, [transportsRes])
    const memoryStatus = useMemo(() => memoryStatusRes, [memoryStatusRes])

    const handleSaveMemory = useCallback(() => {
        setThreadId(tempThreadId)
        setResourceId(tempResourceId)
    }, [tempThreadId, tempResourceId, setThreadId, setResourceId])

    if (agentConfig === null || agentConfig === undefined) {
        return null
    }

    const features = [
        {
            id: 'reasoning',
            label: 'Reasoning',
            enabled: agentConfig.features.reasoning,
        },
        { id: 'tools', label: 'Tools', enabled: agentConfig.features.tools },
        {
            id: 'sources',
            label: 'Sources',
            enabled: agentConfig.features.sources,
        },
        { id: 'canvas', label: 'Canvas', enabled: agentConfig.features.canvas },
        {
            id: 'artifacts',
            label: 'Artifacts',
            enabled: agentConfig.features.artifacts,
        },
        { id: 'plan', label: 'Planning', enabled: agentConfig.features.plan },
        { id: 'task', label: 'Tasks', enabled: agentConfig.features.task },
        {
            id: 'webPreview',
            label: 'Web Preview',
            enabled: agentConfig.features.webPreview,
        },
    ]

    const levelColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'error':
                return 'text-red-400'
            case 'warn':
                return 'text-amber-400'
            case 'debug':
                return 'text-blue-400'
            default:
                return 'text-emerald-400'
        }
    }

    return (
        <aside className="flex h-full w-80 flex-col border-l glass responsive-card overflow-y-auto noise">
            <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as TabKey)}
                className="flex flex-col flex-1"
            >
                <div className="p-4 border-b">
                    <TabsList className="w-full grid grid-cols-4 gap-1">
                        <TabsTrigger
                            value="threads"
                            className="flex items-center gap-1 text-xs"
                        >
                            <MessageSquareIcon className="size-3" /> Threads
                        </TabsTrigger>
                        <TabsTrigger
                            value="agents"
                            className="flex items-center gap-1 text-xs"
                        >
                            <BotIcon className="size-3" /> Agents
                        </TabsTrigger>
                        <TabsTrigger
                            value="tools"
                            className="flex items-center gap-1 text-xs"
                        >
                            <CpuIcon className="size-3" /> Tools
                        </TabsTrigger>
                        <TabsTrigger
                            value="workflows"
                            className="flex items-center gap-1 text-xs"
                        >
                            <WorkflowIcon className="size-3" /> Flows
                        </TabsTrigger>
                        <TabsTrigger
                            value="traces"
                            className="flex items-center gap-1 text-xs"
                        >
                            <ActivityIcon className="size-3" /> Traces
                        </TabsTrigger>
                        <TabsTrigger
                            value="vectors"
                            className="flex items-center gap-1 text-xs"
                        >
                            <LayersIcon className="size-3" /> Vectors
                        </TabsTrigger>
                        <TabsTrigger
                            value="logs"
                            className="flex items-center gap-1 text-xs"
                        >
                            <ScrollTextIcon className="size-3" /> Logs
                        </TabsTrigger>
                        <TabsTrigger
                            value="memory"
                            className="flex items-center gap-1 text-xs"
                        >
                            <BrainIcon className="size-3" /> Memory
                        </TabsTrigger>
                        <TabsTrigger
                            value="config"
                            className="flex items-center gap-1 text-xs"
                        >
                            <SettingsIcon className="size-3" /> Config
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* ──── Threads Tab ──── */}
                <TabsContent
                    value="threads"
                    className="flex flex-col flex-1 m-0 overflow-y-auto"
                >
                    <div className="p-4 border-b">
                        <div className="flex items-center gap-2 mb-2">
                            <BotIcon className="size-4 text-primary" />
                            <h3 className="font-semibold text-sm">
                                Agent Details
                            </h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                    Name
                                </div>
                                <div className="text-sm font-medium">
                                    {agentConfig.name}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                    Category
                                </div>
                                <Badge
                                    variant="outline"
                                    className="text-[10px] uppercase tracking-wider"
                                >
                                    {CATEGORY_LABELS[agentConfig.category]}
                                </Badge>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                    Description
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {agentConfig.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-b">
                        <div className="flex items-center gap-2 mb-3">
                            <InfoIcon className="size-4 text-primary" />
                            <h3 className="font-semibold text-sm">
                                Capabilities
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {features.map((feature) => (
                                <div
                                    key={feature.id}
                                    className={cn(
                                        'flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-all duration-300 bento-item p-2',
                                        feature.enabled
                                            ? 'bg-primary/5 border-primary/20 text-primary'
                                            : 'bg-muted/50 border-transparent text-muted-foreground opacity-60'
                                    )}
                                >
                                    {feature.enabled ? (
                                        <CheckCircle2Icon className="size-3" />
                                    ) : (
                                        <CircleIcon className="size-3" />
                                    )}
                                    {feature.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 border-b flex-1 overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <HistoryIcon className="size-4 text-primary" />
                                <h3 className="font-semibold text-sm">
                                    History
                                </h3>
                            </div>
                            <Badge
                                variant="secondary"
                                className="h-5 px-1.5 text-[10px]"
                            >
                                {checkpoints.length}
                            </Badge>
                        </div>
                        {checkpoints.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <BookmarkIcon className="size-8 text-muted/20 mb-2" />
                                <p className="text-xs text-muted-foreground">
                                    No checkpoints yet
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {checkpoints.map((checkpoint) => (
                                    <button
                                        key={checkpoint.id}
                                        onClick={() =>
                                            restoreCheckpoint(checkpoint.id)
                                        }
                                        className="group flex w-full flex-col gap-1 rounded-lg border bg-card p-2 text-left transition-all hover:border-primary/50 hover:shadow-sm"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium truncate">
                                                {checkpoint.label ??
                                                    `Checkpoint ${checkpoint.messageCount}`}
                                            </span>
                                            <HistoryIcon className="size-3 text-muted-foreground group-hover:text-primary" />
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                            <span>
                                                {checkpoint.timestamp.toLocaleTimeString()}
                                            </span>
                                            <span>
                                                {checkpoint.messageCount} msgs
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                Threads: {threads.length}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRefreshThreads}
                                className="h-7 text-xs"
                                disabled={loadingThreads}
                            >
                                {loadingThreads ? (
                                    <Loader2Icon className="size-3 animate-spin" />
                                ) : (
                                    'Refresh Threads'
                                )}
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                {/* ──── Agents Tab ──── */}
                <TabsContent
                    value="agents"
                    className="flex flex-col flex-1 m-0 overflow-y-auto"
                >
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <BotIcon className="size-4 text-primary" />
                                <h3 className="font-semibold text-sm">
                                    Registered Agents
                                </h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRefreshAgents}
                                className="h-7 text-xs"
                            >
                                {loadingAgents ? (
                                    <Loader2Icon className="size-3 animate-spin" />
                                ) : (
                                    'Refresh'
                                )}
                            </Button>
                        </div>
                        {loadingAgents ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : agents.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No agents registered
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {agents.map((agent) => (
                                    <div
                                        key={agent.id}
                                        className="rounded-md border bg-card p-2.5"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-medium">
                                                {agent.name}
                                            </span>
                                            {agent.modelId !== null &&
                                                agent.modelId !== undefined &&
                                                agent.modelId !== '' && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[8px] h-4 px-1"
                                                >
                                                    {agent.modelId}
                                                </Badge>
                                            )}
                                        </div>
                                        {agent.description !== null &&
                                            agent.description !== undefined &&
                                            agent.description !== '' && (
                                            <p className="text-[10px] text-muted-foreground line-clamp-2">
                                                {agent.description}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ──── Tools Tab ──── */}
                <TabsContent
                    value="tools"
                    className="flex flex-col flex-1 m-0 overflow-y-auto"
                >
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <CpuIcon className="size-4 text-primary" />
                                <h3 className="font-semibold text-sm">
                                    Available Tools
                                </h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRefreshTools}
                                className="h-7 text-xs"
                            >
                                {loadingTools ? (
                                    <Loader2Icon className="size-3 animate-spin" />
                                ) : (
                                    'Refresh'
                                )}
                            </Button>
                        </div>
                        {loadingTools ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : tools.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No tools available
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {tools.map((tool) => (
                                    <div
                                        key={tool.id}
                                        className="rounded-md border bg-card p-2"
                                    >
                                        <div className="text-xs font-medium">
                                            {tool.id}
                                        </div>
                                        {tool.description && (
                                            <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                                                {tool.description}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ──── Workflows Tab ──── */}
                <TabsContent
                    value="workflows"
                    className="flex flex-col flex-1 m-0 overflow-y-auto"
                >
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <WorkflowIcon className="size-4 text-primary" />
                                <h3 className="font-semibold text-sm">
                                    Workflows
                                </h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRefreshWorkflows}
                                className="h-7 text-xs"
                            >
                                {loadingWorkflows ? (
                                    <Loader2Icon className="size-3 animate-spin" />
                                ) : (
                                    'Refresh'
                                )}
                            </Button>
                        </div>
                        {loadingWorkflows ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : workflows.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No workflows available
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {workflows.map((workflow) => (
                                    <div
                                        key={workflow.name}
                                        className="rounded-md border bg-card p-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium">
                                                {workflow.name}
                                            </span>
                                        </div>
                                        {workflow.description !== null &&
                                            workflow.description !== undefined &&
                                            workflow.description !== '' && (
                                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                                                {workflow.description}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ──── Traces Tab ──── */}
                <TabsContent
                    value="traces"
                    className="flex flex-col flex-1 m-0 overflow-y-auto"
                >
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <ActivityIcon className="size-4 text-primary" />
                                <h3 className="font-semibold text-sm">
                                    Traces
                                </h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRefreshTraces}
                                className="h-7 text-xs"
                            >
                                {loadingTraces ? (
                                    <Loader2Icon className="size-3 animate-spin" />
                                ) : (
                                    'Refresh'
                                )}
                            </Button>
                        </div>
                        {loadingTraces ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : traces.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No traces available
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {traces.map((trace, idx) => (
                                    <div
                                        key={
                                            typeof (trace as { spanId?: unknown })
                                                .spanId === 'string'
                                                ? ((trace as { spanId: string })
                                                      .spanId)
                                                : String(idx)
                                        }
                                        className="rounded-md border bg-card p-2"
                                    >
                                        <div className="text-xs font-medium truncate">
                                            {typeof (trace as { name?: unknown }).name ===
                                            'string'
                                                ? ((trace as { name: string }).name)
                                                : ''}
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-[10px] text-muted-foreground">
                                                {typeof (
                                                    trace as {
                                                        startedAt?: unknown
                                                    }
                                                ).startedAt === 'string'
                                                    ? new Date(
                                                          (trace as {
                                                              startedAt: string
                                                          }).startedAt
                                                      ).toLocaleString()
                                                    : ''}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ──── Vectors Tab ──── */}
                <TabsContent
                    value="vectors"
                    className="flex flex-col flex-1 m-0 overflow-y-auto"
                >
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <LayersIcon className="size-4 text-primary" />
                                <h3 className="font-semibold text-sm">
                                    Vector Indexes
                                </h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRefreshVectors}
                                className="h-7 text-xs"
                            >
                                {loadingVectors ? (
                                    <Loader2Icon className="size-3 animate-spin" />
                                ) : (
                                    'Refresh'
                                )}
                            </Button>
                        </div>
                        {loadingVectors ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : vectors.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No vector indexes available
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {vectors.map((vector) => (
                                    <div
                                        key={vector.name}
                                        className="rounded-md border bg-card p-2"
                                    >
                                        <div className="text-xs font-medium">
                                            {vector.name}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {vector.dimension && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    {vector.dimension}D
                                                </span>
                                            )}
                                            {vector.count !== undefined && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    {vector.count} vectors
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ──── Logs Tab ──── */}
                <TabsContent
                    value="logs"
                    className="flex flex-col flex-1 m-0 overflow-y-auto"
                >
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <ScrollTextIcon className="size-4 text-primary" />
                                <h3 className="font-semibold text-sm">Logs</h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRefreshLogs}
                                className="h-7 text-xs"
                            >
                                {loadingLogs ? (
                                    <Loader2Icon className="size-3 animate-spin" />
                                ) : (
                                    'Refresh'
                                )}
                            </Button>
                        </div>

                        {loadingTransports ? (
                            <div className="mb-3 text-xs text-muted-foreground">
                                Loading transports...
                            </div>
                        ) : logTransports.length > 0 ? (
                            <div className="mb-3">
                                <select
                                    value={selectedTransport}
                                    onChange={(e) =>
                                        setSelectedTransport(e.target.value)
                                    }
                                    aria-label="Log transport filter"
                                    className="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">All transports</option>
                                    {logTransports.map((t: string) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : null}

                        {loadingLogs ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : logs.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No logs available
                            </p>
                        ) : (
                            <div className="space-y-1">
                                {logs.map((log, i) => (
                                    <div
                                        key={`${log.time.toISOString()}-${i}`}
                                        className="rounded border bg-card px-2 py-1.5 font-mono"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    'text-[9px] font-bold uppercase',
                                                    levelColor(log.level)
                                                )}
                                            >
                                                {log.level}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground">
                                                {log.time.toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-foreground/80 mt-0.5 line-clamp-3">
                                            {log.msg}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ──── Memory Tab ──── */}
                <TabsContent
                    value="memory"
                    className="flex flex-col flex-1 m-0 overflow-y-auto"
                >
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <BrainIcon className="size-4 text-primary" />
                            <h3 className="font-semibold text-sm">Memory</h3>
                        </div>

                        {loadingMemory ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : memoryStatus ? (
                            <div className="rounded-md border bg-card p-3 mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div
                                        className={cn(
                                            'size-2 rounded-full',
                                            memoryStatus.result
                                                ? 'bg-emerald-400'
                                                : 'bg-red-400'
                                        )}
                                    />
                                    <span className="text-xs font-medium">
                                        {memoryStatus.result
                                            ? 'Active'
                                            : 'Disabled'}
                                    </span>
                                </div>
                            </div>
                        ) : null}

                        <div className="relative mb-4">
                            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                value={memorySearchQuery}
                                onChange={(e) =>
                                    setMemorySearchQuery(e.target.value)
                                }
                                placeholder="Search memories..."
                                className="pl-8 h-9 text-xs"
                            />
                        </div>

                        {memorySearchQuery ? (
                            <div className="rounded-md border bg-muted/30 p-3">
                                <p className="text-xs text-muted-foreground">
                                    Search functionality queries the vector
                                    store for:{' '}
                                    <span className="font-medium text-foreground">
                                        &quot;{memorySearchQuery}&quot;
                                    </span>
                                </p>
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground">
                                Enter a search query to find relevant memories
                                from the vector store.
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-muted/30 mt-auto">
                        <div className="flex items-center gap-2 mb-3">
                            <SettingsIcon className="size-4 text-primary" />
                            <h3 className="font-semibold text-sm">
                                Memory Config
                            </h3>
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase">
                                    <HashIcon className="size-3" /> Thread ID
                                </label>
                                <Input
                                    value={tempThreadId}
                                    onChange={(e) =>
                                        setTempThreadId(e.target.value)
                                    }
                                    className="h-8 text-xs"
                                    placeholder="thread-123"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase">
                                    <UserIcon className="size-3" /> Resource ID
                                </label>
                                <Input
                                    value={tempResourceId}
                                    onChange={(e) =>
                                        setTempResourceId(e.target.value)
                                    }
                                    className="h-8 text-xs"
                                    placeholder="user-456"
                                />
                            </div>
                            <Button
                                size="sm"
                                className="w-full h-8 text-xs gap-1.5"
                                onClick={handleSaveMemory}
                                disabled={
                                    tempThreadId === threadId &&
                                    tempResourceId === resourceId
                                }
                            >
                                <DatabaseIcon className="size-3" /> Update
                                Memory
                            </Button>
                        </div>
                    </div>
                </TabsContent>
                {/* ──── Config Tab ──── */}
                <TabsContent
                    value="config"
                    className="flex flex-col flex-1 m-0 overflow-y-auto"
                >
                    <div className="p-4 border-b">
                        <div className="flex items-center gap-2 mb-3">
                            <BotIcon className="size-4 text-primary" />
                            <h3 className="font-semibold text-sm">
                                Agent Instructions
                            </h3>
                        </div>

                        {loadingAgentDetails ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative group">
                                    <textarea
                                        value={instructions}
                                        onChange={(e) =>
                                            setInstructions(e.target.value)
                                        }
                                        disabled={!isEditingInstructions}
                                        className={cn(
                                            'w-full min-h-50 p-3 text-xs bg-muted/30 border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary',
                                            !isEditingInstructions &&
                                                'cursor-not-allowed opacity-80'
                                        )}
                                        placeholder="Enter agent instructions..."
                                    />
                                    {!isEditingInstructions && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="absolute top-2 right-2 h-7 text-[10px]"
                                            onClick={() =>
                                                setIsEditingInstructions(true)
                                            }
                                        >
                                            Edit
                                        </Button>
                                    )}
                                </div>

                                {isEditingInstructions && (
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            className="flex-1 h-8 text-xs"
                                            onClick={handleUpdateInstructions}
                                            disabled={isEnhancing}
                                        >
                                            {isEnhancing ? (
                                                <Loader2Icon className="size-3 animate-spin mr-1" />
                                            ) : null}
                                            Save & Enhance
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs"
                                            onClick={() => {
                                                setIsEditingInstructions(false)
                                                // Reset to actual details
                                                const instructionsValue =
                                                    typeof agentDetails ===
                                                        'object' &&
                                                    agentDetails !== null &&
                                                    'instructions' in agentDetails
                                                        ? (
                                                              agentDetails as {
                                                                  instructions?: unknown
                                                              }
                                                          ).instructions
                                                        : undefined
                                                const content =
                                                    typeof instructionsValue ===
                                                    'string'
                                                        ? instructionsValue
                                                        : typeof instructionsValue ===
                                                                'object' &&
                                                            instructionsValue !==
                                                                null &&
                                                            'content' in
                                                                instructionsValue &&
                                                            typeof (
                                                                instructionsValue as {
                                                                    content?: unknown
                                                                }
                                                            ).content ===
                                                                'string'
                                                          ? (
                                                                instructionsValue as {
                                                                    content: string
                                                                }
                                                            ).content
                                                          : ''
                                                setInstructions(content)
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </aside>
    )
}
