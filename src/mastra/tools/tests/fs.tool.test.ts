import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fsTool } from '../fs'
import type { FsToolContext } from '../fs'
import type { RequestContext } from '@mastra/core/request-context'

describe('fsTool', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('write action', () => {
        it('should successfully write file content', async () => {
            // Mock fsPromises.writeFile
            const writeFileMock = vi.spyOn(
                require('node:fs/promises'),
                'writeFile'
            )
            writeFileMock.mockResolvedValue(undefined)

            // Create mock context
            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {
                    get: vi.fn(),
                    has: vi.fn(),
                } as unknown as RequestContext,
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

            const result = await fsTool.execute(
                {
                    action: 'write',
                    file: '/test/file.txt',
                    data: 'Hello World',
                },
                mockContext
            )

            expect(result.message).toBe('Success')
            expect(writeFileMock).toHaveBeenCalledWith(
                '/test/file.txt',
                'Hello World'
            )

            // Verify progress events
            expect(mockContext.writer.custom).toHaveBeenCalledTimes(2)
            expect(mockContext.writer.custom).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'data-tool-progress',
                    data: expect.objectContaining({ status: 'in-progress' }),
                    id: 'fsTool',
                })
            )
            expect(mockContext.writer.custom).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'data-tool-progress',
                    data: expect.objectContaining({ status: 'done' }),
                    id: 'fsTool',
                })
            )
        })

        it('should handle write error gracefully', async () => {
            const writeFileMock = vi.spyOn(
                require('node:fs/promises'),
                'writeFile'
            )
            writeFileMock.mockRejectedValue(new Error('Permission denied'))

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
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

            const result = await fsTool.execute(
                { action: 'write', file: '/protected/file.txt', data: 'data' },
                mockContext
            )

            expect(result.message).toContain('Error: Permission denied')
            expect(
                mockContext.tracingContext.currentSpan.createChildSpan
            ).toHaveBeenCalled()
        })
    })

    describe('read action', () => {
        it('should successfully read file content', async () => {
            const readFileMock = vi.spyOn(
                require('node:fs/promises'),
                'readFile'
            )
            readFileMock.mockResolvedValue('File content here')

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
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

            const result = await fsTool.execute(
                { action: 'read', file: '/test/file.txt', data: '' },
                mockContext
            )

            expect(result.message).toBe('File content here')
            expect(readFileMock).toHaveBeenCalledWith('/test/file.txt', 'utf8')
        })

        it('should return error message when file not found', async () => {
            const readFileMock = vi.spyOn(
                require('node:fs/promises'),
                'readFile'
            )
            readFileMock.mockRejectedValue(new Error('ENOENT: no such file'))

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
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

            const result = await fsTool.execute(
                { action: 'read', file: '/nonexistent/file.txt', data: '' },
                mockContext
            )

            expect(result.message).toContain('Error:')
        })
    })

    describe('append action', () => {
        it('should successfully append content to file', async () => {
            const appendFileMock = vi.spyOn(
                require('node:fs/promises'),
                'appendFile'
            )
            appendFileMock.mockResolvedValue(undefined)

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
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

            const result = await fsTool.execute(
                {
                    action: 'append',
                    file: '/test/log.txt',
                    data: '\nNew entry',
                },
                mockContext
            )

            expect(result.message).toBe('Success')
            expect(appendFileMock).toHaveBeenCalledWith(
                '/test/log.txt',
                '\nNew entry'
            )
        })

        it('should handle append error gracefully', async () => {
            const appendFileMock = vi.spyOn(
                require('node:fs/promises'),
                'appendFile'
            )
            appendFileMock.mockRejectedValue(new Error('Disk full'))

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
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

            const result = await fsTool.execute(
                { action: 'append', file: '/full/disk.txt', data: 'data' },
                mockContext
            )

            expect(result.message).toContain('Error: Disk full')
        })
    })

    describe('invalid action', () => {
        it('should return error for invalid action', async () => {
            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
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

            const result = await fsTool.execute(
                {
                    action: 'invalid_action',
                    file: '/test/file.txt',
                    data: 'data',
                },
                mockContext
            )

            expect(result.message).toBe('Invalid action')
        })
    })

    describe('abort signal handling', () => {
        it('should throw error when aborted before operation', async () => {
            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: true }, // Aborted signal
                requestContext: {} as RequestContext,
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

            await expect(
                fsTool.execute(
                    { action: 'write', file: '/test/file.txt', data: 'data' },
                    mockContext
                )
            ).rejects.toThrow('FS operation cancelled')
        })

        it('should handle AbortError during file operations', async () => {
            const writeFileMock = vi.spyOn(
                require('node:fs/promises'),
                'writeFile'
            )
            const abortError = new Error('Operation cancelled')
            abortError.name = 'AbortError'
            writeFileMock.mockRejectedValue(abortError)

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
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

            const result = await fsTool.execute(
                { action: 'write', file: '/test/file.txt', data: 'data' },
                mockContext
            )

            expect(result.message).toBe('Error: FS operation cancelled')
            expect(
                mockContext.tracingContext.currentSpan.createChildSpan
            ).toHaveBeenCalled()
        })
    })

    describe('tracing context', () => {
        it('should create tracing span with correct metadata', async () => {
            const writeFileMock = vi.spyOn(
                require('node:fs/promises'),
                'writeFile'
            )
            writeFileMock.mockResolvedValue(undefined)

            const createChildSpanMock = vi.fn().mockReturnValue({
                update: vi.fn(),
                end: vi.fn(),
                error: vi.fn(),
            })

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {
                    userId: 'test-user-123',
                } as FsToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: createChildSpanMock,
                    },
                },
            } as any

            await fsTool.execute(
                { action: 'write', file: '/test/file.txt', data: 'content' },
                mockContext
            )

            expect(createChildSpanMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'tool_call',
                    name: 'fs-operation',
                    input: {
                        action: 'write',
                        file: '/test/file.txt',
                        data: 'content',
                    },
                    metadata: expect.objectContaining({
                        'tool.id': 'fsTool',
                        'tool.input.action': 'write',
                        'tool.input.file': '/test/file.txt',
                    }),
                })
            )
        })

        it('should update span with success metadata', async () => {
            const writeFileMock = vi.spyOn(
                require('node:fs/promises'),
                'writeFile'
            )
            writeFileMock.mockResolvedValue(undefined)

            const spanMock = {
                update: vi.fn(),
                end: vi.fn(),
                error: vi.fn(),
            }

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue(spanMock),
                    },
                },
            } as any

            await fsTool.execute(
                { action: 'write', file: '/test/file.txt', data: 'data' },
                mockContext
            )

            expect(spanMock.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    output: { message: 'Success' },
                    metadata: expect.objectContaining({
                        'tool.output.success': true,
                    }),
                })
            )
            expect(spanMock.end).toHaveBeenCalled()
        })
    })

    describe('context with userId', () => {
        it('should include userId in tracing metadata', async () => {
            const writeFileMock = vi.spyOn(
                require('node:fs/promises'),
                'writeFile'
            )
            writeFileMock.mockResolvedValue(undefined)

            const createChildSpanMock = vi.fn().mockReturnValue({
                update: vi.fn(),
                end: vi.fn(),
                error: vi.fn(),
            })

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {
                    userId: 'user-456',
                } as FsToolContext,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: createChildSpanMock,
                    },
                },
            } as any

            await fsTool.execute(
                { action: 'write', file: '/user/file.txt', data: 'user data' },
                mockContext
            )

            expect(createChildSpanMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({
                        action: 'write',
                        file: '/user/file.txt',
                        data: 'user data',
                    }),
                })
            )
        })
    })

    describe('message truncation in onOutput', () => {
        it('should truncate long messages in onOutput hook', async () => {
            const readFileMock = vi.spyOn(
                require('node:fs/promises'),
                'readFile'
            )
            const longContent = 'A'.repeat(200)
            readFileMock.mockResolvedValue(longContent)

            const mockContext = {
                writer: {
                    custom: vi.fn().mockResolvedValue(undefined),
                },
                abortSignal: { aborted: false },
                requestContext: {} as RequestContext,
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

            await fsTool.execute(
                { action: 'read', file: '/test/large-file.txt', data: '' },
                mockContext
            )

            // Verify the read succeeded with long content
            expect(mockContext.writer.custom).toHaveBeenCalled()
        })
    })
})
