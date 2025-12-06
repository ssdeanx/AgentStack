"use client"

import { useMemo } from "react"
import { useNetworkContext } from "@/app/networks/providers/network-context"
import { CATEGORY_LABELS, getNetworksByCategory, type NetworkCategory } from "@/app/networks/config/networks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { Badge } from "@/ui/badge"
import { ScrollArea } from "@/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible"
import { cn } from "@/lib/utils"
import {
  BotIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircuitBoardIcon,
  DatabaseIcon,
  FlaskConicalIcon,
  InfoIcon,
  LayersIcon,
  NetworkIcon,
  RadioIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react"
import { useState } from "react"

const CATEGORY_ICONS: Record<NetworkCategory, React.ReactNode> = {
  routing: <RadioIcon className="size-4" />,
  pipeline: <DatabaseIcon className="size-4" />,
  research: <FlaskConicalIcon className="size-4" />,
}

const FEATURE_ICONS = {
  realTimeRouting: <ZapIcon className="size-3" />,
  multiAgent: <LayersIcon className="size-3" />,
  streaming: <RadioIcon className="size-3" />,
}

const FEATURE_LABELS = {
  realTimeRouting: "Real-time Routing",
  multiAgent: "Multi-Agent",
  streaming: "Streaming",
}

interface AgentCardProps {
  agent: {
    id: string
    name: string
    description: string
    role: string
  }
  isActive?: boolean
}

function AgentCard({ agent, isActive }: AgentCardProps) {
  return (
    <div
      className={cn(
        "group rounded-lg border bg-card p-3 transition-colors",
        (isActive ?? false) && "border-primary bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md bg-muted",
            (isActive ?? false) && "bg-primary/10"
          )}
        >
          <BotIcon className={cn("size-4 text-muted-foreground", (isActive ?? false) && "text-primary")} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{agent.name}</span>
            <Badge variant="outline" className="text-[10px] font-normal capitalize">
              {agent.role}
            </Badge>
          </div>
          <p className="mt-0.5 text-muted-foreground text-xs line-clamp-2">{agent.description}</p>
        </div>
      </div>
    </div>
  )
}

function NetworkOverview() {
  const { networkConfig } = useNetworkContext()

  if (!networkConfig) {return null}

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <CircuitBoardIcon className="size-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">{networkConfig.name}</h3>
          <p className="mt-1 text-muted-foreground text-sm">{networkConfig.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="gap-1">
          {CATEGORY_ICONS[networkConfig.category]}
          {CATEGORY_LABELS[networkConfig.category]}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <BotIcon className="size-3" />
          {networkConfig.agents.length} Agents
        </Badge>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="mb-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Features
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(networkConfig.features).map(([key, enabled]) => (
            <Badge
              key={key}
              variant={(enabled) ? "default" : "outline"}
              className={cn("gap-1 text-xs", !enabled && "opacity-50")}
            >
              {FEATURE_ICONS[key as keyof typeof FEATURE_ICONS]}
              {FEATURE_LABELS[key as keyof typeof FEATURE_LABELS]}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

function NetworkAgentsList() {
  const { networkConfig, routingSteps } = useNetworkContext()

  if (!networkConfig) {return null}

  const activeAgentIds = routingSteps
    .filter((s) => s.status === "active")
    .map((s) => s.agentId)

  return (
    <div className="space-y-3">
      {networkConfig.agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          isActive={activeAgentIds.includes(agent.id)}
        />
      ))}
    </div>
  )
}

function AllNetworksOverview() {
  const { selectNetwork, selectedNetwork } = useNetworkContext()
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["routing"])
  const networksByCategory = useMemo(() => getNetworksByCategory(), [])

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    )
  }

  return (
    <div className="space-y-2">
      {(["routing", "pipeline", "research"] as NetworkCategory[]).map((category) => {
        const networks = networksByCategory[category]
        if (networks.length === 0) {return null}

        const isExpanded = expandedCategories.includes(category)

        return (
          <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md p-2 hover:bg-muted">
              <div className="flex items-center gap-2">
                {CATEGORY_ICONS[category]}
                <span className="font-medium text-sm">{CATEGORY_LABELS[category]}</span>
                <Badge variant="secondary" className="text-xs">
                  {networks.length}
                </Badge>
              </div>
              {isExpanded ? (
                <ChevronDownIcon className="size-4 text-muted-foreground" />
              ) : (
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-1 pl-2">
              {networks.map((network) => (
                <button
                  key={network.id}
                  type="button"
                  onClick={() => selectNetwork(network.id as any)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md p-2 text-left transition-colors hover:bg-muted",
                    selectedNetwork === network.id && "bg-primary/10"
                  )}
                >
                  <NetworkIcon
                    className={cn(
                      "mt-0.5 size-4 text-muted-foreground",
                      selectedNetwork === network.id && "text-primary"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "font-medium text-sm",
                        selectedNetwork === network.id && "text-primary"
                      )}
                    >
                      {network.name}
                    </p>
                    <p className="text-muted-foreground text-xs line-clamp-1">
                      {network.description}
                    </p>
                  </div>
                </button>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </div>
  )
}

export function NetworkInfoPanel() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <InfoIcon className="size-4" />
          Network Info
        </CardTitle>
        <CardDescription className="text-xs">
          Browse and select agent networks
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="current" className="w-full">
          <div className="px-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="current" className="text-xs">
                <SparklesIcon className="mr-1 size-3" />
                Current
              </TabsTrigger>
              <TabsTrigger value="agents" className="text-xs">
                <BotIcon className="mr-1 size-3" />
                Agents
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs">
                <NetworkIcon className="mr-1 size-3" />
                All
              </TabsTrigger>
            </TabsList>
          </div>
          <ScrollArea className="h-[calc(100vh-320px)]">
            <TabsContent value="current" className="m-0 p-4">
              <NetworkOverview />
            </TabsContent>
            <TabsContent value="agents" className="m-0 p-4">
              <NetworkAgentsList />
            </TabsContent>
            <TabsContent value="all" className="m-0 p-4">
              <AllNetworksOverview />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  )
}
