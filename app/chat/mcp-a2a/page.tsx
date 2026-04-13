'use client'

import { useMemo, useState } from 'react'

import {
  useA2ACard,
  useAgents,
  useMcpServerTools,
  useMcpServers,
} from '@/lib/hooks/use-mastra-query'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select'
import { ScrollArea } from '@/ui/scroll-area'
import { Skeleton } from '@/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/tooltip'
import { Panel } from '@/src/components/ai-elements/panel'
import {
  BotIcon,
  CircleHelpIcon,
  DatabaseIcon,
  PanelRightCloseIcon,
  RefreshCwIcon,
  ServerIcon,
  SparklesIcon,
  WrenchIcon,
} from 'lucide-react'

type McpServerRecord = {
  id: string
  name?: string
  description?: string
}

type McpToolRecord = {
  id: string
  description?: string
}

type A2ACardRecord = {
  name?: string
  description?: string
  skills?: Array<{ id?: string; name?: string }>
}

function safeString(value: unknown, fallback = '—'): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return fallback
}

/**
 * MCP and A2A explorer for live protocol surfaces.
 */
export default function McpA2APage() {
  const [selectedServerId, setSelectedServerId] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [showHelpPanel, setShowHelpPanel] = useState(true)

  const serversResult = useMcpServers({ page: 0, perPage: 50 })
  const agentsResult = useAgents()

  const servers = useMemo<McpServerRecord[]>(() => {
    return (serversResult.data?.servers ?? []) as McpServerRecord[]
  }, [serversResult.data])

  const agents = useMemo(() => {
    return (agentsResult.data ?? []).map((agent) => ({
      ...agent,
    })) as Array<{ id: string; name?: string; description?: string }>
  }, [agentsResult.data])

  const activeServerId = selectedServerId || servers[0]?.id || ''
  const activeAgentId = selectedAgentId || agents[0]?.id || ''

  const toolsResult = useMcpServerTools(activeServerId)
  const serverTools = useMemo<McpToolRecord[]>(() => {
    return (toolsResult.data?.tools ?? []) as McpToolRecord[]
  }, [toolsResult.data])

  const a2aCardResult = useA2ACard(activeAgentId)
  const a2aCard = a2aCardResult.data as A2ACardRecord | undefined

  const activeServer =
    servers.find((server) => server.id === activeServerId) ?? servers[0]
  const activeAgent =
    agents.find((agent) => agent.id === activeAgentId) ?? agents[0]

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex min-h-screen flex-col bg-background px-4 py-6 md:px-6">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 rounded-3xl border border-border/60 bg-card/70 px-5 py-4 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <ServerIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">MCP / A2A</h1>
              <p className="text-sm text-muted-foreground">
                Inspect live servers, toolkits, and agent cards from one surface.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="cursor-help">
                  {servers.length} servers
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Live MCP servers returned by the client hook.</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="cursor-help">
                  {agents.length} agents
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Agents available for A2A card inspection.</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    void serversResult.refetch()
                    void agentsResult.refetch()
                    void toolsResult.refetch()
                    void a2aCardResult.refetch()
                  }}
                  aria-label="Refresh MCP and A2A data"
                >
                  <RefreshCwIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refetch the live protocol surfaces.</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHelpPanel((current) => !current)}
                  aria-label={showHelpPanel ? 'Hide MCP/A2A help panel' : 'Show MCP/A2A help panel'}
                >
                  {showHelpPanel ? (
                    <PanelRightCloseIcon className="size-4" />
                  ) : (
                    <CircleHelpIcon className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showHelpPanel ? 'Hide the MCP/A2A help panel.' : 'Show the MCP/A2A help panel.'}
              </TooltipContent>
            </Tooltip>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 py-6">
          {showHelpPanel ? (
            <Panel position="top-right" className="pointer-events-auto z-20 w-88">
              <div className="rounded-3xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Protocol help</div>
                    <div className="text-xs text-muted-foreground">
                      Pick a server and agent, then inspect the live tool and card payloads.
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowHelpPanel(false)}
                    aria-label="Close MCP/A2A help panel"
                  >
                    <PanelRightCloseIcon className="size-4" />
                  </Button>
                </div>

                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <p>Servers show the tools exposed by the current MCP connection.</p>
                  <p>A2A cards describe the selected agent, its description, and available skills.</p>
                </div>
              </div>
            </Panel>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">MCP servers & tools</CardTitle>
                  <Badge variant="secondary" className="gap-1.5">
                    <WrenchIcon className="size-3.5" />
                    {serverTools.length}
                  </Badge>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <ServerIcon className="size-3.5" />
                      Server
                    </div>
                    <Select value={activeServerId} onValueChange={setSelectedServerId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a server" />
                      </SelectTrigger>
                      <SelectContent>
                        {servers.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No servers available
                          </div>
                        ) : (
                          servers.map((server) => (
                            <SelectItem key={server.id} value={server.id}>
                              {server.name ?? server.id}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <DatabaseIcon className="size-3.5" />
                      Active
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/80 px-3 py-2 text-sm text-foreground">
                      {activeServer?.name ?? activeServer?.id ?? 'No server selected'}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                                <ScrollArea className="h-136">
                  <div className="space-y-3 p-4">
                    {toolsResult.isLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <Skeleton key={index} className="h-20 w-full rounded-2xl" />
                        ))}
                      </div>
                    ) : serverTools.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/60 bg-background/70 p-6 text-sm text-muted-foreground">
                        No MCP tools found for the selected server.
                      </div>
                    ) : (
                      serverTools.map((tool) => (
                        <div key={tool.id} className="rounded-2xl border border-border/60 bg-background/80 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-foreground">{tool.id}</div>
                              <div className="text-xs text-muted-foreground">
                                {safeString(tool.description, 'No tool description available.')}
                              </div>
                            </div>
                            <Badge variant="outline">tool</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">A2A agent card</CardTitle>
                  <Badge variant="secondary" className="gap-1.5">
                    <SparklesIcon className="size-3.5" />
                    {activeAgent?.name ?? activeAgent?.id ?? 'agent'}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <BotIcon className="size-3.5" />
                    Agent
                  </div>
                  <Select value={activeAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No agents available
                        </div>
                      ) : (
                        agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name ?? agent.id}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                                <ScrollArea className="h-136">
                  <div className="space-y-3 p-4">
                    {a2aCardResult.isLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-24 w-full rounded-2xl" />
                        <Skeleton className="h-40 w-full rounded-2xl" />
                      </div>
                    ) : !a2aCard ? (
                      <div className="rounded-2xl border border-dashed border-border/60 bg-background/70 p-6 text-sm text-muted-foreground">
                        No A2A card is available for the selected agent.
                      </div>
                    ) : (
                      <>
                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Agent
                          </div>
                          <div className="mt-2 text-sm font-medium text-foreground">
                            {safeString(a2aCard.name, activeAgentId || 'Unnamed agent')}
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            {safeString(a2aCard.description, 'No description returned for this agent.')}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Skills
                          </div>
                          <div className="mt-3 space-y-2">
                            {(a2aCard.skills ?? []).length === 0 ? (
                              <div className="text-sm text-muted-foreground">
                                No skills returned on the A2A card.
                              </div>
                            ) : (
                              a2aCard.skills?.map((skill, index) => (
                                <div
                                  key={skill.id ?? skill.name ?? `skill-${index}`}
                                  className="rounded-xl border border-border/50 bg-card/60 px-3 py-2 text-sm text-foreground"
                                >
                                  {skill.name ?? skill.id ?? 'Unnamed skill'}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
