"use client"

import { useState } from "react"
import { useAITraces, useAITrace, useScoreTraces } from "@/lib/hooks/use-mastra"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog"
import {
  Activity,
  Search,
  RefreshCw,
  ChevronRight,
  Loader2,
  Clock,
  Target,
  Zap,
  BarChart3,
} from "lucide-react"

export default function ObservabilityPage() {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [nameFilter, setNameFilter] = useState("")
  const [spanTypeFilter, setSpanTypeFilter] = useState<string>("")
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("")

  const { data: traces, loading, error, refetch } = useAITraces({
    page,
    perPage,
    filters: {
      name: nameFilter || undefined,
      spanType: spanTypeFilter || undefined,
      entityType: (entityTypeFilter || undefined) as "agent" | "workflow" | undefined,
    },
  })

  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null)

  return (
    <div className="flex h-full">
      {/* Trace List */}
      <div className="flex w-[450px] flex-col border-r">
        <div className="border-b p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">AI Traces</h2>
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters */}
          <div className="grid gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter by name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={spanTypeFilter} onValueChange={setSpanTypeFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Span Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="tool">Tool</SelectItem>
                  <SelectItem value="workflow">Workflow</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                </SelectContent>
              </Select>
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Entities</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="tool">Tool</SelectItem>
                  <SelectItem value="workflow">Workflow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-destructive">
              Error: {error.message}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {(traces as any)?.spans?.map((span: any) => (
                <button
                  key={span.traceId}
                  onClick={() => setSelectedTraceId(span.traceId)}
                  className={`w-full rounded-md p-3 text-left transition-colors hover:bg-accent ${
                    selectedTraceId === span.traceId ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Activity className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{span.name || span.traceId}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {span.spanType || "unknown"}
                        </Badge>
                        {span.duration && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {span.duration}ms
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {span.startTime ? new Date(span.startTime).toLocaleString() : "No timestamp"}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </button>
              ))}
              {(!traces || !(traces as any)?.spans?.length) && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No traces found
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Pagination */}
        <div className="border-t p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Page {page} of {(traces as any)?.pagination?.totalPages ?? 1}
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
                disabled={page >= ((traces as any)?.pagination?.totalPages ?? 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Trace Details */}
      <div className="flex-1 overflow-auto">
        {selectedTraceId ? (
          <TraceDetails traceId={selectedTraceId} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Activity className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Select a trace to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TraceDetails({ traceId }: { traceId: string }) {
  const { data: trace, loading, error } = useAITrace(traceId)
  const { score, loading: scoring } = useScoreTraces()
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false)
  const [scorerName, setScorerName] = useState("answer-relevancy")
  const [scoreResult, setScoreResult] = useState<any>(null)

  const handleScore = async () => {
    try {
      const result = await score({
        scorerName,
        targets: [{ traceId }],
      })
      setScoreResult(result)
    } catch (err) {
      console.error("Scoring failed:", err)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-destructive">
        Error loading trace: {error.message}
      </div>
    )
  }

  const traceData = trace as any

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{traceData?.name || traceId}</h1>
          <p className="text-muted-foreground mt-1">
            Trace ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{traceId}</code>
          </p>
        </div>
        <Dialog open={scoreDialogOpen} onOpenChange={setScoreDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Target className="h-4 w-4 mr-2" />
              Score Trace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Score Trace</DialogTitle>
              <DialogDescription>
                Evaluate this trace using a registered scorer
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Scorer Name</Label>
                <Input
                  value={scorerName}
                  onChange={(e) => setScorerName(e.target.value)}
                  placeholder="answer-relevancy"
                  className="mt-1"
                />
              </div>
              {scoreResult && (
                <div className="space-y-2">
                  <Label>Result</Label>
                  <pre className="text-sm bg-muted p-3 rounded-md overflow-auto max-h-48">
                    {JSON.stringify(scoreResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScoreDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={handleScore} disabled={scoring}>
                {scoring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Score
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {traceData?.duration ? `${traceData.duration}ms` : "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Spans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {traceData?.spans?.length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">
              {traceData?.spanType || "Unknown"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={traceData?.status === "ok" || traceData?.status === "success" ? "default" : "destructive"}
            >
              {traceData?.status || "Unknown"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="spans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="spans">Spans</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="raw">Raw Data</TabsTrigger>
        </TabsList>

        <TabsContent value="spans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Span Timeline</CardTitle>
              <CardDescription>
                All spans in this trace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {traceData?.spans?.length > 0 ? (
                  <div className="space-y-2">
                    {traceData.spans.map((span: any, index: number) => (
                      <div
                        key={span.spanId || index}
                        className="p-4 bg-muted rounded-md"
                        style={{ marginLeft: `${(span.depth || 0) * 20}px` }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{span.name || `Span ${index + 1}`}</div>
                            <div className="text-sm text-muted-foreground">
                              {span.spanId}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {span.duration && (
                              <span className="text-xs text-muted-foreground">
                                {span.duration}ms
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {span.spanType || span.kind || "unknown"}
                            </Badge>
                          </div>
                        </div>
                        {span.attributes && Object.keys(span.attributes).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer">
                              Attributes
                            </summary>
                            <pre className="mt-1 text-xs bg-background p-2 rounded overflow-auto">
                              {JSON.stringify(span.attributes, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No spans available</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attributes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trace Attributes</CardTitle>
              <CardDescription>
                Metadata and attributes for this trace
              </CardDescription>
            </CardHeader>
            <CardContent>
              {traceData?.attributes ? (
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-auto max-h-96">
                  {JSON.stringify(traceData.attributes, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">No attributes available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Raw Trace Data</CardTitle>
              <CardDescription>
                Complete trace object
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify(trace, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
