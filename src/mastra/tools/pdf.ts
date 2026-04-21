import { createTool } from '@mastra/core/tools'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import chalk from 'chalk'
import { z } from 'zod'
import { mainFilesystem } from '../workspaces'
import { log } from '../config/logger'
import type { RequestContext } from '@mastra/core/request-context'

import { extractText, getDocumentProxy } from 'unpdf'

export interface PdfToolContext extends RequestContext {
    userId?: string
}

export const readPDF = createTool({
    id: 'readPDF',
    description: 'Read PDF file and extract information',
    inputSchema: z.object({
        pdfPath: z.string(),
    }),
    outputSchema: z.object({
        content: z.string(),
    }),
    strict: true,
    onInputStart: ({ toolCallId, messages }) => {
        log.info('readPDF tool input streaming started', {
            toolCallId,
            messages: messages ?? [],
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages }) => {
        log.info('readPDF received input chunk', {
            toolCallId,
            inputTextDelta,
            messages: messages ?? [],
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages }) => {
        log.info('readPDF received input', {
            toolCallId,
            messages: messages ?? [],
            inputData: {
                pdfPath: input.pdfPath,
            },
            hook: 'onInputAvailable',
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer
        const span = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'read-pdf',
            input: { pdfPath: inputData.pdfPath },
            metadata: {
                'tool.id': 'readPDF',
                'tool.input.pdfPath': inputData.pdfPath,
                service: 'unpdf',
            },
        })

        const { pdfPath } = inputData
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📄 Reading PDF: ${pdfPath}`,
                stage: 'readPDF',
            },
            id: 'readPDF',
        })
        try {
            // Read the PDF file using mainFilesystem
            const dataBuffer = await mainFilesystem.readFile(pdfPath)

            // Parse PDF content using unpdf
            const pdf = await getDocumentProxy(new Uint8Array(dataBuffer as Buffer))
            const { totalPages, text } = await extractText(pdf, {
                mergePages: true,
            })

            log.info(chalk.blue('\n'))
            log.info(chalk.blue('PDF Information:'))
            log.info(chalk.blue('-----------------'))
            log.info(chalk.blue(`Number of pages: ${totalPages}`))

            span?.update({
                output: { content: text },
                metadata: {
                    'tool.output.pageCount': totalPages,
                    'tool.output.textLength': text.length,
                },
            })
            span?.end()
            return { content: text }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`Error reading PDF: ${errorMsg}`)
            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true,
            })
            return {
                content: `Error scanning PDF: ${errorMsg}`,
            }
        }
    },
    toModelOutput: (output: { content: string }) => ({
        type: 'text',
        value: output.content,
    }),
    onOutput: ({ output, toolCallId, toolName }) => {
        log.info('readPDF completed', {
            toolCallId,
            toolName,
            outputData: {
                contentLength: output.content.length,
            },
            hook: 'onOutput',
        })
    },
})
