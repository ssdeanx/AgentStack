import { Memory } from '@mastra/memory';
import { UpstashStore, UpstashVector } from '@mastra/upstash';
// import { ToolCallFilter } from '@mastra/memory/processors';
import { google } from '@ai-sdk/google';
import { createGraphRAGTool, createVectorQueryTool } from '@mastra/rag';
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
  embedder: google.textEmbedding('text-embedding-004'),
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

// Graph-based RAG tool using Upstash
export const graphupstashQueryTool = createGraphRAGTool({
  id: 'graph-rag',
  description:
    'Graph-based retrieval augmented generation using PostgreSQL and PgVector for advanced semantic search and context retrieval.',
  // Supported vector store and index options
  vectorStoreName: 'pgVector',
  indexName: 'memory_messages_728',
  model: google.textEmbedding('text-embedding-004'),
  // Supported graph options (updated for 1568 dimensions)
  graphOptions: {
    dimension: 3072, // gemini-embedding-001 dimension (1568)
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
  vectorStoreName: 'pgVector',
  indexName: 'memory_messages_728',
  model: google.textEmbedding('text-embedding-004'),
  // Supported database configuration for PgVector
  databaseConfig: {
  },
  includeVectors: true,
  // Advanced filtering
  enableFilter: true,
  includeSources: true,
})
