// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { technicalAnalysisTool } from '../technical-analysis.tool'

const createMockWriter = () => ({ custom: vi.fn() })

describe('technicalAnalysisTool', () => {
    beforeEach(() => vi.clearAllMocks())

    it('should compute statistics for stats operation', async () => {
        const data = [1, 2, 3, 4, 5]
        const res = await technicalAnalysisTool.execute({ data, operation: 'stats' })
        expect(res.success).toBe(true)
        expect(res.stats.mean).toBe(3)
        expect(res.stats.min).toBe(1)
        expect(res.stats.max).toBe(5)
    })

    it('should compute sma and ema arrays', async () => {
        const data = Array.from({ length: 30 }, (_, i) => i + 1)
        const res = await technicalAnalysisTool.execute({ data, operation: 'all' })
        expect(res.success).toBe(true)
        expect(res.results.sma).toBeDefined()
        expect(res.results.ema).toBeDefined()
        expect(Array.isArray(res.results.sma)).toBe(true)
    })

    it('should throw on empty data', async () => {
        await expect(technicalAnalysisTool.execute({ data: [], operation: 'sma' })).rejects.toThrow(/cannot be empty/i)
    })
})