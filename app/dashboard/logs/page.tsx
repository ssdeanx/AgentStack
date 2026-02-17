'use client'

import { useMemo, useState } from 'react'
import { useLogs, useRunLogs, useLogTransports } from '@/lib/hooks/use-mastra'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { ScrollArea } from '@/ui/scroll-area'
import { Skeleton } from '@/ui/skeleton'
import { Label } from '@/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/select'
import {
    FileText,
    Search,
    RefreshCw,
    AlertCircle,
    AlertTriangle,
    Info,
    Bug,
    ChevronDown,
    ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogRecord {
    id?: string
    level?: string
    message?: string
    timestamp?: string
    source?: string
    runId?: string
    metadata?: Record<string, string | number | boolean | null>
}

function isLogRecord(value: unknown): value is LogRecord {
    return typeof value === 'object' && value !== null
}

function normalizeLogs(value: unknown): LogRecord[] {
    if (!Array.isArray(value)) {
        return []
    }

    return value.filter(isLogRecord)
}

function normalizeTransports(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return []
    }

    return value.filter((item): item is string => typeof item === 'string')
}

function normalizeLevel(level: string | undefined): LogLevel {
    if (level === 'error' || level === 'warn' || level === 'debug') {
        return level
    }
    return 'info'
}

export default function LogsPage() {
    const { data: transportData, loading: transportsLoading } = useLogTransports()
    const [selectedTransport, setSelectedTransport] = useState<string>('all')
    const [runIdFilter, setRunIdFilter] = useState('')

    const {
        data: logData,
        loading,
        error,
        refetch,
    } = useLogs(selectedTransport === 'all' ? undefined : selectedTransport)

    const { data: runLogData, loading: runLogsLoading } = useRunLogs(
        runIdFilter || null,
        selectedTransport === 'all' ? undefined : selectedTransport
    )

    const [searchQuery, setSearchQuery] = useState('')
    const [levelFilter, setLevelFilter] = useState<string>('all')

    const transports = normalizeTransports(transportData)
    const logs = normalizeLogs(logData)
    const runLogs = normalizeLogs(runLogData)

    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            const message = log.message ?? ''
            const matchesSearch =
                searchQuery.length === 0 ||
                message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                JSON.stringify(log).toLowerCase().includes(searchQuery.toLowerCase())

            const matchesLevel =
                levelFilter === 'all' || normalizeLevel(log.level) === levelFilter

            return matchesSearch && matchesLevel
        })
    }, [logs, searchQuery, levelFilter])

    return (
        <div className="flex h-full flex-col">
            <div className="border-b p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">System Logs</h1>
                    <Button variant="outline" size="sm" onClick={() => void refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>

                <div className="flex flex-wrap gap-4">
                    <div className="w-64">
                        <Label className="text-xs text-muted-foreground">Transport</Label>
                        <Select
                            value={selectedTransport}
                            onValueChange={setSelectedTransport}
                            disabled={transportsLoading}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select transport" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Transports</SelectItem>
                                {transports.map((transport) => (
                                    <SelectItem key={transport} value={transport}>
                                        {transport}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-64">
                        <Label className="text-xs text-muted-foreground">Log Level</Label>
                        <Select value={levelFilter} onValueChange={setLevelFilter}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="All Levels" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Levels</SelectItem>
                                <SelectItem value="error">Error</SelectItem>
                                <SelectItem value="warn">Warning</SelectItem>
                                <SelectItem value="info">Info</SelectItem>
                                <SelectItem value="debug">Debug</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 min-w-64">
                        <Label className="text-xs text-muted-foreground">Search</Label>
                        <div className="relative mt-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search logs..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid flex-1 gap-4 p-4 lg:grid-cols-2">
                <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/30">
                        <CardTitle>All Logs</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="space-y-2 p-4">
                                {Array.from({ length: 10 }).map((_, index) => (
                                    <Skeleton key={index} className="h-16 w-full" />
                                ))}
                            </div>
                        ) : error ? (
                            <div className="p-4 text-sm text-destructive">{error.message}</div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                No logs found.
                            </div>
                        ) : (
                            <ScrollArea className="h-160">
                                <div className="space-y-2 p-4">
                                    {filteredLogs.map((log, index) => (
                                        <LogEntry key={log.id ?? String(index)} log={log} />
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/30 space-y-3">
                        <CardTitle>Run Logs</CardTitle>
                        <Input
                            value={runIdFilter}
                            onChange={(event) => setRunIdFilter(event.target.value)}
                            placeholder="Enter run ID to fetch logs"
                        />
                    </CardHeader>
                    <CardContent className="p-0">
                        {!runIdFilter ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                Enter a run ID to view logs.
                            </div>
                        ) : runLogsLoading ? (
                            <div className="space-y-2 p-4">
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <Skeleton key={index} className="h-16 w-full" />
                                ))}
                            </div>
                        ) : runLogs.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                No logs found for this run.
                            </div>
                        ) : (
                            <ScrollArea className="h-160">
                                <div className="space-y-2 p-4">
                                    {runLogs.map((log, index) => (
                                        <LogEntry key={log.id ?? String(index)} log={log} />
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function LogEntry({ log }: { log: LogRecord }) {
    const [expanded, setExpanded] = useState(false)

    const level = normalizeLevel(log.level)
    const levelConfig: Record<LogLevel, { icon: typeof Info; color: string; bg: string }> = {
        error: {
            icon: AlertCircle,
            color: 'text-destructive',
            bg: 'bg-destructive/10',
        },
        warn: {
            icon: AlertTriangle,
            color: 'text-secondary dark:text-secondary-foreground',
            bg: 'bg-secondary/10 dark:bg-secondary/30',
        },
        info: {
            icon: Info,
            color: 'text-primary dark:text-primary-foreground',
            bg: 'bg-primary/10 dark:bg-primary/30',
        },
        debug: {
            icon: Bug,
            color: 'text-muted-foreground',
            bg: 'bg-muted',
        },
    }

    const config = levelConfig[level]
    const Icon = config.icon

    return (
        <div className={cn('rounded-md border', config.bg)}>
            <button onClick={() => setExpanded(!expanded)} className="w-full p-3 text-left">
                <div className="flex items-start gap-3">
                    <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', config.color)} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                                {level.toUpperCase()}
                            </Badge>
                            {log.timestamp ? (
                                <span className="text-xs text-muted-foreground">
                                    {new Date(log.timestamp).toLocaleString()}
                                </span>
                            ) : null}
                            {(log.source) ? (
                                <Badge variant="secondary" className="text-xs">
                                    {log.source}
                                </Badge>
                            ) : null}
                        </div>
                        <p className="mt-1 text-sm truncate">{log.message ?? 'No message'}</p>
                    </div>
                    {expanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                </div>
            </button>

            {expanded ? (
                <div className="border-t px-3 pb-3">
                    <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-background p-3 text-xs">
                        {JSON.stringify(log, null, 2)}
                    </pre>
                </div>
            ) : null}
        </div>
    )
}
