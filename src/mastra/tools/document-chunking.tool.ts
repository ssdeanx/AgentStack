import type { InferUITool } from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import {
  MDocument,
  rerank,
} from '@mastra/rag';
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { randomUUID } from 'crypto';

import { ModelRouterEmbeddingModel, ModelRouterLanguageModel } from "@mastra/core/llm";
import { embed, embedMany } from 'ai';
import { z } from 'zod';
import {
  log,
  logError,
  logStepEnd,
  logStepStart,
  logToolExecution,
} from '../config/logger';
import { pgVector } from '../config/pg-storage';

import { google } from '@ai-sdk/google';
import { RequestContext } from "@mastra/core/request-context";
import type { ExtractParams } from '@mastra/rag';

log.info('Initializing Document Chunking Tool...')

/**
 * Remove metadata keys that are not safe for vector stores (leading $ or containing dots)
 */
function sanitizeMetadata(m: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const keys = Object.keys(m)
  for (const k of keys) {
    if (k.startsWith('$') || k.includes('.')) {
      continue
    }
    out[k] = m[k]
  }
  return out
}

/**
 * Normalize reranking weights so they sum to 1. Returns normalized object.
 */
export function normalizeWeights(semantic: number, vector: number, position: number) {
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

// Define runtime context for this tool
export interface DocumentChunkingContext extends RequestContext {
  userId?: string
  chunkStrategy?: string
}

/**
 * Input schema for custom document chunking tool with embeddings and storage
 */
const CustomDocumentChunkingInputSchema = z.object({
  documentContent: z.string().min(1, 'Document content cannot be empty'),
  documentMetadata: z.record(z.string(), z.unknown()).optional().default({}),
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
  indexName: z.string().default('memory_messages_3072'),
  // Embedding model name for ModelRouterEmbeddingModel (e.g. 'google/gemini-embedding-001')
  embeddingModel: z.string().default('google/gemini-embedding-001'),
  // Number of texts to embed per batch
  embeddingBatchSize: z.number().min(1).max(500).default(50),
  generateEmbeddings: z.boolean().default(true),
})

/**
 * Output schema for custom document chunking tool
 */
const CustomDocumentChunkingOutputSchema = z.object({
  success: z.boolean(),
  chunkCount: z.number(),
  totalTextLength: z.number(),
  chunks: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      metadata: z.record(z.string(), z.unknown()),
      embeddingGenerated: z.boolean(),
    })
  ),
  processingTimeMs: z.number(),
})

/**
 * Input schema for Mastra chunker tool with metadata extraction
 */
const MastraDocumentChunkingInputSchema = z.object({
  documentContent: z.string().min(1, 'Document content cannot be empty'),
  documentMetadata: z.record(z.string(), z.unknown()).optional().default({}),
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
  // ExtractParams for metadata extraction (supports full ExtractParams)
  // Keep legacy boolean flags for convenience
  extract: z.any().optional(),
  extractTitle: z.boolean().default(false),
  extractSummary: z.boolean().default(false),
  extractKeywords: z.boolean().default(false),
  extractQuestions: z.boolean().default(false),
})

/**
 * Output schema for Mastra chunker tool
 */
const MastraDocumentChunkingOutputSchema = z.object({
  success: z.boolean(),
  chunkCount: z.number(),
  totalTextLength: z.number(),
  chunks: z.array(
    z.object({
      text: z.string(),
      metadata: z.record(z.string(), z.unknown()),
    })
  ),
  processingTimeMs: z.number(),
})

/**
 * Mastra Chunker Tool with Metadata Extraction
 *
 * Uses MDocument.chunk() with ExtractParams for comprehensive document processing
 * including title extraction, summarization, keyword extraction, and question generation.
 *
 * Features:
 * - LLM-powered metadata extraction (titles, summaries, keywords, questions)
 * - Configurable extraction options
 * - Multiple chunking strategies
 * - Comprehensive error handling and logging
 * - Performance monitoring and metrics
 *
 * Use this tool when you need advanced document processing with metadata extraction.
 */
export const mastraChunker = createTool({
  id: 'mastra:chunker',
  description: `
Mastra Document Chunker Tool with Metadata Extraction

This tool processes document content using MDocument.chunk() with advanced metadata extraction:

Features:
- LLM-powered metadata extraction:
  * Title extraction with hierarchical document structure
  * Summary generation for each chunk
  * Keyword extraction for semantic search
  * Question generation for conversational retrieval
- Multiple chunking strategies (recursive, character, token, markdown, etc.)
- Configurable extraction options
- Comprehensive error handling and logging
- Performance monitoring and metrics

Use this tool when you need advanced document processing with metadata extraction.
  `,
  inputSchema: MastraDocumentChunkingInputSchema,
  outputSchema: MastraDocumentChunkingOutputSchema,
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Mastra chunker tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Mastra chunker received complete input', {
      toolCallId,
      documentLength: input.documentContent.length,
      chunkingStrategy: input.chunkingStrategy,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Mastra chunker completed', {
      toolCallId,
      toolName,
      chunkCount: output.chunkCount,
      processingTimeMs: output.processingTimeMs,
      hook: 'onOutput',
    })
  },
  execute: async (inputData, context) => {
    await context?.writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '📄 Starting Mastra chunker', stage: 'mastra:chunker' }, id: 'mastra:chunker' });
    const startTime = Date.now()
    logToolExecution('mastra-chunker', { input: inputData })

    // Create a span for tracing
    // Create a span for tracing
    const tracer = trace.getTracer('document-chunking');
    const span = tracer.startSpan('mastra-chunker-tool', {
      attributes: {
        documentLength: inputData.documentContent.length,
        chunkingStrategy: inputData.chunkingStrategy,
        chunkSize: inputData.chunkSize,
        extractTitle: inputData.extractTitle,
        extractSummary: inputData.extractSummary,
        extractKeywords: inputData.extractKeywords,
        extractQuestions: inputData.extractQuestions,
        operation: 'mastra-chunker'
      }
    });

    try {
      // Create MDocument from input
      const document = new MDocument({
        docs: [
          {
            text: inputData.documentContent,
            metadata: {
              ...inputData.documentMetadata,
              chunkingStrategy: inputData.chunkingStrategy,
              chunkSize: inputData.chunkSize,
              chunkOverlap: inputData.chunkOverlap,
              processedAt: new Date().toISOString(),
              source: 'mastra-chunker',
            },
          },
        ],
        type: 'document',
      })

      // Build chunking parameters with ExtractParams
      const buildChunkParams = (
        strategy: string,
        maxSize: number,
        overlap: number,
        extract: ExtractParams
      ) => {
        const baseParams = {
          maxSize,
          overlap,
          extract,
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
              separator: '\n',
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
            // Fallback to recursive
            return {
              strategy: 'recursive' as const,
              ...baseParams,
              separators: ['\n\n', '\n', ' '],
            }
        }
      }

      // Build ExtractParams based on user preferences
      const extractParams: ExtractParams = {}
      // Accept full ExtractParams via `extract` or fall back to legacy booleans
      if (inputData.extract !== undefined && inputData.extract !== null && typeof inputData.extract === 'object') {
        Object.assign(extractParams, inputData.extract as ExtractParams)
      }
      if (inputData.extractTitle) {
        extractParams.title = true
      }
      if (inputData.extractSummary) {
        extractParams.summary = true
      }
      if (inputData.extractKeywords) {
        extractParams.keywords = true
      }
      if (inputData.extractQuestions) {
        extractParams.questions = true
      }

      // Execute chunking with metadata extraction
      const chunkingStartTime = Date.now()
      const chunkParams = buildChunkParams(
        inputData.chunkingStrategy,
        inputData.chunkSize,
        inputData.chunkOverlap,
        extractParams
      )
      const chunks = await document.chunk(chunkParams)
      const chunkingTime = Date.now() - chunkingStartTime

      logStepStart('mastra-chunking-completed', {
        chunkCount: chunks.length,
        chunkingTimeMs: chunkingTime,
        strategy: inputData.chunkingStrategy,
        extractOptions: Object.keys(extractParams),
      })

      // Prepare output chunks
      const outputChunks = chunks.map((chunk, index) => ({
        text: chunk.text ?? '',
        metadata: {
          ...chunk.metadata,
          chunkIndex: index,
          totalChunks: chunks.length,
          documentId: `doc_${Date.now()}_${index}`,
          chunkingStrategy: inputData.chunkingStrategy,
          chunkSize: inputData.chunkSize,
          chunkOverlap: inputData.chunkOverlap,
        },
      }))

      const totalProcessingTime = Date.now() - startTime

      const output = {
        success: true,
        chunkCount: chunks.length,
        totalTextLength: inputData.documentContent.length,
        chunks: outputChunks,
        processingTimeMs: totalProcessingTime,
      }

      logStepEnd('mastra-chunker', output, totalProcessingTime)

      return output
    } catch (error) {
      const processingTime = Date.now() - startTime
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error occurred'

      logError('mastra-chunker', error, {
        inputData,
        processingTimeMs: processingTime,
      })

      // Record error in tracing span
      span.recordException(error instanceof Error ? error : new Error(errorMessage));
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });

      throw error instanceof Error ? error : new Error(errorMessage);
    } finally {
      span.end();
    }
  },
})

/**
 * MDocument Chunker Tool with PgVector Integration
 *
 * This tool processes document content by:
 * 1. Creating chunks using MDocument.chunk() method with configurable strategies
 * 2. Generating embeddings for each chunk using Gemini embedding model
 * 3. Storing chunks and embeddings in PgVector for efficient similarity search
 *
 * Features:
 * - Multiple chunking strategies with customizable parameters
 * - Automatic embedding generation (3072 dimensions for text-embedding-3-large)
 * - PgVector storage with metadata support
 * - Comprehensive error handling and logging
 * - Performance monitoring and metrics
 *
 * Use this tool when you need to process documents for RAG applications,
 * content indexing, or semantic search capabilities.
 */
export const mdocumentChunker = createTool({
  id: 'mdocument:chunker',
  description: `
Custom Document Chunking Tool with PgVector Integration

This tool processes document content by:
1. Creating chunks using configurable strategies (recursive, character, token, markdown, etc.)
2. Generating embeddings for each chunk using Gemini embedding model
3. Storing chunks and embeddings in PgVector for efficient similarity search

Features:
- Multiple chunking strategies with customizable parameters
- Automatic embedding generation (3072 dimensions for gemini-embedding-001)
- PgVector storage with metadata support
- Comprehensive error handling and logging
- Performance monitoring and metrics

Use this tool when you need to process documents for RAG applications,
content indexing, or semantic search capabilities.
  `,
  inputSchema: CustomDocumentChunkingInputSchema,
  outputSchema: CustomDocumentChunkingOutputSchema,
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('MDocument chunker tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('MDocument chunker received complete input', {
      toolCallId,
      documentLength: input.documentContent.length,
      chunkingStrategy: input.chunkingStrategy,
      generateEmbeddings: input.generateEmbeddings,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('MDocument chunker completed', {
      toolCallId,
      toolName,
      chunkCount: output.chunkCount,
      processingTimeMs: output.processingTimeMs,
      hook: 'onOutput',
    })
  },
  execute: async (inputData, context) => {
    await context?.writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '📄 Starting MDocument chunker', stage: 'mdocument:chunker' }, id: 'mdocument:chunker' });
    const startTime = Date.now()
    logToolExecution('mdocument-chunker', { input: inputData })

    // Create a span for tracing
    // Create a span for tracing
    const tracer = trace.getTracer('document-chunking');
    const span = tracer.startSpan('mdocument-chunker-tool', {
      attributes: {
        documentLength: inputData.documentContent.length,
        chunkingStrategy: inputData.chunkingStrategy,
        chunkSize: inputData.chunkSize,
        generateEmbeddings: inputData.generateEmbeddings,
        indexName: 'memory_messages_3072',
        operation: 'mdocument-chunker'
      }
    });

    try {
      // Create MDocument from input
      const document = new MDocument({
        docs: [
          {
            text: inputData.documentContent,
            metadata: {
              ...inputData.documentMetadata,
              chunkingStrategy: inputData.chunkingStrategy,
              chunkSize: inputData.chunkSize,
              chunkOverlap: inputData.chunkOverlap,
              processedAt: new Date().toISOString(),
              source: 'mdocument-chunker',
            },
          },
        ],
        type: 'document',
      })

      // Build chunking parameters based on strategy
      const buildChunkParams = (
        strategy: string,
        maxSize: number,
        overlap: number
      ) => {
        const baseParams = {
          maxSize,
          overlap,
        }

        switch (strategy) {
          case 'recursive':
            return {
              strategy: 'recursive' as const,
              ...baseParams,
              separators: ['\n\n', '\n', ' '], // Removed 'as const' to make it mutable string[]
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
              sentenceEnders: ['.'], // Removed 'as const' to make it mutable string[]
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
            // Fallback to recursive
            return {
              strategy: 'recursive' as const,
              ...baseParams,
              separators: ['\n\n', '\n', ' '],
              isSeparatorRegex: false,
            }
        }
      }

      // Execute chunking using MDocument.chunk() method
      const chunkingStartTime = Date.now()
      const chunkParams = buildChunkParams(
        inputData.chunkingStrategy,
        inputData.chunkSize,
        inputData.chunkOverlap
      )
      const chunks = await document.chunk(chunkParams)
      const chunkingTime = Date.now() - chunkingStartTime

      logStepStart('custom-chunking-completed', {
        chunkCount: chunks.length,
        chunkingTimeMs: chunkingTime,
        strategy: inputData.chunkingStrategy,
      })

      // Prepare chunks for embedding and storage
      const chunksForProcessing = chunks.map((chunk, index) => ({
        text: chunk.text,
        metadata: {
          ...chunk.metadata,
          chunkIndex: index,
          totalChunks: chunks.length,
          documentId: `doc_${Date.now()}_${index}`,
          chunkingStrategy: inputData.chunkingStrategy,
          chunkSize: inputData.chunkSize,
          chunkOverlap: inputData.chunkOverlap,
        },
        id: chunk.metadata?.id ?? `chunk_${Date.now()}_${randomUUID()}`,
      }))

      let embeddingGenerated = false
      let embeddings: number[][] = []

      // Generate embeddings if requested
      if (inputData.generateEmbeddings && chunksForProcessing.length > 0) {
        await context?.writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🧠 Generating embeddings', stage: 'mdocument:chunker' }, id: 'mdocument:chunker' });
        const embeddingStartTime = Date.now()
        // Prepare texts and keep mapping so we can upsert only non-empty embeddings
        const texts = chunksForProcessing.map((chunk) => (typeof chunk.text === 'string' ? chunk.text.trim() : ''))
        const nonEmptyIndexes = texts.map((t, i) => (t.length > 0 ? i : -1)).filter((i) => i !== -1)
        const nonEmptyValues = nonEmptyIndexes.map((i) => texts[i])

        try {
          const allEmbeddings: number[][] = []
          for (let i = 0; i < nonEmptyValues.length; i += inputData.embeddingBatchSize) {
            const batch = nonEmptyValues.slice(i, i + inputData.embeddingBatchSize)
            const result = await embedMany({
              values: batch,
              model: new ModelRouterEmbeddingModel(inputData.embeddingModel),
              maxRetries: 3,
              abortSignal: new AbortController().signal,
            })
            allEmbeddings.push(...result.embeddings)
          }
          embeddings = allEmbeddings
          embeddingGenerated = embeddings.length > 0

          const embeddingTime = Date.now() - embeddingStartTime
          logStepStart('embeddings-generated', {
            embeddingCount: embeddings.length,
            embeddingTimeMs: embeddingTime,
            dimension: embeddings[0]?.length || 0,
          })
        } catch (embedError) {
          logError('mdocument-chunker-embeddings', embedError, { embeddingBatchSize: inputData.embeddingBatchSize })
          // fall back to no embeddings so chunks are still returned
          embeddings = []
          embeddingGenerated = false
        }
      }

      // Store chunks in PgVector if embeddings were generated
      if (embeddingGenerated && embeddings.length > 0) {
        await context?.writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '💾 Storing vectors in database', stage: 'mdocument:chunker' }, id: 'mdocument:chunker' });
        const storageStartTime = Date.now()

        // Ensure index exists with the same dimension as embeddings
        try {
          await pgVector.createIndex({ indexName: inputData.indexName, dimension: embeddings[0]?.length || 0 })
        } catch (idxErr) {
          log.info('createIndex skipped or failed', { error: (idxErr as Error)?.message ?? idxErr })
        }

        // Ensure chunk ids are stable and unique
        // Ensure ids are present and sanitize metadata
        const allIds = chunksForProcessing.map((chunk) => chunk.id ?? `chunk_${Date.now()}_${randomUUID()}`)
        const sanitizedMetadata = chunksForProcessing.map((chunk) => ({ ...sanitizeMetadata(chunk.metadata), text: chunk.text }))

        // Map embeddings back to the full set: only non-empty values produced embeddings
        const finalVectors: number[][] = []
        const finalMetadata: Array<Record<string, unknown>> = []
        const finalIds: string[] = []

        if (embeddings.length > 0) {
          // Rebuild arrays using nonEmptyIndexes mapping
          const texts = chunksForProcessing.map((c) => (typeof c.text === 'string' ? c.text.trim() : ''))
          const nonEmptyIndexes = texts.map((t, i) => (t.length > 0 ? i : -1)).filter((i) => i !== -1)
          for (let i = 0; i < nonEmptyIndexes.length; i++) {
            const idx = nonEmptyIndexes[i]
            finalVectors.push(embeddings[i])
            finalMetadata.push(sanitizedMetadata[idx])
            finalIds.push(allIds[idx])
          }
        }

        // Store vectors with metadata
        if (finalVectors.length > 0) {
          await pgVector.upsert({
            indexName: inputData.indexName,
            vectors: finalVectors,
            metadata: finalMetadata,
            ids: finalIds,
          })
        } else {
          log.info('No embeddings to upsert after processing (empty or embedding generation failed)')
        }

        const storageTime = Date.now() - storageStartTime
        logStepStart('vectors-stored', {
          indexName: inputData.indexName,
          vectorCount: embeddings.length,
          storageTimeMs: storageTime,
        })
      }

      const totalProcessingTime = Date.now() - startTime

      // Prepare output
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

      logStepEnd('mdocument-chunker', output, totalProcessingTime)

      await context?.writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Processed ${chunks.length} chunks successfully`, stage: 'mdocument:chunker' }, id: 'mdocument:chunker' });
      return output
    } catch (error) {
      const processingTime = Date.now() - startTime
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error occurred'

      logError('mdocument-chunker', error, {
        inputData,
        processingTimeMs: processingTime,
      })

      // Record error in tracing span
      span.recordException(error instanceof Error ? error : new Error(errorMessage));
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });

      throw error instanceof Error ? error : new Error(errorMessage);
    } finally {
      span.end();
    }
  },
})


/**
 * Document Reranking Tool with Semantic Relevance Scoring
 *
 * This tool retrieves documents from PgVector and re-ranks them using
 * semantic relevance scoring to improve result quality.
 *
 * Features:
 * - Query embedding generation using Gemini
 * - Initial vector similarity search in PgVector
 * - Re-ranking using MastraAgentRelevanceScorer
 * - Configurable relevance weights (semantic, vector, position)
 * - Comprehensive error handling and logging
 */
export const documentRerankerTool = createTool({
  id: 'document:reranker',
  description: `
Document Reranking Tool with Semantic Relevance Scoring

This tool retrieves documents from PgVector and re-ranks them using semantic relevance scoring:

Features:
- Query embedding generation using Gemini embedding model
- Initial vector similarity search in PgVector
- Re-ranking using MastraAgentRelevanceScorer for improved relevance
- Configurable relevance weights (semantic, vector, position)
- Comprehensive error handling and logging

Use this tool to improve retrieval quality by re-ranking initial search results.
  `,
  inputSchema: z.object({
    userQuery: z.string().min(1, 'Query cannot be empty'),
    indexName: z.string().default('memory_messages_3072'),
    topK: z.number().min(1).max(50).default(10),
    initialTopK: z.number().min(1).max(100).default(20),
    semanticWeight: z.number().min(0).max(1).default(0.5),
    vectorWeight: z.number().min(0).max(1).default(0.3),
    positionWeight: z.number().min(0).max(1).default(0.2),
    // Optional metadata filter (MongoDB/Sift-style)
    filter: z.record(z.string(), z.any()).optional(),
    includeVector: z.boolean().default(false),
    rerankModel: z.string().default('google/gemini-2.5-flash'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    userQuery: z.string(),
    rerankedDocuments: z.array(
      z.object({
        id: z.string(),
        text: z.string(),
        metadata: z.record(z.string(), z.unknown()),
        relevanceScore: z.number(),
        rank: z.number(),
      })
    ),
    processingTimeMs: z.number(),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Document reranker tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Document reranker received complete input', {
      toolCallId,
      userQuery: input.userQuery,
      indexName: input.indexName,
      topK: input.topK,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Document reranker completed', {
      toolCallId,
      toolName,
      documentCount: output.rerankedDocuments.length,
      processingTimeMs: output.processingTimeMs,
      hook: 'onOutput',
    })
  },
  execute: async (inputData, context) => {
    await context?.writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🔍 Starting document reranking', stage: 'document:reranker' }, id: 'document:reranker' });
    const startTime = Date.now()
    logToolExecution('document-reranker', { userQuery: inputData.userQuery })

    const tracer = trace.getTracer('document-chunking');
    const span = tracer.startSpan('document-reranker-tool', {
      attributes: {
        userQuery: inputData.userQuery,
        indexName: inputData.indexName,
        topK: inputData.topK,
        initialTopK: inputData.initialTopK,
        operation: 'document-reranker'
      }
    });

    try {
      // Step 1: Generate embedding for user query
      await context?.writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🧠 Generating query embedding', stage: 'document:reranker' }, id: 'document:reranker' });
      const embeddingStartTime = Date.now()
      const { embedding: queryEmbedding } = await embed({
        value: inputData.userQuery,
        model: google.textEmbedding('gemini-embedding-001'),
      })
      const embeddingTime = Date.now() - embeddingStartTime

      logStepStart('query-embedding-generated', {
        queryLength: inputData.userQuery.length,
        embeddingDimension: queryEmbedding.length,
        embeddingTimeMs: embeddingTime,
      })

      // Normalize weights to sum to 1 (if user input deviates)
      const weights = normalizeWeights(inputData.semanticWeight, inputData.vectorWeight, inputData.positionWeight)
      // Log if user-supplied weights did not sum to 1
      const origSum = inputData.semanticWeight + inputData.vectorWeight + inputData.positionWeight
      if (Math.abs(origSum - 1) > 1e-6) {
        log.info('Normalized reranker weights', { originalSum: origSum, normalized: weights })
      }

      // Step 2: Retrieve initial results from PgVector (supports metadata filters)
      await context?.writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '💾 Retrieving initial results from database', stage: 'document:reranker' }, id: 'document:reranker' });
      const searchStartTime = Date.now()
      // @ts-ignore - PGVector query accepts Mongo/Sift-style filter at runtime
      const initialResults = await pgVector.query({
        indexName: inputData.indexName,
        queryVector: queryEmbedding,
        topK: inputData.initialTopK,
        filter: inputData.filter,
        includeVector: inputData.includeVector,
      })
      const searchTime = Date.now() - searchStartTime

      logStepStart('initial-search-completed', {
        resultCount: initialResults.length,
        searchTimeMs: searchTime,
        indexName: inputData.indexName,
      })

      if (initialResults.length === 0) {
        const processingTime = Date.now() - startTime
        await context?.writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '⚠️ No initial results found', stage: 'document:reranker' }, id: 'document:reranker' });
        return {
          success: true,
          userQuery: inputData.userQuery,
          rerankedDocuments: [],
          processingTimeMs: processingTime,
        }
      }
      // Create a relevance scorer

      // Step 3: Re-rank results using semantic relevance scorer
      await context?.writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `⚖️ Reranking ${initialResults.length} documents`, stage: 'document:reranker' }, id: 'document:reranker' });
      const rerankerStartTime = Date.now()
      const rerankedResults = await rerank(
        initialResults.map((result) => ({
          id: result.id,
          text: (result.metadata?.text as string) ?? (typeof result.metadata?.text === 'undefined' ? '' : String(result.metadata?.text)),
          metadata: result.metadata,
          score: result.score || 0,
        })),
        inputData.userQuery,
        // Use ModelRouterLanguageModel wrapper so the reranker receives a Mastra-compatible model
        new ModelRouterLanguageModel(inputData.rerankModel),
        {
          weights,
          topK: inputData.topK,
        }
      )
      const rerankerTime = Date.now() - rerankerStartTime

      logStepStart('reranking-completed', {
        initialResultCount: initialResults.length,
        rerankedResultCount: rerankedResults.length,
        rerankerTimeMs: rerankerTime,
        weights: {
          semantic: inputData.semanticWeight,
          vector: inputData.vectorWeight,
          position: inputData.positionWeight,
        },
      })

      // Step 4: Format output with ranking information
      const rerankedDocuments = rerankedResults.map((r, index) => ({
        // RerankResult contains a nested `result` object; use that id when available
        id: r.result?.id ?? `rerank_${index}`,
        // The returned document text may be in `result.document` or inside metadata.text
        text:
          (typeof r.result?.document === 'string' ? r.result.document : undefined) ??
          (typeof (r.result as { text?: unknown })?.text === 'string' ? (r.result as unknown as { text: string }).text : undefined) ??
          (r.result?.metadata?.text as string) ??
          '',
        metadata: r.result?.metadata ?? {},
        // Use the top-level score returned by the reranker
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

      logStepEnd('document-reranker', output, totalProcessingTime)

      await context?.writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Reranking complete. Returning top ${rerankedDocuments.length} results`, stage: 'document:reranker' }, id: 'document:reranker' });
      return output
    } catch (error) {
      const processingTime = Date.now() - startTime
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error occurred'

      logError('document-reranker', error, {
        userQuery: inputData.userQuery,
        processingTimeMs: processingTime,
      })

      span.recordException(error instanceof Error ? error : new Error(errorMessage));
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });

      throw error instanceof Error ? error : new Error(errorMessage);
    } finally {
      span.end();
    }
  },
})

export type DocumentRerankerUITool = InferUITool<typeof documentRerankerTool>;
export type MastraChunkerUITool = InferUITool<typeof mastraChunker>;
export type MDocumentChunkerUITool = InferUITool<typeof mdocumentChunker>;
