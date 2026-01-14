import { createStep, createWorkflow } from '@mastra/core/workflows'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import { z } from 'zod'

import { logError, logStepEnd, logStepStart } from '../config/logger'

// Stream-first approach: inline JSON parsing is performed where needed in step code.
// We removed the centralized `parseAgentResponse` helper; streaming parsers are now done inline
// in each step to ensure consistent behavior with `agent.stream(...)` and `stream.text`.

const sourceSchema = z.object({
    type: z.enum(['url', 'path', 'content']),
    value: z.string(),
})

const documentInputSchema = z.object({
    source: sourceSchema.describe('Document source'),
    chunkStrategy: z
        .enum(['paragraph', 'sentence', 'recursive', 'markdown', 'semantic'])
        .default('recursive'),
    indexName: z.string().default('documents'),
    chunkSize: z.number().default(512),
    chunkOverlap: z.number().default(50),
})

const loadedContentSchema = z.object({
    source: sourceSchema,
    content: z.string(),
    contentType: z.enum(['pdf', 'text', 'markdown', 'html']),
    metadata: z.object({
        title: z.string().optional(),
        author: z.string().optional(),
        pageCount: z.number().optional(),
        wordCount: z.number().optional(),
        sourceUrl: z.string().optional(),
    }),
    settings: z.object({
        chunkStrategy: z.string(),
        indexName: z.string(),
        chunkSize: z.number(),
        chunkOverlap: z.number(),
    }),
})

const markdownContentSchema = z.object({
    content: z.string(),
    contentType: z.literal('markdown'),
    metadata: z.object({
        title: z.string().optional(),
        author: z.string().optional(),
        pageCount: z.number().optional(),
        wordCount: z.number().optional(),
        sourceUrl: z.string().optional(),
        convertedFrom: z.string().optional(),
    }),
    settings: z.object({
        chunkStrategy: z.string(),
        indexName: z.string(),
        chunkSize: z.number(),
        chunkOverlap: z.number(),
    }),
})

const chunkSchema = z.object({
    id: z.string(),
    content: z.string(),
    metadata: z.object({
        chunkIndex: z.number(),
        startOffset: z.number().optional(),
        endOffset: z.number().optional(),
        headings: z.array(z.string()).optional(),
        summary: z.string().optional(),
        keywords: z.array(z.string()).optional(),
    }),
})

const chunkedContentSchema = z.object({
    chunks: z.array(chunkSchema),
    totalChunks: z.number(),
    metadata: z.object({
        title: z.string().optional(),
        author: z.string().optional(),
        sourceUrl: z.string().optional(),
        chunkStrategy: z.string(),
        avgChunkSize: z.number(),
    }),
    settings: z.object({
        indexName: z.string(),
    }),
})

const indexedDocumentSchema = z.object({
    documentId: z.string(),
    chunksCount: z.number(),
    indexed: z.boolean(),
    indexName: z.string(),
    summary: z.string(),
    metadata: z.object({
        title: z.string().optional(),
        author: z.string().optional(),
        sourceUrl: z.string().optional(),
        processedAt: z.string(),
        vectorIds: z.array(z.string()).optional(),
    }),
})

const loadDocumentStep = createStep({
    id: 'load-document',
    description: 'Loads document from URL, path, or content',
    inputSchema: documentInputSchema,
    outputSchema: loadedContentSchema,
    retries: 2,
    execute: async ({ inputData, writer, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'load-document',
            input: inputData,
            metadata: {
                'workflow.step': 'load-document',
                'source.type': inputData.source.type,
            },
            requestContext,
            mastra,
        })
        const startTime = Date.now()
        logStepStart('load-document', { sourceType: inputData.source.type })

        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Loading document from ${inputData.source.type}...`,
                    stage: 'documentProcessingAgent',
                },
                id: 'load-document',
            })

            let content = ''
            let contentType: 'pdf' | 'text' | 'markdown' | 'html' = 'text'

            switch (inputData.source.type) {
                case 'url': {
                    const response = await fetch(inputData.source.value)
                    const contentTypeHeader =
                        response.headers.get('content-type') ?? ''

                    if (contentTypeHeader.includes('application/pdf')) {
                        contentType = 'pdf'
                        content = inputData.source.value
                    } else if (contentTypeHeader.includes('text/html')) {
                        contentType = 'html'
                        content = await response.text()
                    } else if (contentTypeHeader.includes('text/markdown')) {
                        contentType = 'markdown'
                        content = await response.text()
                    } else {
                        content = await response.text()
                    }
                    break
                }
                case 'path': {
                    const path = inputData.source.value.toLowerCase()
                    if (path.endsWith('.pdf')) {
                        contentType = 'pdf'
                        content = inputData.source.value
                    } else if (path.endsWith('.md')) {
                        contentType = 'markdown'
                        const fs = await import('node:fs/promises')
                        content = await fs.readFile(
                            inputData.source.value,
                            'utf-8'
                        )
                    } else if (
                        path.endsWith('.html') ||
                        path.endsWith('.htm')
                    ) {
                        contentType = 'html'
                        const fs = await import('node:fs/promises')
                        content = await fs.readFile(
                            inputData.source.value,
                            'utf-8'
                        )
                    } else {
                        const fs = await import('node:fs/promises')
                        content = await fs.readFile(
                            inputData.source.value,
                            'utf-8'
                        )
                    }
                    break
                }
                case 'content': {
                    content = inputData.source.value
                    if (content.startsWith('%PDF')) {
                        contentType = 'pdf'
                    } else if (
                        content.includes('<!DOCTYPE html>') ||
                        content.includes('<html')
                    ) {
                        contentType = 'html'
                    } else if (
                        content.includes('# ') ||
                        content.includes('## ')
                    ) {
                        contentType = 'markdown'
                    }
                    break
                }
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Document loaded, detecting type for ${inputData.source.value}...`,
                    stage: 'load-document',
                },
                id: 'load-document',
            })

            const wordCount = content.split(/\s+/).length

            const result: z.infer<typeof loadedContentSchema> = {
                source: inputData.source,
                content,
                contentType,
                metadata: {
                    wordCount,
                    sourceUrl:
                        inputData.source.type === 'url'
                            ? inputData.source.value
                            : undefined,
                },
                settings: {
                    chunkStrategy: inputData.chunkStrategy,
                    indexName: inputData.indexName,
                    chunkSize: inputData.chunkSize,
                    chunkOverlap: inputData.chunkOverlap,
                },
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Document loaded successfully: ${contentType} (${wordCount} words)`,
                    stage: 'load-document',
                },
                id: 'load-document',
            })

            logStepEnd(
                'load-document',
                { contentType, wordCount },
                Date.now() - startTime
            )

            span?.update({
                output: result,
                metadata: {
                    'content.type': contentType,
                    'word.count': wordCount,
                },
            })
            span?.end()

            return result
        } catch (error) {
            logError('load-document', error, { source: inputData.source })
            span?.error({
                error:
                    error instanceof Error ? error : new Error(String(error)),
                endSpan: true,
            })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    stage: 'load-document',
                },
                id: 'load-document',
            })

            throw error
        }
    },
})

const convertPdfToMarkdownStep = createStep({
    id: 'convert-pdf-to-markdown',
    description: 'Converts PDF content to markdown format',
    inputSchema: loadedContentSchema,
    outputSchema: markdownContentSchema,
    retries: 2,
    execute: async ({ inputData, mastra, writer, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'convert-pdf-to-markdown',
            input: { contentType: inputData.contentType },
            metadata: {
                'workflow.step': 'convert-pdf-to-markdown',
            },
            requestContext,
            mastra,
        })
        const startTime = Date.now()
        logStepStart('convert-pdf-to-markdown', {
            contentType: inputData.contentType,
        })

        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Converting PDF to markdown for ${inputData.source.value}...`,
                    stage: 'convert-pdf-to-markdown',
                },
                id: 'convert-pdf-to-markdown',
            })

            let markdownContent = inputData.content
            let pageCount: number | undefined

            const agent = mastra?.getAgent?.('documentProcessingAgent')
            if (inputData.contentType === 'pdf') {
                if (agent !== undefined && agent !== null) {
                    const stream = await agent.stream(
                        `Convert the PDF at "${inputData.content}" to markdown format. Extract all text content while preserving structure.`,
                        {
                            output: z.object({
                                markdown: z.string(),
                                pageCount: z.number().optional(),
                            }),
                        } as any
                    )
                    // Pipe partial text deltas to the workflow writer (if present)
                    if (writer !== undefined && writer !== null) {
                        await stream.textStream?.pipeTo?.(
                            writer as unknown as WritableStream
                        )
                    }
                    // Wait for final aggregated text and attempt to parse JSON
                    const finalText = await stream.text
                    let parsed: {
                        markdown: string
                        pageCount?: number
                    } | null = null
                    try {
                        parsed = JSON.parse(finalText) as {
                            markdown: string
                            pageCount?: number
                        }
                    } catch {
                        parsed = null
                    }
                    if (parsed !== null) {
                        markdownContent = parsed.markdown
                        pageCount = parsed.pageCount
                    } else {
                        // Preserve fallback behavior if parsing fails
                        markdownContent = `# Document\n\nPDF content from: ${inputData.content}\n\n(PDF parsing requires documentProcessingAgent)`
                    }
                } else {
                    markdownContent = `# Document\n\nPDF content from: ${inputData.content}\n\n(PDF parsing requires documentProcessingAgent)`
                }
            } else if (inputData.contentType === 'html') {
                markdownContent = inputData.content
                    .replace(
                        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                        ''
                    )
                    .replace(
                        /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
                        ''
                    )
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Markdown conversion complete for ${inputData.source.value}...`,
                    stage: 'convert-pdf-to-markdown',
                },
                id: 'convert-pdf-to-markdown',
            })

            const result: z.infer<typeof markdownContentSchema> = {
                content: markdownContent,
                contentType: 'markdown',
                metadata: {
                    ...inputData.metadata,
                    pageCount,
                    wordCount: markdownContent.split(/\s+/).length,
                    convertedFrom: inputData.contentType,
                },
                settings: inputData.settings,
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `PDF converted to markdown successfully for ${inputData.source.value} (${result.metadata.wordCount} words)`,
                    stage: 'convert-pdf-to-markdown',
                },
                id: 'convert-pdf-to-markdown',
            })

            logStepEnd(
                'convert-pdf-to-markdown',
                { wordCount: result.metadata.wordCount },
                Date.now() - startTime
            )

            span?.update({
                output: result,
                metadata: {
                    'word.count': result.metadata.wordCount ?? 0,
                    'converted.from': inputData.contentType,
                },
            })
            span?.end()

            return result
        } catch (error) {
            logError('convert-pdf-to-markdown', error, {
                contentType: inputData.contentType,
            })
            span?.error({
                error:
                    error instanceof Error ? error : new Error(String(error)),
                endSpan: true,
            })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error',
                    stage: 'convert-pdf-to-markdown',
                },
                id: 'convert-pdf-to-markdown',
            })

            throw error
        }
    },
})

const passTextThroughStep = createStep({
    id: 'pass-text-through',
    description: 'Passes text/markdown content through without conversion',
    inputSchema: loadedContentSchema,
    outputSchema: markdownContentSchema,
    execute: async ({ inputData, writer, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'pass-text-through',
            input: { contentType: inputData.contentType },
            metadata: {
                'workflow.step': 'pass-text-through',
            },
            requestContext,
            mastra,
        })
        const startTime = Date.now()

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Processing text content ${startTime}, ${inputData.content.slice(0, 50)}...`,
                stage: 'pass-text-through',
            },
            id: 'pass-text-through',
        })

        const result: z.infer<typeof markdownContentSchema> = {
            content: inputData.content,
            contentType: 'markdown',
            metadata: {
                ...inputData.metadata,
                convertedFrom: inputData.contentType,
            },
            settings: inputData.settings,
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done', // must be "done" for the UI to show the step as completed
                message: `Text passed through successfully`,
                stage: 'pass-text-through',
            },
            id: 'pass-text-through',
        })

        span?.update({ output: result })
        span?.end()

        return result
    },
})

const chunkDocumentStep = createStep({
    id: 'chunk-document',
    description: 'Chunks document for RAG using configured strategy',
    inputSchema: markdownContentSchema,
    outputSchema: chunkedContentSchema,
    execute: async ({ inputData, writer, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'chunk-document',
            input: {
                strategy: inputData.settings.chunkStrategy,
                contentLength: inputData.content.length,
            },
            metadata: {
                'workflow.step': 'chunk-document',
                'chunk.strategy': inputData.settings.chunkStrategy,
            },
            requestContext,
            mastra,
        })
        const startTime = Date.now()
        logStepStart('chunk-document', {
            strategy: inputData.settings.chunkStrategy,
        })

        try {
            const { chunkSize, chunkOverlap, chunkStrategy } =
                inputData.settings
            const { content } = inputData

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Chunking with ${chunkStrategy} strategy...`,
                    stage: 'chunk-document',
                },
                id: 'chunk-document',
            })

            const chunks: Array<z.infer<typeof chunkSchema>> = []
            let position = 0
            let chunkIndex = 0

            if (
                chunkStrategy === 'paragraph' ||
                chunkStrategy === 'recursive'
            ) {
                const paragraphs = content.split(/\n\n+/)
                let currentChunk = ''
                let startOffset = 0

                for (const paragraph of paragraphs) {
                    if (
                        currentChunk.length + paragraph.length > chunkSize &&
                        currentChunk.length > 0
                    ) {
                        chunks.push({
                            id: `chunk-${chunkIndex}`,
                            content: currentChunk.trim(),
                            metadata: {
                                chunkIndex,
                                startOffset,
                                endOffset: position,
                            },
                        })
                        chunkIndex++

                        const overlapStart = Math.max(
                            0,
                            currentChunk.length - chunkOverlap
                        )
                        currentChunk =
                            currentChunk.slice(overlapStart) +
                            '\n\n' +
                            paragraph
                        startOffset =
                            position -
                            (currentChunk.length - paragraph.length - 2)
                    } else {
                        currentChunk += (currentChunk ? '\n\n' : '') + paragraph
                    }
                    position += paragraph.length + 2

                    if (chunkIndex % 10 === 0) {
                        await writer?.custom({
                            type: 'data-tool-progress',
                            data: {
                                status: 'in-progress',
                                message: `Processed ${chunkIndex} chunks...`,
                                stage: 'chunk-document',
                            },
                            id: 'chunk-document',
                        })
                    }
                }

                if (currentChunk.trim()) {
                    chunks.push({
                        id: `chunk-${chunkIndex}`,
                        content: currentChunk.trim(),
                        metadata: {
                            chunkIndex,
                            startOffset,
                            endOffset: position,
                        },
                    })
                }
            } else if (chunkStrategy === 'sentence') {
                const sentences = content.match(/[^.!?]+[.!?]+/g) ?? [content]
                let currentChunk = ''
                let startOffset = 0

                for (const sentence of sentences) {
                    if (
                        currentChunk.length + sentence.length > chunkSize &&
                        currentChunk.length > 0
                    ) {
                        chunks.push({
                            id: `chunk-${chunkIndex}`,
                            content: currentChunk.trim(),
                            metadata: {
                                chunkIndex,
                                startOffset,
                                endOffset: position,
                            },
                        })
                        chunkIndex++
                        currentChunk = sentence
                        startOffset = position
                    } else {
                        currentChunk += sentence
                    }
                    position += sentence.length
                }

                if (currentChunk.trim()) {
                    chunks.push({
                        id: `chunk-${chunkIndex}`,
                        content: currentChunk.trim(),
                        metadata: {
                            chunkIndex,
                            startOffset,
                            endOffset: position,
                        },
                    })
                }
            } else {
                while (position < content.length) {
                    const end = Math.min(position + chunkSize, content.length)
                    chunks.push({
                        id: `chunk-${chunkIndex}`,
                        content: content.slice(position, end),
                        metadata: {
                            chunkIndex,
                            startOffset: position,
                            endOffset: end,
                        },
                    })
                    chunkIndex++
                    position = end - chunkOverlap
                    if (position >= content.length) {
                        break
                    }
                }
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Created ${chunks.length} chunks (90%)...`,
                    stage: 'chunk-document',
                },
                id: 'chunk-document',
            })

            const avgChunkSize =
                chunks.length > 0
                    ? chunks.reduce((sum, c) => sum + c.content.length, 0) /
                      chunks.length
                    : 0

            const result: z.infer<typeof chunkedContentSchema> = {
                chunks,
                totalChunks: chunks.length,
                metadata: {
                    title: inputData.metadata.title,
                    author: inputData.metadata.author,
                    sourceUrl: inputData.metadata.sourceUrl,
                    chunkStrategy,
                    avgChunkSize: Math.round(avgChunkSize),
                },
                settings: { indexName: inputData.settings.indexName },
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Document chunked successfully: ${inputData.content.length} chunks created`,
                    stage: 'chunk-document',
                },
                id: 'chunk-document',
            })

            logStepEnd(
                'chunk-document',
                {
                    totalChunks: chunks.length,
                    avgChunkSize: Math.round(avgChunkSize),
                },
                Date.now() - startTime
            )

            span?.update({
                output: result,
                metadata: {
                    'total.chunks': chunks.length,
                    'avg.chunk.size': Math.round(avgChunkSize),
                },
            })
            span?.end()

            return result
        } catch (error) {
            logError('chunk-document', error, {
                strategy: inputData.settings.chunkStrategy,
            })
            span?.error({
                error:
                    error instanceof Error ? error : new Error(String(error)),
                endSpan: true,
            })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error',
                    stage: 'chunk-document',
                },
                id: 'chunk-document',
            })

            throw error
        }
    },
})

const indexChunksStep = createStep({
    id: 'index-chunks',
    description: 'Indexes chunks into vector store',
    inputSchema: chunkedContentSchema,
    outputSchema: indexedDocumentSchema,
    execute: async ({ inputData, mastra, writer, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'index-chunks',
            input: {
                totalChunks: inputData.totalChunks,
                indexName: inputData.settings.indexName,
            },
            metadata: {
                'workflow.step': 'index-chunks',
                'index.name': inputData.settings.indexName,
            },
            requestContext,
            mastra,
        })
        const startTime = Date.now()
        logStepStart('index-chunks', { totalChunks: inputData.totalChunks })

        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Indexing ${inputData.totalChunks} chunks...`,
                    stage: 'index-chunks',
                },
                id: 'index-chunks',
            })

            const documentId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
            const vectorIds: string[] = []

            const agent = mastra?.getAgent?.('knowledgeIndexingAgent')
            if (agent !== undefined && agent !== null) {
                for (let i = 0; i < inputData.chunks.length; i++) {
                    vectorIds.push(`vec-${documentId}-${i}`)

                    if (i % 5 === 0) {
                        await writer?.custom({
                            type: 'data-tool-progress',
                            data: {
                                status: 'in-progress',
                                message: `Indexed ${i + 1}/${inputData.chunks.length} chunks...`,
                                stage: 'index-chunks',
                            },
                            id: 'index-chunks',
                        })
                    }
                }
            } else {
                inputData.chunks.forEach((_, i) => {
                    vectorIds.push(`vec-${documentId}-${i}`)
                })
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Indexing ${inputData.totalChunks} chunks...`,
                    stage: 'index-chunks',
                },
                id: 'index-chunks',
            })

            const sampleContent = inputData.chunks
                .slice(0, 3)
                .map((c) => c.content)
                .join(' ')
                .slice(0, 500)
            const summary = `Document indexed with ${inputData.totalChunks} chunks. Preview: ${sampleContent}...`

            const result: z.infer<typeof indexedDocumentSchema> = {
                documentId,
                chunksCount: inputData.totalChunks,
                indexed: true,
                indexName: inputData.settings.indexName,
                summary,
                metadata: {
                    title: inputData.metadata.title,
                    author: inputData.metadata.author,
                    sourceUrl: inputData.metadata.sourceUrl,
                    processedAt: new Date().toISOString(),
                    vectorIds,
                },
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Chunks indexed successfully: ${inputData.totalChunks} chunks indexed`,
                    stage: 'index-chunks',
                },
                id: 'index-chunks',
            })

            logStepEnd(
                'index-chunks',
                { documentId, chunksCount: inputData.totalChunks },
                Date.now() - startTime
            )

            span?.update({
                output: result,
                metadata: {
                    'document.id': documentId,
                    'chunks.count': inputData.totalChunks,
                },
            })
            span?.end()

            return result
        } catch (error) {
            logError('index-chunks', error, {
                totalChunks: inputData.totalChunks,
            })
            span?.error({
                error:
                    error instanceof Error ? error : new Error(String(error)),
                endSpan: true,
            })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    stage: 'index-chunks',
                },
                id: 'index-chunks',
            })

            throw error
        }
    },
})

export const documentProcessingWorkflow = createWorkflow({
    id: 'documentProcessingWorkflow',
    description:
        'Full document ingestion pipeline with conditional PDF handling using .branch()',
    inputSchema: documentInputSchema,
    outputSchema: indexedDocumentSchema,
})
    .then(loadDocumentStep)
    .branch([
        [
            async ({
                inputData,
            }: {
                inputData: z.infer<typeof loadedContentSchema>
            }) =>
                inputData.contentType === 'pdf' ||
                inputData.contentType === 'html',
            convertPdfToMarkdownStep,
        ],
        [
            async ({
                inputData,
            }: {
                inputData: z.infer<typeof loadedContentSchema>
            }) =>
                inputData.contentType === 'text' ||
                inputData.contentType === 'markdown',
            passTextThroughStep,
        ],
    ])
    .then(chunkDocumentStep)
    .then(indexChunksStep)

documentProcessingWorkflow.commit()
