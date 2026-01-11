import { Agent } from '@mastra/core/agent'
import { google3, googleAIFlashLite } from '../config/google'
import { log } from '../config/logger'
import { pgMemory } from '../config/pg-storage'
import { listDataDirTool, readDataFileTool } from '../tools/data-file-manager'
import { documentRerankerTool, mdocumentChunker } from '../tools/document-chunking.tool'
import type { RequestContext } from '@mastra/core/request-context'
import { TokenLimiterProcessor } from '@mastra/core/processors'

type UserTier = 'free' | 'pro' | 'enterprise'
export interface KnowledgeIndexingContext {
  userId?: string
  indexName?: string
  chunkSize?: number
  chunkOverlap?: number
  chunkingStrategy?: string
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
}

log.info('Initializing Knowledge Indexing Agent...')

export const knowledgeIndexingAgent = new Agent({
  id: 'knowledgeIndexingAgent',
  name: 'Knowledge Indexing Agent',
  description:
    'Indexes documents into PgVector for semantic search and RAG. Use for building knowledge bases, indexing content with embeddings, semantic search, and document retrieval with reranking.',
  instructions: ({ requestContext }: { requestContext: RequestContext<KnowledgeIndexingContext> }) => {
    const userId = requestContext.get('userId') ?? 'default'
    const indexName = requestContext.get('indexName') ?? 'governed_rag'
    const chunkSize = requestContext.get('chunkSize') ?? 512
    const chunkOverlap = requestContext.get('chunkOverlap') ?? 50
    const chunkingStrategy = requestContext.get('chunkingStrategy') ?? 'recursive'

    return `
# Knowledge Indexing Specialist
User: ${userId} | Index: ${indexName} | Strategy: ${chunkingStrategy}

## Tools
1. **mdocumentChunker**: Index docs into PgVector with Gemini embeddings (3072d).
2. **documentRerankerTool**: Semantic search with reranking (semantic, vector, position weights).
3. **File Tools**: read and list data files.

## Guidelines
- **Indexing**: Read → Chunk & Embed → Return IDs.
- **Search**: Query → Rerank → Adjust topK/weights.
- **Optimization**: Smaller chunks for precision; larger for comprehension.
- **Metadata**: Include source, type, timestamp, and tags.

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
`
  },
  model: google3,
  memory: pgMemory,
  tools: {
    mdocumentChunker,
    documentRerankerTool,
    readDataFileTool,
    listDataDirTool,
  },
  outputProcessors: [new TokenLimiterProcessor(1048576)]
})

log.info('Knowledge Indexing Agent initialized')
