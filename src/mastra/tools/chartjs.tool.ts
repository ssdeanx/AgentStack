import { createTool } from '@mastra/core/tools'
import { SpanType } from '@mastra/core/observability'
import { z } from 'zod'
import { log, logToolExecution } from '../config/logger'
import type { InferUITool } from '@mastra/core/tools'
import { SMA, EMA, RSI, MACD, BollingerBands } from 'technicalindicators'
import { downsampleTool } from './downsample.tool'

export const chartJsTool = createTool({
    id: 'chartjs-generator',
    description:
        'Generates Chart.js configuration with technical indicators for UI visualization',
    inputSchema: z.object({
        data: z
            .array(
                z.object({
                    date: z.string(),
                    close: z.number(),
                    open: z.number().optional(),
                    high: z.number().optional(),
                    low: z.number().optional(),
                    volume: z.number().optional(),
                })
            )
            .describe('Time series data'),
        indicators: z
            .array(
                z.object({
                    type: z.enum([
                        'SMA',
                        'EMA',
                        'RSI',
                        'MACD',
                        'BollingerBands',
                    ]),
                    period: z.number().optional().default(14),
                    color: z.string().optional(),
                    stdDev: z.number().optional(),
                    fastPeriod: z.number().optional(),
                    slowPeriod: z.number().optional(),
                    signalPeriod: z.number().optional(),
                })
            )
            .optional()
            .default([])
            .describe('Indicators to overlay'),
        chartType: z
            .enum(['line', 'bar', 'candlestick'])
            .default('line')
            .describe('Base chart type'),
        title: z.string().optional(),
    }),
    outputSchema: z.object({
        config: z.object({
            type: z.string(),
            data: z.object({
                labels: z.array(z.string()),
                datasets: z.array(z.object({
                    label: z.string().optional(),
                    data: z.array(z.union([z.number(), z.null()])),
                    borderColor: z.string().optional(),
                    backgroundColor: z.string().optional(),
                    type: z.string().optional(),
                    yAxisID: z.string().optional(),
                    order: z.number().optional(),
                    borderWidth: z.number().optional(),
                    pointRadius: z.number().optional(),
                    fill: z.union([z.boolean(), z.string()]).optional(),
                })),
            }),
            options: z.record(z.string(), z.unknown()),
        }),
    }),
    execute: async (input, context) => {
        const { data, indicators, chartType, title } = input

        await context?.writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Generating ${chartType} chart with ${indicators.length} indicators`,
                stage: 'chartjs-generator',
            },
            id: 'chartjs-generator',
        })

        // Tracing: create a TOOL_CALL span for this tool execution
        const tracingContext = context?.tracingContext
        const abortSignal = context?.abortSignal

        if (abortSignal?.aborted === true) {
            throw new Error('Tool call cancelled')
        }

        const toolSpan = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'chartjs-generator',
            input: { dataCount: data.length, indicatorsCount: indicators.length, chartType },
            metadata: {
                'tool.id': 'chartjs-generator',
                'tool.input.dataCount': data.length,
                'tool.input.indicatorsCount': indicators.length,
            },
        })
        const startTime = Date.now()

        // Log tool execution start
        logToolExecution('chartjs-generator', { dataCount: data.length, indicatorsCount: indicators.length })

        const labels = data.map((d) => d.date)
        const closePrices = data.map((d) => d.close)

        interface ChartJsDataset {
            label?: string
            data: Array<number | null>
            borderColor?: string
            backgroundColor?: string
            type?: string
            yAxisID?: string
            order?: number
            borderWidth?: number
            pointRadius?: number
            fill?: boolean | string
        }

        const datasets: ChartJsDataset[] = []

        // Base price dataset
        datasets.push({
            label: 'Price',
            data: closePrices,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            type: 'line',
            yAxisID: 'y',
            order: 1,
        })

        let config: {
            type: string
            data: { labels: string[]; datasets: ChartJsDataset[] }
            options: Record<string, unknown>
        } | undefined

        try {
            // Calculate indicators
            for (const ind of indicators) {
                let indicatorData: number[] = []
                let label = ''
                const color = ind.color ?? '#ff0000'

                try {
                    switch (ind.type) {
                        case 'SMA':
                        indicatorData = SMA.calculate({
                            period: ind.period,
                            values: closePrices,
                        })
                        label = `SMA (${ind.period})`
                        // Pad beginning with nulls to match length
                        indicatorData = Array(
                            closePrices.length - indicatorData.length
                        )
                            .fill(null)
                            .concat(indicatorData)
                        datasets.push({
                            label,
                            data: indicatorData,
                            borderColor: color,
                            borderWidth: 1.5,
                            pointRadius: 0,
                            fill: false,
                            yAxisID: 'y',
                        })
                        break
                    case 'EMA':
                        indicatorData = EMA.calculate({
                            period: ind.period,
                            values: closePrices,
                        })
                        label = `EMA (${ind.period})`
                        indicatorData = Array(
                            closePrices.length - indicatorData.length
                        )
                            .fill(null)
                            .concat(indicatorData)
                        datasets.push({
                            label,
                            data: indicatorData,
                            borderColor: color,
                            borderWidth: 1.5,
                            pointRadius: 0,
                            fill: false,
                            yAxisID: 'y',
                        })
                        break
                    case 'RSI':
                        indicatorData = RSI.calculate({
                            period: ind.period,
                            values: closePrices,
                        })
                        label = `RSI (${ind.period})`
                        indicatorData = Array(
                            closePrices.length - indicatorData.length
                        )
                            .fill(null)
                            .concat(indicatorData)
                        datasets.push({
                            label,
                            data: indicatorData,
                            borderColor: color,
                            borderWidth: 1.5,
                            pointRadius: 0,
                            fill: false,
                            yAxisID: 'y1', // Separate axis
                            type: 'line',
                        })
                        break
                    case 'MACD': {
                        const macdResult = MACD.calculate({
                            fastPeriod: ind.fastPeriod ?? 12,
                            slowPeriod: ind.slowPeriod ?? 26,
                            signalPeriod: ind.signalPeriod ?? 9,
                            values: closePrices,
                            SimpleMAOscillator: false,
                            SimpleMASignal: false
                        })
                        const macd = macdResult.map((m) => m.MACD)
                        const signal = macdResult.map((m) => m.signal)
                        const histogram = macdResult.map((m) => m.histogram)
                        const padding = Array(
                            closePrices.length - macd.length
                        ).fill(null)

                        datasets.push({
                            label: 'MACD',
                            data: padding.concat(macd),
                            borderColor: color,
                            borderWidth: 1.5,
                            pointRadius: 0,
                            fill: false,
                            yAxisID: 'y1',
                        })
                        datasets.push({
                            label: 'MACD Signal',
                            data: padding.concat(signal),
                            borderColor: '#00ff00',
                            borderWidth: 1.5,
                            pointRadius: 0,
                            fill: false,
                            yAxisID: 'y1',
                        })
                        datasets.push({
                            label: 'MACD Histogram',
                            data: padding.concat(histogram),
                            backgroundColor: color,
                            type: 'bar',
                            yAxisID: 'y1',
                        })
                        break;
                    }
                    case 'BollingerBands': {
                        const bb = BollingerBands.calculate({
                            period: ind.period,
                            stdDev: ind.stdDev ?? 2,
                            values: closePrices,
                        })
                        const upper = bb.map((b) => b.upper)
                        const middle = bb.map((b) => b.middle)
                        const lower = bb.map((b) => b.lower)
                        const padding = Array(
                            closePrices.length - bb.length
                        ).fill(null)

                        datasets.push({
                            label: 'BB Upper',
                            data: padding.concat(upper),
                            borderColor: 'rgba(200, 200, 200, 0.5)',
                            borderWidth: 1,
                            pointRadius: 0,
                            fill: false,
                            yAxisID: 'y',
                        })
                        datasets.push({
                            label: 'BB Middle',
                            data: padding.concat(middle),
                            borderColor: color,
                            borderWidth: 1,
                            pointRadius: 0,
                            fill: false,
                            yAxisID: 'y',
                        })
                        datasets.push({
                            label: 'BB Lower',
                            data: padding.concat(lower),
                            borderColor: 'rgba(200, 200, 200, 0.5)',
                            borderWidth: 1,
                            pointRadius: 0,
                            fill: '-1', // Fill to upper
                            backgroundColor: 'rgba(200, 200, 200, 0.1)',
                            yAxisID: 'y',
                        })
                    }
                        break
                }
            } catch (e) {
                log.warn(`Failed to calculate ${ind.type}`, { error: e })
            }
        }

        // Decimation: downsample for visualization when the series is very large
        // Uses LTTB (Largest Triangle Three Buckets) to pick representative indices
        const DECIMATE_THRESHOLD = 5000
        const DECIMATED_POINTS = 2000

        // Final labels/datasets (fall back to full if decimation fails or is not needed)
        let finalLabels = labels
        let finalDatasets = datasets

        if (labels.length > DECIMATE_THRESHOLD) {
            try {
                // Use price series (first dataset) indices to decimate all datasets consistently
                const baseSeries = datasets[0]?.data ?? closePrices
                const baseSeriesArr = Array.isArray(baseSeries) ? (baseSeries as Array<number | null | undefined>) : closePrices
                const valuesForDownsample = baseSeriesArr.map((v) => (v === null || v === undefined ? NaN : Number(v)))

                // Use downsample tool (server-side) to decimate according to algorithm
                const dec = (await downsampleTool.execute({ values: valuesForDownsample, target: DECIMATED_POINTS, algorithm: 'lttb' })) as { indices: number[]; values: number[]; originalLength: number; target: number }
                const indices: number[] = dec.indices

                // Build new labels and datasets sampled at the chosen indices
                finalLabels = indices.map((i) => labels[i])
                finalDatasets = datasets.map((ds) => {
                    const dsData = (ds as { data?: unknown }).data
                    const dsArr = Array.isArray(dsData) ? (dsData as unknown[]) : []
                    return {
                        ...ds,
                        data: indices.map((idx) => {
                            const v = dsArr[idx]
                            return typeof v === 'number' ? v : null
                        }),
                    }
                })
            } catch (e) {
                log.warn('Decimation failed, continuing with full dataset', { error: e })
            }
        }

        config = {
            type: chartType, // Base type from request
            data: {
                labels: finalLabels,
                datasets: finalDatasets,
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: typeof title === 'string' && title.trim().length > 0,
                        text: title,
                    },
                    tooltip: {
                        enabled: true,
                    },
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Price' },
                    },
                    // Only show y1 if RSI is used
                    y1: indicators.some((i) => i.type === 'RSI')
                        ? {
                              type: 'linear',
                              display: true,
                              position: 'right',
                              title: { display: true, text: 'Oscillators' },
                              min: 0,
                              max: 100,
                              grid: {
                                  drawOnChartArea: false,
                              },
                          }
                        : undefined,
                },
            },
        }

        // Update trace span with duration and end
        const duration = Date.now() - startTime
        toolSpan?.update({
            output: { config },
            metadata: {
                'tool.output.labels': finalLabels.length,
                'tool.output.datasetCount': finalDatasets.length,
                'tool.duration_ms': duration,
            },
        })
        toolSpan?.end()

        // Log tool execution success
        logToolExecution('chartjs-generator', { dataCount: data.length, indicatorsCount: indicators.length }, { labels: finalLabels.length, datasetCount: finalDatasets.length, durationMs: duration })

        } catch (e: unknown) {
            // Cast unknown to Error when reporting to span
            const err = e instanceof Error ? e : new Error(String(e))
            toolSpan?.error({ error: err, endSpan: true })
            // Log error to central logger
            log.error('chartjs-generator failed', { error: err.message })
            // Log tool execution failure
            logToolExecution('chartjs-generator', { dataCount: data.length, indicatorsCount: indicators.length }, { success: false, error: err.message })
            throw e
        }

        await context?.writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `Chart configuration generated`,
                stage: 'chartjs-generator',
            },
            id: 'chartjs-generator',
        })

        return { config }
    },
    onInputStart: ({ toolCallId, messages }: { toolCallId: string; messages: unknown[] }) => {
        log.info('Chart.js generator tool input streaming started', {
            toolCallId,
            messages: Array.isArray(messages) ? messages.length : 0,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages }: { inputTextDelta: string; toolCallId: string; messages: unknown[] }) => {
        log.info('Chart.js generator tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messages: Array.isArray(messages) ? messages.length : 0,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages }: { input: unknown; toolCallId: string; messages: unknown[] }) => {
        log.info('Chart.js generator tool received input', {
            toolCallId,
            inputData: input,
            messages: Array.isArray(messages) ? messages.length : 0,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName }: { output: unknown; toolCallId: string; toolName: string }) => {
        log.info('Chart.js generator tool completed', {
            toolCallId,
            toolName,
            output,
            hook: 'onOutput',
        })
    },
})

export type ChartJsUITool = InferUITool<typeof chartJsTool>

