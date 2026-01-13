import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { evaluateResultTool } from '../evaluateResultTool'

describe('evaluateResultTool', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should return isRelevant=false for duplicate URLs', async () => {
        const mockContext = {
            writer: { custom: vi.fn().mockResolvedValue(undefined) },
            abortSignal: { aborted: false },
            mastra: { getAgent: vi.fn() },
            requestContext: {} as any,
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

        const result = await (evaluateResultTool as any).execute(
            {
                query: 'test query',
                result: {
                    title: 'Test',
                    url: 'https://example.com',
                    content: 'Test content',
                },
                existingUrls: ['https://example.com'],
            },
            mockContext
        )

        expect(result).toEqual({
            isRelevant: false,
            reason: 'URL already processed',
        })
        expect(
            mockContext.tracingContext.currentSpan.createChildSpan
        ).toHaveBeenCalled()
    })

    it('should return isRelevant=true for new URLs', async () => {
        const mockAgent = {
            stream: vi.fn().mockResolvedValue({
                text: '{"isRelevant": true, "reason": "Relevant content"}',
                fullStream: {
                    pipeTo: vi.fn().mockResolvedValue(undefined),
                },
            }),
        }

        const mockContext = {
            writer: { custom: vi.fn().mockResolvedValue(undefined) },
            abortSignal: { aborted: false },
            mastra: { getAgent: vi.fn().mockReturnValue(mockAgent) },
            requestContext: {} as any,
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

        const result = await (evaluateResultTool as any).execute(
            {
                query: 'test query',
                result: {
                    title: 'Test',
                    url: 'https://new-example.com',
                    content: 'Test content',
                },
            },
            mockContext
        )

        expect(result).toEqual({ isRelevant: true, reason: 'Relevant content' })
    })

    it('should return isRelevant=false when agent returns invalid response', async () => {
        const mockAgent = {
            stream: vi.fn().mockResolvedValue({
                text: 'not valid json',
                fullStream: {
                    pipeTo: vi.fn().mockResolvedValue(undefined),
                },
            }),
        }

        const mockContext = {
            writer: { custom: vi.fn().mockResolvedValue(undefined) },
            abortSignal: { aborted: false },
            mastra: { getAgent: vi.fn().mockReturnValue(mockAgent) },
            requestContext: {} as any,
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

        const result = await (evaluateResultTool as any).execute(
            {
                query: 'test query',
                result: {
                    title: 'Test',
                    url: 'https://new-example.com',
                    content: 'Test content',
                },
            },
            mockContext
        )

        expect(result).toEqual({
            isRelevant: false,
            reason: 'Invalid response format from evaluation agent',
        })
    })

    it('should handle agent.stream throwing an error', async () => {
        const mockAgent = {
            stream: vi.fn().mockRejectedValue(new Error('Stream failed')),
        }

        const mockContext = {
            writer: { custom: vi.fn().mockResolvedValue(undefined) },
            abortSignal: { aborted: false },
            mastra: { getAgent: vi.fn().mockReturnValue(mockAgent) },
            requestContext: {} as any,
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

        const result = await (evaluateResultTool as any).execute(
            {
                query: 'test query',
                result: {
                    title: 'Test',
                    url: 'https://new-example.com',
                    content: 'Test content',
                },
            },
            mockContext
        )

        expect(result).toEqual({
            isRelevant: false,
            reason: 'Error in evaluation',
        })
    })

    it('should use fallback generate method when stream is not available', async () => {
        const mockAgent = {
            stream: undefined,
            generate: vi.fn().mockResolvedValue({
                text: '{"isRelevant": true, "reason": "Generated response"}',
            }),
        }

        const mockContext = {
            writer: { custom: vi.fn().mockResolvedValue(undefined) },
            abortSignal: { aborted: false },
            mastra: { getAgent: vi.fn().mockReturnValue(mockAgent) },
            requestContext: {} as any,
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

        const result = await (evaluateResultTool as any).execute(
            {
                query: 'test query',
                result: {
                    title: 'Test',
                    url: 'https://new-example.com',
                    content: 'Test content',
                },
            },
            mockContext
        )

        expect(mockAgent.generate).toHaveBeenCalled()
        expect(result).toEqual({
            isRelevant: true,
            reason: 'Generated response',
        })
    })

    it('should create tracing span with correct metadata', async () => {
        const mockAgent = {
            stream: vi.fn().mockResolvedValue({
                text: '{"isRelevant": false, "reason": "Not relevant"}',
                fullStream: {
                    pipeTo: vi.fn().mockResolvedValue(undefined),
                },
            }),
        }

        const mockContext = {
            writer: { custom: vi.fn().mockResolvedValue(undefined) },
            abortSignal: { aborted: false },
            mastra: { getAgent: vi.fn().mockReturnValue(mockAgent) },
            requestContext: {} as any,
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

        await (evaluateResultTool as any).execute(
            {
                query: 'machine learning',
                result: {
                    title: 'ML Tutorial',
                    url: 'https://ml.com',
                    content: 'Learn ML',
                },
            },
            mockContext
        )

        expect(
            mockContext.tracingContext.currentSpan.createChildSpan
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'tool_call',
                name: 'evaluate_result',
                metadata: expect.objectContaining({
                    'tool.id': 'evaluate-result',
                    query: 'machine learning',
                }),
            })
        )
    })

    it('should emit progress events during execution', async () => {
        const mockAgent = {
            stream: vi.fn().mockResolvedValue({
                text: '{"isRelevant": true, "reason": "Test"}',
                fullStream: {
                    pipeTo: vi.fn().mockResolvedValue(undefined),
                },
            }),
        }

        const customMock = vi.fn().mockResolvedValue(undefined)
        const mockContext = {
            writer: { custom: customMock },
            abortSignal: { aborted: false },
            mastra: { getAgent: vi.fn().mockReturnValue(mockAgent) },
            requestContext: {} as any,
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

        await (evaluateResultTool as any).execute(
            {
                query: 'test',
                result: {
                    title: 'Test',
                    url: 'https://test.com',
                    content: 'Test',
                },
            },
            mockContext
        )

        expect(customMock).toHaveBeenCalled()
        const calls = customMock.mock.calls
        const progressEvents = calls.filter(
            (call: any[]) => call[0]?.type === 'data-tool-progress'
        )
        expect(progressEvents.length).toBeGreaterThanOrEqual(2)
    })

    it('should truncate long content in agent prompt', async () => {
        const longContent = 'a'.repeat(1000)
        let capturedPrompt = ''

        const mockAgent = {
            stream: undefined,
            generate: vi.fn().mockImplementation((prompt: string) => {
                capturedPrompt = prompt
                return Promise.resolve({
                    text: '{"isRelevant": true, "reason": "Test"}',
                })
            }),
        }

        const mockContext = {
            writer: { custom: vi.fn().mockResolvedValue(undefined) },
            abortSignal: { aborted: false },
            mastra: { getAgent: vi.fn().mockReturnValue(mockAgent) },
            requestContext: {} as any,
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

        await (evaluateResultTool as any).execute(
            {
                query: 'test',
                result: {
                    title: 'Test',
                    url: 'https://test.com',
                    content: longContent,
                },
            },
            mockContext
        )

        expect(mockAgent.generate).toHaveBeenCalled()
        expect(capturedPrompt).toContain('a'.repeat(500) + '...')
        expect(capturedPrompt).not.toContain(longContent)
    })
})
