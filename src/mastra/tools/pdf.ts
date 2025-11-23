import { createTool } from '@mastra/core/tools'
import chalk from 'chalk'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { z } from 'zod'

// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import { log } from '../config/logger'

export const readPDF = createTool({
    id: 'readPDF',
    description: 'Read PDF file and extract information',
    inputSchema: z.object({
        pdfPath: z.string(),
    }),
    outputSchema: z.object({
        content: z.string(),
    }),
    execute: async ({ context, writer }) => {
        const { pdfPath } = context
        await writer?.write({ type: 'progress', data: { message: `📄 Reading PDF: ${pdfPath}` } });
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

            // Parse PDF content
            const data = await pdfParse(dataBuffer)

            log.info(chalk.blue('\n'))
            log.info(chalk.blue('PDF Information:'))
            log.info(chalk.blue('-----------------'))
            log.info(chalk.blue(`Number of pages: ${data.numpages}`))

            return { content: data.text }
        } catch (e) {
            log.error(
                `Error reading PDF: ${e instanceof Error ? e.message : String(e)}`
            )
            return {
                content: `Error scanning PDF: ${e instanceof Error ? e.message : String(e)}`,
            }
        }
    },
})
