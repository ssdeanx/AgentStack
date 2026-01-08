import { LanceVectorStore, LanceStorage } from '@mastra/lance'
import { createVectorQueryTool, createGraphRAGTool } from '@mastra/rag'
import { google } from '@ai-sdk/google'
import { embedMany } from 'ai'
import { log } from './logger
import { Memory } from '@mastra/memory'

/**
 * LanceDB Vector configuration for the Governed RAG system
 * Uses LanceDB for vector storage and similarity search
 */

// Configuration constants
const LANCE_CONFIG = {
    dbPath: process.env.LANCE_DB_PATH ?? '/tmp/lance_db',
    tableName: process.env.LANCE_TABLE_NAME ?? 'governed_rag',
    // Google Gemini gemini-embedding-001 supports flexible dimensions: 128-3072
    // Recommended: 768, 1536, 3072
    embeddingDimension: parseInt(
        process.env.LANCE_EMBEDDING_DIMENSION ?? '1536'
    ),
    embeddingModel: google.textEmbedding('gemini-embedding-001'),
} as const

// LanceDB Storage configuration constants
const LANCE_STORAGE_CONFIG = {
    // Storage database configuration
    storageName: process.env.LANCE_STORAGE_NAME ?? 'governed-rag-storage',
    dbUri: process.env.LANCE_DB_URI ?? '/tmp/lance_storage_db',
    // Storage options
    storageOptions: {
        timeout: process.env.LANCE_STORAGE_TIMEOUT ?? '60s',
    },
    // Table prefix for environment isolation
    tablePrefix: process.env.LANCE_STORAGE_TABLE_PREFIX ?? 'dev_',
} as const


// Using LanceStorage.create with uri, name, and prefix as per Mastra v1 storage specs
export const lanceStorage = await LanceStorage.create(
    LANCE_STORAGE_CONFIG.dbUri,
    LANCE_STORAGE_CONFIG.storageName,
    LANCE_STORAGE_CONFIG.tablePrefix
)

const vectorStore = await LanceVectorStore.create("/path/to/db");


/**
 * LanceDB Memory instance configured like pgMemory (pg-storage.ts)
 */
export const lanceMemory = new Memory({
    storage: lanceStorage,
    vector: vectorStore,
    embedder: google.textEmbedding('gemini-embedding-001'),
    options: {
        generateTitle: process.env.LANCE_THREAD_GENERATE_TITLE !== 'false',
        // Message management
        lastMessages: parseInt(process.env.LANCE_MEMORY_LAST_MESSAGES ?? '500'),
        // Advanced semantic recall with LanceDB configuration
        semanticRecall: {
            topK: parseInt(process.env.LANCE_SEMANTIC_TOP_K ?? '5'),
            messageRange: {
                before: parseInt(
                    process.env.LANCE_SEMANTIC_RANGE_BEFORE ?? '3'
                ),
                after: parseInt(process.env.LANCE_SEMANTIC_RANGE_AFTER ?? '2'),
            },
            scope: 'resource', // 'resource' | 'thread'
            // LanceDB-specific index configuration
            indexConfig: {},
        },
        // Enhanced working memory with supported template
        workingMemory: {
            enabled: true,
            scope: 'resource', // 'resource' | 'thread'
            version: 'vnext', // Enable the improved/experimental tool
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
})

log.info('LanceDB Memory configured with comprehensive settings', {
    storageName: LANCE_STORAGE_CONFIG.storageName,
    dbUri: LANCE_STORAGE_CONFIG.dbUri,
    memoryOptions: {
        lastMessages: parseInt(process.env.LANCE_MEMORY_LAST_MESSAGES ?? '500'),
        semanticRecall: {
            topK: parseInt(process.env.LANCE_SEMANTIC_TOP_K ?? '5'),
        },
        workingMemory: {
            enabled: true,
            version: 'vnext',
        },
    },
})

/**
 * LanceDB-compatible filter format for vector queries
 * Supports Sift query syntax for metadata filtering
 *
 * LanceDB-specific features:
 * - Supports advanced filtering with nested conditions
 * - Payload (metadata) fields must be explicitly indexed for filtering
 * - Efficient handling of geo-spatial queries
 * - Special handling for null and empty values
 * - Vector-specific filtering capabilities
 * - Datetime values must be in RFC 3339 format
 */
export interface LanceMetadataFilter {
    [key: string]:
        | string
        | number
        | boolean
        | LanceMetadataFilter
        | LanceMetadataFilter[]
        | Array<string | number | boolean>
        | undefined
}

/**
 * Raw LanceDB filter format expected by the library
 * Using Record<string, unknown> for compatibility with @mastra/lance types
 */
export type LanceRawFilter = Record<string, unknown>

// Graph-based RAG tool using LanceDB
export const lanceGraphTool = createGraphRAGTool({
    id: 'lance-graph-rag',
    description:
        'Graph-based retrieval augmented generation using LanceDB for advanced semantic search and context retrieval.',
    // Supported vector store and index options
    vectorStoreName: 'lanceStore',
    indexName: LANCE_CONFIG.tableName,
    model: LANCE_CONFIG.embeddingModel,
    // Supported graph options for LanceDB
    graphOptions: {
        dimension: LANCE_CONFIG.embeddingDimension,
        threshold: parseFloat(process.env.LANCE_GRAPH_THRESHOLD ?? '0.7'),
        randomWalkSteps: parseInt(
            process.env.LANCE_GRAPH_RANDOM_WALK_STEPS ?? '10'
        ),
        restartProb: parseFloat(process.env.LANCE_GRAPH_RESTART_PROB ?? '0.15'),
    },
    includeSources: true,
    // Filtering and ranking
    enableFilter: true,
})

// LanceDB query tool for semantic search
export const lanceQueryTool = createVectorQueryTool({
    id: 'lance-vector-query',
    description:
        'LanceDB similarity search for semantic content retrieval and question answering.',
    // Supported vector store and index options
    vectorStoreName: 'lanceStore',
    indexName: LANCE_CONFIG.tableName,
    model: LANCE_CONFIG.embeddingModel,
    // Supported database configuration for LanceDB
    databaseConfig: {
        lanceDb: {
            minScore: parseFloat(process.env.LANCE_MIN_SCORE ?? '0.7'),
            // LanceDB specific parameters
            maxResults: parseInt(process.env.LANCE_MAX_RESULTS ?? '100'),
        },
    },
    includeVectors: true,
    // Advanced filtering
    enableFilter: true,
    includeSources: true,
})

/**
 * Transform LanceDB metadata filter to raw filter format
 * Handles any necessary conversions between our interface and library expectations
 */
export function transformToLanceFilter(
    filter: LanceMetadataFilter
): LanceRawFilter {
    // For LanceDB, the filter format is already compatible
    // This function can be expanded if any transformations are needed
    return filter as LanceRawFilter
}

/**
 * Validate LanceDB metadata filter according to documented constraints
 */
export function validateLanceFilter(
    filter: LanceMetadataFilter
): LanceMetadataFilter {
    // Basic validation - LanceDB has specific requirements for indexed fields
    if (filter === null || typeof filter !== 'object') {
        throw new Error('Filter must be a valid object')
    }

    return filter
}

/**
 * Generate embeddings for text content using LanceDB configuration
 */
export async function generateEmbeddings(
    texts: string[],
    options: {
        model?: string
        dimensions?: number
    } = {}
): Promise<number[][]> {
    try {
        const model = options.model ?? LANCE_CONFIG.embeddingModel
        const { embeddings } = await embedMany({
            values: texts,
            model,
        })

        log.info('Embeddings generated successfully', {
            textCount: texts.length,
            embeddingDimension: embeddings[0]?.length,
            model: options.model ?? 'gemini-embedding-001',
        })

        return embeddings
    } catch (error) {
        log.error('Failed to generate embeddings', { error: String(error) })
        throw error
    }
}

/**
 * Format storage messages for LanceDB-specific requirements
 */
export function formatStorageMessages(
    messages: Array<{
        id: string
        content: string
        role: string
        createdAt?: Date
        metadata?: Record<string, unknown>
    }>
): Array<{
    id: string
    content: string
    role: string
    createdAt: Date
    metadata: Record<string, unknown>
}> {
    return messages.map((message) => ({
        id: message.id,
        content: message.content,
        role: message.role,
        createdAt: message.createdAt ?? new Date(),
        metadata: message.metadata ?? {},
    }))
}

/**
 * Perform storage operations with LanceDB-specific error handling and tracing
 */
export async function performStorageOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    metadata: Record<string, unknown> = {}
): Promise<T> {
    const startTime = Date.now()

    try {
        log.info(
            `Starting LanceDB storage operation: ${operationName}`,
            metadata
        )

        const result = await operation()

        const duration = Date.now() - startTime
        log.info(`LanceDB storage operation completed: ${operationName}`, {
            ...metadata,
            duration,
            success: true,
        })

        return result
    } catch (error) {
        const duration = Date.now() - startTime
        log.error(`LanceDB storage operation failed: ${operationName}`, {
            ...metadata,
            duration,
            error: String(error),
            success: false,
        })
        throw error
    }
}

// Export configuration for external use
export { LANCE_CONFIG, LANCE_STORAGE_CONFIG }
