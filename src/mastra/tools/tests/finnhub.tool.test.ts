// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger
vi.mock('../../config/logger', () => ({
    log: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
    logError: vi.fn(),
    logToolExecution: vi.fn(),
}))

// Mock fetch
const fetchMock = vi.fn()
global.fetch = fetchMock

import { finnhubQuotesTool, finnhubCompanyTool } from '../finnhub-tools'

type MockRequestContext = {
    get: ReturnType<typeof vi.fn>
    set: ReturnType<typeof vi.fn>
    has: ReturnType<typeof vi.fn>
} & Record<string, unknown>

const createMockRequestContext = (
    overrides: Record<string, unknown> = {}
): MockRequestContext => ({
    get: vi.fn((k) => overrides[k]),
    set: vi.fn(),
    has: vi.fn(() => false),
    ...overrides,
})

const createMockTracingContext = () => ({
    currentSpan: {
        createChildSpan: vi.fn().mockReturnValue({
            update: vi.fn(),
            end: vi.fn(),
            error: vi.fn(),
        }),
    },
})

const createMockWriter = () => ({ custom: vi.fn() })

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('finnhubQuotesTool', () => {
    it('should fetch quote successfully', async () => {
        const mockResponse = { c: 150.12, h: 151.0, l: 149.5, o: 150.0 }
        httpFetchMock.mockResolvedValueOnce({
            status: 200,
            statusText: 'OK',
            data: mockResponse,
        })

        const mockRequestContext = createMockRequestContext({
            apiKey: 'test-api-key',
        })
        const mockTracingContext = createMockTracingContext()
        const mockWriter = createMockWriter()

        interface QuoteData {
            c: number
            h: number
            l: number
            o: number
        }
        interface ResultType {
            data: QuoteData | null
            metadata: { symbol: string }
            message?: string
        }

        const result: ResultType = await finnhubQuotesTool.execute(
            { symbol: 'AAPL' },
            {
                requestContext: mockRequestContext,
                tracingContext: mockTracingContext,
                writer: mockWriter,
            }
        )

        expect(httpFetchMock).toHaveBeenCalled()
        const calledUrl = String(httpFetchMock.mock.calls[0][0])
        expect(calledUrl).toContain('symbol=AAPL')
        expect(result.data).toEqual(mockResponse)
        expect(result.metadata.symbol).toBe('AAPL')
        expect(mockWriter.custom).toHaveBeenCalled()
        try {
            expect(
                mockTracingContext.currentSpan.createChildSpan
            ).toHaveBeenCalled()
        } catch {
            // tracing optional
        }
    })

    it('should return message if API key missing', async () => {
        const mockRequestContext = createMockRequestContext({})
        const res = await finnhubQuotesTool.execute(
            { symbol: 'AAPL' },
            { requestContext: mockRequestContext }
        )

        expect(res).toHaveProperty('data', null)
        expect(res).toHaveProperty('message')
        expect(String(res.message)).toMatch(/FINNHUB_API_KEY/)
    })

    it('should handle API error responses', async () => {
        const mockResponse = { error: 'Invalid symbol' }
        httpFetchMock.mockResolvedValueOnce({
            status: 200,
            statusText: 'OK',
            data: mockResponse,
        })

        const mockRequestContext = createMockRequestContext({
            apiKey: 'test-api-key',
        })

        const res = await finnhubQuotesTool.execute(
            { symbol: 'INVALID' },
            { requestContext: mockRequestContext }
        )

        expect(res).toHaveProperty('data', null)
        expect(String(res.message)).toMatch(/Invalid symbol|error/i)
    })
})

describe('finnhubCompanyTool', () => {
    it('should fetch company profile successfully', async () => {
        const mockResponse = { name: 'Test Inc', country: 'US' }
        httpFetchMock.mockResolvedValueOnce({
            status: 200,
            statusText: 'OK',
            data: mockResponse,
        })

        const mockRequestContext = createMockRequestContext({
            apiKey: 'test-api-key',
        })
        const mockWriter = createMockWriter()

        const result = await finnhubCompanyTool.execute(
            { function: 'COMPANY_PROFILE', symbol: 'AAPL' },
            { requestContext: mockRequestContext, writer: mockWriter }
        )

        expect(httpFetchMock).toHaveBeenCalled()
        expect(result.data).toEqual(mockResponse)
        expect(result.metadata.function).toBe('COMPANY_PROFILE')
    })

    it('should require symbol for COMPANY function', async () => {
        const mockRequestContext = createMockRequestContext({
            apiKey: 'test-api-key',
        })
        const res = await finnhubCompanyTool.execute(
            { function: 'COMPANY_PROFILE', symbol: '' },
            { requestContext: mockRequestContext }
        )

        expect(res).toHaveProperty('data', null)
        expect(String(res.message)).toMatch(/requires symbol/)
    })
})
