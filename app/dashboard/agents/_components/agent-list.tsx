'use client'

import { useState, useMemo } from 'react'
import { useAgentsQuery } from '@/lib/hooks/use-dashboard-queries'
import { Input } from '@/ui/input'
import { ScrollArea } from '@/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/card'
import { Search, Bot } from 'lucide-react'
import { LoadingSkeleton, EmptyState } from '../../_components'
import { AgentListItem } from './agent-list-item'

interface AgentListProps {
    selectedAgentId: string | null
    onSelectAgent: (agentId: string) => void
}

export function AgentList({ selectedAgentId, onSelectAgent }: AgentListProps) {
    const { data: agents, isLoading, error } = useAgentsQuery()
    const [search, setSearch] = useState('')

    const filteredAgents = useMemo(() => {
        if (!agents) {
            return []
        }
        if (!search) {
            return agents
        }
        const searchLower = search.toLowerCase()
        return agents.filter(
            (agent) =>
                (agent.id.toLowerCase().includes(searchLower) ||
                    (agent.name?.toLowerCase().includes(searchLower) ??
                        false) ||
                    agent.description?.toLowerCase().includes(searchLower)) ??
                false
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
                            title={
                                search
                                    ? 'No matching agents'
                                    : 'No agents found'
                            }
                            description={
                                search
                                    ? 'Try a different search term'
                                    : 'Create your first agent to get started'
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

interface AgentGridProps {
    onSelectAgent: (agentId: string) => void
}

export function AgentGrid({ onSelectAgent }: AgentGridProps) {
    const { data: agents, isLoading, error } = useAgentsQuery()
    const [search, setSearch] = useState('')

    const filteredAgents = useMemo(() => {
        if (!agents) {return []}
        if (!search) {return agents}
        const searchLower = search.toLowerCase()
        return agents.filter(
            (agent) =>
                (agent.id.toLowerCase().includes(searchLower) ||
                    (agent.name?.toLowerCase().includes(searchLower) ??
                        false) ||
                    agent.description?.toLowerCase().includes(searchLower)) ??
                false
        )
    }, [agents, search])

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <LoadingSkeleton key={i} variant="card" />
                ))}
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
        <div className="space-y-6">
            <div className="flex items-center gap-4 border-b pb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search agents..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="text-sm text-muted-foreground ml-auto">
                    {filteredAgents.length} agents
                </div>
            </div>

            {filteredAgents.length === 0 ? (
                <EmptyState
                    icon={Bot}
                    title={search ? 'No matching agents' : 'No agents found'}
                    description={
                        search
                            ? 'Try a different search term'
                            : 'Create your first agent to get started'
                    }
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pr-2">
                    {filteredAgents.map((agent) => (
                        <Card
                            key={agent.id}
                            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-1"
                            onClick={() => onSelectAgent(agent.id)}
                        >
                            <CardHeader className="flex flex-row items-center gap-4 pb-2 space-y-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                                    <Bot className="h-6 w-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <CardTitle className="truncate text-base">
                                        {agent.name ?? agent.id}
                                    </CardTitle>
                                    <CardDescription className="truncate text-xs font-mono">
                                        ID: {agent.id}
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="line-clamp-3 text-sm text-muted-foreground min-h-[3.75rem]">
                                    {agent.description ??
                                        'No description provided for this agent.'}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
