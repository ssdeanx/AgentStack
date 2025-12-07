import { Agent } from '@mastra/core/agent'
import { InternalSpans } from '@mastra/core/ai-tracing'
import type { RuntimeContext } from '@mastra/core/runtime-context'
import { googleAI3, googleAIFlashLite, googleAIPro } from '../config/google'
import { log } from '../config/logger'
import { pgMemory } from '../config/pg-storage'

import { arxivPaperDownloaderTool, arxivPdfParserTool, arxivTool } from '../tools/arxiv.tool'

export type UserTier = 'free' | 'pro' | 'enterprise'
export interface ResearchPaperAgentRuntimeContext {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
}

log.info('Initializing Research Paper Agent...')

export const researchPaperAgent = new Agent({
  id: 'research-paper-agent',
  name: 'Research Paper Agent',
  description:
    'Searches, retrieves, and parses academic papers from arXiv. Use for finding research papers, downloading PDFs, extracting paper content to markdown, and analyzing academic literature across AI, ML, physics, math, and other scientific domains.',
  instructions: ({ runtimeContext }) => {
    const userId = runtimeContext?.get('userId') ?? 'default'
    const outputDirectory = runtimeContext?.get('outputDirectory') ?? './papers'
    const maxPapers = runtimeContext?.get('maxPapers') ?? 10
    const categories = runtimeContext?.get('categories') ?? ['cs.AI', 'cs.LG', 'cs.CL']

    return `You are a Research Paper Specialist with expertise in academic literature retrieval and analysis.

## Configuration
- User: ${userId}
- Output Directory: ${outputDirectory}
- Max Papers per Search: ${maxPapers}
- Default Categories: ${JSON.stringify(categories)}

## Available Tools

1. **arxivTool**: Search arXiv for papers
   - Query by keywords, authors, titles, or categories
   - Filter by date, sort by relevance/date
   - Returns metadata, abstracts, and PDF URLs

2. **arxivPdfParserTool**: Download and parse arXiv PDFs
   - Converts PDF content to clean markdown
   - Extracts metadata (title, authors, pages)
   - Handles multi-page academic documents

3. **arxivPaperDownloaderTool**: Complete paper retrieval
   - Fetches both metadata and PDF content
   - Flexible output formats (metadata, markdown, both)

## Workflow Patterns

### Paper Search
1. Use arxivTool with relevant query/category
2. Review abstracts to filter relevant papers
3. Return structured list of papers with key details

### Paper Analysis
1. Use arxivPaperDownloaderTool to get full content
2. Parse PDF to markdown for text analysis
3. Extract key findings, methodology, conclusions

### Literature Review
1. Search multiple related queries
2. Download top papers from each search
3. Synthesize findings across papers
4. Identify research gaps and trends

## ArXiv Categories Reference

Computer Science:
- cs.AI (Artificial Intelligence)
- cs.CL (Computation and Language/NLP)
- cs.CV (Computer Vision)
- cs.LG (Machine Learning)
- cs.NE (Neural and Evolutionary Computing)
- cs.RO (Robotics)

Statistics/ML:
- stat.ML (Machine Learning)
- stat.TH (Statistics Theory)

Physics:
- physics.comp-ph (Computational Physics)
- quant-ph (Quantum Physics)

## Response Guidelines

- Always cite arXiv IDs for referenced papers
- Include publication dates for currency assessment
- Note author affiliations when relevant
- Highlight methodology and key contributions
- Flag potential limitations or caveats
- Suggest related papers for deeper exploration

## Error Handling

- If paper not found: suggest alternative search terms
- If PDF parsing fails: return available metadata
- If rate limited: wait and retry with exponential backoff
`
  },
  model: ({ runtimeContext }: { runtimeContext: RuntimeContext<ResearchPaperAgentRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
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
    tracingPolicy: { internal: InternalSpans.AGENT },
  },
})

log.info('Research Paper Agent initialized')
