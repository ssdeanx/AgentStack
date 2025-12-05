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
} from "lucide-react"
import { StatCard, EmptyState } from "./_components"
import { useQueryClient } from "@tanstack/react-query"

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const { data: agents, isLoading: agentsLoading } = useAgentsQuery()
  const { data: workflows, isLoading: workflowsLoading } = useWorkflowsQuery()
  const { data: tools, isLoading: toolsLoading } = useToolsQuery()
  const { data: traces, isLoading: tracesLoading } = useTracesQuery({ perPage: 5 })

  const refetchAll = () => {
    queryClient.invalidateQueries()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Mastra Admin - Monitor and manage your AI infrastructure
            </p>
          </div>
          <Button variant="outline" onClick={refetchAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
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
          />
          <StatCard
            title="Workflows"
            value={workflows?.length ?? 0}
            loading={workflowsLoading}
            icon={Workflow}
            href="/dashboard/workflows"
            description="Automated workflows"
          />
          <StatCard
            title="Tools"
            value={tools?.length ?? 0}
            loading={toolsLoading}
            icon={Wrench}
            href="/dashboard/tools"
            description="Available tools"
          />
          <StatCard
            title="Recent Traces"
            value={traces?.spans?.length ?? 0}
            loading={tracesLoading}
            icon={Activity}
            href="/dashboard/observability"
            description="In last 24h"
          />
        </div>

        {/* Quick Access */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Agents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Agents
                  </CardTitle>
                  <CardDescription>Your AI agents</CardDescription>
                </div>
                <Link href={"/dashboard/agents" as Route}>
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {agentsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !agents || agents.length === 0 ? (
                <EmptyState
                  icon={Bot}
                  title="No agents found"
                  description="Create your first agent to get started"
                />
              ) : (
                <div className="space-y-2">
                  {agents.slice(0, 5).map((agent) => (
                    <Link
                      key={agent.id}
                      href={`/dashboard/agents?agent=${agent.id}` as Route}
                      className="flex items-center justify-between p-3 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{agent.name || agent.id}</span>
                      </div>
                      <Badge variant="secondary">Agent</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Workflows */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow className="h-5 w-5" />
                    Workflows
                  </CardTitle>
                  <CardDescription>Automated workflows</CardDescription>
                </div>
                <Link href={"/dashboard/workflows" as Route}>
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {workflowsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !workflows || workflows.length === 0 ? (
                <EmptyState
                  icon={Workflow}
                  title="No workflows found"
                  description="Create your first workflow to automate tasks"
                />
              ) : (
                <div className="space-y-2">
                  {workflows.slice(0, 5).map((wf) => (
                    <Link
                      key={wf.id}
                      href={`/dashboard/workflows?workflow=${wf.id}` as Route}
                      className="flex items-center justify-between p-3 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Workflow className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{wf.name || wf.id}</span>
                      </div>
                      <Badge variant="secondary">Workflow</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Traces */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Traces
                </CardTitle>
                <CardDescription>Latest AI traces from your system</CardDescription>
              </div>
              <Link href={"/dashboard/observability" as Route}>
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {tracesLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !traces?.spans || traces.spans.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No traces found"
                description="Traces will appear here once your agents and workflows run"
              />
            ) : (
              <div className="space-y-2">
                {traces.spans.slice(0, 5).map((span) => (
                  <Link
                    key={span.traceId}
                    href={`/dashboard/observability?trace=${span.traceId}` as Route}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium">
                          {span.name || span.traceId}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {(span as unknown as Record<string, unknown>).startTime
                            ? new Date((span as unknown as Record<string, unknown>).startTime as string).toLocaleString()
                            : "No timestamp"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {typeof (span as unknown as Record<string, unknown>).duration === "number" && (
                        <Badge variant="outline" className="text-xs">
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
          />
          <QuickLinkCard
            title="Memory"
            description="Threads & working memory"
            icon={Brain}
            href="/dashboard/memory"
          />
          <QuickLinkCard
            title="Logs"
            description="System logs"
            icon={FileText}
            href="/dashboard/logs"
          />
          <QuickLinkCard
            title="Telemetry"
            description="Metrics & analytics"
            icon={BarChart3}
            href="/dashboard/telemetry"
          />
        </div>
      </div>
    </div>
  )
}

function QuickLinkCard({
  title,
  description,
  icon: Icon,
  href,
}: {
  title: string
  description: string
  icon: typeof Bot
  href: string
}) {
  return (
    <Link href={href as Route}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
}
