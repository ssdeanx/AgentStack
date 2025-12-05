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
  Home,
  LogOut,
  User,
} from "lucide-react"
import { Button } from "@/ui/button"
import { ScrollArea } from "@/ui/scroll-area"
import { Separator } from "@/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu"

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

  return (
    <TooltipProvider delayDuration={0}>
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Activity className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Mastra Admin</span>
            </Link>
          )}
          {collapsed && (
            <Link href={"/dashboard" as Route} className="mx-auto">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Activity className="h-4 w-4 text-primary-foreground" />
              </div>
            </Link>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapsedChange(!collapsed)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="flex justify-center py-2 border-b">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapsedChange(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className="flex flex-col gap-1 px-2">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href))

              const linkContent = (
                <Link
                  key={item.href}
                  href={item.href as Route}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors group",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded-full",
                            isActive
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="flex flex-col">
                      <span className="font-medium">{item.title}</span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return linkContent
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-2">
          <Separator className="my-2" />
          
          {/* Back to Site */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={"/" as Route}
                  className="flex items-center justify-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Home className="h-4 w-4 shrink-0" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Back to Site</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href={"/" as Route}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Home className="h-4 w-4 shrink-0" />
              <span>Back to Site</span>
            </Link>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                  <User className="h-3 w-3" />
                </div>
                {!collapsed && <span className="flex-1 text-left">Account</span>}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={collapsed ? "center" : "start"} side="top">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={"/dashboard/settings" as Route}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={"/login" as Route}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  )
}
