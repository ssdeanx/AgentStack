// @ts-nocheck
import { describe, it, expect } from 'vitest'
import { dateTimeTool, timeZoneTool } from '../datetime.tool'

describe('dateTimeTool', () => {
    it('now returns ISO string', async () => {
        const res = await dateTimeTool.execute({ operation: 'now' })
        expect(res.success).toBe(true)
        expect(typeof res.result).toBe('string')
        expect(new Date(res.result).toString()).not.toBe('Invalid Date')
    })

    it('parse validates and parses date', async () => {
        const res = await dateTimeTool.execute({ operation: 'parse', input: '2021-01-01' })
        expect(res.success).toBe(true)
        expect(typeof res.result).toBe('string')
    })

    it('format formats date according to pattern', async () => {
        const res = await dateTimeTool.execute({ operation: 'format', input: '2021-01-01T00:00:00Z', format: 'YYYY-MM-DD' })
        expect(res.success).toBe(true)
        expect(res.result).toBe('2021-01-01')
    })

    it('add and diff work', async () => {
        const added = await dateTimeTool.execute({ operation: 'add', input: '2021-01-01T00:00:00Z', amount: 2, unit: 'days' })
        expect(new Date(added.result).toISOString().startsWith('2021-01-03')).toBe(true)

        const diff = await dateTimeTool.execute({ operation: 'diff', fromDate: '2021-01-01', toDate: '2021-01-03' })
        expect(diff.result.days).toBeDefined()
    })
})

describe('timeZoneTool', () => {
    it('list returns array of timezones', async () => {
        const res = await timeZoneTool.execute({ operation: 'list' })
        expect(res.success).toBe(true)
        expect(Array.isArray(res.result)).toBe(true)
    })

    it('convert converts between timezones (approx)', async () => {
        const res = await timeZoneTool.execute({ operation: 'convert', fromTimezone: 'UTC', toTimezone: 'UTC', dateTime: '2021-01-01T00:00:00Z' })
        expect(res.success).toBe(true)
        expect(typeof res.result).toBe('string')
    })
})