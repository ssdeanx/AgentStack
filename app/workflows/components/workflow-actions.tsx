"use client"

import { Panel } from "@/src/components/ai-elements/panel"
import { Button } from "@/ui/button"
import { useWorkflowContext } from "@/app/workflows/providers/workflow-context"
import { DownloadIcon, CodeIcon } from "lucide-react"

export function WorkflowActions() {
  const { workflowConfig } = useWorkflowContext()

  const handleExportSvg = () => {
    // TODO: Implement SVG export using React Flow's toSvg method
    console.log("Export SVG for:", workflowConfig?.id)
  }

  const handleViewCode = () => {
    // TODO: Open code modal or navigate to code view
    console.log("View code for:", workflowConfig?.id)
  }

  return (
    <Panel position="top-right" className="p-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportSvg}
          className="h-8"
        >
          <DownloadIcon className="size-3 mr-1" />
          Export SVG
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleViewCode}
          className="h-8"
        >
          <CodeIcon className="size-3 mr-1" />
          View Code
        </Button>
      </div>
    </Panel>
  )
}
