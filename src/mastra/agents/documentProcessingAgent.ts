import { Agent } from '@mastra/core/agent'

import { log } from '../config/logger'

import { libsqlChunker, mastraChunker } from '../tools/document-chunking.tool'

//import { TokenLimiterProcessor } from '@mastra/core/processors'
import { InternalSpans } from '@mastra/core/observability'
import type { AgentRequestContext } from './request-context'
import { USER_ID_CONTEXT_KEY } from './request-context'
import { libsqlgraphQueryTool, LibsqlMemory, libsqlQueryTool } from '../config/libsql'
import { fetchTool } from '../tools'

export type DocumentProcessingContext = AgentRequestContext<{
    inputDirectory?: string
    outputDirectory?: string
    chunkSize?: number
    chunkOverlap?: number
}>

log.info('Initializing Document Processing Agent...')

const INPUT_DIRECTORY_CONTEXT_KEY = 'inputDirectory' as const
const OUTPUT_DIRECTORY_CONTEXT_KEY = 'outputDirectory' as const

const documentProcessingTools = {
    mastraChunker,
    libsqlChunker,
    libsqlQueryTool,
    libsqlgraphQueryTool,
    fetchTool,
}

export const documentProcessingAgent = new Agent({
    id: 'documentProcessingAgent',
    name: 'Document Processing Agent',
    description:
        'Converts PDFs to markdown, chunks documents for RAG, and prepares content for indexing. Use for PDF conversion, document chunking, text extraction, and content preprocessing for knowledge bases.',
    instructions: ({ requestContext }) => {
        const rawUserId = requestContext.get(USER_ID_CONTEXT_KEY)
        const rawInputDirectory = requestContext.get(INPUT_DIRECTORY_CONTEXT_KEY)
        const rawOutputDirectory = requestContext.get(OUTPUT_DIRECTORY_CONTEXT_KEY)

        const userId = typeof rawUserId === 'string' ? rawUserId : 'default'
        const inputDirectory =
            typeof rawInputDirectory === 'string'
                ? rawInputDirectory
                : './documents'
        const outputDirectory =
            typeof rawOutputDirectory === 'string'
                ? rawOutputDirectory
                : './processed'
        return `
# Document Processing Specialist
User: ${userId} | In: ${inputDirectory} | Out: ${outputDirectory}

## Tools
1. Convert PDFs to clean markdown with table detection using the workspace and sandbox tools.
2. **mastraChunker**: Chunk docs (recursive, markdown, semantic) with metadata extraction.
3. **libsqlChunker**: Chunk docs using LibSQL for efficient storage and retrieval.
4. **libsqlQueryTool**: Query LibSQL for chunk management and retrieval.
5. **libsqlgraphQueryTool**: Query LibSQLGraph for semantic relationships between chunks.
6. **fetchTool**: Fetch additional data from web sources if needed during processing.
7. **File Tools**: read, write, list, and info for data files.

## Guidelines
- **Pre-process**: Validate PDF and check disk space.
- **Convert**: Normalize text and extract tables.
- **Chunk**: Match size to embedding limits; use overlap.
- **Post-process**: Verify quality and return stats.

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
`
    },
    model: "google/gemini-3.1-flash-lite-preview",
    memory: LibsqlMemory,
    tools: documentProcessingTools,
    options: {
        tracingPolicy: {
            internal: InternalSpans.ALL,
        },
    },
    //outputProcessors: [new TokenLimiterProcessor(1048576)],
})

log.info('Document Processing Agent initialized')
