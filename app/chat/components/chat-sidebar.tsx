'use client'

import { useChatContext } from '@/app/chat/providers/chat-context-hooks'
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
    FileTextIcon,
    BrainIcon,
    WorkflowIcon,
    ActivityIcon,
    LayersIcon,
    Loader2Icon,
} from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'
import { CATEGORY_LABELS } from '../config/agents'
import { cn } from '@/lib/utils'

const API_BASE =
    process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111'

// Types for API responses
interface Tool {
    id: string
    name: string
    description?: string
}

interface Workflow {
    id: string
    name: string
    status?: string
}

interface Trace {
    id: string
    name: string
    timestamp: string
    status?: string
}

interface Thread {
    id: string
    resourceId?: string
    createdAt?: string
}

interface VectorIndex {
    name: string
    dimension?: number
    count?: number
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
        selectedModel,
    } = useChatContext()

    const [tempThreadId, setTempThreadId] = useState(threadId)
    const [tempResourceId, setTempResourceId] = useState(resourceId)
    const [memorySearchQuery, setMemorySearchQuery] = useState('')

    // Data states for each tab
    const [tools, setTools] = useState<Tool[]>([])
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [traces, setTraces] = useState<Trace[]>([])
    const [threads, setThreads] = useState<Thread[]>([])
    const [vectors, setVectors] = useState<VectorIndex[]>([])

    // Loading states
    const [loading, setLoading] = useState<Record<string, boolean>>({})
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Fetch data functions
    const fetchTools = useCallback(async () => {
        setLoading((l) => ({ ...l, tools: true }))
        setErrors((e) => ({ ...e, tools: '' }))
        try {
            const res = await fetch(`${API_BASE}/api/tools`)
            if (res.ok) {
                const data = await res.json()
                setTools(Array.isArray(data) ? data : data.tools || [])
            }
        } catch (err) {
            setErrors((e) => ({ ...e, tools: 'Failed to load tools' }))
        } finally {
            setLoading((l) => ({ ...l, tools: false }))
        }
    }, [])

    const fetchWorkflows = useCallback(async () => {
        setLoading((l) => ({ ...l, workflows: true }))
        setErrors((e) => ({ ...e, workflows: '' }))
        try {
            const res = await fetch(`${API_BASE}/api/workflows`)
            if (res.ok) {
                const data = await res.json()
                setWorkflows(Array.isArray(data) ? data : data.workflows || [])
            }
        } catch (err) {
            setErrors((e) => ({ ...e, workflows: 'Failed to load workflows' }))
        } finally {
            setLoading((l) => ({ ...l, workflows: false }))
        }
    }, [])

    const fetchTraces = useCallback(async () => {
        setLoading((l) => ({ ...l, traces: true }))
        setErrors((e) => ({ ...e, traces: '' }))
        try {
            const res = await fetch(`${API_BASE}/api/traces?limit=20`)
            if (res.ok) {
                const data = await res.json()
                setTraces(Array.isArray(data) ? data : data.traces || [])
            }
        } catch (err) {
            setErrors((e) => ({ ...e, traces: 'Failed to load traces' }))
        } finally {
            setLoading((l) => ({ ...l, traces: false }))
        }
    }, [])

    const fetchThreads = useCallback(async () => {
        setLoading((l) => ({ ...l, threads: true }))
        setErrors((e) => ({ ...e, threads: '' }))
        try {
            const res = await fetch(
                `${API_BASE}/api/memory/threads?resourceId=${resourceId || ''}`
            )
            if (res.ok) {
                const data = await res.json()
                setThreads(Array.isArray(data) ? data : data.threads || [])
            }
        } catch (err) {
            setErrors((e) => ({ ...e, threads: 'Failed to load threads' }))
        } finally {
            setLoading((l) => ({ ...l, threads: false }))
        }
    }, [resourceId])

    const fetchVectors = useCallback(async () => {
        setLoading((l) => ({ ...l, vectors: true }))
        setErrors((e) => ({ ...e, vectors: '' }))
        try {
            const res = await fetch(`${API_BASE}/api/vectors`)
            if (res.ok) {
                const data = await res.json()
                setVectors(Array.isArray(data) ? data : data.indexes || [])
            }
        } catch (err) {
            setErrors((e) => ({ ...e, vectors: 'Failed to load vectors' }))
        } finally {
            setLoading((l) => ({ ...l, vectors: false }))
        }
    }, [])

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
        <aside className="flex h-full w-80 flex-col border-l glass responsive-card overflow-y-auto noise">
            {/* Tabs Section - 6 tabs */}
            <Tabs defaultValue="threads" className="flex flex-col flex-1">
                <div className="p-4 border-b">
                    <TabsList className="w-full grid grid-cols-3 gap-1">
                        <TabsTrigger
                            value="threads"
                            className="flex items-center gap-1 text-xs"
                        >
                            <MessageSquareIcon className="size-3" />
                            Threads
                        </TabsTrigger>
                        <TabsTrigger
                            value="tools"
                            className="flex items-center gap-1 text-xs"
                        >
                            <CpuIcon className="size-3" />
                            Tools
                        </TabsTrigger>
                        <TabsTrigger
                            value="workflows"
                            className="flex items-center gap-1 text-xs"
                        >
                            <WorkflowIcon className="size-3" />
                            Workflows
                        </TabsTrigger>
                        <TabsTrigger
                            value="traces"
                            className="flex items-center gap-1 text-xs"
                        >
                            <ActivityIcon className="size-3" />
                            Traces
                        </TabsTrigger>
                        <TabsTrigger
                            value="vectors"
                            className="flex items-center gap-1 text-xs"
                        >
                            <LayersIcon className="size-3" />
                            Vectors
                        </TabsTrigger>
                        <TabsTrigger
                            value="memory"
                            className="flex items-center gap-1 text-xs"
                        >
                            <BrainIcon className="size-3" />
                            Memory
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Threads Tab */}
                <TabsContent
                    value="threads"
                    className="flex flex-col flex-1 m-0 overflow-y-auto"
                >
                    {/* Agent Info Section */}
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

                    {/* Features Section */}
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

                    {/* Checkpoints Section */}
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
                    </div>
                </TabsContent>

                {/* Tools Tab */}
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
                                onClick={fetchTools}
                                className="h-7 text-xs"
                            >
                                {loading.tools ? (
                                    <Loader2Icon className="size-3 animate-spin" />
                                ) : (
                                    'Refresh'
                                )}
                            </Button>
                        </div>

                        {errors.tools && (
                            <p className="text-xs text-red-500 mb-2">
                                {errors.tools}
                            </p>
                        )}

                        {loading.tools ? (
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
                                            {tool.name}
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

                {/* Workflows Tab */}
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
                                onClick={fetchWorkflows}
                                className="h-7 text-xs"
                            >
                                {loading.workflows ? (
                                    <Loader2Icon className="size-3 animate-spin" />
                                ) : (
                                    'Refresh'
                                )}
                            </Button>
                        </div>

                        {errors.workflows && (
                            <p className="text-xs text-red-500 mb-2">
                                {errors.workflows}
                            </p>
                        )}

                        {loading.workflows ? (
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
                                        key={workflow.id}
                                        className="rounded-md border bg-card p-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium">
                                                {workflow.name}
                                            </span>
                                            {workflow.status && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[8px] h-5"
                                                >
                                                    {workflow.status}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Traces Tab */}
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
                                onClick={fetchTraces}
                                className="h-7 text-xs"
                            >
                                {loading.traces ? (
                                    <Loader2Icon className="size-3 animate-spin" />
                                ) : (
                                    'Refresh'
                                )}
                            </Button>
                        </div>

                        {errors.traces && (
                            <p className="text-xs text-red-500 mb-2">
                                {errors.traces}
                            </p>
                        )}

                        {loading.traces ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : traces.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No traces available
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {traces.map((trace) => (
                                    <div
                                        key={trace.id}
                                        className="rounded-md border bg-card p-2"
                                    >
                                        <div className="text-xs font-medium truncate">
                                            {trace.name}
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-[10px] text-muted-foreground">
                                                {new Date(
                                                    trace.timestamp
                                                ).toLocaleString()}
                                            </span>
                                            {trace.status && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[8px] h-5"
                                                >
                                                    {trace.status}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Vectors Tab */}
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
                                onClick={fetchVectors}
                                className="h-7 text-xs"
                            >
                                {loading.vectors ? (
                                    <Loader2Icon className="size-3 animate-spin" />
                                ) : (
                                    'Refresh'
                                )}
                            </Button>
                        </div>

                        {errors.vectors && (
                            <p className="text-xs text-red-500 mb-2">
                                {errors.vectors}
                            </p>
                        )}

                        {loading.vectors ? (
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

                {/* Memory Tab */}
                <TabsContent
                    value="memory"
                    className="flex flex-col flex-1 m-0 overflow-y-auto"
                >
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <BrainIcon className="size-4 text-primary" />
                            <h3 className="font-semibold text-sm">
                                Memory Search
                            </h3>
                        </div>

                        {/* Search Input */}
                        <div className="space-y-3">
                            <div className="relative">
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
                                        Search functionality would query the
                                        vector store for memories matching:{' '}
                                        <span className="font-medium text-foreground">
                                            "{memorySearchQuery}"
                                        </span>
                                    </p>
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground">
                                    Enter a search query to find relevant
                                    memories from the vector store.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Memory Settings Section */}
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
                                    <HashIcon className="size-3" />
                                    Thread ID
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
                                    <UserIcon className="size-3" />
                                    Resource ID
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
                                <DatabaseIcon className="size-3" />
                                Update Memory
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </aside>
    )
}
