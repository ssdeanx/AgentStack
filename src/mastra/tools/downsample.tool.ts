import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { log } from '../config/logger'
import lttb from 'downsample-lttb'
import { SpanType } from '@mastra/core/observability'
import type { TracingContext } from '@mastra/core/observability'

export const downsampleTool = createTool({
    id: 'downsample',
    description:
        'Downsample numeric series using LTTB (Largest Triangle Three Buckets)',
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
    execute: async (input, context) => {
        const writer = context?.writer
        const tracingContext: TracingContext | undefined =
            context?.tracingContext

        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'downsample',
            input,
            metadata: {
                'tool.id': 'downsample',
                'tool.input.valuesCount': input.values.length,
                'tool.input.target': input.target,
                'tool.input.algorithm': input.algorithm,
            },
            requestContext: context?.requestContext,
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Input: target=${input.target} - 📉 Starting downsampling`,
                stage: 'downsample',
            },
            id: 'downsample',
        })

        const { values, target, algorithm } = input
        const originalLength = values.length

        if (target >= originalLength || originalLength <= 2) {
            const result = {
                indices: values.map((_, i) => i),
                values: values.slice(),
                originalLength,
                target,
            }

            span?.update({
                output: result,
                metadata: {
                    'tool.output.success': true,
                    'tool.status': 'skipped',
                },
            })
            span?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Input: target=${input.target} - ✅ No downsampling needed`,
                    stage: 'downsample',
                },
                id: 'downsample',
            })

            // Nothing to do: return full series indices
            return result
        }

        try {
            let result
            if (algorithm === 'lttb') {
                // Build points as [index, value]
                const points: Array<[number, number]> = values.map((v, i) => [
                    i,
                    Number.isFinite(v) ? v : NaN,
                ])
                const decimated: Array<[number, number]> = lttb(points, target)
                const indices = decimated.map((p) =>
                    Math.max(0, Math.min(originalLength - 1, Math.round(p[0])))
                )
                const sampledValues = indices.map((i) => values[i])
                result = {
                    indices,
                    values: sampledValues,
                    originalLength,
                    target,
                }
            } else {
                // Min-max and M4 algorithms
                const bucketSize = Math.max(
                    1,
                    Math.floor(originalLength / target)
                )
                const indices: number[] = []

                for (
                    let start = 0;
                    start < originalLength;
                    start += bucketSize
                ) {
                    const end = Math.min(start + bucketSize, originalLength)
                    if (end - start <= 0) {
                        continue
                    }

                    const firstIdx = start
                    const lastIdx = end - 1

                    // find min and max within segment
                    let minIdx = start
                    let maxIdx = start
                    for (let j = start; j < end; j++) {
                        if (values[j] < values[minIdx]) {
                            minIdx = j
                        }
                        if (values[j] > values[maxIdx]) {
                            maxIdx = j
                        }
                    }

                    if (algorithm === 'min-max') {
                        if (minIdx === maxIdx) {
                            indices.push(minIdx)
                        } else {
                            if (minIdx < maxIdx) {
                                indices.push(minIdx, maxIdx)
                            } else {
                                indices.push(maxIdx, minIdx)
                            }
                        }
                    } else if (algorithm === 'm4') {
                        indices.push(firstIdx, minIdx, maxIdx, lastIdx)
                    }
                }

                // ensure unique and sorted
                const uniqueIndices = Array.from(new Set(indices)).sort(
                    (a, b) => a - b
                )
                const sampledValues = uniqueIndices.map((i) => values[i])
                result = {
                    indices: uniqueIndices,
                    values: sampledValues,
                    originalLength,
                    target,
                }
            }

            span?.update({
                output: result,
                metadata: {
                    'tool.output.success': true,
                    'tool.output.sampledCount': result.values.length,
                },
            })
            span?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Input: target=${input.target} - ✅ Downsampling complete`,
                    stage: 'downsample',
                },
                id: 'downsample',
            })

            return result
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err))
            log.error('downsample tool failed', { error: error.message })

            span?.error({ error, endSpan: true })

            // Fallback: uniform sampling
            const step = Math.max(1, Math.floor(originalLength / target))
            const indices = Array.from(
                { length: Math.min(target, originalLength) },
                (_, i) => Math.min(originalLength - 1, i * step)
            )
            const sampledValues = indices.map((i) => values[i])
            const fallbackResult = {
                indices,
                values: sampledValues,
                originalLength,
                target,
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Input: target=${input.target} - ⚠️ Downsampling failed, used fallback`,
                    stage: 'downsample',
                },
                id: 'downsample',
            })

            return fallbackResult
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Downsample tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Downsample tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Downsample tool received input', {
            toolCallId,
            messageCount: messages.length,
            inputData: {
                valuesCount: input.values.length,
                target: input.target,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Downsample tool completed', {
            toolCallId,
            toolName,
            outputData: { sampledCount: output.values.length },
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export type DownsampleUITool = typeof downsampleTool
