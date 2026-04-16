'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { SidebarInset, SidebarProvider } from '@/ui/sidebar'

interface ChatPageShellProps {
    title: string
    description: string
    children: ReactNode
    actions?: ReactNode
    eyebrow?: string
    contentClassName?: string
    sidebar?: ReactNode
    hideHeader?: boolean
    fullBleed?: boolean
}

/**
 * Shared premium shell for the chat dashboard surfaces.
 */
export function ChatPageShell({
    title,
    description,
    children,
    actions,
    eyebrow = 'AgentStack command center',
    contentClassName,
    sidebar,
    hideHeader = false,
    fullBleed = false,
}: ChatPageShellProps) {
    return (
        <SidebarProvider className="chat-shell-bg flex min-h-screen w-full overflow-hidden bg-background text-foreground">
            {sidebar ?? null}
            <SidebarInset className="min-w-0 flex-1 overflow-hidden bg-transparent">
                <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
                    {hideHeader ? null : (
                        <header className="border-b border-border/70 bg-background/88 px-5 py-4 shadow-[0_18px_48px_-36px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:px-6 sm:py-5">
                            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                <div className="space-y-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/75">
                                        {eyebrow}
                                    </p>
                                    <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                                        {title}
                                    </h1>
                                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                                        {description}
                                    </p>
                                </div>

                                {actions ? (
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        {actions}
                                    </div>
                                ) : null}
                            </div>
                        </header>
                    )}

                    <main
                        className={cn(
                            'flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8',
                            contentClassName
                        )}
                    >
                        <div
                            className={cn(
                                fullBleed
                                    ? 'flex h-full min-h-full flex-col'
                                    : 'mx-auto flex w-full max-w-[1600px] flex-col gap-6'
                            )}
                        >
                            {children}
                        </div>
                    </main>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
