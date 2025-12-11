"use client"

import { useAgentQuery } from "@/lib/hooks/use-dashboard-queries"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { Badge } from "@/ui/badge"
import { Bot, Info, Wrench, Activity } from "lucide-react"
import { LoadingSkeleton, EmptyState } from "../../_components"
import { AgentToolsTab } from "./agent-tools-tab"
import { AgentTab } from "./agent-tab"

interface AgentDetailsProps {
  agentId: string
}

export function AgentDetails({ agentId }: AgentDetailsProps) {
  const { data: agent, isLoading, error } = useAgentQuery(agentId)

  if (isLoading) {
    return <LoadingSkeleton variant="detail" />
  }

  if (error || !agent) {
    return (
      <EmptyState
        icon={Bot}
        title="Failed to load agent"
        description={error?.message ?? "Agent not found"}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Agent Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <h2 className="text-xl font-semibold">{agent.name ?? agent.id}</h2>
        </div>
        {agent.description !== null && (
          <p className="text-sm text-muted-foreground">{agent.description}</p>
        )}
        <div className="flex gap-2">
          <Badge variant="outline">{agent.id}</Badge>
          {agent.model && <Badge variant="secondary">{agent.model}</Badge>}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="evals" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Evaluations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4 space-y-4">
          {agent.instructions && (
            <div>
              <h4 className="text-sm font-medium mb-2">Instructions</h4>
              <pre className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap overflow-x-auto">
                {agent.instructions}
              </pre>
            </div>
          )}

          {agent.model && (
            <div>
              <h4 className="text-sm font-medium mb-2">Model</h4>
              <p className="text-sm text-muted-foreground">{agent.model}</p>
            </div>
          )}

          {agent.config && Object.keys(agent.config).length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Configuration</h4>
              <pre className="text-sm bg-muted p-3 rounded-md overflow-x-auto">
                {JSON.stringify(agent.config, null, 2)}
              </pre>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tools" className="mt-4">
          <AgentToolsTab agent={agent} />
        </TabsContent>

        <TabsContent value="evals" className="mt-4">
          <AgentTab agentId={agentId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
