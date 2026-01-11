// @ts-nocheck
import { describe, it, expect } from 'vitest'
import { csvToExcalidrawTool, imageToCSVTool, convertDataFormatTool } from '../data-processing-tools'

describe('data-processing-tools', () => {
    it('converts CSV string to excalidraw structure', async () => {
        const csv = 'name,age\nAlice,30\nBob,25'
        const res = await csvToExcalidrawTool.execute({ csvData: csv, layoutType: 'table', title: 'People' })
        expect(res.filename).toBeDefined()
        expect(res.elementCount).toBeGreaterThan(0)
        expect(res.contents.elements.length).toBeGreaterThan(0)
    })

    it('converts image elements to CSV', async () => {
        const elements = [ { id: '1', type: 'rect', x: 0, y: 0, text: 'Hello' } ]
        const res = await imageToCSVTool.execute({ elements })
        expect(res.csvContent).toContain('id')
        expect(res.elementCount).toBe(1)
    })

    it('converts json to csv and back', async () => {
        const data = [ { a: '1', b: '2' }, { a: '3', b: '4' } ]
        const jsonToCsv = await convertDataFormatTool.execute({ inputData: data, inputFormat: 'json', outputFormat: 'csv' })
        expect(typeof jsonToCsv.convertedData).toBe('string')

        const csv = jsonToCsv.convertedData
        const csvToJson = await convertDataFormatTool.execute({ inputData: csv, inputFormat: 'csv', outputFormat: 'json' })
        expect(Array.isArray(csvToJson.convertedData)).toBe(true)
        expect((csvToJson.convertedData as any[]).length).toBe(2)
    })
})