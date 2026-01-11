// Test Template for Simple Utility Tools
// Use for: Data transformers, calculators, validators (no external APIs)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toolName } from '../tool-name.tool'

describe('toolName', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should handle valid input and return expected output', async () => {
        const input = { param: 'test-value' }
        const expectedOutput = { data: 'expected-result', error: undefined }

        const result = await toolName.execute({ context: input })

        expect(result).toEqual(expectedOutput)
        expect(result.data).toBeDefined()
        expect(result.error).toBeUndefined()
    })

    it('should handle edge cases gracefully', async () => {
        const input = { param: null } // or empty string, max length, etc.

        const result = await toolName.execute({ context: input })

        expect(result.data).toBeNull()
        expect(result.error).toBeDefined()
    })

    it('should validate input schema', async () => {
        const invalidInput = { param: 123 } // Wrong type

        const result = await toolName.execute({ context: invalidInput })

        expect(result.data).toBeNull()
        expect(result.error).toContain('validation')
    })
})
