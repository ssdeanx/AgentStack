'use client'

import { Suspense } from 'react'
import { useMemo, useRef, useState } from 'react'

import { ChatPageShell } from '../components/chat-page-shell'
import { ChatProvider } from '../providers/chat-context'
import { MainSidebar } from '../components/main-sidebar'
import { useChatContext } from '../providers/chat-context-hooks'
import {
    useAgents,
    useAwaitBufferStatus,
    useCreateThreadMutation,
    useDeleteThreadMutation,
    useMemoryConfig,
    useMemorySearch,
    useMemoryStatus,
    useObservationalMemory,
    useSaveMessageToMemoryMutation,
    useThreads,
    useUpdateWorkingMemoryMutation,
    useWorkingMemory,
} from '@/lib/hooks/use-mastra-query'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { ScrollArea } from '@/ui/scroll-area'
import { Textarea } from '@/ui/textarea'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/ui/tooltip'
import { Panel } from '@/src/components/ai-elements/panel'
import {
    BrainIcon,
    CircleHelpIcon,
    Loader2Icon,
    PlusIcon,
    SaveIcon,
    SearchIcon,
    PanelRightCloseIcon,
    Trash2Icon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function stringifyValue(value: unknown): string {
    if (typeof value === 'string') {
        return value
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value)
    }

    if (value === null || value === undefined) {
        return '—'
    }

    try {
        return JSON.stringify(value, null, 2)
    } catch {
        return '—'
    }
}

/**
 * Memory control surface for the selected agent and thread.
 */
export default function MemoryPage() {
    return (
        <Suspense fallback={null}>
            <ChatProvider>
                <MemoryContent />
            </ChatProvider>
        </Suspense>
    )
}

function MemoryContent() {
    const { selectedAgent, selectAgent, resourceId, threadId, setThreadId } = useChatContext()
    const agentsResult = useAgents()
    const threadsResult = useThreads({ agentId: selectedAgent })
    const [searchQuery, setSearchQuery] = useState('')
    const [noteDraft, setNoteDraft] = useState('')
    const workingMemoryRef = useRef<HTMLTextAreaElement | null>(null)

    const threads = useMemo(() => threadsResult.data ?? [], [threadsResult.data])
    const activeThreadId =
        threadId ||
        (threads[0] as { id?: string } | undefined)?.id ||
        ''
    const activeResourceId = resourceId || selectedAgent

    const memoryConfigQuery = useMemoryConfig({
        agentId: selectedAgent,
    })
    const memoryStatusQuery = useMemoryStatus(selectedAgent, undefined, {
        resourceId: activeResourceId,
        threadId: activeThreadId || undefined,
    })
    const workingMemoryQuery = useWorkingMemory({
        agentId: selectedAgent,
        threadId: activeThreadId,
        resourceId: activeResourceId,
    })
    const memorySearchQuery = useMemorySearch({
        agentId: selectedAgent,
        resourceId: activeResourceId,
        threadId: activeThreadId || undefined,
        searchQuery,
    })
    const observationalMemoryQuery = useObservationalMemory({
        agentId: selectedAgent,
        threadId: activeThreadId || undefined,
        resourceId: activeResourceId,
    })
    const bufferStatusQuery = useAwaitBufferStatus({
        agentId: selectedAgent,
        threadId: activeThreadId || undefined,
        resourceId: activeResourceId,
    })

    const createThreadMutation = useCreateThreadMutation()
    const updateWorkingMemoryMutation = useUpdateWorkingMemoryMutation()
    const saveMessageToMemoryMutation = useSaveMessageToMemoryMutation()
    const deleteThreadMutation = useDeleteThreadMutation(selectedAgent)
    const [showHelpPanel, setShowHelpPanel] = useState(true)

    const memorySearchResults = useMemo(() => {
        const data = memorySearchQuery.data as unknown
        if (Array.isArray(data)) {
            return data
        }
        if (data && typeof data === 'object' && 'results' in data) {
            const results = (data as { results?: unknown }).results
            return Array.isArray(results) ? results : []
        }
        return []
    }, [memorySearchQuery.data])

    const handleCreateThread = async () => {
        const result = await createThreadMutation.mutateAsync({
            agentId: selectedAgent,
            resourceId: activeResourceId,
            title: `${selectedAgent} memory session`,
            metadata: {
                source: 'memory-center',
            },
        })

        const nextThreadId =
            result && typeof result === 'object' && 'threadId' in result
                ? String((result as { threadId?: string }).threadId ?? '')
                : ''

        if (nextThreadId.length > 0) {
            setThreadId(nextThreadId)
        }
    }

    const handleSaveWorkingMemory = async () => {
        if (!activeThreadId) {
            return
        }

        const workingMemory = workingMemoryRef.current?.value ?? ''

        await updateWorkingMemoryMutation.mutateAsync({
            agentId: selectedAgent,
            resourceId: activeResourceId,
            threadId: activeThreadId,
            workingMemory,
        })
    }

    const handleSaveNote = async () => {
        if (noteDraft.trim().length === 0 || !activeThreadId) {
            return
        }

        await saveMessageToMemoryMutation.mutateAsync({
            agentId: selectedAgent,
            messages: [
                {
                    id: crypto.randomUUID(),
                    content: noteDraft,
                    role: 'user',
                    createdAt: new Date(),
                    threadId: activeThreadId || undefined,
                    resourceId: activeResourceId || undefined,
                    type: 'text',
                },
            ],
        })

        setNoteDraft('')
    }

    const handleDeleteThread = async () => {
        if (!activeThreadId) {
            return
        }

        const confirmed = window.confirm(
            'Delete the selected thread and its memory state? This cannot be undone.'
        )

        if (!confirmed) {
            return
        }

        await deleteThreadMutation.mutateAsync(activeThreadId)
        const nextThread = threads.find((thread) => {
            const nextId = thread.id ?? ''
            return nextId !== activeThreadId
        })

        const nextThreadId = nextThread?.id ?? ''
        setThreadId(nextThreadId)
    }

    return (
        <TooltipProvider delayDuration={150}>
            <ChatPageShell
                title="Memory center"
                description="Inspect memory status, working memory, thread history, and observational memory from one control surface."
                sidebar={<MainSidebar />}
                actions={
                    <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="secondary" className="gap-1 cursor-help">
                                    <BrainIcon className="size-3.5" />
                                    {selectedAgent}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Current agent context for all memory queries.</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowHelpPanel((current) => !current)}
                                    aria-label={showHelpPanel ? 'Hide memory help panel' : 'Show memory help panel'}
                                >
                                    {showHelpPanel ? (
                                        <PanelRightCloseIcon className="size-4" />
                                    ) : (
                                        <CircleHelpIcon className="size-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {showHelpPanel ? 'Hide the memory help panel.' : 'Show the memory help panel.'}
                            </TooltipContent>
                        </Tooltip>
                    </>
                }
            >
                {showHelpPanel ? (
                    <Panel position="top-right" className="pointer-events-auto z-20 w-88">
                        <div className="rounded-3xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold text-foreground">Memory help</div>
                                    <div className="text-xs text-muted-foreground">
                                        Keep thread selection explicit so working memory queries stay valid.
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowHelpPanel(false)}
                                    aria-label="Close memory help panel"
                                >
                                    <PanelRightCloseIcon className="size-4" />
                                </Button>
                            </div>

                            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                                <p>Pick a thread before saving working memory so the hook has a real target.</p>
                                <p>Use the note composer to persist short observations to the active thread.</p>
                                <p>Delete is intentionally guarded and only enables when a thread is selected.</p>
                            </div>
                        </div>
                    </Panel>
                ) : null}

            <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_380px]">
                <Card className="border-border/60 bg-card/80 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Agents</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {agentsResult.isLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2Icon className="size-4 animate-spin" /> Loading agents...
                            </div>
                        ) : (
                            <ScrollArea className="pr-3" style={{ height: 520 }}>
                                <div className="space-y-2">
                                    {(agentsResult.data ?? []).map((agent) => (
                                        <button
                                            key={agent.id}
                                            type="button"
                                            onClick={() => selectAgent(agent.id)}
                                            className={cn(
                                                'w-full rounded-2xl border px-4 py-3 text-left transition-colors',
                                                selectedAgent === agent.id
                                                    ? 'border-primary/30 bg-primary/10 text-foreground'
                                                    : 'border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/60'
                                            )}
                                        >
                                            <div className="text-sm font-medium">{agent.name}</div>
                                            <div className="mt-1 line-clamp-2 text-xs">{agent.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="border-border/60 bg-card/80 shadow-sm">
                            <CardHeader className="flex-row items-center justify-between space-y-0">
                                <div>
                                    <CardTitle className="text-base">Memory status</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Current thread: {activeThreadId || 'No thread selected'}
                                    </p>
                                </div>
                                <Badge variant="secondary">Agent context</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-2xl border border-border/60 bg-background/80 p-3 text-xs whitespace-pre-wrap">
                                    {memoryStatusQuery.isLoading
                                        ? 'Loading memory status…'
                                        : stringifyValue(memoryStatusQuery.data)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border/60 bg-card/80 shadow-sm">
                            <CardHeader className="flex-row items-center justify-between space-y-0">
                                <div>
                                    <CardTitle className="text-base">Buffer + observability</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Buffer status and observational memory signals.
                                    </p>
                                </div>
                                <Badge variant="secondary">Live</Badge>
                            </CardHeader>
                            <CardContent className="space-y-2 text-xs text-muted-foreground">
                                <div className="rounded-2xl border border-border/60 bg-background/80 p-3 whitespace-pre-wrap">
                                    {bufferStatusQuery.isLoading
                                        ? 'Awaiting buffer status…'
                                        : stringifyValue(bufferStatusQuery.data)}
                                </div>
                                <div className="rounded-2xl border border-border/60 bg-background/80 p-3 whitespace-pre-wrap">
                                    {observationalMemoryQuery.isLoading
                                        ? 'Loading observational memory…'
                                        : stringifyValue(observationalMemoryQuery.data)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-border/60 bg-card/80 shadow-sm">
                        <CardHeader className="flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-base">Memory configuration</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Live config for the selected agent and thread.
                                </p>
                            </div>
                            <Badge variant="secondary">{selectedAgent}</Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-2xl border border-border/60 bg-background/80 p-4 text-xs whitespace-pre-wrap">
                                {memoryConfigQuery.isLoading
                                    ? 'Loading memory config…'
                                    : stringifyValue(memoryConfigQuery.data)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-card/80 shadow-sm">
                        <CardHeader className="flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-base">Working memory</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Edit and persist the active thread memory.
                                </p>
                            </div>
                            <Badge variant="secondary">{activeThreadId || 'no thread'}</Badge>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Textarea
                                ref={workingMemoryRef}
                                defaultValue={typeof workingMemoryQuery.data === 'string' ? workingMemoryQuery.data : ''}
                                key={`${selectedAgent}:${activeThreadId || 'no-thread'}`}
                                rows={8}
                                className="resize-none"
                                placeholder={activeThreadId ? 'Working memory content' : 'Select or create a thread to load working memory'}
                                disabled={!activeThreadId}
                            />
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    onClick={() => {
                                        void handleSaveWorkingMemory()
                                    }}
                                    className="gap-2"
                                    disabled={!activeThreadId || updateWorkingMemoryMutation.isPending}
                                >
                                    <SaveIcon className="size-4" />
                                    Save memory
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        void handleCreateThread()
                                    }}
                                    className="gap-2"
                                >
                                    <PlusIcon className="size-4" />
                                    New thread
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        void handleDeleteThread()
                                    }}
                                    className="gap-2"
                                    disabled={!activeThreadId}
                                >
                                    <Trash2Icon className="size-4" />
                                    Delete thread
                                </Button>
                            </div>
                            <div className="rounded-2xl border border-dashed border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
                                {workingMemoryQuery.isLoading
                                    ? 'Loading working memory…'
                                    : stringifyValue(workingMemoryQuery.data)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-card/80 shadow-sm">
                        <CardHeader className="flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-base">Save note to memory</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Persist a note to the selected agent thread.
                                </p>
                            </div>
                            <Badge variant="secondary">Actionable</Badge>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Textarea
                                value={noteDraft}
                                onChange={(event) => {
                                    setNoteDraft(event.target.value)
                                }}
                                rows={4}
                                className="resize-none"
                                placeholder="Capture a memory note"
                            />
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    onClick={() => {
                                        void handleSaveNote()
                                    }}
                                    className="gap-2"
                                    disabled={noteDraft.trim().length === 0 || !activeThreadId}
                                >
                                    <SaveIcon className="size-4" />
                                    Save note
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setNoteDraft('')
                                    }}
                                >
                                    Clear
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-card/80 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">Memory search</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative max-w-xl">
                                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={(event) => {
                                        setSearchQuery(event.target.value)
                                    }}
                                    placeholder="Search memory"
                                    className="pl-9"
                                />
                            </div>

                            <ScrollArea className="pr-3" style={{ height: 260 }}>
                                <div className="space-y-2">
                                    {memorySearchQuery.isLoading ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Loader2Icon className="size-4 animate-spin" /> Searching memory...
                                        </div>
                                    ) : memorySearchResults.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                                            No memory search results found.
                                        </div>
                                    ) : (
                                        memorySearchResults.map((result: unknown, index: number) => (
                                            <div
                                                key={index}
                                                className="rounded-2xl border border-border/60 bg-background/80 p-3 text-xs whitespace-pre-wrap"
                                            >
                                                {stringifyValue(result)}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-border/60 bg-card/80 shadow-sm">
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base">Threads</CardTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                void handleCreateThread()
                            }}
                            className="gap-2"
                        >
                            <PlusIcon className="size-4" />
                            New thread
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="pr-3" style={{ height: 760 }}>
                            <div className="space-y-2">
                                {threads.map((thread: { id?: string; name?: string; title?: string; messageCount?: number }) => {
                                    const nextThreadId = thread.id ?? ''
                                    const fallbackThreadLabel = nextThreadId || 'Untitled thread'
                                    return (
                                        <button
                                            key={nextThreadId}
                                            type="button"
                                            onClick={() => {
                                                if (nextThreadId) {
                                                    setThreadId(nextThreadId)
                                                }
                                            }}
                                            className={cn(
                                                'w-full rounded-2xl border px-4 py-3 text-left transition-colors',
                                                activeThreadId === nextThreadId
                                                    ? 'border-primary/30 bg-primary/10 text-foreground'
                                                    : 'border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/60'
                                            )}
                                        >
                                            <div className="text-sm font-medium">
                                                {thread.title ?? thread.name ?? fallbackThreadLabel}
                                            </div>
                                            <div className="mt-1 text-xs">
                                                {typeof thread.messageCount === 'number'
                                                    ? `${thread.messageCount} message${thread.messageCount === 1 ? '' : 's'}`
                                                    : 'Thread context'}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
            </ChatPageShell>
        </TooltipProvider>
    )
}
