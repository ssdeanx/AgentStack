'use client'

import { useState, useMemo, useCallback } from 'react'
import {
    useCreateDatasetMutation,
    useAddDatasetItemMutation,
    useBatchDeleteDatasetItemsMutation,
    useBatchInsertDatasetItemsMutation,
    useClusterFailuresMutation,
    useDatasetExperimentResults,
    useDatasetExperiments,
    useDatasetItem,
    useDatasetItemHistory,
    useDatasetItems,
    useDatasets,
    useDeleteDatasetMutation,
    useDeleteDatasetItemMutation,
    useGenerateDatasetItemsMutation,
    useUpdateDatasetItemMutation,
    useUpdateDatasetMutation,
    useUpdateExperimentResultMutation,
} from '@/lib/hooks/use-mastra-query'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Textarea } from '@/ui/textarea'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/ui/tooltip'
import { ChatPageShell } from '../components/chat-page-shell'
import { MainSidebar } from '../components/main-sidebar'
import { ChatProvider } from '../providers/chat-context'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs'
import { ScrollArea } from '@/ui/scroll-area'
import { Skeleton } from '@/ui/skeleton'
import {
    Artifact,
    ArtifactAction,
    ArtifactActions,
    ArtifactContent,
    ArtifactDescription,
    ArtifactHeader,
    ArtifactTitle,
} from '@/src/components/ai-elements/artifact'
import {
    CodeBlock,
    CodeBlockHeader,
    CodeBlockTitle,
    CodeBlockActions,
    CodeBlockCopyButton,
} from '@/src/components/ai-elements/code-block'
import {
    DatabaseIcon,
    PlusIcon,
    Trash2Icon,
    SearchIcon,
    RefreshCwIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    Loader2Icon,
    FlaskConicalIcon,
    HistoryIcon,
    FileTextIcon,
    ChevronDownIcon,
    CalendarIcon,
    PackageIcon,
    InfoIcon,
    PanelRightCloseIcon,
    PanelRightOpenIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/ui/collapsible'
import { Panel } from '@/src/components/ai-elements/panel'

type AnyRecord = Record<string, unknown>
type ClusterFailureItem = {
    id: string
    input: unknown
    output?: unknown
    error?: string
    scores?: Record<string, number>
    existingTags?: string[]
}

function formatDate(dateStr: unknown): string {
    if (dateStr === null || dateStr === undefined) {
        return '—'
    }
    if (typeof dateStr !== 'string' && typeof dateStr !== 'number' && !(dateStr instanceof Date)) {
        return '—'
    }
    try {
        const date =
            dateStr instanceof Date ? dateStr : new Date(typeof dateStr === 'number' ? dateStr : String(dateStr))
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    } catch {
        return typeof dateStr === 'string' ? dateStr : '—'
    }
}

function safeStr(value: unknown, fallback = ''): string {
    if (typeof value === 'string' && value.length > 0) {
        return value
    }
    return fallback
}

function truncateJson(value: unknown, maxLen = 100): string {
    try {
        const str = JSON.stringify(value)
        if (str.length <= maxLen) {
            return str
        }
        return str.slice(0, maxLen) + '…'
    } catch {
        return String(value)
    }
}

function parseJsonField(value: string): unknown {
    const trimmed = value.trim()
    if (!trimmed) {
        return undefined
    }

    try {
        return JSON.parse(trimmed)
    } catch {
        return trimmed
    }
}

export default function DatasetPage() {
    const [showHelpPanel, setShowHelpPanel] = useState(true)
    const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(
        null
    )
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newName, setNewName] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [itemSearch, setItemSearch] = useState('')
    const [itemPage, setItemPage] = useState(1)
    const [activeTab, setActiveTab] = useState('items')
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
    const [selectedExperimentId, setSelectedExperimentId] = useState<
        string | null
    >(null)
    const [selectedItemId, setSelectedItemId] = useState('')
    const [datasetNameDraft, setDatasetNameDraft] = useState('')
    const [datasetDescriptionDraft, setDatasetDescriptionDraft] = useState('')
    const [datasetTagsDraft, setDatasetTagsDraft] = useState('')
    const [itemInputDraft, setItemInputDraft] = useState('')
    const [itemGroundTruthDraft, setItemGroundTruthDraft] = useState('')
    const [itemRequestContextDraft, setItemRequestContextDraft] = useState('')
    const [itemMetadataDraft, setItemMetadataDraft] = useState('')
    const [batchItemsDraft, setBatchItemsDraft] = useState('')
    const [batchDeleteIdsDraft, setBatchDeleteIdsDraft] = useState('')
    const [generateModelId, setGenerateModelId] = useState('')
    const [generatePrompt, setGeneratePrompt] = useState('')
    const [generateCount, setGenerateCount] = useState('3')
    const [clusterModelId, setClusterModelId] = useState('')
    const [clusterPrompt, setClusterPrompt] = useState('Cluster the current failures')
    const [clusterItemsDraft, setClusterItemsDraft] = useState('[]')
    const [clusterAvailableTagsDraft, setClusterAvailableTagsDraft] = useState('')
    const [experimentResultStatusDraft, setExperimentResultStatusDraft] = useState('needs-review')
    const [experimentResultIdDraft, setExperimentResultIdDraft] = useState('')

    const itemsPerPage = 25

    const datasetsResult = useDatasets()
    const datasets = useMemo<AnyRecord[]>(() => {
        const data: unknown = datasetsResult.data
        if (data === null || data === undefined || typeof data !== 'object') {
            return []
        }
        const { datasets: ds } = data as { datasets?: unknown }
        if (Array.isArray(ds)) {
            return ds as AnyRecord[]
        }
        return []
    }, [datasetsResult.data])

    const filteredDatasets = useMemo(() => {
        if (!searchQuery.trim()) return datasets
        const q = searchQuery.toLowerCase()
        return datasets.filter((ds) => {
            const name = safeStr(ds.name).toLowerCase()
            const desc = safeStr(ds.description).toLowerCase()
            return name.includes(q) || desc.includes(q)
        })
    }, [datasets, searchQuery])

    const datasetItemsResult = useDatasetItems(selectedDatasetId ?? '', {})
    const allItems = useMemo<AnyRecord[]>(() => {
        const data: unknown = datasetItemsResult.data
        if (data === null || data === undefined || typeof data !== 'object') {
            return []
        }
        const { items } = data as { items?: unknown }
        if (Array.isArray(items)) {
            return items as AnyRecord[]
        }
        return []
    }, [datasetItemsResult.data])

    const filteredItems = useMemo(() => {
        if (!itemSearch.trim()) {
            return allItems
        }
        const q = itemSearch.toLowerCase()
        return allItems.filter((item) => {
            const input = truncateJson(item.input, 500).toLowerCase()
            const expected = truncateJson(item.expectedOutput ?? item.expected, 500).toLowerCase()
            return input.includes(q) || expected.includes(q)
        })
    }, [allItems, itemSearch])

    const paginatedItems = useMemo(() => {
        const start = (itemPage - 1) * itemsPerPage
        return filteredItems.slice(start, start + itemsPerPage)
    }, [filteredItems, itemPage])

    const experimentsResult = useDatasetExperiments(selectedDatasetId ?? '')
    const experiments = useMemo<AnyRecord[]>(() => {
        const data: unknown = experimentsResult.data
        if (Array.isArray(data)) {
            return data as AnyRecord[]
        }
        if (data !== null && data !== undefined && typeof data === 'object' && 'experiments' in data) {
            const e = (data as { experiments?: unknown }).experiments
            if (Array.isArray(e)) {
                return e as AnyRecord[]
            }
        }
        return []
    }, [experimentsResult.data])

    const experimentResultsData = useDatasetExperimentResults(
        selectedDatasetId ?? '',
        selectedExperimentId ?? ''
    )
    const experimentResults = useMemo<AnyRecord[]>(() => {
        const data: unknown = experimentResultsData.data
        if (Array.isArray(data)) {
            return data as AnyRecord[]
        }
        if (data !== null && data !== undefined && typeof data === 'object' && 'results' in data) {
            const r = (data as { results?: unknown }).results
            if (Array.isArray(r)) {
                return r as AnyRecord[]
            }
        }
        return []
    }, [experimentResultsData.data])

    const updateDatasetMutation = useUpdateDatasetMutation()
    const addDatasetItemMutation = useAddDatasetItemMutation()
    const updateDatasetItemMutation = useUpdateDatasetItemMutation()
    const deleteDatasetItemMutation = useDeleteDatasetItemMutation()
    const batchInsertDatasetItemsMutation = useBatchInsertDatasetItemsMutation()
    const batchDeleteDatasetItemsMutation = useBatchDeleteDatasetItemsMutation()
    const generateDatasetItemsMutation = useGenerateDatasetItemsMutation()
    const clusterFailuresMutation = useClusterFailuresMutation()
    const updateExperimentResultMutation = useUpdateExperimentResultMutation()

    const selectedItemResult = useDatasetItem(selectedDatasetId ?? '', selectedItemId)
    const selectedItemHistoryResult = useDatasetItemHistory(selectedDatasetId ?? '', selectedItemId)

    const createMutation = useCreateDatasetMutation()
    const deleteMutation = useDeleteDatasetMutation()

    const handleCreate = useCallback(() => {
        if (!newName.trim()) {
            return
        }
        createMutation.mutate(
            { name: newName, description: newDescription },
            {
                onSuccess: () => {
                    setIsCreateOpen(false)
                    setNewName('')
                    setNewDescription('')
                    void datasetsResult.refetch()
                },
            }
        )
    }, [newName, newDescription, createMutation, datasetsResult])

    const handleDelete = useCallback(
        (datasetId: string) => {
            deleteMutation.mutate(datasetId, {
                onSuccess: () => {
                    if (selectedDatasetId === datasetId) {
                        setSelectedDatasetId(null)
                    }
                    void datasetsResult.refetch()
                },
            })
        },
        [deleteMutation, selectedDatasetId, datasetsResult]
    )

    const toggleItem = (idx: number) => {
        setExpandedItems((prev) => {
            const next = new Set(prev)
            if (next.has(idx)) {
                next.delete(idx)
            } else {
                next.add(idx)
            }
            return next
        })
    }

    const selectedDataset = datasets.find(
        (ds) => safeStr(ds.id) === selectedDatasetId
    )

    return (
        <ChatProvider>
            <ChatPageShell
                title="Datasets"
                description="Manage datasets, items, and experiment data from the shared chat shell."
                sidebar={<MainSidebar />}
                hideHeader
                contentClassName="p-0"
            >
        <TooltipProvider delayDuration={150}>
            <div className="relative flex h-full min-h-0 gap-0">
                {showHelpPanel ? (
                    <Panel position="top-right" className="pointer-events-auto z-20 w-88">
                        <div className="rounded-3xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold text-foreground">Dataset studio help</div>
                                    <div className="text-xs text-muted-foreground">
                                        Quick tips for managing datasets and item workflows.
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowHelpPanel(false)}
                                    aria-label="Close dataset help panel"
                                >
                                    <PanelRightCloseIcon className="size-4" />
                                </Button>
                            </div>

                            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                                <p>Create or update datasets on the left, then switch to Items, Experiments, or Reviews to continue.</p>
                                <p>Selected item previews are rendered as code so they can be copied and edited quickly.</p>
                                <p>Use the toolbar refresh actions if the list or item details feel stale after a mutation.</p>
                            </div>
                        </div>
                    </Panel>
                ) : null}
            {/* Left Panel: Dataset List */}
            <div className="w-[320px] min-w-70 flex flex-col border-r border-white/5 bg-card/20">
                <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <DatabaseIcon className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight">
                                Datasets
                            </h1>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <p className="text-[10px] text-muted-foreground cursor-help">
                                        {datasets.length} datasets
                                    </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                    All datasets currently returned by the live query.
                                </TooltipContent>
                            </Tooltip>
                        <div className="ml-auto flex items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        onClick={() => setShowHelpPanel((current) => !current)}
                                        aria-label={showHelpPanel ? 'Hide dataset help' : 'Show dataset help'}
                                    >
                                        {showHelpPanel ? (
                                            <PanelRightCloseIcon className="size-4" />
                                        ) : (
                                            <PanelRightOpenIcon className="size-4" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {showHelpPanel ? 'Hide the dataset help panel.' : 'Show the dataset help panel.'}
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="inline-flex items-center text-muted-foreground cursor-help">
                                        <InfoIcon className="size-4" />
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Help panel explains dataset editing, item management, and review actions.
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search datasets..."
                                className="pl-8 h-8 text-xs bg-card/50 border-white/10"
                            />
                        </div>
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="h-8 w-8 p-0">
                                            <PlusIcon className="size-4" />
                                        </Button>
                                    </DialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Create a new dataset and begin adding items.
                                </TooltipContent>
                            </Tooltip>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Create Dataset</DialogTitle>
                                    <DialogDescription>
                                        Create a new dataset for evaluation
                                        data.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <label className="text-sm font-medium">
                                            Name
                                        </label>
                                        <Input
                                            value={newName}
                                            onChange={(e) =>
                                                setNewName(e.target.value)
                                            }
                                            placeholder="my-evaluation-dataset"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-sm font-medium">
                                            Description
                                        </label>
                                        <Textarea
                                            value={newDescription}
                                            onChange={(e) =>
                                                setNewDescription(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Dataset description..."
                                            className="min-h-20"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        onClick={handleCreate}
                                        disabled={
                                            !newName.trim() ||
                                            createMutation.isPending
                                        }
                                    >
                                        {createMutation.isPending && (
                                            <Loader2Icon className="size-4 animate-spin mr-2" />
                                        )}
                                        Create
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    {datasetsResult.isLoading ? (
                        <div className="p-4 space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton
                                    key={`skel-${i}`}
                                    className="h-16 w-full"
                                />
                            ))}
                        </div>
                    ) : filteredDatasets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                            <DatabaseIcon className="size-10 text-muted-foreground/20 mb-2" />
                            <p className="text-sm text-muted-foreground">
                                No datasets
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                                Create one to get started
                            </p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredDatasets.map((ds) => {
                                const id = safeStr(ds.id)
                                const isSelected = selectedDatasetId === id
                                return (
                                    <button
                                        key={id}
                                        onClick={() => {
                                            setSelectedDatasetId(id)
                                            setActiveTab('items')
                                            setItemPage(1)
                                            setExpandedItems(new Set())
                                        }}
                                        className={cn(
                                            'w-full text-left rounded-lg p-3 transition-all duration-200 group',
                                            isSelected
                                                ? 'bg-primary/10 border border-primary/20'
                                                : 'hover:bg-white/5 border border-transparent'
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">
                                                    {safeStr(
                                                        ds.name,
                                                        'Untitled'
                                                    )}
                                                </p>
                                                {typeof ds.description === 'string' && ds.description.length > 0 && (
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                                                        {ds.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    {ds.createdAt !== null && ds.createdAt !== undefined && (
                                                        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                                                            <CalendarIcon className="size-3" />
                                                            {formatDate(
                                                                ds.createdAt
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDelete(id)
                                                }}
                                            >
                                                <Trash2Icon className="size-3" />
                                            </Button>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Right Panel: Dataset Detail */}
            <div className="flex-1 min-w-0 flex flex-col">
                {selectedDatasetId === null ? (
                    <div className="flex-1 flex items-center justify-center text-center">
                        <div>
                            <DatabaseIcon className="size-16 text-muted-foreground/10 mx-auto mb-4" />
                            <p className="text-lg font-medium text-muted-foreground/50">
                                Select a dataset
                            </p>
                            <p className="text-xs text-muted-foreground/30 mt-1">
                                Choose a dataset from the left to view items,
                                experiments, and versions
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Dataset Header */}
                        <div className="p-6 border-b border-white/5">
                                        <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold">
                                        {safeStr(
                                            selectedDataset?.name,
                                            'Dataset'
                                        )}
                                    </h2>
                                    {typeof selectedDataset?.description === 'string' && selectedDataset.description.length > 0 && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {selectedDataset.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="outline" className="text-xs cursor-help">
                                                            <PackageIcon className="size-3 mr-1" />
                                                            {allItems.length} items
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Total items loaded for the currently selected dataset.
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                void datasetItemsResult.refetch()
                                                                void experimentsResult.refetch()
                                                            }}
                                                            className="gap-1.5"
                                                        >
                                                            <RefreshCwIcon className="size-3.5" />
                                                            Refresh
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Refresh dataset items and experiment data from the server.
                                                    </TooltipContent>
                                                </Tooltip>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 pt-5">
                            <div className="rounded-xl border border-white/5 bg-card/30 backdrop-blur-xl p-4 space-y-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-semibold">Dataset studio</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Manage dataset metadata, items, generation, clustering, and experiment reviews.
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        {selectedDataset?.version ? `v${selectedDataset.version}` : 'unversioned'}
                                    </Badge>
                                </div>

                                <div className="grid gap-4 xl:grid-cols-2">
                                        <div className="space-y-3 rounded-lg border border-white/5 bg-background/40 p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Dataset settings</h4>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={() => {
                                                                if (!selectedDatasetId) return
                                                                updateDatasetMutation.mutate({
                                                                    datasetId: selectedDatasetId,
                                                                    name: datasetNameDraft.trim() || undefined,
                                                                    description: datasetDescriptionDraft.trim() || undefined,
                                                                    tags: datasetTagsDraft
                                                                        .split(',')
                                                                        .map((tag) => tag.trim())
                                                                        .filter(Boolean),
                                                                })
                                                            }}
                                                            disabled={!selectedDatasetId || updateDatasetMutation.isPending}
                                                        >
                                                            Update dataset
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Save the metadata changes for the selected dataset.
                                                    </TooltipContent>
                                                </Tooltip>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <label className="text-xs text-muted-foreground">Name</label>
                                                <Input value={datasetNameDraft} onChange={(e) => setDatasetNameDraft(e.target.value)} placeholder={safeStr(selectedDataset?.name, 'Dataset name')} />
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-xs text-muted-foreground">Tags</label>
                                                <Input value={datasetTagsDraft} onChange={(e) => setDatasetTagsDraft(e.target.value)} placeholder="tag-a, tag-b" />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <label className="text-xs text-muted-foreground">Description</label>
                                            <Textarea value={datasetDescriptionDraft} onChange={(e) => setDatasetDescriptionDraft(e.target.value)} placeholder={safeStr(selectedDataset?.description, 'Dataset description')} className="min-h-20" />
                                        </div>
                                    </div>

                                    <div className="space-y-3 rounded-lg border border-white/5 bg-background/40 p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Add item</h4>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            if (!selectedDatasetId) return
                                                            addDatasetItemMutation.mutate({
                                                                datasetId: selectedDatasetId,
                                                                input: parseJsonField(itemInputDraft),
                                                                groundTruth: parseJsonField(itemGroundTruthDraft),
                                                                requestContext: (parseJsonField(itemRequestContextDraft) as Record<string, unknown> | undefined) ?? undefined,
                                                                metadata: (parseJsonField(itemMetadataDraft) as Record<string, unknown> | undefined) ?? undefined,
                                                            })
                                                        }}
                                                        disabled={!selectedDatasetId || addDatasetItemMutation.isPending}
                                                    >
                                                        Add item
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Add a new item using the JSON payloads above.
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <div className="grid gap-2">
                                            <label className="text-xs text-muted-foreground">Input JSON</label>
                                            <Textarea value={itemInputDraft} onChange={(e) => setItemInputDraft(e.target.value)} placeholder='{"prompt":"hello"}' className="min-h-24 font-mono text-xs" />
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <label className="text-xs text-muted-foreground">Ground truth</label>
                                                <Textarea value={itemGroundTruthDraft} onChange={(e) => setItemGroundTruthDraft(e.target.value)} placeholder='{"answer":"world"}' className="min-h-20 font-mono text-xs" />
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-xs text-muted-foreground">Metadata</label>
                                                <Textarea value={itemMetadataDraft} onChange={(e) => setItemMetadataDraft(e.target.value)} placeholder='{"source":"manual"}' className="min-h-20 font-mono text-xs" />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <label className="text-xs text-muted-foreground">Request context</label>
                                            <Textarea value={itemRequestContextDraft} onChange={(e) => setItemRequestContextDraft(e.target.value)} placeholder='{"userId":"123"}' className="min-h-16 font-mono text-xs" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 xl:grid-cols-2">
                                    <div className="space-y-3 rounded-lg border border-white/5 bg-background/40 p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Edit selected item</h4>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            if (!selectedDatasetId || !selectedItemId) return
                                                            updateDatasetItemMutation.mutate({
                                                                datasetId: selectedDatasetId,
                                                                itemId: selectedItemId,
                                                                input: parseJsonField(itemInputDraft),
                                                                groundTruth: parseJsonField(itemGroundTruthDraft),
                                                                requestContext: (parseJsonField(itemRequestContextDraft) as Record<string, unknown> | undefined) ?? undefined,
                                                                metadata: (parseJsonField(itemMetadataDraft) as Record<string, unknown> | undefined) ?? undefined,
                                                            })
                                                        }}
                                                        disabled={!selectedDatasetId || !selectedItemId || updateDatasetItemMutation.isPending}
                                                    >
                                                        Update item
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Save the current item draft back to the dataset.
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <label className="text-xs text-muted-foreground">Item ID</label>
                                                <Input value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} placeholder="item-id" />
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-xs text-muted-foreground">Source</label>
                                                <Input value={selectedItemResult.data?.source ? String(selectedItemResult.data.source) : ''} readOnly placeholder="source" />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => {
                                                            if (!selectedDatasetId || !selectedItemId) return
                                                            deleteDatasetItemMutation.mutate({ datasetId: selectedDatasetId, itemId: selectedItemId })
                                                        }}
                                                        disabled={!selectedDatasetId || !selectedItemId || deleteDatasetItemMutation.isPending}
                                                    >
                                                        Delete item
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Remove the selected item from the dataset.
                                                </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setItemInputDraft(JSON.stringify(selectedItemResult.data?.input ?? null, null, 2))
                                                            setItemGroundTruthDraft(JSON.stringify(selectedItemResult.data?.groundTruth ?? null, null, 2))
                                                            setItemRequestContextDraft(JSON.stringify(selectedItemResult.data?.requestContext ?? null, null, 2))
                                                            setItemMetadataDraft(JSON.stringify(selectedItemResult.data?.metadata ?? null, null, 2))
                                                        }}
                                                        disabled={!selectedItemResult.data}
                                                    >
                                                        Load item
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Populate the editor with the selected item’s current values.
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        {selectedItemResult.data ? (
                                            <Artifact>
                                                <ArtifactHeader>
                                                    <div className="min-w-0">
                                                        <ArtifactTitle className="truncate">selected-item.json</ArtifactTitle>
                                                        <ArtifactDescription className="truncate">
                                                            Code-display preview for the currently selected dataset item.
                                                        </ArtifactDescription>
                                                    </div>
                                                    <ArtifactActions>
                                                        <ArtifactAction
                                                            tooltip="Copy item JSON"
                                                            label="Copy selected item JSON"
                                                            onClick={() => {
                                                                void navigator.clipboard.writeText(JSON.stringify(selectedItemResult.data, null, 2))
                                                            }}
                                                        />
                                                    </ArtifactActions>
                                                </ArtifactHeader>
                                                <ArtifactContent>
                                                    <CodeBlock code={JSON.stringify(selectedItemResult.data, null, 2)} language="json" showLineNumbers>
                                                        <CodeBlockHeader>
                                                            <CodeBlockTitle>selected-item.json</CodeBlockTitle>
                                                            <CodeBlockActions>
                                                                <CodeBlockCopyButton />
                                                            </CodeBlockActions>
                                                        </CodeBlockHeader>
                                                    </CodeBlock>
                                                </ArtifactContent>
                                            </Artifact>
                                        ) : null}
                                        {selectedItemHistoryResult.data ? (
                                            <div className="text-xs text-muted-foreground">
                                                History entries: {Array.isArray((selectedItemHistoryResult.data as AnyRecord)?.history) ? ((selectedItemHistoryResult.data as AnyRecord).history as AnyRecord[]).length : 0}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="space-y-3 rounded-lg border border-white/5 bg-background/40 p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Bulk, generate, cluster, review</h4>
                                            <Badge variant="outline" className="text-[10px]">hooks live</Badge>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <label className="text-xs text-muted-foreground">Batch delete IDs</label>
                                                <Input value={batchDeleteIdsDraft} onChange={(e) => setBatchDeleteIdsDraft(e.target.value)} placeholder="id-a, id-b" />
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-xs text-muted-foreground">Generate count</label>
                                                <Input value={generateCount} onChange={(e) => setGenerateCount(e.target.value)} placeholder="3" />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <label className="text-xs text-muted-foreground">Batch items JSON</label>
                                            <Textarea value={batchItemsDraft} onChange={(e) => setBatchItemsDraft(e.target.value)} placeholder='[{"input":{},"groundTruth":{}}]' className="min-h-20 font-mono text-xs" />
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <label className="text-xs text-muted-foreground">Generate model</label>
                                                <Input value={generateModelId} onChange={(e) => setGenerateModelId(e.target.value)} placeholder="model-id" />
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-xs text-muted-foreground">Generate prompt</label>
                                                <Input value={generatePrompt} onChange={(e) => setGeneratePrompt(e.target.value)} placeholder="Create diverse dataset items" />
                                            </div>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <label className="text-xs text-muted-foreground">Cluster model</label>
                                                <Input value={clusterModelId} onChange={(e) => setClusterModelId(e.target.value)} placeholder="model-id" />
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-xs text-muted-foreground">Review result ID</label>
                                                <Input value={experimentResultIdDraft} onChange={(e) => setExperimentResultIdDraft(e.target.value)} placeholder="result-id" />
                                            </div>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <label className="text-xs text-muted-foreground">Cluster prompt</label>
                                                <Textarea value={clusterPrompt} onChange={(e) => setClusterPrompt(e.target.value)} className="min-h-20" />
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-xs text-muted-foreground">Available tags</label>
                                                <Textarea value={clusterAvailableTagsDraft} onChange={(e) => setClusterAvailableTagsDraft(e.target.value)} placeholder="needs-review, bug, regression" className="min-h-20" />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <label className="text-xs text-muted-foreground">Cluster items JSON</label>
                                            <Textarea value={clusterItemsDraft} onChange={(e) => setClusterItemsDraft(e.target.value)} className="min-h-20 font-mono text-xs" />
                                        </div>
                                        <div className="grid gap-2">
                                            <label className="text-xs text-muted-foreground">Review status</label>
                                            <Input value={experimentResultStatusDraft} onChange={(e) => setExperimentResultStatusDraft(e.target.value)} placeholder="needs-review" />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    if (!selectedDatasetId) return
                                                    batchInsertDatasetItemsMutation.mutate({
                                                        datasetId: selectedDatasetId,
                                                        items: Array.isArray(parseJsonField(batchItemsDraft)) ? parseJsonField(batchItemsDraft) as Array<{ input: unknown; groundTruth?: unknown; requestContext?: Record<string, unknown>; metadata?: Record<string, unknown> }> : [],
                                                    })
                                                }}
                                                disabled={!selectedDatasetId || batchInsertDatasetItemsMutation.isPending}
                                            >
                                                Batch insert
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    if (!selectedDatasetId) return
                                                    batchDeleteDatasetItemsMutation.mutate({
                                                        datasetId: selectedDatasetId,
                                                        itemIds: batchDeleteIdsDraft.split(',').map((id) => id.trim()).filter(Boolean),
                                                    })
                                                }}
                                                disabled={!selectedDatasetId || batchDeleteDatasetItemsMutation.isPending}
                                            >
                                                Batch delete
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => {
                                                    if (!selectedDatasetId || !generateModelId.trim() || !generatePrompt.trim()) return
                                                    generateDatasetItemsMutation.mutate({
                                                        datasetId: selectedDatasetId,
                                                        modelId: generateModelId.trim(),
                                                        prompt: generatePrompt.trim(),
                                                        count: Number(generateCount) || 1,
                                                    })
                                                }}
                                                disabled={!selectedDatasetId || generateDatasetItemsMutation.isPending}
                                            >
                                                Generate
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    if (!selectedDatasetId || !clusterModelId.trim()) return
                                                    const parsedItems = parseJsonField(clusterItemsDraft)
                                                    const clusterItems = Array.isArray(parsedItems)
                                                        ? parsedItems.map((item, index) => {
                                                            const record = item as AnyRecord
                                                            const itemId = safeStr(record.id, safeStr(record.itemId, String(index)))

                                                            return {
                                                                id: itemId,
                                                                input: record.input,
                                                                output: record.output,
                                                                error: typeof record.error === 'string' ? record.error : undefined,
                                                                scores: record.scores && typeof record.scores === 'object'
                                                                    ? (record.scores as Record<string, number>)
                                                                    : {},
                                                                existingTags: Array.isArray(record.existingTags)
                                                                    ? (record.existingTags as string[])
                                                                    : [],
                                                            } satisfies ClusterFailureItem
                                                        }) as ClusterFailureItem[]
                                                        : []
                                                    clusterFailuresMutation.mutate({
                                                        modelId: clusterModelId.trim(),
                                                        items: clusterItems,
                                                        availableTags: clusterAvailableTagsDraft.split(',').map((tag) => tag.trim()).filter(Boolean),
                                                        prompt: clusterPrompt.trim() || undefined,
                                                    })
                                                }}
                                                disabled={!selectedDatasetId || clusterFailuresMutation.isPending}
                                            >
                                                Cluster failures
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => {
                                                    if (!selectedDatasetId || !selectedExperimentId || !experimentResultIdDraft.trim()) return
                                                    updateExperimentResultMutation.mutate({
                                                        datasetId: selectedDatasetId,
                                                        experimentId: selectedExperimentId,
                                                        resultId: experimentResultIdDraft.trim(),
                                                        status: experimentResultStatusDraft.trim() as 'needs-review' | 'reviewed' | 'complete' | null,
                                                        tags: clusterAvailableTagsDraft.split(',').map((tag) => tag.trim()).filter(Boolean),
                                                    })
                                                }}
                                                disabled={!selectedDatasetId || !selectedExperimentId || updateExperimentResultMutation.isPending}
                                            >
                                                Review result
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <div className="px-6 pt-4">
                                <TabsList className="bg-card/50 border border-white/5">
                                    <TabsTrigger
                                        value="items"
                                        className="gap-1.5 text-xs"
                                    >
                                        <FileTextIcon className="size-3.5" />
                                        Items
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="experiments"
                                        className="gap-1.5 text-xs"
                                    >
                                        <FlaskConicalIcon className="size-3.5" />
                                        Experiments
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="versions"
                                        className="gap-1.5 text-xs"
                                    >
                                        <HistoryIcon className="size-3.5" />
                                        History
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* Items Tab */}
                            <TabsContent
                                value="items"
                                className="flex-1 flex flex-col min-h-0 m-0 px-6 pb-6"
                            >
                                <div className="flex items-center gap-3 py-4">
                                    <div className="relative flex-1 max-w-sm">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <Input
                                            value={itemSearch}
                                            onChange={(e) => {
                                                setItemSearch(e.target.value)
                                                setItemPage(1)
                                            }}
                                            placeholder="Search items..."
                                            className="pl-9 h-9 text-sm bg-card/50 border-white/10"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 min-h-0 rounded-xl border border-white/5 bg-card/30 backdrop-blur-xl overflow-hidden">
                                    <ScrollArea className="h-full">
                                        {datasetItemsResult.isLoading ? (
                                            <div className="p-6 space-y-3">
                                                {Array.from({
                                                    length: 6,
                                                }).map((_, i) => (
                                                    <Skeleton
                                                        key={`skel-${i}`}
                                                        className="h-12 w-full"
                                                    />
                                                ))}
                                            </div>
                                        ) : paginatedItems.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                                <FileTextIcon className="size-12 text-muted-foreground/20 mb-3" />
                                                <p className="text-sm text-muted-foreground">
                                                    No items found
                                                </p>
                                            </div>
                                        ) : (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="border-white/5 hover:bg-transparent">
                                                        <TableHead className="w-10" />
                                                        <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                                            Input
                                                        </TableHead>
                                                        <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                                            Expected Output
                                                        </TableHead>
                                                        <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 w-30">
                                                            Created
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {paginatedItems.map(
                                                        (item, idx) => {
                                                            const globalIdx =
                                                                (itemPage - 1) *
                                                                    itemsPerPage +
                                                                idx
                                                            const isExpanded =
                                                                expandedItems.has(
                                                                    globalIdx
                                                                )
                                                            return (
                                                                <Collapsible
                                                                    key={
                                                                        globalIdx
                                                                    }
                                                                    open={
                                                                        isExpanded
                                                                    }
                                                                    onOpenChange={() =>
                                                                        toggleItem(
                                                                            globalIdx
                                                                        )
                                                                    }
                                                                    asChild
                                                                >
                                                                    <>
                                                                        <CollapsibleTrigger
                                                                            asChild
                                                                        >
                                                                            <TableRow className="cursor-pointer border-white/5 hover:bg-white/5 transition-colors duration-200">
                                                                                <TableCell className="p-2">
                                                                                    <ChevronDownIcon
                                                                                        className={cn(
                                                                                            'size-3.5 text-muted-foreground transition-transform duration-200',
                                                                                            isExpanded &&
                                                                                                'rotate-180'
                                                                                        )}
                                                                                    />
                                                                                </TableCell>
                                                                                <TableCell className="text-xs max-w-75 truncate font-mono text-muted-foreground">
                                                                                    {truncateJson(
                                                                                        item.input,
                                                                                        80
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="text-xs max-w-75 truncate font-mono text-muted-foreground">
                                                                                    {truncateJson(
                                                                                        item.groundTruth ??
                                                                                            item.expectedOutput ??
                                                                                            null,
                                                                                        80
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="text-[10px] text-muted-foreground/60">
                                                                                    {formatDate(
                                                                                        item.createdAt
                                                                                    )}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        </CollapsibleTrigger>
                                                                        <CollapsibleContent
                                                                            asChild
                                                                        >
                                                                            <tr>
                                                                                <td
                                                                                    colSpan={
                                                                                        4
                                                                                    }
                                                                                    className="p-0"
                                                                                >
                                                                                    <div className="border-t border-white/5 bg-muted/20 p-4 space-y-3">
                                                                                        <div>
                                                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                                                                                Input
                                                                                            </span>
                                                                                            <CodeBlock
                                                                                                code={JSON.stringify(
                                                                                                    item.input,
                                                                                                    null,
                                                                                                    2
                                                                                                )}
                                                                                                language="json"
                                                                                                showLineNumbers
                                                                                            >
                                                                                                <CodeBlockHeader>
                                                                                                    <CodeBlockTitle>
                                                                                                        input.json
                                                                                                    </CodeBlockTitle>
                                                                                                    <CodeBlockActions>
                                                                                                        <CodeBlockCopyButton />
                                                                                                    </CodeBlockActions>
                                                                                                </CodeBlockHeader>
                                                                                            </CodeBlock>
                                                                                        </div>
                                                                                        <div>
                                                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                                                                                Expected
                                                                                                Output
                                                                                            </span>
                                                                                            <CodeBlock
                                                                                                code={JSON.stringify(
                                                                                                    item.expectedOutput ??
                                                                                                        item.groundTruth ??
                                                                                                        null,
                                                                                                    null,
                                                                                                    2
                                                                                                )}
                                                                                                language="json"
                                                                                                showLineNumbers
                                                                                            >
                                                                                                <CodeBlockHeader>
                                                                                                    <CodeBlockTitle>
                                                                                                        expected.json
                                                                                                    </CodeBlockTitle>
                                                                                                    <CodeBlockActions>
                                                                                                        <CodeBlockCopyButton />
                                                                                                    </CodeBlockActions>
                                                                                                </CodeBlockHeader>
                                                                                            </CodeBlock>
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        </CollapsibleContent>
                                                                    </>
                                                                </Collapsible>
                                                            )
                                                        }
                                                    )}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </ScrollArea>
                                </div>

                                {/* Pagination */}
                                <div className="flex items-center justify-between pt-3">
                                    <span className="text-xs text-muted-foreground">
                                        {filteredItems.length} items · Page{' '}
                                        {itemPage} of{' '}
                                        {Math.max(
                                            1,
                                            Math.ceil(
                                                filteredItems.length /
                                                    itemsPerPage
                                            )
                                        )}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={itemPage <= 1}
                                            onClick={() =>
                                                setItemPage((p) =>
                                                    Math.max(1, p - 1)
                                                )
                                            }
                                            className="h-8 gap-1"
                                        >
                                            <ChevronLeftIcon className="size-3.5" />
                                            Prev
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={
                                                itemPage * itemsPerPage >=
                                                filteredItems.length
                                            }
                                            onClick={() =>
                                                setItemPage((p) => p + 1)
                                            }
                                            className="h-8 gap-1"
                                        >
                                            Next
                                            <ChevronRightIcon className="size-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Experiments Tab */}
                            <TabsContent
                                value="experiments"
                                className="flex-1 flex flex-col min-h-0 m-0 px-6 pb-6"
                            >
                                <div className="flex-1 min-h-0 mt-4 rounded-xl border border-white/5 bg-card/30 backdrop-blur-xl overflow-hidden">
                                    <ScrollArea className="h-full">
                                        {experimentsResult.isLoading ? (
                                            <div className="p-6 space-y-3">
                                                {Array.from({
                                                    length: 4,
                                                }).map((_, i) => (
                                                    <Skeleton
                                                        key={`skel-${i}`}
                                                        className="h-16 w-full"
                                                    />
                                                ))}
                                            </div>
                                        ) : experiments.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                                <FlaskConicalIcon className="size-12 text-muted-foreground/20 mb-3" />
                                                <p className="text-sm text-muted-foreground">
                                                    No experiments yet
                                                </p>
                                                <p className="text-xs text-muted-foreground/60 mt-1">
                                                    Experiments will appear here
                                                    when you run evaluations
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-white/5">
                                                {experiments.map(
                                                    (exp, idx) => {
                                                        const expId = safeStr(
                                                            exp.id,
                                                            String(idx)
                                                        )
                                                        const isSelected =
                                                            selectedExperimentId ===
                                                            expId
                                                        return (
                                                            <div key={expId}>
                                                                <button
                                                                    onClick={() =>
                                                                        setSelectedExperimentId(
                                                                            isSelected
                                                                                ? null
                                                                                : expId
                                                                        )
                                                                    }
                                                                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors duration-200"
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <p className="text-sm font-medium">
                                                                                {safeStr(
                                                                                    exp.name,
                                                                                    `Experiment ${idx + 1}`
                                                                                )}
                                                                            </p>
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                {typeof exp.scorerName === 'string' && exp.scorerName.length > 0 && (
                                                                                    <Badge
                                                                                        variant="outline"
                                                                                        className="text-[10px]"
                                                                                    >
                                                                                        {exp.scorerName}
                                                                                    </Badge>
                                                                                )}
                                                                                <span className="text-[10px] text-muted-foreground/60">
                                                                                    {formatDate(
                                                                                        exp.createdAt
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <ChevronDownIcon
                                                                            className={cn(
                                                                                'size-4 text-muted-foreground transition-transform',
                                                                                isSelected &&
                                                                                    'rotate-180'
                                                                            )}
                                                                        />
                                                                    </div>
                                                                </button>
                                                                {isSelected && (
                                                                    <div className="px-4 pb-4 bg-muted/10">
                                                                        {experimentResultsData.isLoading ? (
                                                                            <div className="space-y-2 pt-2">
                                                                                {Array.from(
                                                                                    {
                                                                                        length: 3,
                                                                                    }
                                                                                ).map(
                                                                                    (
                                                                                        _,
                                                                                        i
                                                                                    ) => (
                                                                                        <Skeleton
                                                                                            key={`exp-skel-${i}`}
                                                                                            className="h-10 w-full"
                                                                                        />
                                                                                    )
                                                                                )}
                                                                            </div>
                                                                        ) : experimentResults.length ===
                                                                          0 ? (
                                                                            <p className="text-xs text-muted-foreground pt-2">
                                                                                No
                                                                                results
                                                                                recorded
                                                                            </p>
                                                                        ) : (
                                                                            <CodeBlock
                                                                                code={JSON.stringify(
                                                                                    experimentResults,
                                                                                    null,
                                                                                    2
                                                                                )}
                                                                                language="json"
                                                                                showLineNumbers
                                                                            >
                                                                                <CodeBlockHeader>
                                                                                    <CodeBlockTitle>
                                                                                        results.json
                                                                                    </CodeBlockTitle>
                                                                                    <CodeBlockActions>
                                                                                        <CodeBlockCopyButton />
                                                                                    </CodeBlockActions>
                                                                                </CodeBlockHeader>
                                                                            </CodeBlock>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    }
                                                )}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>
                            </TabsContent>

                            {/* Versions Tab */}
                            <TabsContent
                                value="versions"
                                className="flex-1 flex flex-col min-h-0 m-0 px-6 pb-6"
                            >
                                <div className="flex-1 min-h-0 mt-4 rounded-xl border border-white/5 bg-card/30 backdrop-blur-xl overflow-hidden">
                                    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                                        <HistoryIcon className="size-12 text-muted-foreground/20 mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            Version history
                                        </p>
                                        <p className="text-xs text-muted-foreground/60 mt-1 max-w-75">
                                            Dataset snapshots and item change
                                            history will be displayed here when
                                            version tracking is enabled
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </div>
        </div>
        </TooltipProvider>
            </ChatPageShell>
        </ChatProvider>
    )
}
