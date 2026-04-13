'use client'

import { useMemo, useState } from 'react'

import type { DatasetExperiment, DatasetRecord } from '@mastra/client-js'

import {
    useAgents,
    useCreateDatasetMutation,
    useDatasetExperiments,
    useDatasets,
    useScorers,
    useTriggerDatasetExperimentMutation,
} from '@/lib/hooks/use-mastra-query'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select'
import { ScrollArea } from '@/ui/scroll-area'
import { Skeleton } from '@/ui/skeleton'
import { Textarea } from '@/ui/textarea'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/ui/tooltip'
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
    CodeBlockActions,
    CodeBlockCopyButton,
    CodeBlockHeader,
    CodeBlockTitle,
} from '@/src/components/ai-elements/code-block'
import { cn } from '@/lib/utils'
import {
    ActivityIcon,
    BotIcon,
    ChevronRightIcon,
    DatabaseIcon,
    FlaskConicalIcon,
    InfoIcon,
    Loader2Icon,
    PlusIcon,
    PanelRightCloseIcon,
    PanelRightOpenIcon,
    SearchIcon,
    SparklesIcon,
} from 'lucide-react'
import { Panel } from '@/src/components/ai-elements/panel'

type AnyRecord = Record<string, unknown>

function normalizeCollection<T>(data: unknown, key: string): T[] {
    if (Array.isArray(data)) {
        return data as T[]
    }

    if (data && typeof data === 'object' && key in data) {
        const value = (data as Record<string, unknown>)[key]
        return Array.isArray(value) ? (value as T[]) : []
    }

    return []
}

function safeString(value: unknown): string {
    return typeof value === 'string' ? value : ''
}

function matchesQuery(value: unknown, query: string): boolean {
    return safeString(value).toLowerCase().includes(query.toLowerCase())
}

function safeJson(value: unknown): string {
    try {
        return JSON.stringify(value, null, 2)
    } catch {
        return 'null'
    }
}

function formatDate(value: unknown): string {
    if (value === null || value === undefined) {
        return '—'
    }

    if (value instanceof Date) {
        return value.toLocaleString()
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value)
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleString()
        }
    }

    return '—'
}

function datasetLabel(dataset: DatasetRecord | AnyRecord, index: number): string {
    return safeString(dataset.name) || safeString((dataset as AnyRecord).title) || `Dataset ${index + 1}`
}

function scorerLabel(scorer: AnyRecord, id: string): string {
    return safeString(scorer.name) || safeString(scorer.title) || id
}

/**
 * Interactive evaluation dashboard for datasets, scorers, and experiments.
 */
export default function EvaluationPage() {
    const [showHelpPanel, setShowHelpPanel] = useState(true)
    const datasetsQuery = useDatasets()
    const scorersQuery = useScorers()
    const agentsQuery = useAgents()

    const datasets = useMemo<DatasetRecord[]>(
        () => normalizeCollection<DatasetRecord>(datasetsQuery.data, 'datasets'),
        [datasetsQuery.data]
    )

    const scorers = useMemo<Array<AnyRecord & { id: string }>>(() => {
        const data = scorersQuery.data
        if (!data || typeof data !== 'object') {
            return []
        }

        return Object.entries(data as Record<string, AnyRecord>).map(([id, scorer]) => ({
            ...scorer,
            id,
        }))
    }, [scorersQuery.data])

    const agents = useMemo<AnyRecord[]>(
        () => (agentsQuery.data ?? []).map((agent) => ({ ...agent })) as AnyRecord[],
        [agentsQuery.data]
    )

    const [datasetSearch, setDatasetSearch] = useState('')
    const [selectedDatasetId, setSelectedDatasetId] = useState('')
    const [selectedAgentId, setSelectedAgentId] = useState('')
    const [newDatasetName, setNewDatasetName] = useState('')
    const [newDatasetDescription, setNewDatasetDescription] = useState('')

    const filteredDatasets = useMemo(() => {
        const query = datasetSearch.trim()

        if (!query) {
            return datasets
        }

        return datasets.filter((dataset) => {
            return (
                matchesQuery(dataset.id, query) ||
                matchesQuery(dataset.name, query) ||
                matchesQuery(dataset.description, query) ||
                matchesQuery(dataset.targetType, query)
            )
        })
    }, [datasetSearch, datasets])

    const fallbackDatasetId = filteredDatasets[0]?.id || datasets[0]?.id || ''
    const activeDatasetId = selectedDatasetId || fallbackDatasetId
    const activeDataset = datasets.find((dataset) => dataset.id === activeDatasetId)
    const fallbackAgentId = safeString(agents[0]?.id) || ''
    const activeAgentId = selectedAgentId || fallbackAgentId
    const activeAgent = agents.find((agent) => safeString(agent.id) === activeAgentId)
    const selectedDatasetName = activeDataset?.name ?? safeString((activeDataset as AnyRecord | undefined)?.title)

    const experimentsQuery = useDatasetExperiments(activeDatasetId)
    const experiments = useMemo<DatasetExperiment[]>(
        () => normalizeCollection<DatasetExperiment>(experimentsQuery.data, 'experiments'),
        [experimentsQuery.data]
    )

    const createDatasetMutation = useCreateDatasetMutation()
    const triggerExperimentMutation = useTriggerDatasetExperimentMutation()

    const scorerIdsFromDataset = Array.isArray(activeDataset?.scorerIds)
        ? activeDataset.scorerIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
        : []

    const handleCreateDataset = async () => {
        const name = newDatasetName.trim()
        if (!name) {
            return
        }

        await createDatasetMutation.mutateAsync({
            name,
            description: newDatasetDescription.trim() || undefined,
        })

        setNewDatasetName('')
        setNewDatasetDescription('')
    }

    const handleRunExperiment = async () => {
        if (!activeDatasetId || !activeAgentId) {
            return
        }

        await triggerExperimentMutation.mutateAsync({
            datasetId: activeDatasetId,
            targetType: 'agent',
            targetId: activeAgentId,
            scorerIds: scorerIdsFromDataset.length > 0 ? scorerIdsFromDataset : undefined,
            version: activeDataset?.version,
            agentVersion: safeString(activeAgent?.activeVersionId) || undefined,
        })
    }

    const datasetSummary = {
        id: activeDataset?.id ?? '',
        name: activeDataset?.name ?? '',
        description: activeDataset?.description ?? null,
        version: activeDataset?.version ?? null,
        targetType: activeDataset?.targetType ?? null,
        targetIds: activeDataset?.targetIds ?? null,
        scorerIds: activeDataset?.scorerIds ?? null,
        tags: activeDataset?.tags ?? null,
        updatedAt: activeDataset?.updatedAt ?? null,
    }

    return (
        <TooltipProvider delayDuration={150}>
            <div className="relative flex h-full min-h-0 flex-col gap-6 p-6">
                {showHelpPanel ? (
                    <Panel position="top-right" className="pointer-events-auto z-20 w-88">
                        <div className="rounded-3xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold text-foreground">Evaluation help</div>
                                    <div className="text-xs text-muted-foreground">
                                        Quick tips for datasets, scorers, and experiment runs.
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowHelpPanel(false)}
                                    aria-label="Close evaluation help panel"
                                >
                                    <PanelRightCloseIcon className="size-4" />
                                </Button>
                            </div>

                            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                                <p>Create datasets on the left, then target a live agent and run experiments from the actions below.</p>
                                <p>The dataset summary uses a code-display artifact so it’s easy to inspect or copy.</p>
                                <p>Use the refresh-style buttons and tooltips if the dataset or experiment state looks stale.</p>
                            </div>
                        </div>
                    </Panel>
                ) : null}
            <div className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            <FlaskConicalIcon className="size-3.5" />
                            Interact with evaluation
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold tracking-tight">Evaluation</h1>
                            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                                Create datasets, inspect scorers, and launch experiments against a live agent target.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="secondary" className="cursor-help">{datasets.length} datasets</Badge>
                                </TooltipTrigger>
                                <TooltipContent>All datasets returned by the live evaluation query.</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="secondary" className="cursor-help">{scorers.length} scorers</Badge>
                                </TooltipTrigger>
                                <TooltipContent>Scorers available for dataset evaluation and comparison.</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="secondary" className="cursor-help">{experiments.length} experiments</Badge>
                                </TooltipTrigger>
                                <TooltipContent>Experiment runs for the selected dataset.</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    <div className="w-full max-w-2xl space-y-3 lg:w-xl">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                Evaluation controls
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            className="inline-flex items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                                            aria-label="Evaluation controls help"
                                        >
                                            <InfoIcon className="size-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Choose a dataset, pick an agent, and run the experiment from here.
                                    </TooltipContent>
                                </Tooltip>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => setShowHelpPanel((current) => !current)}
                            >
                                {showHelpPanel ? (
                                    <PanelRightCloseIcon className="size-4" />
                                ) : (
                                    <PanelRightOpenIcon className="size-4" />
                                )}
                                {showHelpPanel ? 'Hide panel' : 'Show panel'}
                            </Button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Selected dataset</div>
                                <div className="mt-2 text-sm font-medium text-foreground">
                                    {selectedDatasetName || 'No dataset selected'}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Selected agent</div>
                                <div className="mt-2 text-sm font-medium text-foreground">
                                    {safeString(activeAgent?.name) || 'No agent selected'}
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={datasetSearch}
                                onChange={(event) => {
                                    setDatasetSearch(event.target.value)
                                }}
                                placeholder="Search datasets by name, description, target type, or id"
                                className="pl-9"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid min-h-0 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                <Card className="border-border/60 bg-card/80 shadow-sm">
                    <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                        <div className="flex items-center justify-between gap-3">
                            <CardTitle className="text-base">Datasets</CardTitle>
                            <Badge variant="secondary">{filteredDatasets.length} shown</Badge>
                        </div>

                        <div className="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <PlusIcon className="size-4 text-primary" />
                                Create dataset
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dataset-name">Name</Label>
                                <Input
                                    id="dataset-name"
                                    value={newDatasetName}
                                    onChange={(event) => {
                                        setNewDatasetName(event.target.value)
                                    }}
                                    placeholder="my-evaluation-dataset"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dataset-description">Description</Label>
                                <Textarea
                                    id="dataset-description"
                                    value={newDatasetDescription}
                                    onChange={(event) => {
                                        setNewDatasetDescription(event.target.value)
                                    }}
                                    placeholder="Describe what this dataset measures"
                                    className="min-h-24"
                                />
                            </div>
                            <Button
                                onClick={() => {
                                    void handleCreateDataset()
                                }}
                                disabled={createDatasetMutation.isPending || newDatasetName.trim().length === 0}
                                className="w-full"
                            >
                                {createDatasetMutation.isPending ? (
                                    <>
                                        <Loader2Icon className="mr-2 size-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create dataset'
                                )}
                            </Button>
                        </div>

                        <div className="relative">
                            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={datasetSearch}
                                onChange={(event) => {
                                    setDatasetSearch(event.target.value)
                                }}
                                placeholder="Filter datasets"
                                className="pl-9"
                            />
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {datasetsQuery.isLoading ? (
                            <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                                <Loader2Icon className="size-4 animate-spin" />
                                Loading datasets...
                            </div>
                        ) : filteredDatasets.length === 0 ? (
                            <div className="px-4 py-8 text-sm text-muted-foreground">No datasets matched your search.</div>
                        ) : (
                            <ScrollArea className="h-155">
                                <div className="space-y-2 p-3">
                                    {filteredDatasets.map((dataset, index) => {
                                        const isActive = dataset.id === activeDatasetId

                                        return (
                                            <button
                                                key={dataset.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedDatasetId(dataset.id)
                                                }}
                                                className={cn(
                                                    'w-full rounded-2xl border px-4 py-3 text-left transition-all duration-200',
                                                    isActive
                                                        ? 'border-primary/30 bg-primary/10 text-foreground shadow-sm'
                                                        : 'border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 space-y-1">
                                                        <div className="truncate text-sm font-medium text-foreground">
                                                            {datasetLabel(dataset, index)}
                                                        </div>
                                                        <div className="line-clamp-2 text-xs text-muted-foreground">
                                                            {safeString(dataset.description) || 'No description available.'}
                                                        </div>
                                                    </div>
                                                    <Badge variant={isActive ? 'default' : 'secondary'} className="shrink-0">
                                                        v{dataset.version}
                                                    </Badge>
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.2em]">
                                                        {dataset.id}
                                                    </Badge>
                                                    {dataset.targetType ? (
                                                        <Badge variant="secondary" className="text-[10px] capitalize">
                                                            {dataset.targetType}
                                                        </Badge>
                                                    ) : null}
                                                    {dataset.scorerIds?.length ? (
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            {dataset.scorerIds.length} scorers
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-5">
                    <Card className="border-border/60 bg-card/80 shadow-sm">
                        <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <CardTitle className="text-base">Dataset overview</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Inspect the selected dataset and launch an experiment against a live agent.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary" className="gap-1.5">
                                        <DatabaseIcon className="size-3.5" />
                                        v{activeDataset?.version ?? '—'}
                                    </Badge>
                                    <Badge variant="secondary" className="gap-1.5">
                                        <BotIcon className="size-3.5" />
                                        {safeString(activeAgent?.name) || 'No agent'}
                                    </Badge>
                                    <Badge variant="secondary" className="gap-1.5">
                                        <ActivityIcon className="size-3.5" />
                                        {experiments.length} experiments
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4 p-5">
                            {!activeDatasetId ? (
                                <div className="text-sm text-muted-foreground">Select a dataset to inspect its experiments.</div>
                            ) : datasetsQuery.isLoading ? (
                                <Skeleton className="h-32 w-full" />
                            ) : activeDataset ? (
                                <>
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Version</div>
                                            <div className="mt-2 text-lg font-semibold">{activeDataset.version}</div>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Target type</div>
                                            <div className="mt-2 text-lg font-semibold capitalize">
                                                {activeDataset.targetType ?? '—'}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Scorers</div>
                                            <div className="mt-2 text-lg font-semibold">
                                                {scorerIdsFromDataset.length || activeDataset.scorerIds?.length || 0}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Updated</div>
                                            <div className="mt-2 text-sm font-medium">{formatDate(activeDataset.updatedAt)}</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.2em] cursor-help">
                                                    {activeDataset.id}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>Dataset identifier used by mutations and experiments.</TooltipContent>
                                        </Tooltip>
                                        {activeDataset.tags?.length ? (
                                            activeDataset.tags.map((tag) => (
                                                <Tooltip key={tag}>
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="secondary" className="capitalize cursor-help">
                                                            {tag}
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Dataset tag.</TooltipContent>
                                                </Tooltip>
                                            ))
                                        ) : (
                                            <Badge variant="secondary">No tags</Badge>
                                        )}
                                    </div>

                                    <Artifact>
                                        <ArtifactHeader>
                                            <div className="min-w-0">
                                                <ArtifactTitle className="truncate">dataset.json</ArtifactTitle>
                                                <ArtifactDescription className="truncate">
                                                    Code-display preview for the selected dataset metadata.
                                                </ArtifactDescription>
                                            </div>
                                            <ArtifactActions>
                                                <ArtifactAction
                                                    tooltip="Copy dataset JSON"
                                                    label="Copy dataset JSON"
                                                    onClick={() => {
                                                        void navigator.clipboard.writeText(safeJson(datasetSummary))
                                                    }}
                                                />
                                            </ArtifactActions>
                                        </ArtifactHeader>
                                        <ArtifactContent>
                                            <CodeBlock code={safeJson(datasetSummary)} language="json" showLineNumbers>
                                                <CodeBlockHeader>
                                                    <CodeBlockTitle>dataset.json</CodeBlockTitle>
                                                    <CodeBlockActions>
                                                        <CodeBlockCopyButton />
                                                    </CodeBlockActions>
                                                </CodeBlockHeader>
                                            </CodeBlock>
                                        </ArtifactContent>
                                    </Artifact>
                                </>
                            ) : (
                                <div className="text-sm text-muted-foreground">Dataset information unavailable.</div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid gap-5 xl:grid-cols-2">
                        <Card className="border-border/60 bg-card/80 shadow-sm">
                            <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                                <div className="flex items-center justify-between gap-3">
                                    <CardTitle className="text-base">Run experiment</CardTitle>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant="secondary" className="cursor-help">agent target</Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Experiments run against the selected live agent.
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 p-5">
                                <div className="space-y-2">
                                    <Label htmlFor="agent-target">Target agent</Label>
                                    <Select value={activeAgentId} onValueChange={setSelectedAgentId}>
                                        <SelectTrigger id="agent-target">
                                            <SelectValue placeholder="Select an agent" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {agents.map((agent) => (
                                                <SelectItem key={safeString(agent.id)} value={safeString(agent.id)}>
                                                    {safeString(agent.name) || safeString(agent.id)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {scorers.slice(0, 6).map((scorer) => (
                                        <Badge key={scorer.id} variant="outline" className="gap-1.5">
                                            <SparklesIcon className="size-3.5" />
                                            {scorerLabel(scorer, scorer.id)}
                                        </Badge>
                                    ))}
                                </div>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={() => {
                                                void handleRunExperiment()
                                            }}
                                            disabled={
                                                triggerExperimentMutation.isPending ||
                                                !activeDatasetId ||
                                                !activeAgentId
                                            }
                                            className="w-full"
                                        >
                                            {triggerExperimentMutation.isPending ? (
                                                <>
                                                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                                                    Running...
                                                </>
                                            ) : (
                                                <>
                                                    Run experiment
                                                    <ChevronRightIcon className="ml-2 size-4" />
                                                </>
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Launch the selected dataset against the chosen agent.
                                    </TooltipContent>
                                </Tooltip>
                            </CardContent>
                        </Card>

                        <Card className="border-border/60 bg-card/80 shadow-sm">
                            <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                                <div className="flex items-center justify-between gap-3">
                                    <CardTitle className="text-base">Scorers</CardTitle>
                                    <Badge variant="secondary">{scorers.length} total</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {scorersQuery.isLoading ? (
                                    <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                                        <Loader2Icon className="size-4 animate-spin" />
                                        Loading scorers...
                                    </div>
                                ) : scorers.length === 0 ? (
                                    <div className="px-4 py-6 text-sm text-muted-foreground">No scorers available.</div>
                                ) : (
                                    <ScrollArea className="h-72">
                                        <div className="space-y-2 p-3">
                                            {scorers.map((scorer) => (
                                                <div
                                                    key={scorer.id}
                                                    className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="truncate text-sm font-medium text-foreground">
                                                                {scorerLabel(scorer, scorer.id)}
                                                            </div>
                                                            <div className="mt-1 text-xs text-muted-foreground">
                                                                {safeString(scorer.description) || 'No description available.'}
                                                            </div>
                                                        </div>
                                                        <Badge variant="secondary">{scorer.id}</Badge>
                                                    </div>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {safeString(scorer.provider) ? (
                                                            <Badge variant="outline">{safeString(scorer.provider)}</Badge>
                                                        ) : null}
                                                        {safeString(scorer.modelId) ? (
                                                            <Badge variant="outline">{safeString(scorer.modelId)}</Badge>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-border/60 bg-card/80 shadow-sm">
                        <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                            <div className="flex items-center justify-between gap-3">
                                <CardTitle className="text-base">Experiments</CardTitle>
                                <Badge variant="secondary">{experiments.length} runs</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {!activeDatasetId ? (
                                <div className="px-4 py-6 text-sm text-muted-foreground">Select a dataset to view its experiment history.</div>
                            ) : experimentsQuery.isLoading ? (
                                <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                                    <Loader2Icon className="size-4 animate-spin" />
                                    Loading experiments...
                                </div>
                            ) : experiments.length === 0 ? (
                                <div className="px-4 py-6 text-sm text-muted-foreground">No experiments have been run for this dataset.</div>
                            ) : (
                                <ScrollArea className="h-96">
                                    <div className="space-y-2 p-3">
                                        {experiments.map((experiment) => (
                                            <div
                                                key={experiment.id}
                                                className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <div className="text-sm font-medium text-foreground">
                                                            {experiment.id}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {experiment.targetType} • {experiment.targetId}
                                                        </div>
                                                    </div>
                                                    <Badge variant="secondary" className="capitalize">
                                                        {experiment.status}
                                                    </Badge>
                                                </div>

                                                <div className="mt-3 grid gap-2 md:grid-cols-3">
                                                    <Badge variant="outline" className="justify-center">
                                                        {experiment.totalItems} items
                                                    </Badge>
                                                    <Badge variant="outline" className="justify-center">
                                                        {experiment.succeededCount} succeeded
                                                    </Badge>
                                                    <Badge variant="outline" className="justify-center">
                                                        {experiment.failedCount} failed
                                                    </Badge>
                                                </div>

                                                <div className="mt-3 text-xs text-muted-foreground">
                                                    Started {formatDate(experiment.startedAt)}
                                                    {experiment.completedAt ? ` • Completed ${formatDate(experiment.completedAt)}` : ''}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
        </TooltipProvider>
    )
}