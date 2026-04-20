import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import type { TracingContext } from '@mastra/core/observability'
import type { RequestContext } from '@mastra/core/request-context'
import type { InferToolInput, InferToolOutput, InferUITool} from '@mastra/core/tools';
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { log } from '../config/logger'
import { httpFetch } from '../lib/http-client'
import { buildCoinbaseProductId, normalizeCoinbaseCandles } from './market-data.helpers'
import type {
    CoinbaseBookLevel,
    CoinbaseCandleRow,
    CoinbaseStats,
    CoinbaseTicker,
    CoinbaseTrade,
} from './market-data.helpers'

/**
 * Shared request context for Coinbase Exchange crypto data.
 */
export interface CoinbaseExchangeCryptoContext extends RequestContext {
    userId?: string
}

const coinbaseGranularitySchema = z.enum([
    '60',
    '300',
    '900',
    '3600',
    '21600',
    '86400',
])

const coinbaseInputSchema = z.object({
    function: z
        .enum(['ticker', 'stats', 'candles', 'orderbook', 'trades', 'products'])
        .default('ticker')
        .describe('Coinbase Exchange public market-data function'),
    baseCurrency: z.string().min(1).describe('Base currency, e.g. BTC or ETH'),
    quoteCurrency: z.string().default('USD').describe('Quote currency, e.g. USD'),
    granularity: coinbaseGranularitySchema.default('86400'),
    limit: z.number().int().min(1).max(300).default(100),
    orderbookLevel: z.enum(['1', '2', '3']).default('2'),
    start: z.string().optional().describe('ISO8601 start time for candle queries'),
    end: z.string().optional().describe('ISO8601 end time for candle queries'),
})

type CoinbaseInput = z.infer<typeof coinbaseInputSchema>

type CoinbaseProduct = {
    id: string
    base_currency?: string
    quote_currency?: string
}

type CoinbaseCandlesData = {
    productId: string
    granularity: string
    candles: ReturnType<typeof normalizeCoinbaseCandles>
}

type CoinbaseOrderBookData = {
    sequence?: number
    bids: CoinbaseBookLevel[]
    asks: CoinbaseBookLevel[]
}

type CoinbaseMarketDataData =
    | CoinbaseTicker
    | CoinbaseStats
    | CoinbaseCandlesData
    | CoinbaseOrderBookData
    | CoinbaseTrade[]
    | CoinbaseProduct[]

type CoinbaseMarketDataOutput = {
    data: CoinbaseMarketDataData
    metadata: {
        source: 'coinbase-exchange'
        function: string
        symbol: string
        market: string
    }
}

/**
 * Counts the number of items in a Coinbase market-data payload.
 *
 * @param payload - The normalized Coinbase payload.
 * @returns A best-effort count for logging.
 */
function countCoinbaseMarketDataItems(
    payload: CoinbaseMarketDataOutput['data'] | undefined
): number {
    if (!payload) {
        return 0
    }

    if (Array.isArray(payload)) {
        return payload.length
    }

    if ('candles' in payload) {
        return (payload as CoinbaseCandlesData).candles.length
    }

    if ('bids' in payload) {
        return (payload as CoinbaseOrderBookData).bids.length
    }

    if ('asks' in payload) {
        return (payload as CoinbaseOrderBookData).asks.length
    }

    return 1
}

const COINBASE_BASE_URL = 'https://api.exchange.coinbase.com'

/**
 * Coinbase Exchange market-data tool.
 */
export const coinbaseExchangeMarketDataTool = createTool({
    id: 'coinbase-exchange-market-data',
    description:
        'Fetch free Coinbase Exchange public crypto market data including ticker, 24h stats, candles, order book, trades, and products.',
    inputSchema: coinbaseInputSchema,
    outputSchema: z.custom<CoinbaseMarketDataOutput>(),
    strict: true,
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Coinbase Exchange market-data input streaming started', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Coinbase Exchange market-data received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages?.length ?? 0,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Coinbase Exchange market-data received input', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            function: input.function,
            baseCurrency: input.baseCurrency,
            quoteCurrency: input.quoteCurrency,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    execute: async (input, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined = context?.tracingContext
        const requestFunction = input.function ?? 'ticker'
        const productId = buildCoinbaseProductId(
            input.baseCurrency,
            input.quoteCurrency ?? 'USD'
        )
        const granularity = input.granularity ?? '86400'
        const limit = input.limit ?? 100
        const level = input.orderbookLevel ?? '2'

        if (abortSignal?.aborted === true) {
            throw new Error('Coinbase Exchange crypto request cancelled')
        }

        const span = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'coinbase-exchange-market-data',
            input,
            metadata: {
                'tool.id': 'coinbase-exchange-market-data',
                'tool.input.function': requestFunction,
                'tool.input.productId': productId,
            },
            requestContext: context?.requestContext,
            tracingContext,
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Fetching Coinbase Exchange data for ${productId}`,
                stage: 'coinbase-exchange-market-data',
            },
            id: 'coinbase-exchange-market-data',
        })

        try {
            let data: CoinbaseMarketDataData

            switch (requestFunction) {
                case 'ticker': {
                    const response = await httpFetch(`${COINBASE_BASE_URL}/products/${encodeURIComponent(productId)}/ticker`, {
                        timeout: 30000,
                    })
                    data = (await response.json()) as CoinbaseTicker
                    break
                }
                case 'stats': {
                    const response = await httpFetch(`${COINBASE_BASE_URL}/products/${encodeURIComponent(productId)}/stats`, {
                        timeout: 30000,
                    })
                    data = (await response.json()) as CoinbaseStats
                    break
                }
                case 'candles': {
                    const response = await httpFetch(`${COINBASE_BASE_URL}/products/${encodeURIComponent(productId)}/candles`, {
                        timeout: 30000,
                        params: {
                            granularity: Number(granularity),
                            ...(input.start !== undefined ? { start: input.start } : {}),
                            ...(input.end !== undefined ? { end: input.end } : {}),
                        },
                    })
                    const rows = (await response.json()) as readonly CoinbaseCandleRow[]
                    data = {
                        productId,
                        granularity,
                        candles: normalizeCoinbaseCandles(rows).slice(-limit),
                    }
                    break
                }
                case 'orderbook': {
                    const response = await httpFetch(`${COINBASE_BASE_URL}/products/${encodeURIComponent(productId)}/book`, {
                        timeout: 30000,
                        params: {
                            level,
                        },
                    })
                    const book = (await response.json()) as {
                        sequence?: number
                        bids?: CoinbaseBookLevel[]
                        asks?: CoinbaseBookLevel[]
                    }
                    data = {
                        sequence: book.sequence,
                        bids: book.bids ?? [],
                        asks: book.asks ?? [],
                    }
                    break
                }
                case 'trades': {
                    const response = await httpFetch(`${COINBASE_BASE_URL}/products/${encodeURIComponent(productId)}/trades`, {
                        timeout: 30000,
                    })
                    data = (await response.json()) as CoinbaseTrade[]
                    break
                }
                case 'products': {
                    const response = await httpFetch(`${COINBASE_BASE_URL}/products`, {
                        timeout: 30000,
                    })
                    data = (await response.json()) as CoinbaseProduct[]
                    break
                }
                default:
                    throw new Error(`Unsupported Coinbase Exchange function: ${requestFunction}`)
            }

            const output: CoinbaseMarketDataOutput = {
                data,
                metadata: {
                    source: 'coinbase-exchange' as const,
                    function: requestFunction,
                    symbol: productId,
                    market: input.quoteCurrency ?? 'USD',
                },
            }

            span?.update({
                output,
                metadata: {
                    'tool.output.source': 'coinbase-exchange',
                },
            })
            span?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Coinbase Exchange data ready for ${productId}`,
                    stage: 'coinbase-exchange-crypto-market-data',
                },
                id: 'coinbase-exchange-crypto-market-data',
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
                    message: `❌ Coinbase Exchange request failed: ${errorMessage}`,
                    stage: 'coinbase-exchange-crypto-market-data',
                },
                id: 'coinbase-exchange-crypto-market-data',
            })

            log.error('Coinbase Exchange crypto market-data tool failed', {
                function: requestFunction,
                productId,
                error: errorMessage,
            })

            throw error instanceof Error ? error : new Error(errorMessage)
        }
    },
    toModelOutput: (output: CoinbaseMarketDataOutput) => ({
        type: 'content',
        value: [
            {
                type: 'text' as const,
                text: `Coinbase Exchange ${output.metadata.function} for ${output.metadata.symbol || 'unknown'} (${output.metadata.market})`,
            },
            {
                type: 'text' as const,
                text: `Returned ${countCoinbaseMarketDataItems(output.data)} item(s).`,
            },
        ],
    }),
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        const count = countCoinbaseMarketDataItems(output.data)

        log.info('Coinbase Exchange market-data completed', {
            toolCallId,
            toolName,
            count,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export type CoinbaseExchangeMarketDataInput = CoinbaseInput
export type CoinbaseExchangeMarketDataUITool = InferUITool<typeof coinbaseExchangeMarketDataTool>
export type CoinbaseExchangeMarketDataToolInput = InferToolInput<typeof coinbaseExchangeMarketDataTool>
export type CoinbaseExchangeMarketDataToolOutput = InferToolOutput<typeof coinbaseExchangeMarketDataTool>

