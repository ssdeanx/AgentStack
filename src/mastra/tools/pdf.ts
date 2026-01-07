import { createTool } from '@mastra/core/tools'
import { SpanStatusCode, trace } from '@opentelemetry/api'
import chalk from 'chalk'
import { existsSync, readFileSync } from 'node:fs'
import * as path from 'node:path'
import { z } from 'zod'
import { log } from '../config/logger'

import { extractText, getDocumentProxy } from 'unpdf'

export const readPDF = createTool({
    id: 'readPDF',
    description: 'Read PDF file and extract information',
    inputSchema: z.object({
        pdfPath: z.string(),
    }),
    outputSchema: z.object({
        content: z.string(),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('readPDF tool input streaming started', {
            toolCallId,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('readPDF received input chunk', {
            toolCallId,
            inputTextDelta,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('readPDF received input', {
            toolCallId,
            inputData: {
                pdfPath: input.pdfPath,
            },
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('readPDF completed', {
            toolCallId,
            toolName,
            outputData: {
                content: output.content,
            },
            hook: 'onOutput',
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer

        const tracer = trace.getTracer('tools/read-pdf')
        const span = tracer.startSpan('read-pdf', {
            attributes: { pdfPath: inputData.pdfPath, service: 'unpdf' },
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
            // Check if file exists
            if (!existsSync(pdfPath)) {
                throw new Error('PDF file not found')
            }

            // Check if file is a PDF
            if (path.extname(pdfPath).toLowerCase() !== '.pdf') {
                throw new Error('File is not a PDF')
            }

            // Read the PDF file
            const dataBuffer = readFileSync(pdfPath)

            // Parse PDF content using unpdf
            const pdf = await getDocumentProxy(new Uint8Array(dataBuffer))
            const { totalPages, text } = await extractText(pdf, {
                mergePages: true,
            })

            log.info(chalk.blue('\n'))
            log.info(chalk.blue('PDF Information:'))
            log.info(chalk.blue('-----------------'))
            log.info(chalk.blue(`Number of pages: ${totalPages}`))

            span?.setAttribute('pageCount', totalPages)
            span?.setAttribute('textLength', text.length)
            span?.end()
            return { content: text }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`Error reading PDF: ${errorMsg}`)
            span?.recordException(e instanceof Error ? e : new Error(errorMsg))
            span?.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg })
            span?.end()
            return {
                content: `Error scanning PDF: ${errorMsg}`,
            }
        }
    },
})
