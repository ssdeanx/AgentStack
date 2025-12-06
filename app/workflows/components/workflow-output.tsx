"use client"

import { Panel } from "@/src/components/ai-elements/panel"
import { ScrollArea } from "@/ui/scroll-area"
import { useWorkflowContext } from "@/app/workflows/providers/workflow-context"
import { MessageSquareIcon, CheckCircle2Icon, AlertCircleIcon, Loader2Icon } from "lucide-react"
import { useMemo } from "react"

export function WorkflowOutput() {
  const { streamingOutput, workflowStatus, messages, workflowConfig } = useWorkflowContext()

  const hasContent = streamingOutput || messages.length > 0

  if (workflowStatus === "idle" && !hasContent) {
    return null
  }

  const statusIcon = useMemo(() => {
    switch (workflowStatus) {
      case "running":
        return <Loader2Icon className="size-3 animate-spin text-yellow-500" />
      case "completed":
        return <CheckCircle2Icon className="size-3 text-green-500" />
      case "error":
        return <AlertCircleIcon className="size-3 text-red-500" />
      case "idle": { throw new Error('Not implemented yet: "idle" case') }
      case "paused": { throw new Error('Not implemented yet: "paused" case') }
      default:
        return <MessageSquareIcon className="size-3 text-muted-foreground" />
    }
  }, [workflowStatus])

  const statusText = useMemo(() => {
    switch (workflowStatus) {
      case "running":
        return "Processing..."
      case "completed":
        return "Complete"
      case "error":
        return "Error"
      case "paused":
        return "Paused"
      case "idle": { throw new Error('Not implemented yet: "idle" case') }
      default:
        return "Output"
    }
  }, [workflowStatus])

  return (
    <Panel position="bottom-right" className="w-96 max-h-80 p-0">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className="text-xs font-medium">{statusText}</span>
        </div>
        {workflowConfig && (
          <span className="text-xs text-muted-foreground">{workflowConfig.name}</span>
        )}
      </div>
      <ScrollArea className="h-60 p-3">
        {streamingOutput ? (
          <div className="space-y-2">
            <p className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {streamingOutput}
            </p>
            {workflowStatus === "running" && (
              <span className="inline-block w-2 h-4 bg-primary animate-pulse" />
            )}
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-3">
            {messages.map((msg, i) => {
              const textPart = msg.parts?.find((p) => p.type === "text")
              const content = textPart?.text ?? ""
              if (!content) {return null}

              return (
                <div
                  key={msg.id || i}
                  className={`text-xs p-2 rounded-md ${
                    msg.role === "user"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="font-semibold text-[10px] uppercase tracking-wider block mb-1">
                    {msg.role === "user" ? "Input" : "Response"}
                  </span>
                  <p className="whitespace-pre-wrap">{content}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Enter an input and run the workflow to see results...
          </p>
        )}
      </ScrollArea>
    </Panel>
  )
}
