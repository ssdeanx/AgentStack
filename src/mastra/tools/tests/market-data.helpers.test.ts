import { describe, expect, it } from 'vitest'

import {
    buildBinanceSymbol,
    buildCoinbaseProductId,
    buildStooqQuoteSnapshot,
    buildStooqSymbol,
    buildYahooQuoteSnapshotFromChart,
    normalizeBinanceKlines,
    normalizeCoinbaseCandles,
    normalizeYahooChartHistory,
    parseStooqCsv,
} from '../market-data.helpers'

function resolveBinanceSymbolsForTest(symbol: string, quoteAsset = 'USDT'): string[] {
    return [buildBinanceSymbol(symbol, quoteAsset)]
}

describe('market data helpers', () => {
    it('should build Binance symbols correctly', () => {
        expect(buildBinanceSymbol('btc')).toBe('BTCUSDT')
        expect(buildBinanceSymbol('BTCUSDT')).toBe('BTCUSDT')
        expect(buildBinanceSymbol('eth', 'BTC')).toBe('ETHBTC')
    })

    it('should resolve Binance batch symbol input shape', () => {
        expect(resolveBinanceSymbolsForTest('btc')).toEqual(['BTCUSDT'])
        expect(resolveBinanceSymbolsForTest('eth', 'BTC')).toEqual(['ETHBTC'])
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

    it('should build a Stooq quote snapshot from a row', () => {
        const snapshot = buildStooqQuoteSnapshot(
            {
                Symbol: 'AAPL.US',
                Date: '2026-04-14',
                Time: '16:00:00',
                Open: '210.12',
                High: '214.88',
                Low: '209.44',
                Close: '213.75',
                Volume: '12345678',
                Name: 'Apple Inc',
            },
            'aapl.us'
        )

        expect(snapshot.symbol).toBe('AAPL.US')
        expect(snapshot.close).toBe(213.75)
        expect(snapshot.name).toBe('Apple Inc')
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

    it('should build a Yahoo quote snapshot from chart history', () => {
        const snapshot = buildYahooQuoteSnapshotFromChart(
            {
                chart: {
                    result: [
                        {
                            timestamp: [1713052800, 1713139200],
                            indicators: {
                                quote: [
                                    {
                                        open: [100, 108],
                                        high: [110, 115],
                                        low: [95, 107],
                                        close: [108, 112],
                                        volume: [1234, 4567],
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
            'AAPL'
        )

        expect(snapshot?.symbol).toBe('AAPL')
        expect(snapshot?.marketPrice).toBe(112)
        expect(snapshot?.marketChange).toBe(4)
        expect(snapshot?.dayHigh).toBe(115)
    })
})