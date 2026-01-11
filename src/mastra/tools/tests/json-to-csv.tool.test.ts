import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { jsonToCsvTool } from '../json-to-csv.tool'

describe('jsonToCsvTool', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('converts simple JSON array to CSV', async () => {
        const data = [
            { name: 'Alice', age: 30, city: 'New York' },
            { name: 'Bob', age: 25, city: 'Los Angeles' },
        ]

        const result = await jsonToCsvTool.execute({ data })
        expect(result).toBeDefined()
        expect(result.csv).toBeDefined()
        expect(typeof result.csv).toBe('string')
        const lines = result.csv.trim().split('\n')
        expect(lines.length).toBe(3) // Header + 2 data rows
        expect(lines[0]).toBe('name,age,city')
        expect(lines[1]).toBe('Alice,30,New York')
        expect(lines[2]).toBe('Bob,25,Los Angeles')
    })

    it('handles custom delimiters', async () => {
        const data = [{ name: 'John', value: 100 }]

        const result = await jsonToCsvTool.execute({
            data,
            options: { delimiter: ';', includeHeaders: true },
        })
        expect(result.csv).toBeDefined()
        expect(result.csv.trim().split('\n')[0]).toBe('name;value')
    })

    it('handles empty array', async () => {
        const data: Record<string, any>[] = []

        const result = await jsonToCsvTool.execute({ data })
        expect(result).toBeDefined()
        expect(result.csv).toBe('')
    })

    it('handles single object', async () => {
        const data = [{ id: 1, title: 'Test', active: true }]

        const result = await jsonToCsvTool.execute({ data })
        expect(result.csv).toBeDefined()
        expect(result.csv.trim().split('\n').length).toBe(2)
        expect(result.csv.includes('id,title,active')).toBe(true)
        expect(result.csv.includes('1,Test,true')).toBe(true)
    })

    it('handles objects with different keys', async () => {
        const data = [
            { a: 1, b: 2 },
            { a: 3, c: 4 },
        ]

        const result = await jsonToCsvTool.execute({ data })
        expect(result.csv).toBeDefined()
        // Should include all unique keys
        expect(result.csv.includes('a,b,c')).toBe(true)
    })

    it('handles nested objects as stringified JSON', async () => {
        const data = [{ id: 1, metadata: { created: '2024-01-01' } }]

        const result = await jsonToCsvTool.execute({ data })
        expect(result.csv).toBeDefined()
        expect(result.csv.includes('id,metadata')).toBe(true)
    })

    it('handles special characters in values', async () => {
        const data = [
            { name: 'Test, with, commas', description: 'Line1\nLine2' },
        ]

        const result = await jsonToCsvTool.execute({ data })
        expect(result.csv).toBeDefined()
        expect(typeof result.csv).toBe('string')
    })
})
