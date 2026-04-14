import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import type { TracingContext } from '@mastra/core/observability'
import type { RequestContext } from '@mastra/core/request-context'
import { createTool, type InferUITool } from '@mastra/core/tools'
import { z } from 'zod'
import { log } from '../config/logger'
import { httpFetch } from '../lib/http-client'
import {
    buildBinanceSymbol,
    normalizeBinanceKlines,
} from './market-data.helpers'
import type {
    Binance24hrTicker,
    BinanceAggTrade,
    BinanceAvgPrice,
    BinanceExchangeInfo,
    BinanceQuote,
    BinanceTrade,
    BinanceKlineRow,
    NormalizedCandle,
} from './market-data.helpers'

/**
 * Shared request context for Binance crypto data.
 */
export interface BinanceCryptoMarketContext extends RequestContext {
    userId?: string
}

const binanceIntervalSchema = z.enum([
    '1m',
    '3m',
    '5m',
    '15m',
    '30m',
    '1h',
    '2h',
    '4h',
    '6h',
    '8h',
    '12h',
    '1d',
    '3d',
    '1w',
    '1M',
])

const binanceCryptoInputSchema = z.object({
    function: z
        .enum([
            'quote',
            'stats24hr',
            'candles',
            'uiKlines',
            'orderbook',
            'trades',
            'aggTrades',
            'avgPrice',
            'exchangeInfo',
        ])
        .default('quote')
        .describe('Binance public market-data function'),
    symbol: z.string().min(1).describe('Base asset symbol, e.g. BTC or ETH'),
    quoteAsset: z
        .string()
        .default('USDT')
        .describe('Quote asset used to build the Binance pair'),
    interval: binanceIntervalSchema.default('1d'),
    limit: z.number().int().min(1).max(1000).default(100),
    fromId: z.number().int().nonnegative().optional(),
    startTime: z.number().int().positive().optional(),
    endTime: z.number().int().positive().optional(),
    timeZone: z.string().optional(),
})

type BinanceCryptoInput = z.infer<typeof binanceCryptoInputSchema>

type BinanceSpotQuoteData = BinanceQuote
type BinanceSpotStats24hrData = Binance24hrTicker
type BinanceSpotCandlesData = {
    symbol: string
    interval: string
    candles: NormalizedCandle[]
}
type BinanceSpotOrderBookData = {
    symbol: string
    lastUpdateId: number | null
    bids: Array<{ price: number; quantity: number }>
    asks: Array<{ price: number; quantity: number }>
}
type BinanceSpotTradesData = {
    symbol: string
    trades: BinanceTrade[]
}
type BinanceSpotAggTradesData = {
    symbol: string
    aggTrades: BinanceAggTrade[]
}
type BinanceSpotAvgPriceData = BinanceAvgPrice & { symbol: string }
type BinanceSpotExchangeInfoData = BinanceExchangeInfo

type BinanceSpotMarketDataData =
    | BinanceSpotQuoteData
    | BinanceSpotStats24hrData
    | BinanceSpotCandlesData
    | BinanceSpotOrderBookData
    | BinanceSpotTradesData
    | BinanceSpotAggTradesData
    | BinanceSpotAvgPriceData
    | BinanceSpotExchangeInfoData

type BinanceSpotMarketDataOutput = {
    data: BinanceSpotMarketDataData
    metadata: {
        source: 'binance'
        function: string
        symbol: string
        market: string
    }
}

/**
 * Counts the number of items represented by a Binance market-data output payload.
 *
 * @param payload - The normalized Binance market-data payload.
 * @returns A best-effort item count for logging.
 */
function countBinanceMarketDataItems(
    payload: BinanceSpotMarketDataOutput['data'] | undefined
): number {
    if (!payload) {
        return 0
    }

    if ('candles' in payload) {
        return (payload as BinanceSpotCandlesData).candles.length
    }

    if ('trades' in payload) {
        return (payload as BinanceSpotTradesData).trades.length
    }

    if ('aggTrades' in payload) {
        return (payload as BinanceSpotAggTradesData).aggTrades.length
    }

    if ('bids' in payload) {
        return (payload as BinanceSpotOrderBookData).bids.length
    }

    if ('asks' in payload) {
        return (payload as BinanceSpotOrderBookData).asks.length
    }

    return 1
}

const BINANCE_BASE_URL = 'https://data-api.binance.vision'

/**
 * Binance crypto market-data tool.
 */
export const binanceSpotMarketDataTool = createTool({
    id: 'binance-spot-market-data',
    description:
        'Fetch free Binance public spot market data including quotes, 24h stats, candles, UI klines, order book, trades, aggregate trades, average price, and exchange info.',
    inputSchema: binanceCryptoInputSchema,
    outputSchema: z.custom<BinanceSpotMarketDataOutput>(),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Binance spot market-data input streaming started', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Binance spot market-data received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages?.length ?? 0,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Binance spot market-data received input', {
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
        const interval = input.interval ?? '1d'
        const market = input.quoteAsset ?? 'USDT'
        const symbol = buildBinanceSymbol(input.symbol, market)

        if (abortSignal?.aborted === true) {
            throw new Error('Binance crypto request cancelled')
        }

        const span = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'binance-spot-market-data',
            input,
            metadata: {
                'tool.id': 'binance-spot-market-data',
                'tool.input.function': requestFunction,
                'tool.input.symbol': symbol,
            },
            requestContext: context?.requestContext,
            tracingContext,
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Fetching Binance spot data for ${symbol}`,
                stage: 'binance-spot-market-data',
            },
            id: 'binance-spot-market-data',
        })

        try {
            let data: BinanceSpotMarketDataData

            switch (requestFunction) {
                case 'quote': {
                    const response = await httpFetch(`${BINANCE_BASE_URL}/api/v3/ticker/price`, {
                        timeout: 30000,
                        params: { symbol },
                    })
                    data = await response.json()
                    break
                }
                case 'stats24hr': {
                    const response = await httpFetch(`${BINANCE_BASE_URL}/api/v3/ticker/24hr`, {
                        timeout: 30000,
                        params: { symbol },
                    })
                    data = await response.json()
                    break
                }
                case 'candles': {
                    const response = await httpFetch(`${BINANCE_BASE_URL}/api/v3/klines`, {
                        timeout: 30000,
                        params: {
                            symbol,
                            interval,
                            limit,
                            ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
                            ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
                            ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
                        },
                    })
                    const rows = (await response.json()) as readonly BinanceKlineRow[]
                    data = {
                        symbol,
                        interval,
                        candles: normalizeBinanceKlines(rows).slice(-limit),
                    }
                    break
                }
                case 'uiKlines': {
                    const response = await httpFetch(`${BINANCE_BASE_URL}/api/v3/uiKlines`, {
                        timeout: 30000,
                        params: {
                            symbol,
                            interval,
                            limit,
                            ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
                            ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
                            ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
                        },
                    })
                    const rows = (await response.json()) as readonly BinanceKlineRow[]
                    data = {
                        symbol,
                        interval,
                        candles: normalizeBinanceKlines(rows).slice(-limit),
                    }
                    break
                }
                case 'orderbook': {
                    const response = await httpFetch(`${BINANCE_BASE_URL}/api/v3/depth`, {
                        timeout: 30000,
                        params: {
                            symbol,
                            limit,
                        },
                    })
                    data = (await response.json()) as BinanceSpotOrderBookData
                    break
                }
                case 'trades': {
                    const response = await httpFetch(`${BINANCE_BASE_URL}/api/v3/trades`, {
                        timeout: 30000,
                        params: {
                            symbol,
                            limit,
                        },
                    })
                    const trades = (await response.json()) as BinanceTrade[]
                    data = {
                        symbol,
                        trades,
                    }
                    break
                }
                case 'aggTrades': {
                    const response = await httpFetch(`${BINANCE_BASE_URL}/api/v3/aggTrades`, {
                        timeout: 30000,
                        params: {
                            symbol,
                            limit,
                            ...(input.fromId !== undefined ? { fromId: input.fromId } : {}),
                            ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
                            ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
                        },
                    })
                    const aggTrades = (await response.json()) as BinanceAggTrade[]
                    data = {
                        symbol,
                        aggTrades,
                    }
                    break
                }
                case 'avgPrice': {
                    const response = await httpFetch(`${BINANCE_BASE_URL}/api/v3/avgPrice`, {
                        timeout: 30000,
                        params: { symbol },
                    })
                    data = {
                        ...(await response.json()),
                        symbol,
                    } as BinanceSpotAvgPriceData
                    break
                }
                case 'exchangeInfo': {
                    const response = await httpFetch(`${BINANCE_BASE_URL}/api/v3/exchangeInfo`, {
                        timeout: 30000,
                        params: { symbol },
                    })
                    data = (await response.json()) as BinanceSpotExchangeInfoData
                    break
                }
                default:
                    throw new Error(`Unsupported Binance function: ${requestFunction}`)
            }

            const output: BinanceSpotMarketDataOutput = {
                data,
                metadata: {
                    source: 'binance' as const,
                    function: requestFunction,
                    symbol,
                    market,
                },
            }

            span?.update({
                output,
                metadata: {
                    'tool.output.source': 'binance',
                },
            })
            span?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Binance crypto data ready for ${symbol}`,
                    stage: 'binance-crypto-market-data',
                },
                id: 'binance-crypto-market-data',
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
                    message: `❌ Binance crypto request failed: ${errorMessage}`,
                    stage: 'binance-crypto-market-data',
                },
                id: 'binance-crypto-market-data',
            })

            log.error('Binance crypto market-data tool failed', {
                function: requestFunction,
                symbol,
                error: errorMessage,
            })

            throw error instanceof Error ? error : new Error(errorMessage)
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        const data = output as BinanceSpotMarketDataOutput | undefined
        const count = countBinanceMarketDataItems(data?.data)

        log.info('Binance spot market-data completed', {
            toolCallId,
            toolName,
            count,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export type BinanceSpotMarketDataInput = BinanceCryptoInput
export type BinanceSpotMarketDataUITool = InferUITool<typeof binanceSpotMarketDataTool>