// Set required env var for tests before any imports
vi.stubEnv('SERPAPI_API_KEY', 'test-api-key')

// Mock serpapi module BEFORE importing the tool
// Must include both getJson and config since serpapi-config.ts uses config
vi.mock('serpapi', async (importOriginal) => {
    const actual = await importOriginal<typeof import('serpapi')>()
    return {
        ...actual,
        getJson: vi.fn(),
        config: {
            api_key: 'test-api-key',
            timeout: 60000,
        },
    }
})

import { describe, it, expect, vi, beforeAll } from 'vitest'
import type { Mock } from 'vitest'
import { googleSearchTool } from '../serpapi-search.tool'

describe('googleSearchTool', () => {
    let getJson: Mock

    beforeAll(async () => {
        // Dynamic import to get mocked version
        const serpapi = await import('serpapi')
        getJson = serpapi.getJson as unknown as Mock
    })

    it('returns search results for valid query', async () => {
        const mockSearchResults = {
            organic_results: [
                {
                    title: 'Test Result 1',
                    link: 'https://example.com/1',
                    snippet: 'This is test result 1',
                    position: 1,
                    displayed_link: 'example.com',
                },
                {
                    title: 'Test Result 2',
                    link: 'https://example.com/2',
                    snippet: 'This is test result 2',
                    position: 2,
                },
            ],
            related_searches: ['related query 1', 'related query 2'],
        }

        getJson.mockResolvedValue(mockSearchResults)

        const result = await googleSearchTool.execute({
            query: 'test query',
            numResults: 10,
        })

        expect(result.organicResults).toBeDefined()
        expect(result.organicResults?.length).toBe(2)
        expect(result.organicResults?.[0].title).toBe('Test Result 1')
        expect(result.organicResults?.[0].link).toBe('https://example.com/1')
        expect(result.organicResults?.[0].snippet).toBe('This is test result 1')
        expect(result.organicResults?.[0].position).toBe(1)
        expect(result.relatedSearches).toEqual([
            'related query 1',
            'related query 2',
        ])
    })

    it('handles empty results', async () => {
        getJson.mockResolvedValue({ organic_results: [] })

        const result = await googleSearchTool.execute({
            query: 'nonexistent query xyz',
            numResults: 10,
        })

        expect(result.organicResults).toEqual([])
    })

    it('passes location parameter to API', async () => {
        getJson.mockResolvedValue({
            organic_results: [
                {
                    title: 'Local Result',
                    link: 'https://local.com',
                    snippet: 'Local',
                    position: 1,
                },
            ],
        })

        await googleSearchTool.execute({
            query: 'pizza',
            location: 'New York, NY',
            numResults: 5,
        })

        expect(getJson).toHaveBeenCalledWith(
            expect.objectContaining({
                q: 'pizza',
                location: 'New York, NY',
                num: 5,
            })
        )
    })

    it('passes language parameter to API', async () => {
        getJson.mockResolvedValue({ organic_results: [] })

        await googleSearchTool.execute({
            query: 'test',
            language: 'es',
            numResults: 10,
        })

        expect(getJson).toHaveBeenCalledWith(
            expect.objectContaining({
                q: 'test',
                hl: 'es', // tool uses 'hl' not 'lr'
                num: 10,
            })
        )
    })

    it('passes device parameter to API', async () => {
        getJson.mockResolvedValue({ organic_results: [] })

        await googleSearchTool.execute({
            query: 'test',
            device: 'mobile',
            numResults: 10,
        })

        expect(getJson).toHaveBeenCalledWith(
            expect.objectContaining({
                q: 'test',
                device: 'mobile',
                num: 10,
            })
        )
    })
})
