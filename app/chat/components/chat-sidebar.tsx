'use client'

import { useChatContext } from '@/app/chat/providers/chat-context-hooks'
import {
    DEFAULT_VECTOR_STORE_NAME,
    useAgent,
    useAgentEnhanceInstructionsMutation,
    useAgents,
    useMemoryStatus,
    useThreads,
    useTools,
    useTraces,
    useVectorIndexes,
    useVectors,
    useWorkflows,
    useProcessors,
    useScorers,
    useStoredSkills,
    useWorkspaceSkills,
    useWorkspaces,
} from '@/lib/hooks/use-mastra-query'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs'
import { ScrollArea, ScrollBar } from '@/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/ui/sheet'
import { Separator } from '@/ui/separator'
import {
    CodeBlock,
    CodeBlockActions,
    CodeBlockCopyButton,
    CodeBlockHeader,
    CodeBlockTitle,
} from '@/src/components/ai-elements/code-block'
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
} from 'lucide-react'
import { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { RUNTIME_AGENT_CATEGORY_LABELS } from '../lib/runtime-chat-catalog'

type TabKey =
    | 'threads'
    | 'agents'
    | 'tools'
    | 'workflows'
    | 'traces'
    | 'vectors'
    | 'memory'
    | 'config'

type TraceRecord = Record<string, unknown>
type WorkspaceRecord = {
    id?: string
    name?: string
    agentName?: string
}

const TRACE_STATUS_COLORS: Record<string, string> = {
    ok: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    error: 'bg-red-500/15 text-red-400 border-red-500/20',
    unset: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
}

function normalizeCollection(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (typeof item === 'string') {
                    return item
                }

                if (isRecord(item)) {
                    return safeString(
                        item.name ??
                            item.id ??
                            item.label ??
                            item.title ??
                            item.key,
                        ''
                    )
                }

                return ''
            })
            .filter((item) => item.length > 0)
    }

    if (isRecord(value)) {
        return Object.values(value)
            .map((item) => {
                if (typeof item === 'string') {
                    return item
                }

                if (isRecord(item)) {
                    return safeString(
                        item.name ??
                            item.id ??
                            item.label ??
                            item.title ??
                            item.key,
                        ''
                    )
                }

                return ''
            })
            .filter((item) => item.length > 0)
    }

    return []
}

function isRecord(value: unknown): value is TraceRecord {
    return typeof value === 'object' && value !== null
}

function safeString(value: unknown, fallback = '—'): string {
    if (typeof value === 'string' && value.trim().length > 0) {
        return value
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value)
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false'
    }
    if (value === null || value === undefined) {
        return fallback
    }
    if (isRecord(value)) {
        try {
            return JSON.stringify(value)
        } catch {
            return fallback
        }
    }
    return fallback
}

function formatTimestamp(value: unknown): string {
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value)
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            })
        }
    }
    return '—'
}

function formatDuration(startValue: unknown, endValue: unknown): string {
    if (typeof startValue === 'number' && typeof endValue === 'number') {
        const diffMs = (endValue - startValue) / 1e6
        if (diffMs < 1000) {
            return `${String(Math.round(diffMs))}ms`
        }
        return (diffMs / 1000).toFixed(2) + 's'
    }

    if (
        (typeof startValue === 'string' || typeof startValue === 'number') &&
        (typeof endValue === 'string' || typeof endValue === 'number')
    ) {
        const startMs = new Date(startValue).getTime()
        const endMs = new Date(endValue).getTime()
        if (!Number.isNaN(startMs) && !Number.isNaN(endMs)) {
            const diffMs = endMs - startMs
            if (diffMs < 1000) {
                return `${String(diffMs)}ms`
            }
            return (diffMs / 1000).toFixed(2) + 's'
        }
    }

    return '—'
}

function traceStatusClass(status: unknown): string {
    return TRACE_STATUS_COLORS[safeString(status, 'unset').toLowerCase()] ??
        TRACE_STATUS_COLORS.unset
}

function getTraceEvents(trace: TraceRecord): TraceRecord[] {
    if (!Array.isArray(trace.events)) {
        return []
    }

    return trace.events.filter(isRecord)
}

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
    const [instructions, setInstructions] = useState('')
    const [isEditingInstructions, setIsEditingInstructions] = useState(false)
    const [selectedTrace, setSelectedTrace] = useState<TraceRecord | null>(null)
    const [traceSheetOpen, setTraceSheetOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<TabKey>('threads')

    // Queries (avoid unsafe destructuring of error-typed values)
    const agentsQuery = useAgents()
    const toolsQuery = useTools()
    const workflowsQuery = useWorkflows()
    const tracesQuery = useTraces({ pagination: { page: 1, perPage: 20 } })
    const threadsQuery = useThreads({ resourceId })
    const vectorStoresQuery = useVectors()
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


    const onRefreshThreads = useCallback(() => {
        void threadsQuery.refetch()
    }, [threadsQuery])

    const agents = agentsQuery.data ?? []
    const loadingAgents = agentsQuery.isLoading

    const tools = useMemo(() => toolsQuery.data ?? [], [toolsQuery.data])
    const loadingTools = toolsQuery.isLoading

    const workflows = useMemo(
        () => workflowsQuery.data ?? [],
        [workflowsQuery.data]
    )
    const loadingWorkflows = workflowsQuery.isLoading

    const tracesRes: unknown = tracesQuery.data
    const loadingTraces = tracesQuery.isLoading
    const traceError = tracesQuery.error

    const threads = threadsQuery.data ?? []
    const loadingThreads = threadsQuery.isLoading

    const workspacesQuery = useWorkspaces()
    const workspaceSkillsQuery = useWorkspaceSkills(resourceId)
    const storedSkillsQuery = useStoredSkills()
    const processorsQuery = useProcessors()
    const scorersQuery = useScorers()

    const workspaceItems = useMemo<WorkspaceRecord[]>(
        () => (workspacesQuery.data ?? []) as WorkspaceRecord[],
        [workspacesQuery.data]
    )
    const workspaceLabels = useMemo(
        () =>
            workspaceItems
                .map((workspace) =>
                    safeString(
                        workspace.name ?? workspace.agentName ?? workspace.id,
                        ''
                    )
                )
                .filter((label) => label.length > 0),
        [workspaceItems]
    )
    const workspaceSkillLabels = useMemo(
        () => normalizeCollection(workspaceSkillsQuery.data),
        [workspaceSkillsQuery.data]
    )
    const storedSkillLabels = useMemo(
        () => normalizeCollection(storedSkillsQuery.data),
        [storedSkillsQuery.data]
    )
    const processorLabels = useMemo(
        () => normalizeCollection(processorsQuery.data),
        [processorsQuery.data]
    )
    const scorerLabels = useMemo(
        () => normalizeCollection(scorersQuery.data),
        [scorersQuery.data]
    )
    const toolLabels = useMemo(() => normalizeCollection(tools), [tools])
    const workflowLabels = useMemo(
        () => normalizeCollection(workflows),
        [workflows]
    )

    const activeWorkspace = useMemo(
        () => workspaceItems.find((workspace) => workspace.id === resourceId) ?? null,
        [resourceId, workspaceItems]
    )
    const preferredVectorStoreName = useMemo(() => {
        const vectorStores = Array.isArray(vectorStoresQuery.data)
            ? vectorStoresQuery.data
            : []
        const vectorNames: string[] = vectorStores
            .map((vectorStore) => {
                if (typeof vectorStore === 'string') {
                    return vectorStore
                }

                if (isRecord(vectorStore)) {
                    return safeString(vectorStore.name ?? vectorStore.id, '')
                }

                return ''
            })
            .filter((name: string) => name.length > 0)

        return (
            vectorNames.find((name) => name === DEFAULT_VECTOR_STORE_NAME) ??
            vectorNames[0] ??
            DEFAULT_VECTOR_STORE_NAME
        )
    }, [vectorStoresQuery.data])
    const vectorsQuery = useVectorIndexes(preferredVectorStoreName)
    const vectors = vectorsQuery.data ?? []
    const loadingVectors = vectorsQuery.isLoading || vectorStoresQuery.isLoading

    const onRefreshVectors = useCallback(() => {
        void Promise.all([vectorStoresQuery.refetch(), vectorsQuery.refetch()])
    }, [vectorStoresQuery, vectorsQuery])

    const workspaceName =
        safeString(
            activeWorkspace?.name ?? activeWorkspace?.agentName ?? activeWorkspace?.id,
            safeString(resourceId, 'Current workspace')
        )


    const memoryStatusRes = memoryStatusQuery.data
    const loadingMemory = memoryStatusQuery.isLoading

    const agentDetails: unknown = agentDetailsQuery.data
    const loadingAgentDetails = agentDetailsQuery.isLoading

    const { mutate: enhanceInstructions, isPending: isEnhancing } =
        useAgentEnhanceInstructionsMutation(selectedAgent)

    const agentInstructions = useMemo(() => {
        if (
            typeof agentDetails !== 'object' ||
            agentDetails === null ||
            !('instructions' in agentDetails)
        ) {
            return ''
        }

        const instructionsValue = (agentDetails as { instructions?: unknown })
            .instructions
        if (typeof instructionsValue === 'string') {
            return instructionsValue
        }
        if (
            typeof instructionsValue === 'object' &&
            instructionsValue !== null &&
            'content' in instructionsValue &&
            typeof (instructionsValue as { content?: unknown }).content === 'string'
        ) {
            return (instructionsValue as { content: string }).content
        }
        return ''
    }, [agentDetails])

    const openInstructionsEditor = useCallback(() => {
        setInstructions(agentInstructions)
        setIsEditingInstructions(true)
    }, [agentInstructions])

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

    const traces = useMemo<TraceRecord[]>(() => {
        const raw: unknown = tracesRes
        if (!isRecord(raw)) {
            return []
        }
        const spans = raw.spans
        return Array.isArray(spans)
            ? spans.filter(isRecord)
            : []
    }, [tracesRes])

    const openTraceDrawer = useCallback((trace: TraceRecord) => {
        setSelectedTrace(trace)
        setTraceSheetOpen(true)
    }, [])

    const memoryStatus = useMemo(() => memoryStatusRes, [memoryStatusRes])

    const handleSaveMemory = useCallback(() => {
        setThreadId(tempThreadId)
        setResourceId(tempResourceId)
    }, [tempThreadId, tempResourceId, setThreadId, setResourceId])

    if (!agentConfig) {
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

    return (
        <aside className="group relative flex h-full w-full flex-col overflow-hidden border-l bg-card/30 shadow-2xl transition-all duration-300 backdrop-blur-3xl">
            {/* Glossy top highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-white/10 pointer-events-none z-10" />
            <div className="absolute inset-0 bg-noise-subtle opacity-[0.03] pointer-events-none" />

            <Tabs
                value={activeTab}
                onValueChange={(v) => { setActiveTab(v as TabKey); }}
                className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
                <div className="shrink-0 border-b border-white/5 bg-white/5 px-4 py-3 backdrop-blur-xl">
                    <TabsList className="grid h-auto w-full grid-cols-4 gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-1.5 shadow-inner no-scrollbar sm:grid-cols-8">
                        <TabsTrigger
                            value="threads"
                            className="group/tab flex flex-col items-center gap-1 rounded-lg border border-transparent py-2 text-[9px] transition-all duration-300 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                        >
                            <MessageSquareIcon className="size-3 group-hover/tab:scale-110 transition-transform duration-300" />
                            <span className="font-semibold tracking-tight opacity-70 group-data-[state=active]:opacity-100">Threads</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="agents"
                            className="group/tab flex flex-col items-center gap-1 rounded-lg border border-transparent py-2 text-[9px] transition-all duration-300 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                        >
                            <BotIcon className="size-3 group-hover/tab:scale-110 transition-transform duration-300" />
                            <span className="font-semibold tracking-tight opacity-70 group-data-[state=active]:opacity-100">Agents</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="tools"
                            className="group/tab flex flex-col items-center gap-1 rounded-lg border border-transparent py-2 text-[9px] transition-all duration-300 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                        >
                            <CpuIcon className="size-3 group-hover/tab:scale-110 transition-transform duration-300" />
                            <span className="font-semibold tracking-tight opacity-70 group-data-[state=active]:opacity-100">Tools</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="workflows"
                            className="group/tab flex flex-col items-center gap-1 rounded-lg border border-transparent py-2 text-[9px] transition-all duration-300 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                        >
                            <WorkflowIcon className="size-3 group-hover/tab:scale-110 transition-transform duration-300" />
                            <span className="font-semibold tracking-tight opacity-70 group-data-[state=active]:opacity-100">Flows</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="traces"
                            className="group/tab flex flex-col items-center gap-1 rounded-lg border border-transparent py-2 text-[9px] transition-all duration-300 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                        >
                            <ActivityIcon className="size-3 group-hover/tab:scale-110 transition-transform duration-300" />
                            <span className="font-semibold tracking-tight opacity-70 group-data-[state=active]:opacity-100">Traces</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="vectors"
                            className="group/tab flex flex-col items-center gap-1 rounded-lg border border-transparent py-2 text-[9px] transition-all duration-300 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                        >
                            <LayersIcon className="size-3 group-hover/tab:scale-110 transition-transform duration-300" />
                            <span className="font-semibold tracking-tight opacity-70 group-data-[state=active]:opacity-100">Vectors</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="memory"
                            className="group/tab flex flex-col items-center gap-1 rounded-lg border border-transparent py-2 text-[9px] transition-all duration-300 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                        >
                            <BrainIcon className="size-3 group-hover/tab:scale-110 transition-transform duration-300" />
                            <span className="font-semibold tracking-tight opacity-70 group-data-[state=active]:opacity-100">Memory</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="config"
                            className="group/tab flex flex-col items-center gap-1 rounded-lg border border-transparent py-2 text-[9px] transition-all duration-300 data-[state=active]:border-primary/20 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                        >
                            <SettingsIcon className="size-3 group-hover/tab:scale-110 transition-transform duration-300" />
                            <span className="font-semibold tracking-tight opacity-70 group-data-[state=active]:opacity-100">Config</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                    <div className="flex min-h-full flex-col">
                    {/* ──── Threads Tab ──── */}
                    <TabsContent
                        value="threads"
                        className="flex flex-col m-0 data-[state=inactive]:hidden"
                    >
                        <div className="space-y-4 p-4">
                            <div className="rounded-2xl border border-white/5 bg-linear-to-br from-primary/10 via-card to-transparent p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <BotIcon className="size-4 text-primary" />
                                            <h3 className="truncate text-sm font-semibold text-foreground">
                                                {agentConfig.name}
                                            </h3>
                                        </div>
                                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                            {agentConfig.description}
                                        </p>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className="font-mono text-[10px] text-muted-foreground"
                                    >
                                        {safeString(agentConfig.id, 'agent')}
                                    </Badge>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Badge
                                        variant="outline"
                                        className="border-primary/20 bg-primary/5 text-[10px] uppercase tracking-wider text-primary"
                                    >
                                        {RUNTIME_AGENT_CATEGORY_LABELS[agentConfig.category]}
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                                        {memoryStatusRes ? 'Memory On' : 'Memory Off'}
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                                        {threads.length} Threads
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                                        {toolLabels.length} Tools
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                                        {workflowLabels.length} Workflows
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                                        {agentConfig.browserTools.length} Browser
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                                        {agentConfig.workspaceTools.length} Workspace
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                                        {agentConfig.skillNames.length} Skills
                                    </Badge>
                                </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                <div className="rounded-xl border border-white/5 bg-card/50 p-3">
                                    <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                        <InfoIcon className="size-3.5 text-primary" />
                                        Workspace
                                    </div>
                                    <div className="space-y-1 text-xs">
                                        <div className="font-medium text-foreground">{workspaceName}</div>
                                        <div className="text-muted-foreground">Resource: {resourceId || '—'}</div>
                                        <div className="text-muted-foreground">Workspaces: {workspaceLabels.length}</div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {workspaceLabels.slice(0, 4).map((label) => (
                                            <Badge key={label} variant="secondary" className="text-[10px]">
                                                {label}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-white/5 bg-card/50 p-3">
                                    <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                        <BrainIcon className="size-3.5 text-primary" />
                                        Skills
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div>
                                            <div className="text-muted-foreground">Workspace skills</div>
                                            <div className="mt-1 flex flex-wrap gap-1.5">
                                                {workspaceSkillLabels.length > 0 ? (
                                                    workspaceSkillLabels.slice(0, 5).map((label) => (
                                                        <Badge key={label} variant="secondary" className="text-[10px]">
                                                            {label}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-muted-foreground">No workspace skills</span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Stored skills</div>
                                            <div className="mt-1 flex flex-wrap gap-1.5">
                                                {storedSkillLabels.length > 0 ? (
                                                    storedSkillLabels.slice(0, 5).map((label) => (
                                                        <Badge key={label} variant="secondary" className="text-[10px]">
                                                            {label}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-muted-foreground">No stored skills</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-white/5 bg-card/50 p-3">
                                    <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                        <CpuIcon className="size-3.5 text-primary" />
                                        Tools
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {toolLabels.length > 0 ? (
                                            toolLabels.slice(0, 10).map((label) => (
                                                <Badge key={label} variant="secondary" className="text-[10px]">
                                                    {label}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground">No tools available</span>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-white/5 bg-card/50 p-3">
                                    <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                        <WorkflowIcon className="size-3.5 text-primary" />
                                        Workflows
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {workflowLabels.length > 0 ? (
                                            workflowLabels.slice(0, 10).map((label) => (
                                                <Badge key={label} variant="secondary" className="text-[10px]">
                                                    {label}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground">No workflows available</span>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-white/5 bg-card/50 p-3">
                                    <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                        <SettingsIcon className="size-3.5 text-primary" />
                                        Processors
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {processorLabels.length > 0 ? (
                                            processorLabels.slice(0, 8).map((label) => (
                                                <Badge key={label} variant="secondary" className="text-[10px]">
                                                    {label}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground">No processors available</span>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-white/5 bg-card/50 p-3">
                                    <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                        <ActivityIcon className="size-3.5 text-primary" />
                                        Scorers
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {scorerLabels.length > 0 ? (
                                            scorerLabels.slice(0, 8).map((label) => (
                                                <Badge key={label} variant="secondary" className="text-[10px]">
                                                    {label}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground">No scorers available</span>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-white/5 bg-card/50 p-3 md:col-span-2 xl:col-span-1">
                                    <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                        <InfoIcon className="size-3.5 text-primary" />
                                        Capabilities
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {features.map((feature) => (
                                            <div
                                                key={feature.id}
                                                className={cn(
                                                    'flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-all duration-300',
                                                    feature.enabled
                                                        ? 'border-primary/20 bg-primary/5 text-primary'
                                                        : 'border-transparent bg-muted/50 text-muted-foreground opacity-60'
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

                                <div className="rounded-xl border border-white/5 bg-card/50 p-3 md:col-span-2 xl:col-span-3">
                                    <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                        <HistoryIcon className="size-3.5 text-primary" />
                                        System Prompt
                                    </div>
                                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-white/5 bg-background/60 p-3 text-xs leading-relaxed text-muted-foreground">
                                        {instructions || 'No agent instructions configured yet.'}
                                    </pre>
                                </div>
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
                                            onClick={() => {
                                                restoreCheckpoint(checkpoint.id)
                                            }}
                                            className="group flex w-full flex-col gap-1 rounded-lg border bg-card p-2 text-left transition-all hover:border-primary/50 hover:shadow-sm"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium truncate">
                                                    {checkpoint.label ??
                                                        `Checkpoint ${String(checkpoint.messageCount)}`}
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
                                            {typeof agent.modelId === 'string' &&
                                                agent.modelId !== '' && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[8px] h-4 px-1"
                                                >
                                                    {agent.modelId}
                                                </Badge>
                                            )}
                                        </div>
                                        {typeof agent.description === 'string' &&
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
                                        {typeof workflow.description === 'string' &&
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
                        ) : traceError ? (
                            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                                Unable to load traces: {safeString(traceError.message)}
                            </div>
                        ) : traces.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No traces available
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {traces.map((trace, idx) => (
                                    <button
                                        key={
                                            safeString(
                                                trace.spanId ?? trace.id ?? idx,
                                                String(idx)
                                            )
                                        }
                                        type="button"
                                        onClick={() => {
                                            openTraceDrawer(trace)
                                        }}
                                        className="group w-full rounded-xl border border-white/5 bg-card/50 p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-lg"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <ActivityIcon className="size-3.5 text-primary" />
                                                    <div className="truncate text-xs font-semibold text-foreground">
                                                        {safeString(trace.name, 'Trace')}
                                                    </div>
                                                </div>
                                                <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground/80">
                                                    {safeString(
                                                        trace.spanId ?? trace.id ?? idx,
                                                        `trace-${String(idx + 1)}`
                                                    )}
                                                </div>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-[10px] uppercase tracking-widest',
                                                    traceStatusClass(trace.status)
                                                )}
                                            >
                                                {safeString(trace.status, 'unset')}
                                            </Badge>
                                        </div>
                                        <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                                            <div>
                                                <div className="uppercase tracking-widest text-muted-foreground/60">
                                                    Duration
                                                </div>
                                                <div className="mt-0.5 font-medium text-foreground">
                                                    {formatDuration(
                                                        trace.startTime ?? trace.startedAt,
                                                        trace.endTime ?? trace.endedAt
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="uppercase tracking-widest text-muted-foreground/60">
                                                    Events
                                                </div>
                                                <div className="mt-0.5 font-medium text-foreground">
                                                    {getTraceEvents(trace).length}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="uppercase tracking-widest text-muted-foreground/60">
                                                    Started
                                                </div>
                                                <div className="mt-0.5 font-medium text-foreground">
                                                    {formatTimestamp(
                                                        trace.startTime ?? trace.startedAt
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
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
                                <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.2em]">
                                    {preferredVectorStoreName}
                                </Badge>
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
                                            {typeof vector.count === 'number' && (
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
                                    { setMemorySearchQuery(e.target.value); }
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
                                        { setTempThreadId(e.target.value); }
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
                                        { setTempResourceId(e.target.value); }
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
                                            { setInstructions(e.target.value); }
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
                                            onClick={openInstructionsEditor}
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
                    </div>
                    <ScrollBar orientation="vertical" />
                </ScrollArea>

                <Sheet
                    open={traceSheetOpen}
                    onOpenChange={(open) => {
                        setTraceSheetOpen(open)
                        if (!open) {
                            setSelectedTrace(null)
                        }
                    }}
                >
                    <SheetContent
                        side="right"
                        className="w-full sm:max-w-xl border-white/5 bg-background/95 backdrop-blur-2xl"
                    >
                        {selectedTrace && (
                            <>
                                <SheetHeader>
                                    <SheetTitle className="text-base font-bold">
                                        {safeString(selectedTrace.name, 'Trace Detail')}
                                    </SheetTitle>
                                    <SheetDescription className="text-xs text-muted-foreground">
                                        Span ID:{' '}
                                        <span className="font-mono">
                                            {safeString(
                                                selectedTrace.spanId ?? selectedTrace.id
                                            )}
                                        </span>
                                    </SheetDescription>
                                </SheetHeader>

                                <ScrollArea className="mt-4 h-[calc(100vh-120px)]">
                                    <div className="space-y-6 pr-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="rounded-lg border border-white/5 bg-card/30 p-3">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                                    Status
                                                </span>
                                                <div className="mt-1">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'text-xs font-bold',
                                                            traceStatusClass(
                                                                selectedTrace.status
                                                            )
                                                        )}
                                                    >
                                                        {safeString(
                                                            selectedTrace.status,
                                                            'unset'
                                                        )}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-white/5 bg-card/30 p-3">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                                    Duration
                                                </span>
                                                <div className="mt-1 text-sm font-bold tabular-nums">
                                                    {formatDuration(
                                                        selectedTrace.startTime ??
                                                            selectedTrace.startedAt,
                                                        selectedTrace.endTime ??
                                                            selectedTrace.endedAt
                                                    )}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-white/5 bg-card/30 p-3">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                                    Started
                                                </span>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    {formatTimestamp(
                                                        selectedTrace.startTime ??
                                                            selectedTrace.startedAt
                                                    )}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-white/5 bg-card/30 p-3">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                                    Ended
                                                </span>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    {formatTimestamp(
                                                        selectedTrace.endTime ??
                                                            selectedTrace.endedAt
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {(safeString(selectedTrace.traceId).length > 0 ||
                                            safeString(selectedTrace.parentSpanId).length > 0) && (
                                            <div className="space-y-2">
                                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                                    Lineage
                                                </h4>
                                                <div className="space-y-1 text-xs">
                                                    {safeString(selectedTrace.traceId).length > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-muted-foreground">
                                                                Trace:
                                                            </span>
                                                            <span className="font-mono text-foreground/80">
                                                                {safeString(selectedTrace.traceId)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {safeString(selectedTrace.parentSpanId).length > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-muted-foreground">
                                                                Parent:
                                                            </span>
                                                            <span className="font-mono text-foreground/80">
                                                                {safeString(
                                                                    selectedTrace.parentSpanId
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <Separator className="bg-white/5" />

                                        <div>
                                            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                                Attributes
                                            </h4>
                                            <CodeBlock
                                                code={JSON.stringify(
                                                    selectedTrace.attributes ??
                                                        selectedTrace,
                                                    null,
                                                    2
                                                )}
                                                language="json"
                                                showLineNumbers
                                            >
                                                <CodeBlockHeader>
                                                    <CodeBlockTitle>
                                                        attributes.json
                                                    </CodeBlockTitle>
                                                    <CodeBlockActions>
                                                        <CodeBlockCopyButton />
                                                    </CodeBlockActions>
                                                </CodeBlockHeader>
                                            </CodeBlock>
                                        </div>

                                        {getTraceEvents(selectedTrace).length > 0 && (
                                            <div className="space-y-3">
                                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                                    Events ({getTraceEvents(selectedTrace).length})
                                                </h4>
                                                <div className="space-y-3">
                                                    {getTraceEvents(selectedTrace).map((event, index) => (
                                                        <div
                                                            key={safeString(
                                                                event.name ?? event.type ?? index,
                                                                `event-${String(index)}`
                                                            )}
                                                            className="rounded-lg border border-white/5 bg-card/30 p-3"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <div className="text-sm font-medium text-foreground">
                                                                        {safeString(
                                                                            event.name ??
                                                                                event.type ??
                                                                                `Event ${String(index + 1)}`,
                                                                                `Event ${String(index + 1)}`
                                                                        )}
                                                                    </div>
                                                                    <div className="mt-1 text-[10px] text-muted-foreground">
                                                                        {formatTimestamp(
                                                                            event.timestamp ??
                                                                                event.time ??
                                                                                event.at
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
                                                                    {safeString(
                                                                        event.type ?? event.kind,
                                                                        'event'
                                                                    )}
                                                                </Badge>
                                                            </div>

                                                            <div className="mt-3 overflow-hidden rounded-md border border-white/5">
                                                                <CodeBlock
                                                                    code={JSON.stringify(event, null, 2)}
                                                                    language="json"
                                                                    showLineNumbers
                                                                >
                                                                    <CodeBlockHeader>
                                                                        <CodeBlockTitle>
                                                                            event-{index + 1}.json
                                                                        </CodeBlockTitle>
                                                                        <CodeBlockActions>
                                                                            <CodeBlockCopyButton />
                                                                        </CodeBlockActions>
                                                                    </CodeBlockHeader>
                                                                </CodeBlock>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </>
                        )}
                    </SheetContent>
                </Sheet>
            </Tabs>
        </aside>
    )
}
