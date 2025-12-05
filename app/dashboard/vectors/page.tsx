"use client"

import { useState } from "react"
import { useVectorIndexes, useVectorDetails, useVectorQuery } from "@/lib/hooks/use-mastra"
import { mastraClient } from "@/lib/mastra-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { Badge } from "@/ui/badge"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Textarea } from "@/ui/textarea"
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
  Database,
  Search,
  RefreshCw,
  Plus,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react"

const DEFAULT_VECTOR_STORE = "pgVector"

export default function VectorsPage() {
  const [vectorStore, setVectorStore] = useState(DEFAULT_VECTOR_STORE)
  const { data: indexes, loading, error, refetch } = useVectorIndexes(vectorStore)
  const [selectedIndex, setSelectedIndex] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newIndexName, setNewIndexName] = useState("")
  const [newIndexDimension, setNewIndexDimension] = useState("1536")
  const [newIndexMetric, setNewIndexMetric] = useState<"cosine" | "euclidean" | "dotproduct">("cosine")
  const [creating, setCreating] = useState(false)

  const handleCreateIndex = async () => {
    setCreating(true)
    try {
      const vector = mastraClient.getVector(vectorStore)
      await vector.createIndex({
        indexName: newIndexName,
        dimension: parseInt(newIndexDimension),
        metric: newIndexMetric,
      })
      refetch()
      setCreateDialogOpen(false)
      setNewIndexName("")
    } catch (err) {
      console.error("Failed to create index:", err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Index List */}
      <div className="flex w-80 flex-col border-r">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Vector Indexes</h2>
            <div className="flex gap-1">
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Vector Index</DialogTitle>
                    <DialogDescription>
                      Create a new vector index for semantic search
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Index Name</Label>
                      <Input
                        value={newIndexName}
                        onChange={(e) => setNewIndexName(e.target.value)}
                        placeholder="my-index"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Dimension</Label>
                      <Input
                        type="number"
                        value={newIndexDimension}
                        onChange={(e) => setNewIndexDimension(e.target.value)}
                        placeholder="1536"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Metric</Label>
                      <Select
                        value={newIndexMetric}
                        onValueChange={(v) => setNewIndexMetric(v as typeof newIndexMetric)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cosine">Cosine</SelectItem>
                          <SelectItem value="euclidean">Euclidean</SelectItem>
                          <SelectItem value="dotproduct">Dot Product</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateIndex} disabled={creating || !newIndexName}>
                      {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-xs text-muted-foreground">Vector Store</Label>
            <Input
              value={vectorStore}
              onChange={(e) => setVectorStore(e.target.value)}
              placeholder="pgVector"
              className="mt-1"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="space-y-2 p-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-destructive">
              Error: {error.message}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {(indexes as unknown as { indexes: string[] })?.indexes?.map((index) => (
                <button
                  key={index}
                  onClick={() => setSelectedIndex(index)}
                  className={`w-full rounded-md p-3 text-left transition-colors hover:bg-accent ${
                    selectedIndex === index ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 truncate">
                      <div className="font-medium">{index}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
              {(!indexes || (indexes as unknown as { indexes: string[] }).indexes?.length === 0) && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No indexes found
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-4 text-sm text-muted-foreground">
          {(indexes as unknown as { indexes: string[] })?.indexes?.length ?? 0} indexes
        </div>
      </div>

      {/* Index Details */}
      <div className="flex-1 overflow-auto">
        {selectedIndex ? (
          <IndexDetails vectorStore={vectorStore} indexName={selectedIndex} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Database className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Select an index to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function IndexDetails({ vectorStore, indexName }: { vectorStore: string; indexName: string }) {
  const { data: details, loading, error } = useVectorDetails(vectorStore, indexName)
  const { query, loading: querying, error: queryError, results } = useVectorQuery()
  const [queryVector, setQueryVector] = useState("")
  const [topK, setTopK] = useState("10")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleQuery = async () => {
    try {
      const parsedVector = JSON.parse(queryVector)
      await query(vectorStore, {
        indexName,
        queryVector: parsedVector,
        topK: parseInt(topK),
        includeVector: false,
      })
    } catch (err) {
      console.error("Query failed:", err)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const vector = mastraClient.getVector(vectorStore)
      await vector.delete(indexName)
      setDeleteDialogOpen(false)
    } catch (err) {
      console.error("Delete failed:", err)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-destructive">
        Error loading index: {error.message}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{indexName}</h1>
          <p className="text-muted-foreground mt-1">
            Vector index in {vectorStore}
          </p>
        </div>
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Index</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{indexName}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Index Details</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-auto max-h-48">
            {JSON.stringify(details, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Query Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Query Vectors
          </CardTitle>
          <CardDescription>
            Search for similar vectors using a query vector
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Query Vector (JSON array)</Label>
            <Textarea
              value={queryVector}
              onChange={(e) => setQueryVector(e.target.value)}
              placeholder="[0.1, 0.2, 0.3, ...]"
              className="mt-1 font-mono text-sm h-24"
            />
          </div>
          <div className="flex gap-4">
            <div className="w-32">
              <Label>Top K</Label>
              <Input
                type="number"
                value={topK}
                onChange={(e) => setTopK(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleQuery} disabled={querying || !queryVector}>
                {querying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
          {queryError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {queryError.message}
            </div>
          )}
          {results.length > 0 && (
            <div className="space-y-2">
              <Label>Results ({results.length})</Label>
              <ScrollArea className="h-64 border rounded-md">
                <div className="p-4 space-y-2">
                  {results.map((result: any, index: number) => (
                    <div key={index} className="p-3 bg-muted rounded-md">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-sm">{result.id || `Result ${index + 1}`}</span>
                        {result.score && (
                          <Badge variant="secondary">
                            Score: {result.score.toFixed(4)}
                          </Badge>
                        )}
                      </div>
                      {result.metadata && (
                        <pre className="mt-2 text-xs text-muted-foreground">
                          {JSON.stringify(result.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
