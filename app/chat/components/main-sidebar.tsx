'use client'

import { useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useChatContext } from '@/app/chat/providers/chat-context-hooks'
import { useMastraQuery } from '@/lib/hooks/use-mastra-query'
import type { Agent, Tool, TracesResponse, Workflow } from '@/lib/types/mastra-api'
import { generateId } from 'ai'
import type { UseQueryResult } from '@tanstack/react-query'
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    SidebarHeader,
    SidebarFooter,
} from '@/ui/sidebar'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/ui/collapsible'
import {
    BotIcon,
    ChevronRightIcon,
    WorkflowIcon,
    CpuIcon,
    ActivityIcon,
    Loader2Icon,
    PlusIcon,
} from 'lucide-react'

export function MainSidebar() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { selectAgent, selectedAgent, setThreadId } = useChatContext()

    const activeAgentFromUrl = searchParams.get('agent')

    // Use hooks for data fetching - useMastraQuery is a factory that returns hook functions
    const {
        useAgents,
        useTools,
        useWorkflows,
        useTraces,
        useThreads,
        useVectorIndexes,
    } = useMastraQuery()

    // Call each hook to get query results
    const agentsResult: UseQueryResult<Agent[], Error> = useAgents()
    const toolsResult: UseQueryResult<Tool[], Error> = useTools()
    const workflowsResult: UseQueryResult<Workflow[], Error> = useWorkflows()
    const tracesResult: UseQueryResult<TracesResponse, Error> = useTraces()
    const threadsResult = useThreads()
    const vectorsResult = useVectorIndexes()

    interface TraceListItem {
        id: string
        name: string
    }

    const toTraceList = (value: unknown): TraceListItem[] => {
        if (value === null || value === undefined) {
            return []
        }
        if (typeof value !== 'object') {
            return []
        }

        const {spans} = value as { spans?: unknown }
        if (!Array.isArray(spans)) {
            return []
        }

        return spans
            .filter((span: unknown) => {
                if (typeof span !== 'object' || span === null) {
                    return false
                }
                const rec = span as Record<string, unknown>
                return (
                    typeof rec.spanId === 'string' && typeof rec.name === 'string'
                )
            })
            .map((span: unknown) => {
                const rec = span as Record<string, unknown>
                return {
                    id: rec.spanId as string,
                    name: rec.name as string,
                }
            })
    }

    // Extract data with proper typing
    const agentsData: Agent[] = agentsResult.data ?? []
    const toolsData: Tool[] = toolsResult.data ?? []
    const workflowsData: Array<{ id?: string; name: string }> =
        workflowsResult.data ?? []

    const tracesUnknown: unknown = tracesResult.data
    const traces = toTraceList(tracesUnknown)
    const threadsData = threadsResult.data ?? []
    const vectorsData = vectorsResult.data ?? []

    // Combine loading and error states
    const loading =
        agentsResult.isLoading ||
        toolsResult.isLoading ||
        workflowsResult.isLoading ||
        tracesResult.isLoading ||
        threadsResult.isLoading ||
        vectorsResult.isLoading
    const error =
        (agentsResult.error ??
        (toolsResult.error) ??
        (workflowsResult.error) ??
        tracesResult.error) ??
        threadsResult.error ??
        vectorsResult.error

    const agents: Array<{ id: string; name: string }> = agentsData.map(
        (agent) => ({
            id: agent.id,
            name: agent.name,
        })
    )

    const tools: Array<{ id: string; name: string }> = toolsData.map((tool) => ({
        id: tool.id,
        name: tool.id,
    }))

    const workflows: Array<{ id: string; name: string }> = workflowsData.map(
        (wf) => {
            const id = wf.id ?? wf.name
            return {
                id,
                name: wf.name,
            }
        }
    )

    const threads = threadsData
    const vectors = vectorsData
    const threadsCount = threads.length
    const vectorsCount = vectors.length

    const handleAgentClick = useCallback(
        (agentId: string) => {
            // Generate a fresh thread ID when creating a new chat with an agent
            const newThreadId = generateId()

            // First select the agent to reset context
            selectAgent(agentId)

            // Explicitly set the new thread ID
            setThreadId(newThreadId)

            // Navigate to dynamic route
            router.push(`/chat/${agentId}`)
        },
        [selectAgent, setThreadId, router]
    )

    const handleNavClick = useCallback(
        (href: string) => {
            router.push(href)
        },
        [router]
    )

    const handleLogoClick = useCallback(() => {
        handleNavClick('/chat')
    }, [handleNavClick])

    return (
        <Sidebar
            className="border-r"
            data-threads-count={threadsCount}
            data-vectors-count={vectorsCount}
            data-active-agent={activeAgentFromUrl ?? ''}
        >
            <SidebarHeader className="border-b px-4 py-2">
                <div className="flex h-8 items-center">
                    <h2 className="text-sm font-semibold tracking-tight">
                        <button type="button" onClick={handleLogoClick}>
                            AgentStack
                        </button>
                    </h2>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Agents</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <Collapsible
                                defaultOpen={true}
                                className="group/collapsible"
                            >
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton>
                                            <BotIcon className="mr-2 size-4" />
                                            <span>All Agents</span>
                                            <ChevronRightIcon className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {loading ? (
                                                <div className="flex items-center justify-center py-4">
                                                    <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                                                </div>
                                            ) : error ? (
                                                <div className="px-2 py-2 text-xs text-red-500">
                                                    {error?.message}
                                                </div>
                                            ) : agents.length === 0 ? (
                                                <div className="px-2 py-2 text-xs text-muted-foreground">
                                                    No agents found
                                                </div>
                                            ) : (
                                                agents.map((agent) => (
                                                    <SidebarMenuSubItem
                                                        key={agent.id}
                                                    >
                                                        <SidebarMenuSubButton
                                                            isActive={
                                                                selectedAgent ===
                                                                agent.id
                                                            }
                                                            onClick={() =>
                                                                handleAgentClick(
                                                                    agent.id
                                                                )
                                                            }
                                                            className="w-full text-xs"
                                                        >
                                                            <span className="truncate">
                                                                {agent.name}
                                                            </span>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))
                                            )}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Resources</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <Collapsible className="group/collapsible">
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton>
                                            <WorkflowIcon className="mr-2 size-4" />
                                            <span>Workflows</span>
                                            <ChevronRightIcon className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {workflows.map((wf) => (
                                                <SidebarMenuSubItem key={wf.id}>
                                                    <SidebarMenuSubButton className="w-full text-xs cursor-default">
                                                        <span className="truncate">
                                                            {wf.name}
                                                        </span>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>

                            <Collapsible className="group/collapsible">
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton>
                                            <CpuIcon className="mr-2 size-4" />
                                            <span>Tools</span>
                                            <ChevronRightIcon className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {tools.map((tool) => (
                                                <SidebarMenuSubItem
                                                    key={tool.id}
                                                >
                                                    <SidebarMenuSubButton className="w-full text-xs cursor-default">
                                                        <span className="truncate">
                                                            {tool.name}
                                                        </span>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Observability</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <Collapsible className="group/collapsible">
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton>
                                            <ActivityIcon className="mr-2 size-4" />
                                            <span>Recent Traces</span>
                                            <ChevronRightIcon className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {traces.map((trace) => (
                                                <SidebarMenuSubItem
                                                    key={trace.id}
                                                >
                                                    <SidebarMenuSubButton className="w-full text-xs cursor-default">
                                                        <span className="truncate">
                                                            {trace.name}
                                                        </span>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t p-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            variant="default"
                            className="w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => {
                                const agentId = selectedAgent ?? agents[0]?.id
                                if (!agentId) {
                                    return
                                }
                                handleAgentClick(agentId)
                            }}
                            disabled={!selectedAgent && agents.length === 0}
                        >
                            <PlusIcon className="mr-2 size-4" />
                            New Thread
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
