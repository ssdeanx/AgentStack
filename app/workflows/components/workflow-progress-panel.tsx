"use client"

import { useWorkflowContext, type WorkflowProgressEvent } from "@/app/workflows/providers/workflow-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card"
import { Badge } from "@/ui/badge"
import { ScrollArea } from "@/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  CheckCircle2Icon,
  CircleIcon,
  Loader2Icon,
  XCircleIcon,
  ActivityIcon,
} from "lucide-react"
import { useMemo } from "react"

function ProgressEventItem({ event }: { event: WorkflowProgressEvent }) {
  const getStatusIcon = (status: WorkflowProgressEvent["status"]) => {
    switch (status) {
      case "done":
        return <CheckCircle2Icon className="size-3 text-green-500" />
      case "in-progress":
        return <Loader2Icon className="size-3 animate-spin text-blue-500" />
      default:
        return <CircleIcon className="size-3 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: WorkflowProgressEvent["status"]) => {
    switch (status) {
      case "done":
        return "text-green-700 dark:text-green-300"
      case "in-progress":
        return "text-blue-700 dark:text-blue-300"
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
          {event.stepId !== null && event.stepId !== undefined && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              {event.stepId}
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

export function WorkflowProgressPanel() {
  const { progressEvents, workflowStatus } = useWorkflowContext()

  // Group events by stage for better organization
  const eventsByStage = useMemo(() => {
    const grouped: Record<string, WorkflowProgressEvent[]> = {}
    progressEvents.forEach(event => {
      const stage = event.stage || "general"
      if (!(stage in grouped)) {
        grouped[stage] = []
      }
      grouped[stage].push(event)
    })
    return grouped
  }, [progressEvents])

  // Only show if there are progress events or workflow is running
  if (progressEvents.length === 0 && workflowStatus === "idle") {
    return null
  }

  return (
    <Card className="absolute top-4 right-4 w-80 max-h-96 shadow-lg border-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ActivityIcon className="size-4" />
          Progress Events
          {progressEvents.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {progressEvents.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-1 px-4 pb-4">
            {progressEvents.length > 0 ? (
              <div className="space-y-4">
                {Object.entries(eventsByStage).map(([stage, events]) => (
                  <div key={stage} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {stage}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {events.length}
                      </Badge>
                    </div>
                    <div className="space-y-1 ml-2">
                      {events.slice(-3).map((event) => (
                        <ProgressEventItem key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ActivityIcon className="mb-2 size-8 text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">
                  Progress events will appear here
                </p>
                <p className="mt-1 text-muted-foreground/70 text-xs">
                  Start a workflow to see progress
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
