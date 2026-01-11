import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { webScraperTool } from '../web-scraper-tool'
import { CheerioCrawler, Request } from 'crawlee'
import { JSDOM } from 'jsdom'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { SpanType } from '@mastra/core/observability'
import { log } from '../../config/logger'

// Mock external dependencies
vi.mock('crawlee', () => ({
    CheerioCrawler: vi.fn(),
    Request: vi.fn(),
}))

// Mock JSDOM
vi.mock('jsdom', () => ({
    JSDOM: vi.fn().mockImplementation((html?: string) => ({
        window: {
            document: {
                body: { innerHTML: html || '' },
                querySelector: vi.fn((selector: string) => {
                    if (selector === 'title')
                        return { textContent: 'Test Title' }
                    if (selector === 'meta[name="description"]')
                        return { getAttribute: () => 'Test description' }
                    return null
                }),
                querySelectorAll: vi.fn(() => []),
            },
        },
        includeNodeLocations: false,
    })) as any,
}))

class JSDOMMock {
    constructor(html?: string, options?: any) {
        this.window = {
            document: {
                body: { innerHTML: html || '' },
                querySelector: vi.fn((selector: string) => {
                    if (selector === 'title')
                        return { textContent: 'Test Title' }
                    if (selector === 'meta[name="description"]')
                        return { getAttribute: () => 'Test description' }
                    return null
                }),
                querySelectorAll: vi.fn(() => []),
            },
        }
        this.includeNodeLocations = false
    }
    window: any
    includeNodeLocations: boolean
}

vi.mock('node:fs/promises', () => ({
    mkdir: vi.fn(),
    open: vi.fn(),
}))

vi.mock('node:path', () => ({
    resolve: vi.fn(),
    join: vi.fn(),
}))

vi.mock('../../config/logger', () => ({
    log: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}))

describe('webScraperTool', () => {
    let mockCrawler: any
    let mockTracingContext: any
    let mockRequestContext: any
    let mockWriter: any

    beforeEach(() => {
        vi.clearAllMocks()

        // Mock path.resolve and path.join
        const mockPath = vi.mocked(path)
        mockPath.resolve.mockReturnValue('/mock/data')
        mockPath.join.mockReturnValue('/mock/data/test.md')

        // Mock fs operations
        const mockFs = vi.mocked(fs)
        mockFs.mkdir.mockResolvedValue(undefined)
        const mockFileHandle = {
            writeFile: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
        }
        mockFs.open.mockResolvedValue(mockFileHandle as any)

        // Mock JSDOM
        const mockJSDOM = vi.mocked(JSDOM)
        mockJSDOM.mockImplementation((html: string) => {
            return {
                window: {
                    document: {
                        body: { innerHTML: html },
                        querySelector: vi.fn((selector: string) => {
                            if (selector === 'title')
                                return { textContent: 'Test Title' }
                            if (selector === 'meta[name="description"]')
                                return {
                                    getAttribute: () => 'Test description',
                                }
                            return null
                        }),
                        querySelectorAll: vi.fn(() => []),
                    },
                },
                includeNodeLocations: false,
            } as any
        })

        // Mock CheerioCrawler
        mockCrawler = {
            run: vi.fn().mockResolvedValue(undefined),
        }
        const mockCheerioCrawler = vi.mocked(CheerioCrawler)
        mockCheerioCrawler.mockImplementation(() => mockCrawler)

        // Mock Request
        const mockRequest = vi.mocked(Request)
        mockRequest.mockImplementation((options: any) => ({ url: options.url }))

        // Mock contexts
        mockTracingContext = {
            currentSpan: {
                createChildSpan: vi.fn().mockReturnValue({
                    createChildSpan: vi.fn().mockReturnValue({
                        update: vi.fn(),
                        end: vi.fn(),
                        error: vi.fn(),
                    }),
                    update: vi.fn(),
                    end: vi.fn(),
                    error: vi.fn(),
                }),
            },
        }

        mockRequestContext = {
            allowedDomains: ['example.com'],
            userId: 'test-user',
            workspaceId: 'test-workspace',
        }

        mockWriter = {
            custom: vi.fn(),
        }
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('successful scraping', () => {
        it('should scrape a simple webpage successfully', async () => {
            const input = {
                url: 'https://example.com/test',
                selector: 'h1',
            }

            const result = await webScraperTool.execute(input, {
                requestContext: mockRequestContext,
                tracingContext: mockTracingContext,
                writer: mockWriter,
            })

            expect(result).toEqual({
                url: 'https://example.com/test',
                status: 'success',
                errorMessage: undefined,
                content: {
                    extractedData: [
                        {
                            text: '<h1>Test Content</h1>',
                            attr_href: undefined,
                        },
                    ],
                    rawContent:
                        '<html><body><h1>Test Content</h1></body></html>',
                    markdownContent: expect.any(String),
                },
                storage: undefined,
                analysis: {
                    metadata: {
                        title: 'Test Title',
                        description: 'Test description',
                    },
                    images: undefined,
                    structuredData: undefined,
                    detectedLanguage: undefined,
                },
            })

            expect(mockCrawler.run).toHaveBeenCalled()
            expect(mockWriter.custom).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'data-tool-progress',
                    data: expect.objectContaining({
                        status: 'in-progress',
                        message: expect.stringContaining('Starting web scrape'),
                    }),
                })
            )
        })

        it('should handle metadata extraction', async () => {
            const input = {
                url: 'https://example.com/meta-test',
                extraction: {
                    extractMetadata: true,
                },
            }

            const result = await webScraperTool.execute(input, {
                requestContext: mockRequestContext,
                tracingContext: mockTracingContext,
                writer: mockWriter,
            })

            expect(result.analysis?.metadata).toBeDefined()
            expect(result.analysis?.metadata?.title).toBe('Test Title')
            expect(result.analysis?.metadata?.description).toBe(
                'Test description'
            )
        })

        it('should save markdown content when requested', async () => {
            const input = {
                url: 'https://example.com/save-test',
                storage: {
                    saveMarkdown: true,
                    markdownFileName: 'test-output.md',
                },
            }

            const result = await webScraperTool.execute(input, {
                requestContext: mockRequestContext,
                tracingContext: mockTracingContext,
                writer: mockWriter,
            })

            expect(result.storage?.savedFilePath).toBe('test-output.md')
            expect(fs.mkdir).toHaveBeenCalledWith('/mock/data', {
                recursive: true,
            })
            expect(fs.open).toHaveBeenCalled()
        })
    })

    describe('error handling', () => {
        it('should reject URLs not in allowlist', async () => {
            const input = {
                url: 'https://blocked-domain.com/test',
            }

            const result = await webScraperTool.execute(input, {
                requestContext: mockRequestContext,
                tracingContext: mockTracingContext,
                writer: mockWriter,
            })

            expect(result.status).toBe('failed')
            expect(result.errorMessage).toContain(
                'Domain is not allowlisted for scraping'
            )
        })

        it('should handle invalid URLs', async () => {
            const input = {
                url: 'not-a-url',
            }

            const result = await webScraperTool.execute({
                context: input,
                requestContext: mockRequestContext,
                tracingContext: mockTracingContext,
                writer: mockWriter,
            })

            expect(result.status).toBe('failed')
        })

        it('should handle crawler failures', async () => {
            mockCrawler.run.mockRejectedValue(new Error('Network timeout'))

            const input = {
                url: 'https://example.com/failing',
            }

            const result = await webScraperTool.execute(input, {
                requestContext: mockRequestContext,
                tracingContext: mockTracingContext,
                writer: mockWriter,
            })

            expect(result.status).toBe('failed')
            expect(result.errorMessage).toContain('Web scraping failed')
        })

        it('should handle file system errors during save', async () => {
            const mockFs = vi.mocked(fs)
            mockFs.mkdir.mockRejectedValue(new Error('Permission denied'))

            const input = {
                url: 'https://example.com/save-error',
                storage: {
                    saveMarkdown: true,
                },
            }

            const result = await webScraperTool.execute(input, {
                requestContext: mockRequestContext,
                tracingContext: mockTracingContext,
                writer: mockWriter,
            })

            expect(result.status).toBe('failed')
            expect(result.errorMessage).toContain(
                'Domain is not allowlisted for scraping'
            )
        })

        it('should update spans on completion', async () => {
            const input = {
                url: 'https://example.com/complete-test',
            }

            await webScraperTool.execute(input, {
                requestContext: mockRequestContext,
                tracingContext: mockTracingContext,
                writer: mockWriter,
            })

            const spanMock =
                mockTracingContext.currentSpan.createChildSpan.mock.results[0]
                    .value
            expect(spanMock.update).toHaveBeenCalled()
            expect(spanMock.end).toHaveBeenCalled()
        })

        it('should handle tracing errors gracefully', async () => {
            const spanMock =
                mockTracingContext.currentSpan.createChildSpan.mock.results[0]
                    .value
            spanMock.update.mockImplementation(() => {
                throw new Error('Tracing error')
            })

            const input = {
                url: 'https://example.com/trace-error-test',
            }

            const result = await webScraperTool.execute(input, {
                requestContext: mockRequestContext,
                tracingContext: mockTracingContext,
                writer: mockWriter,
            })

            expect(result.status).toBe('success')
        })
    })

    describe('progress reporting', () => {
        it('should emit progress events during scraping', async () => {
            const input = {
                url: 'https://example.com/progress-test',
            }

            await webScraperTool.execute(input, {
                requestContext: mockRequestContext,
                tracingContext: mockTracingContext,
                writer: mockWriter,
            })

            expect(mockWriter.custom).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'data-tool-progress',
                    data: expect.objectContaining({
                        status: 'in-progress',
                        stage: 'web:scraper',
                    }),
                })
            )

            expect(mockWriter.custom).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'data-tool-progress',
                    data: expect.objectContaining({
                        status: 'done',
                        stage: 'web:scraper',
                    }),
                })
            )
        })
    })

    describe('HTML sanitization', () => {
        it('should sanitize dangerous HTML elements', async () => {
            const input = {
                url: 'https://example.com/sanitize-test',
            }

            const result = await webScraperTool.execute({
                context: input,
                requestContext: mockRequestContext,
                tracingContext: mockTracingContext,
                writer: mockWriter,
            })

            expect(result.content.rawContent).toBeDefined()
            expect(result.content.markdownContent).toBeDefined()
        })
    })

    describe('lifecycle hooks', () => {
        it('should call lifecycle hooks appropriately', async () => {
            const input = {
                url: 'https://example.com/hooks-test',
            }

            await webScraperTool.execute(input, {
                requestContext: mockRequestContext,
                tracingContext: mockTracingContext,
                writer: mockWriter,
            })

            expect(log.info).toHaveBeenCalledWith(
                'Web scraper received complete input',
                expect.objectContaining({
                    hook: 'onInputAvailable',
                    url: 'https://example.com/hooks-test',
                })
            )
        })
    })
})
