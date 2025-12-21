"use client"

import {
  useAgentsQuery,
  useWorkflowsQuery,
  useToolsQuery,
  useTracesQuery,
} from "@/lib/hooks/use-dashboard-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { Badge } from "@/ui/badge"
import { Button } from "@/ui/button"
import { Skeleton } from "@/ui/skeleton"
import Link from "next/link"
import type { Route } from "next"
import {
  Bot,
  Workflow,
  Wrench,
  Database,
  Brain,
  Activity,
  FileText,
  BarChart3,
  ArrowRight,
  RefreshCw,
  Clock,
  Zap,
  TrendingUp,
} from "lucide-react"
import { StatCard, EmptyState } from "./_components"
import { useQueryClient } from "@tanstack/react-query"
import { LineWidget, AreaWidget, PieWidget, BarWidget } from "@/app/components/charts"

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const { data: agents, isLoading: agentsLoading } = useAgentsQuery()
  const { data: workflows, isLoading: workflowsLoading } = useWorkflowsQuery()
  const { data: tools, isLoading: toolsLoading } = useToolsQuery()
  const { data: traces, isLoading: tracesLoading } = useTracesQuery({ perPage: 5 })

  const refetchAll = () => {
    queryClient.invalidateQueries()
  }

  const agentsCount = agents?.length ?? 0
  const workflowsCount = workflows?.length ?? 0
  const toolsCount = tools?.length ?? 0
  const tracesCount = traces?.spans?.length ?? 0

  const trafficData = [
    { label: "Agents", a: agentsCount, b: toolsCount },
    { label: "Workflows", a: workflowsCount, b: tracesCount },
  ]

  const engagementData = [
    { label: "Ops", a: agentsCount + toolsCount, b: workflowsCount },
    { label: "Observability", a: tracesCount, b: toolsCount },
  ]

  const shareData = [
    { name: "Agents", value: agentsCount, fill: "#6366f1" },
    { name: "Workflows", value: workflowsCount, fill: "#22c55e" },
    { name: "Tools", value: toolsCount, fill: "#f97316" },
    { name: "Traces", value: tracesCount, fill: "#06b6d4" },
  ]

  const barData = [
    { label: "Catalog", value: agentsCount + workflowsCount + toolsCount },
    { label: "Recent Traces", value: tracesCount },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-linear-to-r from-background to-muted/20">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <Badge variant="secondary" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Monitor and manage your Mastra AI infrastructure
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={refetchAll} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button asChild size="sm">
                <Link href={"/chat" as Route}>
                  <Bot className="h-4 w-4 mr-2" />
                  Chat with Agent
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Agents"
            value={agents?.length ?? 0}
            loading={agentsLoading}
            icon={Bot}
            href="/dashboard/agents"
            description="Active AI agents"
            trend={{ value: 22, label: "configured", positive: true }}
          />
          <StatCard
            title="Workflows"
            value={workflows?.length ?? 0}
            loading={workflowsLoading}
            icon={Workflow}
            href="/dashboard/workflows"
            description="Automated workflows"
            trend={{ value: 10, label: "available", positive: true }}
          />
          <StatCard
            title="Tools"
            value={tools?.length ?? 0}
            loading={toolsLoading}
            icon={Wrench}
            href="/dashboard/tools"
            description="Enterprise tools"
            trend={{ value: 30, label: "ready", positive: true }}
          />
          <StatCard
            title="Recent Traces"
            value={traces?.spans?.length ?? 0}
            loading={tracesLoading}
            icon={Activity}
            href="/dashboard/observability"
            description="Last 24 hours"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Traffic</CardTitle>
                    <CardDescription className="text-xs">Agents vs. Tools / Traces</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <LineWidget data={trafficData} />
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Engagement</CardTitle>
                    <CardDescription className="text-xs">Ops vs. Observability mix</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <AreaWidget data={engagementData} />
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Composition</CardTitle>
                    <CardDescription className="text-xs">Resource share</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <PieWidget data={shareData} />
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Volume</CardTitle>
                    <CardDescription className="text-xs">Catalog vs. traces</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <BarWidget data={barData} />
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Agents */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Agents</CardTitle>
                    <CardDescription className="text-xs">Your AI assistants</CardDescription>
                  </div>
                </div>
                <Link href={"/dashboard/agents" as Route}>
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {agentsLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !agents || agents.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={Bot}
                    title="No agents found"
                    description="Create your first agent to get started"
                  />
                </div>
              ) : (
                <div className="divide-y">
                  {agents.slice(0, 5).map((agent) => (
                    <Link
                      key={agent.id}
                      href={`/dashboard/agents?agent=${agent.id}` as Route}
                      className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                          <Bot className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="font-medium text-sm">{agent.name ?? agent.id}</span>
                          {agent.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {agent.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Agent
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Workflows */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary-foreground">
                    <Workflow className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Workflows</CardTitle>
                    <CardDescription className="text-xs">Automated pipelines</CardDescription>
                  </div>
                </div>
                <Link href={"/dashboard/workflows" as Route}>
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {workflowsLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !workflows || workflows.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={Workflow}
                    title="No workflows found"
                    description="Create your first workflow to automate tasks"
                  />
                </div>
              ) : (
                <div className="divide-y">
                  {workflows.slice(0, 5).map((wf) => (
                    <Link
                      key={wf.id}
                      href={`/dashboard/workflows?workflow=${wf.id}` as Route}
                      className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                          <Workflow className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="font-medium text-sm">{wf.name ?? wf.id}</span>
                          {wf.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {wf.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Workflow
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Traces */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent dark:bg-accent/30 dark:text-accent-foreground">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Recent Traces</CardTitle>
                  <CardDescription className="text-xs">Latest AI execution traces</CardDescription>
                </div>
              </div>
              <Link href={"/dashboard/observability" as Route}>
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {tracesLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !traces?.spans || traces.spans.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={Activity}
                  title="No traces found"
                  description="Traces will appear here once your agents and workflows run"
                />
              </div>
            ) : (
              <div className="divide-y">
                {traces.spans.slice(0, 5).map((span) => (
                  <Link
                    key={span.traceId}
                    href={`/dashboard/observability?trace=${span.traceId}` as Route}
                    className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="font-medium text-sm">
                          {span.name ?? span.traceId}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {((span as unknown as Record<string, unknown>).startTime)
                            ? new Date((span as unknown as Record<string, unknown>).startTime as string).toLocaleString()
                            : "No timestamp"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {typeof (span as unknown as Record<string, unknown>).duration === "number" && (
                        <Badge variant="outline" className="text-xs font-mono">
                          <Clock className="h-3 w-3 mr-1" />
                          {String((span as unknown as Record<string, unknown>).duration)}ms
                        </Badge>
                      )}
                      <Badge
                        variant={
                          (span as unknown as Record<string, unknown>).status === "ok" || (span as unknown as Record<string, unknown>).status === "success"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {span.spanType || "trace"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <QuickLinkCard
            title="Vectors"
            description="Manage vector indexes"
            icon={Database}
            href="/dashboard/vectors"
            color="purple"
          />
          <QuickLinkCard
            title="Memory"
            description="Threads & working memory"
            icon={Brain}
            href="/dashboard/memory"
            color="pink"
          />
          <QuickLinkCard
            title="Logs"
            description="System logs"
            icon={FileText}
            href="/dashboard/logs"
            color="orange"
          />
          <QuickLinkCard
            title="Telemetry"
            description="Metrics & analytics"
            icon={BarChart3}
            href="/dashboard/telemetry"
            color="cyan"
          />
        </div>
      </div>
    </div>
  )
}

const colorVariants = {
  purple: "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary-foreground",
  pink: "bg-accent/10 text-accent dark:bg-accent/30 dark:text-accent-foreground",
  orange: "bg-secondary/10 text-secondary dark:bg-secondary/30 dark:text-secondary-foreground",
  cyan: "bg-muted/10 text-muted-foreground dark:bg-muted/30 dark:text-muted-foreground",
}

function QuickLinkCard({
  title,
  description,
  icon: Icon,
  href,
  color = "purple",
}: {
  title: string
  description: string
  icon: typeof Bot
  href: string
  color?: keyof typeof colorVariants
}) {
  return (
    <Link href={href as Route}>
      <Card className="hover:bg-accent/50 hover:border-accent transition-all cursor-pointer h-full group">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorVariants[color]} transition-transform group-hover:scale-110`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base group-hover:text-primary transition-colors">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
}
