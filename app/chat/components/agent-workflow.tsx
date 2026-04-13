'use client'

import { memo, type ReactNode } from 'react'
import {
    Canvas,
} from '@/src/components/ai-elements/canvas'
import {
    Node,
    NodeHeader,
    NodeTitle,
    NodeDescription,
    NodeContent,
} from '@/src/components/ai-elements/node'
import {
    Edge,
} from '@/src/components/ai-elements/edge'
import { Panel } from '@/src/components/ai-elements/panel'
import type {
    Node as RFNode,
    Edge as RFEdge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    PanelPosition,
} from '@xyflow/react'
import { Badge } from '@/ui/badge'
import { cn } from '@/lib/utils'

// Export types for use in parent components
export interface WorkflowNodeData extends Record<string, unknown> {
    label: string
    description?: string
    status?: 'pending' | 'running' | 'completed' | 'error'
    type?: string
}

export type WorkflowNode = RFNode<WorkflowNodeData>
export type WorkflowEdge = RFEdge

interface AgentWorkflowProps {
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
    onNodesChange?: OnNodesChange
    onEdgesChange?: OnEdgesChange
    onConnect?: OnConnect
    title?: string
    className?: string
    showPanel?: boolean
    panelContent?: ReactNode
}

const nodeTypes = {
    custom: ({ data }: { data: WorkflowNodeData }) => (
        <Node handles={{ target: true, source: true }}>
            <NodeHeader>
                <div className="flex items-center justify-between">
                    <NodeTitle className="text-sm font-semibold truncate">
                        {data.label}
                    </NodeTitle>
                    {data.status && (
                        <Badge
                            variant={
                                data.status === 'completed' ? 'default' :
                                data.status === 'error' ? 'destructive' :
                                'secondary'
                            }
                            className="text-[10px] h-4 px-1"
                        >
                            {data.status}
                        </Badge>
                    )}
                </div>
                {(Boolean(data.type)) && (
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {data.type}
                    </div>
                )}
            </NodeHeader>
            {(Boolean(data.description)) && (
                <NodeContent className="p-2 pt-1">
                    <NodeDescription className="text-xs line-clamp-2">
                        {data.description}
                    </NodeDescription>
                </NodeContent>
            )}
        </Node>
    )
}

const edgeTypes = {
    animated: Edge.Animated,
    temporary: Edge.Temporary,
}

export const AgentWorkflow = memo(({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    title,
    className,
    showPanel = false,
    panelContent,
}: AgentWorkflowProps) => {
    return (
        <div className={cn('relative h-100 w-full border rounded-lg overflow-hidden bg-background', className)}>
            {(Boolean(title)) && (
                <div className="absolute top-3 left-3 z-10 bg-background/80 backdrop-blur-sm border px-3 py-1.5 rounded-md shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground">
                        {title}
                    </span >
                </div>
            )}

            <Canvas
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
            >
                {showPanel && panelContent && (
                    <Panel position={'top-right' as PanelPosition}>
                        {panelContent}
                    </Panel>
                )}
            </Canvas>
        </div>
    )
})

AgentWorkflow.displayName = 'AgentWorkflow'

export default AgentWorkflow
