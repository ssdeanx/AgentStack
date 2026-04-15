'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { MainSidebar } from './main-sidebar'
import { ChatPageShell } from './chat-page-shell'
import { ChatProvider } from '../providers/chat-context'
import { cn } from '@/lib/utils'
import { ScrollArea, ScrollBar } from '@/ui/scroll-area'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/ui/tooltip'

type SettingsSection = {
    href: string
    title: string
    description: string
}

interface ChatSettingsShellProps {
    title: string
    description: string
    sections: SettingsSection[]
    children: ReactNode
}

/**
 * Shared shell for modular chat settings routes that need the main sidebar and
 * a secondary in-section navigation.
 */
export function ChatSettingsShell({
    title,
    description,
    sections,
    children,
}: ChatSettingsShellProps) {
    const pathname = usePathname()

    return (
        <ChatProvider>
            <ChatPageShell
                title={title}
                description={description}
                sidebar={<MainSidebar />}
            >
                <TooltipProvider delayDuration={150}>
                    <div className="space-y-6">
                        <ScrollArea className="w-full whitespace-nowrap rounded-3xl border border-border/60 bg-card/70">
                            <nav className="grid min-w-max gap-3 p-4 lg:min-w-0 lg:grid-cols-3">
                                {sections.map((section) => {
                                    const isActive =
                                        pathname === section.href ||
                                        pathname.startsWith(`${section.href}/`)

                                    return (
                                        <Tooltip key={section.href}>
                                            <TooltipTrigger asChild>
                                                <Link
                                                    href={section.href}
                                                    className={cn(
                                                        'rounded-2xl border px-4 py-3 transition-colors',
                                                        isActive
                                                            ? 'border-primary/30 bg-primary/10 text-foreground'
                                                            : 'border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                                    )}
                                                >
                                                    <div className="text-sm font-medium">
                                                        {section.title}
                                                    </div>
                                                    <div className="mt-1 text-xs leading-relaxed">
                                                        {section.description}
                                                    </div>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                                {section.description}
                                            </TooltipContent>
                                        </Tooltip>
                                    )
                                })}
                            </nav>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>

                        {children}
                    </div>
                </TooltipProvider>
            </ChatPageShell>
        </ChatProvider>
    )
}
