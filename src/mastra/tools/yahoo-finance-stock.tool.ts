import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import type { TracingContext } from '@mastra/core/observability'
import type { RequestContext } from '@mastra/core/request-context'
import { createTool, InferToolInput, InferToolOutput, type InferUITool } from '@mastra/core/tools'
import { z } from 'zod'
import { log } from '../config/logger'
import { httpFetch } from '../lib/http-client'
import {
    buildYahooQuoteSnapshotFromChart,
    normalizeYahooChartHistory,
    type YahooChartResponse,
    type YahooQuote,
} from './market-data.helpers'

/**
 * Shared request context for Yahoo Finance stock data.
 */
export interface YahooFinanceStockContext extends RequestContext {
    userId?: string
}

const yahooRangeSchema = z.enum([
    '1d',
    '5d',
    '1mo',
    '3mo',
    '6mo',
    '1y',
    '2y',
    '5y',
    '10y',
    'ytd',
    'max',
])

const yahooIntervalSchema = z.enum([
    '1m',
    '2m',
    '5m',
    '15m',
    '30m',
    '60m',
    '90m',
    '1d',
    '5d',
    '1wk',
    '1mo',
    '3mo',
])

const yahooInputSchema = z.object({
    function: z.enum(['quote', 'history']).default('quote'),
    symbol: z.string().min(1).describe('Stock ticker symbol, e.g. AAPL or MSFT'),
    range: yahooRangeSchema.default('1mo'),
    interval: yahooIntervalSchema.default('1d'),
    limit: z.number().int().min(1).max(5000).default(100),
    includePrePost: z.boolean().default(false),
    events: z.enum(['div,splits', 'div', 'splits']).default('div,splits'),
})

type YahooInput = z.infer<typeof yahooInputSchema>

type YahooQuoteData = {
    symbol: string
    name: string | null
    currency: string | null
    marketPrice: number | null
    marketChange: number | null
    marketChangePercent: number | null
    marketCap: number | null
    dayHigh: number | null
    dayLow: number | null
    regularMarketTime: number | null
}

type YahooHistoryData = {
    symbol: string
    range: string
    interval: string
    candles: ReturnType<typeof normalizeYahooChartHistory>
    quote: YahooQuoteData | null
}

type YahooMarketDataData = YahooQuoteData | YahooHistoryData

type YahooMarketDataOutput = {
    data: YahooMarketDataData
    metadata: {
        source: 'yahoo-finance'
        function: string
        symbol: string
        market?: string
    }
}

/**
 * Counts the number of rows in a Yahoo Finance payload.
 *
 * @param payload - The normalized Yahoo payload.
 * @returns A best-effort count for logging.
 */
function countYahooMarketDataItems(
    payload: YahooMarketDataOutput['data'] | undefined
): number {
    if (!payload) {
        return 0
    }

    if ('candles' in payload) {
        return payload.candles.length
    }

    return 1
}

const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com'

/**
 * Yahoo Finance stock market-data tool.
 */
export const yahooFinanceStockQuotesTool = createTool({
    id: 'yahoo-finance-stock-quotes',
    description:
        'Fetch free Yahoo Finance stock data without an API key, including latest quotes and chart history.',
    inputSchema: yahooInputSchema,
    outputSchema: z.custom<YahooMarketDataOutput>(),
    strict: true,
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Yahoo Finance stock quotes input streaming started', {
            toolCallId,
            messages,
            abortSignal,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Yahoo Finance stock quotes received input chunk', {
            toolCallId,
            inputTextDelta,
            messages,
            abortSignal,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Yahoo Finance stock quotes received input', {
            toolCallId,
            messages,
            function: input.function,
            symbol: input.symbol,
            abortSignal,
            hook: 'onInputAvailable',
        })
    },
    execute: async (input, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined = context?.tracingContext
        const requestFunction = input.function ?? 'quote'
        const normalizedSymbol = input.symbol.trim().toUpperCase()
        const range = input.range ?? '1mo'
        const interval = input.interval ?? '1d'
        const limit = input.limit ?? 100
        const includePrePost = input.includePrePost ?? false
        const events = input.events ?? 'div,splits'

        if (abortSignal?.aborted === true) {
            throw new Error('Yahoo Finance stock request cancelled')
        }

        const span = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'yahoo-finance-stock-quotes',
            input,
            metadata: {
                'tool.id': 'yahoo-finance-stock-quotes',
                'tool.input.function': requestFunction,
                'tool.input.symbol': normalizedSymbol,
            },
            requestContext: context?.requestContext,
            tracingContext,
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Fetching Yahoo Finance stock data for ${normalizedSymbol}`,
                stage: 'yahoo-finance-stock-quotes',
            },
            id: 'yahoo-finance-stock-quotes',
        })

        try {
            const quoteResponse = await httpFetch(`${YAHOO_BASE_URL}/v7/finance/quote`, {
                timeout: 30000,
                params: { symbols: normalizedSymbol },
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; AgentStack/1.0)',
                },
            })
            const quotePayload = (await quoteResponse.json()) as {
                quoteResponse?: {
                    result?: YahooQuote[]
                }
            }

            let data: YahooMarketDataData

            if (requestFunction === 'quote') {
                const row = quotePayload.quoteResponse?.result?.[0]
                if (row) {
                    data = {
                        symbol: row.symbol ?? normalizedSymbol,
                        name: row.shortName ?? row.longName ?? null,
                        currency: row.currency ?? null,
                        marketPrice: row.regularMarketPrice ?? null,
                        marketChange: row.regularMarketChange ?? null,
                        marketChangePercent: row.regularMarketChangePercent ?? null,
                        marketCap: row.marketCap ?? null,
                        dayHigh: row.regularMarketDayHigh ?? null,
                        dayLow: row.regularMarketDayLow ?? null,
                        regularMarketTime: row.regularMarketTime ?? null,
                    }
                } else {
                    const chartResponse = await httpFetch(
                        `${YAHOO_BASE_URL}/v8/finance/chart/${encodeURIComponent(normalizedSymbol)}`,
                        {
                            timeout: 30000,
                            params: {
                                range,
                                interval,
                                includePrePost: includePrePost ? 'true' : 'false',
                                events,
                            },
                            headers: {
                                Accept: 'application/json',
                                'User-Agent': 'Mozilla/5.0 (compatible; AgentStack/1.0)',
                            },
                        }
                    )
                    const chartPayload = (await chartResponse.json()) as YahooChartResponse
                    const fallbackQuote = buildYahooQuoteSnapshotFromChart(
                        chartPayload,
                        normalizedSymbol
                    )

                    if (!fallbackQuote) {
                        throw new Error(`No Yahoo Finance quote returned for ${normalizedSymbol}`)
                    }

                    data = fallbackQuote
                }
            } else {
                const chartResponse = await httpFetch(
                    `${YAHOO_BASE_URL}/v8/finance/chart/${encodeURIComponent(normalizedSymbol)}`,
                    {
                        timeout: 30000,
                        params: {
                            range,
                            interval,
                            includePrePost: includePrePost ? 'true' : 'false',
                            events,
                        },
                        headers: {
                            Accept: 'application/json',
                            'User-Agent': 'Mozilla/5.0 (compatible; AgentStack/1.0)',
                        },
                    }
                )
                const chartPayload = (await chartResponse.json()) as YahooChartResponse
                const row = quotePayload.quoteResponse?.result?.[0]
                data = {
                    symbol: normalizedSymbol,
                    range,
                    interval,
                    candles: normalizeYahooChartHistory(chartPayload).slice(-limit),
                    quote: row
                        ? {
                              symbol: row.symbol ?? normalizedSymbol,
                              name: row.shortName ?? row.longName ?? null,
                              currency: row.currency ?? null,
                              marketPrice: row.regularMarketPrice ?? null,
                              marketChange: row.regularMarketChange ?? null,
                              marketChangePercent: row.regularMarketChangePercent ?? null,
                              marketCap: row.marketCap ?? null,
                              dayHigh: row.regularMarketDayHigh ?? null,
                              dayLow: row.regularMarketDayLow ?? null,
                              regularMarketTime: row.regularMarketTime ?? null,
                          }
                        : buildYahooQuoteSnapshotFromChart(chartPayload, normalizedSymbol),
                }
            }

            const output: YahooMarketDataOutput = {
                data,
                metadata: {
                    source: 'yahoo-finance' as const,
                    function: requestFunction,
                    symbol: normalizedSymbol,
                    market: undefined,
                },
            }

            span?.update({
                output,
                metadata: {
                    'tool.output.source': 'yahoo-finance',
                },
            })
            span?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Yahoo Finance stock data ready for ${normalizedSymbol}`,
                    stage: 'yahoo-finance-stock-quotes',
                },
                id: 'yahoo-finance-stock-quotes',
            })

            return output
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            span?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Yahoo Finance request failed: ${errorMessage}`,
                    stage: 'yahoo-finance-stock-quotes',
                },
                id: 'yahoo-finance-stock-quotes',
            })

            log.error('Yahoo Finance stock market-data tool failed', {
                function: requestFunction,
                symbol: normalizedSymbol,
                error: errorMessage,
            })

            throw error instanceof Error ? error : new Error(errorMessage)
        }
    },
    toModelOutput: (output: YahooMarketDataOutput) => ({
        type: 'content',
        value: [
            {
                type: 'text' as const,
                text: `Yahoo Finance ${output.metadata.function} for ${output.metadata.symbol}`,
            },
            {
                type: 'text' as const,
                text: `Returned ${String(countYahooMarketDataItems(output.data))} item(s).`,
            },
        ],
    }),
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Yahoo Finance stock quotes completed', {
            toolCallId,
            toolName,
            count: countYahooMarketDataItems(output.data),
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})


export type YahooFinanceStockQuotesUITool = InferUITool<typeof yahooFinanceStockQuotesTool>
export type YahooFinanceStockQuotesOutput = InferToolOutput<typeof yahooFinanceStockQuotesTool>
export type YahooFinanceStockQuotesInput = InferToolInput<typeof yahooFinanceStockQuotesTool>
