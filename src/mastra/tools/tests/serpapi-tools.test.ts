import { describe, expect, it } from 'vitest'

import {
    getGoogleScholarPaperCount,
} from '../serpapi-academic-local.tool'
import {
    mapGoogleTrendsDateRange,
} from '../serpapi-news-trends.tool'

describe('SerpAPI tool helpers', () => {
    describe('mapGoogleTrendsDateRange', () => {
        it('should translate internal time ranges into SerpAPI date values', () => {
            expect(mapGoogleTrendsDateRange('now-1-H')).toBe('now 1-H')
            expect(mapGoogleTrendsDateRange('now-4-H')).toBe('now 4-H')
            expect(mapGoogleTrendsDateRange('now-1-d')).toBe('now 1-d')
            expect(mapGoogleTrendsDateRange('now-7-d')).toBe('now 7-d')
            expect(mapGoogleTrendsDateRange('today-1-m')).toBe('today 1-m')
            expect(mapGoogleTrendsDateRange('today-3-m')).toBe('today 3-m')
            expect(mapGoogleTrendsDateRange('today-12-m')).toBe('today 12-m')
            expect(mapGoogleTrendsDateRange('today-5-y')).toBe('today 5-y')
        })
    })

    describe('getGoogleScholarPaperCount', () => {
        it('should return zero when the output is missing papers', () => {
            expect(getGoogleScholarPaperCount()).toBe(0)
            expect(getGoogleScholarPaperCount({})).toBe(0)
        })

        it('should return the number of papers when present', () => {
            expect(
                getGoogleScholarPaperCount({
                    papers: [
                        { title: 'One', link: 'https://example.com/one' },
                        { title: 'Two', link: 'https://example.com/two' },
                    ],
                })
            ).toBe(2)
        })
    })
})