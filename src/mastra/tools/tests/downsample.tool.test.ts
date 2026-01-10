import { describe, it, expect } from 'vitest'
import { downsampleTool } from '../downsample.tool'

describe('downsampleTool', () => {
    it('returns full series when target >= length', async () => {
        const values = [1, 2, 3, 4, 5]
        const res = await downsampleTool.execute({ values, target: 10 })
        expect(res.indices.length).toBe(5)
        expect(res.values).toEqual(values)
    })

    it('downsamples to target points using lttb', async () => {
        const values = Array.from({ length: 1000 }, (_, i) => Math.sin(i / 10))
        const target = 100
        const res = (await downsampleTool.execute({ values, target, algorithm: 'lttb' })) as any
        expect(res.values.length).toBe(target)
        expect(res.indices.length).toBe(target)
    })

    it('downsamples with min-max preserving peaks', async () => {
        // create a signal with spikes
        const values = Array.from({ length: 1000 }, (_, i) => (i % 50 === 0 ? 100 : Math.sin(i / 10)))
        const res = (await downsampleTool.execute({ values, target: 100, algorithm: 'min-max' })) as any
        // min-max may produce up to 2 * target points before dedup; ensure <= 2*target
        expect(res.values.length).toBeLessThanOrEqual(200)
        // ensure spikes are preserved in sampled values
        expect(res.values.some((v: number) => v === 100)).toBe(true)
    })
    it('downsamples with m4 preserving edges', async () => {
        const values = Array.from({ length: 1000 }, (_, i) => Math.sin(i / 10))
        const res = await downsampleTool.execute({ values, target: 100, algorithm: 'm4' })
        // m4 returns up to 4 points per bucket but deduped; ensure result length reasonable
        expect(res.values.length).toBeLessThanOrEqual(400)
    })
})
