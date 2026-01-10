import type { RequestContext } from '@mastra/core/request-context'
import type { InferUITool } from '@mastra/core/tools';
import { createTool } from '@mastra/core/tools'
import { SpanType } from '@mastra/core/observability'
import { z } from 'zod'
import { log, logToolExecution } from '../config/logger'

export interface CytoscapeContext extends RequestContext {
    userId?: string
    workspaceId?: string
}

export const cytoscapeTool = createTool({
    id: 'cytoscape-generator',
    description: 'Generates Cytoscape.js compatible graph data structures',
    inputSchema: z.object({
        nodes: z
            .array(
                z.object({
                    id: z.string(),
                    label: z.string().optional(),
                    type: z.string().optional(),
                    data: z.record(z.string(), z.unknown()).optional(),
                    position: z
                        .object({ x: z.number(), y: z.number() })
                        .optional(),
                })
            )
            .describe('Graph nodes'),
        edges: z
            .array(
                z.object({
                    id: z.string().optional(),
                    source: z.string(),
                    target: z.string(),
                    label: z.string().optional(),
                    type: z.string().optional(),
                    data: z.record(z.string(), z.unknown()).optional(),
                })
            )
            .describe('Graph edges'),
        layout: z
            .enum(['grid', 'circle', 'concentric', 'breadthfirst', 'cose'])
            .default('cose')
            .optional(),
    }),
    outputSchema: z.object({
        elements: z.array(
            z.object({
                group: z.enum(['nodes', 'edges']),
                data: z.record(z.string(), z.unknown()),
                position: z.object({ x: z.number(), y: z.number() }).optional(),
                classes: z.array(z.string()).optional(),
            })
        ),
        layout: z.object({
            name: z.string(),
            animate: z.boolean().optional(),
        }),
    }),
    execute: async (input, context) => {
        const { nodes, edges, layout } = input
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext = context?.tracingContext
        const requestCtx = context?.requestContext as
            | CytoscapeContext
            | undefined

        const userId = requestCtx?.userId
        const workspaceId = requestCtx?.workspaceId

        if (abortSignal?.aborted ?? false) {
            throw new Error('Tool call cancelled')
        }

        const toolSpan = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'cytoscape-generator',
            input,
            metadata: {
                'tool.id': 'cytoscape-generator',
                'tool.input.nodesCount': nodes.length,
                'tool.input.edgesCount': edges.length,
                'user.id': userId,
                'workspace.id': workspaceId,
            },
        })
        const startTime = Date.now()
        logToolExecution('cytoscape-generator', { nodes: nodes.length, edges: edges.length })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Generating graph with ${nodes.length} nodes and ${edges.length} edges`,
                stage: 'cytoscape-generator',
            },
            id: 'cytoscape-generator',
        })

        // Validate and guard against excessively large graphs
        const MAX_ELEMENTS = 50_000
        if (nodes.length + edges.length > MAX_ELEMENTS) {
            toolSpan?.error({
                error: new Error(
                    `Graph too large: ${nodes.length + edges.length} elements exceeds max ${MAX_ELEMENTS}`
                ),
                endSpan: true,
            })
            throw new Error(
                `Graph too large: ${nodes.length + edges.length} elements exceeds max ${MAX_ELEMENTS}`
            )
        }

        // Ensure unique node ids
        const nodeIds = new Set<string>()
        for (const n of nodes) {
            if (nodeIds.has(n.id)) {
                toolSpan?.error({
                    error: new Error(`Duplicate node id detected: ${n.id}`),
                    endSpan: true,
                })
                throw new Error(`Duplicate node id detected: ${n.id}`)
            }
            nodeIds.add(n.id)
        }

        const elements = [
            ...nodes.map((n) => {
                const labelText =
                    typeof n.label === 'string' && n.label.trim() !== ''
                        ? n.label
                        : n.id
                const nodeClasses =
                    typeof n.type === 'string' && n.type.trim() !== ''
                        ? [n.type]
                        : undefined
                return {
                    group: 'nodes' as const,
                    data: {
                        id: n.id,
                        label: labelText,
                        type: n.type,
                        ...n.data,
                    },
                    position: n.position,
                    classes: nodeClasses,
                }
            }),
            ...edges.map((e, idx) => {
                const edgeClasses =
                    typeof e.type === 'string' && e.type.trim() !== ''
                        ? [e.type]
                        : undefined
                const edgeLabel =
                    typeof e.label === 'string' && e.label.trim() !== ''
                        ? e.label
                        : undefined
                return {
                    group: 'edges' as const,
                    data: {
                        id: e.id ?? `${e.source}-${e.target}-${idx}`,
                        source: e.source,
                        target: e.target,
                        label: edgeLabel,
                        type: e.type ?? undefined,
                        ...e.data,
                    },
                    classes: edgeClasses,
                }
            }),
        ]

        const duration = Date.now() - startTime
        toolSpan?.update({
            output: { elements, layout },
            metadata: {
                'tool.output.elementsCount': elements.length,
                'tool.output.success': true,
                'tool.duration_ms': duration,
            },
        })
        toolSpan?.end()

        // Log success
        logToolExecution('cytoscape-generator', { nodes: nodes.length, edges: edges.length }, { elements: elements.length, durationMs: duration })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `Graph data generation complete`,
                stage: 'cytoscape-generator',
            },
            id: 'cytoscape-generator',
        })

        return {
            elements,
            layout: {
                name: layout ?? 'cose',
                animate: true,
            },
        }
    },
    onInputStart: ({ toolCallId }) => {
        log.info('Cytoscape generator tool input streaming started', {
            toolCallId,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId }) => {
        log.info('Cytoscape generator tool received input chunk', {
            toolCallId,
            inputTextDelta,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId }) => {
        log.info('Cytoscape generator tool received input', {
            toolCallId,
            inputData: input,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ toolCallId, toolName }) => {
        log.info('Cytoscape generator tool completed', {
            toolCallId,
            toolName,
            hook: 'onOutput',
        })
    },
})

export type CytoscapeUITool = InferUITool<typeof cytoscapeTool>

