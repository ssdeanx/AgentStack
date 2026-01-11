// @ts-nocheck
import { describe, it, expect } from 'vitest'
import { randomGeneratorTool } from '../random-generator.tool'

describe('randomGeneratorTool', () => {
    it('generates a number within range', async () => {
        const res = await randomGeneratorTool.execute({ type: 'number', count: 1, options: { min: 10, max: 20 } })
        expect(res.success).toBe(true)
        expect(typeof res.data).toBe('number')
        expect(res.data).toBeGreaterThanOrEqual(10)
        expect(res.data).toBeLessThanOrEqual(20)
    })

    it('generates strings of correct length and special chars', async () => {
        const res = await randomGeneratorTool.execute({ type: 'string', count: 1, options: { length: 12, includeSpecial: true } })
        expect(res.success).toBe(true)
        expect(typeof res.data).toBe('string')
        expect((res.data as string).length).toBe(12)
    })

    it('generates arrays when count>1', async () => {
        const res = await randomGeneratorTool.execute({ type: 'uuid', count: 3 })
        expect(res.success).toBe(true)
        expect(Array.isArray(res.data)).toBe(true)
        expect(res.data.length).toBe(3)
    })

    it('generates email and name', async () => {
        const email = await randomGeneratorTool.execute({ type: 'email', count: 1 })
        expect(typeof email.data).toBe('string')
        expect((email.data as string).includes('@')).toBe(true)

        const name = await randomGeneratorTool.execute({ type: 'name', count: 1, options: { locale: 'es' } })
        expect(typeof name.data).toBe('string')
        expect((name.data as string).split(' ').length).toBeGreaterThanOrEqual(2)
    })
})