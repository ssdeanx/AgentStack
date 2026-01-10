import { describe, it, expect } from 'vitest'
import { spatialIndexTool } from '../spatial-index.tool'

describe('spatialIndexTool', () => {
    it('builds and searches index', async () => {
        const points = [
            { id: 'a', lat: 10, lng: 10, data: { name: 'a' } },
            { id: 'b', lat: 20, lng: 20, data: { name: 'b' } },
            { id: 'c', lat: 30, lng: 30, data: { name: 'c' } },
        ]

        const build = await spatialIndexTool.execute({ action: 'build', points })
        expect(build.treeJSON).toBeDefined()

        const treeJSON = build.treeJSON
        const res = await spatialIndexTool.execute({ action: 'search', treeJSON, bounds: { southWest: [5, 5], northEast: [25, 25] } })
        expect(res.results).toBeDefined()
        expect((res.results as any[]).some((r) => r.id === 'a')).toBe(true)
        expect((res.results as any[]).some((r) => r.id === 'b')).toBe(true)
        expect((res.results as any[]).some((r) => r.id === 'c')).toBe(false)
    })
})
