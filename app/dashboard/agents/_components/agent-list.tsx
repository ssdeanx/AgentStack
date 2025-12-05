"use client"

import { useState, useMemo } from "react"
import { useAgentsQuery } from "@/lib/hooks/use-dashboard-queries"
import { Input } from "@/ui/input"
import { ScrollArea } from "@/ui/scroll-area"
import { Search, Bot } from "lucide-react"
import { LoadingSkeleton, EmptyState } from "../../_components"
import { AgentListItem } from "./agent-list-item"

interface AgentListProps {
  selectedAgentId: string | null
  onSelectAgent: (agentId: string) => void
}

export function AgentList({ selectedAgentId, onSelectAgent }: AgentListProps) {
  const { data: agents, isLoading, error } = useAgentsQuery()
  const [search, setSearch] = useState("")

  const filteredAgents = useMemo(() => {
    if (!agents) return []
    if (!search) return agents
    const searchLower = search.toLowerCase()
    return agents.filter(
      (agent) =>
        agent.id.toLowerCase().includes(searchLower) ||
        agent.name?.toLowerCase().includes(searchLower) ||
        agent.description?.toLowerCase().includes(searchLower)
    )
  }, [agents, search])

  if (isLoading) {
    return (
      <div className="p-4">
        <LoadingSkeleton variant="list" count={6} />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={Bot}
        title="Failed to load agents"
        description={error.message}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredAgents.length === 0 ? (
            <EmptyState
              icon={Bot}
              title={search ? "No matching agents" : "No agents found"}
              description={
                search
                  ? "Try a different search term"
                  : "Create your first agent to get started"
              }
            />
          ) : (
            filteredAgents.map((agent) => (
              <AgentListItem
                key={agent.id}
                agent={agent}
                isSelected={selectedAgentId === agent.id}
                onClick={() => onSelectAgent(agent.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
