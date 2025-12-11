"use client"

import { useState } from "react"
import { useAITraces } from "@/lib/hooks/use-mastra"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { Badge } from "@/ui/badge"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { ScrollArea } from "@/ui/scroll-area"
import { Skeleton } from "@/ui/skeleton"
import { Label } from "@/ui/label"
import {
  BarChart3,
  Search,
  RefreshCw,
  Activity,
  Clock,
  TrendingUp,
  Database,
} from "lucide-react"

export default function TelemetryPage() {
  const [nameFilter, setNameFilter] = useState("")
  const [scopeFilter, setScopeFilter] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)

  const { data: telemetry, loading, error, refetch } = useAITraces({
    page,
    perPage,
    filters: {
      name: nameFilter || undefined,
      // scope: scopeFilter || undefined, // scope not supported in filters
    },
  })

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Telemetry</h1>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="w-64">
            <Label className="text-xs text-muted-foreground">Trace Name</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter by name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="w-64">
            <Label className="text-xs text-muted-foreground">Scope</Label>
            <Input
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              placeholder="Filter by scope..."
              className="mt-1"
            />
          </div>

          <div className="w-32">
            <Label className="text-xs text-muted-foreground">Per Page</Label>
            <Input
              type="number"
              value={perPage}
              onChange={(e) => setPerPage(parseInt(e.target.value) || 20)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="border-b p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Total Traces
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number((telemetry as unknown as Record<string, unknown>)?.total ?? (Array.isArray(telemetry) ? telemetry.length : 0))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Avg Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {calculateAvgDuration(telemetry)}ms
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {calculateSuccessRate(telemetry)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Unique Scopes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {countUniqueScopes(telemetry)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Telemetry Data */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-destructive">
            Error: {error.message}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {Array.isArray(telemetry) && telemetry.length > 0 ? (
              telemetry.map((item: any, index: number) => (
                <TelemetryEntry key={item.id || index} entry={item} />
              ))
            ) : (telemetry as any)?.traces?.length > 0 ? (
              (telemetry as any).traces.map((item: any, index: number) => (
                <TelemetryEntry key={item.id || index} entry={item} />
              ))
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No telemetry data found</p>
                  <p className="text-sm mt-1">Try adjusting your filters</p>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Pagination */}
      <div className="border-t p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TelemetryEntry({ entry }: { entry: any }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{entry.name || "Unnamed Trace"}</CardTitle>
            <CardDescription className="mt-1">
              {entry.scope && (
                <Badge variant="secondary" className="mr-2">
                  {entry.scope}
                </Badge>
              )}
              {entry.timestamp && (
                <span className="text-xs">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {entry.duration && (
              <Badge variant="outline">
                {entry.duration}ms
              </Badge>
            )}
            {entry.status && (
              <Badge
                variant={
                  entry.status === "ok" || entry.status === "success"
                    ? "default"
                    : "destructive"
                }
              >
                {entry.status}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="space-y-4">
            {entry.attributes && (
              <div>
                <Label className="text-xs text-muted-foreground">Attributes</Label>
                <pre className="mt-1 text-sm bg-muted p-3 rounded-md overflow-auto max-h-48">
                  {JSON.stringify(entry.attributes, null, 2)}
                </pre>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Raw Data</Label>
              <pre className="mt-1 text-sm bg-muted p-3 rounded-md overflow-auto max-h-48">
                {JSON.stringify(entry, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function calculateAvgDuration(telemetry: any): string {
  const items = Array.isArray(telemetry) ? telemetry : (telemetry?.traces ?? [])
  if (!items.length) {return "N/A"}

  const durations = items.filter((i: any) => i.duration).map((i: any) => i.duration)
  if (!durations.length) {return "N/A"}

  const avg = durations.reduce((a: number, b: number) => a + b, 0) / durations.length
  return avg.toFixed(0)
}

function calculateSuccessRate(telemetry: any): string {
  const items = Array.isArray(telemetry) ? telemetry : (telemetry?.traces ?? [])
  if (!items.length) {return "N/A"}

  const success = items.filter(
    (i: any) => i.status === "ok" || i.status === "success" || !i.status
  ).length
  return ((success / items.length) * 100).toFixed(0)
}

function countUniqueScopes(telemetry: any): number {
  const items = Array.isArray(telemetry) ? telemetry : (telemetry?.traces || [])
  const scopes = new Set(items.map((i: any) => i.scope).filter(Boolean))
  return scopes.size
}
