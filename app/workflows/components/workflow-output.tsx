"use client"

import { Panel } from "@/src/components/ai-elements/panel"
import { ScrollArea } from "@/ui/scroll-area"
import { useWorkflowContext } from "@/app/workflows/providers/workflow-context"
import { MessageSquareIcon } from "lucide-react"

export function WorkflowOutput() {
  const { streamingOutput, workflowStatus, messages } = useWorkflowContext()

  if (workflowStatus === "idle" && messages.length === 0) {
    return null
  }

  return (
    <Panel position="bottom-right" className="w-80 max-h-64 p-0">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <MessageSquareIcon className="size-4 text-muted-foreground" />
        <span className="text-xs font-medium">Workflow Output</span>
      </div>
      <ScrollArea className="h-48 p-3">
        {streamingOutput ? (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
            {streamingOutput}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Run a workflow to see output...
          </p>
        )}
      </ScrollArea>
    </Panel>
  )
}
