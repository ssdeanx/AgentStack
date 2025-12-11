"use client"

import { Badge } from "@/ui/badge"
import { Wrench } from "lucide-react"
import { EmptyState } from "../../_components"
import type { Agent } from "@/lib/types/mastra-api"

interface AgentToolsTabProps {
  agent: Agent
}

export function AgentToolsTab({ agent }: AgentToolsTabProps) {
  const tools = Array.isArray(agent.tools)
    ? agent.tools
    : agent.tools
    ? [agent.tools]
    : []

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
        const toolId = typeof tool === "string" ? tool : (tool as any).id
        const toolName = typeof tool === "string" ? tool : tool.name || (tool as any).id
        return (
          <div
            key={`${toolName}-${toolId}-${index}`}
            className="flex items-center justify-between p-3 rounded-md border"
            data-testid={`agent-tool-${toolId}-${toolName}`}
          >
            <div className="flex items-center gap-3">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {typeof tool === "string"
                  ? tool
                  : String(tool.name ?? (tool as any).id ?? JSON.stringify(tool))}
              </span>
            </div>
            <Badge variant="secondary">Tool</Badge>
          </div>
        )
      })}
    </div>
  )
}
