'use client'

import { useState } from 'react'
import { useTracesQuery } from '../../../lib/hooks/use-dashboard-queries'
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card'
import { Badge } from '../../../ui/badge'
import { Button } from '../../../ui/button'
import { Input } from '../../../ui/input'
import { ScrollArea } from '../../../ui/scroll-area'
import { Skeleton } from '../../../ui/skeleton'
import { Activity, RefreshCw, Search, Clock, BarChart3, ShieldCheck } from 'lucide-react'

function formatDuration(value: number | undefined): string {
    if (value === undefined) {
        return 'n/a'
    }
    return `${value} ms`
}

function avgDuration(values: Array<number | undefined>): string {
    const durations = values.filter((value): value is number => value !== undefined)
    if (durations.length === 0) {
        return 'n/a'
    }

    const total = durations.reduce((sum, current) => sum + current, 0)
    return `${Math.round(total / durations.length)} ms`
}

function successRate(statuses: Array<string | undefined>): string {
    if (statuses.length === 0) {
        return '0%'
    }

    const successful = statuses.filter(
        (status) => status === 'ok' || status === 'success' || status === undefined
    ).length

    return `${Math.round((successful / statuses.length) * 100)}%`
}

export default function TelemetryPage() {
    const [query, setQuery] = useState('')
    const [page, setPage] = useState(1)

    const { data, isLoading, error, refetch } = useTracesQuery({
        page,
        perPage: 20,
        filters: query ? { name: query } : undefined,
    })

    const spans = data?.spans ?? []
    const pagination = data?.pagination

    return (
        <div className="flex h-full flex-col">
            <div className="border-b p-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold">Telemetry</h1>
                        <p className="text-sm text-muted-foreground">
                            Runtime traces and health signals from backend execution.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => void refetch()}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>

                <div className="mt-4 relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value)
                            setPage(1)
                        }}
                        placeholder="Filter traces by name"
                    />
                </div>
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Activity className="h-4 w-4" />
                            Trace Count
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{spans.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            Avg Duration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {avgDuration(spans.map((span) => span.duration))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <ShieldCheck className="h-4 w-4" />
                            Success Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {successRate(spans.map((span) => span.status))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex-1 px-4 pb-4">
                <Card className="h-full overflow-hidden">
                    <CardHeader className="border-b bg-muted/30">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BarChart3 className="h-4 w-4" />
                            Trace Events
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="space-y-2 p-4">
                                {Array.from({ length: 8 }).map((_, index) => (
                                    <Skeleton key={index} className="h-14 w-full" />
                                ))}
                            </div>
                        ) : error ? (
                            <div className="p-4 text-sm text-destructive">{error.message}</div>
                        ) : spans.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                No telemetry events found.
                            </div>
                        ) : (
                            <ScrollArea className="h-140">
                                <div className="divide-y">
                                    {spans.map((span) => (
                                        <div key={`${span.traceId}-${span.spanId}`} className="p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-medium">{span.name ?? span.traceId}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {(span.startTime)
                                                            ? new Date(span.startTime).toLocaleString()
                                                            : 'no timestamp'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{span.spanType ?? 'trace'}</Badge>
                                                    <Badge
                                                        variant={
                                                            span.status === 'ok' || span.status === 'success'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {span.status ?? 'n/a'}
                                                    </Badge>
                                                    <Badge variant="secondary">
                                                        {formatDuration(span.duration)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="border-t px-4 py-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        Page {pagination?.page ?? 1} of {pagination?.totalPages ?? 1}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={page <= 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((current) => current + 1)}
                            disabled={page >= (pagination?.totalPages ?? 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
