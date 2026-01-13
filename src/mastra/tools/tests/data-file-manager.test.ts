import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

// Mock fs module
vi.mock('node:fs/promises', () => ({
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('file content'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue(['file1.txt', 'file2.txt']),
    stat: vi.fn().mockResolvedValue({
        size: 1024,
        mtime: new Date('2024-01-01'),
        ctime: new Date('2024-01-01'),
        isFile: () => true,
        isDirectory: () => false,
    }),
    rmdir: vi.fn().mockResolvedValue(undefined),
    copyFile: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
    realpath: vi.fn().mockResolvedValue('/mocked/path/data/test.txt'),
}))

describe('data-file-manager', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    const DATA_DIR = path.join(process.cwd(), './data')

    describe('validateDataPath', () => {
        it('should allow paths within DATA_DIR', () => {
            const validateDataPath = (filePath: string): string => {
                const absolutePath = path.resolve(DATA_DIR, filePath)
                if (!absolutePath.startsWith(DATA_DIR)) {
                    throw new Error(
                        `Access denied: File path "${filePath}" is outside the allowed data directory.`
                    )
                }
                return absolutePath
            }

            expect(() => validateDataPath('test.txt')).not.toThrow()
            expect(() => validateDataPath('subdir/file.txt')).not.toThrow()
        })

        it('should reject paths outside DATA_DIR', () => {
            const validateDataPath = (filePath: string): string => {
                const absolutePath = path.resolve(DATA_DIR, filePath)
                if (!absolutePath.startsWith(DATA_DIR)) {
                    throw new Error(
                        `Access denied: File path "${filePath}" is outside the allowed data directory.`
                    )
                }
                return absolutePath
            }

            expect(() => validateDataPath('../outside.txt')).toThrow(
                'Access denied'
            )
            expect(() => validateDataPath('/etc/passwd')).toThrow(
                'Access denied'
            )
        })
    })

    describe('readDataFileTool', () => {
        it('should read file content', async () => {
            const { readDataFileTool } = await import('../data-file-manager')

            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false } as AbortSignal,
                requestContext: {
                    userId: 'test-user',
                    workspaceId: 'test-ws',
                } as any,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                } as any,
            }

            const result = await (readDataFileTool as any).execute(
                { fileName: 'test.txt' },
                mockContext
            )

            expect(result).toBe('file content')
            expect(fs.readFile).toHaveBeenCalled()
        })

        it('should create tracing span', async () => {
            const { readDataFileTool } = await import('../data-file-manager')

            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false } as AbortSignal,
                requestContext: { userId: 'test-user' } as any,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                } as any,
            }

            await (readDataFileTool as any).execute(
                { fileName: 'myfile.txt' },
                mockContext
            )

            expect(
                mockContext.tracingContext.currentSpan.createChildSpan
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'tool_call',
                    name: 'read:file',
                    metadata: expect.objectContaining({
                        'tool.id': 'read:file',
                        'tool.input.fileName': 'myfile.txt',
                    }),
                })
            )
        })
    })

    describe('writeDataFileTool', () => {
        it('should write file content', async () => {
            const { writeDataFileTool } = await import('../data-file-manager')

            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false } as AbortSignal,
                requestContext: {} as any,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                } as any,
            }

            const result = await (writeDataFileTool as any).execute(
                { fileName: 'output.txt', content: 'new content' },
                mockContext
            )

            expect(result).toContain('written successfully')
            expect(fs.writeFile).toHaveBeenCalled()
        })
    })

    describe('listDataDirTool', () => {
        it('should list directory contents', async () => {
            const { listDataDirTool } = await import('../data-file-manager')

            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false } as AbortSignal,
                requestContext: {} as any,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                } as any,
            }

            const result = await (listDataDirTool as any).execute(
                {},
                mockContext
            )

            expect(result).toEqual(['file1.txt', 'file2.txt'])
            expect(fs.readdir).toHaveBeenCalled()
        })
    })

    describe('deleteDataFileTool', () => {
        it('should delete file', async () => {
            const { deleteDataFileTool } = await import('../data-file-manager')

            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false } as AbortSignal,
                requestContext: {} as any,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                } as any,
            }

            const result = await (deleteDataFileTool as any).execute(
                { fileName: 'to-delete.txt' },
                mockContext
            )

            expect(result).toBe('Deleted to-delete.txt')
            expect(fs.unlink).toHaveBeenCalled()
        })
    })

    describe('getDataFileInfoTool', () => {
        it('should return file info', async () => {
            const { getDataFileInfoTool } = await import('../data-file-manager')

            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false } as AbortSignal,
                requestContext: {} as any,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                } as any,
            }

            const result = await (getDataFileInfoTool as any).execute(
                { fileName: 'info.txt' },
                mockContext
            )

            expect(result.size).toBe(1024)
            expect(result.isFile).toBe(true)
            expect(result.isDirectory).toBe(false)
        })
    })

    describe('copyDataFileTool', () => {
        it('should copy file', async () => {
            const { copyDataFileTool } = await import('../data-file-manager')

            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false } as AbortSignal,
                requestContext: {} as any,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                } as any,
            }

            const result = await (copyDataFileTool as any).execute(
                { sourceFile: 'source.txt', destFile: 'dest.txt' },
                mockContext
            )

            expect(result).toBe('Copied source.txt to dest.txt')
            expect(fs.copyFile).toHaveBeenCalled()
        })
    })

    describe('moveDataFileTool', () => {
        it('should move file', async () => {
            const { moveDataFileTool } = await import('../data-file-manager')

            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false } as AbortSignal,
                requestContext: {} as any,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                } as any,
            }

            const result = await (moveDataFileTool as any).execute(
                { sourceFile: 'old.txt', destFile: 'new.txt' },
                mockContext
            )

            expect(result).toBe('File old.txt moved to new.txt successfully.')
            expect(fs.rename).toHaveBeenCalled()
        })
    })

    describe('createDataDirTool', () => {
        it('should create directory', async () => {
            const { createDataDirTool } = await import('../data-file-manager')

            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false } as AbortSignal,
                requestContext: {} as any,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                } as any,
            }

            const result = await (createDataDirTool as any).execute(
                { dirPath: 'newdir' },
                mockContext
            )

            expect(result).toBe('Created directory newdir')
            expect(fs.mkdir).toHaveBeenCalled()
        })
    })

    describe('removeDataDirTool', () => {
        it('should remove directory', async () => {
            const { removeDataDirTool } = await import('../data-file-manager')

            const mockContext = {
                writer: { custom: vi.fn().mockResolvedValue(undefined) },
                abortSignal: { aborted: false } as AbortSignal,
                requestContext: {} as any,
                tracingContext: {
                    currentSpan: {
                        createChildSpan: vi.fn().mockReturnValue({
                            update: vi.fn(),
                            end: vi.fn(),
                            error: vi.fn(),
                        }),
                    },
                } as any,
            }

            const result = await (removeDataDirTool as any).execute(
                { dirPath: 'olddir' },
                mockContext
            )

            expect(result).toBe('Removed directory olddir')
            expect(fs.rmdir).toHaveBeenCalled()
        })
    })
})
