import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import type { TracingContext } from '@mastra/core/observability'
import type { RequestContext } from '@mastra/core/request-context'
import type { BaseToolRequestContext } from './request-context.utils'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { log } from '../config/logger'
import { httpFetch } from '../lib/http-client'

type AlphaVantageJsonPrimitive = string | number | boolean | null
type AlphaVantageJsonValue =
    | AlphaVantageJsonPrimitive
    | AlphaVantageJsonObject
    | AlphaVantageJsonValue[]

interface AlphaVantageJsonObject {
    [key: string]: AlphaVantageJsonValue
}

const alphaVantageJsonValueSchema: z.ZodType<AlphaVantageJsonValue> = z.lazy(() =>
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(alphaVantageJsonValueSchema),
        z.record(z.string(), alphaVantageJsonValueSchema),
    ])
)
import {
    createLinkedAbortController,
    resolveAbortSignal,
} from './abort-signal.utils'

/**
 * Alpha Vantage Tools
 *
 * Specialized tools for financial market data from Alpha Vantage:
 * - Crypto Tool: Optimized for cryptocurrency data and exchange rates
 * - Stock Tool: Optimized for stock market data and analysis
 *
 * Requires ALPHA_VANTAGE_API_KEY environment variable
 */

/**
 * Base Request Context for Alpha Vantage Extra
 */
export interface AlphaVantageContextExtra extends BaseToolRequestContext {
    // Additional context properties can be added here if needed
}

// In-memory counter to track tool calls per request
// Add this line at the beginning of each tool's execute function to track usage:
// toolCallCounters.set('tool-id', (toolCallCounters.get('tool-id') ?? 0) + 1)
const toolCallCounters = new Map<string, number>()

/**
 * Normalize API-provided messages into a safe string for error messages.
 * - Returns '' for null/undefined
 * - Returns string values unchanged
 * - Serializes objects using JSON.stringify (fallback to Object.prototype.toString)
 */
const normalizeApiMessage = (value: unknown): string => {
    if (value === null || value === undefined) {return ''}
    if (typeof value === 'string') {return value}
    if (
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint' ||
        typeof value === 'symbol'
    ) {
        return String(value)
    }
    try {
        return JSON.stringify(value)
    } catch {
        return Object.prototype.toString.call(value)
    }
}
/**
 * Alpha Vantage Crypto Tool
 *
 * Specialized for cryptocurrency data including:
 * - Crypto time series data (intraday, daily, weekly, monthly)
 * - Digital currency exchange rates
 * - Crypto-to-fiat and crypto-to-crypto exchange rates
 */
export const alphaVantageCryptoTool = createTool({
    id: 'alpha-vantage-crypto',
    description:
        'Access cryptocurrency market data from Alpha Vantage including crypto prices, exchange rates, and historical data',
    inputSchema: z.object({
        function: z
            .enum([
                'CRYPTO_INTRADAY',
                'CRYPTO_DAILY',
                'CRYPTO_WEEKLY',
                'CRYPTO_MONTHLY',
                'CURRENCY_EXCHANGE_RATE',
            ])
            .describe('Crypto-specific Alpha Vantage API function'),
        symbol: z
            .string()
            .describe("Cryptocurrency symbol (e.g., 'BTC', 'ETH', 'ADA')"),
        market: z
            .string()
            .default('USD')
            .describe(
                "Quote currency for exchange rates (e.g., 'USD', 'EUR', 'BTC')"
            ),
        interval: z
            .enum(['1min', '5min', '15min', '30min', '60min'])
            .optional()
            .describe('Time interval for intraday data'),
        outputsize: z
            .enum(['compact', 'full'])
            .optional()
            .describe(
                'Amount of data to return (compact=latest 100, full=all available)'
            ),
        datatype: z
            .enum(['json', 'csv'])
            .optional()
            .describe('Response format'),
    }),
    outputSchema: z.object({
        data: alphaVantageJsonValueSchema.describe(
            'The cryptocurrency data returned from Alpha Vantage API'
        ),
        metadata: z
            .object({
                function: z.string(),
                symbol: z.string(),
                market: z.string().optional(),
                last_refreshed: z.string().optional(),
                interval: z.string().optional(),
                output_size: z.string().optional(),
                time_zone: z.string().optional(),
            })
            .optional(),
    }),
    strict: true,
    onInputStart: ({ toolCallId, messages }) => {
        log.info('Alpha Vantage crypto tool input streaming started', {
            toolCallId,
            messages,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages }) => {
        log.info('Alpha Vantage crypto tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messages,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages }) => {
        log.info('Alpha Vantage crypto received input', {
            toolCallId,
            messages,
            symbol: input.symbol,
            market: input.market,
            hook: 'onInputAvailable',
        })
    },
    execute: async (inputData, context) => {
        const writer = context.writer
        const abortController = createLinkedAbortController(context.abortSignal)
        const abortSignal = abortController.signal
        const tracingContext: TracingContext | undefined = context.tracingContext
        const requestContext = context.requestContext as RequestContext<AlphaVantageContextExtra>
        const userId = requestContext?.all.userId
        const workspaceId = requestContext?.all.workspaceId
        const cryptoTarget = [inputData.symbol, inputData.market]
            .filter((value): value is string => Boolean(value))
            .join('/')

        // Check if operation was already cancelled
        if (abortSignal.aborted) {
            throw new Error('Alpha Vantage crypto lookup cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                message: `📈 Fetching Alpha Vantage crypto data for ${cryptoTarget}`,
                status: 'in-progress',
                stage: 'alpha-vantage-crypto',
            },
            id: 'alpha-vantage-crypto',
        })

        // Create root span for crypto tool execution
        const rootSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'alpha-vantage-crypto',
            input: inputData,
            metadata: {
                'tool.id': 'alpha-vantage-crypto',
                'tool.input.symbol': inputData.symbol,
                'tool.input.market': inputData.market,
                'tool.input.function': inputData.function,
                'user.id': userId,
                'workspace.id': workspaceId,
            },
            requestContext: context.requestContext,
            tracingContext,
        })

        // Create child span for crypto data fetch operation
        const cryptoFetchSpan = rootSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'alpha-vantage-crypto-fetch',
            input: inputData,
            metadata: {
                'operation.type': 'fetch-crypto-data',
                'tool.input.symbol': inputData.symbol,
                'tool.input.market': inputData.market,
            },
            entityId: inputData.symbol,
            entityName: cryptoTarget,
        })

        const apiKey = process.env.ALPHA_VANTAGE_API_KEY

        if (typeof apiKey !== 'string' || apiKey.trim() === '') {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    message: '❌ Missing ALPHA_VANTAGE_API_KEY',
                    status: 'done',
                    stage: 'alpha-vantage-crypto',
                },
                id: 'alpha-vantage-crypto',
            })
            throw new Error(
                'ALPHA_VANTAGE_API_KEY environment variable is required'
            )
        }
        toolCallCounters.set(
            'alpha-vantage-crypto',
            (toolCallCounters.get('alpha-vantage-crypto') ?? 0) + 1
        )
        try {
            const params = new URLSearchParams()
            params.append('apikey', apiKey)
            params.append('function', inputData.function)
            params.append('symbol', inputData.symbol)
            if (typeof inputData.market === 'string' && inputData.market !== '') {
                params.append('market', inputData.market)
            }

            // Add optional parameters
            if (inputData.interval !== undefined) {
                params.append('interval', inputData.interval)
            }
            if (inputData.outputsize !== undefined) {
                params.append('outputsize', inputData.outputsize)
            }
            if (inputData.datatype !== undefined) {
                params.append('datatype', inputData.datatype)
            }

            const url = `https://www.alphavantage.co/query?${params.toString()}`

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    message: '📡 Querying Alpha Vantage API...',
                    status: 'in-progress',
                    stage: 'alpha-vantage-crypto',
                },
                id: 'alpha-vantage-crypto',
            })

            const resp = await httpFetch(url, {
                method: 'GET',
                timeout: 30000,
                responseType: 'json',
                signal: abortSignal,
            })

            if (
                typeof resp.status !== 'number' ||
                resp.status < 200 ||
                resp.status >= 300
            ) {
                throw new Error(
                    'Alpha Vantage API error: ' +
                        resp.status.toString() +
                        ' ' +
                        resp.statusText
                )
            }

            const {data} = resp

            const dataObj = data

            // Check for API-specific errors
            if (
                Boolean(dataObj) &&
                typeof dataObj === 'object' &&
                dataObj !== null &&
                'Error Message' in (dataObj as Record<string, unknown>)
            ) {
                const errorMessage = (dataObj as Record<string, unknown>)[
                    'Error Message'
                ]
                const errorText = normalizeApiMessage(errorMessage).trim()
                if (errorText !== '') {
                    throw new Error(errorText)
                }
            }

            if (
                Boolean(dataObj) &&
                typeof dataObj === 'object' &&
                dataObj !== null &&
                'Note' in (dataObj as Record<string, unknown>)
            ) {
                const note = (dataObj as Record<string, unknown>).Note
                const noteText = normalizeApiMessage(note).trim()
                if (noteText !== '') {
                    throw new Error(noteText) // API limit reached
                }
            }

            // Extract metadata if available
            let metadata: unknown = null
            if (
                Boolean(dataObj) &&
                typeof dataObj === 'object' &&
                dataObj !== null
            ) {
                const dataRecord = dataObj as Record<string, unknown>
                if ('Meta Data' in dataRecord) {
                    metadata = dataRecord['Meta Data']
                } else if ('meta' in dataRecord) {
                    metadata = dataRecord.meta
                }
            }

            const metadataObj = metadata

            // Helper function to safely extract metadata values
            const getMetadataValue = (key: string): string | null => {
                if (
                    Boolean(metadataObj) &&
                    typeof metadataObj === 'object' &&
                    metadataObj !== null
                ) {
                    const metaRecord = metadataObj as Record<string, unknown>
                    if (key in metaRecord) {
                        const value = metaRecord[key]
                        return value !== null && value !== undefined
                            ? normalizeApiMessage(value)
                            : null
                    }
                }
                return null
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    message: `✅ Crypto data ready for ${inputData.symbol}`,
                    status: 'done',
                    stage: 'alpha-vantage-crypto',
                },
                id: 'alpha-vantage-crypto',
            })
            const result = {
                data,
                metadata: {
                    function:
                        getMetadataValue('1. Information') ??
                        inputData.function,
                    symbol: getMetadataValue('2. Symbol') ?? inputData.symbol,
                    market: getMetadataValue('3. Market') ?? inputData.market,
                    last_refreshed:
                        getMetadataValue('4. Last Refreshed') ?? undefined,
                    interval: getMetadataValue('5. Interval') ?? undefined,
                    output_size:
                        getMetadataValue('6. Output Size') ?? undefined,
                    time_zone: getMetadataValue('7. Time Zone') ?? undefined,
                },
            }

            cryptoFetchSpan?.update({
                output: result,
                metadata: { 'operation.success': true },
            })
            cryptoFetchSpan?.end()

            rootSpan?.update({
                output: result,
                metadata: { 'tool.success': true },
            })
            rootSpan?.end()

            return result
        } catch (error) {
            const errMsg =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    message: `❌ Crypto fetch error: ${errMsg}`,
                    status: 'done',
                    stage: 'alpha-vantage-crypto',
                },
                id: 'alpha-vantage-crypto',
            })
            if (error instanceof Error) {
                cryptoFetchSpan?.error({
                    error,
                    endSpan: true,
                })
                rootSpan?.error({
                    error,
                    endSpan: true,
                })
            }
            throw error instanceof Error ? error : new Error(errMsg)
        }
    },
    toModelOutput: (output) => ({
        type: 'json',
        value: output,
    }),
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        const resolved = resolveAbortSignal(abortSignal)
        const aborted = resolved.aborted ?? false
        log.info('Alpha Vantage crypto completed', {
            toolCallId,
            toolName,
            symbol: output.metadata?.symbol ?? 'unknown',
            hook: 'onOutput',
        })
    },
})

/**
 * Alpha Vantage Stock Tool
 *
 * Specialized for stock market data including:
 * - Stock time series data (intraday, daily, weekly, monthly)
 * - Real-time quotes
 * - Symbol search
 * - Technical indicators
 * - Fundamental data
 */
export const alphaVantageStockTool = createTool({
    id: 'alpha-vantage-stock',
    description:
        'Access stock market data from Alpha Vantage including stock prices, quotes, technical indicators, and fundamental data',
    inputSchema: z.object({
        function: z
            .enum([
                'TIME_SERIES_INTRADAY',
                'TIME_SERIES_DAILY',
                'TIME_SERIES_DAILY_ADJUSTED',
                'TIME_SERIES_WEEKLY',
                'TIME_SERIES_MONTHLY',
                'GLOBAL_QUOTE',
                'SYMBOL_SEARCH',
                'SMA',
                'EMA',
                'RSI',
                'MACD',
                'STOCH',
                'BBANDS',
                'ADX',
                'CCI',
            ])
            .describe('Stock-specific Alpha Vantage API function'),
        symbol: z
            .string()
            .describe("Stock symbol (e.g., 'IBM', 'AAPL', 'GOOGL')"),
        interval: z
            .enum(['1min', '5min', '15min', '30min', '60min'])
            .optional()
            .describe('Time interval for intraday data'),
        outputsize: z
            .enum(['compact', 'full'])
            .optional()
            .describe(
                'Amount of data to return (compact=latest 100, full=all available)'
            ),
        datatype: z
            .enum(['json', 'csv'])
            .optional()
            .describe('Response format'),
        // Technical indicator parameters
        indicator: z
            .string()
            .optional()
            .describe(
                "Technical indicator name (e.g., 'SMA', 'EMA', 'RSI', 'MACD')"
            ),
        time_period: z
            .number()
            .optional()
            .describe('Time period for technical indicators'),
        series_type: z
            .enum(['close', 'open', 'high', 'low'])
            .optional()
            .describe('Price series type for technical indicators'),
    }),
    outputSchema: z.object({
        data: alphaVantageJsonValueSchema.describe(
            'The stock data returned from Alpha Vantage API'
        ),
        metadata: z
            .object({
                function: z.string(),
                symbol: z.string().optional(),
                last_refreshed: z.string().optional(),
                interval: z.string().optional(),
                output_size: z.string().optional(),
                time_zone: z.string().optional(),
                indicator: z.string().optional(),
                time_period: z.string().optional(),
                series_type: z.string().optional(),
            })
            .optional(),
    }),
    strict: true,

    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        const resolved = resolveAbortSignal(abortSignal)
        const aborted = resolved.aborted ?? false
        const messagePreview = messages?.slice?.(0, 5)
        log.info('Alpha Vantage stock tool input streaming started', {
            toolCallId,
            messages: messagePreview,
            aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        const resolved = resolveAbortSignal(abortSignal)
        const aborted = resolved.aborted ?? false
        const messagePreview = messages?.slice?.(0, 5)
        log.info('Alpha Vantage stock tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messages: messagePreview,
            aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        const resolved = resolveAbortSignal(abortSignal)
        const aborted = resolved.aborted ?? false
        const messagePreview = messages?.slice?.(0, 5)
        log.info('Alpha Vantage stock received input', {
            toolCallId,
            messages: messagePreview,
            symbol: input.symbol,
            function: input.function,
            aborted,
            hook: 'onInputAvailable',
        })
    },
    execute: async (inputData, context) => {
        const writer = context.writer
        const abortController = createLinkedAbortController(context.abortSignal)
        const abortSignal = abortController.signal
        const tracingContext: TracingContext | undefined =
            context.tracingContext
        const requestContext =
            context.requestContext as RequestContext<AlphaVantageContextExtra>
        const userId = requestContext?.all.userId
        const workspaceId = requestContext?.all.workspaceId

        // Check if operation was already cancelled
        if (abortSignal.aborted) {
            throw new Error('Alpha Vantage stock lookup cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                message: `📈 Fetching Alpha Vantage stock data for ${inputData.symbol || 'symbol'}`,
                status: 'in-progress',
                stage: 'alpha-vantage-stock',
            },
            id: 'alpha-vantage-stock',
        })

        // Create root span for stock tool execution
        const rootSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'alpha-vantage-stock',
            input: inputData,
            metadata: {
                'tool.id': 'alpha-vantage-stock',
                'tool.input.symbol': inputData.symbol,
                'tool.input.function': inputData.function,
                'user.id': userId,
                'workspace.id': workspaceId,
            },
            requestContext: context.requestContext,
            tracingContext,
        })

        // Create child span for stock data fetch
        const stockFetchSpan = rootSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'alpha-vantage-stock-fetch',
            input: inputData,
            metadata: {
                'operation.type': 'fetch-stock-data',
                'tool.input.symbol': inputData.symbol,
                'tool.input.function': inputData.function,
            },
        })

        const apiKey = process.env.ALPHA_VANTAGE_API_KEY

        if (typeof apiKey !== 'string' || apiKey.trim() === '') {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    message: '❌ Missing ALPHA_VANTAGE_API_KEY',
                    status: 'done',
                    stage: 'alpha-vantage-stock',
                },
                id: 'alpha-vantage-stock',
            })
            throw new Error(
                'ALPHA_VANTAGE_API_KEY environment variable is required'
            )
        }
        toolCallCounters.set(
            'alpha-vantage-stock',
            (toolCallCounters.get('alpha-vantage-stock') ?? 0) + 1
        )
        try {
            const params = new URLSearchParams({
                apikey: apiKey,
                function: inputData.function,
            })

            // Add required symbol parameter
            if (inputData.symbol) {
                params.append('symbol', inputData.symbol)
            }

            // Add optional parameters
            if (inputData.interval !== undefined) {
                params.append('interval', inputData.interval)
            }
            if (inputData.outputsize !== undefined) {
                params.append('outputsize', inputData.outputsize)
            }
            if (inputData.datatype !== undefined) {
                params.append('datatype', inputData.datatype)
            }

            // Technical indicator parameters
            if (
                inputData.indicator !== undefined
            ) {
                params.append('indicator', inputData.indicator)
            }
            if (
                inputData.time_period !== undefined
            ) {
                params.append('time_period', inputData.time_period.toString())
            }
            if (inputData.series_type !== undefined) {
                params.append('series_type', inputData.series_type)
            }

            const url = `https://www.alphavantage.co/query?${params.toString()}`

            const resp = await httpFetch(url, {
                method: 'GET',
                timeout: 30000,
                responseType: 'json',
                signal: abortSignal,
            })

            if (
                typeof resp.status !== 'number' ||
                resp.status < 200 ||
                resp.status >= 300
            ) {
                throw new Error(
                    'Alpha Vantage API error: ' +
                        resp.status.toString() +
                        ' ' +
                        resp.statusText
                )
            }

            const { data } = resp

            const dataObj = data

            // Check for API-specific errors
            if (
                Boolean(dataObj) &&
                typeof dataObj === 'object' &&
                dataObj !== null &&
                'Error Message' in (dataObj as Record<string, unknown>)
            ) {
                const errorMessage = (dataObj as Record<string, unknown>)['Error Message']
                const errorText = normalizeApiMessage(errorMessage).trim()
                if (errorText !== '') {
                    throw new Error(errorText)
                }
            }

            if (
                Boolean(dataObj) &&
                typeof dataObj === 'object' &&
                dataObj !== null &&
                'Note' in (dataObj as Record<string, unknown>)
            ) {
                const note = (dataObj as Record<string, unknown>).Note
                const noteText = normalizeApiMessage(note).trim()
                if (noteText !== '') {
                    throw new Error(noteText) // API limit reached
                }
            }

            // Extract metadata if available
            const metadata =
                (Boolean(dataObj) &&
                typeof dataObj === 'object' &&
                dataObj !== null &&
                'Meta Data' in dataObj
                    ? (dataObj as Record<string, unknown>)['Meta Data']
                    : null) ??
                (Boolean(dataObj) &&
                typeof dataObj === 'object' &&
                dataObj !== null &&
                'meta' in dataObj
                    ? (dataObj as Record<string, unknown>).meta
                    : null) ??
                {}

            const metadataObj = metadata as unknown

            const result = {
                data,
                metadata: {
                    function:
                        (Boolean(metadataObj) &&
                        typeof metadataObj === 'object' &&
                        metadataObj !== null &&
                        '1. Information' in metadataObj
                            ? String(
                                  (metadataObj as Record<string, unknown>)[
                                      '1. Information'
                                  ]
                              )
                            : null) ?? inputData.function,
                    symbol:
                        (Boolean(metadataObj) &&
                        typeof metadataObj === 'object' &&
                        metadataObj !== null &&
                        '2. Symbol' in metadataObj
                            ? String(
                                  (metadataObj as Record<string, unknown>)[
                                      '2. Symbol'
                                  ]
                              )
                            : null) ?? inputData.symbol,
                    last_refreshed:
                        Boolean(metadataObj) &&
                        typeof metadataObj === 'object' &&
                        metadataObj !== null &&
                        '3. Last Refreshed' in metadataObj
                            ? String(
                                  (metadataObj as Record<string, unknown>)[
                                      '3. Last Refreshed'
                                  ]
                              )
                            : undefined,
                    interval:
                        Boolean(metadataObj) &&
                        typeof metadataObj === 'object' &&
                        metadataObj !== null &&
                        '4. Interval' in metadataObj
                            ? String(
                                  (metadataObj as Record<string, unknown>)[
                                      '4. Interval'
                                  ]
                              )
                            : undefined,
                    output_size:
                        Boolean(metadataObj) &&
                        typeof metadataObj === 'object' &&
                        metadataObj !== null &&
                        '5. Output Size' in metadataObj
                            ? String(
                                  (metadataObj as Record<string, unknown>)[
                                      '5. Output Size'
                                  ]
                              )
                            : undefined,
                    time_zone:
                        Boolean(metadataObj) &&
                        typeof metadataObj === 'object' &&
                        metadataObj !== null &&
                        '6. Time Zone' in metadataObj
                            ? String(
                                  (metadataObj as Record<string, unknown>)[
                                      '6. Time Zone'
                                  ]
                              )
                            : undefined,
                    indicator: inputData.indicator,
                    time_period: inputData.time_period?.toString(),
                    series_type: inputData.series_type,
                },
            }

            stockFetchSpan?.update({
                output: result,
                metadata: { 'operation.success': true },
            })
            stockFetchSpan?.end()

            rootSpan?.update({
                output: result,
                metadata: { 'tool.success': true },
            })
            rootSpan?.end()

            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'
            if (error instanceof Error) {
                stockFetchSpan?.error({
                    error,
                    endSpan: true,
                })
                rootSpan?.error({
                    error,
                    endSpan: true,
                })
            }
            throw error instanceof Error ? error : new Error(errorMessage)
        }
    },

    toModelOutput: (output) => ({
        type: 'json',
        value: output,
    }),
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        const dataKeys =
            output.data !== null && typeof output.data === 'object'
                ? Object.keys(output.data as object).length
                : 0
        log.info('Alpha Vantage stock completed', {
            toolCallId,
            toolName,
            symbol: output.metadata?.symbol ?? 'unknown',
            dataKeys,
            hook: 'onOutput',
        })
    },
})

/**
 * Legacy Alpha Vantage Tool (General Purpose)
 *
 * Provides access to all financial market data including:
 * - Stock time series data (intraday, daily, weekly, monthly)
 * - Forex exchange rates
 * - Cryptocurrency data
 * - Economic indicators (GDP, inflation, unemployment, etc.)
 * - Technical indicators
 * - Fundamental data
 *
 * Note: For better performance, consider using alphaVantageCryptoTool or alphaVantageStockTool
 * Requires ALPHA_VANTAGE_API_KEY environment variable
 */
export const alphaVantageTool = createTool({
    id: 'alpha-vantage',
    description:
        'Access real-time and historical financial market data from Alpha Vantage including stocks, forex, crypto, and economic indicators. For specialized use cases, consider using alphaVantageCryptoTool or alphaVantageStockTool.',
    inputSchema: z.object({
        function: z
            .enum([
                'TIME_SERIES_INTRADAY',
                'TIME_SERIES_DAILY',
                'TIME_SERIES_WEEKLY',
                'TIME_SERIES_MONTHLY',
                'GLOBAL_QUOTE',
                'SYMBOL_SEARCH',
                'CURRENCY_EXCHANGE_RATE',
                'FX_INTRADAY',
                'FX_DAILY',
                'FX_WEEKLY',
                'FX_MONTHLY',
                'CRYPTO_INTRADAY',
                'CRYPTO_DAILY',
                'CRYPTO_WEEKLY',
                'CRYPTO_MONTHLY',
                'DIGITAL_CURRENCY_DAILY',
                'DIGITAL_CURRENCY_WEEKLY',
                'DIGITAL_CURRENCY_MONTHLY',
                'ECONOMIC_INDICATORS',
                'TECHNICAL_INDICATOR',
                'FUNDAMENTAL_DATA',
            ])
            .describe('Alpha Vantage API function to call'),
        symbol: z
            .string()
            .optional()
            .describe(
                "Stock symbol, currency pair (e.g., 'IBM', 'EURUSD'), or crypto symbol (e.g., 'BTC')"
            ),
        market: z
            .string()
            .optional()
            .describe(
                "Physical currency or digital/crypto currency (e.g., 'USD', 'EUR', 'BTC')"
            ),
        interval: z
            .enum(['1min', '5min', '15min', '30min', '60min'])
            .optional()
            .describe('Time interval for intraday data'),
        outputsize: z
            .enum(['compact', 'full'])
            .optional()
            .describe(
                'Amount of data to return (compact=latest 100, full=all available)'
            ),
        datatype: z
            .enum(['json', 'csv'])
            .optional()
            .describe('Response format'),
        indicator: z
            .string()
            .optional()
            .describe(
                "Technical indicator name (e.g., 'SMA', 'EMA', 'RSI', 'MACD')"
            ),
        time_period: z
            .number()
            .optional()
            .describe('Time period for technical indicators'),
        series_type: z
            .enum(['close', 'open', 'high', 'low'])
            .optional()
            .describe('Price series type for technical indicators'),
        economic_indicator: z
            .enum([
                'REAL_GDP',
                'REAL_GDP_PER_CAPITA',
                'TREASURY_YIELD',
                'FEDERAL_FUNDS_RATE',
                'CPI',
                'INFLATION',
                'INFLATION_EXPECTATION',
                'CONSUMER_SENTIMENT',
                'RETAIL_SALES',
                'DURABLES',
                'UNEMPLOYMENT',
                'NONFARM_PAYROLL',
            ])
            .optional()
            .describe('Economic indicator to retrieve'),
    }),
    outputSchema: z.object({
        data: alphaVantageJsonValueSchema.describe(
            'The financial data returned from Alpha Vantage API'
        ),
        metadata: z
            .object({
                function: z.string(),
                symbol: z.string().optional(),
                last_refreshed: z.string().optional(),
                interval: z.string().optional(),
                output_size: z.string().optional(),
                time_zone: z.string().optional(),
            })
            .optional(),
    }),
    strict: true,
    onInputStart: ({ toolCallId, messages }) => {
        log.info('alphaVantageTool tool input streaming started', {
            toolCallId,
            messages,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages }) => {
        log.info('alphaVantageTool received input chunk', {
            toolCallId,
            inputTextDelta,
            messages,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages }) => {
        log.info('alphaVantageTool received input', {
            toolCallId,
            messages,
            inputData: {
                function: input.function,
                symbol: input.symbol,
                market: input.market,
                interval: input.interval,
                outputsize: input.outputsize,
                datatype: input.datatype,
                indicator: input.indicator,
                time_period: input.time_period,
                series_type: input.series_type,
                economic_indicator: input.economic_indicator,
            },
            hook: 'onInputAvailable',
        })
    },
    execute: async (inputData, context) => {
        const writer = context.writer
        const abortController = createLinkedAbortController(context.abortSignal)
        const abortSignal = abortController.signal
        const tracingContext: TracingContext | undefined =
            context.tracingContext
        const requestContext =
            context.requestContext as RequestContext<AlphaVantageContextExtra>
        const userId = requestContext?.all.userId
        const workspaceId = requestContext?.all.workspaceId

        // Check if operation was already cancelled
        if (abortSignal.aborted) {
            throw new Error('Alpha Vantage general lookup cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                message: `💰 Fetching general Alpha Vantage data for ${inputData.function}`,
                status: 'in-progress',
                stage: 'alpha-vantage',
            },
            id: 'alpha-vantage',
        })

        // Create root span for general tool execution
        const rootSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'alpha-vantage-general',
            input: inputData,
            metadata: {
                'tool.id': 'alpha-vantage',
                'tool.input.function': inputData.function,
                'tool.input.symbol': inputData.symbol,
                'user.id': userId,
                'workspace.id': workspaceId,
            },
            requestContext: context.requestContext,
            tracingContext,
        })

        // Create child span for general data fetch
        const generalFetchSpan = rootSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'alpha-vantage-general-fetch',
            input: inputData,
            metadata: {
                'operation.type': 'fetch-general-data',
                'tool.input.function': inputData.function,
                'tool.input.symbol': inputData.symbol,
            },
        })

        // Create child span for general data fetch

        const apiKey = process.env.ALPHA_VANTAGE_API_KEY

        if (typeof apiKey !== 'string' || apiKey.trim() === '') {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    message: '❌ Missing ALPHA_VANTAGE_API_KEY',
                    status: 'done',
                    stage: 'alpha-vantage',
                },
                id: 'alpha-vantage',
            })
            throw new Error(
                'ALPHA_VANTAGE_API_KEY environment variable is required'
            )
        }
        toolCallCounters.set(
            'alpha-vantage',
            (toolCallCounters.get('alpha-vantage') ?? 0) + 1
        )
        try {
            const params = new URLSearchParams({
                apikey: apiKey,
                function: inputData.function,
            })

            // Add function-specific parameters
            if (inputData.symbol !== undefined) {
                params.append('symbol', inputData.symbol)
            }
            if (inputData.market !== undefined) {
                params.append('market', inputData.market)
            }
            if (inputData.interval !== undefined) {
                params.append('interval', inputData.interval)
            }
            if (inputData.outputsize !== undefined) {
                params.append('outputsize', inputData.outputsize)
            }
            if (inputData.datatype !== undefined) {
                params.append('datatype', inputData.datatype ?? 'json')
            }

            // Technical indicator parameters
            if (
                inputData.indicator !== undefined
            ) {
                params.append('indicator', inputData.indicator)
            }
            if (
                inputData.time_period !== undefined
            ) {
                params.append('time_period', inputData.time_period.toString())
            }
            if (inputData.series_type !== undefined) {
                params.append('series_type', inputData.series_type)
            }

            // Economic indicator
            if (inputData.economic_indicator !== undefined) {
                params.append('function', inputData.economic_indicator)
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    message: '📡 Querying Alpha Vantage API...',
                    status: 'in-progress',
                    stage: 'alpha-vantage',
                },
                id: 'alpha-vantage',
            })

            const url = `https://www.alphavantage.co/query?${params.toString()}`

            const resp = await httpFetch(url, {
                method: 'GET',
                timeout: 30000,
                responseType: 'json',
            })

            if (
                typeof resp.status !== 'number' ||
                resp.status < 200 ||
                resp.status >= 300
            ) {
                throw new Error(
                    `Alpha Vantage API error: ${String(resp.status)} ${resp.statusText}`
                )
            }

            const { data } = resp

            const dataObj = data

            // Check for API-specific errors
            if (
                Boolean(dataObj) &&
                typeof dataObj === 'object' &&
                dataObj !== null &&
                'Error Message' in (dataObj as Record<string, unknown>)
            ) {
                const apiError = (dataObj as Record<string, unknown>)['Error Message']
                const apiErrorText = normalizeApiMessage(apiError).trim()
                if (apiErrorText !== '') {
                    throw new Error(apiErrorText)
                }
            }

            if (
                Boolean(dataObj) &&
                typeof dataObj === 'object' &&
                dataObj !== null &&
                'Note' in (dataObj as Record<string, unknown>)
            ) {
                const apiNote = (dataObj as Record<string, unknown>).Note
                const apiNoteText = normalizeApiMessage(apiNote).trim()
                if (apiNoteText !== '') {
                    throw new Error(apiNoteText) // API limit reached
                }
            }

            // Extract metadata if available
            const metadata =
                (Boolean(dataObj) &&
                typeof dataObj === 'object' &&
                dataObj !== null &&
                'Meta Data' in dataObj
                    ? (dataObj as Record<string, unknown>)['Meta Data']
                    : null) ??
                (Boolean(dataObj) &&
                typeof dataObj === 'object' &&
                dataObj !== null &&
                'meta' in dataObj
                    ? (dataObj as Record<string, unknown>).meta
                    : null) ??
                {}

            const metadataObj = metadata as unknown

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    message: `✅ General data ready for ${inputData.function}`,
                    status: 'done',
                    stage: 'alpha-vantage',
                },
                id: 'alpha-vantage',
            })

            const result = {
                data,
                metadata: {
                    function:
                        (Boolean(metadataObj) &&
                        typeof metadataObj === 'object' &&
                        metadataObj !== null &&
                        '1. Information' in metadataObj
                            ? String(
                                  (metadataObj as Record<string, unknown>)[
                                      '1. Information'
                                  ]
                              )
                            : null) ?? inputData.function,
                    symbol:
                        (Boolean(metadataObj) &&
                        typeof metadataObj === 'object' &&
                        metadataObj !== null &&
                        '2. Symbol' in metadataObj
                            ? String(
                                  (metadataObj as Record<string, unknown>)[
                                      '2. Symbol'
                                  ]
                              )
                            : null) ?? inputData.symbol,
                    last_refreshed:
                        Boolean(metadataObj) &&
                        typeof metadataObj === 'object' &&
                        metadataObj !== null &&
                        '3. Last Refreshed' in metadataObj
                            ? String(
                                  (metadataObj as Record<string, unknown>)[
                                      '3. Last Refreshed'
                                  ]
                              )
                            : undefined,
                    interval:
                        Boolean(metadataObj) &&
                        typeof metadataObj === 'object' &&
                        metadataObj !== null &&
                        '4. Interval' in metadataObj
                            ? String(
                                  (metadataObj as Record<string, unknown>)[
                                      '4. Interval'
                                  ]
                              )
                            : undefined,
                    output_size:
                        Boolean(metadataObj) &&
                        typeof metadataObj === 'object' &&
                        metadataObj !== null &&
                        '5. Output Size' in metadataObj
                            ? String(
                                  (metadataObj as Record<string, unknown>)[
                                      '5. Output Size'
                                  ]
                              )
                            : undefined,
                    time_zone:
                        Boolean(metadataObj) &&
                        typeof metadataObj === 'object' &&
                        metadataObj !== null &&
                        '6. Time Zone' in metadataObj
                            ? String(
                                  (metadataObj as Record<string, unknown>)[
                                      '6. Time Zone'
                                  ]
                              )
                            : undefined,
                },
            }

            generalFetchSpan?.update({
                output: result,
                metadata: { 'operation.success': true },
            })
            generalFetchSpan?.end()

            rootSpan?.update({
                output: result,
                metadata: { 'tool.success': true },
            })
            rootSpan?.end()

            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'
            if (error instanceof Error) {
                generalFetchSpan?.error({
                    error,
                    endSpan: true,
                })
                rootSpan?.error({
                    error,
                    endSpan: true,
                })
            }
            throw error instanceof Error ? error : new Error(errorMessage)
        }
    },
    toModelOutput: (output) => ({
        type: 'json',
        value: output,
    }),
    onOutput: ({ output, toolCallId, toolName }) => {
        const dataKeys =
            output.data !== null && typeof output.data === 'object'
                ? Object.keys(output.data as object).length
                : 0
        log.info('alphaVantageTool completed', {
            toolCallId,
            toolName,
            function: output.metadata?.function ?? 'unknown',
            dataKeys,
            hook: 'onOutput',
        })
    },
})

export type AlphaVantageCryptoUITool = InferUITool<
    typeof alphaVantageCryptoTool
>
export type AlphaVantageStockUITool = InferUITool<typeof alphaVantageStockTool>
export type AlphaVantageUITool = InferUITool<typeof alphaVantageTool>
