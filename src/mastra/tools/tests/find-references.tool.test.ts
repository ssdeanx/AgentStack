// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { findReferencesTool } from '../find-references.tool'

vi.mock('../semantic-utils', () => ({
    ProjectCache: {
        getInstance: () => ({ getOrCreate: () => ({ getSourceFiles: () => [] }) }),
    },
    PythonParser: { findReferences: async (content: string, symbolName: string) => [{ line: 1, column: 2, text: symbolName, isDefinition: false }] },
}))

vi.mock('fast-glob', () => ({
    __esModule: true,
    default: async (pattern: string) => ['/tmp/fake.py'],
}))

describe('findReferencesTool', () => {
    beforeEach(() => vi.clearAllMocks())

    it('includes python references in results', async () => {
        const res = await findReferencesTool.execute({ symbolName: 'myfunc', projectPath: process.cwd() })
        expect(res.references.length).toBeGreaterThanOrEqual(1)
        expect(res.summary.totalReferences).toBeGreaterThanOrEqual(1)
    })
})