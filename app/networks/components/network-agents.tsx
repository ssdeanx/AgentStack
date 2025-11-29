"use client"

import { useNetworkContext } from "@/app/networks/providers/network-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { Badge } from "@/ui/badge"
import { ScrollArea } from "@/ui/scroll-area"
import {
  CheckCircle2Icon,
  CircleDotIcon,
  CircleIcon,
  AlertCircleIcon,
  UserIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle2Icon className="size-4 text-green-500" />
    case "active":
      return <CircleDotIcon className="size-4 text-yellow-500 animate-pulse" />
    case "error":
      return <AlertCircleIcon className="size-4 text-red-500" />
    default:
      return <CircleIcon className="size-4 text-muted-foreground" />
  }
}

export function NetworkAgents() {
  const { networkConfig, networkStatus, routingSteps } = useNetworkContext()

  if (!networkConfig) return null

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Network Agents</CardTitle>
        <CardDescription className="text-xs">
          {networkConfig.agents.length} agents in this network
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-2 px-4 pb-4">
            {networkConfig.agents.map((agent, index) => {
              const step = routingSteps.find((s) => s.agentId === agent.id)
              const status = step?.status ?? "pending"
              const isActive = status === "active"

              return (
                <div
                  key={agent.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                    isActive && "border-yellow-500/50 bg-yellow-500/5",
                    status === "completed" && "border-green-500/50 bg-green-500/5"
                  )}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <UserIcon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{agent.name}</span>
                      {getStatusIcon(status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {agent.description}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {agent.role}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
