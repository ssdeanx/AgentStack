"use client"

import { Panel } from "@/src/components/ai-elements/panel"
import { Button } from "@/ui/button"
import { useWorkflowContext } from "@/app/workflows/providers/workflow-context"
import { DownloadIcon, CodeIcon, ExternalLinkIcon } from "lucide-react"
import { useCallback } from "react"
import { useReactFlow } from "@xyflow/react"

export function WorkflowActions() {
  const { workflowConfig } = useWorkflowContext()

  let reactFlowInstance: ReturnType<typeof useReactFlow> | null = null
  try {
    reactFlowInstance = useReactFlow()
  } catch {
    // Not inside ReactFlow context yet
  }

  const handleExportSvg = useCallback(() => {
    if (!workflowConfig) {return}
    // Use React Flow's built-in export if available
    console.log("Export SVG for:", workflowConfig.id)
    // TODO: Implement actual SVG export
  }, [workflowConfig])

  const handleViewCode = useCallback(() => {
    if (!workflowConfig) {return}
    // Open workflow source code
    const workflowPath = `/src/mastra/workflows/${workflowConfig.id.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')}.ts`
    window.open(`vscode://file${workflowPath}`, '_blank')
  }, [workflowConfig])

  const handleFitView = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.3, duration: 300 })
  }, [reactFlowInstance])

  return (
    <Panel position="top-right" className="p-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleFitView}
          className="h-8"
          title="Fit to view"
        >
          <ExternalLinkIcon className="size-3 mr-1" />
          Fit View
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportSvg}
          className="h-8"
          title="Export as SVG"
        >
          <DownloadIcon className="size-3 mr-1" />
          Export
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleViewCode}
          className="h-8"
          title="View workflow source code"
        >
          <CodeIcon className="size-3 mr-1" />
          Code
        </Button>
      </div>
    </Panel>
  )
}
