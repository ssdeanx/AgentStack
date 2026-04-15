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
}: ChatPageShellProps) {
    return (
        <SidebarProvider className="flex min-h-screen w-full overflow-hidden bg-background">
            {sidebar ?? null}
            <SidebarInset className="min-w-0 flex-1 overflow-hidden bg-background">
                <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
                    {hideHeader ? null : (
                        <header className="border-b border-border/60 bg-background/80 px-5 py-4 backdrop-blur-xl sm:px-6 sm:py-5">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                                <div className="space-y-2.5">
                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
                                        {eyebrow}
                                    </p>
                                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                        {title}
                                    </h1>
                                    <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                                        {description}
                                    </p>
                                </div>

                                {actions ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                        {actions}
                                    </div>
                                ) : null}
                            </div>
                        </header>
                    )}

                    <main
                        className={cn(
                            'flex-1 overflow-y-auto bg-linear-to-b from-background to-background/95 p-5 sm:p-6',
                            contentClassName
                        )}
                    >
                        {children}
                    </main>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
