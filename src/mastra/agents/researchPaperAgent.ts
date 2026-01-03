import { Agent } from '@mastra/core/agent'
import type { RequestContext } from '@mastra/core/request-context'
import { googleAI3, googleAIFlashLite, googleAIPro } from '../config/google'
import { log } from '../config/logger'
import { pgMemory } from '../config/pg-storage'

import { BatchPartsProcessor, TokenLimiterProcessor } from '@mastra/core/processors'
import { arxivPaperDownloaderTool, arxivPdfParserTool, arxivTool } from '../tools/arxiv.tool'

export type UserTier = 'free' | 'pro' | 'enterprise'
export interface ResearchPaperAgentRuntimeContext {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
}

log.info('Initializing Research Paper Agent...')

export const researchPaperAgent = new Agent({
  id: 'researchPaperAgent',
  name: 'Research Paper Agent',
  description:
    'Searches, retrieves, and parses academic papers from arXiv. Use for finding research papers, downloading PDFs, extracting paper content to markdown, and analyzing academic literature across AI, ML, physics, math, and other scientific domains.',
  instructions: ({ requestContext }: { requestContext: RequestContext<ResearchPaperAgentRuntimeContext> }) => {

    const userTier = requestContext?.get('user-tier') ?? 'free'
    const language = requestContext?.get('language') ?? 'en'
    return `
# Research Paper Specialist
User: ${userTier} | Lang: ${language}

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
  model: ({ requestContext }: { requestContext: RequestContext<ResearchPaperAgentRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') {
      // higher quality (chat style) for enterprise
      return googleAIPro
    } else if (userTier === 'pro') {
      // Chat bison for pro as well
      return googleAI3
    }
    // cheaper/faster model for free tier
    return googleAIFlashLite
  },
  memory: pgMemory,
  tools: {
    arxivTool,
    arxivPdfParserTool,
    arxivPaperDownloaderTool,
  },
  options: {
    tracingPolicy: {},
  },
  outputProcessors: [new TokenLimiterProcessor(128000), new BatchPartsProcessor({
    batchSize: 5,
    maxWaitTime: 75,
    emitOnNonText: true
  })]
})

log.info('Research Paper Agent initialized')
