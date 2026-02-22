'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useChatContext } from '@/app/chat/providers/chat-context-hooks'
import {
    fetchAgents,
    fetchTools,
    fetchWorkflows,
    fetchTraces,
    fetchThreads,
    fetchVectors,
} from '@/app/chat/actions/sidebar-actions'
import type {
    SidebarAgent,
    SidebarTool,
    SidebarWorkflow,
    SidebarTrace,
    SidebarThread,
    SidebarVectorIndex,
} from '@/app/chat/actions/sidebar-actions'
import { generateId } from 'ai'
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
    NetworkIcon,
    CpuIcon,
    ActivityIcon,
    Loader2Icon,
    PlusIcon,
} from 'lucide-react'

export function MainSidebar() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { selectAgent, selectedAgent, setThreadId } = useChatContext()

    const [agents, setAgents] = useState<SidebarAgent[]>([])
    const [tools, setTools] = useState<SidebarTool[]>([])
    const [workflows, setWorkflows] = useState<SidebarWorkflow[]>([])
    const [networks, setNetworks] = useState<any[]>([])
    const [traces, setTraces] = useState<SidebarTrace[]>([])
    const [threads, setThreads] = useState<SidebarThread[]>([])
    const [vectors, setVectors] = useState<SidebarVectorIndex[]>([])

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load sidebar data on mount
    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            setError(null)
            try {
                const [
                    agentsData,
                    toolsData,
                    workflowsData,
                    tracesData,
                    threadsData,
                    vectorsData,
                ] = await Promise.all([
                    fetchAgents(),
                    fetchTools(),
                    fetchWorkflows(),
                    fetchTraces(),
                    fetchThreads(),
                    fetchVectors(),
                ])
                setAgents(agentsData)
                setTools(toolsData)
                setWorkflows(workflowsData)
                setTraces(tracesData)
                setThreads(threadsData)
                setVectors(vectorsData)
            } catch (err) {
                setError('Failed to load sidebar data')
                console.error('loadData error:', err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    const handleAgentClick = useCallback(
        (agentId: string) => {
            // Generate a fresh thread ID when creating a new chat with an agent
            const newThreadId = generateId()

            // First select the agent to reset context
            selectAgent(agentId)

            // Explicitly set the new thread ID
            setThreadId(newThreadId)

            // Update URL
            const params = new URLSearchParams(searchParams.toString())
            params.set('agent', agentId)
            params.delete('thread')
            router.push(`/chat?${params.toString()}`)
        },
        [selectAgent, setThreadId, searchParams, router]
    )

    const handleNavClick = useCallback(
        (href: string) => {
            router.push(href)
        },
        [router]
    )

    return (
        <Sidebar className="border-r">
            <SidebarHeader className="border-b px-4 py-2">
                <div className="flex h-8 items-center">
                    <h2 className="text-sm font-semibold tracking-tight">
                        AgentStack
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
                                                    {error}
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
                                            <NetworkIcon className="mr-2 size-4" />
                                            <span>Networks</span>
                                            <ChevronRightIcon className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {networks.map((net) => (
                                                <SidebarMenuSubItem
                                                    key={net.id}
                                                >
                                                    <SidebarMenuSubButton className="w-full text-xs cursor-default">
                                                        <span className="truncate">
                                                            {net.name}
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
                                            <NetworkIcon className="mr-2 size-4" />
                                            <span>Networks</span>
                                            <ChevronRightIcon className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {networks.map((net) => (
                                                <SidebarMenuSubItem
                                                    key={net.id}
                                                >
                                                    <SidebarMenuSubButton className="w-full text-xs cursor-default">
                                                        <span className="truncate">
                                                            {net.name}
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
                                handleAgentClick(selectedAgent)
                            }}
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
