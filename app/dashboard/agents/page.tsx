"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import type { Route } from "next"
import { useAgentsQuery } from "@/lib/hooks/use-dashboard-queries"
import { Button } from "@/ui/button"
import { Bot, RefreshCw } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/hooks/use-dashboard-queries"
import { AgentList, AgentDetails } from "./_components"
import { EmptyState } from "../_components"

export default function AgentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { data: agents } = useAgentsQuery()

  const selectedAgentId = searchParams.get("agent")

  const handleSelectAgent = (agentId: string) => {
    router.push(`/dashboard/agents?agent=${agentId}` as Route)
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.agents })
    if (selectedAgentId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.agent(selectedAgentId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.agentEvals(selectedAgentId) })
    }
  }

  return (
    <div className="flex h-full">
      {/* Agent List Panel */}
      <div className="flex w-80 flex-col border-r">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Agents</h2>
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <AgentList
          selectedAgentId={selectedAgentId}
          onSelectAgent={handleSelectAgent}
        />
        <div className="border-t p-4 text-sm text-muted-foreground">
          {agents?.length ?? 0} agents
        </div>
      </div>

      {/* Agent Details Panel */}
      <div className="flex-1 overflow-auto p-6">
        {selectedAgentId ? (
          <AgentDetails agentId={selectedAgentId} />
        ) : (
          <EmptyState
            icon={Bot}
            title="Select an agent"
            description="Choose an agent from the list to view its details"
          />
        )}
      </div>
    </div>
  )
}
