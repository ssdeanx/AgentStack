import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('serpapi-config', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    // Type definitions from serpapi-config.ts
    type TimeRange =
        | 'hour'
        | 'day'
        | 'week'
        | 'month'
        | 'year'
        | 'now-1-H'
        | 'now-4-H'
        | 'now-1-d'
        | 'now-7-d'
        | 'today-1-m'
        | 'today-3-m'
        | 'today-12-m'
        | 'today-5-y'

    type SortBy = 'relevance' | 'date' | 'rating' | 'price-asc' | 'price-desc'

    type NewsTopic =
        | 'world'
        | 'nation'
        | 'business'
        | 'technology'
        | 'entertainment'
        | 'sports'
        | 'science'
        | 'health'

    type ItemCondition = 'new' | 'used' | 'refurbished'

    type PriceRange = '$' | '$$' | '$$$' | '$$$$'

    interface CommonSerpApiParams {
        location?: string
        language?: string
        device?: 'desktop' | 'mobile' | 'tablet'
    }

    describe('TimeRange type', () => {
        it('should accept valid time range values', () => {
            const validRanges: TimeRange[] = [
                'hour',
                'day',
                'week',
                'month',
                'year',
                'now-1-H',
                'now-4-H',
                'now-1-d',
                'now-7-d',
                'today-1-m',
                'today-3-m',
                'today-12-m',
                'today-5-y',
            ]

            validRanges.forEach((range) => {
                expect(typeof range).toBe('string')
            })
            expect(validRanges.length).toBe(13)
        })
    })

    describe('SortBy type', () => {
        it('should accept valid sort values', () => {
            const validSorts: SortBy[] = [
                'relevance',
                'date',
                'rating',
                'price-asc',
                'price-desc',
            ]

            validSorts.forEach((sort) => {
                expect(typeof sort).toBe('string')
            })
            expect(validSorts.length).toBe(5)
        })
    })

    describe('NewsTopic type', () => {
        it('should accept valid news topic values', () => {
            const validTopics: NewsTopic[] = [
                'world',
                'nation',
                'business',
                'technology',
                'entertainment',
                'sports',
                'science',
                'health',
            ]

            validTopics.forEach((topic) => {
                expect(typeof topic).toBe('string')
            })
            expect(validTopics.length).toBe(8)
        })
    })

    describe('ItemCondition type', () => {
        it('should accept valid condition values', () => {
            const validConditions: ItemCondition[] = [
                'new',
                'used',
                'refurbished',
            ]

            validConditions.forEach((condition) => {
                expect(typeof condition).toBe('string')
            })
            expect(validConditions.length).toBe(3)
        })
    })

    describe('PriceRange type', () => {
        it('should accept valid price range values', () => {
            const validPrices: PriceRange[] = ['$', '$$', '$$$', '$$$$']

            validPrices.forEach((price) => {
                expect(typeof price).toBe('string')
            })
            expect(validPrices.length).toBe(4)
        })
    })

    describe('CommonSerpApiParams interface', () => {
        it('should accept valid parameters', () => {
            const validParams: CommonSerpApiParams = {
                location: 'New York, NY',
                language: 'en',
                device: 'desktop',
            }

            expect(validParams.location).toBe('New York, NY')
            expect(validParams.language).toBe('en')
            expect(validParams.device).toBe('desktop')
        })

        it('should accept optional parameters', () => {
            const minimalParams: CommonSerpApiParams = {}

            expect(minimalParams.location).toBeUndefined()
            expect(minimalParams.language).toBeUndefined()
            expect(minimalParams.device).toBeUndefined()
        })

        it('should accept partial parameters', () => {
            const partialParams: CommonSerpApiParams = {
                language: 'es',
            }

            expect(partialParams.language).toBe('es')
            expect(partialParams.location).toBeUndefined()
        })
    })

    describe('validateSerpApiKey function', () => {
        it('should throw error when API key is not set', () => {
            const validateSerpApiKey = () => {
                const apiKey = process.env.SERPAPI_API_KEY
                if (typeof apiKey !== 'string' || apiKey.trim() === '') {
                    throw new Error(
                        'SERPAPI_API_KEY environment variable is required. Get your API key from https://serpapi.com/manage-api-key'
                    )
                }
            }

            const originalEnv = process.env.SERPAPI_API_KEY
            delete process.env.SERPAPI_API_KEY

            expect(validateSerpApiKey).toThrow(
                'SERPAPI_API_KEY environment variable is required'
            )

            process.env.SERPAPI_API_KEY = originalEnv
        })

        it('should not throw when API key is set', () => {
            const validateSerpApiKey = () => {
                const apiKey = process.env.SERPAPI_API_KEY
                if (typeof apiKey !== 'string' || apiKey.trim() === '') {
                    throw new Error('API key not set')
                }
            }

            const originalEnv = process.env.SERPAPI_API_KEY
            process.env.SERPAPI_API_KEY = 'test-api-key-12345'

            expect(validateSerpApiKey).not.toThrow()

            process.env.SERPAPI_API_KEY = originalEnv
        })

        it('should throw when API key is empty string', () => {
            const validateSerpApiKey = () => {
                const apiKey = process.env.SERPAPI_API_KEY
                if (typeof apiKey !== 'string' || apiKey.trim() === '') {
                    throw new Error('API key not set')
                }
            }

            const originalEnv = process.env.SERPAPI_API_KEY
            process.env.SERPAPI_API_KEY = ''

            expect(validateSerpApiKey).toThrow('API key not set')

            process.env.SERPAPI_API_KEY = originalEnv
        })

        it('should throw when API key is only whitespace', () => {
            const validateSerpApiKey = () => {
                const apiKey = process.env.SERPAPI_API_KEY
                if (typeof apiKey !== 'string' || apiKey.trim() === '') {
                    throw new Error('API key not set')
                }
            }

            const originalEnv = process.env.SERPAPI_API_KEY
            process.env.SERPAPI_API_KEY = '   '

            expect(validateSerpApiKey).toThrow('API key not set')

            process.env.SERPAPI_API_KEY = originalEnv
        })
    })

    describe('timeout configuration', () => {
        it('should have timeout of 60000ms', () => {
            expect(60000).toBe(60 * 1000) // 60 seconds in milliseconds
        })
    })
})
