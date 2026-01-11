import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { jwtAuthTool } from '../jwt-auth.tool'

describe('jwtAuthTool', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should return mock user data when JWT is provided', async () => {
        // Create a proper mock context that satisfies RequestContext interface
        const mockContext = {
            requestContext: {
                get: vi.fn((key: string) => {
                    if (key === 'jwt') {return 'valid-jwt-token'}
                    return undefined
                }),
                set: vi.fn(),
                has: vi.fn(() => false),
                delete: vi.fn(),
                entries: vi.fn(),
                keys: vi.fn(),
                values: vi.fn(),
                forEach: vi.fn(),
                toObject: vi.fn(() => ({})),
                clear: vi.fn(),
                size: 0,
                toJSON: vi.fn(() => ({})),
            },
            tracingContext: {
                currentSpan: {
                    createChildSpan: vi.fn().mockReturnValue({
                        update: vi.fn(),
                        end: vi.fn(),
                        error: vi.fn(),
                    }),
                },
            },
            writer: {
                custom: vi.fn(),
            },
            abortSignal: { aborted: false },
        } as any

        const result = await jwtAuthTool.execute({}, mockContext)

        expect(result).toBeDefined()
        if (!('sub' in result)) {
            throw new Error('Expected jwtAuthTool to return a valid JWT payload')
        }
        expect(result.sub).toBe('mock-user')
        expect(result.roles).toEqual(['user'])
        expect(result.tenant).toBe('mock-tenant')
        expect(result.stepUp).toBe(false)
        expect(result.exp).toBeDefined()
        expect(result.iat).toBeDefined()
    })

    it('should throw error when JWT is not found in context', async () => {
        const mockContext = {
            requestContext: {
                get: vi.fn(() => undefined),
                set: vi.fn(),
                has: vi.fn(() => false),
                delete: vi.fn(),
                entries: vi.fn(),
                keys: vi.fn(),
                values: vi.fn(),
                forEach: vi.fn(),
                toObject: vi.fn(() => ({})),
                clear: vi.fn(),
                size: 0,
                toJSON: vi.fn(() => ({})),
            },
            tracingContext: {
                currentSpan: {
                    createChildSpan: vi.fn().mockReturnValue({
                        error: vi.fn(),
                        end: vi.fn(),
                    }),
                },
            },
            writer: {
                custom: vi.fn(),
            },
            abortSignal: { aborted: false },
        } as any

        await expect(jwtAuthTool.execute({}, mockContext)).rejects.toThrow(
            'JWT not found in runtime context'
        )
    })

    it('should handle abort signal', async () => {
        const mockContext = {
            requestContext: {
                get: vi.fn(() => 'test-token'),
                set: vi.fn(),
                has: vi.fn(() => true),
                delete: vi.fn(),
                entries: vi.fn(),
                keys: vi.fn(),
                values: vi.fn(),
                forEach: vi.fn(),
                toObject: vi.fn(() => ({})),
                clear: vi.fn(),
                size: 0,
                toJSON: vi.fn(() => ({})),
            },
            tracingContext: {
                currentSpan: {
                    createChildSpan: vi.fn().mockReturnValue({
                        update: vi.fn(),
                        end: vi.fn(),
                    }),
                },
            },
            writer: {
                custom: vi.fn(),
            },
            abortSignal: { aborted: true },
        } as any

        await expect(jwtAuthTool.execute({}, mockContext)).rejects.toThrow(
            'JWT authentication cancelled'
        )
    })

    it('should create tracing span with correct metadata', async () => {
        const createChildSpanMock = vi.fn().mockReturnValue({
            update: vi.fn(),
            end: vi.fn(),
            error: vi.fn(),
        })

        const mockContext = {
            requestContext: {
                get: vi.fn(() => 'test-jwt-token'),
                set: vi.fn(),
                has: vi.fn(() => true),
                delete: vi.fn(),
                entries: vi.fn(),
                keys: vi.fn(),
                values: vi.fn(),
                forEach: vi.fn(),
                toObject: vi.fn(() => ({})),
                clear: vi.fn(),
                size: 0,
                toJSON: vi.fn(() => ({})),
            },
            tracingContext: {
                currentSpan: {
                    createChildSpan: createChildSpanMock,
                },
            },
            writer: {
                custom: vi.fn(),
            },
            abortSignal: { aborted: false },
        } as any

        await jwtAuthTool.execute({}, mockContext)

        expect(createChildSpanMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: expect.anything(),
                name: 'jwt-auth-tool',
                input: { hasJwt: true },
                metadata: expect.objectContaining({
                    'tool.id': 'jwt-auth',
                    'tool.input.hasJwt': true,
                }),
            })
        )
    })

    it('should emit progress events', async () => {
        const customMock = vi.fn()

        const mockContext = {
            requestContext: {
                get: vi.fn(() => 'valid-jwt'),
                set: vi.fn(),
                has: vi.fn(() => true),
                delete: vi.fn(),
                entries: vi.fn(),
                keys: vi.fn(),
                values: vi.fn(),
                forEach: vi.fn(),
                toObject: vi.fn(() => ({})),
                clear: vi.fn(),
                size: 0,
                toJSON: vi.fn(() => ({})),
            },
            tracingContext: {
                currentSpan: {
                    createChildSpan: vi.fn().mockReturnValue({
                        update: vi.fn(),
                        end: vi.fn(),
                    }),
                },
            },
            writer: {
                custom: customMock,
            },
            abortSignal: { aborted: false },
        } as any

        await jwtAuthTool.execute({}, mockContext)

        // Should emit at least one progress event
        const progressCalls = customMock.mock.calls.filter(
            (call) => call[0]?.type === 'data-tool-progress'
        )
        expect(progressCalls.length).toBeGreaterThanOrEqual(1)
    })
})
