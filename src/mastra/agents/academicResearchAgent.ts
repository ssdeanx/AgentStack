import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import type { RequestContext } from '@mastra/core/request-context'

import { google } from '../config/google'
import { log } from '../config/logger'
import { pgMemory } from '../config/pg-storage'

import {
    //    serpapiSearchTool,
    //    serpapiAcademicTool,
    arxivTool,
    //    pdfTool,
    //    documentChunkingTool,
    //   dataValidatorTool,
} from '../tools'

import { extractLearningsTool } from '../tools/extractLearningsTool'
import { InternalSpans } from '@mastra/core/observability'

type UserTier = 'free' | 'pro' | 'enterprise'

export interface AcademicResearchRuntimeContext {
    'user-tier': UserTier
    language: 'en' | 'es' | 'ja' | 'fr'
    userId?: string
    researchType?: 'quick' | 'deep' | 'systematic'
}

log.info('Initializing Academic Research Agent...')

export const academicResearchAgent = new Agent({
    id: 'academicResearchAgent',
    name: 'Academic Research Agent',
    description:
        'Expert at finding and analyzing academic papers, research articles, and scholarly sources. Performs systematic literature reviews and knowledge extraction.',
    instructions: ({
        requestContext,
    }: {
        requestContext: RequestContext<AcademicResearchRuntimeContext>
    }) => {
        const userTier = requestContext.get('user-tier') ?? 'free'
        const language = requestContext.get('language') ?? 'en'
        const researchType = requestContext.get('researchType') ?? 'quick'

        return {
            role: 'system',
            content: `
# Academic Research Specialist
Tier: ${userTier} | Lang: ${language} | Type: ${researchType}

## Expertise
- Academic paper discovery and retrieval
- Scholarly search across multiple databases
- PDF processing and text extraction
- Document chunking for large papers
- Systematic literature reviews
- Citation management

## Tool Selection Guide
- **General Search**: Use 'serpapiSearchTool' for broad academic queries.
- **Academic Search**: Use 'serpapiAcademicTool' for scholarly sources.
- **ArXiv Papers**: Use 'arxivTool' for preprints and research papers.
- **PDF Processing**: Use 'pdfTool' to extract text from PDF documents.
- **Document Chunking**: Use 'documentChunkingTool' to split large papers.
- **Data Validation**: Use 'dataValidatorTool' to ensure data quality.
- **Insight Extraction**: Use 'extractLearningsTool' to surface key findings.

## Research Protocol
1. **Discovery**: Use academic search tools to find relevant papers.
2. **Retrieval**: Download and process PDF documents.
3. **Extraction**: Extract and structure relevant information.
4. **Analysis**: Synthesize findings across multiple sources.
5. **Validation**: Cross-verify claims and data.

## Rules
- **Citations**: Always include proper citations with DOI, title, authors.
- **Quality**: Prioritize peer-reviewed sources over preprints.
- **Comprehensiveness**: Cover multiple perspectives and methodologies.
- **Sourcing**: Track all sources with metadata.
- **Critical Thinking**: Evaluate methodology and limitations.

## Output Format
Provide structured research with:
- Executive summary of key findings
- Detailed analysis of top papers
- Citation list with DOIs and links
- Methodology comparison
- Gaps and future research directions
- Confidence levels for claims

${
    researchType === 'systematic'
        ? `
## Systematic Review Protocol
1. Define search strategy and inclusion criteria
2. Search multiple databases comprehensively
3. Screen abstracts and full texts systematically
4. Extract data using standardized forms
5. Assess risk of bias
6. Synthesize findings with meta-analysis when possible
`
        : ''
}
`,
            providerOptions: {
                google: {
                    responseModalities: ['TEXT'],
                    thinkingConfig: {
                        includeThoughts: true,
                        thinkingLevel: 'high',
                    },
                } satisfies GoogleGenerativeAIProviderOptions,
            },
        }
    },
    model: ({
        requestContext,
    }: {
        requestContext: RequestContext<AcademicResearchRuntimeContext>
    }) => {
        const userTier = requestContext.get('user-tier') ?? 'free'
        if (userTier === 'enterprise') {
            return google.chat('gemini-3-pro-preview')
        } else if (userTier === 'pro') {
            return 'google/gemini-3-flash-preview'
        }
        return google.chat('gemini-3-flash-preview')
    },
    tools: {
        // serpapiSearchTool,
        //  serpapiAcademicTool,
        arxivTool,
        //   pdfTool,
        //  documentChunkingTool,
        //   dataValidatorTool,
        extractLearningsTool,
    },
    memory: pgMemory,
    options: {
        tracingPolicy: {
            internal: InternalSpans.ALL,
        },
    },
    maxRetries: 3,
    defaultOptions: {
        autoResumeSuspendedTools: true,
    },
})
