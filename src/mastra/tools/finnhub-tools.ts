import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import type { RequestContext } from '@mastra/core/request-context'
import { SpanType } from '@mastra/core/observability'
import { z } from 'zod'
import {
    log,
    logError,
    logStepEnd,
    logStepStart,
    logToolExecution,
} from '../config/logger'

export interface FinnhubRequestContext extends RequestContext {
    userId?: string
}

/**
 * Finnhub Quotes Tool
 *
 * Specialized for real-time stock quotes:
 * - Real-time stock quotes (QUOTE)
 *
 * Requires FINNHUB_API_KEY environment variable
 */
export const finnhubQuotesTool = createTool({
    id: 'finnhub-quotes',
    description: 'Access real-time stock quotes from Finnhub',
    inputSchema: z.object({
        symbol: z.string().describe("Stock symbol (e.g., 'AAPL', 'MSFT')"),
    }),
    outputSchema: z.object({
        data: z.any().describe('The quote data returned from Finnhub API'),
        metadata: z
            .object({
                symbol: z.string().optional(),
            })
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (input, context) => {
        const requestCtx = context?.requestContext as
            | FinnhubRequestContext
            | undefined
        const writer = context?.writer
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Finnhub quotes cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Fetching quote for ${input.symbol}`,
                stage: 'finnhub-quotes',
            },
            id: 'finnhub-quotes',
        })

        logToolExecution('finnhubQuotesTool', { input })

        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'finnhub-quotes',
            input: { symbol: input.symbol },
            metadata: {
                'tool.id': 'finnhub-quotes',
                symbol: input.symbol,
                operation: 'finnhub-quotes',
                'user.id': requestCtx?.userId,
            },
        })

        const apiKey = process.env.FINNHUB_API_KEY

        if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
            const message = 'FINNHUB_API_KEY environment variable is required'
            logError('finnhubQuotesTool', new Error(message), {
                symbol: input.symbol,
            })
            span?.error({ error: new Error(message), endSpan: true })
            return {
                data: null,
                message,
            }
        }

        try {
            const params = new URLSearchParams()
            params.append('token', apiKey)
            params.append('symbol', input.symbol)

            const url = `https://finnhub.io/api/v1/quote?${params.toString()}`

            // Create child span for API call
            const apiSpan = tracingContext?.currentSpan?.createChildSpan({
                type: SpanType.TOOL_CALL,
                name: 'finnhub-api-call',
                input: { symbol: input.symbol },
                metadata: {
                    'tool.id': 'finnhub-api',
                    'http.url': url.replace(apiKey, '[REDACTED]'),
                    'http.method': 'GET',
                },
            })

            logStepStart('finnhub-api-call', {
                symbol: input.symbol,
                url: url.replace(apiKey, '[REDACTED]'),
            })

            const apiStartTime = Date.now()
            const response = await fetch(url)
            const data = await response.json()
            const apiDuration = Date.now() - apiStartTime

            apiSpan?.end()

            logStepEnd(
                'finnhub-api-call',
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
                    const message = String(errorValue)
                    logError('finnhubQuotesTool', new Error(message), {
                        symbol: input.symbol,
                        apiError: message,
                    })
                    span?.error({ error: new Error(message), endSpan: true })
                    return {
                        data: null,
                        message,
                    }
                }
            }

            const result = {
                data,
                metadata: {
                    symbol: input.symbol,
                },
                message: undefined,
            }

            span?.update({
                output: result,
                metadata: {
                    'tool.output.success': true,
                    'tool.output.dataSize': JSON.stringify(data).length,
                },
            })
            span?.end()

            logToolExecution('finnhubQuotesTool', {
                output: { symbol: input.symbol },
            })

            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'
            logError(
                'finnhubQuotesTool',
                error instanceof Error ? error : new Error(errorMessage),
                { symbol: input.symbol }
            )
            span?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            return {
                data: null,
                message: errorMessage,
            }
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Finnhub quotes input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Finnhub quotes received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Finnhub quotes received complete input', {
            toolCallId,
            messageCount: messages.length,
            symbol: input.symbol,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Finnhub quotes completed', {
            toolCallId,
            toolName,
            hasData: !!output.data,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

/**
 * Finnhub Company Tool
 *
 * Specialized for company information and news:
 * - Company profiles (COMPANY_PROFILE)
 * - Company news (COMPANY_NEWS)
 *
 * Requires FINNHUB_API_KEY environment variable
 */
export const finnhubCompanyTool = createTool({
    id: 'finnhub-company',
    description: 'Access company profiles and news from Finnhub',
    inputSchema: z.object({
        function: z
            .enum(['COMPANY_PROFILE', 'COMPANY_NEWS'])
            .describe('Finnhub company function'),
        symbol: z.string().describe("Stock symbol (e.g., 'AAPL', 'MSFT')"),
        from: z
            .string()
            .optional()
            .describe('Start date for news (YYYY-MM-DD)'),
        to: z.string().optional().describe('End date for news (YYYY-MM-DD)'),
    }),
    outputSchema: z.object({
        data: z.any().describe('The company data returned from Finnhub API'),
        metadata: z
            .object({
                function: z.string(),
                symbol: z.string().optional(),
                from: z.string().optional(),
                to: z.string().optional(),
            })
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (input, context) => {
        const requestCtx = context?.requestContext as
            | FinnhubRequestContext
            | undefined
        const writer = context?.writer
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Finnhub company cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Fetching company data (${input.function}) for ${input.symbol}`,
                stage: 'finnhub-company',
            },
            id: 'finnhub-company',
        })

        logToolExecution('finnhubCompanyTool', { input })

        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'finnhub-company',
            input: { function: input.function, symbol: input.symbol },
            metadata: {
                'tool.id': 'finnhub-company',
                function: input.function,
                symbol: input.symbol,
                operation: 'finnhub-company',
                'user.id': requestCtx?.userId,
            },
        })

        const apiKey = process.env.FINNHUB_API_KEY

        if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
            const message = 'FINNHUB_API_KEY environment variable is required'
            logError('finnhubCompanyTool', new Error(message), {
                function: input.function,
                symbol: input.symbol,
            })
            span?.error({ error: new Error(message), endSpan: true })
            return {
                data: null,
                message,
            }
        }

        try {
            let url: string
            const params = new URLSearchParams()
            params.append('token', apiKey)

            switch (input.function) {
                case 'COMPANY_PROFILE':
                    params.append('symbol', input.symbol)
                    url = `https://finnhub.io/api/v1/stock/profile2?${params.toString()}`
                    break
                case 'COMPANY_NEWS': {
                    params.append('symbol', input.symbol)
                    if (
                        input.from !== undefined &&
                        input.from !== null &&
                        input.from.trim() !== ''
                    ) {
                        params.append('from', input.from)
                    }
                    if (
                        input.to !== undefined &&
                        input.to !== null &&
                        input.to.trim() !== ''
                    ) {
                        params.append('to', input.to)
                    }
                    url = `https://finnhub.io/api/v1/company-news?${params.toString()}`
                    break
                }
                default: {
                    const message = `Unsupported function: ${input.function}`
                    logError('finnhubCompanyTool', new Error(message), {
                        function: input.function,
                        symbol: input.symbol,
                    })
                    span?.error({ error: new Error(message), endSpan: true })
                    return {
                        data: null,
                        message,
                    }
                }
            }

            // Create child span for API call
            const apiSpan = tracingContext?.currentSpan?.createChildSpan({
                type: SpanType.TOOL_CALL,
                name: 'finnhub-api-call',
                input: { function: input.function, symbol: input.symbol },
                metadata: {
                    'tool.id': 'finnhub-api',
                    'http.url': url.replace(apiKey, '[REDACTED]'),
                    'http.method': 'GET',
                },
            })

            logStepStart('finnhub-api-call', {
                function: input.function,
                symbol: input.symbol,
                url: url.replace(apiKey, '[REDACTED]'),
            })

            const apiStartTime = Date.now()
            const response = await fetch(url)
            const data = await response.json()
            const apiDuration = Date.now() - apiStartTime

            apiSpan?.end()

            logStepEnd(
                'finnhub-api-call',
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
                    const message = String(errorValue)
                    logError('finnhubCompanyTool', new Error(message), {
                        function: input.function,
                        symbol: input.symbol,
                        apiError: message,
                    })
                    span?.error({ error: new Error(message), endSpan: true })
                    return {
                        data: null,
                        message,
                    }
                }
            }

            const result = {
                data,
                metadata: {
                    function: input.function,
                    symbol: input.symbol,
                    from: input.from,
                    to: input.to,
                },
                message: undefined,
            }

            span?.update({
                output: result,
                metadata: {
                    'tool.output.success': true,
                    'tool.output.dataSize': JSON.stringify(data).length,
                },
            })
            span?.end()

            logToolExecution('finnhubCompanyTool', {
                output: { function: input.function, symbol: input.symbol },
            })

            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'
            logError(
                'finnhubCompanyTool',
                error instanceof Error ? error : new Error(errorMessage),
                { function: input.function, symbol: input.symbol }
            )
            span?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            return {
                data: null,
                message: errorMessage,
            }
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Finnhub company input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Finnhub company received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Finnhub company received complete input', {
            toolCallId,
            messageCount: messages.length,
            function: input.function,
            symbol: input.symbol,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Finnhub company completed', {
            toolCallId,
            toolName,
            hasData: !!output.data,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

/**
 * Finnhub Financials Tool
 *
 * Specialized for financial statements and metrics:
 * - Financial statements (FINANCIAL_STATEMENTS)
 * - Company metrics (METRICS)
 * - Earnings data (EARNINGS)
 * - Revenue breakdown (REVENUE_BREAKDOWN)
 *
 * Requires FINNHUB_API_KEY environment variable
 */
export const finnhubFinancialsTool = createTool({
    id: 'finnhub-financials',
    description:
        'Access financial statements, metrics, earnings, and revenue data from Finnhub',
    inputSchema: z.object({
        function: z
            .enum([
                'FINANCIAL_STATEMENTS',
                'METRICS',
                'EARNINGS',
                'REVENUE_BREAKDOWN',
            ])
            .describe('Finnhub financials function'),
        symbol: z.string().describe("Stock symbol (e.g., 'AAPL', 'MSFT')"),
    }),
    outputSchema: z.object({
        data: z.any().describe('The financials data returned from Finnhub API'),
        metadata: z
            .object({
                function: z.string(),
                symbol: z.string().optional(),
            })
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (input, context) => {
        const requestCtx = context?.requestContext as
            | FinnhubRequestContext
            | undefined
        const writer = context?.writer
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Finnhub financials cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Fetching financials (${input.function}) for ${input.symbol}`,
                stage: 'finnhub-financials',
            },
            id: 'finnhub-financials',
        })

        logToolExecution('finnhubFinancialsTool', { input })

        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'finnhub-financials',
            input: { function: input.function, symbol: input.symbol },
            metadata: {
                'tool.id': 'finnhub-financials',
                function: input.function,
                symbol: input.symbol,
                operation: 'finnhub-financials',
                'user.id': requestCtx?.userId,
            },
        })

        const apiKey = process.env.FINNHUB_API_KEY

        if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
            const message = 'FINNHUB_API_KEY environment variable is required'
            logError('finnhubFinancialsTool', new Error(message), {
                function: input.function,
                symbol: input.symbol,
            })
            span?.error({ error: new Error(message), endSpan: true })
            return {
                data: null,
                message,
            }
        }

        try {
            let url: string
            const params = new URLSearchParams()
            params.append('token', apiKey)
            params.append('symbol', input.symbol)

            switch (input.function) {
                case 'FINANCIAL_STATEMENTS': {
                    url = `https://finnhub.io/api/v1/stock/financials?${params.toString()}`
                    break
                }
                case 'METRICS': {
                    url = `https://finnhub.io/api/v1/stock/metric?${params.toString()}`
                    break
                }
                case 'EARNINGS': {
                    url = `https://finnhub.io/api/v1/stock/earnings?${params.toString()}`
                    break
                }
                case 'REVENUE_BREAKDOWN': {
                    url = `https://finnhub.io/api/v1/stock/revenue-breakdown2?${params.toString()}`
                    break
                }
                default: {
                    const message = `Unsupported function: ${input.function}`
                    logError('finnhubFinancialsTool', new Error(message), {
                        function: input.function,
                        symbol: input.symbol,
                    })
                    span?.error({ error: new Error(message), endSpan: true })
                    return {
                        data: null,
                        message,
                    }
                }
            }

            // Create child span for API call
            const apiSpan = tracingContext?.currentSpan?.createChildSpan({
                type: SpanType.TOOL_CALL,
                name: 'finnhub-api-call',
                input: { function: input.function, symbol: input.symbol },
                metadata: {
                    'tool.id': 'finnhub-api',
                    'http.url': url.replace(apiKey, '[REDACTED]'),
                    'http.method': 'GET',
                },
            })

            logStepStart('finnhub-api-call', {
                function: input.function,
                symbol: input.symbol,
                url: url.replace(apiKey, '[REDACTED]'),
            })

            const apiStartTime = Date.now()
            const response = await fetch(url)
            const data = await response.json()
            const apiDuration = Date.now() - apiStartTime

            apiSpan?.end()

            logStepEnd(
                'finnhub-api-call',
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
                    const message = String(errorValue)
                    logError('finnhubFinancialsTool', new Error(message), {
                        function: input.function,
                        symbol: input.symbol,
                        apiError: message,
                    })
                    span?.error({ error: new Error(message), endSpan: true })
                    return {
                        data: null,
                        message,
                    }
                }
            }

            const result = {
                data,
                metadata: {
                    function: input.function,
                    symbol: input.symbol,
                },
                message: undefined,
            }

            span?.update({
                output: result,
                metadata: {
                    'tool.output.success': true,
                    'tool.output.dataSize': JSON.stringify(data).length,
                },
            })
            span?.end()

            logToolExecution('finnhubFinancialsTool', {
                output: { function: input.function, symbol: input.symbol },
            })

            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'
            logError(
                'finnhubFinancialsTool',
                error instanceof Error ? error : new Error(errorMessage),
                { function: input.function, symbol: input.symbol }
            )
            span?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            return {
                data: null,
                message: errorMessage,
            }
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Finnhub financials input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Finnhub financials received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Finnhub financials received complete input', {
            toolCallId,
            messageCount: messages.length,
            function: input.function,
            symbol: input.symbol,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Finnhub financials completed', {
            toolCallId,
            toolName,
            hasData: !!output.data,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

/**
 * Finnhub Analysis Tool
 *
 * Specialized for analyst recommendations and price targets:
 * - Recommendation trends (RECOMMENDATION_TRENDS)
 * - Price targets (PRICE_TARGET)
 *
 * Requires FINNHUB_API_KEY environment variable
 */
export const finnhubAnalysisTool = createTool({
    id: 'finnhub-analysis',
    description:
        'Access analyst recommendations and price targets from Finnhub',
    inputSchema: z.object({
        function: z
            .enum(['RECOMMENDATION_TRENDS', 'PRICE_TARGET'])
            .describe('Finnhub analysis function'),
        symbol: z.string().describe("Stock symbol (e.g., 'AAPL', 'MSFT')"),
    }),
    outputSchema: z.object({
        data: z.any().describe('The analysis data returned from Finnhub API'),
        metadata: z
            .object({
                function: z.string(),
                symbol: z.string().optional(),
            })
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (input, context) => {
        const requestCtx = context?.requestContext as
            | FinnhubRequestContext
            | undefined
        const writer = context?.writer
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Finnhub analysis cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Fetching analysis (${input.function}) for ${input.symbol}`,
                stage: 'finnhub-analysis',
            },
            id: 'finnhub-analysis',
        })

        logToolExecution('finnhubAnalysisTool', { input })

        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'finnhub-analysis',
            input: { function: input.function, symbol: input.symbol },
            metadata: {
                'tool.id': 'finnhub-analysis',
                function: input.function,
                symbol: input.symbol,
                operation: 'finnhub-analysis',
                'user.id': requestCtx?.userId,
            },
        })

        const apiKey = process.env.FINNHUB_API_KEY

        if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
            const message = 'FINNHUB_API_KEY environment variable is required'
            logError('finnhubAnalysisTool', new Error(message), {
                function: input.function,
                symbol: input.symbol,
            })
            span?.error({ error: new Error(message), endSpan: true })
            return {
                data: null,
                message,
            }
        }

        try {
            let url: string
            const params = new URLSearchParams()
            params.append('token', apiKey)
            params.append('symbol', input.symbol)

            switch (input.function) {
                case 'RECOMMENDATION_TRENDS': {
                    url = `https://finnhub.io/api/v1/stock/recommendation?${params.toString()}`
                    break
                }
                case 'PRICE_TARGET': {
                    url = `https://finnhub.io/api/v1/stock/price-target?${params.toString()}`
                    break
                }
                default: {
                    const message = `Unsupported function: ${input.function}`
                    logError('finnhubAnalysisTool', new Error(message), {
                        function: input.function,
                        symbol: input.symbol,
                    })
                    span?.error({ error: new Error(message), endSpan: true })
                    return {
                        data: null,
                        message,
                    }
                }
            }

            // Create child span for API call
            const apiSpan = tracingContext?.currentSpan?.createChildSpan({
                type: SpanType.TOOL_CALL,
                name: 'finnhub-api-call',
                input: { function: input.function, symbol: input.symbol },
                metadata: {
                    'tool.id': 'finnhub-api',
                    'http.url': url.replace(apiKey, '[REDACTED]'),
                    'http.method': 'GET',
                },
            })

            logStepStart('finnhub-api-call', {
                function: input.function,
                symbol: input.symbol,
                url: url.replace(apiKey, '[REDACTED]'),
            })

            const apiStartTime = Date.now()
            const response = await fetch(url)
            const data = await response.json()
            const apiDuration = Date.now() - apiStartTime

            apiSpan?.end()

            logStepEnd(
                'finnhub-api-call',
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
                    const message = String(errorValue)
                    logError('finnhubAnalysisTool', new Error(message), {
                        function: input.function,
                        symbol: input.symbol,
                        apiError: message,
                    })
                    span?.error({ error: new Error(message), endSpan: true })
                    return {
                        data: null,
                        message,
                    }
                }
            }

            const result = {
                data,
                metadata: {
                    function: input.function,
                    symbol: input.symbol,
                },
                message: undefined,
            }

            span?.update({
                output: result,
                metadata: {
                    'tool.output.success': true,
                    'tool.output.dataSize': JSON.stringify(data).length,
                },
            })
            span?.end()

            logToolExecution('finnhubAnalysisTool', {
                output: { function: input.function, symbol: input.symbol },
            })

            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'
            logError(
                'finnhubAnalysisTool',
                error instanceof Error ? error : new Error(errorMessage),
                { function: input.function, symbol: input.symbol }
            )
            span?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            return {
                data: null,
                message: errorMessage,
            }
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Finnhub analysis input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Finnhub analysis received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Finnhub analysis received complete input', {
            toolCallId,
            messageCount: messages.length,
            function: input.function,
            symbol: input.symbol,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Finnhub analysis completed', {
            toolCallId,
            toolName,
            hasData: !!output.data,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

/**
 * Finnhub Technical Tool
 *
 * Specialized for technical analysis and indicators:
 * - Technical indicators (TECHNICAL_INDICATOR)
 * - Pattern recognition (PATTERN_RECOGNITION)
 * - Support/resistance levels (SUPPORT_RESISTANCE)
 * - Aggregate indicators (AGGREGATE_INDICATOR)
 *
 * Requires FINNHUB_API_KEY environment variable
 */
export const finnhubTechnicalTool = createTool({
    id: 'finnhub-technical',
    description:
        'Access technical analysis indicators and pattern recognition from Finnhub',
    inputSchema: z.object({
        function: z
            .enum([
                'TECHNICAL_INDICATOR',
                'PATTERN_RECOGNITION',
                'SUPPORT_RESISTANCE',
                'AGGREGATE_INDICATOR',
            ])
            .describe('Finnhub technical function'),
        symbol: z.string().describe("Stock symbol (e.g., 'AAPL', 'MSFT')"),
        resolution: z
            .enum(['1', '5', '15', '30', '60', 'D', 'W', 'M'])
            .describe('Time resolution for technical indicators'),
        indicator: z
            .string()
            .optional()
            .describe(
                "Technical indicator name (e.g., 'sma', 'ema', 'rsi', 'macd') - required for TECHNICAL_INDICATOR"
            ),
        timeperiod: z
            .number()
            .optional()
            .describe(
                'Time period for technical indicators - required for TECHNICAL_INDICATOR'
            ),
        series_type: z
            .enum(['open', 'high', 'low', 'close'])
            .optional()
            .describe(
                'Price series type for technical indicators - required for TECHNICAL_INDICATOR'
            ),
    }),
    outputSchema: z.object({
        data: z.any().describe('The technical data returned from Finnhub API'),
        metadata: z
            .object({
                function: z.string(),
                symbol: z.string().optional(),
                resolution: z.string().optional(),
                indicator: z.string().optional(),
                timeperiod: z.number().optional(),
                series_type: z.string().optional(),
            })
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (input, context) => {
        const requestCtx = context?.requestContext as
            | FinnhubRequestContext
            | undefined
        const writer = context?.writer
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Finnhub technical cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Fetching technical data (${input.function}) for ${input.symbol}`,
                stage: 'finnhub-technical',
            },
            id: 'finnhub-technical',
        })

        logToolExecution('finnhubTechnicalTool', { input })

        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'finnhub-technical',
            input: {
                function: input.function,
                symbol: input.symbol,
                resolution: input.resolution,
            },
            metadata: {
                'tool.id': 'finnhub-technical',
                function: input.function,
                symbol: input.symbol,
                resolution: input.resolution,
                operation: 'finnhub-technical',
                'user.id': requestCtx?.userId,
            },
        })

        const apiKey = process.env.FINNHUB_API_KEY

        if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
            const message = 'FINNHUB_API_KEY environment variable is required'
            logError('finnhubTechnicalTool', new Error(message), {
                function: input.function,
                symbol: input.symbol,
            })
            span?.error({ error: new Error(message), endSpan: true })
            return {
                data: null,
                message,
            }
        }

        try {
            let url: string
            const params = new URLSearchParams()
            params.append('token', apiKey)
            params.append('symbol', input.symbol)
            params.append('resolution', input.resolution)

            switch (input.function) {
                case 'TECHNICAL_INDICATOR': {
                    if (
                        input.indicator === undefined ||
                        input.indicator === null ||
                        input.indicator.trim() === '' ||
                        input.timeperiod === undefined ||
                        input.timeperiod === null ||
                        input.series_type === undefined ||
                        input.series_type === null ||
                        input.series_type.trim() === ''
                    ) {
                        const message =
                            'TECHNICAL_INDICATOR function requires indicator, timeperiod, and series_type parameters'
                        logError('finnhubTechnicalTool', new Error(message), {
                            function: input.function,
                            symbol: input.symbol,
                        })
                        span?.error({
                            error: new Error(message),
                            endSpan: true,
                        })
                        return {
                            data: null,
                            message,
                        }
                    }
                    params.append('indicator', input.indicator)
                    params.append('timeperiod', input.timeperiod.toString())
                    params.append('series_type', input.series_type)
                    url = `https://finnhub.io/api/v1/indicator?${params.toString()}`
                    break
                }
                case 'PATTERN_RECOGNITION': {
                    url = `https://finnhub.io/api/v1/scan/pattern?${params.toString()}`
                    break
                }
                case 'SUPPORT_RESISTANCE': {
                    url = `https://finnhub.io/api/v1/scan/support-resistance?${params.toString()}`
                    break
                }
                case 'AGGREGATE_INDICATOR': {
                    url = `https://finnhub.io/api/v1/scan/technical-indicator?${params.toString()}`
                    break
                }
                default: {
                    const message = `Unsupported function: ${input.function}`
                    logError('finnhubTechnicalTool', new Error(message), {
                        function: input.function,
                        symbol: input.symbol,
                    })
                    span?.error({ error: new Error(message), endSpan: true })
                    return {
                        data: null,
                        message,
                    }
                }
            }

            // Create child span for API call
            const apiSpan = tracingContext?.currentSpan?.createChildSpan({
                type: SpanType.TOOL_CALL,
                name: 'finnhub-api-call',
                input: { function: input.function, symbol: input.symbol },
                metadata: {
                    'tool.id': 'finnhub-api',
                    'http.url': url.replace(apiKey, '[REDACTED]'),
                    'http.method': 'GET',
                },
            })

            logStepStart('finnhub-api-call', {
                function: input.function,
                symbol: input.symbol,
                url: url.replace(apiKey, '[REDACTED]'),
            })

            const apiStartTime = Date.now()
            const response = await fetch(url)
            const data = await response.json()
            const apiDuration = Date.now() - apiStartTime

            apiSpan?.end()

            logStepEnd(
                'finnhub-api-call',
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
                    const message = String(errorValue)
                    logError('finnhubTechnicalTool', new Error(message), {
                        function: input.function,
                        symbol: input.symbol,
                        apiError: message,
                    })
                    span?.error({ error: new Error(message), endSpan: true })
                    return {
                        data: null,
                        message,
                    }
                }
            }

            const result = {
                data,
                metadata: {
                    function: input.function,
                    symbol: input.symbol,
                    resolution: input.resolution,
                    indicator: input.indicator,
                    timeperiod: input.timeperiod,
                    series_type: input.series_type,
                },
                message: undefined,
            }

            span?.update({
                output: result,
                metadata: {
                    'tool.output.success': true,
                    'tool.output.dataSize': JSON.stringify(data).length,
                },
            })
            span?.end()

            logToolExecution('finnhubTechnicalTool', {
                output: { function: input.function, symbol: input.symbol },
            })

            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'
            logError(
                'finnhubTechnicalTool',
                error instanceof Error ? error : new Error(errorMessage),
                { function: input.function, symbol: input.symbol }
            )
            span?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            return {
                data: null,
                message: errorMessage,
            }
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Finnhub technical input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Finnhub technical received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Finnhub technical received complete input', {
            toolCallId,
            messageCount: messages.length,
            function: input.function,
            symbol: input.symbol,
            resolution: input.resolution,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Finnhub technical completed', {
            toolCallId,
            toolName,
            hasData: !!output.data,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

/**
 * Finnhub Economic Tool
 *
 * Specialized for economic indicators and data:
 * - Economic data (ECONOMIC_DATA)
 *
 * Requires FINNHUB_API_KEY environment variable
 */
export const finnhubEconomicTool = createTool({
    id: 'finnhub-economic',
    description: 'Access economic indicators and data from Finnhub',
    inputSchema: z.object({
        economic_code: z
            .string()
            .describe("Economic data code (e.g., 'MA-USA-656880')"),
    }),
    outputSchema: z.object({
        data: z.any().describe('The economic data returned from Finnhub API'),
        metadata: z
            .object({
                economic_code: z.string().optional(),
            })
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (input, context) => {
        const requestCtx = context?.requestContext as
            | FinnhubRequestContext
            | undefined
        const writer = context?.writer
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Finnhub economic cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Fetching economic data for ${input.economic_code}`,
                stage: 'finnhub-economic',
            },
            id: 'finnhub-economic',
        })

        logToolExecution('finnhubEconomicTool', { input })

        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'finnhub-economic',
            input: { economic_code: input.economic_code },
            metadata: {
                'tool.id': 'finnhub-economic',
                economic_code: input.economic_code,
                operation: 'finnhub-economic',
                'user.id': requestCtx?.userId,
            },
        })

        const apiKey = process.env.FINNHUB_API_KEY

        if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
            const message = 'FINNHUB_API_KEY environment variable is required'
            logError('finnhubEconomicTool', new Error(message), {
                economic_code: input.economic_code,
            })
            span?.error({ error: new Error(message), endSpan: true })
            return {
                data: null,
                message,
            }
        }

        try {
            const params = new URLSearchParams()
            params.append('token', apiKey)
            params.append('code', input.economic_code)

            const url = `https://finnhub.io/api/v1/economic?${params.toString()}`

            // Create child span for API call
            const apiSpan = tracingContext?.currentSpan?.createChildSpan({
                type: SpanType.TOOL_CALL,
                name: 'finnhub-api-call',
                input: { economic_code: input.economic_code },
                metadata: {
                    'tool.id': 'finnhub-api',
                    'http.url': url.replace(apiKey, '[REDACTED]'),
                    'http.method': 'GET',
                },
            })

            logStepStart('finnhub-api-call', {
                economic_code: input.economic_code,
                url: url.replace(apiKey, '[REDACTED]'),
            })

            const apiStartTime = Date.now()
            const response = await fetch(url)
            const data = await response.json()
            const apiDuration = Date.now() - apiStartTime

            apiSpan?.end()

            logStepEnd(
                'finnhub-api-call',
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
                    const message = String(errorValue)
                    logError('finnhubEconomicTool', new Error(message), {
                        economic_code: input.economic_code,
                        apiError: message,
                    })
                    span?.error({ error: new Error(message), endSpan: true })
                    return {
                        data: null,
                        message,
                    }
                }
            }

            const result = {
                data,
                metadata: {
                    economic_code: input.economic_code,
                },
                message: undefined,
            }

            span?.update({
                output: result,
                metadata: {
                    'tool.output.success': true,
                    'tool.output.dataSize': JSON.stringify(data).length,
                },
            })
            span?.end()

            logToolExecution('finnhubEconomicTool', {
                output: { economic_code: input.economic_code },
            })

            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'
            logError(
                'finnhubEconomicTool',
                error instanceof Error ? error : new Error(errorMessage),
                { economic_code: input.economic_code }
            )
            span?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            return {
                data: null,
                message: errorMessage,
            }
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Finnhub economic input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Finnhub economic received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Finnhub economic received complete input', {
            toolCallId,
            messageCount: messages.length,
            economic_code: input.economic_code,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Finnhub economic completed', {
            toolCallId,
            toolName,
            hasData: !!output.data,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export type FinnhubEconomicUITool = InferUITool<typeof finnhubEconomicTool>
export type FinnhubTechnicalUITool = InferUITool<typeof finnhubTechnicalTool>
export type FinnhubAnalysisUITool = InferUITool<typeof finnhubAnalysisTool>
export type FinnhubFinancialsUITool = InferUITool<typeof finnhubFinancialsTool>
export type FinnhubCompanyUITool = InferUITool<typeof finnhubCompanyTool>

export type FinnhubTools =
    | FinnhubEconomicUITool
    | FinnhubTechnicalUITool
    | FinnhubAnalysisUITool
    | FinnhubFinancialsUITool
    | FinnhubCompanyUITool
