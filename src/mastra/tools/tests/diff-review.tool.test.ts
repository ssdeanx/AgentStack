// @ts-nocheck
import { describe, it, expect } from 'vitest'
import { diffReviewTool } from '../diff-review.tool'

describe('diffReviewTool', () => {
    it('produces hunks, changes and stats', async () => {
        const original = 'a\nb\nc\nd\n'
        const modified = 'a\nB\nc\ne\n'
        const res = await diffReviewTool.execute({ original, modified, filename: 'test.txt' })
        expect(res.hunks.length).toBeGreaterThanOrEqual(1)
        expect(res.changes.length).toBeGreaterThanOrEqual(1)
        expect(res.stats.totalChanges).toBeGreaterThanOrEqual(1)
        expect(typeof res.unifiedDiff).toBe('string')
        expect(res.summary).toContain('change')
    })
})