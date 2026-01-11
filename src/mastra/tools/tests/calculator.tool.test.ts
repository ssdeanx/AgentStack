// @ts-nocheck
import { describe, it, expect } from 'vitest'
import { calculatorTool, unitConverterTool, matrixCalculatorTool } from '../calculator.tool'

describe('calculatorTool', () => {
    it('evaluates an expression', async () => {
        const res = await calculatorTool.execute({ expression: '1 + 2 * 3' })
        expect(res.success).toBe(true)
        expect(res.result).toBe(7)
    })

    it('converts units (cm -> m)', async () => {
        const res = await unitConverterTool.execute({ value: 100, fromUnit: 'cm', toUnit: 'm', precision: 6 })
        expect(res.success).toBe(true)
        expect(Number(res.formattedResult)).toBeCloseTo(1)
    })

    it('performs matrix addition', async () => {
        const a = [[1,2],[3,4]]
        const b = [[5,6],[7,8]]
        const res = await matrixCalculatorTool.execute({ operation: 'add', matrixA: a, matrixB: b })
        expect(res.success).toBe(true)
        expect((res.result as any)[0][0]).toBe(6)
    })
})