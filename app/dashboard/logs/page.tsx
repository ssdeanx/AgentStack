"use client"

import { useState } from "react"
import { useLogs, useRunLogs, useLogTransports } from "@/lib/hooks/use-mastra"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { Badge } from "@/ui/badge"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { ScrollArea } from "@/ui/scroll-area"
import { Skeleton } from "@/ui/skeleton"
import { Label } from "@/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function LogsPage() {
  const { data: transports, loading: transportsLoading } = useLogTransports()
  const [selectedTransport, setSelectedTransport] = useState<string>("all")
  const [runIdFilter, setRunIdFilter] = useState("")
  const { data: logs, loading, error, refetch } = useLogs(selectedTransport === "all" ? undefined : selectedTransport)
  const { data: runLogs, loading: runLogsLoading } = useRunLogs(
    runIdFilter || null,
    selectedTransport === "all" ? undefined : selectedTransport
  )

  const [searchQuery, setSearchQuery] = useState("")
  const [levelFilter, setLevelFilter] = useState<string>("all")

  const logsArray = Array.isArray(logs) ? logs : (logs as unknown as { logs?: unknown[] })?.logs ?? []
  const filteredLogs = logsArray.filter((log: Record<string, unknown>) => {
    const matchesSearch =
      !searchQuery ||
      (log.message as string)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log).toLowerCase().includes(searchQuery.toLowerCase())

    const matchesLevel = levelFilter === "all" || log.level === levelFilter

    return matchesSearch && matchesLevel
  })

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">System Logs</h1>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
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
                {((transports as unknown as { transports?: string[] })?.transports ?? []).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <div className="border-b px-4">
          <TabsList className="h-10">
            <TabsTrigger value="all">All Logs</TabsTrigger>
            <TabsTrigger value="run">Run Logs</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="space-y-2 p-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-destructive">
                Error: {error.message}
              </div>
            ) : filteredLogs && filteredLogs.length > 0 ? (
              <div className="p-4 space-y-2">
                {filteredLogs.map((log: any, index: number) => (
                  <LogEntry key={log.id ?? index} log={log} />
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No logs found</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="run" className="flex-1 m-0 overflow-hidden flex flex-col">
          <div className="border-b p-4">
            <div className="max-w-md">
              <Label className="text-xs text-muted-foreground">Run ID</Label>
              <Input
                value={runIdFilter}
                onChange={(e) => setRunIdFilter(e.target.value)}
                placeholder="Enter run ID to fetch logs"
                className="mt-1"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {!runIdFilter ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Search className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Enter a Run ID to view logs</p>
                </div>
              </div>
            ) : runLogsLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : runLogs ? (
              <div className="p-4 space-y-2">
                {Array.isArray(runLogs) ? (
                  runLogs.map((log: any, index: number) => (
                    <LogEntry key={log.id ?? index} log={log} />
                  ))
                ) : (
                  <LogEntry log={runLogs} />
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No logs found for this run</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function LogEntry({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false)

  const levelConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
    error: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
    warn: { icon: AlertTriangle, color: "text-secondary dark:text-secondary-foreground", bg: "bg-secondary/10 dark:bg-secondary/30" },
    info: { icon: Info, color: "text-primary dark:text-primary-foreground", bg: "bg-primary/10 dark:bg-primary/30" },
    debug: { icon: Bug, color: "text-muted-foreground", bg: "bg-muted" },
  }

  const level = log.level?.toLowerCase() ?? "info"
  const config = levelConfig[level] || levelConfig.info
  const Icon = config.icon

  return (
    <div className={cn("rounded-md border", config.bg)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-left"
      >
        <div className="flex items-start gap-3">
          <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {level.toUpperCase()}
              </Badge>
              {log.timestamp && (
                <span className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              )}
              {log.source && (
                <Badge variant="secondary" className="text-xs">
                  {log.source}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm truncate">{log.message ?? JSON.stringify(log)}</p>
          </div>
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-3 pb-3">
          <pre className="mt-3 text-xs bg-background p-3 rounded-md overflow-auto max-h-64">
            {JSON.stringify(log, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
