'use client'

import { useState, useMemo } from 'react'
import { useTraces } from '@/lib/hooks/use-mastra-query'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent } from '@/ui/card'
import { Input } from '@/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/ui/table'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/ui/sheet'
import { ScrollArea } from '@/ui/scroll-area'
import { Skeleton } from '@/ui/skeleton'
import { Separator } from '@/ui/separator'
import {
    CodeBlock,
    CodeBlockHeader,
    CodeBlockTitle,
    CodeBlockActions,
    CodeBlockCopyButton,
} from '@/src/components/ai-elements/code-block'
import {
    ActivityIcon,
    ClockIcon,
    AlertTriangleIcon,
    ZapIcon,
    SearchIcon,
    RefreshCwIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    Loader2Icon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SpanRecord = Record<string, unknown>

const STATUS_COLORS: Record<string, string> = {
    ok: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    error: 'bg-red-500/15 text-red-400 border-red-500/20',
    unset: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
}

function statusBadgeClass(status: string): string {
    return STATUS_COLORS[status.toLowerCase()] ?? STATUS_COLORS.unset
}

function formatDuration(startNs: unknown, endNs: unknown): string {
    if (typeof startNs !== 'number' || typeof endNs !== 'number') {
        if (typeof startNs === 'string' && typeof endNs === 'string') {
            const startMs = new Date(startNs).getTime()
            const endMs = new Date(endNs).getTime()
            if (!isNaN(startMs) && !isNaN(endMs)) {
                const diffMs = endMs - startMs
                if (diffMs < 1000) {
                    return `${diffMs}ms`
                }
                return `${(diffMs / 1000).toFixed(2)}s`
            }
        }
        return '—'
    }
    const diffMs = (endNs - startNs) / 1e6
    if (diffMs < 1000) {
        return `${Math.round(diffMs)}ms`
    }
    return `${(diffMs / 1000).toFixed(2)}s`
}

function formatTimestamp(value: unknown): string {
    if (typeof value === 'string' || typeof value === 'number') {
        try {
            return new Date(value).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            })
        } catch {
            return String(value)
        }
    }
    return '—'
}

function safeString(value: unknown, fallback = '—'): string {
    if (typeof value === 'string' && value.length > 0) {
        return value
    }
    if (value === null || value === undefined) {
        return fallback
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value)
        } catch {
            return fallback
        }
    }
    return String(value)
}

export default function ObservabilityPage() {
    const [page, setPage] = useState(1)
    const [perPage] = useState(25)
    const [nameFilter, setNameFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [selectedTrace, setSelectedTrace] = useState<SpanRecord | null>(null)
    const [sheetOpen, setSheetOpen] = useState(false)

    const tracesResult = useTraces({
        pagination: { page, perPage },
        ...(nameFilter.trim() ? { name: nameFilter.trim() } : {}),
    })

    const rawSpans = useMemo<SpanRecord[]>(() => {
        const data: unknown = tracesResult.data
        if (data === null || data === undefined || typeof data !== 'object') {
            return []
        }
        const { spans } = data as { spans?: unknown }
        if (!Array.isArray(spans)) {
            return []
        }
        return spans.filter(
            (s: unknown): s is SpanRecord =>
                typeof s === 'object' && s !== null
        )
    }, [tracesResult.data])

    const filteredSpans = useMemo(() => {
        if (statusFilter === 'all') {
            return rawSpans
        }
        return rawSpans.filter((span) => {
            const s = safeString(span.status, 'unset').toLowerCase()
            return s === statusFilter
        })
    }, [rawSpans, statusFilter])

    const kpis = useMemo(() => {
        const total = rawSpans.length
        const errors = rawSpans.filter(
            (s) => safeString(s.status, '').toLowerCase() === 'error'
        ).length
        const errorRate = total > 0 ? ((errors / total) * 100).toFixed(1) : '0'

        let totalDurationMs = 0
        let durationCount = 0
        for (const span of rawSpans) {
            const start = span.startTime ?? span.startedAt
            const end = span.endTime ?? span.endedAt
            if (typeof start === 'string' && typeof end === 'string') {
                const diff = new Date(end).getTime() - new Date(start).getTime()
                if (!isNaN(diff) && diff >= 0) {
                    totalDurationMs += diff
                    durationCount++
                }
            }
        }
        const avgDuration =
            durationCount > 0
                ? `${Math.round(totalDurationMs / durationCount)}ms`
                : '—'

        return { total, errors, errorRate, avgDuration }
    }, [rawSpans])

    const openTraceDetail = (span: SpanRecord) => {
        setSelectedTrace(span)
        setSheetOpen(true)
    }

    return (
        <div className="flex h-full min-h-0 flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ActivityIcon className="size-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">
                            Observability
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Trace performance, latency, and errors across your
                            agent stack
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        void tracesResult.refetch()
                    }}
                    disabled={tracesResult.isFetching}
                    className="gap-1.5"
                >
                    {tracesResult.isFetching ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                        <RefreshCwIcon className="size-3.5" />
                    )}
                    Refresh
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card className="border-white/5 bg-card/50 backdrop-blur-xl">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <ActivityIcon className="size-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                Total Traces
                            </span>
                        </div>
                        <div className="mt-2 text-2xl font-bold tabular-nums">
                            {tracesResult.isLoading ? (
                                <Skeleton className="h-8 w-16" />
                            ) : (
                                kpis.total
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-white/5 bg-card/50 backdrop-blur-xl">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <ClockIcon className="size-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                Avg Duration
                            </span>
                        </div>
                        <div className="mt-2 text-2xl font-bold tabular-nums">
                            {tracesResult.isLoading ? (
                                <Skeleton className="h-8 w-20" />
                            ) : (
                                kpis.avgDuration
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-white/5 bg-card/50 backdrop-blur-xl">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <AlertTriangleIcon className="size-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                Error Rate
                            </span>
                        </div>
                        <div className="mt-2 text-2xl font-bold tabular-nums">
                            {tracesResult.isLoading ? (
                                <Skeleton className="h-8 w-14" />
                            ) : (
                                <span
                                    className={cn(
                                        Number(kpis.errorRate) > 5 &&
                                            'text-red-400'
                                    )}
                                >
                                    {kpis.errorRate}%
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-white/5 bg-card/50 backdrop-blur-xl">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <ZapIcon className="size-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                Errors
                            </span>
                        </div>
                        <div className="mt-2 text-2xl font-bold tabular-nums">
                            {tracesResult.isLoading ? (
                                <Skeleton className="h-8 w-10" />
                            ) : (
                                <span
                                    className={cn(
                                        kpis.errors > 0 && 'text-red-400'
                                    )}
                                >
                                    {kpis.errors}
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        value={nameFilter}
                        onChange={(e) => {
                            setNameFilter(e.target.value)
                            setPage(1)
                        }}
                        placeholder="Filter by name..."
                        className="pl-9 h-9 text-sm bg-card/50 border-white/10"
                    />
                </div>
                <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                        setStatusFilter(v)
                        setPage(1)
                    }}
                >
                    <SelectTrigger className="w-35 h-9 text-sm bg-card/50 border-white/10">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="ok">OK</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="unset">Unset</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Trace Table */}
            <div className="flex-1 min-h-0 rounded-xl border border-white/5 bg-card/30 backdrop-blur-xl overflow-hidden">
                <ScrollArea className="h-full">
                    {tracesResult.isLoading ? (
                        <div className="p-6 space-y-3">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton
                                    key={`skel-${String(i)}`}
                                    className="h-10 w-full"
                                />
                            ))}
                        </div>
                    ) : filteredSpans.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <ActivityIcon className="size-12 text-muted-foreground/20 mb-3" />
                            <p className="text-sm text-muted-foreground">
                                No traces found
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                                Traces will appear here once your agents start
                                processing requests
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                        Name
                                    </TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                        Status
                                    </TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                        Duration
                                    </TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                        Started
                                    </TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                        Span ID
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSpans.map((span, idx) => {
                                    const spanId = safeString(
                                        span.spanId ?? span.id,
                                        String(idx)
                                    )
                                    const name = safeString(span.name, 'Unknown')
                                    const status = safeString(
                                        span.status,
                                        'unset'
                                    )
                                    const duration = formatDuration(
                                        span.startTime ?? span.startedAt,
                                        span.endTime ?? span.endedAt
                                    )
                                    const started = formatTimestamp(
                                        span.startTime ?? span.startedAt
                                    )

                                    return (
                                        <TableRow
                                            key={spanId}
                                            className="cursor-pointer border-white/5 hover:bg-white/5 transition-colors duration-200"
                                            onClick={() =>
                                                openTraceDetail(span)
                                            }
                                        >
                                            <TableCell className="font-medium text-sm max-w-50 truncate">
                                                {name}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'text-[10px] font-bold uppercase tracking-wider',
                                                        statusBadgeClass(status)
                                                    )}
                                                >
                                                    {status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm tabular-nums text-muted-foreground">
                                                {duration}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {started}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground/50 font-mono max-w-30 truncate">
                                                {spanId.slice(0, 12)}…
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </ScrollArea>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                    Page {page} · {filteredSpans.length} traces
                </span>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="h-8 gap-1"
                    >
                        <ChevronLeftIcon className="size-3.5" />
                        Prev
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={filteredSpans.length < perPage}
                        onClick={() => setPage((p) => p + 1)}
                        className="h-8 gap-1"
                    >
                        Next
                        <ChevronRightIcon className="size-3.5" />
                    </Button>
                </div>
            </div>

            {/* Trace Detail Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-xl bg-background/95 backdrop-blur-2xl border-white/5"
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
                                            selectedTrace.spanId ??
                                                selectedTrace.id
                                        )}
                                    </span>
                                </SheetDescription>
                            </SheetHeader>

                            <ScrollArea className="mt-4 h-[calc(100vh-120px)]">
                                <div className="space-y-6 pr-4">
                                    {/* Overview */}
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
                                                        statusBadgeClass(
                                                            safeString(
                                                                selectedTrace.status,
                                                                'unset'
                                                            )
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

                                    {/* Trace ID / Parent */}
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
                                                            {safeString(
                                                                selectedTrace.traceId
                                                            )}
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

                                    {/* Attributes JSON */}
                                    <div>
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
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

                                    {/* Events */}
                                    {Array.isArray(selectedTrace.events) &&
                                        (selectedTrace.events as unknown[])
                                            .length > 0 && (
                                            <div>
                                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
                                                    Events (
                                                    {
                                                        (
                                                            selectedTrace.events as unknown[]
                                                        ).length
                                                    }
                                                    )
                                                </h4>
                                                <CodeBlock
                                                    code={JSON.stringify(
                                                        selectedTrace.events,
                                                        null,
                                                        2
                                                    )}
                                                    language="json"
                                                    showLineNumbers
                                                >
                                                    <CodeBlockHeader>
                                                        <CodeBlockTitle>
                                                            events.json
                                                        </CodeBlockTitle>
                                                        <CodeBlockActions>
                                                            <CodeBlockCopyButton />
                                                        </CodeBlockActions>
                                                    </CodeBlockHeader>
                                                </CodeBlock>
                                            </div>
                                        )}
                                </div>
                            </ScrollArea>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}
