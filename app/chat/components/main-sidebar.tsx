'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { generateId } from 'ai'
import { useChatContext } from '@/app/chat/providers/chat-context-hooks'
import { useAgents, useThreads } from '@/lib/hooks/use-mastra-query'
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarFooter,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/ui/sidebar'
import { Loader2Icon, BotIcon, MessageSquareIcon, PlusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarAgent {
    id: string
    name: string
    description?: string
    provider?: string
    modelId?: string
}

interface SidebarThread {
    id?: string
    threadId?: string
    name?: string
    title?: string
    messageCount?: number
    updatedAt?: string | Date
    createdAt?: string | Date
}

const getThreadId = (thread: SidebarThread) => thread.threadId ?? thread.id ?? ''

const getThreadLabel = (thread: SidebarThread) =>
    thread.title ?? thread.name ?? (getThreadId(thread) || 'Untitled thread')

const formatThreadMeta = (thread: SidebarThread) => {
    const parts: string[] = []
    if (typeof thread.messageCount === 'number') {
        parts.push(
            `${String(thread.messageCount)} message${thread.messageCount === 1 ? '' : 's'}`
        )
    }
    const updatedAt = thread.updatedAt ?? thread.createdAt
    if (typeof updatedAt === 'string' && updatedAt.trim().length > 0) {
        try {
            parts.push(new Date(updatedAt).toLocaleDateString())
        } catch {
            parts.push(updatedAt)
        }
    } else if (updatedAt instanceof Date) {
        parts.push(updatedAt.toLocaleDateString())
    }
    return parts.join(' • ')
}

export function MainSidebar() {
    const router = useRouter()
    const { selectAgent, selectedAgent, setThreadId, threadId } = useChatContext()
    const agentsResult = useAgents()
    const threadsResult = useThreads({ agentId: selectedAgent })

    const agents = (agentsResult.data ?? []) as SidebarAgent[]
    const threads = (threadsResult.data ?? []) as unknown as SidebarThread[]

    const handleAgentClick = useCallback(
        (agentId: string) => {
            const newThreadId = generateId()
            selectAgent(agentId)
            setThreadId(newThreadId)
            router.push(`/chat/${agentId}`)
        },
        [router, selectAgent, setThreadId]
    )

    const handleThreadClick = useCallback(
        (nextThreadId: string) => {
            if (!nextThreadId) {
                return
            }
            setThreadId(nextThreadId)
            router.push(`/chat/${selectedAgent}`)
        },
        [router, selectedAgent, setThreadId]
    )

    return (
        <Sidebar
            className="border-r bg-background/95 backdrop-blur-xl"
            data-active-agent={selectedAgent}
            data-thread-count={threads.length}
        >
            <SidebarHeader className="border-b border-border/50 px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BotIcon className="size-5" />
                    </div>
                    <h2 className="text-base font-bold tracking-tight text-foreground/90">
                        <button
                            type="button"
                            onClick={() => {
                                router.push('/chat')
                            }}
                            className="transition-colors hover:text-primary"
                        >
                            AgentStack
                        </button>
                    </h2>
                </div>
            </SidebarHeader>

            <SidebarContent className="px-2">
                <SidebarGroup>
                    <SidebarGroupLabel className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                        Agents
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        {agentsResult.isLoading ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2Icon className="size-4 animate-spin text-muted-foreground/40" />
                            </div>
                        ) : agents.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-muted-foreground/50 italic">
                                No agents found
                            </div>
                        ) : (
                            <SidebarMenu className="space-y-0.5">
                                {agents.map((agent) => (
                                    <SidebarMenuItem key={agent.id}>
                                        {(() => {
                                            const provider =
                                                typeof agent.provider === 'string'
                                                    ? agent.provider
                                                    : ''
                                            const modelId =
                                                typeof agent.modelId === 'string'
                                                    ? agent.modelId
                                                    : ''
                                            const subtitle =
                                                provider.length > 0 &&
                                                modelId.length > 0
                                                    ? `${provider} • ${modelId}`
                                                    : agent.description ??
                                                      'Agent ready'

                                            return (
                                        <SidebarMenuButton
                                            isActive={selectedAgent === agent.id}
                                            onClick={() => {
                                                handleAgentClick(agent.id)
                                            }}
                                            className={cn(
                                                'w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200',
                                                selectedAgent === agent.id
                                                    ? 'bg-primary/10 text-primary font-medium'
                                                    : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                                            )}
                                        >
                                            <div className="mt-0.5 rounded-md bg-primary/10 p-1 text-primary/80">
                                                <BotIcon className="size-3.5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-medium">
                                                    {agent.name}
                                                </div>
                                                <div className="truncate text-[11px] text-muted-foreground/70">
                                                    {subtitle}
                                                </div>
                                            </div>
                                        </SidebarMenuButton>
                                            )
                                        })()}
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        )}
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                        Current Threads
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        {threadsResult.isLoading ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2Icon className="size-4 animate-spin text-muted-foreground/40" />
                            </div>
                        ) : threads.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-muted-foreground/50 italic">
                                No threads for this agent yet
                            </div>
                        ) : (
                            <SidebarMenu className="space-y-0.5">
                                {threads.map((thread) => {
                                    const currentThreadId = getThreadId(thread)
                                    if (!currentThreadId) {
                                        return null
                                    }

                                    const label = getThreadLabel(thread)
                                    const meta = formatThreadMeta(thread)

                                    return (
                                        <SidebarMenuItem key={currentThreadId}>
                                            <SidebarMenuButton
                                                isActive={threadId === currentThreadId}
                                                onClick={() => {
                                                    handleThreadClick(currentThreadId)
                                                }}
                                                className={cn(
                                                    'w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200',
                                                    'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                                                )}
                                            >
                                                <div className="mt-0.5 rounded-md bg-primary/10 p-1 text-primary/80">
                                                    <MessageSquareIcon className="size-3.5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-medium">
                                                        {label}
                                                    </div>
                                                    <div className="truncate text-[11px] text-muted-foreground/70">
                                                        {meta || currentThreadId}
                                                    </div>
                                                </div>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                })}
                            </SidebarMenu>
                        )}
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-border/50 p-6">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            variant="default"
                            className="h-10 w-full justify-center rounded-xl bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:bg-primary/90 active:scale-[0.98]"
                            onClick={() => {
                                const agentId = selectedAgent || agents[0]?.id
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
