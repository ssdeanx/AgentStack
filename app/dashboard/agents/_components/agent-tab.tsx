"use client"

import { useAgentQuery } from "@/lib/hooks/use-dashboard-queries"
import { Badge } from "@/ui/badge"
import { Activity } from "lucide-react"
import { LoadingSkeleton, EmptyState } from "../../_components"

interface AgentTabProps {
  agentId: string
}

export function AgentTab({ agentId }: AgentTabProps) {
  const { data: agent, isLoading, error } = useAgentQuery(agentId)

  if (isLoading) {
    return <LoadingSkeleton variant="list" count={4} />
  }

  if (error) {
    return (
      <EmptyState
        icon={Activity}
        title="Failed to load agent"
        description={error.message}
      />
    )
  }

  if (!agent) {
    return (
      <EmptyState
        icon={Activity}
        title="Agent not found"
        description="The requested agent could not be found"
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">{agent.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{agent.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-sm font-medium mb-2">Model</h4>
          <Badge variant="outline">{(agent.model as any).provider}/{(agent.model as any).name}</Badge>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2">Status</h4>
          <Badge variant="default">Active</Badge>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Instructions</h4>
        <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap">
          {agent.instructions}
        </div>
      </div>

      {Array.isArray(agent.tools) && agent.tools.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Tools</h4>
          <div className="flex flex-wrap gap-2">
            {agent.tools.map((tool, index) => {
              const label = typeof tool === "string" ? tool : (tool.name ?? tool.id)
              return (
                <Badge key={index} variant="secondary">{label}</Badge>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
