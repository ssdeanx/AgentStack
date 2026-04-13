import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { arxivPaperDownloaderTool } from '../../tools'

const inputSchema = z.object({
    arxivId: z.string(),
    includePdfContent: z.boolean().default(false),
    maxPages: z.number().int().positive().default(100),
    format: z.enum(['metadata', 'markdown', 'both']).default('both'),
})

const outputSchema = z.any()

const arxivDownloadStep = createStep({
    id: 'research-arxiv-download',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `📄 Downloading arXiv paper ${inputData.arxivId}`, stage: 'research-arxiv-download' }, id: 'research-arxiv-download' })
        const executeArxivDownload = arxivPaperDownloaderTool.execute as NonNullable<typeof arxivPaperDownloaderTool.execute>
        const result = await executeArxivDownload({ arxivId: inputData.arxivId, includePdfContent: inputData.includePdfContent, maxPages: inputData.maxPages, format: inputData.format }, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ arXiv download complete', stage: 'research-arxiv-download' }, id: 'research-arxiv-download' })
        return result
    },
})

export const researchArxivDownloadWorkflow = createWorkflow({
    id: 'research-arxiv-download-workflow',
    description: 'Download arXiv metadata and optional PDF content',
    inputSchema,
    outputSchema,
})
    .then(arxivDownloadStep)
    .commit()
