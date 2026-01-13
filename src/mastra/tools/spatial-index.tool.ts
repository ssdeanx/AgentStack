import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import RBush from 'rbush'
import { log } from '../config/logger'
import { SpanType } from '@mastra/core/observability'
import type { TracingContext } from '@mastra/core/observability'

// Each indexed item will be stored with a bbox: {minX,minY,maxX,maxY, id, data}
interface IndexedItem {
    minX: number
    minY: number
    maxX: number
    maxY: number
    id: string
    data?: Record<string, unknown>
}

export const spatialIndexTool = createTool({
    id: 'spatial-index',
    description:
        'Create and query RBush spatial index. Returns serialized index JSON for persistence.',
    inputSchema: z.object({
        action: z
            .enum(['build', 'search', 'fromJSON', 'toJSON'])
            .describe('Action to perform'),
        points: z
            .array(
                z.object({
                    id: z.string(),
                    lat: z.number(),
                    lng: z.number(),
                    data: z.record(z.string(), z.unknown()).optional(),
                })
            )
            .optional(),
        bounds: z
            .object({
                southWest: z.tuple([z.number(), z.number()]),
                northEast: z.tuple([z.number(), z.number()]),
            })
            .optional(),
        treeJSON: z.unknown().optional(),
    }),
    // Define a structured item schema for search results
    outputSchema: z.object({
        treeJSON: z.unknown().optional(),
        results: z
            .array(
                z.object({
                    minX: z.number(),
                    minY: z.number(),
                    maxX: z.number(),
                    maxY: z.number(),
                    id: z.string(),
                    data: z.record(z.string(), z.unknown()).optional(),
                })
            )
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (input, context) => {
        const writer = context?.writer
        const tracingContext: TracingContext | undefined =
            context?.tracingContext

        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'spatial-index',
            input,
            metadata: {
                'tool.id': 'spatial-index',
                'tool.input.action': input.action,
            },
            requestContext: context?.requestContext,
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Input: action="${input.action}" - 🗺️ Starting spatial index operation`,
                stage: 'spatial-index',
            },
            id: 'spatial-index',
        })

        const { action, points, bounds, treeJSON } = input

        try {
            let result
            if (action === 'build') {
                if (!points || points.length === 0) {
                    throw new Error(
                        'No points provided to build the spatial index'
                    )
                }

                const tree = new RBush<IndexedItem>()
                const items = points.map((p) => ({
                    minX: p.lng,
                    minY: p.lat,
                    maxX: p.lng,
                    maxY: p.lat,
                    id: p.id,
                    data: p.data,
                }))
                tree.load(items)
                const json = tree.toJSON()
                result = { treeJSON: json }
            } else if (action === 'fromJSON') {
                if (treeJSON === undefined) {
                    throw new Error('treeJSON is required for fromJSON action')
                }
                const tree = new RBush<IndexedItem>()
                tree.fromJSON(treeJSON)
                result = { message: 'Index loaded' }
            } else if (action === 'search') {
                if (treeJSON === undefined) {
                    throw new Error('treeJSON is required for search action')
                }
                if (bounds === undefined) {
                    throw new Error('bounds is required for search action')
                }
                const tree = new RBush<IndexedItem>()
                tree.fromJSON(treeJSON as unknown)
                const [swLat, swLng] = bounds.southWest
                const [neLat, neLng] = bounds.northEast
                const rawResults = tree.search({
                    minX: swLng,
                    minY: swLat,
                    maxX: neLng,
                    maxY: neLat,
                })
                const results = rawResults.map((r: IndexedItem) => ({
                    minX: Number(r.minX),
                    minY: Number(r.minY),
                    maxX: Number(r.maxX),
                    maxY: Number(r.maxY),
                    id: String(r.id),
                    data: r.data,
                }))
                result = { results }
            } else {
                result = { message: 'No-op' }
            }

            span?.update({
                output: result,
                metadata: {
                    'tool.output.success': true,
                },
            })
            span?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Input: action="${input.action}" - ✅ Spatial index operation complete`,
                    stage: 'spatial-index',
                },
                id: 'spatial-index',
            })

            return result
        } catch (error) {
            const err =
                error instanceof Error ? error : new Error(String(error))
            span?.error({ error: err, endSpan: true })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Input: action="${input.action}" - ❌ Spatial index operation failed: ${err.message}`,
                    stage: 'spatial-index',
                },
                id: 'spatial-index',
            })

            throw err
        }
    },
})

export type SpatialIndexUITool = typeof spatialIndexTool
