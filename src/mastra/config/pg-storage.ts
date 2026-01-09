import { Memory } from '@mastra/memory'
import { PgVector, PostgresStore } from '@mastra/pg'
import { createGraphRAGTool, createVectorQueryTool } from '@mastra/rag'
import type { UIMessage } from 'ai'
import { embedMany } from 'ai'
import { google } from './google'
import { log } from './logger'
//import type { CoreMessage } from '@mastra/core';
// import { maskStreamTags } from '@mastra/core';
import { SpanStatusCode, trace } from "@opentelemetry/api"

// Utility function to create a masked stream for sensitive data
// This properly uses maskStreamTags to mask content between XML tags in streams
//export function createMaskedStream(
//    inputStream: AsyncIterable<string>,
//    sensitiveTags: string[] = ['password', 'secret', 'token', 'key']
//): AsyncIterable<string> {
//    // Chain multiple maskStreamTags calls for different sensitive tags
//   let maskedStream = inputStream;
//    for (const tag of sensitiveTags) {
//        maskedStream = maskStreamTags(maskedStream, tag);
//    }
//    return maskedStream;
//}

// Utility function to mask sensitive data in message content for logging
export function maskSensitiveMessageData(
  content: string,
  sensitiveFields: string[] = ['password', 'secret', 'token', 'key', 'apiKey']
): string {
  let maskedContent = content;

  // Mask sensitive fields in JSON-like structures
  for (const field of sensitiveFields) {
    // Match field:"value" or field: "value" or "field": "value" patterns
    const regex = new RegExp(`("${field}"\\s*:\\s*)"[^"]*"`, 'gi');
    maskedContent = maskedContent.replace(regex, `$1"[MASKED]"`);
  }

  return maskedContent;
}

// PostgreSQL storage configuration with PgVector support
log.info('Loading PG Storage config with PgVector support')
// Production-grade PostgreSQL configuration with supported options
/* FIXME(mastra): Add a unique `id` parameter. See: https://mastra.ai/guides/v1/migrations/upgrade-to-v1/mastra#required-id-parameter-for-all-mastra-primitives */
export const pgStore = new PostgresStore({
  id: 'pg:store',
  connectionString:
    process.env.SUPABASE ??
    'postgresql://user:password@localhost:5432/mydb',
  // Schema management
  schemaName: process.env.DB_SCHEMA ?? 'mastra',
  // Connection pooling (using supported pg.Pool options)
  max: parseInt(process.env.DB_MAX_CONNECTIONS ?? '20'), // Maximum connections in pool
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT ?? '30000'), // 30 seconds
  connectionTimeoutMillis: parseInt(
    process.env.DB_CONNECTION_TIMEOUT ?? '2000'
  ), // 2 seconds
  // Keep alive settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
});

//await pgStore.init();


// PgVector configuration for 3072 dimension embeddings (gemini-embedding-001)
/* FIXME(mastra): Add a unique `id` parameter. See: https://mastra.ai/guides/v1/migrations/upgrade-to-v1/mastra#required-id-parameter-for-all-mastra-primitives */
export const pgVector = new PgVector({
  id: 'pg:vector',
  connectionString:
    process.env.SUPABASE ??
    'postgresql://user:password@localhost:5432/mydb',
  schemaName: process.env.DB_SCHEMA ?? 'mastra',
  // Additional index options can be configured here if needed
});

// Memory configuration using PgVector with flat index for gemini-embedding-001
export const pgMemory = new Memory({
  storage: pgStore,
  vector: pgVector, // Using PgVector with flat for 3072 dimension embeddings (gemini-embedding-001)
  embedder: google.textEmbedding('gemini-embedding-001'),
  options: {
    // Message management
    lastMessages: parseInt(process.env.MEMORY_LAST_MESSAGES ?? '500'),
    generateTitle: true,
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
        type: 'ivfflat', // flat index type (supports dimensions > 4000, unlike HNSW limit of 2000)
        metric: 'cosine', // Distance metric for normalized embeddings
        ivf: { lists: 3200 }, // IVFFlat configuration
      },
      threshold: 0.75, // Similarity threshold for semantic recall
      indexName: 'memory_messages_3072', // Index name for semantic recall
    },
    // Enhanced working memory with supported template
    workingMemory: {
      enabled: true,
      scope: 'resource', // 'resource' | 'thread'
      version: 'vnext',
      template: `# User Context
## Profile
- Name/Role:
- Org/Loc:
- Style/Level:
## Active
- Goals/Projects:
- Recent/Deadlines:
## Insights
- Patterns/Habits:
- Session Focus:
- Action Items:
`,
    },
  }
})

log.info('PG Store and Memory initialized with PgVector support', {
  schema: process.env.DB_SCHEMA ?? 'mastra',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS ?? '20'),

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
        type: 'ivfflat', // flat index type (supports dimensions > 4000, unlike HNSW limit of 2000)
        metric: 'cosine', // Distance metric for normalized embeddings
      }
    },
    workingMemory: {
      enabled: true,
      scope: 'resource',
      version: 'vnext',
    }

  },
})
// In-memory counter to track tool calls per request
// Add this line at the beginning of each tool's execute function to track usage:

// Graph-based RAG tool using PgVector
export const graphQueryTool = createGraphRAGTool({
  id: 'graph-rag',
  description:
    'Graph-based retrieval augmented generation using PostgreSQL and PgVector for advanced semantic search and context retrieval.',
  // Supported vector store and index options
  vectorStoreName: 'pgVector',
  indexName: 'memory_messages_3072',
  model: google.textEmbedding('gemini-embedding-001'),
  // Supported graph options (updated for 3072 dimensions)
  graphOptions: {
    dimension: 3072, // gemini-embedding-001 dimension (3072)
    threshold: parseFloat(process.env.GRAPH_THRESHOLD ?? '0.7'),
    randomWalkSteps: parseInt(process.env.GRAPH_RANDOM_WALK_STEPS ?? '10'),
    restartProb: parseFloat(process.env.GRAPH_RESTART_PROB ?? '0.15'),
  },
  includeSources: true,
  // Filtering and ranking
  enableFilter: true,
})
// Helper to rerank results — accepts the initial results and query instead of relying on an undefined variable

// PostgreSQL vector query tool using PgVector
export const pgQueryTool = createVectorQueryTool({
  id: 'vector-query',
  description:
    'PostgreSQL vector similarity search using PgVector for semantic content retrieval and question answering.',
  // Supported vector store and index options
  vectorStoreName: 'pgVector',
  indexName: 'memory_messages_3072',
  model: google.textEmbedding('gemini-embedding-001'),
  // Supported database configuration for PgVector
  databaseConfig: {
    pgVector: {
      minScore: parseFloat(process.env.PG_MIN_SCORE ?? '0.7'),
      probes: 1000
//      ef: parseInt(process.env.PG_EF ?? '100'), // HNSW search parameter - higher = better recall, slower queries
      // Note: probes parameter is only for IVFFlat, not HNSW
    },
  },
  includeVectors: true,
  // Advanced filtering
  enableFilter: true,
  includeSources: true,
})

// Production-grade embedding generation with tracing
export async function generateEmbeddings(
  chunks: Array<{
    text: string
    metadata?: Record<string, unknown>
    id?: string
  }>
) {
  if (!chunks.length) {
    log.warn('No chunks provided for embedding generation')
    return { embeddings: [] }
  }

  const startTime = Date.now()

  // Get tracer from OpenTelemetry API
  const tracer = trace.getTracer('pg-storage');
  const embeddingSpan = tracer.startSpan('generate-embeddings', {
    attributes: {
      'component': 'pg-storage',
      'operationType': 'embedding',
      'model': 'gemini-embedding-001',
      'input.chunkCount': chunks.length,
      'input.totalTextLength': chunks.reduce(
        (sum, chunk) => sum + (chunk.text?.length ?? 0),
        0
      ),
    }
  });

  log.info('Starting embedding generation', {
    chunkCount: chunks.length,
    totalTextLength: chunks.reduce(
      (sum, chunk) => sum + (chunk.text?.length ?? 0),
      0
    ),
    model: 'gemini-embedding-001',
  })

  try {
    const { embeddings } = await embedMany({
      values: chunks.map((chunk) => chunk.text),
      model: google.textEmbedding("gemini-embedding-001"),
      maxRetries: parseInt(process.env.EMBEDDING_MAX_RETRIES ?? '3'),
      abortSignal: new AbortController().signal,
      maxParallelCalls: 20,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
        functionId: 'generateEmbeddings',
        metadata: {
          component: 'pg-storage',
          operationType: 'embedding',
          model: 'gemini-embedding-001'
        },
      },
    })

    const processingTime = Date.now() - startTime
    log.info('Embeddings generated successfully', {
      embeddingCount: embeddings.length,
      embeddingDimension: embeddings[0]?.length || 0,
      processingTimeMs: processingTime,
      model: 'gemini-embedding-001',
    })

    // Update and end span successfully
    embeddingSpan.setAttributes({
      'output.embeddingCount': embeddings.length,
      'output.embeddingDimension': embeddings[0]?.length || 0,
      'output.processingTimeMs': processingTime,
      'output.success': true,
      'metadata.finalStatus': 'success',
    });
    embeddingSpan.end();

    return { embeddings }
  } catch (error) {
    const processingTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    log.error('Embedding generation failed', {
      error: errorMessage,
      chunkCount: chunks.length,
      processingTimeMs: processingTime,
      model: 'gemini-embedding-001',
    })

    // Record error in span and end it
    if (error instanceof Error) {
      embeddingSpan.recordException(error);
    }

    embeddingSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage }); // ERROR status

    embeddingSpan.setAttributes({
      'output.success': false,
      'output.processingTimeMs': processingTime,
      'output.error': errorMessage,
      'metadata.finalStatus': 'error',
    });

    embeddingSpan.end();

    throw error
  }
}

// Utility function to format messages for UI consumption
export function formatStorageMessages(
  operation: string,
  status: 'success' | 'error' | 'info',
  details: Record<string, unknown>
): UIMessage[] {
  const timestamp = new Date().toISOString()

  // Create message data that can be converted to UIMessage format
  const messageData = {
    id: `storage-${operation}-${Date.now()}`,
    createdAt: new Date(timestamp),
    role: 'system' as const,
    parts: [] as Array<{ type: string; text: string }>, // UIMessage requires parts property
    metadata: {
      operation,
      status,
      details,
      timestamp,
    },
  }

  // Determine message content based on status
  const getMessageContent = (
    msgStatus: string,
    messageDetails: Record<string, unknown>
  ): string => {
    // Mask sensitive data in error details and messages
    const maskedDetails = { ...messageDetails };
    if (maskedDetails.error !== undefined && maskedDetails.error !== null) {
      maskedDetails.error = maskSensitiveMessageData(String(maskedDetails.error));
    }
    if (maskedDetails.message !== undefined && maskedDetails.message !== null) {
      maskedDetails.message = maskSensitiveMessageData(String(maskedDetails.message));
    }

    switch (msgStatus) {
      case 'success':
        return `✅ Storage operation '${operation}' completed successfully`
      case 'error':
        return `❌ Storage operation '${operation}' failed: ${String(maskedDetails.error ?? 'Unknown error')}`
      case 'info':
        return `ℹ️ Storage operation '${operation}': ${String(maskedDetails.message ?? 'Processing...')}`
      default:
        return `Storage operation '${operation}' status: ${msgStatus}`
    }
  }

  const messageContent = getMessageContent(status, details)

  // Add content to parts array (UIMessage structure)
  messageData.parts.push({
    type: 'text',
    text: messageContent,
  })

  // Return as UIMessage array (would need proper conversion in real implementation)
  return [messageData as UIMessage]
}
