// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { findSymbolTool } from '../find-symbol.tool'

// Mock ProjectCache and PythonParser from semantic-utils
vi.mock('../semantic-utils', () => ({
    ProjectCache: {
        getInstance: () => ({ getOrCreate: () => ({ getSourceFiles: () => [] }) }),
    },
    PythonParser: { findSymbols: async (content: string) => [{ name: 'pyFunc', kind: 'function', line: 1, column: 1, docstring: 'doc' }] },
}))

describe('findSymbolTool', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns python symbols when present', async () => {
        const res = await findSymbolTool.execute({ symbolName: 'pyFunc', projectPath: process.cwd(), symbolType: 'all' })
        expect(res.symbols.length).toBeGreaterThanOrEqual(1)
        expect(res.symbols[0].name).toBe('pyFunc')
        expect(res.summary).toBeDefined()
    })
})