import { createTool } from '@mastra/core/tools'
import chalk from 'chalk'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { z } from 'zod'
import { log } from '../config/logger'

type PdfParseFunction = (buffer: Buffer) => Promise<{ text: string; numpages: number }>

// Lazy-loaded pdf-parse to avoid ESM export issues
let pdfParse: PdfParseFunction | null = null

async function getPdfParse(): Promise<PdfParseFunction> {
    if (pdfParse) return pdfParse
    try {
        const mod = await import('pdf-parse') as unknown as { default?: PdfParseFunction }
        pdfParse = (mod.default ?? mod) as unknown as PdfParseFunction
        return pdfParse
    } catch {
        throw new Error('pdf-parse module not available')
    }
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
            const parser = await getPdfParse()
            const data = await parser(dataBuffer)

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
