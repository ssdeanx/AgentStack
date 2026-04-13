'use client'

import { useCallback, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { useChatContext } from '@/app/chat/providers/chat-context-hooks'
import { useAuthQuery } from '@/lib/hooks/use-auth-query'
import { useThreads } from '@/lib/hooks/use-mastra-query'
import { LogoutButton } from '../_components/logout-button'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/ui/sidebar'
import {
    ActivityIcon,
    BotIcon,
    CodeIcon,
    DatabaseIcon,
    FlaskConicalIcon,
    HomeIcon,
    Loader2Icon,
    MessageSquareIcon,
    PlusIcon,
    ServerIcon,
    WorkflowIcon,
    WrenchIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

/**
 * Primary navigation sidebar for the chat area.
 */
export function MainSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { data: session } = useAuthQuery()
    const { selectedAgent, setThreadId, threadId } = useChatContext()
    const threadsResult = useThreads({ agentId: selectedAgent })

    const threads = useMemo(
        () => (threadsResult.data ?? []) as unknown as SidebarThread[],
        [threadsResult.data]
    )

    const pageItems = useMemo(
        () => [
            { label: 'Dashboard', href: '/chat', icon: HomeIcon },
            { label: 'User Settings', href: '/chat/user', icon: HomeIcon },
            { label: 'Admin Settings', href: '/chat/admin', icon: ServerIcon },
            { label: 'Agents', href: '/chat/agents', icon: BotIcon },
            { label: 'Code', href: '/chat/Code', icon: CodeIcon, activePrefix: '/chat/Code' },
            { label: 'Workspaces', href: '/chat/workspaces', icon: DatabaseIcon },
            { label: 'Memory', href: '/chat/memory', icon: MessageSquareIcon },
            { label: 'Evaluation', href: '/chat/evaluation', icon: FlaskConicalIcon },
            { label: 'Dataset', href: '/chat/dataset', icon: DatabaseIcon },
            { label: 'Observability', href: '/chat/observability', icon: ActivityIcon },
            { label: 'Workflows', href: '/chat/workflows', icon: WorkflowIcon },
            { label: 'Tools', href: '/chat/tools', icon: WrenchIcon },
            { label: 'Logs', href: '/chat/logs', icon: ActivityIcon },
            { label: 'Harness', href: '/chat/harness', icon: FlaskConicalIcon },
            { label: 'MCP / A2A', href: '/chat/mcp-a2a', icon: ServerIcon },
        ],
        []
    )

    const isPageActive = useCallback(
        (href: string, activePrefix?: string) => {
            if (activePrefix) {
                return pathname.startsWith(activePrefix)
            }

            return pathname === href || pathname.startsWith(`${href}/`)
        },
        [pathname]
    )

    const handleThreadClick = useCallback(
        (nextThreadId: string) => {
            if (!nextThreadId) {
                return
            }

            setThreadId(nextThreadId)
            router.push(`/chat/agents/${selectedAgent}`)
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
                <button
                    type="button"
                    onClick={() => {
                        router.push('/chat')
                    }}
                    className="flex items-center gap-3 text-left transition-colors hover:text-primary"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BotIcon className="size-5" />
                    </div>
                    <div>
                        <div className="text-base font-bold tracking-tight text-foreground/90">
                            AgentStack
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                            Command center
                        </div>
                    </div>
                </button>
            </SidebarHeader>

            <SidebarContent className="px-2">
                <SidebarGroup>
                    <SidebarGroupLabel className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                        Pages
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-0.5">
                            {pageItems.map((item) => {
                                const Icon = item.icon

                                return (
                                    <SidebarMenuItem key={item.label}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isPageActive(item.href, item.activePrefix)}
                                            className={cn(
                                                'w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200',
                                                isPageActive(item.href, item.activePrefix)
                                                    ? 'bg-primary/10 text-primary font-medium'
                                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                            )}
                                        >
                                            <Link href={item.href}>
                                                <div className="mt-0.5 rounded-md bg-primary/10 p-1 text-primary/80">
                                                    <Icon className="size-3.5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-medium">
                                                        {item.label}
                                                    </div>
                                                </div>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
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
                            <div className="px-4 py-3 text-xs italic text-muted-foreground/50">
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
                                                    threadId === currentThreadId
                                                        ? 'bg-primary/10 text-primary font-medium'
                                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
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
                <div className="space-y-4">
                    {session?.user ? (
                        <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
                                Account
                            </div>
                            <div className="mt-2 truncate text-sm font-medium text-foreground">
                                {session.user.name ?? 'Account'}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                                {session.user.email}
                            </div>
                            <div className="mt-3 flex flex-col gap-2">
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild className="h-10 rounded-xl">
                                            <Link href="/chat/user">User settings</Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    {session.user.role === 'admin' ? (
                                        <SidebarMenuItem>
                                            <SidebarMenuButton asChild className="h-10 rounded-xl">
                                                <Link href="/chat/admin">Admin settings</Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ) : null}
                                </SidebarMenu>
                            </div>
                        </div>
                    ) : null}

                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                variant="default"
                                className="h-10 w-full justify-center rounded-xl bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:bg-primary/90 active:scale-[0.98]"
                                onClick={() => {
                                    router.push('/chat/agents')
                                }}
                            >
                                <PlusIcon className="mr-2 size-4" />
                                Choose agent
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <LogoutButton className="h-10 w-full rounded-xl" variant="outline" />
                        </SidebarMenuItem>
                    </SidebarMenu>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
