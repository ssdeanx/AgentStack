"use client"

import { useMemo, useState, type ChangeEvent } from 'react'
import {
    ActivityIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    FilterIcon,
    HelpCircleIcon,
    SearchIcon,
    SparklesIcon,
} from 'lucide-react'

import { Panel } from '@/src/components/ai-elements/panel'
import { useScoresBySpan, useTrace, useTraces } from '@/lib/hooks/use-mastra-query'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/ui/card'
import { Input } from '@/ui/input'
import { ScrollArea } from '@/ui/scroll-area'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/select'
import { Skeleton } from '@/ui/skeleton'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/ui/tooltip'
import { cn } from '@/lib/utils'
import { ChatPageShell } from '../components/chat-page-shell'
import { MainSidebar } from '../components/main-sidebar'
import { ChatProvider } from '../providers/chat-context'

type SpanRecord = Record<string, unknown> & {
    id?: string
    traceId?: string
    spanId?: string
    parentSpanId?: string
    name?: string
    status?: string
    serviceName?: string
    environment?: string
    runId?: string
    requestId?: string
    spanType?: string
    startTime?: string | number | Date
    endTime?: string | number | Date
    startedAt?: string | number | Date
    endedAt?: string | number | Date
    attributes?: Record<string, unknown>
    events?: unknown[]
}

type ScoreRecord = Record<string, unknown> & {
    id?: string
    scorerId?: string
    score?: number
    reason?: string
    createdAt?: string | number | Date
    scorer?: { name?: string } | string
}

function safeString(value: unknown, fallback = '—'): string {
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'bigint') return String(value)
    if (value instanceof Date) return value.toLocaleString()
    return fallback
}

function formatTimestamp(value: unknown): string {
    if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
        const date = value instanceof Date ? value : new Date(value)

        if (!Number.isNaN(date.getTime())) {
            return date.toLocaleString('en-US', {
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

function durationMs(startValue: unknown, endValue: unknown): number | null {
    const start = startValue instanceof Date ? startValue : new Date(startValue as string | number)
    const end = endValue instanceof Date ? endValue : new Date(endValue as string | number)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null

    return Math.max(0, end.getTime() - start.getTime())
}

function formatDuration(startValue: unknown, endValue: unknown): string {
    const duration = durationMs(startValue, endValue)
    if (duration === null) return '—'
    if (duration < 1000) return `${duration}ms`
    return `${(duration / 1000).toFixed(duration >= 10_000 ? 0 : 1)}s`
}

function statusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
        case 'success':
        case 'completed':
        case 'ok':
            return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
        case 'running':
        case 'active':
            return 'border-blue-500/20 bg-blue-500/10 text-blue-400'
        case 'error':
        case 'failed':
            return 'border-red-500/20 bg-red-500/10 text-red-400'
        default:
            return 'border-white/10 bg-white/5 text-muted-foreground'
    }
}

function extractSpans(data: unknown): SpanRecord[] {
    if (!data || typeof data !== 'object') return []
    const spans = (data as { spans?: unknown }).spans
    if (!Array.isArray(spans)) return []

    return spans.filter(
        (span: unknown): span is SpanRecord => typeof span === 'object' && span !== null,
    )
}

function extractScores(data: unknown): ScoreRecord[] {
    if (!data || typeof data !== 'object') return []
    const scores = (data as { scores?: unknown }).scores
    if (!Array.isArray(scores)) return []

    return scores.filter(
        (score: unknown): score is ScoreRecord => typeof score === 'object' && score !== null,
    )
}

function normalizeTraceForPanel(traceData: unknown, fallback: SpanRecord): SpanRecord {
    if (!traceData || typeof traceData !== 'object') {
        return fallback
    }

    const traceObject = traceData as Record<string, unknown>
    const spans = extractSpans(traceObject)

    if (spans.length > 0) {
        const firstSpan = spans[0]
        return {
            ...fallback,
            ...firstSpan,
            traceId: safeString(traceObject.traceId ?? firstSpan.traceId ?? fallback.traceId, safeString(fallback.traceId, '')),
            spanId: safeString(firstSpan.spanId ?? firstSpan.id ?? fallback.spanId ?? fallback.id, safeString(fallback.spanId ?? fallback.id, '')),
        }
    }

    return {
        ...fallback,
        ...traceObject,
    }
}

function collectUniqueStrings(values: Array<string | null | undefined>): string[] {
    return Array.from(
        new Set(
            values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
        ),
    )
}

function averageScore(scores: ScoreRecord[]): string {
    if (scores.length === 0) return '—'

    const total = scores.reduce(
        (sum, score) => sum + (typeof score.score === 'number' ? score.score : 0),
        0,
    )

    return (total / scores.length).toFixed(2)
}

function ObservationPanel({ trace }: { trace: SpanRecord }) {
    const traceId = safeString(trace.traceId ?? trace.id, '')
    const spanId = safeString(trace.spanId ?? trace.id, '')

    const traceQuery = useTrace(traceId)
    const scoresQuery = useScoresBySpan({ traceId, spanId, page: 1, perPage: 5 })

    const canonicalTrace = useMemo(
        () => normalizeTraceForPanel(traceQuery.data, trace),
        [traceQuery.data, trace],
    )
    const scores = useMemo(() => extractScores(scoresQuery.data), [scoresQuery.data])
    const scoreAverage = averageScore(scores)

    return (
        <Panel
            position='bottom-right'
            className='w-136 max-w-[calc(100vw-2rem)] rounded-3xl border border-border/70 bg-background/95 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl'
        >
            <div className='flex items-center justify-between gap-3 border-b border-white/5 pb-3'>
                <div>
                    <div className='flex items-center gap-2'>
                        <Badge
                            variant='secondary'
                            className={cn(
                                'text-[10px] uppercase tracking-[0.25em]',
                                statusBadgeClass(safeString(canonicalTrace.status, 'unset')),
                            )}
                        >
                            {safeString(canonicalTrace.status, 'unset')}
                        </Badge>
                        <span className='text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60'>
                            Observation Panel
                        </span>
                    </div>
                    <h3 className='mt-2 text-sm font-semibold text-foreground'>
                        {safeString(canonicalTrace.name, 'Trace detail')}
                    </h3>
                    <p className='text-xs text-muted-foreground'>
                        Canonical trace payload and correlated span scores from the live client.
                    </p>
                </div>

                <div className='grid grid-cols-2 gap-2 text-right text-[10px] text-muted-foreground'>
                    <div className='rounded-lg border border-white/5 bg-white/5 px-2 py-1'>
                        <div className='uppercase tracking-[0.25em]'>Scores</div>
                        <div className='mt-0.5 font-semibold text-foreground tabular-nums'>
                            {scoresQuery.isLoading ? '…' : String(scores.length)}
                        </div>
                    </div>
                    <div className='rounded-lg border border-white/5 bg-white/5 px-2 py-1'>
                        <div className='uppercase tracking-[0.25em]'>Avg</div>
                        <div className='mt-0.5 font-semibold text-foreground tabular-nums'>
                            {scoresQuery.isLoading ? '…' : scoreAverage}
                        </div>
                    </div>
                </div>
            </div>

            <ScrollArea className='mt-4 h-128 pr-2'>
                <div className='space-y-4'>
                    <div className='grid grid-cols-2 gap-3'>
                        <div className='rounded-2xl border border-white/5 bg-white/5 p-3'>
                            <div className='text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60'>Trace ID</div>
                            <div className='mt-2 break-all font-mono text-xs text-foreground/80'>{traceId || '—'}</div>
                        </div>
                        <div className='rounded-2xl border border-white/5 bg-white/5 p-3'>
                            <div className='text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60'>Span ID</div>
                            <div className='mt-2 break-all font-mono text-xs text-foreground/80'>{spanId || '—'}</div>
                        </div>
                        <div className='rounded-2xl border border-white/5 bg-white/5 p-3'>
                            <div className='text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60'>Started</div>
                            <div className='mt-2 text-xs text-foreground/80'>
                                {formatTimestamp(canonicalTrace.startTime ?? canonicalTrace.startedAt)}
                            </div>
                        </div>
                        <div className='rounded-2xl border border-white/5 bg-white/5 p-3'>
                            <div className='text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60'>Duration</div>
                            <div className='mt-2 text-xs text-foreground/80'>
                                {formatDuration(canonicalTrace.startTime ?? canonicalTrace.startedAt, canonicalTrace.endTime ?? canonicalTrace.endedAt)}
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className='mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60'>
                            Canonical trace
                        </h4>
                        {traceQuery.isLoading ? (
                            <div className='space-y-2 rounded-2xl border border-white/5 bg-card/40 p-4'>
                                <Skeleton className='h-4 w-3/4' />
                                <Skeleton className='h-4 w-11/12' />
                                <Skeleton className='h-4 w-2/3' />
                            </div>
                        ) : traceQuery.isError ? (
                            <div className='rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300'>
                                Couldn’t load the live trace payload.
                            </div>
                        ) : (
                            <pre className='overflow-x-auto rounded-2xl border border-white/5 bg-black/30 p-4 text-xs leading-5 text-foreground/85'>
                                {JSON.stringify(canonicalTrace, null, 2)}
                            </pre>
                        )}
                    </div>

                    <div>
                        <h4 className='mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60'>
                            Span scores
                        </h4>
                        {scoresQuery.isLoading ? (
                            <div className='space-y-2 rounded-2xl border border-white/5 bg-card/40 p-4'>
                                <Skeleton className='h-16 w-full' />
                                <Skeleton className='h-16 w-full' />
                                <Skeleton className='h-16 w-full' />
                            </div>
                        ) : scoresQuery.isError ? (
                            <div className='rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300'>
                                Couldn’t load span scores.
                            </div>
                        ) : scores.length === 0 ? (
                            <div className='rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-muted-foreground'>
                                No scores have been attached to this span yet.
                            </div>
                        ) : (
                            <div className='space-y-2'>
                                {scores.map((score, index) => {
                                    const scorerName = safeString(
                                        (score.scorer as { name?: unknown } | undefined)?.name ?? score.scorer,
                                        'Unknown scorer',
                                    )

                                    return (
                                        <div
                                            key={safeString(score.id ?? score.scorerId ?? index, String(index))}
                                            className='rounded-2xl border border-white/5 bg-white/5 p-3'
                                        >
                                            <div className='flex items-start justify-between gap-3'>
                                                <div>
                                                    <div className='text-sm font-medium text-foreground'>{scorerName}</div>
                                                    <div className='text-xs text-muted-foreground'>{formatTimestamp(score.createdAt)}</div>
                                                </div>
                                                <Badge variant='secondary' className='tabular-nums'>
                                                    {typeof score.score === 'number' ? score.score.toFixed(2) : '—'}
                                                </Badge>
                                            </div>
                                            {score.reason ? (
                                                <p className='mt-2 line-clamp-4 text-xs leading-5 text-muted-foreground'>
                                                    {safeString(score.reason)}
                                                </p>
                                            ) : null}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </Panel>
    )
}

export default function ObservabilityPage() {
    const [page, setPage] = useState(1)
    const perPage = 25
    const [serviceFilter, setServiceFilter] = useState('all')
    const [environmentFilter, setEnvironmentFilter] = useState('all')
    const [spanTypeFilter, setSpanTypeFilter] = useState('all')
    const [requestIdFilter, setRequestIdFilter] = useState('')
    const [runIdFilter, setRunIdFilter] = useState('')
    const [selectedTrace, setSelectedTrace] = useState<SpanRecord | null>(null)

    const tracesQuery = useTraces({
        pagination: { page, perPage },
        ...(serviceFilter !== 'all' ? { serviceName: serviceFilter } : {}),
        ...(environmentFilter !== 'all' ? { environment: environmentFilter } : {}),
        ...(spanTypeFilter !== 'all' ? { spanType: spanTypeFilter } : {}),
        ...(requestIdFilter.trim() ? { requestId: requestIdFilter.trim() } : {}),
        ...(runIdFilter.trim() ? { runId: runIdFilter.trim() } : {}),
    })

    const spans = useMemo(() => extractSpans(tracesQuery.data), [tracesQuery.data])

    const stats = useMemo(() => {
        const total = spans.length
        const errorCount = spans.filter((span) => safeString(span.status, '').toLowerCase() === 'error').length
        const activeCount = spans.filter((span) => {
            const status = safeString(span.status, '').toLowerCase()
            return status === 'running' || status === 'active'
        }).length

        const durations = spans
            .map((span) => durationMs(span.startTime ?? span.startedAt, span.endTime ?? span.endedAt))
            .filter((value): value is number => value !== null)

        const avgDuration = durations.length > 0
            ? `${Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)}ms`
            : '—'

        return { total, errorCount, activeCount, avgDuration }
    }, [spans])

    const uniqueServices = useMemo(
        () => collectUniqueStrings(spans.map((span) => span.serviceName)).slice(0, 12),
        [spans],
    )
    const uniqueEnvironments = useMemo(
        () => collectUniqueStrings(spans.map((span) => span.environment)).slice(0, 10),
        [spans],
    )
    const uniqueSpanTypes = useMemo(
        () => collectUniqueStrings(spans.map((span) => span.spanType)).slice(0, 10),
        [spans],
    )

    const pagination = (tracesQuery.data as { pagination?: { total?: number; perPage?: number } } | undefined)?.pagination
    const pageCount = Math.max(1, Math.ceil((pagination?.total ?? spans.length) / (pagination?.perPage ?? perPage)))
    const visibleSpans = spans

    return (
        <ChatProvider>
            <ChatPageShell
                title="Observability"
                description="Inspect trace, span, and scoring context from the shared chat shell."
                sidebar={<MainSidebar />}
                hideHeader
                contentClassName="p-0"
            >
        <TooltipProvider delayDuration={150}>
            <div className='flex h-full min-h-0 flex-col gap-6 p-6'>
                <div className='flex flex-wrap items-start justify-between gap-4'>
                    <div className='space-y-2'>
                        <div className='flex items-center gap-2'>
                            <Badge variant='secondary' className='text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60'>
                                Observability
                            </Badge>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant='ghost' size='icon' className='h-7 w-7 rounded-full'>
                                        <HelpCircleIcon className='h-4 w-4' />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side='right' className='max-w-xs text-sm'>
                                    Pick a trace row to inspect the canonical payload and its correlated span scores in the floating panel.
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <h1 className='text-3xl font-bold tracking-tight'>Observations</h1>
                        <p className='max-w-2xl text-sm text-muted-foreground'>
                            Review live traces, filter by service or environment, and inspect the underlying span details and scoring context.
                        </p>
                    </div>

                    <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                        <Card className='border-white/5 bg-card/60'>
                            <CardContent className='p-4'>
                                <div className='text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50'>Total</div>
                                <div className='mt-2 text-2xl font-semibold tabular-nums'>{stats.total}</div>
                            </CardContent>
                        </Card>
                        <Card className='border-white/5 bg-card/60'>
                            <CardContent className='p-4'>
                                <div className='text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50'>Active</div>
                                <div className='mt-2 text-2xl font-semibold tabular-nums'>{stats.activeCount}</div>
                            </CardContent>
                        </Card>
                        <Card className='border-white/5 bg-card/60'>
                            <CardContent className='p-4'>
                                <div className='text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50'>Errors</div>
                                <div className='mt-2 text-2xl font-semibold tabular-nums text-red-400'>{stats.errorCount}</div>
                            </CardContent>
                        </Card>
                        <Card className='border-white/5 bg-card/60'>
                            <CardContent className='p-4'>
                                <div className='text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50'>Avg duration</div>
                                <div className='mt-2 text-2xl font-semibold tabular-nums'>{stats.avgDuration}</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Card className='border-white/5 bg-card/40'>
                    <CardHeader className='space-y-3 pb-4'>
                        <div className='flex items-center gap-2'>
                            <SparklesIcon className='h-4 w-4 text-muted-foreground' />
                            <CardTitle className='text-base'>Trace filters</CardTitle>
                        </div>
                        <CardDescription>
                            Filter the current observations by the fields surfaced by the Mastra observability API.
                        </CardDescription>

                        <div className='grid gap-3 lg:grid-cols-5'>
                            <div className='relative lg:col-span-2'>
                                <SearchIcon className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60' />
                                <Input
                                    value={requestIdFilter}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => setRequestIdFilter(event.target.value)}
                                    placeholder='Filter by request id'
                                    className='pl-9'
                                />
                            </div>

                            <Input
                                value={runIdFilter}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => setRunIdFilter(event.target.value)}
                                placeholder='Filter by run id'
                            />

                            <Select value={serviceFilter} onValueChange={setServiceFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder='Service' />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='all'>All services</SelectItem>
                                    {uniqueServices.map((service) => (
                                        <SelectItem key={service} value={service}>
                                            {service}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder='Environment' />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='all'>All environments</SelectItem>
                                    {uniqueEnvironments.map((environment) => (
                                        <SelectItem key={environment} value={environment}>
                                            {environment}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={spanTypeFilter} onValueChange={setSpanTypeFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder='Span type' />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='all'>All span types</SelectItem>
                                    {uniqueSpanTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                </Card>

                <div className='relative min-h-0 flex-1 rounded-3xl border border-white/5 bg-card/40'>
                    <div className='flex h-full min-h-0 flex-col'>
                        <div className='flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3'>
                            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                                <FilterIcon className='h-4 w-4' />
                                {tracesQuery.isLoading ? 'Loading traces…' : `${visibleSpans.length} trace${visibleSpans.length === 1 ? '' : 's'} on this page`}
                            </div>

                            <div className='flex items-center gap-2'>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                                    disabled={page <= 1}
                                >
                                    <ChevronLeftIcon className='mr-1 h-4 w-4' />
                                    Prev
                                </Button>
                                <div className='rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground tabular-nums'>
                                    Page {page} of {pageCount}
                                </div>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                                    disabled={page >= pageCount}
                                >
                                    Next
                                    <ChevronRightIcon className='ml-1 h-4 w-4' />
                                </Button>
                            </div>
                        </div>

                        <ScrollArea className='min-h-0 flex-1'>
                            <div className='p-4'>
                                {tracesQuery.isLoading ? (
                                    <div className='space-y-3'>
                                        {Array.from({ length: 8 }).map((_, index) => (
                                            <Skeleton key={index} className='h-16 w-full rounded-2xl' />
                                        ))}
                                    </div>
                                ) : visibleSpans.length === 0 ? (
                                    <div className='flex min-h-112 flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-background/30 p-6 text-center'>
                                        <ActivityIcon className='h-10 w-10 text-muted-foreground/40' />
                                        <h3 className='mt-4 text-lg font-semibold'>No traces found</h3>
                                        <p className='mt-2 max-w-md text-sm text-muted-foreground'>
                                            Try loosening the filters or switching to a different service/environment.
                                        </p>
                                    </div>
                                ) : (
                                    <div className='overflow-hidden rounded-2xl border border-white/5'>
                                        <div className='grid grid-cols-[1.3fr,0.8fr,0.8fr,0.7fr,0.7fr,0.7fr] gap-2 border-b border-white/5 bg-white/5 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60'>
                                            <div>Name</div>
                                            <div>Status</div>
                                            <div>Service</div>
                                            <div>Environment</div>
                                            <div>Started</div>
                                            <div>Duration</div>
                                        </div>
                                        <div className='divide-y divide-white/5 bg-background/30'>
                                            {visibleSpans.map((trace, index) => {
                                                const traceKey = safeString(trace.traceId ?? trace.id, String(trace.traceId ?? trace.id ?? index))
                                                const active =
                                                    selectedTrace?.spanId === trace.spanId && selectedTrace?.traceId === trace.traceId

                                                return (
                                                    <button
                                                        key={traceKey}
                                                        type='button'
                                                        onClick={() => setSelectedTrace(trace)}
                                                        className={cn(
                                                            'grid w-full grid-cols-[1.3fr,0.8fr,0.8fr,0.7fr,0.7fr,0.7fr] items-center gap-2 px-4 py-3 text-left transition hover:bg-white/5',
                                                            active && 'bg-white/5',
                                                        )}
                                                    >
                                                        <div className='min-w-0'>
                                                            <div className='flex items-center gap-2'>
                                                                <span className='truncate font-medium text-foreground'>
                                                                    {safeString(trace.name, 'Unnamed span')}
                                                                </span>
                                                                {trace.spanType ? (
                                                                    <Badge
                                                                        variant='outline'
                                                                        className='text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70'
                                                                    >
                                                                        {safeString(trace.spanType)}
                                                                    </Badge>
                                                                ) : null}
                                                            </div>
                                                            <div className='mt-1 truncate text-xs text-muted-foreground'>
                                                                Trace {safeString(trace.traceId ?? trace.id)} · Span {safeString(trace.spanId ?? trace.id)}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <Badge
                                                                variant='outline'
                                                                className={cn(
                                                                    'text-[10px] uppercase tracking-[0.2em]',
                                                                    statusBadgeClass(safeString(trace.status, 'unset')),
                                                                )}
                                                            >
                                                                {safeString(trace.status, 'unset')}
                                                            </Badge>
                                                        </div>

                                                        <div className='truncate text-sm text-muted-foreground'>
                                                            {safeString(trace.serviceName, '—')}
                                                        </div>

                                                        <div className='truncate text-sm text-muted-foreground'>
                                                            {safeString(trace.environment, '—')}
                                                        </div>

                                                        <div className='text-sm text-muted-foreground'>
                                                            {formatTimestamp(trace.startTime ?? trace.startedAt)}
                                                        </div>

                                                        <div className='text-sm font-medium text-foreground'>
                                                            {formatDuration(trace.startTime ?? trace.startedAt, trace.endTime ?? trace.endedAt)}
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {selectedTrace ? <ObservationPanel trace={selectedTrace} /> : null}
                </div>
            </div>
        </TooltipProvider>
            </ChatPageShell>
        </ChatProvider>
    )
}
