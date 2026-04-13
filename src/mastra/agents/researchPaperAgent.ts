import { Agent } from '@mastra/core/agent'
import { log } from '../config/logger'

import { InternalSpans } from '@mastra/core/observability'
import {
  TokenLimiterProcessor
} from '@mastra/core/processors'
import {
  arxivPaperDownloaderTool,
  arxivPdfParserTool,
  arxivTool,
} from '../tools/arxiv.tool'
import {
  getLanguageFromContext,
  getRoleFromContext,
  type AgentRequestContext,
} from './request-context'
import { google } from '../config'
import { LibsqlMemory } from '../config/libsql'

export type ResearchPaperAgentRuntimeContext = AgentRequestContext

const researchPaperTools = {
  arxivTool,
  arxivPdfParserTool,
  arxivPaperDownloaderTool,
  google_search: google.tools.googleSearch({}),
  url_context: google.tools.urlContext({}),
}

log.info('Initializing Research Paper Agent...')

/**
 * Research Paper Agent.
 *
 * Finds academic papers, downloads PDFs, and extracts paper content for analysis.
 */
export const researchPaperAgent = new Agent({
  id: 'researchPaperAgent',
  name: 'Research Paper Agent',
  description:
    'Searches, retrieves, and parses academic papers from arXiv. Use for finding research papers, downloading PDFs, extracting paper content to markdown, and analyzing academic literature across AI, ML, physics, math, and other scientific domains.',
  instructions: ({ requestContext }) => {
    const role = getRoleFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)
    return `
# Research Paper Specialist
User: ${role} | Lang: ${language}

## Tools
1. **arxivTool**: Search arXiv by keywords, authors, or categories.
2. **arxivPdfParserTool**: Parse PDFs to clean markdown with metadata.
3. **arxivPaperDownloaderTool**: Retrieve both metadata and PDF content.

## Guidelines
- **Search**: Filter by date; review abstracts.
- **Analyze**: Extract findings, methodology, and conclusions.
- **Review**: Synthesize across papers; identify gaps.
- **Response**: Cite arXiv IDs; highlight contributions.

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
`
  },
  model: ({ requestContext }) => {
    const role = requestContext.get('role') ?? 'user'
    if (role === 'admin') {
      // higher quality (chat style) for admin
      return "google/gemini-3.1-flash-preview"
    }
    // cheaper/faster model for user tier
    return "google/gemini-3.1-flash-lite-preview"
  },
  memory: LibsqlMemory,
  tools: researchPaperTools,
  options: {
    tracingPolicy: {
      internal: InternalSpans.ALL,
    },
  },
  outputProcessors: [
    new TokenLimiterProcessor(128000),
    //    new BatchPartsProcessor({
    //        batchSize: 5,
    //        maxWaitTime: 75,
    //        emitOnNonText: true,
    //    }),
  ],
  //  defaultOptions: {
  //      autoResumeSuspendedTools: true,
  //  },
})

log.info('Research Paper Agent initialized')
