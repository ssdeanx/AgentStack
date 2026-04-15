'use client'

import { useCallback, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
import { ScrollArea } from '@/ui/scroll-area'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/ui/tooltip'
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
import router from 'next/router'

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
    const { data: session } = useAuthQuery()
    const { selectedAgent, setThreadId, threadId } = useChatContext()
    const threadsResult = useThreads({ agentId: selectedAgent })

    const threads = (threadsResult.data ?? []) as unknown as SidebarThread[]

    const pageItems = useMemo(
        () => [
            {
                label: 'Dashboard',
                href: '/chat',
                icon: HomeIcon,
                description: 'Overview of agents, workspaces, datasets, and runtime surfaces.',
            },
            {
                label: 'User Settings',
                href: '/chat/user',
                icon: HomeIcon,
                description: 'Manage your account profile, sessions, security, and API keys.',
            },
            {
                label: 'Admin Settings',
                href: '/chat/admin',
                icon: ServerIcon,
                description: 'Review runtime context and administer users.',
            },
            {
                label: 'Agents',
                href: '/chat/agents',
                icon: BotIcon,
                description: 'Browse available chat agents and jump into live sessions.',
            },
            {
                label: 'Code',
                href: '/chat/Code',
                icon: CodeIcon,
                activePrefix: '/chat/Code',
                description: 'Open the code-focused agent workspace.',
            },
            {
                label: 'Workspaces',
                href: '/chat/workspaces',
                icon: DatabaseIcon,
                description: 'Inspect workspace files, skills, and sandbox metadata.',
            },
            {
                label: 'Memory',
                href: '/chat/memory',
                icon: MessageSquareIcon,
                description: 'Review memory, notes, and thread persistence state.',
            },
            {
                label: 'Evaluation',
                href: '/chat/evaluation',
                icon: FlaskConicalIcon,
                description: 'Inspect datasets, scorers, and experiment runs.',
            },
            {
                label: 'Dataset',
                href: '/chat/dataset',
                icon: DatabaseIcon,
                description: 'Manage dataset records, items, and experiment artifacts.',
            },
            {
                label: 'Observability',
                href: '/chat/observability',
                icon: ActivityIcon,
                description: 'Review traces, spans, and score correlation details.',
            },
            {
                label: 'Workflows',
                href: '/chat/workflows',
                icon: WorkflowIcon,
                description: 'Browse workflow definitions and recent workflow activity.',
            },
            {
                label: 'Tools',
                href: '/chat/tools',
                icon: WrenchIcon,
                description: 'Inspect tool schemas, providers, and toolkit groupings.',
            },
            {
                label: 'Logs',
                href: '/chat/logs',
                icon: ActivityIcon,
                description: 'Inspect log transports and live runtime log entries.',
            },
            {
                label: 'Harness',
                href: '/chat/harness',
                icon: FlaskConicalIcon,
                description: 'Review harness threads, approvals, and execution state.',
            },
            {
                label: 'MCP / A2A',
                href: '/chat/mcp-a2a',
                icon: ServerIcon,
                description: 'Inspect MCP servers, tools, and A2A agent cards.',
            },
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
        [selectedAgent, setThreadId]
    )

    return (
        <TooltipProvider delayDuration={150}>
            <Sidebar
                className="border-r bg-background/95 backdrop-blur-xl"
                data-active-agent={selectedAgent}
                data-thread-count={threads.length}
            >
                <SidebarHeader className="border-b border-border/50 px-5 py-4">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={() => {
                                    router.push('/chat')
                                }}
                                className="flex w-full items-center gap-3 rounded-2xl px-1 py-1 text-left transition-colors hover:text-primary"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <BotIcon className="size-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate text-base font-bold tracking-tight text-foreground/90">
                                        AgentStack
                                    </div>
                                    <div className="truncate text-[11px] text-muted-foreground">
                                        Command center
                                    </div>
                                </div>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            Return to the main chat dashboard.
                        </TooltipContent>
                    </Tooltip>
                </SidebarHeader>

                <SidebarContent className="px-2">
                    <ScrollArea className="h-full px-1">
                        <div className="space-y-3 py-3">
                            <SidebarGroup>
                                <SidebarGroupLabel className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                                    Pages
                                </SidebarGroupLabel>
                                <SidebarGroupContent>
                                    <SidebarMenu className="space-y-1">
                                        {pageItems.map((item) => {
                                            const Icon = item.icon

                                            return (
                                                <SidebarMenuItem key={item.label}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <SidebarMenuButton
                                                                asChild
                                                                isActive={isPageActive(
                                                                    item.href,
                                                                    item.activePrefix
                                                                )}
                                                                className={cn(
                                                                    'w-full cursor-pointer items-start gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-200',
                                                                    isPageActive(
                                                                        item.href,
                                                                        item.activePrefix
                                                                    )
                                                                        ? 'bg-primary/10 text-primary font-medium'
                                                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                                                )}
                                                            >
                                                                <Link href={item.href}>
                                                                    <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5 text-primary/80">
                                                                        <Icon className="size-3.5" />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="truncate text-sm font-medium">
                                                                            {item.label}
                                                                        </div>
                                                                        <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground/70">
                                                                            {item.description}
                                                                        </div>
                                                                    </div>
                                                                </Link>
                                                            </SidebarMenuButton>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right" className="max-w-xs">
                                                            {item.description}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </SidebarMenuItem>
                                            )
                                        })}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>

                            <SidebarGroup>
                                <SidebarGroupLabel className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                                    Current Threads
                                </SidebarGroupLabel>
                                <SidebarGroupContent>
                                    {threadsResult.isLoading ? (
                                        <div className="flex items-center justify-center py-6">
                                            <Loader2Icon className="size-4 animate-spin text-muted-foreground/40" />
                                        </div>
                                    ) : threads.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-border/50 px-4 py-3 text-xs italic text-muted-foreground/60">
                                            No threads for this agent yet.
                                        </div>
                                    ) : (
                                        <ScrollArea className="max-h-72">
                                            <SidebarMenu className="space-y-1 pr-2">
                                                {threads.map((thread) => {
                                                    const currentThreadId = getThreadId(thread)
                                                    if (!currentThreadId) {
                                                        return null
                                                    }

                                                    const label = getThreadLabel(thread)
                                                    const meta = formatThreadMeta(thread)

                                                    return (
                                                        <SidebarMenuItem key={currentThreadId}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <SidebarMenuButton
                                                                        isActive={threadId === currentThreadId}
                                                                        onClick={() => {
                                                                            handleThreadClick(
                                                                                currentThreadId
                                                                            )
                                                                        }}
                                                                        className={cn(
                                                                            'w-full cursor-pointer items-start gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-200',
                                                                            threadId === currentThreadId
                                                                                ? 'bg-primary/10 text-primary font-medium'
                                                                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                                                        )}
                                                                    >
                                                                        <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5 text-primary/80">
                                                                            <MessageSquareIcon className="size-3.5" />
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="truncate text-sm font-medium">
                                                                                {label}
                                                                            </div>
                                                                            <div className="truncate text-[11px] text-muted-foreground/70">
                                                                                {meta ||
                                                                                    currentThreadId}
                                                                            </div>
                                                                        </div>
                                                                    </SidebarMenuButton>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="right" className="max-w-xs">
                                                                    <div className="font-medium">
                                                                        {label}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {meta ||
                                                                            currentThreadId}
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </SidebarMenuItem>
                                                    )
                                                })}
                                            </SidebarMenu>
                                        </ScrollArea>
                                    )}
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </div>
                    </ScrollArea>
                </SidebarContent>

                <SidebarFooter className="border-t border-border/50 p-5">
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
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <SidebarMenuButton
                                                        asChild
                                                        className="h-10 rounded-xl"
                                                    >
                                                        <Link href="/chat/user">
                                                            User settings
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </TooltipTrigger>
                                                <TooltipContent side="right">
                                                    Open your personal settings routes.
                                                </TooltipContent>
                                            </Tooltip>
                                        </SidebarMenuItem>
                                        {session.user.role === 'admin' ? (
                                            <SidebarMenuItem>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <SidebarMenuButton
                                                            asChild
                                                            className="h-10 rounded-xl"
                                                        >
                                                            <Link href="/chat/admin">
                                                                Admin settings
                                                            </Link>
                                                        </SidebarMenuButton>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right">
                                                        Open runtime and user administration controls.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </SidebarMenuItem>
                                        ) : null}
                                    </SidebarMenu>
                                </div>
                            </div>
                        ) : null}

                        <SidebarMenu>
                            <SidebarMenuItem>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <SidebarMenuButton
                                            variant="default"
                                            className="h-11 w-full justify-center rounded-2xl bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:bg-primary/90 active:scale-[0.98]"
                                            onClick={() => {
                                                router.push('/chat/agents')
                                            }}
                                        >
                                            <PlusIcon className="mr-2 size-4" />
                                            Choose agent
                                        </SidebarMenuButton>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        Open the agent directory and start a new thread.
                                    </TooltipContent>
                                </Tooltip>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div>
                                            <LogoutButton
                                                className="h-11 w-full rounded-2xl"
                                                variant="outline"
                                            />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        Sign out of the current Better Auth session.
                                    </TooltipContent>
                                </Tooltip>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </div>
                </SidebarFooter>
            </Sidebar>
        </TooltipProvider>
    )
}
