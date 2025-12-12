"use client"

import { useNetworkContext, type RoutingStep, type ProgressEvent } from "@/app/networks/providers/network-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card"
import { Badge } from "@/ui/badge"
import { ScrollArea } from "@/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  CheckCircle2Icon,
  CircleIcon,
  Loader2Icon,
  XCircleIcon,
  NetworkIcon,
  BotIcon,
  ArrowRightIcon,
} from "lucide-react"

function StepStatusIcon({ status }: { status: RoutingStep["status"] }) {
  switch (status) {
    case "completed":
      return <CheckCircle2Icon className="size-4 text-green-500" />
    case "active":
      return <Loader2Icon className="size-4 animate-spin text-blue-500" />
    case "error":
      return <XCircleIcon className="size-4 text-red-500" />
    case "pending":
      return <CircleIcon className="size-4 text-muted-foreground" />
    default:
      return <CircleIcon className="size-4 text-muted-foreground" />
  }
}

function ProgressEventItem({ event }: { event: ProgressEvent }) {
  const getStatusIcon = (status: ProgressEvent["status"]) => {
    switch (status) {
      case "done":
        return <CheckCircle2Icon className="size-3 text-green-500" />
      case "in-progress":
        return <Loader2Icon className="size-3 animate-spin text-blue-500" />
      case "error":
        return <XCircleIcon className="size-3 text-red-500" />
      default:
        return <CircleIcon className="size-3 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: ProgressEvent["status"]) => {
    switch (status) {
      case "done":
        return "text-green-700 dark:text-green-300"
      case "in-progress":
        return "text-blue-700 dark:text-blue-300"
      case "error":
        return "text-red-700 dark:text-red-300"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className="flex items-start gap-2 py-1">
      {getStatusIcon(event.status)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium", getStatusColor(event.status))}>
            {event.stage}
          </span>
          {event.agentId && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              {event.agentId}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {event.message}
        </p>
      </div>
    </div>
  )
}

function RoutingStepItem({ step, isLast }: { step: RoutingStep; isLast: boolean }) {
  return (
    <div className="relative flex gap-3">
      {/* Connection line */}
      {!isLast && (
        <div className="absolute left-2 top-6 h-[calc(100%-12px)] w-px bg-border" />
      )}

      <div className="relative z-10 mt-0.5">
        <StepStatusIcon status={step.status} />
      </div>

      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium text-sm",
            step.status === "active" && "text-blue-500",
            step.status === "completed" && "text-foreground",
            step.status === "pending" && "text-muted-foreground"
          )}>
            {step.agentName}
          </span>

          {step.status === "active" && (
            <Badge variant="outline" className="text-xs">
              Active
            </Badge>
          )}
        </div>

        {step.input && (
          <p className="mt-1 text-muted-foreground text-xs line-clamp-2">
            {step.input}
          </p>
        )}

        {step.output && step.output.length > 0 && step.status === "completed" && (
          <p className="mt-1 text-muted-foreground text-xs line-clamp-2">
            ✓ {step.output.slice(0, 100)}...
          </p>
        )}
      </div>
    </div>
  )
}

export function NetworkRoutingPanel() {
  const { networkConfig, networkStatus, routingSteps, progressEvents } = useNetworkContext()

  if (!networkConfig) {return null}

  const statusLabel = {
    idle: "Ready",
    routing: "Routing",
    executing: "Executing",
    completed: "Completed",
    error: "Error",
  }[networkStatus]

  const statusColor = {
    idle: "bg-muted text-muted-foreground",
    routing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    executing: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    error: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  }[networkStatus]

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <NetworkIcon className="size-4" />
            Routing Flow
          </CardTitle>
          <Badge className={cn("text-xs", statusColor)} variant="secondary">
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-1 px-4 pb-4">
            {/* Network agents preview */}
            <div className="mb-4 rounded-md border bg-muted/30 p-3">
              <p className="mb-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Available Agents
              </p>
              <div className="flex flex-wrap gap-1.5">
                {networkConfig.agents.map((agent) => (
                  <Badge
                    key={agent.id}
                    variant="outline"
                    className="text-xs font-normal"
                  >
                    <BotIcon className="mr-1 size-3" />
                    {agent.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Routing steps */}
            {routingSteps.length > 0 ? (
              <div className="space-y-0">
                {routingSteps.map((step, idx) => (
                  <RoutingStepItem
                    key={step.agentId}
                    step={step}
                    isLast={idx === routingSteps.length - 1}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ArrowRightIcon className="mb-2 size-8 text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">
                  Routing steps will appear here
                </p>
                <p className="mt-1 text-muted-foreground/70 text-xs">
                  Send a message to see agent routing
                </p>
              </div>
            )}

            {/* Progress Events */}
            {progressEvents.length > 0 && (
              <div className="mt-6">
                <p className="mb-3 text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Progress Events
                </p>
                <div className="space-y-2">
                  {progressEvents.slice(-5).map((event) => (
                    <ProgressEventItem key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
