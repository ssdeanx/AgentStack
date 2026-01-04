"use client"

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Bot,
    Workflow,
    Network,
    Wrench,
    Settings,
} from 'lucide-react'

type NavItem = {
    title: string
    href: Route
    icon: React.ComponentType<{ className?: string }>
    description: string
}

const navItems: NavItem[] = [
    {
        title: 'Overview',
        href: '/admin' as Route,
        icon: LayoutDashboard,
        description: 'Quick launch + discovery',
    },
    {
        title: 'Agents',
        href: '/admin/agents' as Route,
        icon: Bot,
        description: 'All configured agents',
    },
    {
        title: 'Workflows',
        href: '/admin/workflows' as Route,
        icon: Workflow,
        description: 'All workflows + steps',
    },
    {
        title: 'Networks',
        href: '/admin/networks' as Route,
        icon: Network,
        description: 'Agent routing networks',
    },
    {
        title: 'Tools',
        href: '/admin/tools' as Route,
        icon: Wrench,
        description: 'Tooling overview',
    },
    {
        title: 'Settings',
        href: '/admin/settings' as Route,
        icon: Settings,
        description: 'Local preferences',
    },
]

export function AdminSidebar() {
    const pathname = usePathname()

    return (
        <aside className="hidden w-80 shrink-0 border-r bg-card lg:block">
            <div className="sticky top-0 flex h-screen flex-col">
                <div className="border-b p-6">
                    <div className="text-sm text-muted-foreground">AgentStack</div>
                    <div className="text-lg font-semibold">Admin</div>
                </div>

                <nav className="flex-1 space-y-1 p-3">
                    {navItems.map((item) => {
                        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                        const Icon = item.icon

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-start gap-3 rounded-lg px-3 py-3 transition-colors',
                                    active
                                        ? 'bg-primary/10 text-foreground'
                                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                )}
                            >
                                <Icon className="mt-0.5 h-5 w-5" />
                                <div className="min-w-0">
                                    <div className="font-medium leading-none">{item.title}</div>
                                    <div className="mt-1 text-xs leading-snug text-muted-foreground">
                                        {item.description}
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                <div className="border-t p-4 text-xs text-muted-foreground">
                    Protected area • Dev session cookie
                </div>
            </div>
        </aside>
    )
}
