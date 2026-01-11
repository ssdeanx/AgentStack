import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    alphaVantageCryptoTool,
    alphaVantageStockTool,
    alphaVantageTool,
} from '../alpha-vantage.tool'

// Mock global fetch
const fetchMock = vi.fn()
global.fetch = fetchMock

// Helper to create properly typed RequestContext mock
const createMockRequestContext = (
    overrides: Record<string, unknown> = {}
): any => ({
    get: vi.fn((key: string) => overrides[key]),
    set: vi.fn(),
    has: vi.fn(() => false),
    delete: vi.fn(),
    entries: vi.fn(() => []),
    keys: vi.fn(() => []),
    values: vi.fn(() => []),
    forEach: vi.fn(),
    toObject: vi.fn(() => ({})),
    clear: vi.fn(),
    size: 0,
    toJSON: vi.fn(() => ({})),
    ...overrides,
})

// Helper to create properly typed TracingContext mock
const createMockTracingContext = () => ({
    currentSpan: {
        createChildSpan: vi.fn().mockReturnValue({
            update: vi.fn(),
            end: vi.fn(),
            error: vi.fn(),
            addEvent: vi.fn(),
        }),
    },
})

// Helper to create mock Writer
const createMockWriter = () => ({
    custom: vi.fn(),
})

describe('alphaVantageCryptoTool', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('successful execution', () => {
        it('should fetch crypto intraday data successfully', async () => {
            const mockResponse = {
                'Meta Data': {
                    '1. Information': 'Crypto Intraday (5min) Time Series',
                    '2. Symbol': 'BTC',
                    '3. Last Refreshed': '2025-01-11 20:00:00',
                    '4. Interval': '5min',
                    '5. Output Size': 'Compact',
                    '6. Time Zone': 'UTC',
                },
                'Time Series Crypto (5min)': {
                    '2025-01-11 20:00:00': {
                        '1. open': '50000.00',
                        '2. high': '51000.00',
                        '3. low': '49000.00',
                        '4. close': '50500.00',
                        '5. volume': '100',
                    },
                },
            }

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            })

            const mockRequestContext = createMockRequestContext({
                apiKey: 'test-api-key',
                'user-tier': 'pro',
            })

            const mockTracingContext = createMockTracingContext()
            const mockWriter = createMockWriter()

            const result = await alphaVantageCryptoTool.execute(
                {
                    function: 'CRYPTO_INTRADAY',
                    symbol: 'BTC',
                    market: 'USD',
                    interval: '5min',
                },
                {
                    requestContext: mockRequestContext,
                    tracingContext: mockTracingContext,
                    writer: mockWriter,
                }
            )

            expect(fetchMock).toHaveBeenCalledWith(
                'https://www.alphavantage.co/query?apikey=test-api-key&function=CRYPTO_INTRADAY&symbol=BTC&market=USD&interval=5min'
            )

            expect(result.data).toEqual(mockResponse)
            expect(result.metadata).toEqual({
                function: 'Crypto Intraday (5min) Time Series',
                symbol: 'BTC',
                market: 'USD',
                last_refreshed: '2025-01-11 20:00:00',
                interval: '5min',
                output_size: 'Compact',
                time_zone: 'UTC',
            })

            expect(mockWriter.custom).toHaveBeenCalledTimes(2)
            expect(
                mockTracingContext.currentSpan.createChildSpan
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: expect.stringContaining('TOOL_CALL'),
                    name: 'alpha-vantage-crypto-fetch',
                })
            )
        })

        it('should fetch currency exchange rate successfully', async () => {
            const mockResponse = {
                'Realtime Currency Exchange Rate': {
                    '1. From_Currency Code': 'BTC',
                    '2. From_Currency Name': 'Bitcoin',
                    '3. To_Currency Code': 'USD',
                    '4. To_Currency Name': 'United States Dollar',
                    '5. Exchange Rate': '50000.00',
                    '6. Last Refreshed': '2025-01-11 20:00:00',
                    '7. Time Zone': 'UTC',
                    '8. Bid Price': '49950.00',
                    '9. Ask Price': '50050.00',
                },
            }

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            })

            const mockRequestContext = createMockRequestContext({
                apiKey: 'test-api-key',
                'user-tier': 'free',
            })

            const result = await alphaVantageCryptoTool.execute(
                {
                    function: 'CURRENCY_EXCHANGE_RATE',
                    fromCurrency: 'BTC',
                    toCurrency: 'USD',
                },
                {
                    requestContext: mockRequestContext,
                }
            )

            expect(result.data).toEqual(mockResponse)
            // CURRENCY_EXCHANGE_RATE doesn't have Meta Data, so metadata is minimal
            expect(result.metadata).toEqual({
                function: 'Realtime Currency Exchange Rate',
                fromCurrency: 'BTC',
                toCurrency: 'USD',
                last_refreshed: '2025-01-11 20:00:00',
                time_zone: 'UTC',
            })
        })

        it('should use default market when not provided', async () => {
            const mockResponse = { data: 'test' }

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            })

            const mockRequestContext = createMockRequestContext({
                apiKey: 'test-api-key',
                'user-tier': 'enterprise',
            })

            await alphaVantageCryptoTool.execute(
                {
                    function: 'CRYPTO_DAILY',
                    symbol: 'ETH',
                },
                {
                    requestContext: mockRequestContext,
                }
            )

            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('market=USD'),
                expect.any(Object)
            )
        })

        it('should handle optional parameters correctly', async () => {
            const mockResponse = { data: 'test' }

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            })

            const mockRequestContext = createMockRequestContext({
                apiKey: 'test-api-key',
                'user-tier': 'pro',
            })

            await alphaVantageCryptoTool.execute(
                {
                    function: 'CRYPTO_INTRADAY',
                    symbol: 'BTC',
                    market: 'EUR',
                    interval: '1min',
                    outputsize: 'full',
                    datatype: 'csv',
                },
                {
                    requestContext: mockRequestContext,
                }
            )

            const expectedUrl =
                'https://www.alphavantage.co/query?apikey=test-api-key&function=CRYPTO_INTRADAY&symbol=BTC&market=EUR&interval=1min&outputsize=full&datatype=csv'
            expect(fetchMock).toHaveBeenCalledWith(
                expectedUrl,
                expect.any(Object)
            )
        })
    })

    describe('error handling', () => {
        it('should throw error when API key is missing', async () => {
            const mockRequestContext = createMockRequestContext({
                'user-tier': 'free',
            })

            const mockWriter = createMockWriter()

            await expect(
                alphaVantageCryptoTool.execute(
                    {
                        function: 'CRYPTO_DAILY',
                        symbol: 'BTC',
                    },
                    {
                        requestContext: mockRequestContext,
                        writer: mockWriter,
                    }
                )
            ).rejects.toThrow(
                'ALPHA_VANTAGE_API_KEY environment variable is required'
            )

            expect(mockWriter.custom).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        message: '❌ Missing ALPHA_VANTAGE_API_KEY',
                        status: 'done',
                    }),
                })
            )
        })

        it('should throw error when API key is empty', async () => {
            const mockRequestContext = createMockRequestContext({
                apiKey: '',
                'user-tier': 'pro',
            })

            await expect(
                alphaVantageCryptoTool.execute(
                    {
                        function: 'CRYPTO_DAILY',
                        symbol: 'BTC',
                    },
                    {
                        requestContext: mockRequestContext,
                    }
                )
            ).rejects.toThrow(
                'ALPHA_VANTAGE_API_KEY environment variable is required'
            )
        })

        it('should handle network errors', async () => {
            fetchMock.mockRejectedValueOnce(new Error('Network error'))

            const mockRequestContext = createMockRequestContext({
                apiKey: 'test-api-key',
                'user-tier': 'pro',
            })

            const mockTracingContext = {
                currentSpan: {
                    createChildSpan: vi.fn().mockReturnValue({
                        error: vi.fn(),
                        end: vi.fn(),
                    }),
                },
            }

            await expect(
                alphaVantageCryptoTool.execute(
                    {
                        function: 'CRYPTO_DAILY',
                        symbol: 'BTC',
                    },
                    {
                        requestContext: mockRequestContext,
                        tracingContext: mockTracingContext,
                    }
                )
            ).rejects.toThrow('Network error')

            expect(
                mockTracingContext.currentSpan.createChildSpan
            ).toHaveBeenCalled()
        })

        it('should handle API HTTP errors', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            })

            const mockRequestContext = createMockRequestContext({
                apiKey: 'test-api-key',
                'user-tier': 'enterprise',
            })

            await expect(
                alphaVantageCryptoTool.execute(
                    {
                        function: 'CRYPTO_DAILY',
                        symbol: 'BTC',
                    },
                    {
                        requestContext: mockRequestContext,
                    }
                )
            ).rejects.toThrow(
                'Alpha Vantage API error: 500 Internal Server Error'
            )
        })

        it('should handle API error messages', async () => {
            const mockResponse = {
                'Error Message':
                    'Invalid API call. Please retry or visit the documentation.',
            }

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            })

            const mockRequestContext = createMockRequestContext({
                apiKey: 'invalid-key',
                'user-tier': 'free',
            })

            await expect(
                alphaVantageCryptoTool.execute(
                    {
                        function: 'CRYPTO_DAILY',
                        symbol: 'INVALID',
                    },
                    {
                        requestContext: mockRequestContext,
                    }
                )
            ).rejects.toThrow(
                'Invalid API call. Please retry or visit the documentation.'
            )
        })

        it('should handle rate limit errors', async () => {
            const mockResponse = {
                Note: 'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute and 500 calls per day.',
            }

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            })

            const mockRequestContext = createMockRequestContext({
                apiKey: 'test-api-key',
                'user-tier': 'free',
            })

            await expect(
                alphaVantageCryptoTool.execute(
                    {
                        function: 'CRYPTO_DAILY',
                        symbol: 'BTC',
                    },
                    {
                        requestContext: mockRequestContext,
                    }
                )
            ).rejects.toThrow(
                'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute and 500 calls per day.'
            )
        })
    })

    describe('input validation', () => {
        it('should validate required fields', async () => {
            const mockRequestContext = createMockRequestContext({
                apiKey: 'test-api-key',
                'user-tier': 'pro',
            })

            await expect(
                alphaVantageCryptoTool.execute(
                    {
                        // Missing required function
                        symbol: 'BTC',
                    } as any,
                    {
                        requestContext: mockRequestContext,
                    }
                )
            ).rejects.toThrow() // Zod validation error
        })

        it('should validate function enum values', async () => {
            const mockRequestContext = createMockRequestContext({
                apiKey: 'test-api-key',
                'user-tier': 'pro',
            })

            await expect(
                alphaVantageCryptoTool.execute(
                    {
                        function: 'INVALID_FUNCTION' as any,
                        symbol: 'BTC',
                    },
                    {
                        requestContext: mockRequestContext,
                    }
                )
            ).rejects.toThrow() // Zod validation error
        })
    })

    describe('progress events', () => {
        it('should emit progress events during execution', async () => {
            const mockResponse = { data: 'test' }

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            })

            const mockRequestContext = createMockRequestContext({
                apiKey: 'test-api-key',
                'user-tier': 'pro',
            })

            const mockWriter = createMockWriter()

            await alphaVantageCryptoTool.execute(
                {
                    function: 'CRYPTO_DAILY',
                    symbol: 'BTC',
                },
                {
                    requestContext: mockRequestContext,
                    writer: mockWriter,
                }
            )

            expect(mockWriter.custom).toHaveBeenCalledTimes(2)
            expect(mockWriter.custom).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    data: expect.objectContaining({
                        message:
                            '📈 Fetching Alpha Vantage crypto data for BTC/USD',
                        status: 'in-progress',
                        stage: 'alpha-vantage-crypto',
                    }),
                })
            )
            expect(mockWriter.custom).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    data: expect.objectContaining({
                        message: '✅ Crypto data ready for BTC',
                        status: 'done',
                        stage: 'alpha-vantage-crypto',
                    }),
                })
            )
        })
    })
})

describe('alphaVantageStockTool', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('successful execution', () => {
        it('should fetch stock time series data successfully', async () => {
            const mockResponse = {
                'Meta Data': {
                    '1. Information':
                        'Daily Prices (open, high, low, close) and Volumes',
                    '2. Symbol': 'AAPL',
                    '3. Last Refreshed': '2025-01-11',
                    '4. Output Size': 'Compact',
                    '5. Time Zone': 'US/Eastern',
                },
                'Time Series (Daily)': {
                    '2025-01-11': {
                        '1. open': '150.00',
                        '2. high': '155.00',
                        '3. low': '148.00',
                        '4. close': '152.00',
                        '5. volume': '1000000',
                    },
                },
            }

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            })

            const mockRequestContext = createMockRequestContext({
                apiKey: 'test-api-key',
                'user-tier': 'pro',
            })

            const result = await alphaVantageStockTool.execute(
                {
                    function: 'TIME_SERIES_DAILY',
                    symbol: 'AAPL',
                },
                {
                    requestContext: mockRequestContext,
                }
            )

            expect(result.data).toEqual(mockResponse)
            expect(result.metadata).toEqual({
                function: 'Daily Prices (open, high, low, close) and Volumes',
                symbol: 'AAPL',
                last_refreshed: '2025-01-11',
                interval: undefined,
                output_size: 'Compact',
                time_zone: 'US/Eastern',
                indicator: undefined,
                time_period: undefined,
                series_type: undefined,
            })
        })

        it('should fetch technical indicators', async () => {
            const mockResponse = {
                'Meta Data': {
                    '1. Symbol': 'AAPL',
                    '2. Indicator': 'Simple Moving Average (SMA)',
                    '3. Last Refreshed': '2025-01-11',
                    '4. Interval': 'daily',
                    '5. Time Period': '20',
                    '6. Series Type': 'close',
                    '7. Time Zone': 'US/Eastern',
                },
                'Technical Analysis: SMA': {
                    '2025-01-11': {
                        SMA: '152.50',
                    },
                },
            }

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            })

            const mockRequestContext = createMockRequestContext({
                apiKey: 'test-api-key',
                'user-tier': 'enterprise',
            })

            const result = await alphaVantageStockTool.execute(
                {
                    function: 'SMA',
                    symbol: 'AAPL',
                    interval: 'daily',
                    time_period: 20,
                    series_type: 'close',
                },
                {
                    requestContext: mockRequestContext,
                }
            )

            expect(result.data).toEqual(mockResponse)
            expect(result.metadata).toEqual({
                function: 'Simple Moving Average (SMA)',
                symbol: 'AAPL',
                last_refreshed: '2025-01-11',
                interval: 'daily',
                output_size: undefined,
                time_zone: 'US/Eastern',
                indicator: 'Simple Moving Average (SMA)',
                time_period: '20',
                series_type: 'close',
            })
        })
    })

    describe('tracing', () => {
        it('should create and manage tracing spans', async () => {
            const mockResponse = { data: 'test' }

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            })

            const mockRequestContext = createMockRequestContext({
                apiKey: 'test-api-key',
                'user-tier': 'pro',
            })

            const mockTracingContext = createMockTracingContext()

            await alphaVantageStockTool.execute(
                {
                    function: 'GLOBAL_QUOTE',
                    symbol: 'AAPL',
                },
                {
                    requestContext: mockRequestContext,
                    tracingContext: mockTracingContext,
                }
            )

            expect(
                mockTracingContext.currentSpan.createChildSpan
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: expect.stringContaining('TOOL_CALL'),
                    name: 'alpha-vantage-stock-fetch',
                    input: expect.objectContaining({
                        function: 'GLOBAL_QUOTE',
                        symbol: 'AAPL',
                    }),
                    metadata: expect.objectContaining({
                        'tool.id': 'alpha-vantage-stock',
                        'tool.input.symbol': 'AAPL',
                        'tool.input.function': 'GLOBAL_QUOTE',
                    }),
                })
            )
        })
    })
})

describe('alphaVantageTool (legacy)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should fetch general financial data successfully', async () => {
        const mockResponse = {
            'Meta Data': {
                '1. Information': 'FX Daily',
                '2. From Symbol': 'EUR',
                '3. To Symbol': 'USD',
                '4. Last Refreshed': '2025-01-11',
                '5. Time Zone': 'UTC',
            },
            'Time Series FX (Daily)': {
                '2025-01-11': {
                    '1. open': '1.0500',
                    '2. high': '1.0600',
                    '3. low': '1.0400',
                    '4. close': '1.0550',
                },
            },
        }

        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse),
        })

        const mockRequestContext = createMockRequestContext({
            apiKey: 'test-api-key',
            'user-tier': 'free',
        })

        const result = await alphaVantageTool.execute(
            {
                function: 'FX_DAILY',
                fromSymbol: 'EUR',
                toSymbol: 'USD',
            },
            {
                requestContext: mockRequestContext,
            }
        )

        expect(result.data).toEqual(mockResponse)
        expect(result.metadata).toEqual({
            function: 'FX Daily',
            fromSymbol: 'EUR',
            toSymbol: 'USD',
            last_refreshed: '2025-01-11',
            interval: undefined,
            output_size: undefined,
            time_zone: 'UTC',
        })
    })

    it('should handle economic indicators', async () => {
        const mockResponse = {
            data: [
                {
                    date: '2025-01-11',
                    value: '3.50',
                },
            ],
        }

        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse),
        })

        const mockRequestContext = createMockRequestContext({
            apiKey: 'test-api-key',
            'user-tier': 'pro',
        })

        const result = await alphaVantageTool.execute(
            {
                function: 'ECONOMIC_INDICATORS',
                economic_indicator: 'FEDERAL_FUNDS_RATE',
            },
            {
                requestContext: mockRequestContext,
            }
        )

        expect(result.data).toEqual(mockResponse)
    })
})

describe('lifecycle hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should call onInputStart hook', async () => {
        const mockResponse = { data: 'test' }
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse),
        })

        const mockRequestContext = createMockRequestContext({
            apiKey: 'test-api-key',
            'user-tier': 'pro',
        })

        const logSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

        await alphaVantageCryptoTool.execute(
            {
                function: 'CRYPTO_DAILY',
                symbol: 'BTC',
            },
            {
                requestContext: mockRequestContext,
            }
        )

        expect(logSpy).toHaveBeenCalledWith(
            'Alpha Vantage tool input streaming started',
            expect.objectContaining({
                messageCount: expect.any(Number),
                abortSignal: expect.any(Object),
                hook: 'onInputStart',
            })
        )

        logSpy.mockRestore()
    })

    it('should call onInputAvailable hook', async () => {
        const mockResponse = { data: 'test' }
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse),
        })

        const mockRequestContext = createMockRequestContext({
            apiKey: 'test-api-key',
            'user-tier': 'pro',
        })

        const logSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

        await alphaVantageCryptoTool.execute(
            {
                function: 'CRYPTO_DAILY',
                symbol: 'BTC',
            },
            {
                requestContext: mockRequestContext,
            }
        )

        expect(logSpy).toHaveBeenCalledWith(
            'Alpha Vantage crypto received input',
            expect.objectContaining({
                symbol: 'BTC',
                market: 'USD',
                function: 'CRYPTO_DAILY',
                abortSignal: expect.any(Object),
                hook: 'onInputAvailable',
            })
        )

        logSpy.mockRestore()
    })

    it('should call onOutput hook', async () => {
        const mockResponse = { data: { test: 'data' } }
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse),
        })

        const mockRequestContext = createMockRequestContext({
            apiKey: 'test-api-key',
            'user-tier': 'pro',
        })

        const logSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

        await alphaVantageCryptoTool.execute(
            {
                function: 'CRYPTO_DAILY',
                symbol: 'BTC',
            },
            {
                requestContext: mockRequestContext,
            }
        )

        expect(logSpy).toHaveBeenCalledWith(
            'Alpha Vantage crypto completed',
            expect.objectContaining({
                toolName: 'alpha-vantage-crypto',
                symbol: 'BTC',
                dataKeys: 1,
                abortSignal: expect.any(Object),
                hook: 'onOutput',
            })
        )

        logSpy.mockRestore()
    })
})
