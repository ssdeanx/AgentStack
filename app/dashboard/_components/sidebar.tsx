"use client"

import Link from "next/link"
import type { Route } from "next"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Bot,
  Workflow,
  Wrench,
  Database,
  Brain,
  Activity,
  FileText,
  BarChart3,
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/ui/button"
import { ScrollArea } from "@/ui/scroll-area"
import { Separator } from "@/ui/separator"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
}

const navItems: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Dashboard overview and metrics",
  },
  {
    title: "Agents",
    href: "/dashboard/agents",
    icon: Bot,
    description: "Manage AI agents and evaluations",
  },
  {
    title: "Workflows",
    href: "/dashboard/workflows",
    icon: Workflow,
    description: "Workflow runs and history",
  },
  {
    title: "Tools",
    href: "/dashboard/tools",
    icon: Wrench,
    description: "Execute and monitor tools",
  },
  {
    title: "Vectors",
    href: "/dashboard/vectors",
    icon: Database,
    description: "Vector indexes and queries",
  },
  {
    title: "Memory",
    href: "/dashboard/memory",
    icon: Brain,
    description: "Threads, messages, working memory",
  },
  {
    title: "Observability",
    href: "/dashboard/observability",
    icon: Activity,
    description: "Traces, spans, and scoring",
  },
  {
    title: "Logs",
    href: "/dashboard/logs",
    icon: FileText,
    description: "System and run logs",
  },
  {
    title: "Telemetry",
    href: "/dashboard/telemetry",
    icon: BarChart3,
    description: "Metrics and analytics",
  },
]

interface SidebarProps {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href={"/dashboard" as Route} className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="font-semibold">Mastra Admin</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCollapsedChange(!collapsed)}
          className={cn(collapsed && "mx-auto")}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href as Route}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.title : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-2">
        <Separator className="my-2" />
        <Link
          href={"/dashboard/settings" as Route}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  )
}
