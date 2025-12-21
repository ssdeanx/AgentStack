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
  ChevronLeft,
} from "lucide-react"
import { Button } from "@/ui/button"
import { Badge } from "@/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/tooltip"
import { useApiHealthQuery } from "@/lib/hooks/use-dashboard-queries"
import {
  Sidebar as UiSidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenuItem,
} from "@/ui/sidebar"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
  badge?: string
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
    badge: "22+",
  },
  {
    title: "Workflows",
    href: "/dashboard/workflows",
    icon: Workflow,
    description: "Workflow runs and history",
    badge: "10",
  },
  {
    title: "Tools",
    href: "/dashboard/tools",
    icon: Wrench,
    description: "Execute and monitor tools",
    badge: "30+",
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
  const { data: apiHealth, isLoading: apiLoading, refetch: refetchApi } = useApiHealthQuery()

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider open={!collapsed} onOpenChange={(open) => onCollapsedChange(!open)}>
        <UiSidebar collapsible="icon">
          <SidebarHeader className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Link href={'/dashboard' as Route} className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Activity className="h-4 w-4 text-primary-foreground" />
                </div>
                {!collapsed && <span className="font-semibold">Mastra Admin</span>}
              </Link>
            </div>
            {!collapsed && (
              <Button variant="ghost" size="icon" onClick={() => onCollapsedChange(!collapsed)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </SidebarHeader>

          <SidebarContent>
            <nav className="flex flex-col gap-1 px-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <SidebarMenuItem key={item.href}>
                    <Link
                      href={item.href as Route}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {item.badge ? (<span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{item.badge}</span>) : null}
                        </>
                      )}
                    </Link>
                  </SidebarMenuItem>
                )
              })}
            </nav>
          </SidebarContent>

          <SidebarFooter>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">API</span>
                {apiHealth?.ok ? (
                  <Badge variant="secondary" className="text-xs">OK</Badge>
                ) : apiHealth && !apiHealth?.ok ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="destructive" className="text-xs cursor-help">Error</Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="text-sm">
                        <div className="font-medium">API checks failed</div>
                        <ul className="mt-2 text-xs list-disc list-inside">
                          {Object.entries(apiHealth?.checks ?? {}).map(([k, v]) => (
                            <li key={k}>{k}: {v?.ok ? 'ok' : (v?.error ?? 'error')}</li>
                          ))}
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Badge className="text-xs">Unknown</Badge>
                )}
              </div>

              <div>
                <Button size="sm" variant="ghost" onClick={() => refetchApi()}>
                  Check
                </Button>
              </div>
            </div>
          </SidebarFooter>
        </UiSidebar>
      </SidebarProvider>
    </TooltipProvider>
  )
}
