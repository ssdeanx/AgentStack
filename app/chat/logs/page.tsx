'use client'

import { useEffect, useMemo, useState } from 'react'
import {
    useLogTransports,
    useLogs,
} from '@/lib/hooks/use-mastra-query'
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
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/ui/collapsible'
import { ScrollArea } from '@/ui/scroll-area'
import { Skeleton } from '@/ui/skeleton'
import { Switch } from '@/ui/switch'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/ui/tooltip'
import { Panel } from '@/src/components/ai-elements/panel'
import {
    CodeBlock,
    CodeBlockHeader,
    CodeBlockTitle,
    CodeBlockActions,
    CodeBlockCopyButton,
} from '@/src/components/ai-elements/code-block'
import {
    ScrollTextIcon,
    SearchIcon,
    RefreshCwIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    Loader2Icon,
    AlertCircleIcon,
    AlertTriangleIcon,
    InfoIcon,
    BugIcon,
    CircleHelpIcon,
    PanelRightCloseIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatPageShell } from '../components/chat-page-shell'
import { MainSidebar } from '../components/main-sidebar'
import { ChatProvider } from '../providers/chat-context'

type LogRecord = Record<string, unknown>

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const
type LogLevel = (typeof LOG_LEVELS)[number]

const LEVEL_CONFIG: Record<
    LogLevel,
    { color: string; icon: React.ComponentType<{ className?: string }>; badgeClass: string }
> = {
    debug: {
        color: 'text-blue-400',
        icon: BugIcon,
        badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    },
    info: {
        color: 'text-emerald-400',
        icon: InfoIcon,
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    },
    warn: {
        color: 'text-amber-400',
        icon: AlertTriangleIcon,
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    },
    error: {
        color: 'text-red-400',
        icon: AlertCircleIcon,
        badgeClass: 'bg-red-500/15 text-red-400 border-red-500/20',
    },
}

function getLevelConfig(level: string) {
    const normalized = level.toLowerCase() as LogLevel
    return LEVEL_CONFIG[normalized] ?? LEVEL_CONFIG.info
}

function formatLogTimestamp(value: unknown): string {
    if (typeof value === 'string' || typeof value === 'number') {
        try {
            return new Date(value).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                fractionalSecondDigits: 3,
            })
        } catch {
            return String(value)
        }
    }
    return '—'
}

function safeStr(value: unknown, fallback = ''): string {
    if (typeof value === 'string') {
        return value
    }
    return fallback
}

export default function LogsPage() {
    const [selectedTransport, setSelectedTransport] = useState<string>('')
    const [activeLevels, setActiveLevels] = useState<Set<LogLevel>>(
        new Set(LOG_LEVELS)
    )
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
    const [autoRefresh, setAutoRefresh] = useState(false)
    const [page, setPage] = useState(1)
    const [showHelpPanel, setShowHelpPanel] = useState(true)
    const perPage = 50

    const transportsResult = useLogTransports()
    const transports = transportsResult.data ?? []

    const activeTransport =
        selectedTransport || (transports.length > 0 ? transports[0] : '')

    const logsResult = useLogs({
        transportId: activeTransport,
        ...(activeLevels.size < LOG_LEVELS.length
            ? { level: Array.from(activeLevels).join(',') }
            : {}),
        enabled: activeTransport.trim().length > 0,
    })
    const refetchLogs = logsResult.refetch

    useEffect(() => {
        if (!autoRefresh) {
            return
        }

        const interval = window.setInterval(() => {
            void refetchLogs()
        }, 5000)

        return () => window.clearInterval(interval)
    }, [autoRefresh, refetchLogs])

    const rawLogs = useMemo<LogRecord[]>(() => {
        const data: unknown = logsResult.data
        if (Array.isArray(data)) {
            return data as LogRecord[]
        }
        if (data !== null && data !== undefined && typeof data === 'object' && 'logs' in data) {
            const { logs } = data as { logs?: unknown }
            if (Array.isArray(logs)) {
                return logs as LogRecord[]
            }
        }
        return []
    }, [logsResult.data])

    const filteredLogs = useMemo(() => {
        let result = rawLogs

        if (activeLevels.size < LOG_LEVELS.length) {
            result = result.filter((log) => {
                const level = safeStr(log.level, 'info').toLowerCase()
                return activeLevels.has(level as LogLevel)
            })
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            result = result.filter((log) => {
                const message = safeStr(log.message ?? log.msg, '')
                return message.toLowerCase().includes(q)
            })
        }

        return result
    }, [rawLogs, activeLevels, searchQuery])

    const paginatedLogs = useMemo(() => {
        const start = (page - 1) * perPage
        return filteredLogs.slice(start, start + perPage)
    }, [filteredLogs, page])

    const toggleLevel = (level: LogLevel) => {
        setActiveLevels((prev) => {
            const next = new Set(prev)
            if (next.has(level)) {
                if (next.size > 1) next.delete(level)
            } else {
                next.add(level)
            }
            return next
        })
        setPage(1)
    }

    const toggleRow = (idx: number) => {
        setExpandedRows((prev) => {
            const next = new Set(prev)
            if (next.has(idx)) {
                next.delete(idx)
            } else {
                next.add(idx)
            }
            return next
        })
    }

    const kpis = useMemo(() => {
        const counts: Record<string, number> = {
            debug: 0,
            info: 0,
            warn: 0,
            error: 0,
        }
        for (const log of rawLogs) {
            const level = safeStr(log.level, 'info').toLowerCase()
            if (level in counts) counts[level]++
        }
        return counts
    }, [rawLogs])

    return (
        <ChatProvider>
            <ChatPageShell
                title="Logs"
                description="Inspect live log streams from the shared chat shell."
                sidebar={<MainSidebar />}
                hideHeader
                contentClassName="p-0"
            >
        <TooltipProvider delayDuration={150}>
        <div className="flex h-full min-h-0 flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ScrollTextIcon className="size-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">
                            Logs
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Browse and search structured log entries across all
                            transports
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                    Auto-refresh
                                </span>
                                <Switch
                                    checked={autoRefresh}
                                    onCheckedChange={setAutoRefresh}
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            When enabled, the page refetches logs every five seconds.
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetchLogs()}
                                disabled={logsResult.isFetching}
                                className="gap-1.5"
                            >
                                {logsResult.isFetching ? (
                                    <Loader2Icon className="size-3.5 animate-spin" />
                                ) : (
                                    <RefreshCwIcon className="size-3.5" />
                                )}
                                Refresh
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Refetch the latest logs from the selected transport.</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowHelpPanel((current) => !current)}
                                aria-label={showHelpPanel ? 'Hide logs help panel' : 'Show logs help panel'}
                            >
                                {showHelpPanel ? (
                                    <PanelRightCloseIcon className="size-4" />
                                ) : (
                                    <CircleHelpIcon className="size-4" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {showHelpPanel ? 'Hide the logs help panel.' : 'Show the logs help panel.'}
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {showHelpPanel ? (
                <Panel position="top-right" className="pointer-events-auto z-20 w-88">
                    <div className="rounded-3xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-sm font-semibold text-foreground">Logs help</div>
                                <div className="text-xs text-muted-foreground">
                                    Search, filter, and expand structured logs from the live transport stream.
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowHelpPanel(false)}
                                aria-label="Close logs help panel"
                            >
                                <PanelRightCloseIcon className="size-4" />
                            </Button>
                        </div>

                        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                            <p>Turn on auto-refresh when you want the page to stay current without manual polling.</p>
                            <p>Use the severity cards to filter quickly, then expand a row to see metadata.</p>
                        </div>
                    </div>
                </Panel>
            ) : null}

            {/* Level KPI Badges */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {(LOG_LEVELS as readonly LogLevel[]).map((level) => {
                    const config = LEVEL_CONFIG[level]
                    const LevelIcon = config.icon
                    const isActive = activeLevels.has(level)
                    return (
                        <Card
                            key={level}
                            className={cn(
                                'border-white/5 bg-card/50 backdrop-blur-xl cursor-pointer transition-all duration-300',
                                isActive
                                    ? 'ring-1 ring-white/10'
                                    : 'opacity-40'
                            )}
                            onClick={() => toggleLevel(level)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div
                                        className={cn(
                                            'flex items-center gap-2',
                                            config.color
                                        )}
                                    >
                                        <LevelIcon className="size-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">
                                            {level}
                                        </span>
                                    </div>
                                    <span className="text-xl font-bold tabular-nums">
                                        {logsResult.isLoading ? (
                                            <Skeleton className="h-6 w-8" />
                                        ) : (
                                            kpis[level]
                                        )}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Filters Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setPage(1)
                        }}
                        placeholder="Search log messages..."
                        className="pl-9 h-9 text-sm bg-card/50 border-white/10"
                    />
                </div>
                <Select
                    value={activeTransport}
                    onValueChange={(v) => {
                        setSelectedTransport(v)
                        setPage(1)
                    }}
                >
                    <SelectTrigger className="w-45 h-9 text-sm bg-card/50 border-white/10">
                        <SelectValue placeholder="Transport" />
                    </SelectTrigger>
                    <SelectContent>
                        {transports.length === 0 ? (
                            <SelectItem value="__no-transport__" disabled>
                                No transports
                            </SelectItem>
                        ) : (
                            transports.map((t) => (
                                <SelectItem key={t} value={t}>
                                    {t}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            </div>

            {/* Log Table */}
            <div className="flex-1 min-h-0 rounded-xl border border-white/5 bg-card/30 backdrop-blur-xl overflow-hidden">
                <ScrollArea className="h-full">
                    {logsResult.isLoading ? (
                        <div className="p-6 space-y-3">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <Skeleton
                                    key={`skel-${i}`}
                                    className="h-10 w-full"
                                />
                            ))}
                        </div>
                    ) : paginatedLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <ScrollTextIcon className="size-12 text-muted-foreground/20 mb-3" />
                            <p className="text-sm text-muted-foreground">
                                No logs found
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                                Adjust filters or check that log transports are
                                configured
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="w-10" />
                                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 w-45">
                                        Timestamp
                                    </TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 w-20">
                                        Level
                                    </TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                        Message
                                    </TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 w-30">
                                        Source
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedLogs.map((log, idx) => {
                                    const globalIdx = (page - 1) * perPage + idx
                                    const level = safeStr(
                                        log.level,
                                        'info'
                                    ).toLowerCase()
                                    const config = getLevelConfig(level)
                                    const LevelIcon = config.icon
                                    const message = safeStr(
                                        log.message ?? log.msg,
                                        '(empty)'
                                    )
                                    const timestamp = formatLogTimestamp(
                                        log.timestamp ?? log.time ?? log.createdAt
                                    )
                                    const source = safeStr(
                                        log.source ??
                                            log.logger ??
                                            log.component,
                                        ''
                                    )
                                    const isExpanded =
                                        expandedRows.has(globalIdx)

                                    const metadata = { ...log }
                                    delete metadata.message
                                    delete metadata.msg
                                    delete metadata.level
                                    delete metadata.timestamp
                                    delete metadata.time
                                    delete metadata.createdAt

                                    return (
                                        <Collapsible
                                            key={globalIdx}
                                            open={isExpanded}
                                            onOpenChange={() =>
                                                toggleRow(globalIdx)
                                            }
                                            asChild
                                        >
                                            <>
                                                <CollapsibleTrigger asChild>
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
                                                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                                                            {timestamp}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    'text-[10px] font-bold uppercase tracking-wider gap-1',
                                                                    config.badgeClass
                                                                )}
                                                            >
                                                                <LevelIcon className="size-3" />
                                                                {level}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sm max-w-100 truncate">
                                                            {message}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground/60 font-mono truncate max-w-30">
                                                            {source}
                                                        </TableCell>
                                                    </TableRow>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent asChild>
                                                    <tr>
                                                        <td
                                                            colSpan={5}
                                                            className="p-0"
                                                        >
                                                            <div className="border-t border-white/5 bg-muted/20 p-4">
                                                                <p className="text-sm text-foreground mb-3 whitespace-pre-wrap break-all">
                                                                    {message}
                                                                </p>
                                                                {Object.keys(
                                                                    metadata
                                                                ).length >
                                                                    0 && (
                                                                    <CodeBlock
                                                                        code={JSON.stringify(
                                                                            metadata,
                                                                            null,
                                                                            2
                                                                        )}
                                                                        language="json"
                                                                        showLineNumbers
                                                                    >
                                                                        <CodeBlockHeader>
                                                                            <CodeBlockTitle>
                                                                                metadata.json
                                                                            </CodeBlockTitle>
                                                                            <CodeBlockActions>
                                                                                <CodeBlockCopyButton />
                                                                            </CodeBlockActions>
                                                                        </CodeBlockHeader>
                                                                    </CodeBlock>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </CollapsibleContent>
                                            </>
                                        </Collapsible>
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
                    {filteredLogs.length} logs · Page {page} of{' '}
                    {Math.max(1, Math.ceil(filteredLogs.length / perPage))}
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
                        disabled={page * perPage >= filteredLogs.length}
                        onClick={() => setPage((p) => p + 1)}
                        className="h-8 gap-1"
                    >
                        Next
                        <ChevronRightIcon className="size-3.5" />
                    </Button>
                </div>
            </div>
        </div>
        </TooltipProvider>
            </ChatPageShell>
        </ChatProvider>
    )
}
