import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { urlValidationTool, urlManipulationTool } from '../url-tool'
import type { UrlToolContext } from '../url-tool'

describe('urlValidationTool', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('validate operation', () => {
        it('should validate a valid HTTPS URL', async () => {
            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false },
                requestContext: {} as UrlToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await urlValidationTool.execute(
                { url: 'https://example.com/path', operations: ['validate'] },
                mockContext
            )

            const successResult = result as any
            expect(successResult.success).toBe(true)
            expect(successResult.results.validate).toBe(true)
            expect(successResult.originalUrl).toBe('https://example.com/path')
        })

        it('should validate a valid HTTP URL', async () => {
            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false },
                requestContext: {} as UrlToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await urlValidationTool.execute(
                { url: 'http://example.com', operations: ['validate'] },
                mockContext
            )

            const successResult = result as any
            expect(successResult.success).toBe(true)
            expect(successResult.results.validate).toBe(true)
        })

        it('should reject invalid URL format', async () => {
            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false },
                requestContext: {} as UrlToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await urlValidationTool.execute(
                { url: 'not-a-valid-url', operations: ['validate'] },
                mockContext
            )

            const successResult = result as any
            expect(successResult.success).toBe(true)
            expect(successResult.results.validate).toBe(false)
        })

        it('should reject URL with invalid protocol', async () => {
            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false },
                requestContext: {} as UrlToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await urlValidationTool.execute(
                { url: 'ftp://example.com', operations: ['validate'] },
                mockContext
            )

            const successResult = result as any
            expect(successResult.success).toBe(true)
            expect(successResult.results.validate).toBe(false)
        })
    })

    describe('parse operation', () => {
        it('should parse URL components correctly', async () => {
            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false },
                requestContext: {} as UrlToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await urlValidationTool.execute(
                {
                    url: 'https://example.com:8080/path?query=value#hash',
                    operations: ['parse'],
                },
                mockContext
            )

            const successResult = result as any
            expect(successResult.success).toBe(true)
            const parsed = successResult.results.parse
            expect(parsed.protocol).toBe('https:')
            expect(parsed.hostname).toBe('example.com')
            expect(parsed.port).toBe('8080')
            expect(parsed.pathname).toBe('/path')
            expect(parsed.search).toBe('?query=value')
            expect(parsed.hash).toBe('#hash')
            expect(parsed.query.query).toBe('value')
        })
    })

    describe('normalize operation', () => {
        it('should add https protocol if missing', async () => {
            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false },
                requestContext: {} as UrlToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await urlValidationTool.execute(
                { url: 'example.com/path', operations: ['normalize'] },
                mockContext
            )

            const successResult = result as any
            expect(successResult.success).toBe(true)
            expect(successResult.results.normalize).toContain('https://')
        })

        it('should sort query parameters', async () => {
            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false },
                requestContext: {} as UrlToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await urlValidationTool.execute(
                {
                    url: 'https://example.com?z=1&a=2&m=3',
                    operations: ['normalize'],
                },
                mockContext
            )

            const successResult = result as any
            expect(successResult.success).toBe(true)
            const normalized = successResult.results.normalize as string
            expect(normalized.indexOf('a=2')).toBeLessThan(
                normalized.indexOf('z=1')
            )
        })
    })

    describe('extract-domain operation', () => {
        it('should extract domain from URL', async () => {
            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false },
                requestContext: {} as UrlToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await urlValidationTool.execute(
                {
                    url: 'https://api.example.com/v1/users',
                    operations: ['extract-domain'],
                },
                mockContext
            )

            const successResult = result as any
            expect(successResult.success).toBe(true)
            expect(successResult.results['extract-domain']).toBe(
                'api.example.com'
            )
        })
    })

    describe('multiple operations', () => {
        it('should perform multiple operations in sequence', async () => {
            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false },
                requestContext: {} as UrlToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await urlValidationTool.execute(
                {
                    url: 'https://example.com',
                    operations: ['validate', 'parse', 'extract-domain'],
                },
                mockContext
            )

            const successResult = result as any
            expect(successResult.success).toBe(true)
            expect(successResult.results.validate).toBe(true)
            expect(successResult.results.parse).toBeDefined()
            expect(successResult.results['extract-domain']).toBe('example.com')
            expect(successResult.operations).toHaveLength(3)
        })
    })

    describe('tracing', () => {
        it('should create tracing span with correct metadata', async () => {
            const createChildSpanMock = vi.fn().mockReturnValue({
                update: vi.fn(),
                end: vi.fn(),
                error: vi.fn(),
            })

            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false },
                requestContext: { userId: 'test-user-123' } as UrlToolContext,
                tracingContext: {
                    currentSpan: { createChildSpan: createChildSpanMock },
                },
            } as any

            await urlValidationTool.execute(
                { url: 'https://example.com', operations: ['validate'] },
                mockContext
            )

            expect(createChildSpanMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'tool_call',
                    name: 'url-validation',
                    metadata: expect.objectContaining({
                        'tool.id': 'url-validation',
                        'tool.input.url': 'https://example.com',
                        'user.id': 'test-user-123',
                    }),
                })
            )
        })
    })
})

describe('urlManipulationTool', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('add-query operation', () => {
        it('should add query parameters to URL', async () => {
            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false },
                requestContext: {} as UrlToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await urlManipulationTool.execute(
                {
                    baseUrl: 'https://example.com/page',
                    operations: ['add-query'],
                    parameters: { query: { key: 'value', page: '1' } },
                },
                mockContext
            )

            const successResult = result as any
            expect(successResult.success).toBe(true)
            expect(successResult.resultUrl).toContain('key=value')
            expect(successResult.resultUrl).toContain('page=1')
            expect(successResult.changes).toHaveLength(1)
        })
    })

    describe('remove-query operation', () => {
        it('should remove query parameters from URL', async () => {
            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false },
                requestContext: {} as UrlToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await urlManipulationTool.execute(
                {
                    baseUrl: 'https://example.com/page?old=value&keep=this',
                    operations: ['remove-query'],
                    parameters: { queryKeys: ['old'] },
                },
                mockContext
            )

            const successResult = result as any
            expect(successResult.success).toBe(true)
            expect(successResult.resultUrl).not.toContain('old=value')
            expect(successResult.resultUrl).toContain('keep=this')
        })
    })

    describe('add-fragment operation', () => {
        it('should add fragment to URL', async () => {
            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false },
                requestContext: {} as UrlToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await urlManipulationTool.execute(
                {
                    baseUrl: 'https://example.com/page',
                    operations: ['add-fragment'],
                    parameters: { fragment: 'section2' },
                },
                mockContext
            )

            const successResult = result as any
            expect(successResult.success).toBe(true)
            expect(successResult.resultUrl).toContain('#section2')
        })
    })

    describe('change-protocol operation', () => {
        it('should change protocol of URL', async () => {
            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false },
                requestContext: {} as UrlToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await urlManipulationTool.execute(
                {
                    baseUrl: 'https://example.com',
                    operations: ['change-protocol'],
                    parameters: { protocol: 'http' },
                },
                mockContext
            )

            const successResult = result as any
            expect(successResult.success).toBe(true)
            expect(successResult.resultUrl).toMatch(/^http:\/\//)
        })
    })

    describe('add-path operation', () => {
        it('should add path segment to URL', async () => {
            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false },
                requestContext: {} as UrlToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await urlManipulationTool.execute(
                {
                    baseUrl: 'https://example.com',
                    operations: ['add-path'],
                    parameters: { path: 'api/v1/users' },
                },
                mockContext
            )

            const successResult = result as any
            expect(successResult.success).toBe(true)
            expect(successResult.resultUrl).toContain('/api/v1/users')
        })
    })

    describe('multiple operations', () => {
        it('should perform multiple manipulation operations', async () => {
            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false },
                requestContext: {} as UrlToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                },
            } as any

            const result = await urlManipulationTool.execute(
                {
                    baseUrl: 'https://example.com/page',
                    operations: ['add-fragment', 'add-query'],
                    parameters: {
                        fragment: 'bottom',
                        query: { ref: 'header' },
                    },
                },
                mockContext
            )

            const successResult = result as any
            expect(successResult.success).toBe(true)
            expect(successResult.resultUrl).toContain('#bottom')
            expect(successResult.resultUrl).toContain('ref=header')
            expect(successResult.changes).toHaveLength(2)
        })
    })
})
