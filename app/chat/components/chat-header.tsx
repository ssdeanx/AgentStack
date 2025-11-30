"use client"

import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Badge } from "@/ui/badge"
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorEmpty,
  ModelSelectorName,
} from "@/src/components/ai-elements/model-selector"
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
} from "@/src/components/ai-elements/context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/ui/popover"
import { useChatContext } from "@/app/chat/providers/chat-context"
import {
  getAgentsByCategory,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type AgentConfig,
} from "@/app/chat/config/agents"
import {
  CheckIcon,
  MessageSquareIcon,
  Trash2Icon,
  BookmarkIcon,
  SettingsIcon,
  DatabaseIcon,
  HistoryIcon,
  UserIcon,
  HashIcon,
} from "lucide-react"
import { useMemo, useState, useCallback } from "react"

const DEFAULT_MAX_TOKENS = 128000

export function ChatHeader() {
  const {
    selectedAgent,
    selectAgent,
    clearMessages,
    agentConfig,
    messages,
    usage,
    checkpoints,
    threadId,
    resourceId,
    setThreadId,
    setResourceId,
    restoreCheckpoint,
  } = useChatContext()

  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tempThreadId, setTempThreadId] = useState(threadId)
  const [tempResourceId, setTempResourceId] = useState(resourceId)

  const agentsByCategory = useMemo(() => getAgentsByCategory(), [])

  const handleSelectAgent = (agent: AgentConfig) => {
    selectAgent(agent.id)
    setOpen(false)
  }

  const handleSaveSettings = useCallback(() => {
    setThreadId(tempThreadId)
    setResourceId(tempResourceId)
    setSettingsOpen(false)
  }, [tempThreadId, tempResourceId, setThreadId, setResourceId])

  const usedTokens = usage ? usage.inputTokens + usage.outputTokens : 0

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <MessageSquareIcon className="size-5 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="font-semibold text-sm">AgentStack Chat</span>
          <span className="text-muted-foreground text-xs">
            {agentConfig?.description || "AI-powered assistant"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Checkpoint History */}
        {checkpoints.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <BookmarkIcon className="size-3.5" />
                <span className="hidden sm:inline">Checkpoints</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {checkpoints.length}
                </Badge>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <HistoryIcon className="size-4" />
                  Conversation Checkpoints
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {checkpoints.map((checkpoint) => (
                    <button
                      key={checkpoint.id}
                      onClick={() => restoreCheckpoint(checkpoint.id)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {checkpoint.label || `Checkpoint ${checkpoint.messageCount}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {checkpoint.timestamp.toLocaleTimeString()} •{" "}
                          {checkpoint.messageCount} messages
                        </span>
                      </div>
                      <BookmarkIcon className="size-3.5 text-primary" />
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Token Usage */}
        {usage && usedTokens > 0 && (
          <Context
            usedTokens={usedTokens}
            maxTokens={DEFAULT_MAX_TOKENS}
            usage={{
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              totalTokens: usage.totalTokens,
            }}
          >
            <ContextTrigger />
            <ContextContent align="end">
              <ContextContentHeader />
              <ContextContentBody className="space-y-1">
                <ContextInputUsage />
                <ContextOutputUsage />
              </ContextContentBody>
              <ContextContentFooter />
            </ContextContent>
          </Context>
        )}

        {/* Agent Selector */}
        <ModelSelector open={open} onOpenChange={setOpen}>
          <ModelSelectorTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="min-w-[180px] justify-between"
            >
              <span className="truncate">{agentConfig?.name || selectedAgent}</span>
            </Button>
          </ModelSelectorTrigger>
          <ModelSelectorContent className="w-[320px]">
            <ModelSelectorInput placeholder="Search agents..." />
            <ModelSelectorList className="max-h-[400px]">
              <ModelSelectorEmpty>No agents found.</ModelSelectorEmpty>
              {CATEGORY_ORDER.map((category) => {
                const agents = agentsByCategory[category]
                if (agents.length === 0) return null

                return (
                  <ModelSelectorGroup
                    key={category}
                    heading={CATEGORY_LABELS[category]}
                  >
                    {agents.map((agent) => (
                      <ModelSelectorItem
                        key={agent.id}
                        value={agent.id}
                        onSelect={() => handleSelectAgent(agent)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex flex-col gap-0.5">
                          <ModelSelectorName>{agent.name}</ModelSelectorName>
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {agent.description}
                          </span>
                        </div>
                        {selectedAgent === agent.id && (
                          <CheckIcon className="size-4 text-primary" />
                        )}
                      </ModelSelectorItem>
                    ))}
                  </ModelSelectorGroup>
                )
              })}
            </ModelSelectorList>
          </ModelSelectorContent>
        </ModelSelector>

        {/* Memory Settings */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" title="Memory settings">
              <SettingsIcon className="size-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DatabaseIcon className="size-5" />
                Memory Settings
              </DialogTitle>
              <DialogDescription>
                Configure the thread and resource identifiers for conversation memory.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label
                  htmlFor="threadId"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <HashIcon className="size-4 text-muted-foreground" />
                  Thread ID
                </label>
                <Input
                  id="threadId"
                  value={tempThreadId}
                  onChange={(e) => setTempThreadId(e.target.value)}
                  placeholder="Enter thread ID..."
                />
                <p className="text-xs text-muted-foreground">
                  Conversations with the same thread ID share memory context.
                </p>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="resourceId"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <UserIcon className="size-4 text-muted-foreground" />
                  Resource ID
                </label>
                <Input
                  id="resourceId"
                  value={tempResourceId}
                  onChange={(e) => setTempResourceId(e.target.value)}
                  placeholder="Enter resource ID..."
                />
                <p className="text-xs text-muted-foreground">
                  Typically represents the user or resource associated with this conversation.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSettings}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clear Messages */}
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearMessages}
            title="Clear conversation"
          >
            <Trash2Icon className="size-4" />
          </Button>
        )}
      </div>
    </header>
  )
}
