'use client'

import { useCallback, useState } from 'react'
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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/ui/tooltip'
import { cn } from '@/lib/utils'

export function MainSidebar() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { selectAgent, selectedAgent, setThreadId } = useChatContext()
    const [openSection, setOpenSection] = useState<string | null>(null)

    const activeAgentFromUrl = searchParams.get('agent')

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? null : section)
    }

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

    // List of resources for rendering
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
            className="border-r bg-background/95 backdrop-blur-xl"
            data-threads-count={threadsCount}
            data-vectors-count={vectorsCount}
            data-active-agent={activeAgentFromUrl ?? ''}
        >
            <SidebarHeader className="border-b border-border/50 px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BotIcon className="size-5" />
                    </div>
                    <h2 className="text-base font-bold tracking-tight text-foreground/90">
                        <button
                            type="button"
                            onClick={handleLogoClick}
                            className="hover:text-primary transition-colors"
                        >
                            AgentStack
                        </button>
                    </h2>
                </div>
            </SidebarHeader>
            <SidebarContent className="px-2">
                <SidebarGroup>
                    <SidebarGroupLabel className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                        Navigation
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <Collapsible
                                open={openSection === 'agents'}
                                onOpenChange={() => toggleSection('agents')}
                                className="group/collapsible"
                            >
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton className="hover:bg-muted/50 transition-all duration-200">
                                            <BotIcon className="mr-2 size-4 text-primary/70" />
                                            <span className="font-medium">All Agents</span>
                                            <ChevronRightIcon className="ml-auto size-3.5 opacity-50 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub className="border-l border-border/50 ml-6 mt-1 space-y-0.5">
                                            {loading ? (
                                                <div className="flex items-center justify-center py-4">
                                                    <Loader2Icon className="size-4 animate-spin text-muted-foreground/40" />
                                                </div>
                                            ) : error ? (
                                                <div className="px-2 py-2 text-xs text-destructive/80">
                                                    {error?.message}
                                                </div>
                                            ) : agentsData.length === 0 ? (
                                                <div className="px-2 py-2 text-xs text-muted-foreground/50 italic">
                                                    No agents found
                                                </div>
                                            ) : (
                                                agentsData.map((agent: Agent) => (
                                                    <SidebarMenuSubItem
                                                        key={agent.id}
                                                    >
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
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
                                                                    className={cn(
                                                                        "w-full text-xs cursor-pointer transition-all duration-200",
                                                                        selectedAgent === agent.id
                                                                            ? "bg-primary/10 text-primary font-medium"
                                                                            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                                                    )}
                                                                >
                                                                    <span className="truncate">
                                                                        {agent.name}
                                                                    </span>
                                                                </SidebarMenuSubButton>
                                                            </TooltipTrigger>
                                                            <TooltipContent
                                                                side="right"
                                                                align="start"
                                                                sideOffset={15}
                                                                className="w-72 p-0 bg-popover/95 backdrop-blur-md border border-border/50 shadow-2xl rounded-2xl overflow-hidden"
                                                            >
                                                                <div className="flex flex-col">
                                                                    {/* Header section with brand-like feel */}
                                                                    <div className="bg-muted/50 p-4 border-b border-border/50">
                                                                        <h3 className="font-bold text-sm tracking-tight text-foreground">
                                                                            {agent.name}
                                                                        </h3>
                                                                        {!!(agent.provider || agent.modelId) && (
                                                                            <div className="mt-1.5 flex items-center gap-2">
                                                                                <div className="flex h-5 items-center rounded-md border border-primary/20 bg-primary/10 px-1.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                                                                                    <CpuIcon className="mr-1 size-3" />
                                                                                    <span>
                                                                                        {agent.provider && `${agent.provider} • `}
                                                                                        {agent.modelId}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Description section */}
                                                                    <div className="p-4 pt-3">
                                                                        {agent.description ? (
                                                                            <div className="space-y-2">
                                                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                                                                                    Capabilities
                                                                                </span>
                                                                                <p className="text-xs leading-relaxed text-muted-foreground">
                                                                                    {agent.description}
                                                                                </p>
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-xs italic text-muted-foreground/60 italic leading-relaxed">
                                                                                Specialized AI assistant ready to help with your task.
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
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
                    <SidebarGroupLabel className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                        Resources
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <Collapsible
                                open={openSection === 'workflows'}
                                onOpenChange={() => toggleSection('workflows')}
                                className="group/collapsible"
                            >
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton className="hover:bg-muted/50 transition-all duration-200">
                                            <WorkflowIcon className="mr-2 size-4 text-primary/70" />
                                            <span className="font-medium">Workflows</span>
                                            <ChevronRightIcon className="ml-auto size-3.5 opacity-50 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub className="border-l border-border/50 ml-6 mt-1 space-y-0.5">
                                            {workflows.map((wf) => (
                                                <SidebarMenuSubItem key={wf.id}>
                                                    <SidebarMenuSubButton className="w-full text-xs cursor-pointer hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-200">
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

                            <Collapsible
                                open={openSection === 'tools'}
                                onOpenChange={() => toggleSection('tools')}
                                className="group/collapsible"
                            >
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton className="hover:bg-muted/50 transition-all duration-200">
                                            <CpuIcon className="mr-2 size-4 text-primary/70" />
                                            <span className="font-medium">Tools</span>
                                            <ChevronRightIcon className="ml-auto size-3.5 opacity-50 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub className="border-l border-border/50 ml-6 mt-1 space-y-0.5">
                                            {tools.map((tool) => (
                                                <SidebarMenuSubItem
                                                    key={tool.id}
                                                >
                                                    <SidebarMenuSubButton className="w-full text-xs cursor-pointer hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-200">
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
                    <SidebarGroupLabel className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                        Observability
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <Collapsible
                                open={openSection === 'traces'}
                                onOpenChange={() => toggleSection('traces')}
                                className="group/collapsible"
                            >
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton className="hover:bg-muted/50 transition-all duration-200">
                                            <ActivityIcon className="mr-2 size-4 text-primary/70" />
                                            <span className="font-medium">Recent Traces</span>
                                            <ChevronRightIcon className="ml-auto size-3.5 opacity-50 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub className="border-l border-border/50 ml-6 mt-1 space-y-0.5">
                                            {traces.map((trace) => (
                                                <SidebarMenuSubItem
                                                    key={trace.id}
                                                >
                                                    <SidebarMenuSubButton className="w-full text-xs cursor-pointer hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-200">
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

            <SidebarFooter className="border-t border-border/50 p-6">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            variant="default"
                            className="w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 active:scale-[0.98] font-semibold h-10 rounded-xl"
                            onClick={() => {
                                const agentId = selectedAgent ?? agentsData[0]?.id
                                if (!agentId) {
                                    return
                                }
                                handleAgentClick(agentId)
                            }}
                            disabled={!selectedAgent && agentsData.length === 0}
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
