import { createTool } from '@mastra/core/tools'
import { SpanType } from '@mastra/core/observability'
import type { RequestContext } from '@mastra/core/request-context'
import { z } from 'zod'
import { log, logToolExecution } from '../config/logger'
import type { InferUITool } from '@mastra/core/tools'

export interface LeafletToolContext extends RequestContext {
    userId?: string
    workspaceId?: string
}

export const leafletTool = createTool({
    id: 'leaflet-generator',
    description: 'Generates Leaflet/GeoJSON compatible map data structures',
    inputSchema: z.object({
        points: z
            .array(
                z.object({
                    lat: z.number(),
                    lng: z.number(),
                    title: z.string().optional(),
                    description: z.string().optional(),
                    category: z.string().optional(),
                    properties: z.record(z.string(), z.unknown()).optional(),
                })
            )
            .describe('Map points/markers'),
        bounds: z
            .object({
                southWest: z.tuple([z.number(), z.number()]),
                northEast: z.tuple([z.number(), z.number()]),
            })
            .optional()
            .describe('Optional viewport bounds for server-side clipping'),
        cluster: z.boolean().optional().default(true),
        center: z
            .object({
                lat: z.number(),
                lng: z.number(),
            })
            .optional()
            .describe('Map center point (auto-calculated if omitted)'),
        zoom: z.number().optional().default(13),
    }),
    outputSchema: z.object({
        geoJSON: z.unknown(),
        center: z.object({
            lat: z.number(),
            lng: z.number(),
        }),
        zoom: z.number(),
        markers: z.array(
            z.object({
                position: z.array(z.number()),
                popup: z.string().optional(),
                category: z.string().optional(),
            })
        ),
    }),
    execute: async (input, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext = context?.tracingContext
        const requestCtx = context?.requestContext as
            | LeafletToolContext
            | undefined

        const userId = requestCtx?.userId
        const workspaceId = requestCtx?.workspaceId

        if (abortSignal?.aborted ?? false) {
            throw new Error('Tool call cancelled')
        }

        const toolSpan = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'leaflet-generator',
            input,
            metadata: {
                'tool.id': 'leaflet-generator',
                'tool.input.pointsCount': input.points?.length ?? 0,
                'tool.input.cluster': input.cluster ?? true,
                'user.id': userId,
                'workspace.id': workspaceId,
            },
        })
        const startTime = Date.now()
        logToolExecution('leaflet-generator', { pointsCount: input.points?.length ?? 0, cluster: input.cluster ?? true })

        const { points: rawPoints, bounds, center, zoom } = input

        const MAX_MARKERS = 5000

        // basic validation
        for (const p of rawPoints) {
            if (p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180) {
                throw new Error(
                    `Invalid coordinates for point: lat=${p.lat}, lng=${p.lng}`
                )
            }
        }

        // Clip to bounds if provided
        let points = rawPoints
        if (bounds) {
            const [swLat, swLng] = bounds.southWest
            const [neLat, neLng] = bounds.northEast
            points = points.filter(
                (p) =>
                    p.lat >= swLat &&
                    p.lat <= neLat &&
                    p.lng >= swLng &&
                    p.lng <= neLng
            )
        }

        // If still too many points, sample uniformly
        if (points.length > MAX_MARKERS) {
            const step = Math.ceil(points.length / MAX_MARKERS)
            points = points
                .filter((_, idx) => idx % step === 0)
                .slice(0, MAX_MARKERS)
        }

        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Generating map data for ${points.length} points`,
                    stage: 'leaflet-generator',
                },
                id: 'leaflet-generator',
            })

            // Generate GeoJSON FeatureCollection
            const geoJSON = {
                type: 'FeatureCollection',
                features: points.map((p) => ({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [p.lng, p.lat], // GeoJSON is [lng, lat]
                    },
                    properties: {
                        title: p.title,
                        description: p.description,
                        category: p.category,
                        ...p.properties,
                    },
                })),
            }

            // Calculate center if not provided
            let mapCenter = center
            if (!mapCenter && points.length > 0) {
                const lats = points.map((p) => p.lat)
                const lngs = points.map((p) => p.lng)
                mapCenter = {
                    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
                    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
                }
            }

            mapCenter ??= { lat: 0, lng: 0 }

            const markers = points.map((p) => {
                let popup: string | undefined
                const title = (p.title ?? '').trim()
                if (title.length > 0) {
                    const descText = (p.description ?? '').trim()
                    const desc = descText.length > 0 ? `<br>${descText}` : ''
                    popup = `<b>${title}</b>` + desc
                }

                return {
                    position: [p.lat, p.lng], // Leaflet uses [lat, lng]
                    popup,
                    category: p.category,
                }
            })

            const result = {
                geoJSON,
                center: mapCenter,
                zoom: zoom || 13,
                markers,
            }

            const duration = Date.now() - startTime
            toolSpan?.update({
                output: result,
                metadata: {
                    'tool.output.success': true,
                    'tool.output.pointsCount': points.length,
                    'tool.output.markersCount': markers.length,
                    'tool.duration_ms': duration,
                },
            })
            toolSpan?.end()

            logToolExecution('leaflet-generator', { pointsCount: input.points?.length ?? 0 }, { markers: markers.length, durationMs: duration })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Map data generation complete`,
                    stage: 'leaflet-generator',
                },
                id: 'leaflet-generator',
            })

            return result
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error))
            toolSpan?.error({ error: err, endSpan: true })
            log.error('leaflet-generator failed', { error: err.message })
            logToolExecution('leaflet-generator', { pointsCount: input.points?.length ?? 0 }, { success: false, error: err.message })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Map data generation error: ${error instanceof Error ? error.message : String(error)}`,
                    stage: 'leaflet-generator',
                },
                id: 'leaflet-generator',
            })

            throw error
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Leaflet generator tool input streaming started', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Leaflet generator tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages?.length ?? 0,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Leaflet generator tool received input', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            inputData: {
                pointsCount: input.points?.length ?? 0,
                cluster: input.cluster,
                zoom: input.zoom,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Leaflet generator tool completed', {
            toolCallId,
            toolName,
            outputData: {
                markersCount: output.markers?.length ?? 0,
                zoom: output.zoom,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export type LeafletUITool = InferUITool<typeof leafletTool>

