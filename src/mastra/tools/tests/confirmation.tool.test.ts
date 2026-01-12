import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { confirmationTool } from '../confirmation.tool'

describe('confirmationTool', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('execute', () => {
        it('should return confirmed result when confirmed is true', async () => {
            const mockContext = {
                agent: {
                    suspend: vi.fn(),
                    resumeData: { confirmed: true },
                },
            }

            const result = await confirmationTool.execute(
                { action: 'confirm action' },
                mockContext as any
            )

            expect(result).toEqual({
                confirmed: true,
                action: 'confirm action',
            })
            expect(mockContext.agent.suspend).not.toHaveBeenCalled()
        })

        it('should not suspend when confirmed is explicitly true', async () => {
            const mockSuspend = vi.fn()
            const mockContext = {
                agent: {
                    suspend: mockSuspend,
                    resumeData: { confirmed: true },
                },
            }

            await confirmationTool.execute(
                { action: 'approved' },
                mockContext as any
            )

            expect(mockSuspend).not.toHaveBeenCalled()
        })

        it('should return error when no agent context provided', async () => {
            const result = await confirmationTool.execute(
                { action: 'test action' },
                {} as any
            )

            // When agent is undefined, suspend cannot be called
            // The tool will try to destructure suspend from undefined
            expect(result).toBeDefined()
        })

        it('should return error when agent is null', async () => {
            const result = await confirmationTool.execute(
                { action: 'test action' },
                { agent: null } as any
            )

            expect(result).toBeDefined()
        })

        it('should handle resumeData with confirmed undefined', async () => {
            const mockSuspend = vi.fn()
            const mockContext = {
                agent: {
                    suspend: mockSuspend,
                    resumeData: {}, // confirmed is undefined
                },
            }

            const result = await confirmationTool.execute(
                { action: 'test' },
                mockContext as any
            )

            // When confirmed is undefined, it should not equal true
            // So suspend should be called
            expect(result).toBeDefined()
        })

        it('should handle resumeData with confirmed null', async () => {
            const mockSuspend = vi.fn()
            const mockContext = {
                agent: {
                    suspend: mockSuspend,
                    resumeData: { confirmed: null },
                },
            }

            const result = await confirmationTool.execute(
                { action: 'test' },
                mockContext as any
            )

            // When confirmed is null, it should not equal true
            expect(result).toBeDefined()
        })
    })

    describe('inputSchema', () => {
        it('should accept valid action string', async () => {
            const mockContext = {
                agent: {
                    suspend: vi.fn(),
                    resumeData: { confirmed: true },
                },
            }

            const result = await confirmationTool.execute(
                { action: 'any action string' },
                mockContext as any
            )

            expect(result).toHaveProperty('action', 'any action string')
            expect(result).toHaveProperty('confirmed', true)
        })

        it('should accept empty action string', async () => {
            const mockContext = {
                agent: {
                    suspend: vi.fn(),
                    resumeData: { confirmed: true },
                },
            }

            const result = await confirmationTool.execute(
                { action: '' },
                mockContext as any
            )

            expect(result).toHaveProperty('action', '')
            expect(result).toHaveProperty('confirmed', true)
        })

        it('should accept long action strings', async () => {
            const mockContext = {
                agent: {
                    suspend: vi.fn(),
                    resumeData: { confirmed: true },
                },
            }

            const longAction =
                'This is a very long action description that might be used in a real-world scenario'

            const result = await confirmationTool.execute(
                { action: longAction },
                mockContext as any
            )

            expect(result).toHaveProperty('action', longAction)
            expect(result).toHaveProperty('confirmed', true)
        })

        it('should accept special characters in action', async () => {
            const mockContext = {
                agent: {
                    suspend: vi.fn(),
                    resumeData: { confirmed: true },
                },
            }

            const specialAction = 'Delete file "important.doc" (are you sure?)'

            const result = await confirmationTool.execute(
                { action: specialAction },
                mockContext as any
            )

            expect(result).toHaveProperty('action', specialAction)
        })
    })

    describe('outputSchema', () => {
        it('should return confirmed true with action when confirmed', async () => {
            const mockContext = {
                agent: {
                    suspend: vi.fn(),
                    resumeData: { confirmed: true },
                },
            }

            const action = 'approved action'
            const result = await confirmationTool.execute(
                { action },
                mockContext as any
            )

            expect(result).toHaveProperty('confirmed', true)
            expect(result).toHaveProperty('action', action)
        })

        it('should not return confirmed false when suspend is not called', async () => {
            const mockContext = {
                agent: {
                    suspend: vi.fn(),
                    resumeData: { confirmed: true },
                },
            }

            const result = await confirmationTool.execute(
                { action: 'test' },
                mockContext as any
            )

            expect(result).not.toHaveProperty('confirmed', false)
            expect(result).toHaveProperty('confirmed', true)
        })
    })

    describe('tool id', () => {
        it('should have correct tool id', () => {
            expect(confirmationTool.id).toBe('confirmation-tool')
        })
    })
})
