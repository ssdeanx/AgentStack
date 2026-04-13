import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { arxivTool } from '../../tools'

const inputSchema = z.object({
    query: z.string(),
    maxResults: z.number().int().positive().default(5),
    includeAbstracts: z.boolean().default(true),
})

const outputSchema = z.any()

const arxivSearchStep = createStep({
    id: 'research-arxiv-search',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `📚 Searching arXiv for ${inputData.query}`, stage: 'research-arxiv-search' }, id: 'research-arxiv-search' })
        const executeArxiv = arxivTool.execute as NonNullable<typeof arxivTool.execute>
        const result = await executeArxiv({ query: inputData.query, max_results: inputData.maxResults, include_abstract: inputData.includeAbstracts }, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ arXiv search complete', stage: 'research-arxiv-search' }, id: 'research-arxiv-search' })
        return result
    },
})

export const researchArxivSearchWorkflow = createWorkflow({
    id: 'research-arxiv-search-workflow',
    description: 'Search arXiv for papers by query',
    inputSchema,
    outputSchema,
})
    .then(arxivSearchStep)
    .commit()
