"use client"

import { useState } from "react"
import { useWorkflows, useWorkflow } from "@/lib/hooks/use-mastra"
import { mastraClient } from "@/lib/mastra-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { Badge } from "@/ui/badge"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Textarea } from "@/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { ScrollArea } from "@/ui/scroll-area"
import { Skeleton } from "@/ui/skeleton"
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
  Workflow,
  Search,
  RefreshCw,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import type { Route } from "next"

export default function WorkflowsPage() {
  const { data: workflows, loading, error, refetch } = useWorkflows()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)

  const workflowList = workflows
    ? Object.entries(workflows).map(([id, wf]) => ({ id, ...(wf as any) }))
    : []

  const filteredWorkflows = workflowList.filter((wf) =>
    Boolean(wf.id.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="flex h-full">
      {/* Workflow List */}
      <div className="flex w-80 flex-col border-r">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Workflows</h2>
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-destructive">
              Error: {error.message}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredWorkflows.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => setSelectedWorkflowId(wf.id)}
                  className={`w-full rounded-md p-3 text-left transition-colors hover:bg-accent ${
                    selectedWorkflowId === wf.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Workflow className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 truncate">
                      <div className="font-medium">{wf.id}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {(wf).description ?? "No description"}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-4 text-sm text-muted-foreground">
          {filteredWorkflows.length} workflows
        </div>
      </div>

      {/* Workflow Details */}
      <div className="flex-1 overflow-auto">
        {selectedWorkflowId ? (
          <WorkflowDetails workflowId={selectedWorkflowId} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Workflow className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Select a workflow to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function WorkflowDetails({ workflowId }: { workflowId: string }) {
  const { data: workflow, loading, error, refetch } = useWorkflow(workflowId)
  const [runDialogOpen, setRunDialogOpen] = useState(false)
  const [inputData, setInputData] = useState("{}")
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<any>(null)
  const [runError, setRunError] = useState<string | null>(null)

  const handleRunWorkflow = async () => {
    setRunning(true)
    setRunError(null)
    setRunResult(null)

    try {
      const parsedInput = JSON.parse(inputData)
      const wf = mastraClient.getWorkflow(workflowId)
      const run = await wf.createRun()
      const result = await run.startAsync({ inputData: parsedInput })
      setRunResult(result)
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
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
        Error loading workflow: {error.message}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{workflowId}</h1>
          <p className="text-muted-foreground mt-1">
            {(workflow as any)?.description ?? "No description available"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/workflows?workflow=${workflowId}` as Route}>
            <Button variant="outline" size="sm">
              <Play className="h-4 w-4 mr-2" />
              Interactive View
            </Button>
          </Link>
          <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Play className="h-4 w-4 mr-2" />
                Run Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Run {workflowId}</DialogTitle>
                <DialogDescription>
                  Enter input data as JSON to start a workflow run
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Input Data (JSON)</label>
                  <Textarea
                    value={inputData}
                    onChange={(e) => setInputData(e.target.value)}
                    placeholder='{"key": "value"}'
                    className="mt-1 font-mono text-sm h-32"
                  />
                </div>
                {runError && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {runError}
                  </div>
                )}
                {runResult && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Result</label>
                    <pre className="text-sm bg-muted p-3 rounded-md overflow-auto max-h-48">
                      {JSON.stringify(runResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setRunDialogOpen(false)}
                >
                  Close
                </Button>
                <Button onClick={handleRunWorkflow} disabled={running}>
                  {running && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {running ? "Running..." : "Run"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(workflow as any)?.steps?.length ?? "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="default">Active</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(workflow as any)?.type ?? "Standard"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="schema">Input Schema</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Configuration</CardTitle>
              <CardDescription>Raw workflow configuration data</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify(workflow, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="steps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Steps</CardTitle>
              <CardDescription>
                Steps executed during workflow run
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(workflow as any)?.steps?.length > 0 ? (
                <div className="space-y-3">
                  {(workflow as any).steps.map((step: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 bg-muted rounded-md"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {(step.id ?? step.name) ?? `Step ${index + 1}`}
                        </div>
                        {step.description && (
                          <div className="text-sm text-muted-foreground">
                            {step.description}
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {step.type || "Action"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Step information not available. View the workflow definition for details.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schema" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Input Schema</CardTitle>
              <CardDescription>
                Expected input data format for this workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(workflow as any)?.inputSchema ? (
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-auto max-h-64">
                  {JSON.stringify((workflow as any).inputSchema, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">
                  No input schema defined
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
