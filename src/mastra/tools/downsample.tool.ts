import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { log } from '../config/logger'
import lttb from 'downsample-lttb'

export const downsampleTool = createTool({
    id: 'downsample',
    description: 'Downsample numeric series using LTTB (Largest Triangle Three Buckets)',
    inputSchema: z.object({
        values: z.array(z.number()).describe('Numeric series to downsample'),
        target: z.number().min(2).describe('Target number of samples'),
        algorithm: z.enum(['lttb', 'min-max', 'm4']).optional().default('lttb'),
    }),
    outputSchema: z.object({
        indices: z.array(z.number()),
        values: z.array(z.number()),
        originalLength: z.number(),
        target: z.number(),
    }),
    execute: async (input) => {
        const { values, target, algorithm } = input
        const originalLength = values.length

        if (target >= originalLength || originalLength <= 2) {
            // Nothing to do: return full series indices
            return {
                indices: values.map((_, i) => i),
                values: values.slice(),
                originalLength,
                target,
            }
        }

        try {
            if (algorithm === 'lttb') {
                // Build points as [index, value]
                const points: Array<[number, number]> = values.map((v, i) => [i, Number.isFinite(v) ? v : NaN])
                const decimated: Array<[number, number]> = lttb(points, target)
                const indices = decimated.map((p) => Math.max(0, Math.min(originalLength - 1, Math.round(p[0]))))
                const sampledValues = indices.map((i) => values[i])
                return { indices, values: sampledValues, originalLength, target }
            }

            // Min-max and M4 algorithms
            const bucketSize = Math.max(1, Math.floor(originalLength / target))
            const indices: number[] = []

            for (let start = 0; start < originalLength; start += bucketSize) {
                const end = Math.min(start + bucketSize, originalLength)
                if (end - start <= 0) { continue }

                const firstIdx = start
                const lastIdx = end - 1

                // find min and max within segment
                let minIdx = start
                let maxIdx = start
                for (let j = start; j < end; j++) {
                    if (values[j] < values[minIdx]) { minIdx = j }
                    if (values[j] > values[maxIdx]) { maxIdx = j }
                }

                if (algorithm === 'min-max') {
                    if (minIdx === maxIdx) {
                        indices.push(minIdx)
                    } else {
                        if (minIdx < maxIdx) {indices.push(minIdx, maxIdx)}
                        else {indices.push(maxIdx, minIdx)}
                    }
                } else if (algorithm === 'm4') {
                    indices.push(firstIdx, minIdx, maxIdx, lastIdx)
                }
            }

            // ensure unique and sorted
            const uniqueIndices = Array.from(new Set(indices)).sort((a, b) => a - b)
            const sampledValues = uniqueIndices.map((i) => values[i])
            return { indices: uniqueIndices, values: sampledValues, originalLength, target }
        } catch (err) {
            log.error('downsample tool failed', { error: err instanceof Error ? err.message : String(err) })
            // Fallback: uniform sampling
            const step = Math.max(1, Math.floor(originalLength / target))
            const indices = Array.from({ length: Math.min(target, originalLength) }, (_, i) => Math.min(originalLength - 1, i * step))
            const sampledValues = indices.map((i) => values[i])
            return { indices, values: sampledValues, originalLength, target }
        }
    },
})

export type DownsampleUITool = typeof downsampleTool
