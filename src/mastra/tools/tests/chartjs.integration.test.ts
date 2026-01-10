import { describe, it, expect } from 'vitest'
import { chartJsTool } from '../chartjs.tool'

describe('chartJsTool integration (decimation)', () => {
    it('decimates large datasets via downsample tool', async () => {
        const points = Array.from({ length: 6000 }, (_, i) => ({ date: `2025-01-01T00:${String(i).padStart(2,'0')}`, close: Math.sin(i / 10) }))
        const res = await chartJsTool.execute({ data: points, indicators: [], chartType: 'line' })
        const labels = (res as any).config.data.labels
        expect(labels.length).toBeLessThanOrEqual(2000)
    })
})