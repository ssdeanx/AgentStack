'use client'

import { useState, useMemo, useCallback } from 'react'
import {
    useCreateDatasetMutation,
    useDatasetExperimentResults,
    useDatasetExperiments,
    useDatasetItems,
    useDatasets,
    useDeleteDatasetMutation,
} from '@/lib/hooks/use-mastra-query'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Textarea } from '@/ui/textarea'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/ui/collapsible'

type AnyRecord = Record<string, unknown>

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

export default function DatasetPage() {
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
        <div className="flex h-full min-h-0 gap-0">
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
                            <p className="text-[10px] text-muted-foreground">
                                {datasets.length} datasets
                            </p>
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
                        <Dialog
                            open={isCreateOpen}
                            onOpenChange={setIsCreateOpen}
                        >
                            <DialogTrigger asChild>
                                <Button
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    title="New dataset"
                                >
                                    <PlusIcon className="size-4" />
                                </Button>
                            </DialogTrigger>
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
                                    <Badge
                                        variant="outline"
                                        className="text-xs"
                                    >
                                        <PackageIcon className="size-3 mr-1" />
                                        {allItems.length} items
                                    </Badge>
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
                                                                                        item.expectedOutput ??
                                                                                            item.expected,
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
                                                                                                        item.expected ?? null,
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
    )
}
