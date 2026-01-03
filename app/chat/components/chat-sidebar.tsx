"use client"

import { useChatContext } from "@/app/chat/providers/chat-context"
import { Badge } from "@/ui/badge"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import {
  BotIcon,
  CpuIcon,
  HistoryIcon,
  BookmarkIcon,
  SettingsIcon,
  DatabaseIcon,
  HashIcon,
  UserIcon,
  CheckCircle2Icon,
  CircleIcon,
  InfoIcon,
} from "lucide-react"
import { useState, useCallback } from "react"
import { CATEGORY_LABELS } from "../config/agents"
import { cn } from "@/lib/utils"

export function ChatSidebar() {
  const {
    agentConfig,
    checkpoints,
    restoreCheckpoint,
    threadId,
    resourceId,
    setThreadId,
    setResourceId,
    selectedModel,
  } = useChatContext()

  const [tempThreadId, setTempThreadId] = useState(threadId)
  const [tempResourceId, setTempResourceId] = useState(resourceId)

  const handleSaveMemory = useCallback(() => {
    setThreadId(tempThreadId)
    setResourceId(tempResourceId)
  }, [tempThreadId, tempResourceId, setThreadId, setResourceId])

  if (!agentConfig) {return null}

  const features = [
    { id: "reasoning", label: "Reasoning", enabled: agentConfig.features.reasoning },
    { id: "tools", label: "Tools", enabled: agentConfig.features.tools },
    { id: "sources", label: "Sources", enabled: agentConfig.features.sources },
    { id: "canvas", label: "Canvas", enabled: agentConfig.features.canvas },
    { id: "artifacts", label: "Artifacts", enabled: agentConfig.features.artifacts },
    { id: "plan", label: "Planning", enabled: agentConfig.features.plan },
    { id: "task", label: "Tasks", enabled: agentConfig.features.task },
    { id: "webPreview", label: "Web Preview", enabled: agentConfig.features.webPreview },
  ]

  return (
    <aside className="flex h-full w-80 flex-col border-l bg-muted/10 overflow-y-auto">
      {/* Agent Info Section */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <BotIcon className="size-4 text-primary" />
          <h3 className="font-semibold text-sm">Agent Details</h3>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Name</div>
            <div className="text-sm font-medium">{agentConfig.name}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Category</div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              {CATEGORY_LABELS[agentConfig.category]}
            </Badge>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Description</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {agentConfig.description}
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <InfoIcon className="size-4 text-primary" />
          <h3 className="font-semibold text-sm">Capabilities</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {features.map((feature) => (
            <div
              key={feature.id}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors",
                feature.enabled
                  ? "bg-primary/5 border-primary/20 text-primary"
                  : "bg-muted/50 border-transparent text-muted-foreground opacity-60"
              )}
            >
              {feature.enabled ? (
                <CheckCircle2Icon className="size-3" />
              ) : (
                <CircleIcon className="size-3" />
              )}
              {feature.label}
            </div>
          ))}
        </div>
      </div>

      {/* Checkpoints Section */}
      <div className="p-4 border-b flex-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HistoryIcon className="size-4 text-primary" />
            <h3 className="font-semibold text-sm">History</h3>
          </div>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {checkpoints.length}
          </Badge>
        </div>

        {checkpoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookmarkIcon className="size-8 text-muted/20 mb-2" />
            <p className="text-xs text-muted-foreground">No checkpoints yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {checkpoints.map((checkpoint) => (
              <button
                key={checkpoint.id}
                onClick={() => restoreCheckpoint(checkpoint.id)}
                className="group flex w-full flex-col gap-1 rounded-lg border bg-card p-2 text-left transition-all hover:border-primary/50 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">
                    {checkpoint.label ?? `Checkpoint ${checkpoint.messageCount}`}
                  </span>
                  <HistoryIcon className="size-3 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{checkpoint.timestamp.toLocaleTimeString()}</span>
                  <span>{checkpoint.messageCount} msgs</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Memory Settings Section */}
      <div className="p-4 bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <SettingsIcon className="size-4 text-primary" />
          <h3 className="font-semibold text-sm">Memory Config</h3>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase">
              <HashIcon className="size-3" />
              Thread ID
            </label>
            <Input
              value={tempThreadId}
              onChange={(e) => setTempThreadId(e.target.value)}
              className="h-8 text-xs"
              placeholder="thread-123"
            />
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase">
              <UserIcon className="size-3" />
              Resource ID
            </label>
            <Input
              value={tempResourceId}
              onChange={(e) => setTempResourceId(e.target.value)}
              className="h-8 text-xs"
              placeholder="user-456"
            />
          </div>
          <Button
            size="sm"
            className="w-full h-8 text-xs gap-1.5"
            onClick={handleSaveMemory}
            disabled={tempThreadId === threadId && tempResourceId === resourceId}
          >
            <DatabaseIcon className="size-3" />
            Update Memory
          </Button>
        </div>
      </div>
    </aside>
  )
}
