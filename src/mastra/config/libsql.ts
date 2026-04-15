//import { google } from '@ai-sdk/google'
import { LibSQLStore, LibSQLVector } from '@mastra/libsql'
import { Memory } from '@mastra/memory'
import { log } from './logger'
import {
    ModelRouterEmbeddingModel,
    ModelRouterLanguageModel,
} from '@mastra/core/llm'
import { createGraphRAGTool, createVectorQueryTool } from '@mastra/rag'

export const libsqlstorage = new LibSQLStore({
    id: 'libsql-storage',
    url:  'file:./database.db',
    maxRetries: 5, // Optional retry configuration for transient errors
    initialBackoffMs: 100, // Initial backoff for retries
    //disableInit: process.env.DB_DISABLE_INIT === 'true', // Disable auto-init if specified
    authToken: process.env.TURSO_AUTH_TOKEN, // Optional: for Turso cloud databases
    // Additional options can be added here as needed
})


// Create a new vector store instance
export const libsqlvector = new LibSQLVector({
    id: 'libsql-vector',
    url:  'file:./database.db',
    // Optional: for Turso cloud databases
    authToken: process.env.TURSO_AUTH_TOKEN,
    syncInterval: 10000, // Sync every 10 seconds (optional)
    syncUrl: process.env.TURSO_SYNC_URL, // Optional sync URL for distributed setups
    maxRetries: 5, // Optional retry configuration for transient errors
    initialBackoffMs: 50, // Initial backoff for retries
})

// Create an index
//await libsqlvector.createIndex({
//    indexName: 'memory_messages_3072',
//    dimension: 3072,
//    metric: 'cosine',
//})

export const LibsqlMemory = new Memory({
    storage: libsqlstorage,
    vector: libsqlvector,
    embedder: new ModelRouterEmbeddingModel(
        'google/gemini-embedding-2-preview'
    ),
    embedderOptions: {
        telemetry: {
            request: {
                log: true,
                logInputs: true,
                logOutputs: true,
            },
        },
        //maxParallelCalls: 10, // Limit parallel embedding calls to avoid rate limits
        providerOptions: {
            google: {
                outputDimensions: 3072,
                taskType: 'RETRIEVAL_DOCUMENT',
            },
        },
    },
    options: {
        // Message management
        readOnly: false,
        observationalMemory: {
            enabled: true,
            scope: 'resource', // 'resource' | 'thread'
            model: 'google/gemini-3.1-flash-lite-preview',
            shareTokenBudget: false, // Don't share token budget between observation and reflection to preserve context
            observation: {
                instruction: 'You are an assistant that observes and remembers important information from the conversation. Pay attention to details, context, and any information that might be useful for future reference.',
                messageTokens: 75_000,
                modelSettings: {
                    temperature: 0.3,
                    maxOutputTokens: 64_000,
                    topK: 40,
                    topP: 0.95,
                },
            },
            reflection: {
                instruction: 'Based on the observations, generate concise and informative reflections that capture important details, context, and insights from the conversation. These reflections should be useful for future reference and help provide context for the assistant.',
                modelSettings: {
                    temperature: 0.3,
                    maxOutputTokens: 64_000,
                    topK: 40,
                    topP: 0.95,
                },
                observationTokens: 50_000,
            },
        },
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
            threshold: 0.75, // Similarity threshold for semantic recall
            indexName: 'memory_messages_3072', // Index name for semantic recall
        },
        // Enhanced working memory with supported template
        workingMemory: {
            enabled: true,
            scope: 'resource', // 'resource' | 'thread'
            version: 'vnext',
            template: `
# User Context
{{#if user.name}}Name: {{user.name}}{{/if}}
{{#if user.role}}Role: {{user.role}}{{/if}}
{{#if user.language}}Language: {{user.language}}{{/if}}

# Conversation Context
{{#if conversation.topic}}Topic: {{conversation.topic}}{{/if}}
{{#if conversation.purpose}}Purpose: {{conversation.purpose}}{{/if}}

# Additional Context
{{#each additionalContext}}
- {{this}}
`,
        },
    },
})

log.info('LibSQLStore and Memory initialized with LibSQLVector support', {
    storage: 'file:./database.db',
    vector: 'file:./database.db',
    // schema: process.env.DB_SCHEMA ?? 'mastra',
    // maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS ?? '20'),
    memoryOptions: {
        observationMemory: true,
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
            },
        },
        workingMemory: {
            enabled: true,
            scope: 'resource',
            version: 'vnext',
        },
    },
})

export const libsqlgraphQueryTool = createGraphRAGTool({
    id: 'libsql-graph-rag',
    description:
        'Graph-based retrieval augmented generation using PostgreSQL and PgVector for advanced semantic search and context retrieval.',
    // Supported vector store and index options
    vectorStore: libsqlvector,
    vectorStoreName: 'libsql-vector',
    indexName: 'memory_messages_3072',
    model: new ModelRouterEmbeddingModel('google/gemini-embedding-2-preview'),
    providerOptions: {
        google: {
            outputDimensions: 3072,
            taskType: 'RETRIEVAL_DOCUMENT',
        },
    },
    // Supported graph options (updated for 3072 dimensions)
    graphOptions: {
        dimension: 3072, // gemini-embedding-2-preview dimension (3072)
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
export const libsqlQueryTool = createVectorQueryTool({
    id: 'vector-query',
    description:
        'PostgreSQL vector similarity search using PgVector for semantic content retrieval and question answering.',
    // Supported vector store and index options
    vectorStore: libsqlvector,
    vectorStoreName: 'libsql-vector',
    indexName: 'memory_messages_3072',
    model: new ModelRouterEmbeddingModel('google/gemini-embedding-2-preview'),
    providerOptions: {
        google: {
            outputDimensions: 3072,
            taskType: 'RETRIEVAL_DOCUMENT',
        },
    },
    includeVectors: true,
    // Advanced filtering
    enableFilter: true,
    includeSources: true,
    reranker: {
        model: new ModelRouterLanguageModel(
            'google/gemini-3.1-flash-lite-preview'
        ),
        options: {
            weights: {
                semantic: 0.5, // Semantic relevance weight
                vector: 0.3, // Vector similarity weight
                position: 0.2, // Original position weight
            },
            topK: 5,
        },
    },
})
