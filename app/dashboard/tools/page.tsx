"use client"

import { useState } from "react"
import { useTools, useTool, useExecuteTool } from "@/lib/hooks/use-mastra"
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
  Wrench,
  Search,
  RefreshCw,
  Play,
  ChevronRight,
  Loader2,
  Code,
} from "lucide-react"

export default function ToolsPage() {
  const { data: tools, loading, error, refetch } = useTools()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null)

  const filteredTools = tools?.filter(
    (tool) =>
      tool.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tool as any).name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-full">
      {/* Tool List */}
      <div className="flex w-80 flex-col border-r">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tools</h2>
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
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
              {filteredTools?.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedToolId(tool.id)}
                  className={`w-full rounded-md p-3 text-left transition-colors hover:bg-accent ${
                    selectedToolId === tool.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 truncate">
                      <div className="font-medium">{tool.id}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {(tool as any).description || "No description"}
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
          {filteredTools?.length ?? 0} tools
        </div>
      </div>

      {/* Tool Details */}
      <div className="flex-1 overflow-auto">
        {selectedToolId ? (
          <ToolDetails toolId={selectedToolId} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Wrench className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Select a tool to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ToolDetails({ toolId }: { toolId: string }) {
  const { data: tool, loading, error } = useTool(toolId)
  const { execute, loading: executing, error: execError, result } = useExecuteTool()
  const [execDialogOpen, setExecDialogOpen] = useState(false)
  const [argsInput, setArgsInput] = useState("{}")

  const handleExecute = async () => {
    try {
      const parsedArgs = JSON.parse(argsInput)
      await execute(toolId, parsedArgs)
    } catch (err) {
      // JSON parse error handled by the hook
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
        Error loading tool: {error.message}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{toolId}</h1>
          <p className="text-muted-foreground mt-1">
            {(tool as any)?.description || "No description available"}
          </p>
        </div>
        <Dialog open={execDialogOpen} onOpenChange={setExecDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Play className="h-4 w-4 mr-2" />
              Execute Tool
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Execute {toolId}</DialogTitle>
              <DialogDescription>
                Enter arguments as JSON to execute this tool
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Arguments (JSON)</label>
                <Textarea
                  value={argsInput}
                  onChange={(e) => setArgsInput(e.target.value)}
                  placeholder='{"param1": "value1"}'
                  className="mt-1 font-mono text-sm h-32"
                />
              </div>
              {execError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {execError.message}
                </div>
              )}
              {result != null && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Result</label>
                  <pre className="text-sm bg-muted p-3 rounded-md overflow-auto max-h-48">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setExecDialogOpen(false)}
              >
                Close
              </Button>
              <Button onClick={handleExecute} disabled={executing}>
                {executing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {executing ? "Executing..." : "Execute"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="input-schema">Input Schema</TabsTrigger>
          <TabsTrigger value="output-schema">Output Schema</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tool Configuration</CardTitle>
              <CardDescription>Raw tool configuration data</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify(tool, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="input-schema" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Input Schema
              </CardTitle>
              <CardDescription>
                Expected input parameters for this tool
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(tool as any)?.inputSchema ? (
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-auto max-h-64">
                  {JSON.stringify((tool as any).inputSchema, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">No input schema defined</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="output-schema" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Output Schema
              </CardTitle>
              <CardDescription>
                Expected output format from this tool
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(tool as any)?.outputSchema ? (
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-auto max-h-64">
                  {JSON.stringify((tool as any).outputSchema, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">No output schema defined</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
