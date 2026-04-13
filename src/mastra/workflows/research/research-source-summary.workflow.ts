import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { fetchTool, textAnalysisTool } from '../../tools'

const inputSchema = z.object({
    url: z.string().optional(),
    query: z.string().optional(),
})

const outputSchema = z.any()

const summaryStep = createStep({
    id: 'research-source-summary',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        const target = inputData.url ?? inputData.query ?? 'unknown source'
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🌐 Fetching source content for ${target}`, stage: 'research-source-summary' }, id: 'research-source-summary' })
        const executeFetch = fetchTool.execute as NonNullable<typeof fetchTool.execute>
        const fetched = await executeFetch({ url: inputData.url, query: inputData.query, includeContent: true }, { writer, requestContext, tracingContext, abortSignal })
        const executeTextAnalysis = textAnalysisTool.execute as NonNullable<typeof textAnalysisTool.execute>
        const analysis = await executeTextAnalysis({ text: JSON.stringify(fetched), operations: ['summary', 'word-count', 'readability'] }, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Source summary complete', stage: 'research-source-summary' }, id: 'research-source-summary' })
        return { fetched, analysis }
    },
})

export const researchSourceSummaryWorkflow = createWorkflow({
    id: 'research-source-summary-workflow',
    description: 'Fetch a source and produce a text summary',
    inputSchema,
    outputSchema,
})
    .then(summaryStep)
    .commit()
