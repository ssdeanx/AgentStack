import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { RequestContext } from '@mastra/core/request-context'
import {
    logStepStart,
    logStepEnd,
    logError,
    logToolExecution,
    log,
} from '../config/logger'
import { trace } from '@opentelemetry/api'

/**
 * Governance-aware Runtime Context for Polygon.io tools
 * Includes security, tenant, and access control information
 */
interface PolygonRuntimeContext extends RequestContext {
    // API Configuration
    baseUrl?: string
    timeout?: number
    retryAttempts?: number

    // Governance & Security Context
    userId?: string
    tenantId?: string
    roles?: string[]
    subscriptionTier?: 'free' | 'pro' | 'enterprise'
    classificationLevel?: 'public' | 'internal' | 'confidential'
    currentTime?: Date
    sessionId?: string

    // Access Control
    allowedClassifications?: string[]
    maxRequestsPerHour?: number
    rateLimitRemaining?: number

    // Audit & Compliance
    requestId?: string
    correlationId?: string
    source?: string
}

/**
 * Polygon.io Stock Quotes Tool
 *
 * Specialized for real-time stock market quotes and trades:
 * - Real-time quotes (QUOTES)
 * - Recent trades (TRADES)
 * - Market snapshots (SNAPSHOT)
 * - Previous close prices (PREVIOUS_CLOSE)
 *
 * Requires POLYGON_API_KEY environment variable or runtimeContext.apiKey
 */
export const polygonStockQuotesTool = createTool({
    id: 'polygon-stock-quotes',
    description:
        'Access real-time stock quotes, trades, and market snapshots from Polygon.io',
    inputSchema: z.object({
        function: z
            .enum(['QUOTES', 'TRADES', 'SNAPSHOT', 'PREVIOUS_CLOSE'])
            .describe('Polygon.io stock quotes function'),
        symbol: z
            .string()
            .describe("Stock symbol (e.g., 'AAPL', 'MSFT', 'GOOGL')"),
        limit: z
            .number()
            .optional()
            .describe('Maximum number of results to return (max 50000)'),
        sort: z
            .enum(['asc', 'desc'])
            .optional()
            .describe('Sort order for results'),
    }),
    outputSchema: z.object({
        data: z
            .any()
            .describe('The stock quotes data returned from Polygon.io API'),
        metadata: z
            .object({
                function: z.string(),
                symbol: z.string().optional(),
                status: z.string().optional(),
                request_id: z.string().optional(),
                count: z.number().optional(),
            })
            .optional(),
        error: z.string().optional(),
    }),

    execute: async (inputData, context) => {
        const startTime = Date.now()
        const writer = context?.writer
        const requestContext = context?.requestContext
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Polygon stock quotes cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Input: symbol="${inputData.symbol}", function="${inputData.function}" - 📈 Fetching stock quotes`,
                stage: 'polygon-stock-quotes',
            },
            id: 'polygon-stock-quotes',
        })

        const apiKey = process.env.POLYGON_API_KEY

        // Governance checks
        const governanceCtx = requestContext as PolygonRuntimeContext
        const userId = governanceCtx?.userId
        const tenantId = governanceCtx?.tenantId
        const roles = governanceCtx?.roles ?? []
        const subscriptionTier = governanceCtx?.subscriptionTier ?? 'free'
        const classificationLevel =
            governanceCtx?.classificationLevel ?? 'public'
        const currentTime = governanceCtx?.currentTime ?? new Date()

        logToolExecution('polygon-stock-quotes', { input: inputData })

        // Create root tracing span with governance context
        const tracer = trace.getTracer('polygon-tools')
        const rootSpan = tracer.startSpan('polygon-stock-quotes-tool', {
            attributes: {
                'tool.id': 'polygon-stock-quotes',
                'tool.input.function': inputData.function,
                'tool.input.symbol': inputData.symbol,
                'tool.input.limit': inputData.limit,
                'tool.input.sort': inputData.sort,
                'governance.userId': userId,
                'governance.tenantId': tenantId,
                'governance.subscriptionTier': subscriptionTier,
            },
        })

        // Log governance context for audit
        logToolExecution('polygon-stock-quotes', {
            input: inputData,
            governance: {
                userId,
                tenantId,
                roles,
                subscriptionTier,
                classificationLevel,
                currentTime: currentTime.toISOString(),
                requestId: governanceCtx?.requestId,
                correlationId: governanceCtx?.correlationId,
            },
        })

        if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
            const error =
                'POLYGON_API_KEY environment variable or runtimeContext.apiKey is required'
            logError('polygon-stock-quotes', new Error(error), {
                input: inputData,
                governance: { userId, tenantId, roles, subscriptionTier },
            })

            rootSpan.recordException(new Error(error))
            rootSpan.setAttributes({
                error: true,
                'error.message': error,
                operation: 'polygon-stock-quotes',
                reason: 'missing-api-key',
            })
            rootSpan.end()

            throw new Error(error)
        }

        try {
            let url: string

            switch (inputData.function) {
                case 'QUOTES':
                    url = `https://api.polygon.io/v3/quotes/${inputData.symbol}`
                    break
                case 'TRADES':
                    url = `https://api.polygon.io/v3/trades/${inputData.symbol}`
                    break
                case 'SNAPSHOT':
                    url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${inputData.symbol}`
                    break
                case 'PREVIOUS_CLOSE':
                    url = `https://api.polygon.io/v2/aggs/ticker/${inputData.symbol}/prev`
                    break
                default: {
                    const error = `Unsupported function: ${inputData.function}`
                    logError('polygon-stock-quotes', new Error(error), {
                        input: inputData,
                    })

                    rootSpan.recordException(new Error(error))
                    rootSpan.setAttributes({
                        error: true,
                        'error.message': error,
                        operation: 'polygon-stock-quotes',
                        reason: 'unsupported-function',
                    })
                    rootSpan.end()

                    throw new Error(error)
                }
            }

            // Add API key and optional parameters
            const params = new URLSearchParams()
            params.append('apiKey', apiKey)

            if (inputData.limit !== undefined && inputData.limit !== null) {
                params.append('limit', inputData.limit.toString())
            }
            if (inputData.sort !== undefined && inputData.sort !== null) {
                params.append('sort', inputData.sort)
            }

            const finalUrl = `${url}?${params.toString()}`
            const redactedUrl = apiKey
                ? finalUrl.replace(apiKey, '[REDACTED]')
                : finalUrl

            // Create child span for API call
            const apiSpan = tracer.startSpan('polygon-api-call', {
                attributes: {
                    'http.url': redactedUrl,
                    'http.method': 'GET',
                },
            })

            logStepStart('polygon-api-call', {
                function: inputData.function,
                symbol: inputData.symbol,
                url: redactedUrl,
            })

            const apiStartTime = Date.now()
            const response = await fetch(finalUrl)
            const data = await response.json()
            const apiDuration = Date.now() - apiStartTime

            apiSpan.setAttributes({
                'http.status_code': response.status,
                'http.status_text': response.statusText,
                'response.size': JSON.stringify(data).length,
            })
            apiSpan.end()

            logStepEnd(
                'polygon-api-call',
                {
                    status: response.status,
                    dataSize: JSON.stringify(data).length,
                },
                apiDuration
            )

            // Check for API errors
            if (
                data !== null &&
                typeof data === 'object' &&
                'error' in (data as Record<string, unknown>)
            ) {
                const errorValue = (data as Record<string, unknown>)['error']
                if (
                    errorValue !== null &&
                    errorValue !== undefined &&
                    String(errorValue).trim() !== ''
                ) {
                    const error = String(errorValue)
                    logError('polygon-stock-quotes', new Error(error), {
                        input: inputData,
                        responseStatus: response.status,
                    })

                    rootSpan.recordException(new Error(error))
                    rootSpan.setAttributes({
                        error: true,
                        'error.message': error,
                        operation: 'polygon-stock-quotes',
                        reason: 'api-error',
                        'http.status_code': response.status,
                    })
                    rootSpan.end()

                    throw new Error(error)
                }
            }

            const result = {
                data,
                metadata: {
                    function: inputData.function,
                    symbol: inputData.symbol,
                    status: data.status,
                    request_id: data.request_id,
                    count: data.count,
                },
                error: undefined,
            }

            const totalDuration = Date.now() - startTime
            logStepEnd(
                'polygon-stock-quotes',
                {
                    success: true,
                    function: inputData.function,
                    symbol: inputData.symbol,
                    dataPoints:
                        data !== null &&
                        typeof data === 'object' &&
                        'count' in data &&
                        typeof data.count === 'number'
                            ? data.count
                            : 0,
                },
                totalDuration
            )

            rootSpan.setAttributes({
                success: true,
                'output.count':
                    data !== null &&
                    typeof data === 'object' &&
                    'count' in data &&
                    typeof data.count === 'number'
                        ? data.count
                        : 0,
                processing_time_ms: totalDuration,
            })
            rootSpan.end()

            return result
        } catch (error) {
            const totalDuration = Date.now() - startTime
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'

            logError('polygon-stock-quotes', error, {
                input: inputData,
                processingTimeMs: totalDuration,
            })

            rootSpan.recordException(
                error instanceof Error ? error : new Error(errorMessage)
            )
            rootSpan.setAttributes({
                error: true,
                'error.message': errorMessage,
                operation: 'polygon-stock-quotes',
                processing_time_ms: totalDuration,
            })
            rootSpan.end()

            throw error instanceof Error ? error : new Error(errorMessage)
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Polygon stock quotes tool input streaming started', {
            toolCallId,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Polygon stock quotes tool received input chunk', {
            toolCallId,
            inputTextDelta,
            abortSignal: abortSignal?.aborted,
            messageCount: messages.length,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Polygon stock quotes received input', {
            toolCallId,
            abortSignal: abortSignal?.aborted,
            inputData: {
                symbol: input.symbol,
                function: input.function,
                limit: input.limit,
                sort: input.sort,
            },
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        const hasError = !!output.error
        const dataPoints = output.metadata?.count ?? 0
        log[hasError ? 'warn' : 'info']('Polygon stock quotes completed', {
            toolCallId,
            toolName,
            abortSignal: abortSignal?.aborted,
            outputData: {
                symbol: output.metadata?.symbol,
                dataPoints,
                hasError,
                error: output.error,
            },
            hook: 'onOutput',
        })
    },
})

export type PolygonStockQuotesUITool = InferUITool<
    typeof polygonStockQuotesTool
>

/**
 * Polygon.io Stock Aggregates Tool
 *
 * Specialized for historical stock price aggregates (bars):
 * - Historical price bars with customizable timeframes
 * - Support for different multipliers and timespans
 * - Date range filtering
 *
 * Requires POLYGON_API_KEY environment variable
 */
export const polygonStockAggregatesTool = createTool({
    id: 'polygon-stock-aggregates',
    description:
        'Access historical stock price aggregates (bars) from Polygon.io with customizable timeframes',
    inputSchema: z.object({
        symbol: z
            .string()
            .describe("Stock symbol (e.g., 'AAPL', 'MSFT', 'GOOGL')"),
        multiplier: z
            .number()
            .describe('Multiplier for aggregate bars (e.g., 1, 5, 15)'),
        timespan: z
            .enum(['minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'])
            .describe('Timespan for aggregate bars'),
        from: z
            .string()
            .optional()
            .describe('Start date for historical data (YYYY-MM-DD)'),
        to: z
            .string()
            .optional()
            .describe('End date for historical data (YYYY-MM-DD)'),
        limit: z
            .number()
            .optional()
            .describe('Maximum number of results to return (max 50000)'),
        sort: z
            .enum(['asc', 'desc'])
            .optional()
            .describe('Sort order for results'),
    }),
    outputSchema: z.object({
        data: z
            .any()
            .describe('The stock aggregates data returned from Polygon.io API'),
        metadata: z
            .object({
                symbol: z.string().optional(),
                status: z.string().optional(),
                request_id: z.string().optional(),
                count: z.number().optional(),
                multiplier: z.number().optional(),
                timespan: z.string().optional(),
                from: z.string().optional(),
                to: z.string().optional(),
            })
            .optional(),
        error: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const startTime = Date.now()
        const writer = context?.writer
        const requestContext = context?.requestContext

        logToolExecution('polygon-stock-aggregates', { input: inputData })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                message: `Fetching stock aggregates for ${inputData.symbol}`,
            },
        })

        const tracer = trace.getTracer('polygon-tools')
        const rootSpan = tracer.startSpan('polygon-stock-aggregates-tool', {
            attributes: {
                'tool.id': 'polygon-stock-aggregates',
                'tool.input.symbol': inputData.symbol,
                'tool.input.multiplier': inputData.multiplier,
                'tool.input.timespan': inputData.timespan,
                'tool.input.from': inputData.from,
                'tool.input.to': inputData.to,
            },
        })

        const apiKey = process.env.POLYGON_API_KEY

        // Governance checks
        const governanceCtx = requestContext as PolygonRuntimeContext
        const userId = governanceCtx?.userId
        const tenantId = governanceCtx?.tenantId
        const roles = governanceCtx?.roles ?? []
        const subscriptionTier = governanceCtx?.subscriptionTier ?? 'free'
        const classificationLevel =
            governanceCtx?.classificationLevel ?? 'public'
        const currentTime = governanceCtx?.currentTime ?? new Date()

        logToolExecution('polygon-stock-aggregates', {
            input: inputData,
            governance: {
                userId,
                tenantId,
                roles,
                subscriptionTier,
                classificationLevel,
                currentTime,
                requestId: governanceCtx?.requestId,
                correlationId: governanceCtx?.correlationId,
            },
        })

        if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
            const error =
                'POLYGON_API_KEY environment variable or runtimeContext.apiKey is required'
            logError('polygon-stock-aggregates', new Error(error), {
                input: inputData,
            })

            rootSpan.recordException(new Error(error))
            rootSpan.setAttributes({
                error: true,
                'error.message': error,
                reason: 'missing-api-key',
            })
            rootSpan.end()

            throw new Error(error)
        }

        if (
            inputData.multiplier === undefined ||
            inputData.multiplier === null ||
            inputData.multiplier <= 0 ||
            isNaN(inputData.multiplier)
        ) {
            const error = 'Multiplier must be a positive number'
            logError('polygon-stock-aggregates', new Error(error), {
                input: inputData,
            })

            rootSpan.recordException(new Error(error))
            rootSpan.setAttributes({
                error: true,
                'error.message': error,
                reason: 'invalid-multiplier',
            })
            rootSpan.end()

            throw new Error(error)
        }

        try {
            const url = `https://api.polygon.io/v2/aggs/ticker/${inputData.symbol}/range/${inputData.multiplier}/${inputData.timespan}/${inputData.from ?? '2020-01-01'}/${inputData.to ?? new Date().toISOString().split('T')[0]}`

            // Add API key and optional parameters
            const params = new URLSearchParams()
            params.append('apiKey', apiKey)

            if (inputData.limit !== undefined && inputData.limit !== null) {
                params.append('limit', inputData.limit.toString())
            }
            if (inputData.sort !== undefined && inputData.sort !== null) {
                params.append('sort', inputData.sort)
            }

            const finalUrl = `${url}?${params.toString()}`
            const redactedUrl = apiKey
                ? finalUrl.replace(apiKey, '[REDACTED]')
                : finalUrl

            // Create child span for API call
            const apiSpan = tracer.startSpan('polygon-api-call', {
                attributes: {
                    'http.url': redactedUrl,
                    'http.method': 'GET',
                },
            })

            logStepStart('polygon-api-call', {
                symbol: inputData.symbol,
                multiplier: inputData.multiplier,
                timespan: inputData.timespan,
                url: redactedUrl,
            })

            const apiStartTime = Date.now()
            const response = await fetch(finalUrl)
            const data = await response.json()
            const apiDuration = Date.now() - apiStartTime

            apiSpan.setAttributes({
                'http.status_code': response.status,
                'response.size': JSON.stringify(data).length,
            })
            apiSpan.end()

            logStepEnd(
                'polygon-api-call',
                {
                    status: response.status,
                    dataSize: JSON.stringify(data).length,
                },
                apiDuration
            )

            // Check for API errors
            if (
                data !== null &&
                typeof data === 'object' &&
                'error' in (data as Record<string, unknown>)
            ) {
                const errorValue = (data as Record<string, unknown>)['error']
                if (
                    errorValue !== null &&
                    errorValue !== undefined &&
                    String(errorValue).trim() !== ''
                ) {
                    const error = String(errorValue)
                    logError('polygon-stock-aggregates', new Error(error), {
                        input: inputData,
                        responseStatus: response.status,
                    })

                    rootSpan.recordException(new Error(error))
                    rootSpan.setAttributes({
                        error: true,
                        'error.message': error,
                        reason: 'api-error',
                        'http.status_code': response.status,
                    })
                    rootSpan.end()

                    throw new Error(error)
                }
            }

            const result = {
                data,
                metadata: {
                    symbol: inputData.symbol,
                    status: data.status,
                    request_id: data.request_id,
                    count: data.count,
                    multiplier: inputData.multiplier,
                    timespan: inputData.timespan,
                    from: inputData.from,
                    to: inputData.to,
                },
                error: undefined,
            }

            const totalDuration = Date.now() - startTime
            logStepEnd(
                'polygon-stock-aggregates',
                {
                    success: true,
                    symbol: inputData.symbol,
                    dataPoints:
                        data !== null &&
                        typeof data === 'object' &&
                        'count' in data &&
                        typeof data.count === 'number'
                            ? data.count
                            : 0,
                },
                totalDuration
            )

            rootSpan.setAttributes({
                success: true,
                'output.count':
                    data !== null &&
                    typeof data === 'object' &&
                    'count' in data &&
                    typeof data.count === 'number'
                        ? data.count
                        : 0,
                processing_time_ms: totalDuration,
            })
            rootSpan.end()

            return result
        } catch (error) {
            const totalDuration = Date.now() - startTime
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'

            logError('polygon-stock-aggregates', error, {
                input: inputData,
                processingTimeMs: totalDuration,
            })

            rootSpan.recordException(
                error instanceof Error ? error : new Error(errorMessage)
            )
            rootSpan.setAttributes({
                error: true,
                'error.message': errorMessage,
                processing_time_ms: totalDuration,
            })
            rootSpan.end()

            throw error instanceof Error ? error : new Error(errorMessage)
        }
    },
})

export type PolygonStockAggregatesUITool = InferUITool<
    typeof polygonStockAggregatesTool
>

/**
 * Polygon.io Stock Fundamentals Tool
 *
 * Specialized for company fundamentals and reference data:
 * - Company profiles and information (COMPANY)
 * - Dividend history (DIVIDENDS)
 * - Stock split history (SPLITS)
 * - Financial statements (FINANCIALS)
 *
 * Requires POLYGON_API_KEY environment variable
 */
export const polygonStockFundamentalsTool = createTool({
    id: 'polygon-stock-fundamentals',
    description:
        'Access company fundamentals and reference data from Polygon.io including profiles, dividends, and splits',
    inputSchema: z.object({
        function: z
            .enum(['COMPANY', 'DIVIDENDS', 'SPLITS', 'FINANCIALS'])
            .describe('Polygon.io stock fundamentals function'),
        symbol: z
            .string()
            .optional()
            .describe(
                "Stock symbol (e.g., 'AAPL', 'MSFT', 'GOOGL') - required for COMPANY and FINANCIALS"
            ),
        limit: z
            .number()
            .optional()
            .describe('Maximum number of results to return (max 50000)'),
        sort: z
            .enum(['asc', 'desc'])
            .optional()
            .describe('Sort order for results'),
    }),
    outputSchema: z.object({
        data: z
            .any()
            .describe(
                'The stock fundamentals data returned from Polygon.io API'
            ),
        metadata: z
            .object({
                function: z.string(),
                symbol: z.string().optional(),
                status: z.string().optional(),
                request_id: z.string().optional(),
                count: z.number().optional(),
            })
            .optional(),
    }),
    execute: async (inputData, context) => {
        const startTime = Date.now()
        const writer = context?.writer
        const requestContext = context?.requestContext
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Polygon stock fundamentals cancelled')
        }

        logToolExecution('polygon-stock-fundamentals', { input: inputData })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                message: `Fetching stock fundamentals (${inputData.function})`,
            },
        })

        const tracer = trace.getTracer('polygon-tools')
        const rootSpan = tracer.startSpan('polygon-stock-fundamentals-tool', {
            attributes: {
                'tool.id': 'polygon-stock-fundamentals',
                'tool.input.function': inputData.function,
                'tool.input.symbol': inputData.symbol,
            },
        })

        const apiKey = process.env.POLYGON_API_KEY
        // Governance checks
        const governanceCtx = requestContext as PolygonRuntimeContext
        const userId = governanceCtx?.userId
        const tenantId = governanceCtx?.tenantId
        const roles = governanceCtx?.roles ?? []
        const subscriptionTier = governanceCtx?.subscriptionTier ?? 'free'
        const classificationLevel =
            governanceCtx?.classificationLevel ?? 'public'
        const currentTime = governanceCtx?.currentTime ?? new Date()

        logToolExecution('polygon-stock-fundamentals', {
            input: inputData,
            governance: {
                userId,
                tenantId,
                roles,
                subscriptionTier,
                classificationLevel,
                currentTime,
                requestId: governanceCtx?.requestId,
                correlationId: governanceCtx?.correlationId,
            },
        })

        if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
            const error =
                'POLYGON_API_KEY environment variable or runtimeContext.apiKey is required'
            logError('polygon-stock-fundamentals', new Error(error), {
                input: inputData,
            })

            rootSpan.recordException(new Error(error))
            rootSpan.setAttributes({
                error: true,
                'error.message': error,
                reason: 'missing-api-key',
            })
            rootSpan.end()

            throw new Error(error)
        }

        try {
            let url: string

            switch (inputData.function) {
                case 'COMPANY':
                    if (
                        inputData.symbol === undefined ||
                        inputData.symbol === null ||
                        inputData.symbol.trim() === ''
                    ) {
                        const error =
                            'COMPANY function requires symbol parameter'
                        logError(
                            'polygon-stock-fundamentals',
                            new Error(error),
                            { input: inputData }
                        )

                        rootSpan.recordException(new Error(error))
                        rootSpan.setAttributes({
                            error: true,
                            'error.message': error,
                            reason: 'missing-symbol',
                        })
                        rootSpan.end()

                        throw new Error(error)
                    }
                    url = `https://api.polygon.io/v3/reference/tickers/${inputData.symbol}`
                    break
                case 'DIVIDENDS':
                    url = `https://api.polygon.io/v3/reference/dividends`
                    break
                case 'SPLITS':
                    url = `https://api.polygon.io/v3/reference/splits`
                    break
                case 'FINANCIALS':
                    if (
                        inputData.symbol === undefined ||
                        inputData.symbol === null ||
                        inputData.symbol.trim() === ''
                    ) {
                        const error =
                            'FINANCIALS function requires symbol parameter'
                        logError(
                            'polygon-stock-fundamentals',
                            new Error(error),
                            { input: inputData }
                        )

                        rootSpan.recordException(new Error(error))
                        rootSpan.setAttributes({
                            error: true,
                            'error.message': error,
                            reason: 'missing-symbol',
                        })
                        rootSpan.end()

                        throw new Error(error)
                    }
                    url = `https://api.polygon.io/v3/reference/financials`
                    break
                default: {
                    const error = `Unsupported function: ${inputData.function}`
                    logError('polygon-stock-fundamentals', new Error(error), {
                        input: inputData,
                    })

                    rootSpan.recordException(new Error(error))
                    rootSpan.setAttributes({
                        error: true,
                        'error.message': error,
                        reason: 'unsupported-function',
                    })
                    rootSpan.end()

                    throw new Error(error)
                }
            }

            // Add API key and optional parameters
            const params = new URLSearchParams()
            params.append('apiKey', apiKey)

            if (
                inputData.symbol !== undefined &&
                inputData.symbol !== null &&
                inputData.symbol.trim() !== ''
            ) {
                params.append('ticker', inputData.symbol)
            }
            if (inputData.limit !== undefined && inputData.limit !== null) {
                params.append('limit', inputData.limit.toString())
            }
            if (inputData.sort !== undefined && inputData.sort !== null) {
                params.append('sort', inputData.sort)
            }

            const finalUrl = `${url}?${params.toString()}`
            const redactedUrl = apiKey
                ? finalUrl.replace(apiKey, '[REDACTED]')
                : finalUrl

            // Create child span for API call
            const apiSpan = tracer.startSpan('polygon-api-call', {
                attributes: {
                    'http.url': redactedUrl,
                    'http.method': 'GET',
                },
            })

            // Check for cancellation before API call
            if (abortSignal?.aborted) {
                rootSpan.setStatus({
                    code: 2,
                    message: 'Operation cancelled during API call',
                })
                rootSpan.end()
                throw new Error(
                    'Polygon stock quotes cancelled during API call'
                )
            }

            logStepStart('polygon-api-call', {
                function: inputData.function,
                symbol: inputData.symbol,
                url: redactedUrl,
            })

            const apiStartTime = Date.now()
            const response = await fetch(finalUrl)
            const data = await response.json()
            const apiDuration = Date.now() - apiStartTime

            apiSpan.setAttributes({
                'http.status_code': response.status,
                'response.size': JSON.stringify(data).length,
            })
            apiSpan.end()

            logStepEnd(
                'polygon-api-call',
                {
                    status: response.status,
                    dataSize: JSON.stringify(data).length,
                },
                apiDuration
            )

            // Check for API errors
            if (
                data !== null &&
                typeof data === 'object' &&
                'error' in (data as Record<string, unknown>)
            ) {
                const errorValue = (data as Record<string, unknown>)['error']
                if (
                    errorValue !== null &&
                    errorValue !== undefined &&
                    String(errorValue).trim() !== ''
                ) {
                    const error = String(errorValue)
                    logError('polygon-stock-fundamentals', new Error(error), {
                        input: inputData,
                        responseStatus: response.status,
                    })

                    rootSpan.recordException(new Error(error))
                    rootSpan.setAttributes({
                        error: true,
                        'error.message': error,
                        reason: 'api-error',
                        'http.status_code': response.status,
                    })
                    rootSpan.end()

                    throw new Error(error)
                }
            }

            const result = {
                data,
                metadata: {
                    function: inputData.function,
                    symbol: inputData.symbol,
                    status: data.status,
                    request_id: data.request_id,
                    count: data.count,
                },
            }

            const totalDuration = Date.now() - startTime
            logStepEnd(
                'polygon-stock-fundamentals',
                {
                    success: true,
                    function: inputData.function,
                    symbol: inputData.symbol,
                    dataPoints:
                        data !== null &&
                        typeof data === 'object' &&
                        'count' in data &&
                        typeof data.count === 'number'
                            ? data.count
                            : 0,
                },
                totalDuration
            )

            rootSpan.setAttributes({
                success: true,
                'output.count':
                    data !== null &&
                    typeof data === 'object' &&
                    'count' in data &&
                    typeof data.count === 'number'
                        ? data.count
                        : 0,
                processing_time_ms: totalDuration,
            })
            rootSpan.end()

            return result
        } catch (error) {
            const totalDuration = Date.now() - startTime
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'

            logError('polygon-stock-fundamentals', error, {
                input: inputData,
                processingTimeMs: totalDuration,
            })

            rootSpan.recordException(
                error instanceof Error ? error : new Error(errorMessage)
            )
            rootSpan.setAttributes({
                error: true,
                'error.message': errorMessage,
                processing_time_ms: totalDuration,
            })
            rootSpan.end()

            throw error instanceof Error ? error : new Error(errorMessage)
        }
    },
})

export type PolygonStockFundamentalsUITool = InferUITool<
    typeof polygonStockFundamentalsTool
>

/**
 * Polygon.io Crypto Quotes Tool
 *
 * Specialized for real-time cryptocurrency quotes and trades:
 * - Real-time crypto quotes (QUOTES)
 * - Recent crypto trades (TRADES)
 * - Individual crypto snapshots (SNAPSHOT_SINGLE)
 *
 * Requires POLYGON_API_KEY environment variable
 */
export const polygonCryptoQuotesTool = createTool({
    id: 'polygon-crypto-quotes',
    description:
        'Access real-time cryptocurrency quotes, trades, and individual snapshots from Polygon.io',
    inputSchema: z.object({
        function: z
            .enum(['QUOTES', 'TRADES', 'SNAPSHOT_SINGLE'])
            .describe('Polygon.io crypto quotes function'),
        symbol: z
            .string()
            .describe("Crypto symbol (e.g., 'X:BTC-USD', 'X:ETH-USD')"),
        limit: z
            .number()
            .optional()
            .describe('Maximum number of results to return (max 50000)'),
    }),
    outputSchema: z.object({
        data: z
            .any()
            .describe('The crypto quotes data returned from Polygon.io API'),
        metadata: z
            .object({
                function: z.string(),
                symbol: z.string().optional(),
                status: z.string().optional(),
                request_id: z.string().optional(),
                count: z.number().optional(),
            })
            .optional(),
        error: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const startTime = Date.now()
        const writer = context?.writer
        const requestContext = context?.requestContext
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Polygon crypto quotes cancelled')
        }

        logToolExecution('polygon-crypto-quotes', { input: inputData })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                message: `Fetching crypto quotes (${inputData.function}) for ${inputData.symbol}`,
            },
        })

        const tracer = trace.getTracer('polygon-tools')
        const rootSpan = tracer.startSpan('polygon-crypto-quotes-tool', {
            attributes: {
                'tool.id': 'polygon-crypto-quotes',
                'tool.input.function': inputData.function,
                'tool.input.symbol': inputData.symbol,
                'tool.input.limit': inputData.limit,
            },
        })

        const apiKey = process.env.POLYGON_API_KEY
        // Governance checks
        const governanceCtx = requestContext as PolygonRuntimeContext
        const userId = governanceCtx?.userId
        const tenantId = governanceCtx?.tenantId
        const roles = governanceCtx?.roles ?? []
        const subscriptionTier = governanceCtx?.subscriptionTier ?? 'free'
        const classificationLevel =
            governanceCtx?.classificationLevel ?? 'public'
        const currentTime = governanceCtx?.currentTime ?? new Date()

        logToolExecution('polygon-crypto-quotes', {
            input: inputData,
            governance: {
                userId,
                tenantId,
                roles,
                subscriptionTier,
                classificationLevel,
                currentTime,
                requestId: governanceCtx?.requestId,
                correlationId: governanceCtx?.correlationId,
            },
        })

        if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
            const error =
                'POLYGON_API_KEY environment variable or runtimeContext.apiKey is required'
            logError('polygon-crypto-quotes', new Error(error), {
                input: inputData,
            })

            rootSpan.recordException(new Error(error))
            rootSpan.setAttributes({
                error: true,
                'error.message': error,
                reason: 'missing-api-key',
            })
            rootSpan.end()

            throw new Error(error)
        }

        try {
            let url: string

            switch (inputData.function) {
                case 'QUOTES':
                    url = `https://api.polygon.io/v3/quotes/${inputData.symbol}`
                    break
                case 'TRADES':
                    url = `https://api.polygon.io/v3/trades/${inputData.symbol}`
                    break
                case 'SNAPSHOT_SINGLE':
                    url = `https://api.polygon.io/v2/snapshot/locale/global/markets/crypto/tickers/${inputData.symbol}`
                    break
                default: {
                    const error = `Unsupported function: ${inputData.function}`
                    logError('polygon-crypto-quotes', new Error(error), {
                        input: inputData,
                    })

                    rootSpan.recordException(new Error(error))
                    rootSpan.setAttributes({
                        error: true,
                        'error.message': error,
                        reason: 'unsupported-function',
                    })
                    rootSpan.end()

                    throw new Error(error)
                }
            }

            // Add API key and optional parameters
            const params = new URLSearchParams()
            params.append('apiKey', apiKey)

            if (inputData.limit !== undefined && inputData.limit !== null) {
                params.append('limit', inputData.limit.toString())
            }

            const finalUrl = `${url}?${params.toString()}`
            const redactedUrl = apiKey
                ? finalUrl.replace(apiKey, '[REDACTED]')
                : finalUrl

            // Create child span for API call
            const apiSpan = tracer.startSpan('polygon-api-call', {
                attributes: {
                    'http.url': redactedUrl,
                    'http.method': 'GET',
                },
            })

            logStepStart('polygon-api-call', {
                function: inputData.function,
                symbol: inputData.symbol,
                url: redactedUrl,
            })

            const apiStartTime = Date.now()
            const response = await fetch(finalUrl)
            const data = await response.json()
            const apiDuration = Date.now() - apiStartTime

            apiSpan.setAttributes({
                'http.status_code': response.status,
                'response.size': JSON.stringify(data).length,
            })
            apiSpan.end()

            logStepEnd(
                'polygon-api-call',
                {
                    status: response.status,
                    dataSize: JSON.stringify(data).length,
                },
                apiDuration
            )

            // Check for API errors
            if (
                data !== null &&
                typeof data === 'object' &&
                'error' in (data as Record<string, unknown>)
            ) {
                const errorValue = (data as Record<string, unknown>)['error']
                if (
                    errorValue !== null &&
                    errorValue !== undefined &&
                    String(errorValue).trim() !== ''
                ) {
                    const error = String(errorValue)
                    logError('polygon-crypto-quotes', new Error(error), {
                        input: inputData,
                        responseStatus: response.status,
                    })

                    rootSpan.recordException(new Error(error))
                    rootSpan.setAttributes({
                        error: true,
                        'error.message': error,
                        reason: 'api-error',
                        'http.status_code': response.status,
                    })
                    rootSpan.end()

                    throw new Error(error)
                }
            }

            const result = {
                data,
                metadata: {
                    function: inputData.function,
                    symbol: inputData.symbol,
                    status: data.status,
                    request_id: data.request_id,
                    count: data.count,
                },
            }

            const totalDuration = Date.now() - startTime
            logStepEnd(
                'polygon-crypto-quotes',
                {
                    success: true,
                    function: inputData.function,
                    symbol: inputData.symbol,
                    dataPoints:
                        data !== null &&
                        typeof data === 'object' &&
                        'count' in data &&
                        typeof data.count === 'number'
                            ? data.count
                            : 0,
                },
                totalDuration
            )

            rootSpan.setAttributes({
                success: true,
                'output.count':
                    data !== null &&
                    typeof data === 'object' &&
                    'count' in data &&
                    typeof data.count === 'number'
                        ? data.count
                        : 0,
                processing_time_ms: totalDuration,
            })
            rootSpan.end()

            return result
        } catch (error) {
            const totalDuration = Date.now() - startTime
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'

            logError('polygon-crypto-quotes', error, {
                input: inputData,
                processingTimeMs: totalDuration,
            })

            rootSpan.recordException(
                error instanceof Error ? error : new Error(errorMessage)
            )
            rootSpan.setAttributes({
                error: true,
                'error.message': errorMessage,
                processing_time_ms: totalDuration,
            })
            rootSpan.end()

            throw error instanceof Error ? error : new Error(errorMessage)
        }
    },
})

export type PolygonCryptoQuotesUITool = InferUITool<
    typeof polygonCryptoQuotesTool
>

/**
 * Polygon.io Crypto Aggregates Tool
 *
 * Specialized for historical cryptocurrency price aggregates:
 * - Historical crypto price bars with customizable timeframes
 * - Support for different multipliers and timespans
 * - Date range filtering
 *
 * Requires POLYGON_API_KEY environment variable
 */
export const polygonCryptoAggregatesTool = createTool({
    id: 'polygon-crypto-aggregates',
    description:
        'Access historical cryptocurrency price aggregates (bars) from Polygon.io with customizable timeframes',
    inputSchema: z.object({
        symbol: z
            .string()
            .describe("Crypto symbol (e.g., 'X:BTC-USD', 'X:ETH-USD')"),
        multiplier: z
            .number()
            .describe('Multiplier for aggregate bars (e.g., 1, 5, 15)'),
        timespan: z
            .enum(['minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'])
            .describe('Timespan for aggregate bars'),
        from: z
            .string()
            .optional()
            .describe('Start date for historical data (YYYY-MM-DD)'),
        to: z
            .string()
            .optional()
            .describe('End date for historical data (YYYY-MM-DD)'),
        limit: z
            .number()
            .optional()
            .describe('Maximum number of results to return (max 50000)'),
        sort: z
            .enum(['asc', 'desc'])
            .optional()
            .describe('Sort order for results'),
    }),
    outputSchema: z.object({
        data: z
            .any()
            .describe(
                'The crypto aggregates data returned from Polygon.io API'
            ),
        metadata: z
            .object({
                symbol: z.string().optional(),
                status: z.string().optional(),
                request_id: z.string().optional(),
                count: z.number().optional(),
                multiplier: z.number().optional(),
                timespan: z.string().optional(),
                from: z.string().optional(),
                to: z.string().optional(),
            })
            .optional(),
        error: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const startTime = Date.now()
        const writer = context?.writer
        const requestContext = context?.requestContext

        logToolExecution('polygon-crypto-aggregates', { input: inputData })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                message: `Fetching crypto aggregates for ${inputData.symbol}`,
            },
        })

        const tracer = trace.getTracer('polygon-tools')
        const rootSpan = tracer.startSpan('polygon-crypto-aggregates', {
            attributes: {
                'tool.id': 'polygon-crypto-aggregates',
                'tool.input.symbol': inputData.symbol,
                'tool.input.multiplier': inputData.multiplier,
                'tool.input.timespan': inputData.timespan,
            },
        })

        const apiKey = process.env.POLYGON_API_KEY
        // Governance checks
        const governanceCtx = requestContext as PolygonRuntimeContext
        const userId = governanceCtx?.userId
        const tenantId = governanceCtx?.tenantId
        const roles = governanceCtx?.roles ?? []
        const subscriptionTier = governanceCtx?.subscriptionTier ?? 'free'
        const classificationLevel =
            governanceCtx?.classificationLevel ?? 'public'
        const currentTime = governanceCtx?.currentTime ?? new Date()

        logToolExecution('polygon-stock-fundamentals', {
            input: inputData,
            governance: {
                userId,
                tenantId,
                roles,
                subscriptionTier,
                classificationLevel,
                currentTime,
                requestId: governanceCtx?.requestId,
                correlationId: governanceCtx?.correlationId,
            },
        })

        if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
            const error =
                'POLYGON_API_KEY environment variable or runtimeContext.apiKey is required'
            rootSpan.recordException(new Error(error))
            rootSpan.setAttributes({
                error: true,
                'error.message': error,
                reason: 'missing-api-key',
            })
            rootSpan.end()
            logError('polygon-crypto-aggregates', new Error(error), {
                symbol: inputData.symbol,
            })
            throw new Error(error)
        }

        if (
            inputData.multiplier === undefined ||
            inputData.multiplier === null ||
            inputData.multiplier <= 0 ||
            isNaN(inputData.multiplier)
        ) {
            const error = 'Multiplier must be a positive number'
            rootSpan.recordException(new Error(error))
            rootSpan.setAttributes({
                error: true,
                'error.message': error,
                reason: 'invalid-multiplier',
                multiplier: inputData.multiplier,
            })
            rootSpan.end()
            logError('polygon-crypto-aggregates', new Error(error), {
                symbol: inputData.symbol,
                multiplier: inputData.multiplier,
            })
            throw new Error(error)
        }

        try {
            const url = `https://api.polygon.io/v2/aggs/ticker/${inputData.symbol}/range/${inputData.multiplier}/${inputData.timespan}/${inputData.from ?? '2020-01-01'}/${inputData.to ?? new Date().toISOString().split('T')[0]}`

            // Add API key and optional parameters
            const params = new URLSearchParams()
            params.append('apiKey', apiKey)

            if (inputData.limit !== undefined && inputData.limit !== null) {
                params.append('limit', inputData.limit.toString())
            }
            if (inputData.sort !== undefined && inputData.sort !== null) {
                params.append('sort', inputData.sort)
            }

            const finalUrl = `${url}?${params.toString()}`

            // Create child span for API call
            const apiSpan = tracer.startSpan('polygon-api-call', {
                attributes: {
                    'http.url': finalUrl.replace(apiKey, '[REDACTED]'),
                    'http.method': 'GET',
                },
            })

            logStepStart('polygon-api-call', {
                symbol: inputData.symbol,
                url: finalUrl.replace(apiKey, '[REDACTED]'),
            })

            const apiStartTime = Date.now()
            const response = await fetch(finalUrl)
            const data = await response.json()
            const apiDuration = Date.now() - apiStartTime

            apiSpan.setAttributes({
                'http.status_code': response.status,
                'response.size': JSON.stringify(data).length,
                duration_ms: apiDuration,
            })
            apiSpan.end()

            logStepEnd(
                'polygon-api-call',
                {
                    status: response.status,
                    dataSize: JSON.stringify(data).length,
                },
                apiDuration
            )

            // Check for API errors
            if (
                data !== null &&
                typeof data === 'object' &&
                'error' in (data as Record<string, unknown>)
            ) {
                const errorValue = (data as Record<string, unknown>)['error']
                if (
                    errorValue !== null &&
                    errorValue !== undefined &&
                    String(errorValue).trim() !== ''
                ) {
                    const error = String(errorValue)
                    logError('polygon-crypto-aggregates', new Error(error), {
                        input: inputData,
                        responseStatus: response.status,
                    })

                    rootSpan.recordException(new Error(error))
                    rootSpan.setAttributes({
                        error: true,
                        'error.message': error,
                        reason: 'api-error',
                        'http.status_code': response.status,
                    })
                    rootSpan.end()

                    throw new Error(error)
                }
            }

            const result = {
                data,
                metadata: {
                    symbol: inputData.symbol,
                    status: data.status,
                    request_id: data.request_id,
                    count: data.count,
                    multiplier: inputData.multiplier,
                    timespan: inputData.timespan,
                    from: inputData.from,
                    to: inputData.to,
                },
            }

            rootSpan.setAttributes({
                'output.count': data?.count ?? 0,
                'output.symbol': inputData.symbol,
                'output.status': data?.status,
            })
            rootSpan.end()

            logToolExecution('polygon-crypto-aggregates', {
                output: { symbol: inputData.symbol, count: data?.count ?? 0 },
            })

            return result
        } catch (error) {
            // Handle AbortError specifically
            if (error instanceof Error && error.name === 'AbortError') {
                const cancelMessage = `Polygon stock fundamentals cancelled for ${inputData.symbol}`
                const totalDuration = Date.now() - startTime
                rootSpan.setStatus({ code: 2, message: cancelMessage })
                rootSpan.end()

                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: `🛑 ${cancelMessage}`,
                        stage: 'polygon-stock-fundamentals',
                    },
                    id: 'polygon-stock-fundamentals',
                })

                log.warn(cancelMessage)
                throw new Error(cancelMessage)
            }

            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error fetching stock fundamentals'
            const totalDuration = Date.now() - startTime

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Fundamentals fetch failed: ${errorMessage}`,
                    stage: 'polygon-stock-fundamentals',
                },
                id: 'polygon-stock-fundamentals',
            })

            rootSpan.recordException(
                error instanceof Error ? error : new Error(errorMessage)
            )
            rootSpan.setAttributes({
                error: true,
                'error.message': errorMessage,
                processing_time_ms: totalDuration,
            })
            rootSpan.end()

            throw error instanceof Error ? error : new Error(errorMessage)
        }
    },
})

export type PolygonCryptoAggregatesUITool = InferUITool<
    typeof polygonCryptoAggregatesTool
>

/**
 * Polygon.io Crypto Snapshots Tool
 *
 * Specialized for market-wide cryptocurrency snapshots:
 * - All crypto tickers snapshot (SNAPSHOT_ALL)
 *
 * Requires POLYGON_API_KEY environment variable
 */
export const polygonCryptoSnapshotsTool = createTool({
    id: 'polygon-crypto-snapshots',
    description: 'Access market-wide cryptocurrency snapshots from Polygon.io',
    inputSchema: z.object({
        limit: z
            .number()
            .optional()
            .describe('Maximum number of results to return (max 50000)'),
    }),
    outputSchema: z.object({
        data: z
            .any()
            .describe('The crypto snapshots data returned from Polygon.io API'),
        metadata: z
            .object({
                status: z.string().optional(),
                request_id: z.string().optional(),
                count: z.number().optional(),
            })
            .optional(),
        error: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const startTime = Date.now()
        const writer = context?.writer
        const requestContext = context?.requestContext

        const tracer = trace.getTracer('polygon-tools')
        const rootSpan = tracer.startSpan('polygon-crypto-snapshots', {
            attributes: {
                'tool.id': 'polygon-crypto-snapshots',
                'tool.input.limit': inputData.limit,
            },
        })

        logToolExecution('polygon-crypto-snapshots', { input: inputData })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                message: `Fetching crypto snapshots`,
            },
        })

        const apiKey = process.env.POLYGON_API_KEY
        // Governance checks
        const governanceCtx = requestContext as PolygonRuntimeContext
        const userId = governanceCtx?.userId
        const tenantId = governanceCtx?.tenantId
        const roles = governanceCtx?.roles ?? []
        const subscriptionTier = governanceCtx?.subscriptionTier ?? 'free'
        const classificationLevel =
            governanceCtx?.classificationLevel ?? 'public'
        const currentTime = governanceCtx?.currentTime ?? new Date()

        logToolExecution('polygon-stock-fundamentals', {
            input: inputData,
            governance: {
                userId,
                tenantId,
                roles,
                subscriptionTier,
                classificationLevel,
                currentTime,
                requestId: governanceCtx?.requestId,
                correlationId: governanceCtx?.correlationId,
            },
        })

        if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
            const error =
                'POLYGON_API_KEY environment variable or runtimeContext.apiKey is required'
            rootSpan.recordException(new Error(error))
            rootSpan.setAttributes({
                error: true,
                'error.message': error,
                reason: 'missing-api-key',
            })
            rootSpan.end()
            logError('polygon-crypto-snapshots', new Error(error), {})
            throw new Error(error)
        }

        try {
            const url = `https://api.polygon.io/v2/snapshot/locale/global/markets/crypto/tickers`

            // Add API key and optional parameters
            const params = new URLSearchParams()
            params.append('apiKey', apiKey)

            if (inputData.limit !== undefined && inputData.limit !== null) {
                params.append('limit', inputData.limit.toString())
            }

            const finalUrl = `${url}?${params.toString()}`

            // Create child span for API call
            const apiSpan = tracer.startSpan('polygon-api-call', {
                attributes: {
                    'http.url': finalUrl.replace(apiKey, '[REDACTED]'),
                    'http.method': 'GET',
                },
            })

            logStepStart('polygon-api-call', {
                url: finalUrl.replace(apiKey, '[REDACTED]'),
            })

            const apiStartTime = Date.now()
            const response = await fetch(finalUrl)
            const data = await response.json()
            const apiDuration = Date.now() - apiStartTime

            apiSpan.setAttributes({
                'http.status_code': response.status,
                'response.size': JSON.stringify(data).length,
                duration_ms: apiDuration,
            })
            apiSpan.end()

            logStepEnd(
                'polygon-api-call',
                {
                    status: response.status,
                    dataSize: JSON.stringify(data).length,
                },
                apiDuration
            )

            // Check for API errors
            if (
                data !== null &&
                typeof data === 'object' &&
                'error' in (data as Record<string, unknown>)
            ) {
                const errorValue = (data as Record<string, unknown>)['error']
                if (
                    errorValue !== null &&
                    errorValue !== undefined &&
                    String(errorValue).trim() !== ''
                ) {
                    const error = String(errorValue)
                    rootSpan.recordException(new Error(error))
                    rootSpan.setAttributes({
                        error: true,
                        'error.message': error,
                        reason: 'api-error',
                    })
                    rootSpan.end()
                    logError('polygon-crypto-snapshots', new Error(error), {
                        apiError: error,
                    })
                    throw new Error(error)
                }
            }

            const result = {
                data,
                metadata: {
                    status: data.status,
                    request_id: data.request_id,
                    count: data.count,
                },
            }

            rootSpan.setAttributes({
                'output.count': data?.count ?? 0,
                'output.status': data?.status,
            })
            rootSpan.end()

            logToolExecution('polygon-crypto-snapshots', {
                output: { count: data?.count ?? 0 },
            })

            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'
            rootSpan.recordException(
                error instanceof Error ? error : new Error(errorMessage)
            )
            rootSpan.setAttributes({
                error: true,
                'error.message': errorMessage,
                reason: 'execution-error',
            })
            rootSpan.end()
            logError(
                'polygonCryptoSnapshotsTool',
                error instanceof Error ? error : new Error(errorMessage),
                {}
            )
            throw error instanceof Error ? error : new Error(errorMessage)
        }
    },
})

export type PolygonCryptoSnapshotsUITool = InferUITool<
    typeof polygonCryptoSnapshotsTool
>
