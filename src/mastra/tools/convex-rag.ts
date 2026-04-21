import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import type { TracingContext } from '@mastra/core/observability'
import type {
    InferToolInput,
    InferToolOutput,
    InferUITool,
} from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { createGraphRAGTool, createVectorQueryTool, MDocument, rerank } from '@mastra/rag'
import { randomUUID } from 'crypto'
import { fastembed } from '@mastra/fastembed'
import {
    ModelRouterEmbeddingModel,
    ModelRouterLanguageModel,
} from '@mastra/core/llm'
import { embed, embedMany } from 'ai'
import { z } from 'zod'
import {
    log,
    logError,
    logStepEnd,
    logStepStart,
    logToolExecution,
} from '../config/logger'
import { convexVector } from '../config/convex'
import type { RequestContext } from '@mastra/core/request-context'
import { resolveAbortSignal } from './abort-signal.utils'

log.info('Initializing Convex RAG Tools...')

type ConvexJsonPrimitive = string | number | boolean | null
type ConvexJsonValue =
    | ConvexJsonPrimitive
    | ConvexJsonObject
    | ConvexJsonValue[]

interface ConvexJsonObject {
    [key: string]: ConvexJsonValue
}

const convexJsonValueSchema: z.ZodType<ConvexJsonValue> = z.lazy(() =>
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(convexJsonValueSchema),
        z.record(z.string(), convexJsonValueSchema),
    ])
)

const CONVEX_EMBEDDING_DIMENSION = 1024
const CONVEX_INDEX_NAME = `memory_messages_${CONVEX_EMBEDDING_DIMENSION}`

await convexVector.createIndex({
    indexName: CONVEX_INDEX_NAME,
    dimension: CONVEX_EMBEDDING_DIMENSION,
}).catch((error) => {
    log.info('Convex vector index already exists or createIndex failed', {
        indexName: CONVEX_INDEX_NAME,
        error: error instanceof Error ? error.message : String(error),
    })
})

function sanitizeMetadata(m: ConvexJsonObject): ConvexJsonObject {
    const out: ConvexJsonObject = {}
    const keys = Object.keys(m)
    for (const k of keys) {
        if (k.startsWith('$') || k.includes('.')) {
            continue
        }
        out[k] = m[k]
    }
    return out
}

export function normalizeWeights(
    semantic: number,
    vector: number,
    position: number
) {
    const sum = semantic + vector + position
    if (sum <= 0) {
        return { semantic: 0.5, vector: 0.3, position: 0.2 }
    }
    return {
        semantic: semantic / sum,
        vector: vector / sum,
        position: position / sum,
    }
}

export interface ConvexDocumentChunkingContext extends RequestContext {
    userId?: string
    chunkStrategy?: string
}

const ConvexDocumentChunkingInputSchema = z.object({
    documentContent: z.string().min(1, 'Document content cannot be empty'),
    documentMetadata: z.record(z.string(), convexJsonValueSchema).optional().default({}),
    chunkingStrategy: z
        .enum([
            'recursive',
            'character',
            'token',
            'markdown',
            'semantic-markdown',
            'html',
            'json',
            'latex',
            'sentence',
        ])
        .default('recursive'),
    chunkSize: z.number().min(50).max(4000).default(512),
    chunkOverlap: z.number().min(0).max(500).default(50),
    chunkSeparator: z.string().default('\n'),
    indexName: z.string().default(CONVEX_INDEX_NAME),
    embeddingModel: z.string().default(fastembed.base),
    embeddingBatchSize: z.number().min(1).max(500).default(50),
    generateEmbeddings: z.boolean().default(true),
})

const ConvexDocumentChunkingOutputSchema = z.object({
    success: z.boolean(),
    chunkCount: z.number(),
    totalTextLength: z.number(),
    chunks: z.array(
        z.object({
            id: z.string(),
            text: z.string(),
            metadata: z.record(z.string(), convexJsonValueSchema),
            embeddingGenerated: z.boolean(),
        })
    ),
    processingTimeMs: z.number(),
})

const ConvexDocumentRerankerInputSchema = z.object({
    userQuery: z.string().min(1, 'Query cannot be empty'),
    indexName: z.string().default(CONVEX_INDEX_NAME),
    topK: z.number().min(1).max(50).default(10),
    initialTopK: z.number().min(1).max(100).default(20),
    semanticWeight: z.number().min(0).max(1).default(0.5),
    vectorWeight: z.number().min(0).max(1).default(0.3),
    positionWeight: z.number().min(0).max(1).default(0.2),
    filter: z.record(z.string(), convexJsonValueSchema).optional(),
    includeVector: z.boolean().default(false),
    rerankModel: z.string().default('google/gemini-3.1-flash-lite'),
})

const ConvexDocumentRerankerOutputSchema = z.object({
    success: z.boolean(),
    userQuery: z.string(),
    rerankedDocuments: z.array(
        z.object({
            id: z.string(),
            text: z.string(),
            metadata: z.record(z.string(), convexJsonValueSchema),
            relevanceScore: z.number(),
            rank: z.number(),
        })
    ),
    processingTimeMs: z.number(),
})

function buildChunkParams(
    strategy: string,
    maxSize: number,
    overlap: number
): ConvexJsonObject {
    const baseParams = {
        maxSize,
        overlap,
    }

    switch (strategy) {
        case 'recursive':
            return {
                strategy: 'recursive' as const,
                ...baseParams,
                separators: ['\n\n', '\n', ' '],
            }
        case 'character':
            return {
                strategy: 'character' as const,
                ...baseParams,
                separators: ['\n'],
                isSeparatorRegex: false,
            }
        case 'markdown':
            return {
                strategy: 'markdown' as const,
                ...baseParams,
                headers: [
                    ['#', 'title'],
                    ['##', 'section'],
                ] as Array<[string, string]>,
            }
        case 'html':
            return {
                strategy: 'html' as const,
                ...baseParams,
                headers: [
                    ['h1', 'title'],
                    ['h2', 'section'],
                ] as Array<[string, string]>,
            }
        case 'json':
            return {
                strategy: 'json' as const,
                ...baseParams,
            }
        case 'latex':
            return {
                strategy: 'latex' as const,
                ...baseParams,
            }
        case 'sentence':
            return {
                strategy: 'sentence' as const,
                ...baseParams,
                minSize: 50,
                sentenceEnders: ['.'],
            }
        case 'token':
            return {
                strategy: 'token' as const,
                ...baseParams,
            }
        case 'semantic-markdown':
            return {
                strategy: 'semantic-markdown' as const,
                ...baseParams,
                joinThreshold: 500,
            }
        default:
            return {
                strategy: 'recursive' as const,
                ...baseParams,
                separators: ['\n\n', '\n', ' '],
            }
    }
}

function resolveEmbeddingModel(modelName: string) {
    return new ModelRouterEmbeddingModel(modelName)
}

export const convexChunker = createTool({
    id: 'convex:chunker',
    description: `
Convex Document Chunker Tool

This tool processes document content and stores chunk embeddings in ConvexVector.

Features:
- Configurable chunking strategies
- Embedding generation using fastembed/base
- ConvexVector storage with metadata support
- Error handling and progress logging
`,
    inputSchema: ConvexDocumentChunkingInputSchema,
    outputSchema: ConvexDocumentChunkingOutputSchema,
    strict: true,
    onInputStart: ({ toolCallId, messages }) => {
        log.info('Convex chunker tool input streaming started', {
            toolCallId,
            messages,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages }) => {
        log.info('Convex chunker tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messages,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages }) => {
        log.info('Convex chunker received complete input', {
            toolCallId,
            documentLength: input.documentContent.length,
            chunkingStrategy: input.chunkingStrategy,
            generateEmbeddings: input.generateEmbeddings,
            messages,
            hook: 'onInputAvailable',
        })
    },
    execute: async (inputData, context) => {
        const writer = context.writer
        const abortSignal = context.abortSignal
        const tracingContext: TracingContext | undefined = context.tracingContext
        const chunkingStrategy = inputData.chunkingStrategy ?? 'recursive'
        const chunkSize = inputData.chunkSize ?? 512
        const chunkOverlap = inputData.chunkOverlap ?? 50
        const indexName = inputData.indexName ?? CONVEX_INDEX_NAME
        const embeddingModel = inputData.embeddingModel ?? fastembed.base
        const embeddingBatchSize = inputData.embeddingBatchSize ?? 50

        if (abortSignal?.aborted ?? false) {
            throw new Error('Convex chunker cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '📄 Starting Convex chunker',
                stage: 'convex:chunker',
            },
            id: 'convex:chunker',
        })

        const startTime = Date.now()
        logToolExecution('convex:chunker', { input: inputData })

        const span = getOrCreateSpan({
            type: SpanType.MODEL_CHUNK,
            name: 'convex:chunker',
            input: {
                documentLength: inputData.documentContent.length,
                chunkingStrategy: inputData.chunkingStrategy,
                chunkSize,
                generateEmbeddings: inputData.generateEmbeddings,
            },
            requestContext: context.requestContext,
            tracingContext,
            metadata: {
                'tool.id': 'convex:chunker',
                operation: 'convex:chunker',
            },
        })

        try {
            const document = new MDocument({
                docs: [
                    {
                        text: inputData.documentContent,
                        metadata: {
                            ...inputData.documentMetadata,
                            chunkingStrategy: inputData.chunkingStrategy,
                            chunkSize,
                            chunkOverlap,
                            processedAt: new Date().toISOString(),
                            source: 'convex:chunker',
                        },
                    },
                ],
                type: 'document',
            })

            const chunkingStartTime = Date.now()
            const chunkParams = buildChunkParams(
                chunkingStrategy,
                chunkSize,
                chunkOverlap
            )
            const chunks = await document.chunk(chunkParams)
            const chunkingTime = Date.now() - chunkingStartTime

            logStepStart('convex-chunking-completed', {
                chunkCount: chunks.length,
                chunkingTimeMs: chunkingTime,
                strategy: chunkingStrategy,
            })

            const chunksForProcessing = chunks.map((chunk, index) => ({
                text: chunk.text,
                metadata: {
                    ...chunk.metadata,
                    chunkIndex: index,
                    totalChunks: chunks.length,
                    documentId: `doc_${String(Date.now())}_${String(index)}`,
                    chunkingStrategy,
                    chunkSize,
                    chunkOverlap,
                },
                id:
                    typeof chunk.metadata.id === 'string'
                        ? chunk.metadata.id
                        : `chunk_${String(Date.now())}_${randomUUID()}`,
            }))

            let embeddingGenerated = false
            let embeddings: number[][] = []

            if ((inputData.generateEmbeddings ?? false) && chunksForProcessing.length > 0) {
                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'in-progress',
                        message: '🧠 Generating embeddings',
                        stage: 'convex:chunker',
                    },
                    id: 'convex:chunker',
                })

                const embeddingStartTime = Date.now()
                const texts = chunksForProcessing.map((chunk) =>
                    typeof chunk.text === 'string' ? chunk.text.trim() : ''
                )
                const nonEmptyIndexes = texts
                    .map((t, i) => (t.length > 0 ? i : -1))
                    .filter((i) => i !== -1)
                const nonEmptyValues = nonEmptyIndexes.map((i) => texts[i])

                try {
                    const allEmbeddings: number[][] = []
                    const model = resolveEmbeddingModel(embeddingModel)
                    for (
                        let i = 0;
                        i < nonEmptyValues.length;
                        i += embeddingBatchSize
                    ) {
                        const batch = nonEmptyValues.slice(i, i + embeddingBatchSize)
                        const result = await embedMany({
                            values: batch,
                            model,
                            maxRetries: 3,
                            abortSignal: new AbortController().signal,
                            experimental_telemetry: {
                                isEnabled: true,
                                recordInputs: true,
                                recordOutputs: true,
                                functionId: 'convex-chunker-embedMany',
                            },
                        })
                        allEmbeddings.push(...result.embeddings)
                    }
                    embeddings = allEmbeddings
                    embeddingGenerated = embeddings.length > 0

                    const embeddingTime = Date.now() - embeddingStartTime
                    logStepStart('convex-embeddings-generated', {
                        embeddingCount: embeddings.length,
                        embeddingTimeMs: embeddingTime,
                        dimension: embeddings[0]?.length,
                    })
                } catch (embedError) {
                    const safeError =
                        embedError instanceof Error
                            ? embedError
                            : new Error('Unknown error occurred')
                    logError('convex-chunker-embeddings', safeError, {
                        embeddingBatchSize,
                    })
                    embeddings = []
                    embeddingGenerated = false
                }
            }

            if (embeddingGenerated && embeddings.length > 0) {
                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'in-progress',
                        message: '💾 Storing vectors in Convex',
                        stage: 'convex:chunker',
                    },
                    id: 'convex:chunker',
                })

                const storageStartTime = Date.now()
                try {
                    await convexVector.createIndex({
                        indexName,
                        dimension: embeddings[0].length,
                    })
                } catch (idxErr) {
                    log.info('Convex createIndex skipped or failed', {
                        error:
                            idxErr instanceof Error
                                ? idxErr.message
                                : String(idxErr),
                    })
                }

                const allIds = chunksForProcessing.map((chunk) => chunk.id)
                const sanitizedMetadata = chunksForProcessing.map((chunk) => ({
                    ...sanitizeMetadata(chunk.metadata),
                    text: chunk.text,
                }))

                const finalVectors: number[][] = []
                const finalMetadata: ConvexJsonObject[] = []
                const finalIds: string[] = []

                if (embeddings.length > 0) {
                    const texts = chunksForProcessing.map((c) =>
                        typeof c.text === 'string' ? c.text.trim() : ''
                    )
                    const nonEmptyIndexes = texts
                        .map((t, i) => (t.length > 0 ? i : -1))
                        .filter((i) => i !== -1)
                    for (let i = 0; i < nonEmptyIndexes.length; i++) {
                        const idx = nonEmptyIndexes[i]
                        finalVectors.push(embeddings[i])
                        finalMetadata.push(sanitizedMetadata[idx])
                        finalIds.push(allIds[idx])
                    }
                }

                if (finalVectors.length > 0) {
                    await convexVector.upsert({
                        indexName,
                        vectors: finalVectors,
                        metadata: finalMetadata,
                        ids: finalIds,
                    })
                } else {
                    log.info(
                        'No embeddings to upsert after processing (empty or embedding generation failed)'
                    )
                }

                const storageTime = Date.now() - storageStartTime
                logStepStart('convex-vectors-stored', {
                    indexName,
                    vectorCount: embeddings.length,
                    storageTimeMs: storageTime,
                })
            }

            const totalProcessingTime = Date.now() - startTime
            const output = {
                success: true,
                chunkCount: chunks.length,
                totalTextLength: inputData.documentContent.length,
                chunks: chunksForProcessing.map((chunk) => ({
                    id: chunk.id,
                    text: chunk.text,
                    metadata: chunk.metadata,
                    embeddingGenerated,
                })),
                processingTimeMs: totalProcessingTime,
            }

            logStepEnd('convex:chunker', output, totalProcessingTime)
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Processed ${String(chunks.length)} chunks successfully`,
                    stage: 'convex:chunker',
                },
                id: 'convex:chunker',
            })
            return output
        } catch (error) {
            const processingTime = Date.now() - startTime
            const safeError =
                error instanceof Error ? error : new Error('Unknown error occurred')
            logError('convex:chunker', safeError, {
                inputData,
                processingTimeMs: processingTime,
            })
            span?.error({ error: safeError, endSpan: true })
            throw safeError
        } finally {
            span?.end()
        }
    },
    onOutput: ({ output, toolCallId, toolName }) => {
        log.info('Convex chunker completed', {
            toolCallId,
            toolName,
            chunkCount: output.chunkCount,
            processingTimeMs: output.processingTimeMs,
            hook: 'onOutput',
        })
    },
})

export const convexGraphQueryTool = createGraphRAGTool({
    id: 'convex-graph-rag',
    description:
        'Graph-based retrieval augmented generation using ConvexVector for Convex-backed semantic search and relationship traversal.',
    vectorStore: convexVector,
    vectorStoreName: 'convex-vectors',
    indexName: CONVEX_INDEX_NAME,
    model: fastembed,
    graphOptions: {
        dimension: CONVEX_EMBEDDING_DIMENSION,
        threshold: parseFloat(process.env.CONVEX_GRAPH_THRESHOLD ?? '0.7'),
        randomWalkSteps: parseInt(
            process.env.CONVEX_GRAPH_RANDOM_WALK_STEPS ?? '10'
        ),
        restartProb: parseFloat(process.env.CONVEX_GRAPH_RESTART_PROB ?? '0.15'),
    },
    includeSources: true,
    enableFilter: true,
})

export const convexVectorQueryTool = createVectorQueryTool({
    id: 'convex-vector-query',
    description:
        'ConvexVector similarity search for semantic content retrieval and question answering.',
    vectorStore: convexVector,
    vectorStoreName: 'convex-vectors',
    indexName: CONVEX_INDEX_NAME,
    model: fastembed,
    includeVectors: true,
    includeSources: true,
    enableFilter: true,
    reranker: {
        model: new ModelRouterLanguageModel(
            'google/gemini-3.1-flash-lite-preview'
        ),
        options: {
            weights: {
                semantic: 0.5,
                vector: 0.3,
                position: 0.2,
            },
            topK: 5,
        },
    },
})

export const convexRerankerTool = createTool({
    id: 'convex:reranker',
    description: `
Convex Document Reranker Tool

This tool retrieves initial ConvexVector search results and reranks them using a semantic reranker.

Features:
- Query embedding generation
- ConvexVector initial vector search
- Semantic reranking with configurable weights
- Optional metadata filtering
`,
    inputSchema: ConvexDocumentRerankerInputSchema,
    outputSchema: ConvexDocumentRerankerOutputSchema,
    strict: true,
    onInputStart: ({ toolCallId, messages }) => {
        log.info('Convex reranker tool input streaming started', {
            toolCallId,
            messages,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages }) => {
        log.info('Convex reranker received complete input', {
            toolCallId,
            userQuery: input.userQuery,
            indexName: input.indexName,
            topK: input.topK,
            messages,
            hook: 'onInputAvailable',
        })
    },
    execute: async (inputData, context) => {
        const writer = context.writer
        const tracingContext = context.tracingContext
        const startTime = Date.now()

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '🔍 Starting Convex reranking',
                stage: 'convex:reranker',
            },
            id: 'convex:reranker',
        })

        logToolExecution('convex:reranker', {
            userQuery: inputData.userQuery,
        })

        const indexName = inputData.indexName ?? CONVEX_INDEX_NAME
        const topK = inputData.topK ?? 10
        const initialTopK = inputData.initialTopK ?? 20
        const semanticWeight = inputData.semanticWeight ?? 0.5
        const vectorWeight = inputData.vectorWeight ?? 0.3
        const positionWeight = inputData.positionWeight ?? 0.2
        const rerankModel = inputData.rerankModel ??
            'google/gemini-3.1-flash-lite'

        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.MODEL_CHUNK,
            name: 'convex:reranker',
            input: {
                userQuery: inputData.userQuery,
                indexName,
                topK,
                initialTopK,
            },
            metadata: {
                'tool.id': 'convex:reranker',
                operation: 'convex:reranker',
            },
        })

        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: '🧠 Generating query embedding',
                    stage: 'convex:reranker',
                },
                id: 'convex:reranker',
            })

            const embeddingStartTime = Date.now()
            const embeddingModel = resolveEmbeddingModel(fastembed.base)
            const { embedding: queryEmbedding } = await embed({
                value: inputData.userQuery,
                model: embeddingModel,
                maxRetries: 3,
                abortSignal: new AbortController().signal,
                experimental_telemetry: {
                    isEnabled: true,
                    recordInputs: true,
                    recordOutputs: true,
                    functionId: 'convex-reranker-embed',
                },
            })
            const embeddingTime = Date.now() - embeddingStartTime

            logStepStart('convex-query-embedding-generated', {
                queryLength: inputData.userQuery.length,
                embeddingDimension: queryEmbedding.length,
                embeddingTimeMs: embeddingTime,
            })

            const weights = normalizeWeights(
                semanticWeight,
                vectorWeight,
                positionWeight
            )
            const origSum = semanticWeight + vectorWeight + positionWeight
            if (Math.abs(origSum - 1) > 1e-6) {
                log.info('Normalized Convex reranker weights', {
                    originalSum: origSum,
                    normalized: weights,
                })
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: '💾 Retrieving initial results from Convex',
                    stage: 'convex:reranker',
                },
                id: 'convex:reranker',
            })

            const searchStartTime = Date.now()
            const initialResults = await convexVector.query({
                indexName,
                queryVector: queryEmbedding,
                topK: initialTopK,
                filter: inputData.filter,
                includeVector: inputData.includeVector,
            })
            const searchTime = Date.now() - searchStartTime

            logStepStart('convex-initial-search-completed', {
                resultCount: initialResults.length,
                searchTimeMs: searchTime,
                indexName,
            })

            if (initialResults.length === 0) {
                const processingTime = Date.now() - startTime
                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: '⚠️ No initial results found',
                        stage: 'convex:reranker',
                    },
                    id: 'convex:reranker',
                })
                return {
                    success: true,
                    userQuery: inputData.userQuery,
                    rerankedDocuments: [],
                    processingTimeMs: processingTime,
                }
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `⚖️ Reranking ${String(initialResults.length)} documents`,
                    stage: 'convex:reranker',
                },
                id: 'convex:reranker',
            })

            const rerankerStartTime = Date.now()
            const rerankedResults = await rerank(
                initialResults.map((result) => ({
                    id: result.id,
                    text:
                        typeof result.metadata?.text === 'string'
                            ? result.metadata.text
                            : '',
                    metadata: result.metadata,
                    score: result.score || 0,
                })),
                inputData.userQuery,
                new ModelRouterLanguageModel(rerankModel),
                {
                    weights,
                    topK,
                }
            )
            const rerankerTime = Date.now() - rerankerStartTime

            logStepStart('convex-reranking-completed', {
                initialResultCount: initialResults.length,
                rerankedResultCount: rerankedResults.length,
                rerankerTimeMs: rerankerTime,
                weights: {
                    semantic: semanticWeight,
                    vector: vectorWeight,
                    position: positionWeight,
                },
            })

            const rerankedDocuments = rerankedResults.map((r, index) => ({
                id: r.result.id,
                text:
                    typeof r.result.document === 'string'
                        ? r.result.document
                        : typeof r.result.metadata?.text === 'string'
                          ? r.result.metadata.text
                          : '',
                metadata: r.result.metadata ?? {},
                relevanceScore: r.score,
                rank: index + 1,
            }))

            const totalProcessingTime = Date.now() - startTime
            const output = {
                success: true,
                userQuery: inputData.userQuery,
                rerankedDocuments,
                processingTimeMs: totalProcessingTime,
            }

            logStepEnd('convex:reranker', output, totalProcessingTime)
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Reranking complete. Returning top ${String(rerankedDocuments.length)} results`,
                    stage: 'convex:reranker',
                },
                id: 'convex:reranker',
            })
            return output
        } catch (error) {
            const processingTime = Date.now() - startTime
            const safeError =
                error instanceof Error ? error : new Error('Unknown error occurred')
            logError('convex:reranker', safeError, {
                userQuery: inputData.userQuery,
                processingTimeMs: processingTime,
            })
            span?.error({ error: safeError, endSpan: true })
            throw safeError
        } finally {
            span?.end()
        }
    },
})

export type ConvexChunkerUITool = InferUITool<typeof convexChunker>
export type ConvexRerankerUITool = InferUITool<typeof convexRerankerTool>
export type ConvexVectorQueryUITool = InferUITool<typeof convexVectorQueryTool>
export type ConvexGraphQueryUITool = InferUITool<typeof convexGraphQueryTool>

export type ConvexChunkerToolInput = InferToolInput<typeof convexChunker>
export type ConvexRerankerToolInput = InferToolInput<typeof convexRerankerTool>
export type ConvexVectorQueryToolInput = InferToolInput<typeof convexVectorQueryTool>
export type ConvexGraphQueryToolInput = InferToolInput<typeof convexGraphQueryTool>

export type ConvexChunkerToolOutput = InferToolOutput<typeof convexChunker>
export type ConvexRerankerToolOutput = InferToolOutput<typeof convexRerankerTool>
export type ConvexVectorQueryToolOutput = InferToolOutput<typeof convexVectorQueryTool>
export type ConvexGraphQueryToolOutput = InferToolOutput<typeof convexGraphQueryTool>
