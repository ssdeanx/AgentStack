import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { dataValidatorToolJSON } from '../data-validator.tool'

describe('dataValidatorToolJSON', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('validates valid data against schema', async () => {
        const schema = {
            type: 'object' as const,
            properties: {
                name: { type: 'string' as const },
                age: { type: 'number' as const },
                email: { type: 'string' as const },
            },
            required: ['name', 'email'],
        }
        const data = { name: 'Alice', age: 30, email: 'alice@example.com' }

        const result = await dataValidatorToolJSON.execute({ schema, data })
        expect(result).toBeDefined()
        expect(result.valid).toBe(true)
        expect(result.errors).toBeUndefined()
    })

    it('rejects data missing required fields', async () => {
        const schema = {
            type: 'object' as const,
            properties: {
                name: { type: 'string' as const },
                email: { type: 'string' as const },
            },
            required: ['name', 'email'],
        }
        const data = { name: 'Alice' } // missing email

        const result = await dataValidatorToolJSON.execute({ schema, data })
        expect(result).toBeDefined()
        expect(result.valid).toBe(false)
        expect(result.errors).toBeDefined()
        expect(result.errors?.length).toBeGreaterThan(0)
    })

    it('validates array type', async () => {
        const schema = {
            type: 'array' as const,
            items: { type: 'string' as const },
        }
        const data = ['a', 'b', 'c']

        const result = await dataValidatorToolJSON.execute({ schema, data })
        expect(result.valid).toBe(true)
    })

    it('rejects invalid array items', async () => {
        const schema = {
            type: 'array' as const,
            items: { type: 'number' as const },
        }
        const data = [1, 2, 'three']

        const result = await dataValidatorToolJSON.execute({ schema, data })
        expect(result.valid).toBe(false)
        expect(result.errors).toBeDefined()
    })

    it('validates nested objects', async () => {
        const schema = {
            type: 'object' as const,
            properties: {
                user: {
                    type: 'object' as const,
                    properties: {
                        name: { type: 'string' as const },
                        profile: {
                            type: 'object' as const,
                            properties: {
                                age: { type: 'number' as const },
                            },
                        },
                    },
                },
            },
        }
        const data = { user: { name: 'Alice', profile: { age: 25 } } }

        const result = await dataValidatorToolJSON.execute({ schema, data })
        expect(result.valid).toBe(true)
    })

    it('validates type constraints', async () => {
        const schema = {
            type: 'object' as const,
            properties: {
                count: { type: 'number' as const, minimum: 0, maximum: 100 },
                email: { type: 'string' as const, email: true },
                pattern: { type: 'string' as const, pattern: '^[a-z]+$' },
            },
        }

        // Valid case
        const validResult = await dataValidatorToolJSON.execute({
            schema,
            data: { count: 50, email: 'test@example.com', pattern: 'abc' },
        })
        expect(validResult.valid).toBe(true)

        // Invalid cases
        const invalidCount = await dataValidatorToolJSON.execute({
            schema,
            data: { count: 150 },
        })
        expect(invalidCount.valid).toBe(false)

        const invalidEmail = await dataValidatorToolJSON.execute({
            schema,
            data: { email: 'invalid-email' },
        })
        expect(invalidEmail.valid).toBe(false)
    })

    it('handles null or undefined data', async () => {
        const schema = { type: 'object' as const }

        const nullResult = await dataValidatorToolJSON.execute({
            schema,
            data: null,
        })
        expect(nullResult.valid).toBe(false)

        const undefinedResult = await dataValidatorToolJSON.execute({
            schema,
            data: undefined,
        })
        expect(undefinedResult.valid).toBe(false)
    })
})
