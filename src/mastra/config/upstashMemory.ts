import { Memory } from '@mastra/memory';
import { UpstashStore, UpstashVector } from '@mastra/upstash';
//import { pinecone } from './pinecone';
import { z } from 'zod';
import type { CoreMessage as OriginalCoreMessage } from '@mastra/core';
import { maskStreamTags } from '@mastra/core';
import type { UIMessage } from 'ai';
// import { ToolCallFilter } from '@mastra/memory/processors';
import { google } from '@ai-sdk/google'
import { AISpanType } from '@mastra/core/ai-tracing';
import type { TracingContext } from '@mastra/core/ai-tracing';
import { log } from './logger';
import type { ExtractParams } from '@mastra/rag';

/**
 * Redefine CoreMessage to include a metadata property for custom data.
 * This is necessary because CoreMessage is a union type and cannot be directly extended.
 */
type CoreMessage = OriginalCoreMessage & {
  metadata?: Record<string, unknown>;
};

export class VectorStoreError extends Error {
  constructor(
    message: string,
    public code: 'connection_failed' | 'invalid_dimension' | 'index_not_found' | 'operation_failed' = 'operation_failed',
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VectorStoreError';
    // Use the properties to avoid unused variable warnings
    this.code = code;
    this.details = details;
  }
}

// Validation schemas
const createThreadSchema = z.object({
  resourceId: z.string().optional(),
  threadId: z.string().optional(),
  title: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const getMessagesSchema = z.object({
  resourceId: z.string().optional(),
  threadId: z.string().nonempty(),
  last: z.number().int().min(1).optional()
});

const threadIdSchema = z.string().nonempty();
const resourceIdSchema = z.string().nonempty();

const searchMessagesSchema = z.object({
  threadId: z.string().nonempty(),
  vectorSearchString: z.string().nonempty(),
  topK: z.number().int().min(1).default(3),
  before: z.number().int().min(0).default(0),
  after: z.number().int().min(0).default(0),
});

// Enhanced vector operation schemas
const vectorIndexSchema = z.object({
  indexName: z.string().nonempty(),
});

const createVectorIndexSchema = vectorIndexSchema.extend({
  dimension: z.number().int().positive(),
  metric: z.enum(['cosine', 'euclidean', 'dotproduct']).optional(),
});

const vectorUpsertSchema = z.intersection(vectorIndexSchema, z.object({
  vectors: z.array(z.array(z.number())),
  metadata: z.array(z.record(z.string(), z.unknown())).optional(),
  ids: z.array(z.string()).optional()
}));

const vectorQuerySchema = z.intersection(vectorIndexSchema, z.object({
  queryVector: z.array(z.number()),
  topK: z.number().int().min(1).default(10),
  filter: z.any().optional(), // Use z.any() for MetadataFilter compatibility
  includeVector: z.boolean().default(false)
}));

const vectorUpdateSchema = z.intersection(vectorIndexSchema, z.object({
  id: z.string().nonempty(),
  vector: z.array(z.number()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
}));

// Locally defined types based on schema.md, as they are not exported from @mastra/core
export interface WorkflowRun {
  namespace: string;
  workflowName?: string | undefined;
  resourceId?: string | undefined;
  fromDate?: Date | undefined;
  toDate?: Date | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface Trace {
  id: string;
  parentSpanId?: string;
  name: string;
  traceId: string;
  scope: string;
  kind: number;
  attributes: Record<string, unknown>;
  status: {
    code: number;
    message?: string;
  };
  events: Array<Record<string, unknown>>;
  links: Array<Record<string, unknown>>;
  other: string;
  startTime: bigint;
  endTime: bigint;
  createdAt: Date;
}

export interface Eval {
  agentName: string;
  input: string;
  output: string;
  // Use unknown to allow flexible result structure from Mastra evals
  result: unknown;
  metricName: string;
  instructions: string;
  testInfo: Record<string, unknown>;
  globalRunId: string;
  runId: string;
  createdAt: string;
}

/**
 * Vector operation result interfaces following Upstash Vector API
 */
export interface VectorQueryResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
  vector?: number[];
}

export interface VectorIndexStats {
  dimension: number;
  count: number;
  metric: 'cosine' | 'euclidean' | 'dotproduct';
}

export interface VectorOperationResult {
  success: boolean;
  operation: string;
  indexName?: string;
  count?: number;
  error?: string;
}

/**
 * Enhanced metadata filter interface supporting Upstash-compatible MongoDB/Sift query syntax
 *
 * @remarks
 * Upstash-specific limitations:
 * - Field keys limited to 512 characters
 * - Query size is limited (avoid large IN clauses)
 * - No support for null/undefined values in filters
 * - Translates to SQL-like syntax internally
 * - Case-sensitive string comparisons
 * - Metadata updates are atomic
 *
 * Supported operators: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $and, $or, $not, $nor, $exists, $contains, $regex
 */
export interface MetadataFilter {
  [key: string]: string | number | boolean | MetadataFilter | MetadataFilter[] | Array<string | number | boolean> | undefined;
  // Basic comparison operators (Upstash compatible)
  $eq?: string | number | boolean;
  $ne?: string | number | boolean;
  $gt?: number;
  $gte?: number;
  $lt?: number;
  $lte?: number;
  // Array operators (Upstash compatible - avoid large arrays)
  $in?: Array<string | number | boolean>;
  $nin?: Array<string | number | boolean>;
  // Logical operators (Upstash compatible)
  $and?: MetadataFilter[];
  $or?: MetadataFilter[];
  $not?: MetadataFilter;
  $nor?: MetadataFilter[];
  // Element operators (Upstash compatible)
  $exists?: boolean;
  // Upstash-specific operators
  $contains?: string; // Text contains substring
  $regex?: string; // Regular expression match
}

/**
 * Upstash-compatible filter format for vector queries
 * This represents the exact format expected by UpstashVector.query()
 * Using Record<string, unknown> for compatibility with @mastra/upstash types
 */
export type UpstashVectorFilter = Record<string, unknown>;

/**
 * Raw Upstash vector query result format
 */
export interface UpstashVectorQueryResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
  vector?: number[];
}


/**
 * Create shared Upstash storage instance
 */
export const upstashStorage = new UpstashStore({
  url: process.env.UPSTASH_REDIS_REST_URL ?? 'https://your-instance-url.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? 'your-redis-token'
});

export const upstashVector = new UpstashVector({
  url: process.env.UPSTASH_VECTOR_REST_URL ?? 'https://your-instance-url-12345-us1-vector.upstash.io',
  token: process.env.UPSTASH_VECTOR_REST_TOKEN ?? 'your-vector-token'
});

  /**
   * Shared Mastra agent memory instance using Upstash for distributed storage and [Pinecone] for vector search.
   *
   * @remarks
   * - Uses UpstashStore for distributed Redis storage
 * - Uses PineconeVector for semantic search with cloud-based vectors (768-dim gemini embeddings)
 * - Embeddings powered by Gemini text-embedding-004 model with cosine similarity
 * - Configured for working memory and semantic recall with enhanced processors
 * - Supports custom memory processors for filtering, summarization, etc.
 * - Ideal for serverless and distributed applications
 * - Enhanced with vector operations and batch processing capabilities
 *
 * @see https://upstash.com/docs/redis/overall/getstarted
 * @see https://upstash.com/docs/vector/overall/getstarted
 * @see https://mastra.ai/en/reference/rag/upstash
 *
 * @version 2.0.0
 * @author SSD
 * @date 2025-07-14
 *
 * @mastra Shared Upstash memory instance for all agents
 * @instance upstashMemory
 * @module upstashMemory
 * @class Memory
 * @classdesc Shared memory instance for all agents using Upstash for storage and [Pinecone] for vector search
 * @returns {Memory} Shared Upstash-backed memory instance for all agents
 *
 * @example
 * // Use threadId/resourceId for multi-user or multi-session memory:
 * await agent.generate('Hello', { resourceId: 'user-123', threadId: 'thread-abc' });
 *
 * @example
 * // Initialize vector indexes on startup:
 * await initializeUpstashVectorIndexes();
 */
export const upstashMemory = new Memory({
  storage: upstashStorage,
  vector: upstashVector,
  embedder: google.textEmbedding('gemini-embedding-001'),
  options: {
    lastMessages: 500, // Enhanced for better context retention
    semanticRecall: {
      topK: 5, // Retrieve top 5 semantically relevant messages
      messageRange: {
        before: 2,
        after: 3,
      },
      scope: 'resource', // Search across all threads for a user
      indexConfig: {
      },
    },
    threads: {
      generateTitle: true, // Auto-generate thread titles
    },
    workingMemory: {
      enabled: true, // Persistent user information across conversations
      version: 'vnext', // Enable the improved/experimental tooling
      template: `# User Profile & Context
            ## Personal Information
            - **Name**: [To be learned]
            - **Role/Title**: [To be learned]
            - **Organization**: [To be learned]
            - **Location**: [To be learned]
            - **Time Zone**: [To be learned]

            ## Communication Preferences
            - **Preferred Communication Style**: [To be learned]
            - **Response Length Preference**: [To be learned]
            - **Technical Level**: [To be learned]

            ## Current Context
            - **Active Projects**: [To be learned]
            - **Current Goals**: [To be learned]
            - **Recent Activities**: [To be learned]
            - **Pain Points**: [To be learned]

            ## Long-term Memory
            - **Key Achievements**: [To be learned]
            - **Important Relationships**: [To be learned]
            - **Recurring Patterns**: [To be learned]
            - **Preferences & Habits**: [To be learned]

            ## Session Notes
            - **Today's Focus**: [To be learned]
            - **Outstanding Questions**: [To be learned]
            - **Action Items**: [To be learned]
            - **Follow-ups Needed**: [To be learned]
            `,
    },
  },
  processors: [
  ],
});


/**
 * Query messages for a thread using Upstash storage.
 * @param resourceId - User/resource ID
 * @param threadId - Thread ID
 * @param last - Number of last messages to retrieve
 * @returns Promise resolving to thread messages
 */
export async function getMemoryThreadMessages(
  threadId: string,
  resourceId?: string,
  last = 10
) {
  const params = getMessagesSchema.parse({ resourceId, threadId, last });
  const finalResourceId = params.resourceId ?? ''; // Provide a default empty string if undefined
  try {
    return await upstashMemory.query({
      resourceId: finalResourceId,
      threadId: params.threadId,
      selectBy: { last: params.last }
    });
  } catch (error: unknown) {
    log.error(`getMemoryThreadMessages failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Retrieve a memory thread by its ID using Upstash storage.
 * @param threadId - Thread identifier
 * @returns Promise resolving to thread information
 */
export async function getMemoryThreadById(threadId: string) {
  const id = threadIdSchema.parse(threadId);
  try {
    return await upstashMemory.getThreadById({ threadId: id });
  } catch (error: unknown) {
    log.error(`getMemoryThreadById failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Retrieve all memory threads associated with a resource using Upstash storage.
 * @param resourceId - Resource identifier
 * @returns Promise resolving to array of threads
 */
export async function getMemoryThreadsByResourceId(resourceId?: string) {
  const id = resourceIdSchema.parse(resourceId);
  const finalResourceId = id ?? '';
  try {
    return await upstashMemory.getThreadsByResourceId({ resourceId: finalResourceId });
  } catch (error: unknown) {
    log.error(`getMemoryThreadsByResourceId failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Retrieve UI-formatted messages for a thread using Upstash storage.
 * @param threadId - Thread identifier
 * @param last - Number of recent messages
 * @returns Promise resolving to array of UI-formatted messages
 */
export async function getMemoryUIThreadMessages(threadId: string, last = 100): Promise<UIMessage[]> {
  const id = threadIdSchema.parse(threadId);
  try {
    const { uiMessages } = await upstashMemory.query({
      threadId: id,
      selectBy: { last },
    });
    // Filter out "data" role messages to match UIMessage type
    return uiMessages.filter(msg => msg) as UIMessage[];
  } catch (error: unknown) {
    log.error(`getMemoryUIThreadMessages failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Masks internal working_memory updates from a response textStream for Upstash.
 * @param textStream - Async iterable of response chunks including <working_memory> tags
 * @param onStart - Optional callback when a working_memory update starts
 * @param onEnd - Optional callback when a working_memory update ends
 * @param onMask - Optional callback for the masked content
 * @returns Async iterable of chunks with working_memory tags removed
 */
export function maskMemoryWorkingMemoryStream(
  textStream: AsyncIterable<string>,
  onStart?: () => void,
  onEnd?: () => void,
  onMask?: (chunk: string) => string
): AsyncIterable<string> {
  return maskStreamTags(textStream, 'working_memory', { onStart, onEnd, onMask });
}

/**
 * Create a vector index with proper configuration
 * @param indexName - Name of the index to create
 * @param dimension - Vector dimension (default: 1536)
 * @param metric - Distance metric (default: cosine)
 * @returns Promise resolving to operation result
 */
export async function createVectorIndex(
  indexName: string,
  dimension: number,
  metric: 'cosine' | 'euclidean' | 'dotproduct' = 'cosine'
): Promise<VectorOperationResult> {
  const params = createVectorIndexSchema.parse({ indexName, dimension, metric });
  try {
    await upstashVector.createIndex({
      indexName: params.indexName,
      dimension: params.dimension,
      metric: params.metric,
    });
    log.info('Vector index created successfully', {
      indexName: params.indexName,
      dimension: params.dimension,
      metric: params.metric,
    });
    return {
      success: true,
      operation: 'createVectorIndex',
      indexName: params.indexName,
    };
  } catch (error: unknown) {
    log.error('Failed to create vector index', {
      error: (error as Error).message,
      indexName: params.indexName,
      dimension: params.dimension,
      metric: params.metric,
    });
    return {
      success: false,
      operation: 'createVectorIndex',
      indexName: params.indexName,
      error: (error as Error).message,
    };
  }
}

/**
 * List all available vector indexes
 * @returns Promise resolving to array of index names
 */
export async function listVectorIndexes(): Promise<string[]> {
  try {
    const indexes = await upstashVector.listIndexes();
    log.info('Vector indexes listed successfully', { count: indexes.length });
    return indexes;
  } catch (error: unknown) {
    log.error('Failed to list vector indexes', {
      error: (error as Error).message
    });
    throw error;
  }
}

/**
 * Get detailed information about a vector index
 * @param indexName - Name of the index to describe
 * @returns Promise resolving to index statistics
 */
export async function describeVectorIndex(indexName: string): Promise<VectorIndexStats> {
  try {
    const stats = await upstashVector.describeIndex({ indexName });
    log.info('Vector index described successfully', { indexName, stats });
    return {
      dimension: stats.dimension,
      count: stats.count,
      metric: stats.metric ?? 'cosine'
    };
  } catch (error: unknown) {
    log.error('Failed to describe vector index', {
      error: (error as Error).message,
      indexName
    });
    throw error;
  }
}

/**
 * Delete a vector index
 * @param indexName - Name of the index to delete
 * @returns Promise resolving to operation result
 */
export async function deleteVectorIndex(indexName: string): Promise<VectorOperationResult> {
  try {
    await upstashVector.deleteIndex({ indexName });
    log.info('Vector index deleted successfully', { indexName });
    return {
      success: true,
      operation: 'deleteIndex',
      indexName
    };
  } catch (error: unknown) {
    log.error('Failed to delete vector index', {
      error: (error as Error).message,
      indexName
    });

    return {
      success: false,
      operation: 'deleteIndex',
      indexName,
      error: (error as Error).message
    };
  }
}

/**
 * Upsert vectors into an index with metadata
 * @param indexName - Name of the index
 * @param vectors - Array of embedding vectors
 * @metadata - Optional metadata for each vector
 * @param ids - Optional IDs for each vector
 * @returns Promise resolving to operation result
 */
export async function upsertVectors(
  indexName: string,
  vectors: number[][],
  metadata?: Array<Record<string, unknown>>,
  ids?: string[]
): Promise<VectorOperationResult> {
  const params = vectorUpsertSchema.parse({ indexName, vectors, metadata, ids });
  try {
    await upstashVector.upsert({
      indexName: params.indexName,
      vectors: params.vectors,
      metadata: params.metadata,
      ids: params.ids
    });
    log.info('Vectors upserted successfully', {
      indexName: params.indexName,
      vectorCount: params.vectors.length,
      hasMetadata: !!params.metadata,
      hasIds: !!params.ids
    });
    return {
      success: true,
      operation: 'upsert',
      indexName: params.indexName,
      count: params.vectors.length
    };
  } catch (error: unknown) {
    log.error('Failed to upsert vectors', {
      error: (error as Error).message,
      indexName: params.indexName,
      vectorCount: params.vectors.length
    });
    return {
      success: false,
      operation: 'upsert',
      indexName: params.indexName,
      error: (error as Error).message
    };
  }
}

/**
 * Query vectors for similarity search with enhanced metadata filtering
 * Supports MongoDB/Sift query syntax for comprehensive filtering capabilities
 *
 * @param indexName - Name of the index to query
 * @param queryVector - Query vector for similarity search (768 dimensions for Gemini)
 * @param topK - Number of results to return
 * @param filter - Optional metadata filter using MongoDB/Sift query syntax
 * @param includeVector - Whether to include vectors in results
 * @returns Promise resolving to query results with metadata
 *
 * @warning Current Type Limitation:
 * Filter parameter uses `any` casting due to local pinecone package constraints.
 */
export async function queryVectors(
  indexName: string,
  queryVector: number[],
  topK = 5,
  filter?: MetadataFilter,
  includeVector = false
): Promise<VectorQueryResult[]> {
  const params = vectorQuerySchema.parse({
    indexName,
    queryVector,
    topK,
    filter,
    includeVector
  });
  try {
    // Validate filter for upstash compatibility if provided
    let upstashFilter: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- Using 'any' for UpstashVectorFilter compatibility
    if (params.filter) {
      upstashFilter = transformToUpstashFilter(params.filter);
    }
    const results = await upstashVector.query({
      indexName: params.indexName,
      queryVector: params.queryVector,
      topK: params.topK,
      filter: upstashFilter,
      includeVector: params.includeVector
    });

    log.info('Vector query completed successfully', {
      indexName: params.indexName,
      topK: params.topK,
      resultCount: results.length,
      hasFilter: params.filter !== undefined,
      filterApplied: upstashFilter !== undefined
    });

    // Transform results to match our interface
    return results.map((result: UpstashVectorQueryResult) => ({
      id: result.id,
      score: result.score,
      metadata: result.metadata ?? {},
      vector: result.vector
    }));
  } catch (error: unknown) {
    log.error('Failed to query vectors', {
      error: (error as Error).message,
      indexName: params.indexName,
      topK: params.topK
    });
    throw error;
  }
}

/**
 * Transform MetadataFilter to Upstash-compatible filter format
 * Converts our MetadataFilter interface to the exact format expected by UpstashVector
 *
 * @param filter - MetadataFilter to transform
 * @returns Transformed filter compatible with Upstash Vector API
 *
 * @warning Current Implementation Note:
 * This function performs the transformation but cannot guarantee full type safety
 * due to local Upstash package constraints. The output is cast to `any` to work
 * with the current system while maintaining functionality.
 */

export function transformToUpstashFilter(filter: MetadataFilter): UpstashVectorFilter {
  const transformed: Record<string, unknown> = {};

  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Handle nested MetadataFilter objects
      if (typeof value === 'object' && !Array.isArray(value) && key.startsWith('$')) {
        transformed[key] = transformToUpstashFilter(value);
      } else if (Array.isArray(value) && key.startsWith('$')) {
        // Handle arrays in logical operators
        transformed[key] = value.map(item =>
          typeof item === 'object' && item !== null
            ? transformToUpstashFilter(item)
            : item
        );
      } else {
        transformed[key] = value;
      }
    }
  });

  return transformed as UpstashVectorFilter;
}

/**
 * Update a specific vector in an index
 * @param indexName - Name of the index
 * @param id - ID of the vector to update
 * @param vector - New vector values (optional)
 * @param metadata - New metadata (optional)
 * @returns Promise resolving to operation result
 */
export async function updateVector(
  indexName: string,
  id: string,
  vector?: number[],
  metadata?: Record<string, unknown>
): Promise<VectorOperationResult> {
  const params = vectorUpdateSchema.parse({ indexName, id, vector, metadata });
  if (!params.vector && !params.metadata) {
    throw new Error('Either vector or metadata must be provided for update');
  }
  try {
    await upstashVector.updateVector({
      indexName: params.indexName,
      id: params.id,
      update: {
        vector: params.vector,
        metadata: params.metadata
      }
    });
    log.info('Vector updated successfully', {
      indexName: params.indexName,
      id: params.id,
      hasVector: !!params.vector,
      hasMetadata: !!params.metadata
    });
    return {
      success: true,
      operation: 'updateVector',
      indexName: params.indexName
    };
  } catch (error: unknown) {
    log.error('Failed to update vector', {
      error: (error as Error).message,
      indexName: params.indexName,
      id: params.id
    });
    return {
      success: false,
      operation: 'updateVector',
      indexName: params.indexName,
      error: (error as Error).message
    };
  }
}

/**
 * Delete a specific vector from an index
 * @param indexName - Name of the index
 * @param id - ID of the vector to delete
 * @returns Promise resolving to operation result
 */
export async function deleteVector(
  indexName: string,
  id: string
): Promise<VectorOperationResult> {
  try {
    await upstashVector.deleteVector({ indexName, id });
    log.info('Vector deleted successfully', { indexName, id });
    return {
      success: true,
      operation: 'deleteVector',
      indexName,
    };
  } catch (error: unknown) {
    log.error('Failed to delete vector', {
      error: (error as Error).message,
      indexName,
      id
    });
    return {
      success: false,
      operation: 'deleteVector',
      indexName,
      error: (error as Error).message
    };
  }
}

/**
 * Batch upsert vectors for improved performance
 * @param indexName - Name of the index
 * @param vectors - Array of embedding vectors
 * @param metadata - Optional metadata for each vector
 * @param ids - Optional IDs for each vector
 * @param batchSize - Size of each batch (default: 100)
 * @returns Promise resolving to operation result
 */
export async function batchUpsertVectors(
  indexName: string,
  vectors: number[][],
  metadata?: Array<Record<string, unknown>>,
  ids?: string[],
  batchSize = 100
): Promise<VectorOperationResult> {
  const totalVectors = vectors.length;
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  try {
    for (let i = 0; i < totalVectors; i += batchSize) {
      const batchVectors = vectors.slice(i, i + batchSize);
      const batchMetadata = metadata?.slice(i, i + batchSize);
      const batchIds = ids?.slice(i, i + batchSize);
      try {
        await upsertVectors(indexName, batchVectors, batchMetadata, batchIds);
        successCount += batchVectors.length;
      } catch (error: unknown) {
        errorCount += batchVectors.length;
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${(error as Error).message}`);
      }
    }
    log.info('Batch vector upsert completed', {
      indexName,
      totalVectors,
      successCount,
      errorCount,
      batchSize
    });
    return {
      success: errorCount === 0,
      operation: 'batchUpsert',
      indexName,
      count: successCount,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };
  } catch (error: unknown) {
    log.error('Batch vector upsert failed', {
      error: (error as Error).message,
      indexName,
      totalVectors
    });
    return {
      success: false,
      operation: 'batchUpsert',
      indexName,
      error: (error as Error).message
    };
  }
}

/**
 * Extract metadata from document chunks using LLM analysis
 * Follows Mastra ExtractParams patterns for title, summary, keywords, and questions
 *
 * @param chunks - Array of document chunks to process
 * @param extractParams - Configuration for metadata extraction
 * @returns Promise resolving to chunks with enhanced metadata
 *
 * @example
 * ```typescript
 * const enhancedChunks = await extractChunkMetadata(chunks, {
 *   title: true,
 *   summary: { summaries: ['self'] },
 *   keywords: { keywords: 5 },
 *   questions: { questions: 3 }
 * });
 * ```
 */
export async function extractChunkMetadata(
  chunks: Array<{
    id: string;
    content: string;
    metadata: Record<string, unknown>;
  }>,
  extractParams: ExtractParams,
  tracingContext?: TracingContext
): Promise<Array<{
  id: string;
  content: string;
  metadata: Record<string, unknown>;
}>> {
  const span = tracingContext?.currentSpan?.createChildSpan({
    type: AISpanType.MODEL_CHUNK,
    name: 'extract-chunk-metadata',
    input: {
      chunkCount: chunks.length,
      extractParams: Object.keys(extractParams)
    },
    metadata: {
      component: 'upstash-memory',
      operationType: 'metadata-extraction',
      extractFields: Object.keys(extractParams)
    }
  });

  const startTime = Date.now();

  try {
    log.info('Starting metadata extraction for chunks', {
      chunkCount: chunks.length,
      extractParams: Object.keys(extractParams)
    });

    const enhancedChunks = chunks.map(chunk => ({ ...chunk }));

    // Title extraction (grouped by docId if available)
    if (extractParams.title !== undefined && extractParams.title !== false) {

      // Group chunks by docId for shared title extraction
      const docGroups = new Map<string, typeof enhancedChunks>();
      enhancedChunks.forEach(chunk => {
        const docId = (chunk.metadata.docId as string) || chunk.id;
        if (!docGroups.has(docId)) {
          docGroups.set(docId, []);
        }
        docGroups.get(docId)!.push(chunk);
      });

      // Extract titles for each document group
      for (const [docId, docChunks] of docGroups) {
        const combinedContent = docChunks.map(c => c.content).join('\n\n');
        // Use combined content for title generation (simplified for demo)
        const extractedTitle = combinedContent.length > 100
          ? `Document: ${combinedContent.substring(0, 50)}...`
          : `Document: ${docId.substring(0, 50)}...`;

        docChunks.forEach(chunk => {
          chunk.metadata.documentTitle = extractedTitle;
        });
      }
    }


    // Keywords extraction
    if (extractParams.keywords !== undefined && extractParams.keywords !== false) {
      const keywordConfig = typeof extractParams.keywords === 'boolean' ? { keywords: 5 } : extractParams.keywords;
      const keywordCount = keywordConfig.keywords ?? 5;

      enhancedChunks.forEach(chunk => {
        // Simplified keyword extraction
        const words = chunk.content.toLowerCase().split(/\s+/)
          .filter(word => word.length > 3)
          .slice(0, keywordCount);
        chunk.metadata.excerptKeywords = `KEYWORDS: ${words.join(', ')}`;
      });
    }

    // Questions extraction
    if (extractParams.questions !== undefined && extractParams.questions !== false) {
      const questionConfig = typeof extractParams.questions === 'boolean' ? { questions: 3 } : extractParams.questions;
      const questionCount = questionConfig.questions ?? 3;

      if (questionConfig.embeddingOnly !== false) {
        enhancedChunks.forEach(chunk => {
          // Simplified question generation
          const questions = Array.from({ length: questionCount }, (_, i) =>
            `${i + 1}. What is discussed about ${chunk.content.split(' ')[0]}?`
          );
          chunk.metadata.questionsThisExcerptCanAnswer = questions.join('\n');
        });
      }
    }

    const processingTime = Date.now() - startTime;
    log.info('Metadata extraction completed', {
      chunkCount: enhancedChunks.length,
      processingTime,
      extractedFields: Object.keys(extractParams)
    });

    // End span successfully
    span?.end({
      output: {
        chunkCount: enhancedChunks.length,
        processingTimeMs: processingTime,
        extractedFields: Object.keys(extractParams),
        success: true
      },
      metadata: {
        component: 'upstash-memory',
        operation: 'metadata-extraction',
        finalStatus: 'success'
      }
    });

    return enhancedChunks;
  } catch (error: unknown) {
    const processingTime = Date.now() - startTime;
    log.error('Metadata extraction failed', {
      error: (error as Error).message,
      chunkCount: chunks.length
    });

    // Record error in span and end it
    span?.error({
      error: error instanceof Error ? error : new Error('Unknown metadata extraction error'),
      metadata: {
        component: 'upstash-memory',
        operation: 'metadata-extraction',
        processingTime,
        chunkCount: chunks.length
      }
    });

    span?.end({
      output: {
        success: false,
        processingTimeMs: processingTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      metadata: {
        component: 'upstash-memory',
        operation: 'metadata-extraction',
        finalStatus: 'error'
      }
    });

    throw new VectorStoreError(
      `Failed to extract metadata: ${(error as Error).message}`,
      'operation_failed',
      { chunkCount: chunks.length, extractParams }
    );
  }
}
