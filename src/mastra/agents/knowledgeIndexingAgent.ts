import { Agent } from '@mastra/core/agent'
import { log } from '../config/logger'

import {
    documentRerankerTool,
    libsqlChunker,
} from '../tools/document-chunking.tool'
import { InternalSpans } from '@mastra/core/observability'
import { USER_ID_CONTEXT_KEY, type AgentRequestContext } from './request-context'
import { libsqlgraphQueryTool, LibsqlMemory, libsqlQueryTool } from '../config/libsql'

const INDEX_NAME_CONTEXT_KEY = 'indexName' as const
const CHUNKING_STRATEGY_CONTEXT_KEY = 'chunkingStrategy' as const

export type KnowledgeIndexingContext = AgentRequestContext<{
    [INDEX_NAME_CONTEXT_KEY]?: string
    chunkSize?: number
    chunkOverlap?: number
    [CHUNKING_STRATEGY_CONTEXT_KEY]?: string
}>

log.info('Initializing Knowledge Indexing Agent...')

const knowledgeIndexingTools = {
    documentRerankerTool,
    libsqlChunker,
    libsqlQueryTool,
    libsqlgraphQueryTool
}

export const knowledgeIndexingAgent = new Agent({
    id: 'knowledgeIndexingAgent',
    name: 'Knowledge Indexing Agent',
    description:
        'Indexes documents into PgVector for semantic search and RAG. Use for building knowledge bases, indexing content with embeddings, semantic search, and document retrieval with reranking.',
    instructions: ({ requestContext }) => {
        const rawUserId = requestContext.get(USER_ID_CONTEXT_KEY)
        const rawIndexName = requestContext.get(INDEX_NAME_CONTEXT_KEY)
        const rawChunkingStrategy = requestContext.get(CHUNKING_STRATEGY_CONTEXT_KEY)

        const userId = typeof rawUserId === 'string' ? rawUserId : 'default'
        const indexName =
            typeof rawIndexName === 'string' ? rawIndexName : 'governed_rag'
        const chunkingStrategy =
            typeof rawChunkingStrategy === 'string'
                ? rawChunkingStrategy
                : 'recursive'

        return `
# Knowledge Indexing Specialist
User: ${userId} | Index: ${indexName} | Strategy: ${chunkingStrategy}

## Tools
1. **libsqlChunker**: Index docs into PgVector with Gemini embeddings (3072d).
2. **documentRerankerTool**: Semantic search with reranking (semantic, vector, position weights).
3. **libsqlQueryTool**: Execute SQL queries against the knowledge base.
4. **libsqlgraphQueryTool**: Execute graph queries for relationship exploration.

## Use Cases
- **Knowledge Bases**: Index and query organizational knowledge.
- **Content Indexing**: Embed and index documents for semantic retrieval.
- **Semantic Search**: Retrieve relevant info with vector search and reranking.
- **Document Retrieval**: Fetch and rerank relevant documents based on queries.


## Guidelines
- **Indexing**: Read → Chunk & Embed → Return IDs.
- **Search**: Query → Rerank → Adjust topK/weights.
- **Optimization**: Smaller chunks for precision; larger for comprehension.
- **Metadata**: Include source, type, timestamp, and tags.

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.

`
    },
    model: "google/gemini-3.1-flash-lite-preview",
    memory: LibsqlMemory,
    tools: knowledgeIndexingTools,
    options: {
        tracingPolicy: {
            internal: InternalSpans.AGENT,
        },
    },
    //outputProcessors: [new TokenLimiterProcessor(1048576)],
})

log.info('Knowledge Indexing Agent initialized')
