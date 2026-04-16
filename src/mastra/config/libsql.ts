//import { google } from '@ai-sdk/google'
import { LibSQLStore, LibSQLVector } from '@mastra/libsql'
import { Memory } from '@mastra/memory'
import { log } from './logger'
import {
    ModelRouterEmbeddingModel,
    ModelRouterLanguageModel,
} from '@mastra/core/llm'
import { createGraphRAGTool, createVectorQueryTool } from '@mastra/rag'
import { fastembed, warmup } from '@mastra/fastembed'

const LIBSQL_EMBEDDING_MODEL = fastembed.base
const LIBSQL_EMBEDDING_DIMENSION = 768
const LIBSQL_INDEX_NAME = `memory_messages_${LIBSQL_EMBEDDING_DIMENSION}`

export const libsqlstorage = new LibSQLStore({
    id: 'libsql-storage',
    url: process.env.DB ?? 'file:./database.db',
    maxRetries: 5, // Optional retry configuration for transient errors
    initialBackoffMs: 100, // Initial backoff for retries
    //disableInit: process.env.DB_DISABLE_INIT === 'true', // Disable auto-init if specified
    authToken: process.env.TURSO_AUTH_TOKEN, // Optional: for Turso cloud databases
    // Additional options can be added here as needed
})


// Create a new vector store instance
export const libsqlvector = new LibSQLVector({
    id: 'libsql-vector',
    url: process.env.DB ?? 'file:./database.db',
    // Optional: for Turso cloud databases
    authToken: process.env.TURSO_AUTH_TOKEN,
    syncInterval: 10000, // Sync every 10 seconds (optional)
    syncUrl: process.env.TURSO_SYNC_URL, // Optional sync URL for distributed setups
    maxRetries: 5, // Optional retry configuration for transient errors
    initialBackoffMs: 50, // Initial backoff for retries
})

// Pre-download the FastEmbed model before Memory starts embedding messages.
await warmup()

await libsqlvector.createIndex({
    indexName: LIBSQL_INDEX_NAME,
    dimension: LIBSQL_EMBEDDING_DIMENSION,
})

export const LibsqlMemory = new Memory({
    storage: libsqlstorage,
    vector: libsqlvector,
    embedder: LIBSQL_EMBEDDING_MODEL,
    embedderOptions: {
        telemetry: {
            request: {
                log: true,
                logInputs: true,
                logOutputs: true,
            },
        },
        maxParallelCalls: 50, // Limit parallel embedding calls to avoid rate limits
    },
    options: {
        // Message management
        readOnly: false,
        observationalMemory: {
            enabled: true,
            scope: 'thread', // 'resource' | 'thread'
            model: 'google/gemini-2.5-flash',
            shareTokenBudget: false, // Don't share token budget between observation and reflection to preserve context
            observation: {
                instruction: 'You are an assistant that observes and remembers important information from the conversation. Pay attention to details, context, and any information that might be useful for future reference.',
                messageTokens: 60_000,
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
            indexName: LIBSQL_INDEX_NAME, // Index name for semantic recall
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
{{#if user.location}}Location: {{user.location}}{{/if}}
{{#if user.email}}Email: {{user.email}}{{/if}}
{{#if user.organization}}Organization: {{user.organization}}{{/if}}
{{#if user.preferences}}Preferences: {{user.preferences}}{{/if}}
{{#if user.history}}History: {{user.history}}{{/if}}

# Conversation Context
{{#if conversation.topic}}Topic: {{conversation.topic}}{{/if}}
{{#if conversation.purpose}}Purpose: {{conversation.purpose}}{{/if}}

# Additional Context
{{#each additionalContext}}
- {{this}}
- {{/each}}
`,
        },
    },
})

log.info('LibSQLStore and Memory initialized with LibSQLVector support', {
    storage: process.env.DB ?? 'file:./database.db',
    vector: process.env.DB ?? 'file:./database.db',
    outputDimensions: LIBSQL_EMBEDDING_DIMENSION,
    // schema: process.env.DB_SCHEMA ?? 'mastra',
    // maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS ?? '20'),
})

export const libsqlgraphQueryTool = createGraphRAGTool({
    id: 'libsql-graph-rag',
    description:
        'Graph-based retrieval augmented generation using PostgreSQL and PgVector for advanced semantic search and context retrieval.',
    // Supported vector store and index options
    vectorStore: libsqlvector,
    vectorStoreName: 'libsql-vector',
    indexName: LIBSQL_INDEX_NAME,
    model: LIBSQL_EMBEDDING_MODEL,
    // Supported graph options (updated for 768 dimensions)
    graphOptions: {
        dimension: LIBSQL_EMBEDDING_DIMENSION, // FastEmbed base dimension (768)
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
    indexName: LIBSQL_INDEX_NAME,
    model: LIBSQL_EMBEDDING_MODEL,
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
