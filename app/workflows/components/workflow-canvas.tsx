"use client"

import { Canvas } from "@/src/components/ai-elements/canvas"
import { Connection } from "@/src/components/ai-elements/connection"
import { Controls } from "@/src/components/ai-elements/controls"
import { Edge } from "@/src/components/ai-elements/edge"
import { useWorkflowContext, type WorkflowProgressEvent } from "@/app/workflows/providers/workflow-context"
import { workflowNodeTypes } from "./workflow-node"
import { WorkflowInfoPanel } from "./workflow-info-panel"
import { WorkflowLegend } from "./workflow-legend"
import { WorkflowActions } from "./workflow-actions"
import { WorkflowOutput } from "./workflow-output"
import { WorkflowInputPanel } from "./workflow-input-panel"
import { WorkflowProgressPanel } from "./workflow-progress-panel"
import { WorkflowSuspendDialog } from "./workflow-suspend-dialog"
import type { ReactNode } from "react"

const edgeTypes = {
  animated: Edge.Animated,
  temporary: Edge.Temporary,
}

interface WorkflowCanvasProps {
  children?: ReactNode
}

export function WorkflowCanvas({ children }: WorkflowCanvasProps) {
  const { nodes, edges } = useWorkflowContext()

  return (
    <div className="flex-1">
      <Canvas
        nodes={nodes}
        edges={edges}
        nodeTypes={workflowNodeTypes}
        edgeTypes={edgeTypes}
        connectionLineComponent={Connection}
        fitView
        fitViewOptions={{ padding: 0.3 }}
      >
        <Controls />
        <WorkflowProgressPanel />
        <WorkflowInfoPanel />
        <WorkflowLegend />
        <WorkflowActions />
        <WorkflowOutput />
        <WorkflowInputPanel />
        <WorkflowSuspendDialog />
        {children}
      </Canvas>
    </div>
  )
}
