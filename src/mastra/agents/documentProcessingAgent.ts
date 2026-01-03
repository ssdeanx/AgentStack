import { Agent } from '@mastra/core/agent'

import { googleAI3 } from '../config/google'
import { pgMemory } from '../config/pg-storage'
import { log } from '../config/logger'

import { pdfToMarkdownTool } from '../tools/pdf-data-conversion.tool'
import { mastraChunker } from '../tools/document-chunking.tool'
import { readDataFileTool, writeDataFileTool, listDataDirTool, getDataFileInfoTool } from '../tools/data-file-manager'
import type { RequestContext } from '@mastra/core/request-context'
import { TokenLimiterProcessor } from '@mastra/core/processors'

export interface DocumentProcessingContext {
    userId?: string
    inputDirectory?: string
    outputDirectory?: string
    chunkSize?: number
    chunkOverlap?: number
}

log.info('Initializing Document Processing Agent...')

export const documentProcessingAgent = new Agent({
  id: 'documentProcessingAgent',
    name: 'Document Processing Agent',
    description:
        'Converts PDFs to markdown, chunks documents for RAG, and prepares content for indexing. Use for PDF conversion, document chunking, text extraction, and content preprocessing for knowledge bases.',
    instructions: ({ requestContext }: { requestContext: RequestContext<DocumentProcessingContext> }) => {
        const userId = requestContext.get('userId') ?? 'default'
        const inputDirectory = requestContext.get('inputDirectory') ?? './documents'
        const outputDirectory = requestContext.get('outputDirectory') ?? './processed'
        const chunkSize = requestContext.get('chunkSize') ?? 512
        const chunkOverlap = requestContext.get('chunkOverlap') ?? 50

        return `
# Document Processing Specialist
User: ${userId} | In: ${inputDirectory} | Out: ${outputDirectory}

## Tools
1. **pdfToMarkdownTool**: Convert PDFs to clean markdown with table detection.
2. **mastraChunker**: Chunk docs (recursive, markdown, semantic) with metadata extraction.
3. **File Tools**: read, write, list, and info for data files.

## Guidelines
- **Pre-process**: Validate PDF and check disk space.
- **Convert**: Normalize text and extract tables.
- **Chunk**: Match size to embedding limits; use overlap.
- **Post-process**: Verify quality and return stats.

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
`
   },
   model: googleAI3,
   memory: pgMemory,
   tools: {
      pdfToMarkdownTool,
      mastraChunker,
      readDataFileTool,
      writeDataFileTool,
      listDataDirTool,
      getDataFileInfoTool,
   },
   outputProcessors: [new TokenLimiterProcessor(1048576)]
})

log.info('Document Processing Agent initialized')
