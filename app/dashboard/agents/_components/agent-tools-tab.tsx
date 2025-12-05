"use client"

import { Badge } from "@/ui/badge"
import { Wrench } from "lucide-react"
import { EmptyState } from "../../_components"
import type { Agent } from "@/lib/types/mastra-api"

interface AgentToolsTabProps {
  agent: Agent
}

export function AgentToolsTab({ agent }: AgentToolsTabProps) {
  const tools = agent.tools ?? []

  if (tools.length === 0) {
    return (
      <EmptyState
        icon={Wrench}
        title="No tools configured"
        description="This agent doesn't have any tools assigned"
      />
    )
  }

  return (
    <div className="space-y-3">
      {tools.map((tool, index) => {
        const toolId = typeof tool === "string" ? tool : tool.id
        const toolName = typeof tool === "string" ? tool : tool.name || tool.id
        return (
          <div
            key={`${toolId}-${index}`}
            className="flex items-center justify-between p-3 rounded-md border"
          >
            <div className="flex items-center gap-3">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{toolName}</span>
            </div>
            <Badge variant="secondary">Tool</Badge>
          </div>
        )
      })}
    </div>
  )
}
