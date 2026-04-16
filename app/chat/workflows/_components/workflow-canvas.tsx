'use client'

import { Canvas } from '@/src/components/ai-elements/canvas'
import { Connection } from '@/src/components/ai-elements/connection'
import { Controls } from '@/src/components/ai-elements/controls'
import { Edge } from '@/src/components/ai-elements/edge'
import { useWorkflowContext } from '@/app/chat/providers/workflow-context'
import { workflowNodeTypes } from './workflow-node'
import { WorkflowInfoPanel } from './workflow-info-panel'
import { WorkflowLegend } from './workflow-legend'
import { WorkflowActions } from './workflow-actions'
import { WorkflowOutput } from './workflow-output'
import { WorkflowInputPanel } from './workflow-input-panel'
import { WorkflowProgressPanel } from './workflow-progress-panel'
import { WorkflowSuspendDialog } from './workflow-suspend-dialog'
import { WorkflowIcon } from 'lucide-react'
import { MiniMap, Panel, Background, BackgroundVariant } from '@xyflow/react'
import type { ReactNode } from 'react'

const edgeTypes = {
    animated: Edge.Animated,
    temporary: Edge.Temporary,
}

interface WorkflowCanvasProps {
    children?: ReactNode
}

export function WorkflowCanvas({ children }: WorkflowCanvasProps) {
    const { nodes, edges, workflowConfig, onNodesChange, onEdgesChange } =
        useWorkflowContext()

    return (
        <div className="chat-canvas-surface relative flex-1 overflow-hidden noise">
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
                    type: 'animated',
                    animated: true,
                }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="oklch(var(--primary) / 0.1)"
                />
                <Controls
                    showInteractive={false}
                    className="chat-panel !rounded-2xl"
                />
                <MiniMap
                    zoomable
                    pannable
                    className="!bottom-4 !right-4 !overflow-hidden !rounded-2xl !border-border/60 !bg-background/92 shadow-xl"
                    nodeStrokeWidth={3}
                    maskColor="oklch(var(--background) / 0.6)"
                    nodeColor={(n) => {
                        if (n.data?.status === 'completed') {
                            return 'oklch(0.7 0.15 150)'
                        }
                        if (n.data?.status === 'running') {
                            return 'oklch(0.7 0.2 60)'
                        }
                        if (n.data?.status === 'error') {
                            return 'oklch(0.6 0.2 20)'
                        }
                        return 'oklch(0.7 0 0 / 0.2)'
                    }}
                />
                <Panel
                    position="bottom-left"
                    className="chat-panel-muted rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                >
                    <span className="flex items-center gap-2">
                        <div className="size-1.5 rounded-full bg-primary" />
                        {workflowConfig?.name ?? 'Workflow runtime'}
                    </span>
                </Panel>

                <Panel
                    position="top-left"
                    className="chat-panel mt-16 max-w-xs rounded-2xl p-4"
                >
                    <div className="mb-2 flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                            <WorkflowIcon className="size-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                                Active Runtime
                            </p>
                            <p className="truncate text-xs font-semibold">
                                {workflowConfig?.id}
                            </p>
                        </div>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
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
