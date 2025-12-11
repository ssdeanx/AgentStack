"use client"

import { useState } from "react"
import {
  useMemoryThreads,
  useMemoryThread,
  useWorkingMemory,
  useCreateMemoryThread,
  useUpdateWorkingMemory,
} from "@/lib/hooks/use-mastra"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog"
import {
  Brain,
  Search,
  RefreshCw,
  Plus,
  ChevronRight,
  Loader2,
  Trash2,
  MessageSquare,
  User,
  Bot,
} from "lucide-react"

export default function MemoryPage() {
  const [resourceId, setResourceId] = useState("user-1")
  const [agentId, setAgentId] = useState("weatherAgent")
  const { data: threads, loading, error, refetch } = useMemoryThreads(resourceId, agentId)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newThreadTitle, setNewThreadTitle] = useState("")
  const { create: createThread, loading: creating } = useCreateMemoryThread()

  const filteredThreads = threads?.threads?.filter((thread: any) =>
    thread.title?.toLowerCase().includes(searchQuery.toLowerCase()) ??
    thread.id?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateThread = async () => {
    try {
      const thread = await createThread({
        title: newThreadTitle,
        resourceId,
        agentId,
      })
      refetch()
      setCreateDialogOpen(false)
      setNewThreadTitle("")
      if ((thread as any)?.id) {
        setSelectedThreadId((thread as any).id)
      }
    } catch (err) {
      console.error("Failed to create thread:", err)
    }
  }

  return (
    <div className="flex h-full">
      {/* Thread List */}
      <div className="flex w-96 flex-col border-r">
        <div className="border-b p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Memory Threads</h2>
            <div className="flex gap-1">
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Thread</DialogTitle>
                    <DialogDescription>
                      Create a new memory thread
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={newThreadTitle}
                        onChange={(e) => setNewThreadTitle(e.target.value)}
                        placeholder="New Conversation"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateThread} disabled={creating || !newThreadTitle}>
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

          <div className="grid gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Resource ID</Label>
              <Input
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                placeholder="user-1"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Agent ID</Label>
              <Input
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="weatherAgent"
                className="mt-1"
              />
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
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
              {filteredThreads?.map((thread: any) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full rounded-md p-3 text-left transition-colors hover:bg-accent ${
                    selectedThreadId === thread.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 truncate">
                      <div className="font-medium">{thread.title ?? thread.id}</div>
                      <div className="text-xs text-muted-foreground">
                        {thread.createdAt ? new Date(thread.createdAt).toLocaleDateString() : "No date"}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
              {(!filteredThreads || filteredThreads.length === 0) && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No threads found
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-4 text-sm text-muted-foreground">
          {filteredThreads?.length ?? 0} threads
        </div>
      </div>

      {/* Thread Details */}
      <div className="flex-1 overflow-auto">
        {selectedThreadId ? (
          <ThreadDetails
            threadId={selectedThreadId}
            agentId={agentId}
            resourceId={resourceId}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Brain className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Select a thread to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ThreadDetails({
  threadId,
  agentId,
  resourceId,
}: {
  threadId: string
  agentId: string
  resourceId: string
}) {
  const { messages, loading, error, refetch } = useMemoryThread(threadId, agentId)
  const { data: workingMemory, loading: wmLoading } = useWorkingMemory(agentId, threadId, resourceId)
  const { update: updateWM, loading: updatingWM } = useUpdateWorkingMemory()
  const [wmDialogOpen, setWmDialogOpen] = useState(false)
  const [wmContent, setWmContent] = useState("")
  const [deleting, setDeleting] = useState(false)

  const handleUpdateWorkingMemory = async () => {
    try {
      await updateWM({
        agentId,
        threadId,
        workingMemory: wmContent,
        resourceId,
      })
      setWmDialogOpen(false)
    } catch (err) {
      console.error("Failed to update working memory:", err)
    }
  }

  const handleDeleteThread = async () => {
    setDeleting(true)
    try {
      const thread = mastraClient.getMemoryThread({ threadId, agentId })
      await thread.delete()
    } catch (err) {
      console.error("Failed to delete thread:", err)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-destructive">
        Error loading thread: {error.message}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Thread: {threadId}</h1>
          <p className="text-muted-foreground mt-1">
            {messages.length} messages
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteThread}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="working-memory">Working Memory</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversation History</CardTitle>
              <CardDescription>
                Messages in this thread
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {messages.length > 0 ? (
                    messages.map((message: any, index: number) => (
                      <div
                        key={message.id ?? index}
                        className={`flex gap-3 ${
                          message.role === "user" ? "justify-end" : ""
                        }`}
                      >
                        {message.role !== "user" && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}
                        <div
                          className={`rounded-lg p-3 max-w-[80%] ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <div className="text-sm">{message.content}</div>
                          {message.createdAt && (
                            <div className="text-xs opacity-70 mt-1">
                              {new Date(message.createdAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                        {message.role === "user" && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No messages in this thread
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="working-memory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Working Memory
                </span>
                <Dialog open={wmDialogOpen} onOpenChange={setWmDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWmContent((workingMemory as any)?.workingMemory ?? "")}
                    >
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Edit Working Memory</DialogTitle>
                      <DialogDescription>
                        Update the working memory for this thread
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        value={wmContent}
                        onChange={(e) => setWmContent(e.target.value)}
                        placeholder="# User Profile&#10;- Name: ...&#10;- Preferences: ..."
                        className="font-mono text-sm h-64"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setWmDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateWorkingMemory} disabled={updatingWM}>
                        {updatingWM && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                Persistent memory across interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {wmLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (workingMemory as any)?.workingMemory ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      Source: {(workingMemory as any).source}
                    </Badge>
                    {(workingMemory as any).threadExists && (
                      <Badge variant="outline">Thread exists</Badge>
                    )}
                  </div>
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">
                    {(workingMemory as any).workingMemory}
                  </pre>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No working memory configured for this thread
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
