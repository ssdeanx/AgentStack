import { google } from "@ai-sdk/google";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { log } from "./logger";

const libsqlstorage = new LibSQLStore({
  id: 'libsql-storage',
  url: process.env.TURSO_DATABASE_URL ?? "libsql://your-db-name.aws-ap-northeast-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN,
})

// Create a new vector store instance
const libsqlvector = new LibSQLVector({
  id: 'libsql-vector',
  connectionUrl: process.env.TURSO_DATABASE_URL ?? "file:./vectors.db",
  // Optional: for Turso cloud databases
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Create an index
await libsqlvector.createIndex({
  indexName: "memory_messages",
  dimension: 3072,
  metric: "cosine"
});

// Add vectors with metadata
const vectors = [[0.1, 0.2], [0.3, 0.4]];
const metadata = [
  { text: "first document", category: "A" },
  { text: "second document", category: "B" }
];
await libsqlvector.upsert({
  indexName: "memory_messages",
  vectors,
  metadata,
});

// Query similar vectors
const queryVector = [0.1, 0.2]; // Your query vector

const results = await libsqlvector.query({
  indexName: "memory_messages",
  queryVector,
  topK: 10, // top K results
  filter: { category: "A" } // optional metadata filter
});

export const LibsqlMemory = new Memory({
  storage: libsqlstorage,
  vector: libsqlvector,
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
          },
          threshold: 0.75, // Similarity threshold for semantic recall
          indexName: 'memory_messages', // Index name for semantic recall
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

