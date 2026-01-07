"use client"

import { Canvas } from "@/src/components/ai-elements/canvas"
import { Connection } from "@/src/components/ai-elements/connection"
import { Controls } from "@/src/components/ai-elements/controls"
import { Edge } from "@/src/components/ai-elements/edge"
import { useWorkflowContext } from "@/app/workflows/providers/workflow-context"
import { workflowNodeTypes } from "./workflow-node"
import { WorkflowInfoPanel } from "./workflow-info-panel"
import { WorkflowLegend } from "./workflow-legend"
import { WorkflowActions } from "./workflow-actions"
import { WorkflowOutput } from "./workflow-output"
import { WorkflowInputPanel } from "./workflow-input-panel"
import { WorkflowProgressPanel } from "./workflow-progress-panel"
import { WorkflowSuspendDialog } from "./workflow-suspend-dialog"
import { MiniMap, Panel, Background, BackgroundVariant } from "@xyflow/react"
import type { ReactNode } from "react"

const edgeTypes = {
  animated: Edge.Animated,
  temporary: Edge.Temporary,
}

interface WorkflowCanvasProps {
  children?: ReactNode
}

export function WorkflowCanvas({ children }: WorkflowCanvasProps) {
  const {
    nodes,
    edges,
    workflowConfig,
    onNodesChange,
    onEdgesChange
  } = useWorkflowContext()

  return (
    <div className="flex-1 relative noise overflow-hidden mesh-gradient">
      <Canvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={workflowNodeTypes}
        edgeTypes={edgeTypes}
        connectionLineComponent={Connection}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        snapToGrid
        snapGrid={[20, 20]}
        defaultEdgeOptions={{
          type: "animated",
          animated: true,
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="oklch(var(--primary) / 0.1)"
        />
        <Controls showInteractive={false} className="bg-background/80 backdrop-blur-md border-border/50 shadow-xl" />
        <MiniMap
          zoomable
          pannable
          className="!bg-card/60 !backdrop-blur-xl !border-border/30 rounded-2xl shadow-2xl !bottom-4 !right-4 overflow-hidden"
          nodeStrokeWidth={3}
          maskColor="oklch(var(--background) / 0.6)"
          nodeColor={(n) => {
            if (n.data?.status === "completed") {return "oklch(0.7 0.15 150)"}
            if (n.data?.status === "running") {return "oklch(0.7 0.2 60)"}
            if (n.data?.status === "error") {return "oklch(0.6 0.2 20)"}
            return "oklch(0.7 0 0 / 0.2)"
          }}
        />
        <Panel position="bottom-left" className="bg-background/40 backdrop-blur-xl border-border/20 rounded-full px-4 py-1.5 text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] shadow-lg animate-fade-in">
          <span className="flex items-center gap-2">
            <div className="size-1.5 bg-primary rounded-full animate-pulse" />
            {workflowConfig?.name} • CORE ENGINE 2026
          </span>
        </Panel>

        {/* Floating status display */}
        <Panel position="top-left" className="bg-card/30 backdrop-blur-2xl border-border/10 rounded-xl p-3 shadow-2xl mt-16 max-w-xs animate-in slide-in-from-left-4 duration-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <div className="size-4 text-primary">⚙️</div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Active Runtime</p>
              <p className="text-xs font-semibold truncate">{workflowConfig?.id}</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed italic">
            {workflowConfig?.description}
          </p>
        </Panel>

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
