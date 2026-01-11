import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    amazonSearchTool,
    walmartSearchTool,
    ebaySearchTool,
    homeDepotSearchTool,
} from '../serpapi-shopping.tool'
import { getJson } from 'serpapi'

// Mock serpapi
vi.mock('serpapi', () => ({
    getJson: vi.fn(),
}))

// Mock logger
vi.mock('../config/logger', () => ({
    log: {
        info: vi.fn(),
        error: vi.fn(),
    },
}))

// Mock validation
vi.mock('./serpapi-config', () => ({
    validateSerpApiKey: vi.fn(),
}))

describe('serpapi-shopping.tool', () => {
    const mockGetJson = vi.mocked(getJson)
    const mockWriter = {
        custom: vi.fn(),
    }
    const mockTracingContext = {
        currentSpan: {
            createChildSpan: vi.fn().mockReturnValue({
                update: vi.fn(),
                end: vi.fn(),
                error: vi.fn(),
            }),
        },
    }

    beforeEach(() => {
        vi.clearAllMocks()
        mockGetJson.mockResolvedValue({
            search_results: [
                {
                    title: 'Test Product',
                    asin: 'B0123456789',
                    link: 'https://amazon.com/test-product',
                    price: { value: 29.99 },
                    rating: 4.5,
                    reviews_count: 123,
                    thumbnail: 'https://amazon.com/thumbnail.jpg',
                    is_prime: true,
                },
            ],
        })
    })

    describe('amazonSearchTool', () => {
        it('should successfully search Amazon products', async () => {
            const inputData = {
                query: 'wireless headphones',
                sortBy: 'rating' as const,
                minPrice: 50,
                maxPrice: 200,
                primeOnly: true,
                numResults: 10,
            }

            const result = await amazonSearchTool.execute(inputData, {
                writer: mockWriter,
                tracingContext: mockTracingContext,
            })

            expect(mockGetJson).toHaveBeenCalledWith({
                engine: 'amazon',
                query: 'wireless headphones',
                num: 10,
                sort_by: 'review-rank',
                min_price: 50,
                max_price: 200,
                prime: 'true',
            })

            expect(result.products).toHaveLength(1)
            expect(result.products[0]).toEqual({
                title: 'Test Product',
                asin: 'B0123456789',
                link: 'https://amazon.com/test-product',
                price: 29.99,
                rating: 4.5,
                reviewCount: 123,
                thumbnail: 'https://amazon.com/thumbnail.jpg',
                isPrime: true,
            })
            expect(result.error).toBeUndefined()
        })

        it('should handle empty search results', async () => {
            mockGetJson.mockResolvedValue({ search_results: [] })

            const result = await amazonSearchTool.execute(inputData, {
                writer: mockWriter,
                tracingContext: mockTracingContext,
            })

            expect(result.products).toEqual([])
            expect(result.error).toBeUndefined()
        })

        it('should handle API errors gracefully', async () => {
            mockGetJson.mockRejectedValue(new Error('API rate limit exceeded'))

            const result = await amazonSearchTool.execute(inputData, {
                writer: mockWriter,
                tracingContext: mockTracingContext,
            })

            expect(result.data).toBeNull()
            expect(result.error).toBe(
                'Amazon search failed: API rate limit exceeded'
            )
        })

        it('should apply correct sort mapping', async () => {
            const testCases = [
                { sortBy: 'relevance' as const, expected: undefined },
                { sortBy: 'price-asc' as const, expected: 'price-asc-rank' },
                { sortBy: 'price-desc' as const, expected: 'price-desc-rank' },
                { sortBy: 'rating' as const, expected: 'review-rank' },
            ]

            for (const { sortBy, expected } of testCases) {
                mockGetJson.mockResolvedValueOnce({ search_results: [] })

                await amazonSearchTool.execute(
                    { query: 'test', sortBy, primeOnly: false, numResults: 10 },
                    {
                        writer: mockWriter,
                        tracingContext: mockTracingContext,
                    }
                )

                const call =
                    mockGetJson.mock.calls[mockGetJson.mock.calls.length - 1][0]
                expect(call.sort_by).toBe(expected)
            }
        })

        it('should validate input parameters', async () => {
            await expect(
                amazonSearchTool.execute(
                    {},
                    {
                        writer: mockWriter,
                        tracingContext: mockTracingContext,
                    }
                )
            ).rejects.toThrow('String must contain at least 1 character')
        })
    })

    describe('walmartSearchTool', () => {
        beforeEach(() => {
            mockGetJson.mockResolvedValue({
                organic_results: [
                    {
                        title: 'Walmart Product',
                        product_id: '123456789',
                        link: 'https://walmart.com/product',
                        primary_offer: { offer_price: 19.99 },
                        rating: 4.2,
                        thumbnail: 'https://walmart.com/thumb.jpg',
                    },
                ],
            })
        })

        it('should successfully search Walmart products', async () => {
            const inputData = {
                query: 'kitchen appliances',
                sortBy: 'price-desc' as const,
                minPrice: 25,
                maxPrice: 150,
                numResults: 5,
            }

            const result = await walmartSearchTool.execute(
                { context: inputData },
                {
                    writer: mockWriter,
                    tracingContext: mockTracingContext,
                }
            )

            expect(mockGetJson).toHaveBeenCalledWith({
                engine: 'walmart',
                query: 'kitchen appliances',
                num: 5,
                sort: 'price-desc',
                min_price: 25,
                max_price: 150,
            })

            expect(result.products).toHaveLength(1)
            expect(result.products[0]).toEqual({
                title: 'Walmart Product',
                productId: '123456789',
                link: 'https://walmart.com/product',
                price: 19.99,
                rating: 4.2,
                thumbnail: 'https://walmart.com/thumb.jpg',
            })
        })

        it('should handle missing price data', async () => {
            mockGetJson.mockResolvedValue({
                organic_results: [
                    {
                        title: 'No Price Product',
                        product_id: '999',
                        link: 'https://walmart.com/no-price',
                    },
                ],
            })

            const result = await walmartSearchTool.execute(
                { context: { query: 'test' } },
                {
                    writer: mockWriter,
                    tracingContext: mockTracingContext,
                }
            )

            expect(result.products[0].price).toBeUndefined()
        })
    })

    describe('ebaySearchTool', () => {
        beforeEach(() => {
            mockGetJson.mockResolvedValue({
                organic_results: [
                    {
                        title: 'eBay Auction Item',
                        item_id: '987654321',
                        link: 'https://ebay.com/item',
                        price: { value: 75.5 },
                        condition: 'Used',
                        bids: 3,
                        time_left: '2d 5h',
                        thumbnail: 'https://ebay.com/thumb.jpg',
                    },
                ],
            })
        })

        it('should successfully search eBay products', async () => {
            const inputData = {
                query: 'vintage camera',
                condition: 'used' as const,
                sortBy: 'price-desc' as const,
                buyNowOnly: true,
                numResults: 15,
            }

            const result = await ebaySearchTool.execute(
                { context: inputData },
                {
                    writer: mockWriter,
                    tracingContext: mockTracingContext,
                }
            )

            expect(mockGetJson).toHaveBeenCalledWith({
                engine: 'ebay',
                _nkw: 'vintage camera',
                _ipg: 15,
                LH_ItemCondition: '3000',
                LH_BIN: '1',
                _sop: 'PricePlusShippingHighest',
            })

            expect(result.data.products[0]).toEqual({
                title: 'eBay Auction Item',
                itemId: '987654321',
                link: 'https://ebay.com/item',
                price: 75.5,
                condition: 'Used',
                bids: 3,
                timeLeft: '2d 5h',
                thumbnail: 'https://ebay.com/thumb.jpg',
            })
        })

        it('should map condition values correctly', async () => {
            const conditions = [
                { condition: 'new' as const, expected: '1000' },
                { condition: 'used' as const, expected: '3000' },
                { condition: 'refurbished' as const, expected: '2000' },
            ]

            for (const { condition, expected } of conditions) {
                mockGetJson.mockResolvedValueOnce({ organic_results: [] })

                await ebaySearchTool.execute(
                    { context: { query: 'test', condition } },
                    {
                        writer: mockWriter,
                        tracingContext: mockTracingContext,
                    }
                )

                const call =
                    mockGetJson.mock.calls[mockGetJson.mock.calls.length - 1][0]
                expect(call.LH_ItemCondition).toBe(expected)
            }
        })
    })

    describe('homeDepotSearchTool', () => {
        beforeEach(() => {
            mockGetJson.mockResolvedValue({
                products: [
                    {
                        title: 'Home Depot Tool',
                        product_id: 'HD123',
                        link: 'https://homedepot.com/tool',
                        price: 49.99,
                        rating: 4.8,
                        availability: 'In Stock',
                        thumbnail: 'https://homedepot.com/tool.jpg',
                    },
                ],
            })
        })

        it('should successfully search Home Depot products', async () => {
            const inputData = {
                query: 'power drill',
                sortBy: 'rating' as const,
                inStockOnly: true,
                numResults: 20,
            }

            const result = await homeDepotSearchTool.execute(
                { context: inputData },
                {
                    writer: mockWriter,
                    tracingContext: mockTracingContext,
                }
            )

            expect(mockGetJson).toHaveBeenCalledWith({
                engine: 'home_depot',
                q: 'power drill',
                num: 20,
                sort_by: 'rating',
                in_stock: 'true',
            })

            expect(result.data.products[0]).toEqual({
                title: 'Home Depot Tool',
                productId: 'HD123',
                link: 'https://homedepot.com/tool',
                price: 49.99,
                rating: 4.8,
                availability: 'In Stock',
                thumbnail: 'https://homedepot.com/tool.jpg',
            })
        })

        it('should handle in-stock filter correctly', async () => {
            const testCases = [
                { inStockOnly: true, expected: 'true' },
                { inStockOnly: false, expected: undefined },
                { inStockOnly: undefined, expected: undefined },
            ]

            for (const { inStockOnly, expected } of testCases) {
                mockGetJson.mockResolvedValueOnce({ products: [] })

                await homeDepotSearchTool.execute(
                    { context: { query: 'test', inStockOnly } },
                    {
                        writer: mockWriter,
                        tracingContext: mockTracingContext,
                    }
                )

                const call =
                    mockGetJson.mock.calls[mockGetJson.mock.calls.length - 1][0]
                expect(call.in_stock).toBe(expected)
            }
        })
    })

    describe('common behavior', () => {
        it('should validate SerpAPI key on execution', async () => {
            const { validateSerpApiKey } = await import('./serpapi-config')
            const mockValidate = vi.mocked(validateSerpApiKey)

            await amazonSearchTool.execute(
                { context: { query: 'test' } },
                {
                    writer: mockWriter,
                    tracingContext: mockTracingContext,
                }
            )

            expect(mockValidate).toHaveBeenCalled()
        })

        it('should emit progress events', async () => {
            await amazonSearchTool.execute(
                { context: { query: 'test' } },
                {
                    writer: mockWriter,
                    tracingContext: mockTracingContext,
                }
            )

            expect(mockWriter.custom).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'data-tool-progress',
                    data: expect.objectContaining({
                        status: 'in-progress',
                        message: expect.stringContaining(
                            'Starting Amazon search'
                        ),
                        stage: 'amazon-search',
                    }),
                })
            )

            expect(mockWriter.custom).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'data-tool-progress',
                    data: expect.objectContaining({
                        status: 'done',
                        message: expect.stringContaining(
                            'Amazon search complete'
                        ),
                        stage: 'amazon-search',
                    }),
                })
            )
        })

        it('should create and manage tracing spans', async () => {
            const mockSpan = {
                update: vi.fn(),
                end: vi.fn(),
                error: vi.fn(),
            }
            mockTracingContext.currentSpan.createChildSpan.mockReturnValue(
                mockSpan
            )

            await amazonSearchTool.execute(
                { context: { query: 'test' } },
                {
                    writer: mockWriter,
                    tracingContext: mockTracingContext,
                }
            )

            expect(
                mockTracingContext.currentSpan.createChildSpan
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'tool_call',
                    name: 'amazon-search',
                })
            )

            expect(mockSpan.update).toHaveBeenCalled()
            expect(mockSpan.end).toHaveBeenCalled()
        })
    })
})
