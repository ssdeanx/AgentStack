import { parse } from 'csv-parse/sync'

/**
 * Normalized OHLCV candle row used by the market-data tools.
 */
export interface NormalizedCandle {
    timestamp: string
    open: number | null
    high: number | null
    low: number | null
    close: number | null
    volume: number | null
}

/**
 * Binance kline row tuple.
 */
export type BinanceKlineRow = readonly [
    number,
    string,
    string,
    string,
    string,
    string,
    number,
    string,
    number,
    string,
    string,
    string,
]

/**
 * Binance aggregate trade row.
 */
export interface BinanceAggTrade {
    a: number
    p: string
    q: string
    f: number
    l: number
    T: number
    m: boolean
    M: boolean
}

/**
 * Binance recent trade row.
 */
export interface BinanceTrade {
    id: number
    price: string
    qty: string
    quoteQty: string
    time: number
    isBuyerMaker: boolean
    isBestMatch: boolean
}

/**
 * Binance quote response.
 */
export interface BinanceQuote {
    symbol: string
    price: string
}

/**
 * Binance 24h ticker response.
 */
export interface Binance24hrTicker {
    symbol: string
    priceChange: string
    priceChangePercent: string
    weightedAvgPrice?: string
    prevClosePrice?: string
    lastPrice: string
    lastQty?: string
    bidPrice?: string
    bidQty?: string
    askPrice?: string
    askQty?: string
    openPrice: string
    highPrice: string
    lowPrice: string
    volume: string
    quoteVolume: string
    openTime?: number
    closeTime?: number
    firstId?: number
    lastId?: number
    count?: number
}

/**
 * Binance average price response.
 */
export interface BinanceAvgPrice {
    mins: number
    price: string
    closeTime: number
}

/**
 * Binance exchange info symbol record.
 */
export interface BinanceExchangeInfoSymbol {
    symbol: string
    status?: string
    baseAsset?: string
    quoteAsset?: string
}

/**
 * Binance exchange info response.
 */
export interface BinanceExchangeInfo {
    timezone?: string
    symbols?: BinanceExchangeInfoSymbol[]
}

/**
 * Coinbase candle row.
 */
export type CoinbaseCandleRow = readonly [
    number,
    number,
    number,
    number,
    number,
    number,
]

/**
 * Coinbase ticker response.
 */
export interface CoinbaseTicker {
    trade_id?: number
    price?: string
    size?: string
    bid?: string
    ask?: string
    volume?: string
    time?: string
}

/**
 * Coinbase stats response.
 */
export interface CoinbaseStats {
    open?: string
    high?: string
    low?: string
    last?: string
    volume?: string
    volume_30day?: string
}

/**
 * Coinbase order book entry.
 */
export type CoinbaseBookLevel = readonly [string, string, string?]

/**
 * Coinbase trade row.
 */
export interface CoinbaseTrade {
    trade_id?: number
    side?: 'buy' | 'sell'
    price?: string
    size?: string
    time?: string
}

/**
 * Yahoo Finance chart response.
 */
export interface YahooChartResponse {
    chart?: {
        result?: Array<{
            timestamp?: number[]
            indicators?: {
                quote?: Array<{
                    open?: Array<number | null>
                    high?: Array<number | null>
                    low?: Array<number | null>
                    close?: Array<number | null>
                    volume?: Array<number | null>
                }>
            }
        }>
    }
}

/**
 * Yahoo Finance quote record.
 */
export interface YahooQuote {
    symbol?: string
    shortName?: string
    longName?: string
    currency?: string
    regularMarketPrice?: number
    regularMarketChange?: number
    regularMarketChangePercent?: number
    marketCap?: number
    regularMarketDayHigh?: number
    regularMarketDayLow?: number
    regularMarketTime?: number
}

/**
 * Builds a Binance spot symbol from a base asset and quote asset.
 *
 * @param symbol - Base asset or already combined trading pair.
 * @param quoteAsset - Quote asset used when the pair is not already combined.
 * @returns Binance trading symbol.
 */
export function buildBinanceSymbol(
    symbol: string,
    quoteAsset = 'USDT'
): string {
    const normalizedSymbol = symbol.trim().toUpperCase()
    const normalizedQuoteAsset = quoteAsset.trim().toUpperCase()

    if (normalizedSymbol.endsWith(normalizedQuoteAsset)) {
        return normalizedSymbol
    }

    return `${normalizedSymbol}${normalizedQuoteAsset}`
}

/**
 * Builds a Coinbase Exchange product id from base and quote currencies.
 *
 * @param baseCurrency - Base currency such as BTC.
 * @param quoteCurrency - Quote currency such as USD.
 * @returns Coinbase product id like BTC-USD.
 */
export function buildCoinbaseProductId(
    baseCurrency: string,
    quoteCurrency = 'USD'
): string {
    return `${baseCurrency.trim().toUpperCase()}-${quoteCurrency.trim().toUpperCase()}`
}

/**
 * Builds a Stooq symbol from a ticker and optional market suffix.
 *
 * @param symbol - Stock ticker symbol.
 * @param marketSuffix - Stooq market suffix.
 * @returns Stooq symbol in the form `ticker.suffix`.
 */
export function buildStooqSymbol(
    symbol: string,
    marketSuffix = 'us'
): string {
    const normalized = symbol.trim().toLowerCase()
    if (normalized.includes('.')) {
        return normalized
    }
    return `${normalized}.${marketSuffix.trim().toLowerCase()}`
}

/**
 * Parses a CSV payload from Stooq into row objects.
 *
 * @param csvText - Raw CSV response body.
 * @returns Parsed rows.
 */
export function parseStooqCsv(csvText: string): Array<Record<string, string>> {
    return parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    }) as Array<Record<string, string>>
}

/**
 * Normalizes Binance kline arrays into a common candle shape.
 *
 * @param rows - Raw Binance kline response.
 * @returns Normalized candles.
 */
export function normalizeBinanceKlines(
    rows: readonly BinanceKlineRow[]
): NormalizedCandle[] {
    return rows
        .map((row) => {
            const openTime = Number(row[0] ?? 0)
            return {
                timestamp: new Date(openTime).toISOString(),
                open: Number(row[1] ?? 0),
                high: Number(row[2] ?? 0),
                low: Number(row[3] ?? 0),
                close: Number(row[4] ?? 0),
                volume: Number(row[5] ?? 0),
            }
        })
}

/**
 * Normalizes Coinbase candle arrays into a common candle shape.
 *
 * @param rows - Raw Coinbase candle response.
 * @returns Normalized candles.
 */
export function normalizeCoinbaseCandles(
    rows: readonly CoinbaseCandleRow[]
): NormalizedCandle[] {
    return rows
        .map((row) => {
            const timestamp = Number(row[0] ?? 0)
            return {
                timestamp: new Date(timestamp * 1000).toISOString(),
                low: Number(row[1] ?? 0),
                high: Number(row[2] ?? 0),
                open: Number(row[3] ?? 0),
                close: Number(row[4] ?? 0),
                volume: Number(row[5] ?? 0),
            }
        })
}

/**
 * Converts a Yahoo Finance chart response into a normalized series.
 *
 * @param response - Yahoo chart API response.
 * @returns History rows with OHLCV data.
 */
export function normalizeYahooChartHistory(
    response: YahooChartResponse
): NormalizedCandle[] {
    const result = response.chart?.result?.[0]
    const timestamps = result?.timestamp ?? []
    const quote = result?.indicators?.quote?.[0]

    return timestamps.map((timestamp, index) => ({
        timestamp: new Date(timestamp * 1000).toISOString(),
        open: quote?.open?.[index] ?? null,
        high: quote?.high?.[index] ?? null,
        low: quote?.low?.[index] ?? null,
        close: quote?.close?.[index] ?? null,
        volume: quote?.volume?.[index] ?? null,
    }))
}