import { Memory } from '@mastra/memory';
import { UpstashStore, UpstashVector } from '@mastra/upstash';
// import { ToolCallFilter } from '@mastra/memory/processors';
import { google } from '@ai-sdk/google';
import { createGraphRAGTool, createVectorQueryTool } from '@mastra/rag';
/**
 * Create shared Upstash storage instance
 */
export const upstashStorage = new UpstashStore({
  id: 'upstash:store',
  url: process.env.UPSTASH_REDIS_REST_URL ?? 'https://your-instance-url.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? 'your-redis-token'
});

export const upstashVector = new UpstashVector({
  id: 'upstash:vector',
  url: process.env.UPSTASH_VECTOR_REST_URL ?? 'https://your-instance-url-12345-us1-vector.upstash.io',
  token: process.env.UPSTASH_VECTOR_REST_TOKEN ?? 'your-vector-token'
});

await upstashVector.createIndex({
  indexName: "vector_messages",
  dimension: 1536,
  metric: 'cosine'
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
    generateTitle: true, // Auto-generate thread titles
    semanticRecall: {
      topK: 5, // Retrieve top 5 semantically relevant messages
      messageRange: {
        before: 2,
        after: 3,
      },
      scope: 'resource', // Search across all threads for a user
      indexConfig: {
        type: 'hnsw', // Use HNSW for efficient vector search
        metric: 'cosine', // Use cosine similarity for semantic search
        hnsw: {
          efConstruction: 256, // Enhanced HNSW configuration for better performance
          m: 32, // Enhanced HNSW configuration for better performance
        },
      },
      threshold: 0.7, // Enhanced semantic recall threshold
      indexName: 'vector_messages', // Enhanced vector index name
    },
    workingMemory: {
      enabled: true, // Persistent user information across conversations
      version: 'vnext', // Enable the improved/experimental tooling
      template: `# User Profile & Context
## Personal Information
 - **Name**:
 - **Role/Title**:
 - **Organization**:
 - **Location**:
 - **Time Zone**:
## Communication Preferences
 - **Preferred Communication Style**:
 - **Response Length Preference**:
 - **Technical Level**:

            ## Current Context
            - **Active Projects**:
            - **Current Goals**:
            - **Deadlines**:
            - **Recent Activities**:
            - **Pain Points**:

            ## Long-term Memory
            - **Key Achievements**:
            - **Important Relationships**:
            - **Recurring Patterns**:
            - **Preferences & Habits**:

            ## Session Notes
            - **Today's Focus**:
            - **Outstanding Questions**:
            - **Action Items**:
            - **Follow-ups Needed**:
            `,
    },
  }
});

// Graph-based RAG tool using Upstash
export const graphupstashQueryTool = createGraphRAGTool({
  id: 'graph-rag',
  description:
    'Graph-based retrieval augmented generation using PostgreSQL and PgVector for advanced semantic search and context retrieval.',
  // Supported vector store and index options
  vectorStoreName: 'pgVector',
  indexName: 'vector_messages',
  model: google.textEmbedding('gemini-embedding-001'),
  // Supported graph options (updated for 1568 dimensions)
  providerOptions: {
    google: { dimensions: 1536},
  },
  graphOptions: {
    dimension: 1536, // gemini-embedding-001 dimension (1568)
    threshold: parseFloat(process.env.GRAPH_THRESHOLD ?? '0.7'),
    randomWalkSteps: parseInt(process.env.GRAPH_RANDOM_WALK_STEPS ?? '10'),
    restartProb: parseFloat(process.env.GRAPH_RESTART_PROB ?? '0.15'),
  },
  includeSources: true,
  // Filtering and ranking
  enableFilter: true,
})
// Helper to rerank results — accepts the initial results and query instead of relying on an undefined variable

// PostgreSQL vector query tool using Upstash
export const upstashQueryTool = createVectorQueryTool({
  id: 'vector-query',
  description:
    'PostgreSQL vector similarity search using PgVector for semantic content retrieval and question answering.',
  // Supported vector store and index options
  vectorStoreName: 'vector_messages',
  indexName: 'messages',
  model: google.textEmbedding('gemini-embedding-001'),
  // Supported database configuration for PgVector
  providerOptions: {
    google: { dimensions: 1536},
  },
  databaseConfig: {
  },
  includeVectors: true,
  // Advanced filtering
  enableFilter: true,
  includeSources: true,
})
