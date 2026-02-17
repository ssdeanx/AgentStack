'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Route } from 'next'
import { useAgentsQuery } from '@/lib/hooks/use-dashboard-queries'
import { Button } from '@/ui/button'
import { Bot, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/hooks/use-dashboard-queries'
import { AgentList, AgentDetails, AgentGrid } from './_components'

export default function AgentsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()
    const { data: agents } = useAgentsQuery()

    const selectedAgentId = searchParams.get('agent')
    const selectedAgentIdValue = selectedAgentId?.trim() ?? ''
    const hasSelectedAgent = selectedAgentIdValue.length > 0

    const handleSelectAgent = (agentId: string) => {
        router.push(`/dashboard/agents?agent=${agentId}` as Route)
    }

    const handleRefresh = () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.agents })
        if (hasSelectedAgent) {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.agent(selectedAgentIdValue),
            })
            void queryClient.invalidateQueries({
                queryKey: queryKeys.agentEvals(selectedAgentIdValue),
            })
        }
    }

    return (
        <div className="flex h-full">
            {/* Agent List Panel */}
            <div className="flex w-80 flex-col border-r">
                <div className="border-b p-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Agents</h2>
                        <div className="flex items-center gap-2">
                            {hasSelectedAgent ? (
                                <Button variant="outline" size="sm" asChild>
                                    <Link
                                        href={
                                            `/chat?agent=${selectedAgentIdValue}` as Route
                                        }
                                    >
                                        <Bot className="h-4 w-4 mr-2" />
                                        Chat
                                    </Link>
                                </Button>
                            ) : null}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleRefresh}
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
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
                {hasSelectedAgent ? (
                    <AgentDetails agentId={selectedAgentIdValue} />
                ) : (
                    <AgentGrid onSelectAgent={handleSelectAgent} />
                )}
            </div>
        </div>
    )
}
