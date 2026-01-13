import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { colorChangeTool, changeBgColor } from '../color-change-tool'

describe('colorChangeTool', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    const createMockContext = (overrides: Record<string, unknown> = {}) => ({
        writer: {
            custom: vi.fn().mockResolvedValue(undefined),
        } as any,
        abortSignal: { aborted: false } as AbortSignal,
        requestContext: {
            theme: 'light',
            userId: 'test-user',
            workspaceId: 'test-workspace',
            ...overrides,
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

    it('should return success with color', async () => {
        const mockContext = createMockContext()

        const result = await (colorChangeTool as any).execute(
            { color: '#ff0000' },
            mockContext
        )

        expect(result).toEqual({ success: true, color: '#ff0000' })
    })

    it('should return valid color values', async () => {
        const mockContext = createMockContext()

        const result = await (colorChangeTool as any).execute(
            { color: 'blue' },
            mockContext
        )

        expect(result.color).toBe('blue')
        expect(result.success).toBe(true)
    })

    it('should create tracing span with color metadata', async () => {
        const mockContext = createMockContext()

        await (colorChangeTool as any).execute(
            { color: '#3498db' },
            mockContext
        )

        expect(
            mockContext.tracingContext.currentSpan.createChildSpan
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'tool_call',
                name: 'change-color',
                input: { color: '#3498db' },
                metadata: expect.objectContaining({
                    'tool.id': 'changeColor',
                    'tool.input.color': '#3498db',
                    'user.id': 'test-user',
                    'workspace.id': 'test-workspace',
                }),
            })
        )
    })

    it('should emit progress events', async () => {
        const mockContext = createMockContext()
        const customMock = mockContext.writer.custom

        await (colorChangeTool as any).execute({ color: 'green' }, mockContext)

        expect(customMock).toHaveBeenCalled()
        const calls = customMock.mock.calls
        const progressEvents = calls.filter(
            (call: any[]) => call[0]?.type === 'data-tool-progress'
        )
        expect(progressEvents.length).toBe(2)

        expect(progressEvents[0][0].data.status).toBe('in-progress')
        expect(progressEvents[0][0].data.message).toContain(
            '🎨 Changing background color'
        )

        expect(progressEvents[1][0].data.status).toBe('done')
        expect(progressEvents[1][0].data.message).toContain(
            '✅ Background color changed'
        )
    })

    it('should throw error when cancelled', async () => {
        const mockContext = createMockContext()
        mockContext.abortSignal = { aborted: true } as unknown as AbortSignal

        await expect(
            (colorChangeTool as any).execute({ color: 'red' }, mockContext)
        ).rejects.toThrow('Change color operation cancelled')
    })

    it('should update span with success metadata', async () => {
        const mockContext = createMockContext()

        await (colorChangeTool as any).execute({ color: 'purple' }, mockContext)

        const span = mockContext.tracingContext.currentSpan.createChildSpan()
        expect(span.update).toHaveBeenCalledWith(
            expect.objectContaining({
                output: { success: true, color: 'purple' },
                metadata: expect.objectContaining({
                    'tool.output.success': true,
                }),
            })
        )
        expect(span.end).toHaveBeenCalled()
    })

    it('should handle various color formats', async () => {
        const mockContext = createMockContext()

        const colors = [
            '#fff',
            '#ffffff',
            'rgb(255, 255, 255)',
            'white',
            'hsl(0, 0%, 100%)',
        ]

        for (const color of colors) {
            const result = await (colorChangeTool as any).execute(
                { color },
                mockContext
            )
            expect(result.color).toBe(color)
        }
    })

    it('should use request context values', async () => {
        const mockContext = createMockContext({
            theme: 'dark',
            userId: 'user-123',
            workspaceId: 'workspace-456',
        })

        await (colorChangeTool as any).execute({ color: 'yellow' }, mockContext)

        expect(
            mockContext.tracingContext.currentSpan.createChildSpan
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                metadata: expect.objectContaining({
                    'user.id': 'user-123',
                    'workspace.id': 'workspace-456',
                }),
            })
        )
    })
})

describe('changeBgColor', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.resetModules()
    })

    it('should not throw when window is undefined (server-side rendering)', async () => {
        // This is the main use case - server-side doesn't have window
        const { changeBgColor: fn } = await import('../color-change-tool')

        // Should not throw even without window
        expect(() => fn('#ff0000')).not.toThrow()
    })
})
