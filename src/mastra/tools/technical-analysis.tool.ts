import { createTool } from '@mastra/core/tools'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import type { TracingContext } from '@mastra/core/observability'
import { z } from 'zod'
import { log, logToolExecution } from '../config/logger'
import type { RequestContext } from '@mastra/core/request-context'
import type { InferUITool } from '@mastra/core/tools'
import * as ss from 'simple-statistics'
import {
    SMA,
    EMA,
    WMA,
    RSI,
    MACD,
    BollingerBands,
    ATR,
    ADL,
    ADX,
    OBV,
    Stochastic,
    TRIX,
    ForceIndex,
    ROC,
    WilliamsR,
    MFI,
    KST,
    VWAP,
    doji,
    abandonedbaby,
    darkcloudcover,
    bearishharami,
    bearishharamicross,
    bearishmarubozu,
    bearishspinningtop,
    bullishharami,
    bullishharamicross,
    bullishmarubozu,
    bullishspinningtop,
    downsidetasukigap,
    dragonflydoji,
    eveningdojistar,
    eveningstar,
    gravestonedoji,
    hangingman,
    morningdojistar,
    morningstar,
    piercingline,
    threeblackcrows,
    threewhitesoldiers,
    IchimokuCloud,
    heikinashi,
} from 'technicalindicators'

export interface TechnicalAnalysisContext extends RequestContext {
    userId?: string
    workspaceId?: string
}

export type TrendAnalysisUITool = InferUITool<typeof trendAnalysisTool>

// Define types for pivot points
interface StandardPivot {
    pp: number
    r1: number
    s1: number
    r2: number
    s2: number
    r3: number
    s3: number
}

interface WoodiePivot {
    pp: number
    r1: number
    s1: number
    r2: number
    s2: number
}

interface CamarillaPivot {
    pp: number
    r1: number
    s1: number
    r2: number
    s2: number
    r3: number
    s3: number
    r4: number
    s4: number
}

interface FibonacciPivot {
    pp: number
    r1: number
    s1: number
    r2: number
    s2: number
    r3: number
    s3: number
}

interface IchimokuCloudOutput {
    tenkanSen: number
    kijunSen: number
    senkouSpanA: number
    senkouSpanB: number
    chikouSpan: number
}

interface MACDOutput {
    MACD: number
    histogram: number
    signal: number
}

interface KSTOutput {
    kst: number
    signal: number
}

interface BollingerBandsOutput {
    upper: number
    middle: number
    lower: number
}

interface HeikinAshiOutput {
    open: number
    high: number
    low: number
    close: number
}

type HookSummary = Record<string, string | number | boolean | undefined>

interface IchimokuCloudResult {
    success: boolean
    results: IchimokuCloudOutput[]
    message?: string
}

interface TrendAnalysisResult {
    success: boolean
    sma?: number[]
    ema?: number[]
    wma?: number[]
    macd?: MACDOutput[]
    adx?: number[]
    trix?: number[]
    kst?: KSTOutput[]
    message?: string
}

interface MomentumAnalysisResult {
    success: boolean
    rsi?: number[]
    stochastic?: Array<{ k: number; d: number }>
    williamsR?: number[]
    roc?: number[]
    forceIndex?: number[]
    message?: string
}

interface VolatilityAnalysisResult {
    success: boolean
    bollinger?: BollingerBandsOutput[]
    atr?: number[]
    message?: string
}

interface VolumeAnalysisResult {
    success: boolean
    obv?: number[]
    adl?: number[]
    mfi?: number[]
    vwap?: number[]
    message?: string
}

interface StatisticalSummary {
    mean: number
    median: number
    mode: number
    standardDeviation: number
    variance: number
    min: number
    max: number
    skewness: number
    kurtosis: number
}

type TechnicalAnalysisStats = Pick<
    StatisticalSummary,
    | 'mean'
    | 'median'
    | 'mode'
    | 'standardDeviation'
    | 'variance'
    | 'min'
    | 'max'
>

interface StatisticalAnalysisResult {
    success: boolean
    stats?: StatisticalSummary
    regression?: {
        m: number
        b: number
    }
    correlation?: number
    message?: string
}

type MarketSentiment =
    | 'Strong Buy'
    | 'Buy'
    | 'Neutral'
    | 'Sell'
    | 'Strong Sell'

interface MarketSummaryResult {
    success: boolean
    sentiment: MarketSentiment
    score: number
    indicators: Record<string, string>
    message?: string
}

type TechnicalAnalysisSeriesMap = Partial<{
    sma: number[]
    ema: number[]
    rsi: number[]
    wma: number[]
    macd: MACDOutput[]
    bollinger: BollingerBandsOutput[]
    atr: number[]
    stochastic: Array<{ k: number; d: number }>
}>

interface TechnicalAnalysisResult {
    success: boolean
    results: TechnicalAnalysisSeriesMap
    stats?: TechnicalAnalysisStats
    message?: string
}

function getHookMessageCount(messages: ReadonlyArray<unknown> | undefined): number {
    return messages?.length ?? 0
}

function logToolHookStart(
    label: string,
    toolCallId: string | undefined,
    messages: ReadonlyArray<unknown> | undefined,
    abortSignal: AbortSignal | undefined
): void {
    log.info(`${label} input streaming started`, {
        toolCallId,
        messageCount: getHookMessageCount(messages),
        abortSignal: abortSignal?.aborted ?? false,
        hook: 'onInputStart',
    })
}

function logToolHookDelta(
    label: string,
    toolCallId: string | undefined,
    inputTextDelta: string,
    messages: ReadonlyArray<unknown> | undefined,
    abortSignal: AbortSignal | undefined
): void {
    log.info(`${label} received input chunk`, {
        toolCallId,
        inputTextDelta,
        messageCount: getHookMessageCount(messages),
        abortSignal: abortSignal?.aborted ?? false,
        hook: 'onInputDelta',
    })
}

function logToolHookAvailable(
    label: string,
    toolCallId: string | undefined,
    messages: ReadonlyArray<unknown> | undefined,
    abortSignal: AbortSignal | undefined,
    inputData: HookSummary
): void {
    log.info(`${label} received input`, {
        toolCallId,
        messageCount: getHookMessageCount(messages),
        inputData,
        abortSignal: abortSignal?.aborted ?? false,
        hook: 'onInputAvailable',
    })
}

function logToolHookOutput(
    label: string,
    toolCallId: string | undefined,
    toolName: string | undefined,
    abortSignal: AbortSignal | undefined,
    outputData: HookSummary
): void {
    log.info(`${label} completed`, {
        toolCallId,
        toolName,
        outputData,
        abortSignal: abortSignal?.aborted ?? false,
        hook: 'onOutput',
    })
}

export const ichimokuCloudTool = createTool({
    id: 'ichimoku-cloud',
    description: 'Calculate Ichimoku Cloud (Kinko Hyo) components.',
    inputSchema: z.object({
        high: z.array(z.number()),
        low: z.array(z.number()),
        close: z.array(z.number()),
        conversionPeriod: z.number().optional().default(9),
        basePeriod: z.number().optional().default(26),
        spanPeriod: z.number().optional().default(52),
        displacement: z.number().optional().default(26),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        results: z
            .array(
                z.object({
                    tenkanSen: z.number(),
                    kijunSen: z.number(),
                    senkouSpanA: z.number(),
                    senkouSpanB: z.number(),
                    chikouSpan: z.number(),
                })
            )
            .optional(),
        message: z.string().optional(),
    }),
    strict: true,
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        logToolHookStart('Ichimoku tool', toolCallId, messages, abortSignal)
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        logToolHookDelta(
            'Ichimoku tool',
            toolCallId,
            inputTextDelta,
            messages,
            abortSignal
        )
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        logToolHookAvailable('Ichimoku tool', toolCallId, messages, abortSignal, {
            highLength: input.high.length,
            lowLength: input.low.length,
            closeLength: input.close.length,
            conversionPeriod: input.conversionPeriod,
            basePeriod: input.basePeriod,
            spanPeriod: input.spanPeriod,
            displacement: input.displacement,
        })
    },
    execute: async (inputData, context): Promise<IchimokuCloudResult> => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined = context?.tracingContext
        const requestCtx = context?.requestContext as
            | TechnicalAnalysisContext
            | undefined

        if (abortSignal?.aborted ?? false) {
            throw new Error('Ichimoku calculation cancelled')
        }

        const userId = requestCtx?.userId
        const workspaceId = requestCtx?.workspaceId
        const conversionPeriod = inputData.conversionPeriod ?? 9
        const basePeriod = inputData.basePeriod ?? 26
        const spanPeriod = inputData.spanPeriod ?? 52
        const displacement = inputData.displacement ?? 26

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Input: conversionPeriod=${conversionPeriod} - ☁️ Calculating Ichimoku Cloud`,
                stage: 'ichimoku-cloud',
            },
            id: 'ichimoku-cloud',
        })

        const toolSpan = getOrCreateSpan({
            tracingContext,
            type: SpanType.TOOL_CALL,
            name: 'ichimoku-cloud',
            input: inputData,
            metadata: {
                'tool.id': 'ichimoku-cloud',
                'user.id': userId,
                'workspace.id': workspaceId,
            },
        })
        const startTime = Date.now()
        logToolExecution('ichimoku-cloud', {
            dataLength: inputData.close?.length ?? 0,
        })

        try {
            const rawResults = IchimokuCloud.calculate({
                high: inputData.high,
                low: inputData.low,
                conversionPeriod,
                basePeriod,
                spanPeriod,
                displacement,
            })

            const startIndex = Math.max(
                0,
                inputData.close.length - rawResults.length
            )
            const results: IchimokuCloudResult['results'] = rawResults.map(
                (result, index) => ({
                    tenkanSen: result.conversion,
                    kijunSen: result.base,
                    senkouSpanA: result.spanA,
                    senkouSpanB: result.spanB,
                    chikouSpan:
                        inputData.close[startIndex + index] ??
                        inputData.close[inputData.close.length - 1] ??
                        result.base,
                })
            )

            const finalResult: IchimokuCloudResult = {
                success: true,
                results,
            }

            const duration = Date.now() - startTime
            toolSpan?.update({
                output: finalResult,
                metadata: {
                    'tool.output.success': true,
                    'tool.duration_ms': duration,
                },
            })
            toolSpan?.end()

            logToolExecution(
                'ichimoku-cloud',
                { dataLength: inputData.close?.length ?? 0 },
                { success: true, durationMs: duration }
            )

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Ichimoku calculation complete`,
                    stage: 'ichimoku-cloud',
                },
                id: 'ichimoku-cloud',
            })

            return finalResult
        } catch (error: unknown) {
            const err =
                error instanceof Error ? error : new Error(String(error))
            toolSpan?.error({ error: err, endSpan: true })
            log.error('ichimoku-cloud failed', { error: err.message })
            logToolExecution(
                'ichimoku-cloud',
                { dataLength: inputData.close?.length ?? 0 },
                { success: false, error: err.message }
            )

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Ichimoku calculation failed: ${err.message}`,
                    stage: 'ichimoku-cloud',
                },
                id: 'ichimoku-cloud',
            })

            return { success: false, results: [], message: err.message }
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        logToolHookOutput('Ichimoku tool', toolCallId, toolName, abortSignal, {
            success: output.success,
        })
    },
})

export const fibonacciTool = createTool({
    id: 'fibonacci-levels',
    description: 'Calculate Fibonacci retracement and extension levels.',
    inputSchema: z.object({
        high: z.number(),
        low: z.number(),
        trend: z.enum(['up', 'down']).optional().default('up'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        levels: z.record(z.string(), z.number()).optional(),
        message: z.string().optional(),
    }),
    strict: true,
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        logToolHookStart('Fibonacci tool', toolCallId, messages, abortSignal)
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        logToolHookDelta(
            'Fibonacci tool',
            toolCallId,
            inputTextDelta,
            messages,
            abortSignal
        )
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        logToolHookAvailable('Fibonacci tool', toolCallId, messages, abortSignal, {
            high: input.high,
            low: input.low,
            trend: input.trend,
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined = context?.tracingContext
        const requestCtx = context?.requestContext as
            | TechnicalAnalysisContext
            | undefined

        if (abortSignal?.aborted ?? false) {
            throw new Error('Fibonacci calculation cancelled')
        }

        const userId = requestCtx?.userId
        const workspaceId = requestCtx?.workspaceId

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Input: trend=${inputData.trend} - 📏 Calculating Fibonacci levels`,
                stage: 'fibonacci-levels',
            },
            id: 'fibonacci-levels',
        })

        const toolSpan = getOrCreateSpan({
            tracingContext,
            type: SpanType.TOOL_CALL,
            name: 'fibonacci-levels',
            input: inputData,
            metadata: {
                'tool.id': 'fibonacci-levels',
                'user.id': userId,
                'workspace.id': workspaceId,
            },
        })
        const startTime = Date.now()
        logToolExecution('fibonacci-levels', {
            high: inputData.high,
            low: inputData.low,
        })

        try {
            const diff = inputData.high - inputData.low
            const levels: Record<string, number> = {}
            const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618]

            ratios.forEach((ratio) => {
                if (inputData.trend === 'up') {
                    levels[ratio.toString()] = inputData.high - diff * ratio
                } else {
                    levels[ratio.toString()] = inputData.low + diff * ratio
                }
            })

            const finalResult = { success: true, levels }

            const duration = Date.now() - startTime
            toolSpan?.update({
                output: finalResult,
                metadata: {
                    'tool.output.success': true,
                    'tool.duration_ms': duration,
                },
            })
            toolSpan?.end()
            logToolExecution(
                'fibonacci-levels',
                { high: inputData.high, low: inputData.low },
                { success: true, durationMs: duration }
            )

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Fibonacci levels complete`,
                    stage: 'fibonacci-levels',
                },
                id: 'fibonacci-levels',
            })

            return finalResult
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            toolSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Fibonacci levels failed: ${errorMessage}`,
                    stage: 'fibonacci-levels',
                },
                id: 'fibonacci-levels',
            })
            return { success: false, message: errorMessage }
        }
    },
    onOutput: ({ toolCallId, toolName, abortSignal }) => {
        logToolHookOutput('Fibonacci tool', toolCallId, toolName, abortSignal, {
            success: true,
        })
    },
})

export const pivotPointsTool = createTool({
    id: 'pivot-points',
    description:
        'Calculate Standard, Woodie, Camarilla, and Fibonacci pivot points.',
    inputSchema: z.object({
        high: z.number(),
        low: z.number(),
        close: z.number(),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        standard: z
            .object({
                pp: z.number(),
                r1: z.number(),
                s1: z.number(),
                r2: z.number(),
                s2: z.number(),
                r3: z.number(),
                s3: z.number(),
            })
            .optional(),
        woodie: z
            .object({
                pp: z.number(),
                r1: z.number(),
                s1: z.number(),
                r2: z.number(),
                s2: z.number(),
            })
            .optional(),
        camarilla: z
            .object({
                pp: z.number(),
                r1: z.number(),
                s1: z.number(),
                r2: z.number(),
                s2: z.number(),
                r3: z.number(),
                s3: z.number(),
                r4: z.number(),
                s4: z.number(),
            })
            .optional(),
        fibonacci: z
            .object({
                pp: z.number(),
                r1: z.number(),
                s1: z.number(),
                r2: z.number(),
                s2: z.number(),
                r3: z.number(),
                s3: z.number(),
            })
            .optional(),
        message: z.string().optional(),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        logToolHookStart('Pivot points tool', toolCallId, messages, abortSignal)
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        logToolHookDelta(
            'Pivot points tool',
            toolCallId,
            inputTextDelta,
            messages,
            abortSignal
        )
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        logToolHookAvailable('Pivot points tool', toolCallId, messages, abortSignal, {
            high: input.high,
            low: input.low,
            close: input.close,
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined = context?.tracingContext
        const requestCtx = context?.requestContext as
            | TechnicalAnalysisContext
            | undefined

        if (abortSignal?.aborted ?? false) {
            throw new Error('Pivot points calculation cancelled')
        }

        const userId = requestCtx?.userId
        const workspaceId = requestCtx?.workspaceId

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Input: high=${inputData.high}, close=${inputData.close} - 📍 Calculating Pivot Points`,
                stage: 'pivot-points',
            },
            id: 'pivot-points',
        })

        const toolSpan = getOrCreateSpan({
            tracingContext,
            type: SpanType.TOOL_CALL,
            name: 'pivot-points',
            input: inputData,
            metadata: {
                'tool.id': 'pivot-points',
                'user.id': userId,
                'workspace.id': workspaceId,
            },
        })

        try {
            const { high, low, close } = inputData
            const pp = (high + low + close) / 3
            const results: {
                success: true
                standard?: StandardPivot
                woodie?: WoodiePivot
                camarilla?: CamarillaPivot
                fibonacci?: FibonacciPivot
                message?: string
            } = { success: true }

            results.standard = {
                pp,
                r1: 2 * pp - low,
                s1: 2 * pp - high,
                r2: pp + (high - low),
                s2: pp - (high - low),
                r3: high + 2 * (pp - low),
                s3: low - 2 * (high - pp),
            }

            const wpp = (high + low + 2 * close) / 4
            results.woodie = {
                pp: wpp,
                r1: 2 * wpp - low,
                s1: 2 * wpp - high,
                r2: wpp + (high - low),
                s2: wpp - (high - low),
            }

            const range = high - low
            results.camarilla = {
                pp: (high + low + close) / 3,
                r1: close + (range * 1.1) / 12,
                s1: close - (range * 1.1) / 12,
                r2: close + (range * 1.1) / 6,
                s2: close - (range * 1.1) / 6,
                r3: close + (range * 1.1) / 4,
                s3: close - (range * 1.1) / 4,
                r4: close + (range * 1.1) / 2,
                s4: close - (range * 1.1) / 2,
            }

            results.fibonacci = {
                pp,
                r1: pp + range * 0.382,
                s1: pp - range * 0.382,
                r2: pp + range * 0.618,
                s2: pp - range * 0.618,
                r3: pp + range * 1.0,
                s3: pp - range * 1.0,
            }

            toolSpan?.update({
                output: results,
                metadata: { 'tool.output.success': true },
            })
            toolSpan?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Pivot points complete`,
                    stage: 'pivot-points',
                },
                id: 'pivot-points',
            })

            return results
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            toolSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Pivot points failed: ${errorMessage}`,
                    stage: 'pivot-points',
                },
                id: 'pivot-points',
            })
            return { success: false, message: errorMessage }
        }
    },
    onOutput: ({ toolCallId, toolName, abortSignal }) => {
        logToolHookOutput('Pivot points tool', toolCallId, toolName, abortSignal, {
            success: true,
        })
    },
})

export const trendAnalysisTool = createTool({
    id: 'trend-analysis',
    description:
        'Analyze market trends using moving averages, MACD, ADX, TRIX, and KST.',
    inputSchema: z.object({
        data: z
            .array(z.number())
            .describe('Closing prices or indicator values'),
        period: z.number().optional().default(14),
        fastPeriod: z.number().optional().default(12),
        slowPeriod: z.number().optional().default(26),
        signalPeriod: z.number().optional().default(9),
        high: z.array(z.number()).optional().describe('High prices for ADX'),
        low: z.array(z.number()).optional().describe('Low prices for ADX'),
        close: z
            .array(z.number())
            .optional()
            .describe('Closing prices for ADX'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        sma: z.array(z.number()).optional(),
        ema: z.array(z.number()).optional(),
        wma: z.array(z.number()).optional(),
        macd: z
            .array(
                z.object({
                    MACD: z.number(),
                    histogram: z.number(),
                    signal: z.number(),
                })
            )
            .optional(),
        adx: z.array(z.number()).optional(),
        trix: z.array(z.number()).optional(),
        kst: z
            .array(z.object({ kst: z.number(), signal: z.number() }))
            .optional(),
        message: z.string().optional(),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        logToolHookStart('Trend analysis', toolCallId, messages, abortSignal)
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        logToolHookDelta(
            'Trend analysis',
            toolCallId,
            inputTextDelta,
            messages,
            abortSignal
        )
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        logToolHookAvailable('Trend analysis', toolCallId, messages, abortSignal, {
            period: input.period,
            dataLength: input.data.length,
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined = context?.tracingContext
        const requestCtx = context?.requestContext as
            | TechnicalAnalysisContext
            | undefined

        if (abortSignal?.aborted ?? false) {
            throw new Error('Trend analysis cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Input: period=${inputData.period} - 📈 Analyzing trends`,
                stage: 'trend-analysis',
            },
            id: 'trend-analysis',
        })

        const toolSpan = getOrCreateSpan({
            tracingContext,
            type: SpanType.TOOL_CALL,
            name: 'trend-analysis',
            input: inputData,
            metadata: {
                'tool.id': 'trend-analysis',
                'user.id': requestCtx?.userId,
            },
        })

        try {
            const {
                data,
                period: rawPeriod,
                fastPeriod: rawFastPeriod,
                slowPeriod: rawSlowPeriod,
                signalPeriod: rawSignalPeriod,
                high,
                low,
                close,
            } = inputData
            const period = rawPeriod ?? 14
            const fastPeriod = rawFastPeriod ?? 12
            const slowPeriod = rawSlowPeriod ?? 26
            const signalPeriod = rawSignalPeriod ?? 9
            const results: TrendAnalysisResult = {
                success: true,
                sma: SMA.calculate({ values: data, period }),
                ema: EMA.calculate({ values: data, period }),
                wma: WMA.calculate({ values: data, period }),
                trix: TRIX.calculate({ values: data, period }),
                kst: KST.calculate({
                    values: data,
                    ROCPer1: 10,
                    ROCPer2: 15,
                    ROCPer3: 20,
                    ROCPer4: 30,
                    SMAROCPer1: 10,
                    SMAROCPer2: 10,
                    SMAROCPer3: 10,
                    SMAROCPer4: 15,
                    signalPeriod: 9,
                }),
                macd: (() => {
                    const macdValues: MACDOutput[] = MACD.calculate({
                        values: data,
                        fastPeriod,
                        slowPeriod,
                        signalPeriod,
                        SimpleMAOscillator: false,
                        SimpleMASignal: false,
                    }).map((entry): MACDOutput => ({
                        MACD: entry.MACD ?? 0,
                        signal: entry.signal ?? 0,
                        histogram: entry.histogram ?? 0,
                    }))

                    return macdValues
                })(),
            }

            if (high && low && close) {
                const adxValues: number[] = ADX.calculate({ high, low, close, period }).map(
                    (entry): number => entry.adx
                )
                results.adx = adxValues
            }

            toolSpan?.update({
                output: results,
                metadata: { 'tool.output.success': true },
            })
            toolSpan?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Trend analysis complete`,
                    stage: 'trend-analysis',
                },
                id: 'trend-analysis',
            })

            return results
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            toolSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Analysis failed: ${errorMessage}`,
                    stage: 'trend-analysis',
                },
                id: 'trend-analysis',
            })
            return { success: false, message: errorMessage }
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        logToolHookOutput('Trend analysis', toolCallId, toolName, abortSignal, {
            success: output.success,
        })
    },
})

export const momentumAnalysisTool = createTool({
    id: 'momentum-analysis',
    description:
        'Analyze market momentum using RSI, Stochastic, Williams %R, ROC, and Force Index.',
    inputSchema: z.object({
        data: z
            .array(z.number())
            .describe('Closing prices or indicator values'),
        period: z.number().optional().default(14),
        signalPeriod: z.number().optional().default(3),
        high: z.array(z.number()).optional(),
        low: z.array(z.number()).optional(),
        close: z.array(z.number()).optional(),
        volume: z.array(z.number()).optional(),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        rsi: z.array(z.number()).optional(),
        stochastic: z
            .array(z.object({ k: z.number(), d: z.number() }))
            .optional(),
        williamsR: z.array(z.number()).optional(),
        roc: z.array(z.number()).optional(),
        forceIndex: z.array(z.number()).optional(),
        message: z.string().optional(),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        logToolHookStart('Momentum analysis', toolCallId, messages, abortSignal)
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        logToolHookDelta(
            'Momentum analysis',
            toolCallId,
            inputTextDelta,
            messages,
            abortSignal
        )
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        logToolHookAvailable('Momentum analysis', toolCallId, messages, abortSignal, {
            period: input.period,
            signalPeriod: input.signalPeriod,
            dataLength: input.data.length,
        })
    },
    execute: async (inputData, context): Promise<MomentumAnalysisResult> => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined = context?.tracingContext
        const requestCtx = context?.requestContext as
            | TechnicalAnalysisContext
            | undefined

        if (abortSignal?.aborted ?? false) {
            throw new Error('Momentum analysis cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Input: period=${inputData.period} - 🚀 Analyzing momentum`,
                stage: 'momentum-analysis',
            },
            id: 'momentum-analysis',
        })

        const toolSpan = getOrCreateSpan({
            tracingContext,
            type: SpanType.TOOL_CALL,
            name: 'momentum-analysis',
            input: inputData,
            metadata: {
                'tool.id': 'momentum-analysis',
                'user.id': requestCtx?.userId,
            },
        })

        try {
            const { data, period: rawPeriod, signalPeriod: rawSignalPeriod, high, low, close, volume } =
                inputData
            const period = rawPeriod ?? 14
            const signalPeriod = rawSignalPeriod ?? 3
            const results: MomentumAnalysisResult = {
                success: true,
                rsi: RSI.calculate({ values: data, period }),
                roc: ROC.calculate({ values: data, period }),
            }

            if (high && low && close) {
                results.stochastic = Stochastic.calculate({
                    high,
                    low,
                    close,
                    period,
                    signalPeriod,
                })
                results.williamsR = WilliamsR.calculate({
                    high,
                    low,
                    close,
                    period,
                })
            }

            if (close && volume) {
                results.forceIndex = ForceIndex.calculate({
                    close,
                    volume,
                    period,
                })
            }

            toolSpan?.update({
                output: results,
                metadata: { 'tool.output.success': true },
            })
            toolSpan?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Momentum analysis complete`,
                    stage: 'momentum-analysis',
                },
                id: 'momentum-analysis',
            })

            return results
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            toolSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Analysis failed: ${errorMessage}`,
                    stage: 'momentum-analysis',
                },
                id: 'momentum-analysis',
            })
            return { success: false, message: errorMessage }
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        logToolHookOutput('Momentum analysis', toolCallId, toolName, abortSignal, {
            success: output.success,
        })
    },
})

export const volatilityAnalysisTool = createTool({
    id: 'volatility-analysis',
    description:
        'Analyze market volatility using Bollinger Bands and Average True Range (ATR).',
    inputSchema: z.object({
        data: z.array(z.number()).describe('Closing prices'),
        period: z.number().optional().default(20),
        stdDev: z.number().optional().default(2),
        high: z.array(z.number()).optional(),
        low: z.array(z.number()).optional(),
        close: z.array(z.number()).optional(),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        bollinger: z
            .array(
                z.object({
                    upper: z.number(),
                    middle: z.number(),
                    lower: z.number(),
                })
            )
            .optional(),
        atr: z.array(z.number()).optional(),
        message: z.string().optional(),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        logToolHookStart('Volatility analysis', toolCallId, messages, abortSignal)
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        logToolHookDelta(
            'Volatility analysis',
            toolCallId,
            inputTextDelta,
            messages,
            abortSignal
        )
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        logToolHookAvailable('Volatility analysis', toolCallId, messages, abortSignal, {
            period: input.period,
            stdDev: input.stdDev,
            dataLength: input.data.length,
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined = context?.tracingContext
        const requestCtx = context?.requestContext as
            | TechnicalAnalysisContext
            | undefined

        if (abortSignal?.aborted ?? false) {
            throw new Error('Volatility analysis cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Input: period=${inputData.period} - 🌋 Analyzing volatility`,
                stage: 'volatility-analysis',
            },
            id: 'volatility-analysis',
        })

        const toolSpan = getOrCreateSpan({
            tracingContext,
            type: SpanType.TOOL_CALL,
            name: 'volatility-analysis',
            input: inputData,
            metadata: {
                'tool.id': 'volatility-analysis',
                'user.id': requestCtx?.userId,
            },
        })

        try {
            const { data, period: rawPeriod, stdDev: rawStdDev, high, low, close } = inputData
            const period = rawPeriod ?? 20
            const stdDev = rawStdDev ?? 2
            const results: VolatilityAnalysisResult = {
                success: true,
                bollinger: BollingerBands.calculate({
                    values: data,
                    period,
                    stdDev,
                }),
            }

            if (high && low && close) {
                results.atr = ATR.calculate({ high, low, close, period })
            }

            toolSpan?.update({
                output: results,
                metadata: { 'tool.output.success': true },
            })
            toolSpan?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Volatility analysis complete`,
                    stage: 'volatility-analysis',
                },
                id: 'volatility-analysis',
            })

            return results
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            toolSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Analysis failed: ${errorMessage}`,
                    stage: 'volatility-analysis',
                },
                id: 'volatility-analysis',
            })
            return { success: false, message: errorMessage }
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        logToolHookOutput('Volatility analysis', toolCallId, toolName, abortSignal, {
            success: output.success,
        })
    },
})

export const volumeAnalysisTool = createTool({
    id: 'volume-analysis',
    description: 'Analyze market volume using OBV, ADL, and MFI.',
    inputSchema: z.object({
        high: z.array(z.number()),
        low: z.array(z.number()),
        close: z.array(z.number()),
        volume: z.array(z.number()),
        period: z.number().optional().default(14),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        obv: z.array(z.number()).optional(),
        adl: z.array(z.number()).optional(),
        mfi: z.array(z.number()).optional(),
        vwap: z.array(z.number()).optional(),
        message: z.string().optional(),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        logToolHookStart('Volume analysis', toolCallId, messages, abortSignal)
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        logToolHookDelta(
            'Volume analysis',
            toolCallId,
            inputTextDelta,
            messages,
            abortSignal
        )
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        logToolHookAvailable('Volume analysis', toolCallId, messages, abortSignal, {
            period: input.period,
            highLength: input.high.length,
            lowLength: input.low.length,
            closeLength: input.close.length,
            volumeLength: input.volume.length,
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined = context?.tracingContext
        const requestCtx = context?.requestContext as
            | TechnicalAnalysisContext
            | undefined

        if (abortSignal?.aborted ?? false) {
            throw new Error('Volume analysis cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Analyzing volume data`,
                stage: 'volume-analysis',
            },
            id: 'volume-analysis',
        })

        const toolSpan = getOrCreateSpan({
            tracingContext,
            type: SpanType.TOOL_CALL,
            name: 'volume-analysis',
            input: inputData,
            metadata: {
                'tool.id': 'volume-analysis',
                'user.id': requestCtx?.userId,
            },
        })

        try {
            const { high, low, close, volume, period: rawPeriod } = inputData
            const period = rawPeriod ?? 14
            const results: VolumeAnalysisResult = {
                success: true,
                obv: OBV.calculate({ close, volume }),
                adl: ADL.calculate({ high, low, close, volume }),
                mfi: MFI.calculate({ high, low, close, volume, period }),
                vwap: VWAP.calculate({ high, low, close, volume }),
            }

            toolSpan?.update({
                output: results,
                metadata: { 'tool.output.success': true },
            })
            toolSpan?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Volume analysis complete`,
                    stage: 'volume-analysis',
                },
                id: 'volume-analysis',
            })

            return results
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            toolSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Analysis failed: ${errorMessage}`,
                    stage: 'volume-analysis',
                },
                id: 'volume-analysis',
            })
            return { success: false, message: errorMessage }
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        logToolHookOutput('Volume analysis', toolCallId, toolName, abortSignal, {
            success: output.success,
        })
    },
})

export const statisticalAnalysisTool = createTool({
    id: 'statistical-analysis',
    description:
        'Perform advanced statistical analysis including regression and correlation.',
    inputSchema: z.object({
        data: z.array(z.number()).optional(),
        dataX: z.array(z.number()).optional(),
        dataY: z.array(z.number()).optional(),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        stats: z
            .object({
                mean: z.number(),
                median: z.number(),
                mode: z.number(),
                standardDeviation: z.number(),
                variance: z.number(),
                min: z.number(),
                max: z.number(),
                skewness: z.number(),
                kurtosis: z.number(),
            })
            .optional(),
        regression: z
            .object({
                m: z.number(),
                b: z.number(),
            })
            .optional(),
        correlation: z.number().optional(),
        message: z.string().optional(),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        logToolHookStart('Statistical analysis', toolCallId, messages, abortSignal)
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        logToolHookDelta(
            'Statistical analysis',
            toolCallId,
            inputTextDelta,
            messages,
            abortSignal
        )
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        logToolHookAvailable('Statistical analysis', toolCallId, messages, abortSignal, {
            dataLength: input.data?.length ?? 0,
            dataXLength: input.dataX?.length ?? 0,
            dataYLength: input.dataY?.length ?? 0,
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined = context?.tracingContext
        const requestCtx = context?.requestContext as
            | TechnicalAnalysisContext
            | undefined

        if (abortSignal?.aborted ?? false) {
            throw new Error('Statistical analysis cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🧮 Performing statistical analysis`,
                stage: 'statistical-analysis',
            },
            id: 'statistical-analysis',
        })

        const toolSpan = getOrCreateSpan({
            tracingContext,
            type: SpanType.TOOL_CALL,
            name: 'statistical-analysis',
            input: inputData,
            metadata: {
                'tool.id': 'statistical-analysis',
                'user.id': requestCtx?.userId,
            },
        })

        try {
            const { data, dataX, dataY } = inputData
            const results: StatisticalAnalysisResult = { success: true }

            if (data && data.length > 0) {
                results.stats = {
                    mean: ss.mean(data),
                    median: ss.median(data),
                    mode: ss.mode(data),
                    standardDeviation: ss.standardDeviation(data),
                    variance: ss.variance(data),
                    min: ss.min(data),
                    max: ss.max(data),
                    skewness: ss.sampleSkewness(data),
                    kurtosis: ss.sampleKurtosis(data),
                }
            }

            if (
                (dataX?.length ?? 0) > 0 &&
                (dataY?.length ?? 0) > 0 &&
                dataX?.length === dataY?.length
            ) {
                const pairs = dataX!.map((x, i) => [x, dataY![i]])
                results.regression = ss.linearRegression(pairs)
                results.correlation = ss.sampleCorrelation(dataX!, dataY!)
            }

            toolSpan?.update({
                output: results,
                metadata: { 'tool.output.success': true },
            })
            toolSpan?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Statistical analysis complete`,
                    stage: 'statistical-analysis',
                },
                id: 'statistical-analysis',
            })

            return results
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            toolSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Analysis failed: ${errorMessage}`,
                    stage: 'statistical-analysis',
                },
                id: 'statistical-analysis',
            })
            return { success: false, message: errorMessage }
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        logToolHookOutput('Statistical analysis', toolCallId, toolName, abortSignal, {
            success: output.success,
        })
    },
})

export const heikinAshiTool = createTool({
    id: 'heikin-ashi',
    description:
        'Calculate Heikin Ashi candles for smoother trend visualization.',
    inputSchema: z.object({
        open: z.array(z.number()),
        high: z.array(z.number()),
        low: z.array(z.number()),
        close: z.array(z.number()),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        candles: z
            .array(
                z.object({
                    open: z.number(),
                    high: z.number(),
                    low: z.number(),
                    close: z.number(),
                })
            )
            .optional(),
        message: z.string().optional(),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        logToolHookStart('Heikin Ashi', toolCallId, messages, abortSignal)
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        logToolHookDelta('Heikin Ashi', toolCallId, inputTextDelta, messages, abortSignal)
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        logToolHookAvailable('Heikin Ashi', toolCallId, messages, abortSignal, {
            dataLength: input.close.length,
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined = context?.tracingContext
        const requestCtx = context?.requestContext as
            | TechnicalAnalysisContext
            | undefined

        if (abortSignal?.aborted ?? false) {
            throw new Error('Heikin Ashi calculation cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🕯️ Calculating Heikin Ashi candles`,
                stage: 'heikin-ashi',
            },
            id: 'heikin-ashi',
        })

        const toolSpan = getOrCreateSpan({
            tracingContext,
            type: SpanType.TOOL_CALL,
            name: 'heikin-ashi',
            input: inputData,
            metadata: {
                'tool.id': 'heikin-ashi',
                'user.id': requestCtx?.userId,
            },
        })

        try {
            const candlesRaw = heikinashi(inputData)
            const candles = Array.isArray(candlesRaw)
                ? (candlesRaw as HeikinAshiOutput[]).map((c) => ({
                      open: Number(c.open),
                      high: Number(c.high),
                      low: Number(c.low),
                      close: Number(c.close),
                  }))
                : []

            const finalResult = { success: true, candles }

            toolSpan?.update({
                output: finalResult,
                metadata: { 'tool.output.success': true },
            })
            toolSpan?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Heikin Ashi calculation complete`,
                    stage: 'heikin-ashi',
                },
                id: 'heikin-ashi',
            })

            return finalResult
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            toolSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Calculation failed: ${errorMessage}`,
                    stage: 'heikin-ashi',
                },
                id: 'heikin-ashi',
            })
            return { success: false, message: errorMessage }
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        logToolHookOutput('Heikin Ashi', toolCallId, toolName, abortSignal, {
            success: output.success,
        })
    },
})

export const marketSummaryTool = createTool({
    id: 'market-summary',
    description:
        'Generate a comprehensive market sentiment summary combining multiple indicators.',
    inputSchema: z.object({
        open: z.array(z.number()),
        high: z.array(z.number()),
        low: z.array(z.number()),
        close: z.array(z.number()),
        volume: z.array(z.number()),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        sentiment: z.enum([
            'Strong Buy',
            'Buy',
            'Neutral',
            'Sell',
            'Strong Sell',
        ]),
        score: z.number().describe('Score from -100 to 100'),
        indicators: z.record(z.string(), z.string()),
        message: z.string().optional(),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        logToolHookStart('Market summary', toolCallId, messages, abortSignal)
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        logToolHookDelta(
            'Market summary',
            toolCallId,
            inputTextDelta,
            messages,
            abortSignal
        )
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        logToolHookAvailable('Market summary', toolCallId, messages, abortSignal, {
            openLength: input.open.length,
            highLength: input.high.length,
            lowLength: input.low.length,
            closeLength: input.close.length,
            volumeLength: input.volume.length,
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined = context?.tracingContext
        const requestCtx = context?.requestContext as
            | TechnicalAnalysisContext
            | undefined

        if (abortSignal?.aborted ?? false) {
            throw new Error('Market summary cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📊 Generating market sentiment summary`,
                stage: 'market-summary',
            },
            id: 'market-summary',
        })

        const toolSpan = getOrCreateSpan({
            tracingContext,
            type: SpanType.TOOL_CALL,
            name: 'market-summary',
            input: inputData,
            metadata: {
                'tool.id': 'market-summary',
                'user.id': requestCtx?.userId,
            },
        })

        try {
            const { close } = inputData
            let score = 0
            const indicators: Record<string, string> = {}

            // Trend: SMA 50 vs 200 (Golden Cross / Death Cross)
            const sma50 = SMA.calculate({ values: close, period: 50 })
            const sma200 = SMA.calculate({ values: close, period: 200 })
            const lastSma50 = sma50[sma50.length - 1]
            const lastSma200 = sma200[sma200.length - 1]

            if (lastSma50 !== undefined && lastSma200 !== undefined) {
                if (lastSma50 > lastSma200) {
                    score += 20
                    indicators.trend = 'Bullish (SMA 50 > 200)'
                } else {
                    score -= 20
                    indicators.trend = 'Bearish (SMA 50 < 200)'
                }
            }

            // Momentum: RSI
            const rsi = RSI.calculate({ values: close, period: 14 })
            const lastRsi = rsi[rsi.length - 1]
            if (lastRsi !== undefined) {
                if (lastRsi > 70) {
                    score -= 10
                    indicators.rsi = 'Overbought'
                } else if (lastRsi < 30) {
                    score += 10
                    indicators.rsi = 'Oversold'
                } else {
                    indicators.rsi = 'Neutral'
                }
            }

            // Volatility: Bollinger Bands
            const bb = BollingerBands.calculate({
                values: close,
                period: 20,
                stdDev: 2,
            })
            const lastBB = bb[bb.length - 1]
            const lastClose = close[close.length - 1]
            if (lastBB !== undefined && lastClose !== undefined) {
                if (lastClose > (lastBB.upper ?? 0)) {
                    score -= 5
                    indicators.volatility = 'High (Above Upper Band)'
                } else if (lastClose < (lastBB.lower ?? 0)) {
                    score += 5
                    indicators.volatility = 'High (Below Lower Band)'
                } else {
                    indicators.volatility = 'Normal'
                }
            }

            // Sentiment Mapping
            let sentiment:
                | 'Strong Buy'
                | 'Buy'
                | 'Neutral'
                | 'Sell'
                | 'Strong Sell' = 'Neutral'
            if (score >= 25) {
                sentiment = 'Strong Buy'
            } else if (score > 10) {
                sentiment = 'Buy'
            } else if (score < -25) {
                sentiment = 'Strong Sell'
            } else if (score < -10) {
                sentiment = 'Sell'
            }

            const finalResult: MarketSummaryResult = {
                success: true,
                sentiment,
                score,
                indicators,
            }

            toolSpan?.update({
                output: finalResult,
                metadata: {
                    'tool.output.success': true,
                    'tool.output.sentiment': sentiment,
                },
            })
            toolSpan?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Market summary complete: ${sentiment}`,
                    stage: 'market-summary',
                },
                id: 'market-summary',
            })

            return finalResult
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            toolSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Summary failed: ${errorMessage}`,
                    stage: 'market-summary',
                },
                id: 'market-summary',
            })
            const errorResult: MarketSummaryResult = {
                success: false,
                sentiment: 'Neutral',
                score: 0,
                indicators: {},
                message: errorMessage,
            }
            return errorResult
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        logToolHookOutput('Market summary', toolCallId, toolName, abortSignal, {
            success: output.success,
            sentiment: output.sentiment,
        })
    },
})

export const candlestickPatternTool = createTool({
    id: 'candlestick-patterns',
    description: 'Detect various candlestick patterns in price data.',
    inputSchema: z.object({
        open: z.array(z.number()),
        high: z.array(z.number()),
        low: z.array(z.number()),
        close: z.array(z.number()),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        patterns: z.record(z.string(), z.boolean()).optional(),
        message: z.string().optional(),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        logToolHookStart('Pattern detection', toolCallId, messages, abortSignal)
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        logToolHookDelta(
            'Pattern detection',
            toolCallId,
            inputTextDelta,
            messages,
            abortSignal
        )
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        logToolHookAvailable('Pattern detection', toolCallId, messages, abortSignal, {
            dataLength: input.close.length,
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined = context?.tracingContext
        const requestCtx = context?.requestContext as
            | TechnicalAnalysisContext
            | undefined

        if (abortSignal?.aborted ?? false) {
            throw new Error('Pattern detection cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔍 Detecting candlestick patterns`,
                stage: 'candlestick-patterns',
            },
            id: 'candlestick-patterns',
        })

        const toolSpan = getOrCreateSpan({
            tracingContext,
            type: SpanType.TOOL_CALL,
            name: 'candlestick-patterns',
            input: inputData,
            metadata: {
                'tool.id': 'candlestick-patterns',
                'user.id': requestCtx?.userId,
            },
        })

        try {
            const patterns: Record<string, boolean> = {}
            patterns.abandonedBaby = Boolean(abandonedbaby(inputData))
            patterns.doji = Boolean(doji(inputData))
            patterns.darkCloudCover = Boolean(darkcloudcover(inputData))
            patterns.downsideTasukiGap = Boolean(downsidetasukigap(inputData))
            patterns.dragonflyDoji = Boolean(dragonflydoji(inputData))
            patterns.eveningDojiStar = Boolean(eveningdojistar(inputData))
            patterns.eveningStar = Boolean(eveningstar(inputData))
            patterns.gravestoneDoji = Boolean(gravestonedoji(inputData))
            patterns.hangingMan = Boolean(hangingman(inputData))
            patterns.morningDojiStar = Boolean(morningdojistar(inputData))
            patterns.morningStar = Boolean(morningstar(inputData))
            patterns.piercingLine = Boolean(piercingline(inputData))
            patterns.bullishHarami = Boolean(bullishharami(inputData))
            patterns.bearishHarami = Boolean(bearishharami(inputData))
            patterns.bullishHaramiCross = Boolean(bullishharamicross(inputData))
            patterns.bearishHaramiCross = Boolean(bearishharamicross(inputData))
            patterns.bullishMarubozu = Boolean(bullishmarubozu(inputData))
            patterns.bearishMarubozu = Boolean(bearishmarubozu(inputData))
            patterns.bullishSpinningTop = Boolean(bullishspinningtop(inputData))
            patterns.bearishSpinningTop = Boolean(bearishspinningtop(inputData))
            patterns.threeBlackCrows = Boolean(threeblackcrows(inputData))
            patterns.threeWhiteSoldiers = Boolean(threewhitesoldiers(inputData))

            const finalResult = { success: true, patterns }

            toolSpan?.update({
                output: finalResult,
                metadata: {
                    'tool.output.success': true,
                    'tool.output.patternsCount': Object.keys(patterns).length,
                },
            })
            toolSpan?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Pattern detection complete`,
                    stage: 'candlestick-patterns',
                },
                id: 'candlestick-patterns',
            })

            return finalResult
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            toolSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Detection failed: ${errorMessage}`,
                    stage: 'candlestick-patterns',
                },
                id: 'candlestick-patterns',
            })
            return { success: false, message: errorMessage }
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        logToolHookOutput('Pattern detection', toolCallId, toolName, abortSignal, {
            success: output.success,
        })
    },
})

type TechnicalAnalysisJsonPrimitive = string | number | boolean | null
type TechnicalAnalysisJsonValue =
    | TechnicalAnalysisJsonPrimitive
    | TechnicalAnalysisJsonObject
    | TechnicalAnalysisJsonValue[]

interface TechnicalAnalysisJsonObject {
    [key: string]: TechnicalAnalysisJsonValue
}

const technicalAnalysisJsonValueSchema: z.ZodType<TechnicalAnalysisJsonValue> = z.lazy(() =>
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(technicalAnalysisJsonValueSchema),
        z.record(z.string(), technicalAnalysisJsonValueSchema),
    ])
)

export const technicalAnalysisTool = createTool({
    id: 'technical-analysis',
    description:
        'Perform technical and statistical analysis on financial or numerical data series using technicalindicators and simple-statistics libraries.',
    inputSchema: z.object({
        data: z
            .array(z.number())
            .describe(
                'The numerical data series to analyze (e.g., closing prices)'
            ),
        operation: z
            .enum([
                'sma',
                'ema',
                'rsi',
                'macd',
                'bollinger',
                'atr',
                'stochastic',
                'wma',
                'stats',
                'all',
            ])
            .describe('The technical or statistical operation to perform'),
        params: z
            .object({
                period: z
                    .number()
                    .optional()
                    .default(14)
                    .describe('Calculation period (for SMA, EMA, RSI, etc.)'),
                fastPeriod: z
                    .number()
                    .optional()
                    .default(12)
                    .describe('Fast period for MACD'),
                slowPeriod: z
                    .number()
                    .optional()
                    .default(26)
                    .describe('Slow period for MACD'),
                signalPeriod: z
                    .number()
                    .optional()
                    .default(9)
                    .describe('Signal period for MACD'),
                stdDev: z
                    .number()
                    .optional()
                    .default(2)
                    .describe('Standard deviation for Bollinger Bands'),
                high: z
                    .array(z.number())
                    .optional()
                    .describe('High prices for ATR/Stochastic'),
                low: z
                    .array(z.number())
                    .optional()
                    .describe('Low prices for ATR/Stochastic'),
                close: z
                    .array(z.number())
                    .optional()
                    .describe('Closing prices for ATR/Stochastic'),
                volume: z
                    .array(z.number())
                    .optional()
                    .describe('Volume data for ADL/OBV'),
            })
            .optional(),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        results: z.record(z.string(), technicalAnalysisJsonValueSchema),
        stats: z
            .object({
                mean: z.number().optional(),
                median: z.number().optional(),
                mode: z.number().optional(),
                standardDeviation: z.number().optional(),
                variance: z.number().optional(),
                min: z.number().optional(),
                max: z.number().optional(),
            })
            .optional(),
        message: z.string().optional(),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        logToolHookStart('Technical analysis tool', toolCallId, messages, abortSignal)
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        logToolHookDelta(
            'Technical analysis tool',
            toolCallId,
            inputTextDelta,
            messages,
            abortSignal
        )
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        logToolHookAvailable(
            'Technical analysis tool',
            toolCallId,
            messages,
            abortSignal,
            {
                operation: input.operation,
                dataLength: input.data.length,
            }
        )
    },
    execute: async (inputData, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined = context?.tracingContext
        const requestCtx = context?.requestContext as
            | TechnicalAnalysisContext
            | undefined

        // Check for cancellation
        if (abortSignal?.aborted ?? false) {
            throw new Error('Technical analysis cancelled')
        }

        const userId = requestCtx?.userId
        const workspaceId = requestCtx?.workspaceId

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Input: operation="${inputData.operation}" - 📈 Starting technical analysis`,
                stage: 'technical-analysis',
            },
            id: 'technical-analysis',
        })

        const technicalSpan = getOrCreateSpan({
            tracingContext,
            type: SpanType.TOOL_CALL,
            name: 'technical-analysis',
            input: {
                operation: inputData.operation,
                dataLength: inputData.data.length,
            },
            metadata: {
                'tool.id': 'technical-analysis',
                'tool.input.operation': inputData.operation,
                'tool.input.dataLength': inputData.data.length,
                'user.id': userId,
                'workspace.id': workspaceId,
            },
        })

        try {
            const { data, operation, params: inputParams } = inputData
            const defaultParams = {
                period: 14,
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9,
                stdDev: 2,
                high: undefined as number[] | undefined,
                low: undefined as number[] | undefined,

                close: undefined as number[] | undefined,
                volume: undefined as number[] | undefined,
            }
            const params = { ...defaultParams, ...(inputParams ?? {}) }
            const results: TechnicalAnalysisSeriesMap = {}
            let stats: TechnicalAnalysisStats | undefined = undefined

            if (data.length === 0) {
                throw new Error('Data series cannot be empty')
            }

            // Statistical Analysis (simple-statistics)
            if (operation === 'stats' || operation === 'all') {
                stats = {
                    mean: ss.mean(data),
                    median: ss.median(data),
                    mode: ss.mode(data),
                    standardDeviation: ss.standardDeviation(data),
                    variance: ss.variance(data),
                    min: ss.min(data),
                    max: ss.max(data),
                }
            }

            // Technical Indicators (technicalindicators)
            const period = params.period ?? 14

            if (operation === 'sma' || operation === 'all') {
                results.sma = SMA.calculate({ values: data, period })
            }

            if (operation === 'ema' || operation === 'all') {
                results.ema = EMA.calculate({ values: data, period })
            }

            if (operation === 'rsi' || operation === 'all') {
                results.rsi = RSI.calculate({ values: data, period })
            }

            if (operation === 'wma' || operation === 'all') {
                results.wma = WMA.calculate({ values: data, period })
            }

            if (operation === 'macd' || operation === 'all') {
                results.macd = (() => {
                    const macdValues: MACDOutput[] = MACD.calculate({
                        values: data,
                        fastPeriod: params.fastPeriod ?? 12,
                        slowPeriod: params.slowPeriod ?? 26,
                        signalPeriod: params.signalPeriod ?? 9,
                        SimpleMAOscillator: false,
                        SimpleMASignal: false,
                    }).map((entry): MACDOutput => ({
                        MACD: entry.MACD ?? 0,
                        signal: entry.signal ?? 0,
                        histogram: entry.histogram ?? 0,
                    }))

                    return macdValues
                })()
            }

            if (operation === 'bollinger' || operation === 'all') {
                results.bollinger = BollingerBands.calculate({
                    values: data,
                    period: params.period ?? 20,
                    stdDev: params.stdDev ?? 2,
                })
            }

            // Indicators requiring High/Low/Close
            if (params.high && params.low && params.close) {
                if (operation === 'atr' || operation === 'all') {
                    results.atr = ATR.calculate({
                        high: params.high,
                        low: params.low,
                        close: params.close,
                        period,
                    })
                }

                if (operation === 'stochastic' || operation === 'all') {
                    results.stochastic = Stochastic.calculate({
                        high: params.high,
                        low: params.low,
                        close: params.close,
                        period,
                        signalPeriod: params.signalPeriod ?? 3,
                    })
                }
            }

            const finalResult: TechnicalAnalysisResult = {
                success: true,
                results,
                stats,
            }

            technicalSpan?.update({
                output: finalResult,
                metadata: {
                    'tool.output.success': true,
                    'tool.output.resultsCount': Object.keys(results).length,
                },
            })
            technicalSpan?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Input: operation="${inputData.operation}" - ✅ Analysis complete`,
                    stage: 'technical-analysis',
                },
                id: 'technical-analysis',
            })

            return finalResult
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)

            technicalSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Input: operation="${inputData.operation}" - ❌ Analysis failed: ${errorMessage}`,
                    stage: 'technical-analysis',
                },
                id: 'technical-analysis',
            })

            log.error(`Technical analysis failed: ${errorMessage}`)
            return {
                success: false,
                results: {},
                message: errorMessage,
            }
        }
    },
    toModelOutput: (output) => ({
        type: 'json',
        value: output,
    }),
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        logToolHookOutput('Technical analysis tool', toolCallId, toolName, abortSignal, {
            success: output.success,
        })
    },
})

export type TechnicalAnalysisUITool = InferUITool<typeof technicalAnalysisTool>
