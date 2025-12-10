
import { createTool } from '@mastra/core/tools'
import chalk from 'chalk'
import { existsSync, readFileSync } from 'fs'
import  * as path from 'path'
import { z } from 'zod'
import { log } from '../config/logger'
import { trace } from "@opentelemetry/api";
import type { RequestContext } from '@mastra/core/request-context';

type PdfParseFunction = (buffer: Buffer, options?: { max?: number; version?: string }) => Promise<{ numpages: number; text: string }>

// Lazy-loaded pdf-parse to avoid ESM export issues
let pdfParse: PdfParseFunction | null = null

async function getPdfParse(): Promise<PdfParseFunction> {
  if (pdfParse) {return pdfParse}
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
  execute: async (inputData, context) => {
    const writer = context?.writer;
    const tracingContext = context?.tracingContext;

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'read-pdf',
      input: { pdfPath: inputData.pdfPath },
    });

    const { pdfPath } = inputData
    await writer?.custom({ type: 'data-tool-progress', data: { message: `📄 Reading PDF: ${pdfPath}` } });
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

      span?.end({ output: { pageCount: data.numpages, textLength: data.text.length } });
      return { content: data.text }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      log.error(
        `Error reading PDF: ${errorMsg}`
      )
      span?.error({ error: e instanceof Error ? e : new Error(errorMsg), endSpan: true });
      return {
        content: `Error scanning PDF: ${errorMsg}`,
      }
    }
  },
})
