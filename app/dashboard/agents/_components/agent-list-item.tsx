"use client"

import { cn } from "@/lib/utils"
import { Bot } from "lucide-react"
import type { Agent } from "@/lib/types/mastra-api"

interface AgentListItemProps {
  agent: Agent
  isSelected: boolean
  onClick: () => void
}

export function AgentListItem({ agent, isSelected, onClick }: AgentListItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors",
        isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent"
      )}
    >
      <Bot className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{agent.name || agent.id}</p>
        {agent.description && (
          <p
            className={cn(
              "text-xs truncate",
              isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
          >
            {agent.description}
          </p>
        )}
      </div>
    </div>
  )
}
