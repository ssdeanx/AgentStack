import type { Mock } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { writeNoteTool } from '../write-note'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

// Mock fs module
vi.mock('node:fs/promises', () => ({
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
}))

describe('writeNoteTool', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    const createMockContext = () => ({
        writer: {
            custom: vi.fn().mockResolvedValue(undefined),
        } as any,
        abortSignal: { aborted: false } as AbortSignal,
        requestContext: {
            userId: 'test-user',
            workspaceId: 'test-workspace',
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
    })

    it('should successfully write a note', async () => {
        const mockContext = createMockContext()

        const result = await (writeNoteTool as any).execute(
            { title: 'test-note', content: 'Test content' },
            mockContext
        )

        expect(result).toBe('Successfully wrote to note "test-note".')
        expect(fs.mkdir).toHaveBeenCalledWith(
            expect.stringContaining('notes'),
            { recursive: true }
        )
        expect(fs.writeFile).toHaveBeenCalledWith(
            expect.stringContaining('test-note.md'),
            'Test content',
            'utf-8'
        )
    })

    it('should create tracing span with correct metadata', async () => {
        const mockContext = createMockContext()

        await (writeNoteTool as any).execute(
            { title: 'my-note', content: 'Content here' },
            mockContext
        )

        expect(
            mockContext.tracingContext.currentSpan.createChildSpan
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'tool_call',
                name: 'write-note',
                input: { title: 'my-note', contentLength: 12 },
                metadata: expect.objectContaining({
                    'tool.id': 'write',
                    'tool.input.title': 'my-note',
                    'notes.dir': expect.any(String),
                }),
            })
        )
    })

    it('should emit progress events', async () => {
        const mockContext = createMockContext()
        const customMock = mockContext.writer.custom

        await (writeNoteTool as any).execute(
            { title: 'progress-test', content: 'Testing progress' },
            mockContext
        )

        expect(customMock).toHaveBeenCalled()
        const calls = customMock.mock.calls
        const progressEvents = calls.filter(
            (call: any[]) => call[0]?.type === 'data-tool-progress'
        )
        expect(progressEvents.length).toBeGreaterThanOrEqual(2)
    })

    it('should throw error when operation is cancelled', async () => {
        const mockContext = createMockContext()
        mockContext.abortSignal = { aborted: true } as unknown as AbortSignal

        await expect(
            (writeNoteTool as any).execute(
                { title: 'cancelled', content: 'Content' },
                mockContext
            )
        ).rejects.toThrow('Write note operation cancelled')
    })

    it('should handle fs.writeFile error', async () => {
        const mockContext = createMockContext()
        ;(fs.writeFile as Mock).mockRejectedValue(new Error('Disk full'))

        await expect(
            (writeNoteTool as any).execute(
                { title: 'error-test', content: 'Content' },
                mockContext
            )
        ).rejects.toThrow('Disk full')

        // Should have called error on span
        const span = mockContext.tracingContext.currentSpan.createChildSpan()
        expect(span.error).toHaveBeenCalled()
        expect(span.end).toHaveBeenCalled()
    })

    it('should handle fs.mkdir error', async () => {
        const mockContext = createMockContext()
        ;(fs.mkdir as Mock).mockRejectedValue(new Error('Permission denied'))

        await expect(
            (writeNoteTool as any).execute(
                { title: 'mkdir-error', content: 'Content' },
                mockContext
            )
        ).rejects.toThrow('Permission denied')
    })

    it('should update span with processing time', async () => {
        const mockContext = createMockContext()

        await (writeNoteTool as any).execute(
            { title: 'timing-test', content: 'Content' },
            mockContext
        )

        const span = mockContext.tracingContext.currentSpan.createChildSpan()
        expect(span.update).toHaveBeenCalledWith(
            expect.objectContaining({
                output: {
                    success: true,
                    filePath: expect.stringContaining('timing-test.md'),
                },
                metadata: expect.objectContaining({
                    'tool.output.success': true,
                    'tool.output.filePath':
                        expect.stringContaining('timing-test.md'),
                    'tool.output.processingTimeMs': expect.any(Number),
                }),
            })
        )
        expect(span.end).toHaveBeenCalled()
    })

    it('should create correct file path', async () => {
        const mockContext = createMockContext()

        await (writeNoteTool as any).execute(
            { title: 'path-test', content: 'Content' },
            mockContext
        )

        expect(fs.writeFile).toHaveBeenCalledWith(
            expect.stringContaining('path-test.md'),
            'Content',
            'utf-8'
        )
    })

    it('should handle special characters in title', async () => {
        const mockContext = createMockContext()

        const result = await (writeNoteTool as any).execute(
            { title: 'test-note_v2.0', content: 'Content' },
            mockContext
        )

        expect(result).toBe('Successfully wrote to note "test-note_v2.0".')
        expect(fs.writeFile).toHaveBeenCalled()
    })

    it('should use user and workspace from context', async () => {
        const mockContext = createMockContext()

        await (writeNoteTool as any).execute(
            { title: 'context-test', content: 'Content' },
            mockContext
        )

        expect(
            mockContext.tracingContext.currentSpan.createChildSpan
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                metadata: expect.objectContaining({
                    'user.id': 'test-user',
                    'workspace.id': 'test-workspace',
                }),
            })
        )
    })
})
