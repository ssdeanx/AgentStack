import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import type { TracingContext } from '@mastra/core/observability'
import type { RequestContext } from '@mastra/core/request-context'
import type { InferToolInput, InferToolOutput} from '@mastra/core/tools';
import { createTool, type InferUITool } from '@mastra/core/tools'
import { z } from 'zod'
import { log } from '../config/logger'
import { httpFetch } from '../lib/http-client'
import {
    buildStooqQuoteSnapshot,
    buildStooqSymbol,
    parseStooqCsv,
} from './market-data.helpers'

/**
 * Shared request context for Stooq stock data.
 */
export interface StooqStockContext extends RequestContext {
    userId?: string
}

const stooqInputSchema = z.object({
    function: z.enum(['quote', 'history']).default('quote'),
    symbol: z.string().min(1).describe('Stock ticker symbol, e.g. AAPL or MSFT'),
    marketSuffix: z.string().default('us').describe('Stooq market suffix, e.g. us, uk, jp'),
    limit: z.number().int().min(1).max(5000).default(100),
})

type StooqInput = z.infer<typeof stooqInputSchema>

type StooqQuoteData = {
    symbol: string
    date: string | null
    time: string | null
    open: number | null
    high: number | null
    low: number | null
    close: number | null
    volume: number | null
    name: string | null
}

type StooqHistoryData = {
    symbol: string
    candles: Array<{
        timestamp: string
        open: number | null
        high: number | null
        low: number | null
        close: number | null
        volume: number | null
    }>
}

type StooqMarketDataData = StooqQuoteData | StooqHistoryData

type StooqMarketDataOutput = {
    data: StooqMarketDataData
    metadata: {
        source: 'stooq'
        function: string
        symbol: string
        market: string
    }
}

/**
 * Counts the number of rows in a Stooq payload.
 *
 * @param payload - The normalized Stooq payload.
 * @returns A best-effort count for logging.
 */
function countStooqMarketDataItems(payload: StooqMarketDataOutput['data'] | undefined): number {
    if (!payload) {
        return 0
    }

    if ('candles' in payload) {
        return payload.candles.length
    }

    return 1
}

const STOOQ_BASE_URL = 'https://stooq.com'

/**
 * Stooq stock market-data tool.
 */
export const stooqStockQuotesTool = createTool({
    id: 'stooq-stock-quotes',
    description:
        'Fetch free Stooq stock market data without an API key, including latest quotes and historical daily bars.',
    inputSchema: stooqInputSchema,
    outputSchema: z.custom<StooqMarketDataOutput>(),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Stooq stock quotes input streaming started', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Stooq stock quotes received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages?.length ?? 0,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Stooq stock quotes received input', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            function: input.function,
            symbol: input.symbol,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    execute: async (input, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined = context?.tracingContext
        const requestFunction = input.function ?? 'quote'
        const limit = input.limit ?? 100
        const marketSuffix = input.marketSuffix ?? 'us'
        const requestedSymbol = input.symbol.trim()
        const stooqSymbol = buildStooqSymbol(requestedSymbol, marketSuffix)

        if (abortSignal?.aborted === true) {
            throw new Error('Stooq stock request cancelled')
        }

        const span = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'stooq-stock-quotes',
            input,
            metadata: {
                'tool.id': 'stooq-stock-quotes',
                'tool.input.function': requestFunction,
                'tool.input.symbol': stooqSymbol,
            },
            requestContext: context?.requestContext,
            tracingContext,
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Fetching Stooq stock data for ${stooqSymbol}`,
                stage: 'stooq-stock-quotes',
            },
            id: 'stooq-stock-quotes',
        })

        try {
            let data: StooqMarketDataData

            if (requestFunction === 'quote') {
                const response = await httpFetch(`${STOOQ_BASE_URL}/q/l/`, {
                    timeout: 30000,
                    responseType: 'text',
                    params: {
                        s: stooqSymbol,
                        i: 'd',
                        f: 'sd2t2ohlcvn',
                        e: 'csv',
                    },
                })
                const rows = parseStooqCsv(await response.text())
                const row = rows[0]
                if (row) {
                    data = buildStooqQuoteSnapshot(row, stooqSymbol)
                } else {
                    const historyResponse = await httpFetch(`${STOOQ_BASE_URL}/q/d/l/`, {
                        timeout: 30000,
                        responseType: 'text',
                        params: {
                            s: stooqSymbol,
                            i: 'd',
                            e: 'csv',
                        },
                    })
                    const historyRows = parseStooqCsv(await historyResponse.text())
                    const historyRow = historyRows.at(-1)

                    if (!historyRow) {
                        throw new Error(`No Stooq quote returned for ${stooqSymbol}`)
                    }

                    data = buildStooqQuoteSnapshot(historyRow, stooqSymbol)
                }
            } else {
                const response = await httpFetch(`${STOOQ_BASE_URL}/q/d/l/`, {
                    timeout: 30000,
                    responseType: 'text',
                    params: {
                        s: stooqSymbol,
                        i: 'd',
                        e: 'csv',
                    },
                })
                const rows = parseStooqCsv(await response.text()).slice(-limit)
                data = {
                    symbol: stooqSymbol,
                    candles: rows.map((row) => ({
                        timestamp: row.Date,
                        open: row.Open ? Number(row.Open) : null,
                        high: row.High ? Number(row.High) : null,
                        low: row.Low ? Number(row.Low) : null,
                        close: row.Close ? Number(row.Close) : null,
                        volume: row.Volume ? Number(row.Volume) : null,
                    })),
                }
            }

            const output: StooqMarketDataOutput = {
                data,
                metadata: {
                    source: 'stooq' as const,
                    function: requestFunction,
                    symbol: requestedSymbol,
                    market: marketSuffix,
                },
            }

            span?.update({
                output,
                metadata: {
                    'tool.output.source': 'stooq',
                },
            })
            span?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Stooq stock data ready for ${stooqSymbol}`,
                    stage: 'stooq-stock-quotes',
                },
                id: 'stooq-stock-quotes',
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
                    message: `❌ Stooq stock request failed: ${errorMessage}`,
                    stage: 'stooq-stock-quotes',
                },
                id: 'stooq-stock-quotes',
            })

            log.error('Stooq stock market-data tool failed', {
                function: requestFunction,
                symbol: stooqSymbol,
                error: errorMessage,
            })

            throw error instanceof Error ? error : new Error(errorMessage)
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        const data = output as StooqMarketDataOutput | undefined
        log.info('Stooq stock quotes completed', {
            toolCallId,
            toolName,
            count: countStooqMarketDataItems(data?.data),
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})


export type StooqStockQuotesUITool = InferUITool<typeof stooqStockQuotesTool>
export type StooqStockQuotesOutput = InferToolOutput<typeof stooqStockQuotesTool>
export type StooqStockQuotesInput = InferToolInput<typeof stooqStockQuotesTool>
