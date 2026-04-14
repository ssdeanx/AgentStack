import { describe, expect, it } from 'vitest'

import {
    buildBinanceSymbol,
    buildCoinbaseProductId,
    buildStooqSymbol,
    normalizeBinanceKlines,
    normalizeCoinbaseCandles,
    normalizeYahooChartHistory,
    parseStooqCsv,
} from '../market-data.helpers'

describe('market data helpers', () => {
    it('should build Binance symbols correctly', () => {
        expect(buildBinanceSymbol('btc')).toBe('BTCUSDT')
        expect(buildBinanceSymbol('BTCUSDT')).toBe('BTCUSDT')
        expect(buildBinanceSymbol('eth', 'BTC')).toBe('ETHBTC')
    })

    it('should build Coinbase product ids correctly', () => {
        expect(buildCoinbaseProductId('btc')).toBe('BTC-USD')
        expect(buildCoinbaseProductId('eth', 'eur')).toBe('ETH-EUR')
    })

    it('should build Stooq symbols correctly', () => {
        expect(buildStooqSymbol('AAPL')).toBe('aapl.us')
        expect(buildStooqSymbol('msft', 'uk')).toBe('msft.uk')
        expect(buildStooqSymbol('x.us')).toBe('x.us')
    })

    it('should parse Stooq CSV rows', () => {
        const rows = parseStooqCsv('Symbol,Date,Open\nAAPL.US,2026-04-14,210.12')
        expect(rows).toHaveLength(1)
        expect(rows[0].Symbol).toBe('AAPL.US')
        expect(rows[0].Date).toBe('2026-04-14')
    })

    it('should normalize Binance klines', () => {
        const rows = normalizeBinanceKlines([
            [1713052800000, '100', '110', '95', '108', '1234', 1713052859999, '0', 0, '0', '0', '0'],
        ])
        expect(rows).toHaveLength(1)
        expect(rows[0].open).toBe(100)
        expect(rows[0].close).toBe(108)
    })

    it('should normalize Coinbase candles', () => {
        const rows = normalizeCoinbaseCandles([[1713052800, 95, 110, 100, 108, 1234]])
        expect(rows).toHaveLength(1)
        expect(rows[0].open).toBe(100)
        expect(rows[0].close).toBe(108)
    })

    it('should normalize Yahoo chart history rows', () => {
        const rows = normalizeYahooChartHistory({
            chart: {
                result: [
                    {
                        timestamp: [1713052800],
                        indicators: {
                            quote: [
                                {
                                    open: [100],
                                    high: [110],
                                    low: [95],
                                    close: [108],
                                    volume: [1234],
                                },
                            ],
                        },
                    },
                ],
            },
        })

        expect(rows).toHaveLength(1)
        expect(rows[0].open).toBe(100)
        expect(rows[0].close).toBe(108)
    })
})