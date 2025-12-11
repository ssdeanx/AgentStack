import { MongoDBVector, MongoDBStore } from "@mastra/mongodb";
import { createVectorQueryTool, createGraphRAGTool } from "@mastra/rag";
import { google } from '@ai-sdk/google';
import { embedMany } from 'ai';
import type { UIMessage } from 'ai'
import { log } from './logger';
import z from "zod";
import { Memory } from "@mastra/memory";
import { trace, SpanStatusCode } from '@opentelemetry/api'


/**
 * MongoDB Vector configuration for the Governed RAG system
 * Uses MongoDB Atlas Vector Search for vector storage and similarity search
 */

// Configuration constants
const MONGODB_CONFIG = {
  uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017',
  dbName: process.env.MONGODB_DATABASE ?? 'AgentStack',
  collectionName: process.env.MONGODB_COLLECTION ?? 'governed_rag',
  // Google Gemini gemini-embedding-001 supports flexible dimensions: 128-3072
  // Recommended: 768, 1536, 3072
  embeddingDimension: parseInt(process.env.MONGODB_EMBEDDING_DIMENSION ?? "1536"),
  embeddingModel: google.textEmbedding("gemini-embedding-001"),
} as const;

/* FIXME(mastra): Add a unique `id` parameter. See: https://mastra.ai/guides/v1/migrations/upgrade-to-v1/mastra#required-id-parameter-for-all-mastra-primitives */
const mongoStore = new MongoDBStore({
  id: 'mongo:store',
  url: process.env.MONGODB_URI ?? 'mongodb://localhost:27017',
  dbName: process.env.MONGODB_DATABASE ?? 'AgentStack',
});

await mongoStore.init();
//const allIndexes = await mongoStore.listIndexes();
//console.log(allIndexes);
//log.info('MongoDB Store initialized with MongoDBVector support, all indexes:', {
//    indexCount: allIndexes.length,
//    indexes: allIndexes,
//});


/**
 * Initialize MongoDB Vector store with proper configuration
 */
const mongoVector = new MongoDBVector({
  id: 'mongo:vector',
  uri: MONGODB_CONFIG.uri,
  dbName: MONGODB_CONFIG.dbName,
});

// Create a vector index for embeddings
await mongoVector.createIndex({
  indexName: "ultra",
  dimension: 1536,
});

/**
 * * Memory configuration using MongoDB Vector & Storage
 * * Supports advanced semantic recall and working memory
 * * Integrates with Google Gemini embeddings
 * * Works with MongoDB Atlas Vector Search
 * * Works with full MongoDB query syntax for filtering
 * * Configured for governed RAG applications
 */
export const mongoMemory = new Memory({
    storage: mongoStore,
    vector: mongoVector, // Using PgVector with flat for 3072 dimension embeddings (gemini-embedding-001)
    embedder: google.textEmbedding('gemini-embedding-001'),
    options: {
        // Message management
        lastMessages: parseInt(process.env.MEMORY_LAST_MESSAGES ?? '500'),
        generateTitle: process.env.THREAD_GENERATE_TITLE !== 'true',
        // Advanced semantic recall with HNSW index configuration
        semanticRecall: {
            topK: parseInt(process.env.SEMANTIC_TOP_K ?? '5'),
            messageRange: {
                before: parseInt(process.env.SEMANTIC_RANGE_BEFORE ?? '3'),
                after: parseInt(process.env.SEMANTIC_RANGE_AFTER ?? '2'),
            },
            scope: 'resource', // 'resource' | 'thread'
            // HNSW index configuration to support high-dimensional embeddings (>2000 dimensions)
            indexConfig: {
                type: 'hnsw', // flat index type (supports dimensions > 4000, unlike HNSW limit of 2000)
                metric: 'cosine', // Distance metric for normalized embeddings
                hnsw: {
                    m: 16, // Number of bi-directional links created for every new element
                    efConstruction: 200, // Size of the dynamic candidate list for construction
                },
                }
        },
        // Enhanced working memory with supported template
        workingMemory: {
            enabled: true,
            scope: 'resource',
            version: 'vnext',
            template: '# User Profile\n- **Name**:\n- **Preferences**:\n\n# Interaction History\n{{history}}\n\n# Current Context\n{{context}}\n- **Tasks**:\n{{tasks}}\n- **Notes**:\n{{notes}}',
        }
    }
})

log.info('Mongos and Memory initialized with PgVector support', {
    dbName: process.env.MONGODB_DATABASE ?? 'AgentStack',
    collectionName: process.env.MONGODB_COLLECTION ?? 'governed_rag',
    memoryOptions: {
        lastMessages: parseInt(process.env.MEMORY_LAST_MESSAGES ?? '500'),
        semanticRecall: {
            topK: parseInt(process.env.SEMANTIC_TOP_K ?? '5'),
            messageRange: {
                before: parseInt(process.env.SEMANTIC_RANGE_BEFORE ?? '3'),
                after: parseInt(process.env.SEMANTIC_RANGE_AFTER ?? '2'),
            },
            scope: 'resource',
            indexConfig: {
                type: 'flat',
                metric: 'cosine',
                ivf: { lists: 4000 }, // Adjust list count based on your needs
            }
        },
        workingMemory: {
            enabled: true,
            scope: 'resource',
            version: 'vnext',
        },
        threads: {
            generateTitle: process.env.THREAD_GENERATE_TITLE !== 'true',
        },
    },
})

/**
 * MongoDB-compatible filter format for vector queries
 * Supports full MongoDB/Sift query syntax for metadata filtering
 *
 * MongoDB-specific features:
 * - Full support for MongoDB/Sift query syntax for metadata filters
 * - Supports all standard comparison, array, logical, and element operators
 * - Supports nested fields and arrays in metadata
 * - Filtering can be applied to both metadata and the original document content
 * - No artificial limits on filter size or complexity (subject to MongoDB query limits)
 * - Indexing metadata fields is recommended for optimal performance
 */
export interface MongoDBMetadataFilter {
  [key: string]: string | number | boolean | MongoDBMetadataFilter | MongoDBMetadataFilter[] | Array<string | number | boolean> | undefined;
}

/**
 * Raw MongoDB filter format expected by the library
 * Using Record<string, unknown> for compatibility with @mastra/mongodb types
 */
export type MongoDBRawFilter = Record<string, unknown>;

/**
 * Create and configure the vector index
 */
export async function initializeVectorIndex(): Promise<void> {
  try {
    await mongoVector.createIndex({
      indexName: MONGODB_CONFIG.collectionName,
      dimension: MONGODB_CONFIG.embeddingDimension,
      metric: "cosine", // MongoDB supports cosine, euclidean, and dotProduct
    });

    log.info("Vector index created", {
      collectionName: MONGODB_CONFIG.collectionName,
      dimension: MONGODB_CONFIG.embeddingDimension
    });
  } catch (error: unknown) {
    // Index might already exist, which is fine
    const errorObj = error as { code?: number };
    if (errorObj.code === 11000) { // Duplicate key error
      log.info("Vector index already exists", { collectionName: MONGODB_CONFIG.collectionName });
    } else {
      log.error("Failed to create vector index", { error: String(error) });
      throw error;
    }
  }
}

/**
 * Process document content and generate embeddings
 * Simplified chunking for basic vector setup without AI extraction
 */
export async function processDocument(
  content: string,
  options: {
    chunkSize?: number;
    chunkOverlap?: number;
  } = {}
): Promise<{
  chunks: Array<{
    text: string;
    metadata?: Record<string, unknown>;
  }>;
  embeddings: number[][];
}> {
  const startTime = Date.now();
  const chunkSize = options.chunkSize ?? 1000;
  const chunkOverlap = options.chunkOverlap ?? 200;

  const tracer = trace.getTracer('mastra/mongodb');
  const span = tracer.startSpan('mongo-process-document', {
    attributes: {
      contentLength: content.length,
      chunkSize,
      chunkOverlap,
      model: 'gemini-embedding-001',
      component: 'mongodb',
      operationType: 'document-processing',
    },
  });

  try {
    const chunks: Array<{ text: string; metadata?: Record<string, unknown> }> = [];

    // Split content into overlapping chunks
    for (let i = 0; i < content.length; i += chunkSize - chunkOverlap) {
      const chunkText = content.slice(i, i + chunkSize);
      if (chunkText.trim()) {
        chunks.push({
          text: chunkText,
          metadata: {
            chunkIndex: chunks.length,
            startPosition: i,
            endPosition: i + chunkText.length,
            totalLength: content.length,
          },
        });
      }
    }

    // Generate embeddings for all chunks
    const { embeddings } = await embedMany({
      values: chunks.map((chunk) => chunk.text),
      model: MONGODB_CONFIG.embeddingModel,
    });

    const processingTime = Date.now() - startTime;
    log.info("Document processed successfully", {
      chunksCount: chunks.length,
      chunkSize,
      chunkOverlap,
      embeddingDimension: embeddings[0]?.length,
      processingTimeMs: processingTime,
    });

    span?.setAttribute('chunksCount', chunks.length);
    span?.setAttribute('embeddingDimension', embeddings[0]?.length || 0);
    span?.setAttribute('processingTimeMs', processingTime);
    span?.setAttribute('success', true);
    span?.setAttribute('model', 'gemini-embedding-001');
    span?.setAttribute('operation', 'document-processing');
    span?.end();

    return { chunks, embeddings };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error("Failed to process document", { error: String(error), processingTimeMs: processingTime });

    span?.recordException(error instanceof Error ? error : new Error(String(error)));
    span?.setAttribute('processingTimeMs', processingTime);
    span?.setAttribute('model', 'gemini-embedding-001');
    span?.setAttribute('operation', 'document-processing');
    span?.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
    span?.end();

    throw error;
  }
}

/**
 * Store document chunks and their embeddings
 */
export async function storeDocumentEmbeddings(
  chunks: Array<{
    text: string;
    metadata?: Record<string, unknown>;
  }>,
  embeddings: number[][],
  baseMetadata: Record<string, unknown> = {}
): Promise<string[]> {
  const startTime = Date.now();

  const tracer = trace.getTracer('mastra/mongodb');
  const span = tracer.startSpan('mongo-store-embeddings', {
    attributes: {
      chunksCount: chunks.length,
      embeddingsCount: embeddings.length,
      collectionName: MONGODB_CONFIG.collectionName,
      component: 'mongodb',
      operationType: 'vector-storage',
    },
  });

  try {
    // Prepare metadata for each chunk
    const metadata = chunks.map((chunk, index) => ({
      ...baseMetadata,
      text: chunk.text,
      chunkIndex: index,
      createdAt: new Date(),
      ...chunk.metadata,
    }));

    // Upsert vectors with metadata
    const ids = await mongoVector.upsert({
      indexName: MONGODB_CONFIG.collectionName,
      vectors: embeddings,
      metadata,
    });

    const processingTime = Date.now() - startTime;
    log.info("Document embeddings stored", {
      collectionName: MONGODB_CONFIG.collectionName,
      vectorsCount: embeddings.length,
      processingTimeMs: processingTime,
    });

    span?.setAttribute('idsCount', ids.length);
    span?.setAttribute('processingTimeMs', processingTime);
    span?.setAttribute('success', true);
    span?.setAttribute('operation', 'vector-storage');
    span?.end();

    return ids;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error("Failed to store document embeddings", { error: String(error), processingTimeMs: processingTime });

    span?.recordException(error instanceof Error ? error : new Error(String(error)));
    span?.setAttribute('processingTimeMs', processingTime);
    span?.setAttribute('operation', 'vector-storage');
    span?.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
    span?.end();

    throw error;
  }
}

/**
 * Query similar documents with metadata filtering
 */
export async function querySimilarDocuments(
  queryText: string,
  options: {
    topK?: number;
    filter?: MongoDBMetadataFilter;
    includeVector?: boolean;
  } = {}
): Promise<Array<{
  id: string;
  score: number;
  metadata: Record<string, unknown>;
  vector?: number[];
}>> {
  const startTime = Date.now();
  const topK = options.topK ?? 10;

  const tracer = trace.getTracer('mastra/mongodb');
  const span = tracer.startSpan('mongo-query-similar', {
    attributes: {
      queryTextLength: queryText.length,
      topK,
      hasFilter: !!options.filter,
      includeVector: options.includeVector ?? false,
      collectionName: MONGODB_CONFIG.collectionName,
      component: 'mongodb',
      operationType: 'vector-query',
      model: 'gemini-embedding-001',
    },
  });

  try {
    // Generate embedding for the query
    const { embeddings: [queryEmbedding] } = await embedMany({
      values: [queryText],
      model: MONGODB_CONFIG.embeddingModel,
    });

    // Query the vector store
    const results = await mongoVector.query({
      indexName: MONGODB_CONFIG.collectionName,
      queryVector: queryEmbedding,
      topK,
      filter: options.filter,
      includeVector: options.includeVector ?? false,
    });

    const processingTime = Date.now() - startTime;
    log.info("Vector query completed", {
      collectionName: MONGODB_CONFIG.collectionName,
      resultsCount: results.length,
      topK,
      processingTimeMs: processingTime,
    });

    span?.setAttribute('resultsCount', results.length);
    span?.setAttribute('processingTimeMs', processingTime);
    span?.setAttribute('success', true);
    span?.setAttribute('model', 'gemini-embedding-001');
    span?.setAttribute('operation', 'vector-query');
    span?.end();

    // Ensure metadata is always defined
    return results.map(result => ({
      ...result,
      metadata: result.metadata ?? {}
    }));
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error("Failed to query similar documents", { error: String(error), processingTimeMs: processingTime });

    span?.recordException(error instanceof Error ? error : new Error(String(error)));
    span?.setAttribute('processingTimeMs', processingTime);
    span?.setAttribute('model', 'gemini-embedding-001');
    span?.setAttribute('operation', 'vector-query');
    span?.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
    span?.end();

    throw error;
  }
}

/**
 * Clean up resources
 */
export async function disconnectVectorStore(): Promise<void> {
  try {
    await mongoVector.disconnect();
    log.info("MongoDB Vector store disconnected");
  } catch (error) {
    log.error("Failed to disconnect vector store", { error: String(error) });
    throw error;
  }
}

// Graph-based RAG tool using MongoDB Vector
export const mongoGraphTool = createGraphRAGTool({
  id: 'mongo-graph-rag',
  description:
    'Graph-based retrieval augmented generation using MongoDB Vector Search for advanced semantic search and context retrieval.',
  // Supported vector store and index options
  vectorStoreName: 'mongoStore',
  indexName: MONGODB_CONFIG.collectionName,
  model: MONGODB_CONFIG.embeddingModel,
  // Supported graph options for MongoDB
  graphOptions: {
    dimension: MONGODB_CONFIG.embeddingDimension,
    threshold: parseFloat(process.env.MONGO_GRAPH_THRESHOLD ?? '0.7'),
    randomWalkSteps: parseInt(process.env.MONGO_GRAPH_RANDOM_WALK_STEPS ?? '10'),
    restartProb: parseFloat(process.env.MONGO_GRAPH_RESTART_PROB ?? '0.15'),
  },
  includeSources: true,
  // Filtering and ranking
  enableFilter: true,
});

// MongoDB Vector query tool for semantic search
export const mongoQueryTool = createVectorQueryTool({
  id: 'mongo-vector-query',
  description:
    'MongoDB Vector Search similarity search for semantic content retrieval and question answering.',
  // Supported vector store and index options
  vectorStoreName: 'mongoStore',
  indexName: MONGODB_CONFIG.collectionName,
  model: MONGODB_CONFIG.embeddingModel,
  // Supported database configuration for MongoDB
  databaseConfig: {
    mongoDb: {
      minScore: parseFloat(process.env.MONGO_MIN_SCORE ?? '0.7'),
      // MongoDB specific parameters
      maxResults: parseInt(process.env.MONGO_MAX_RESULTS ?? '100'),
    },
  },
  includeVectors: true,
  // Advanced filtering
  enableFilter: true,
  includeSources: true,
});

/**
 * Transform MongoDB metadata filter to raw filter format
 * Handles any necessary conversions between our interface and library expectations
 */
export function transformToMongoDBFilter(filter: MongoDBMetadataFilter): MongoDBRawFilter {
  // For MongoDB, the filter format is already compatible
  // This function can be expanded if any transformations are needed
  return filter as MongoDBRawFilter;
}

/**
 * Validate MongoDB metadata filter according to documented constraints
 */
export function validateMongoDBFilter(filter: MongoDBMetadataFilter): MongoDBMetadataFilter {
  // Basic validation - MongoDB has fewer constraints than S3Vectors
  if (filter === null || typeof filter !== 'object') {
    throw new Error('Filter must be a valid object');
  }

  return filter;
}

// Export configuration for external use
export { MONGODB_CONFIG };
