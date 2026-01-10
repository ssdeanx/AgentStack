// Kilocode: Tool Approval
// owner: team-data
// justification: PDF parsing and markdown conversion for RAG indexing
// allowedDomains: []
// allowedDataPaths:
//  - corpus/
// sideEffects:
//  - network: false
//  - write: false
//  - sideload: unpdf (serverless-optimized, no dynamic import required)
// inputSchema: src/mastra/schemas/tool-schemas.ts::PdfConversionInput
// outputSchema: src/mastra/schemas/tool-schemas.ts::PdfConversionOutput
// approvedBy: sam
// approvalDate: 10/18

import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { SpanType } from '@mastra/core/observability'
import { marked } from 'marked'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { z } from 'zod'
import {
    log,
    logError,
    logStepEnd,
    logStepStart,
    logToolExecution,
} from '../config/logger'
import type { RequestContext } from '@mastra/core/request-context'

export interface PdfDataConversionContext extends RequestContext {
    userId?: string
}

// Use `unpdf` for parsing PDFs (serverless-optimized PDF.js build)
import { extractText, getDocumentProxy } from 'unpdf'

// Type definitions
export interface PdfContent {
    text: string
    numpages: number
    metadata?: Record<string, string | number | boolean>
    producedBy?: string
    creationDate?: Date
    modificationDate?: Date
    title?: string
    author?: string
    subject?: string
    keywords?: string
}

export interface MarkdownConversionResult {
    markdown: string
    frontmatter: Record<string, string | number | boolean | string[]>
    lineCount: number
    headingCount: number
    codeBlockCount: number
    linkCount: number
}

export interface TableExtractionResult {
    tableCount: number
    tables: Array<{
        index: number
        rows: string[][]
        markdown: string
    }>
}

export interface ImageExtractionResult {
    imageCount: number
    images: Array<{
        index: number
        type: string
        size?: number
    }>
}

// ============================================================================
// SUB-TOOLS (Helper Functions for Composable Processing)
// ============================================================================

/**
 * Sub-tool: Extract raw text from PDF buffer
 * Handles multi-page PDFs and complex content
 */
async function extractPdfText(
    pdfBuffer: Buffer,
    options: {
        maxPages?: number
        skipImages?: boolean
    } = {}
): Promise<PdfContent> {
    const MAX_PAGES_DEFAULT = 1000
    const maxPages = options.maxPages ?? MAX_PAGES_DEFAULT

    try {
        const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer))
        const { totalPages, text } = await extractText(pdf, {
            mergePages: true,
        })

        logStepStart('pdf-text-extraction', {
            pages: totalPages,
            textLength: text?.length ?? 0,
        })

        return {
            text: text ?? '',
            numpages: Math.min(totalPages ?? 1, maxPages),
            metadata: {},
            producedBy: undefined,
            creationDate: undefined,
            modificationDate: undefined,
            title: undefined,
            author: undefined,
            subject: undefined,
            keywords: undefined,
        }
    } catch (error) {
        logError('pdf-text-extraction', error, {
            bufferSize: pdfBuffer.length,
        })
        throw error
    }
}

/**
 * Sub-tool: Extract and structure PDF metadata
 * Returns document information useful for markdown frontmatter
 */
async function extractPdfMetadata(pdfContent: PdfContent): Promise<{
    title: string
    author: string
    subject: string
    keywords: string[]
    pageCount: number
    extractedAt: string
    contentPreview: string
}> {
    const metadata = {
        title: pdfContent.title ?? 'Untitled Document',
        author: pdfContent.author ?? 'Unknown Author',
        subject: pdfContent.subject ?? '',
        keywords: (pdfContent.keywords ?? '')
            .split(',')
            .map((k: string) => k.trim())
            .filter((k: string) => k.length > 0),
        pageCount: pdfContent.numpages,
        extractedAt: new Date().toISOString(),
        contentPreview: pdfContent.text.substring(0, 200).trim(),
    }

    logStepStart('pdf-metadata-extraction', metadata)
    return metadata
}

/**
 * Sub-tool: Normalize and clean PDF text
 * Removes artifacts and improves markdown conversion
 */
function normalizePdfText(rawText: string): string {
    return (
        rawText
            // Remove excessive whitespace while preserving structure
            .replace(/\f/g, '\n\n') // Form feeds to double newlines
            .replace(/\r\n/g, '\n') // Normalize line endings
            .replace(/\n\n\n+/g, '\n\n') // Multiple newlines to double
            .replace(/\t/g, '  ') // Tabs to spaces
            // Remove common PDF artifacts
            .replace(/©\s*/g, '© ')
            .replace(/®\s*/g, '® ')
            // Clean up hyphenated words (often broken across pages)
            .replace(/(\w+)-\n(\w+)/g, '$1$2')
            // Improve spacing around punctuation
            .replace(/\s+([.,!?;:])/g, '$1')
            .trim()
    )
}

/**
 * Sub-tool: Convert normalized text to markdown format
 * Applies markdown formatting and structure
 */
function convertToMarkdown(normalizedText: string): MarkdownConversionResult {
    let markdown = normalizedText

    // Apply heading detection (heuristic: all-caps lines, short lines after newlines)
    const lines = markdown.split('\n')
    const processedLines: string[] = []

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()

        // Skip empty lines but preserve structure
        if (trimmed.length === 0) {
            processedLines.push('')
            continue
        }

        // Detect potential headings
        const prevLine = i > 0 ? lines[i - 1]?.trim() : ''
        const isLikelyHeading =
            (trimmed.length < 80 && trimmed === trimmed.toUpperCase()) ||
            (trimmed.length < 60 &&
                prevLine.length === 0 &&
                /^[A-Z]/.test(trimmed) &&
                trimmed.split(' ').length <= 5)

        if (isLikelyHeading && i > 0) {
            // Convert to markdown heading based on position heuristic
            const headingLevel = trimmed.length > 60 ? 3 : 2
            processedLines.push(`${'#'.repeat(headingLevel)} ${trimmed}`)
        } else {
            processedLines.push(line)
        }
    }

    markdown = processedLines.join('\n')

    // Count markdown elements
    const headingCount = (markdown.match(/^#+\s/gm) ?? []).length
    const codeBlockCount = (markdown.match(/```/g) ?? []).length / 2
    const linkCount = (markdown.match(/\[.*?\]\(.*?\)/g) ?? []).length
    const lineCount = markdown.split('\n').length

    logStepStart('markdown-conversion', {
        lineCount,
        headingCount,
        codeBlockCount,
        linkCount,
    })

    return {
        markdown,
        frontmatter: {
            format: 'markdown',
            convertedAt: new Date().toISOString(),
            source: 'pdf',
        },
        lineCount,
        headingCount,
        codeBlockCount,
        linkCount,
    }
}

/**
 * Sub-tool: Extract tables from text using heuristics
 * Detects tabular data and converts to markdown table format
 */
function extractTables(text: string): TableExtractionResult {
    const tables: TableExtractionResult['tables'] = []
    const lines = text.split('\n')

    // Simple heuristic: sequences of lines with consistent column separators
    let tableLines: string[] = []
    let tableStart = -1

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const columnCount = (line.match(/\t/g) ?? []).length

        if (columnCount >= 2) {
            if (tableStart === -1) {
                tableStart = i
            }
            tableLines.push(line)
        } else if (tableLines.length > 0) {
            // End of table detected
            const rows = tableLines.map((l) =>
                l.split('\t').map((cell) => cell.trim())
            )
            const markdown = convertTableToMarkdown(rows)
            tables.push({
                index: tables.length,
                rows,
                markdown,
            })
            tableLines = []
            tableStart = -1
        }
    }

    // Handle final table if exists
    if (tableLines.length > 0) {
        const rows = tableLines.map((l) =>
            l.split('\t').map((cell) => cell.trim())
        )
        const markdown = convertTableToMarkdown(rows)
        tables.push({
            index: tables.length,
            rows,
            markdown,
        })
    }

    logStepStart('table-extraction', { tableCount: tables.length })

    return {
        tableCount: tables.length,
        tables,
    }
}

/**
 * Helper: Convert table rows to markdown format
 */
function convertTableToMarkdown(rows: string[][]): string {
    if (rows.length === 0) {
        return ''
    }

    const lines: string[] = []

    // Header row
    lines.push('| ' + rows[0].join(' | ') + ' |')

    // Separator row
    lines.push('| ' + rows[0].map(() => '---').join(' | ') + ' |')

    // Data rows
    for (let i = 1; i < rows.length; i++) {
        lines.push('| ' + rows[i].join(' | ') + ' |')
    }

    return lines.join('\n')
}

/**
 * Sub-tool: Extract image references
 * Detects and counts images in PDF
 */
function extractImageReferences(pdfBuffer: Buffer): ImageExtractionResult {
    // Simple heuristic: PDF structure analysis
    const bufferString = pdfBuffer.toString('latin1')

    // Count image objects in PDF structure
    const imageCount = (bufferString.match(/\/XObject/g) ?? []).length

    logStepStart('image-extraction', { imageCount })

    return {
        imageCount,
        images: Array.from({ length: imageCount }, (_, i) => ({
            index: i,
            type: 'embedded',
            size: undefined,
        })),
    }
}

// ============================================================================
// MAIN TOOL: PDF to Markdown Conversion
// ============================================================================

/**
 * Input schema for PDF to Markdown conversion
 */
const PdfToMarkdownInputSchema = z.object({
    pdfPath: z
        .string()
        .describe('File path to the PDF file (relative or absolute)'),
    maxPages: z
        .number()
        .optional()
        .default(1000)
        .describe('Maximum number of pages to extract'),
    includeMetadata: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include metadata in frontmatter'),
    includeTables: z
        .boolean()
        .optional()
        .default(true)
        .describe('Extract and format tables'),
    includeImages: z
        .boolean()
        .optional()
        .default(false)
        .describe('Track image references'),
    outputFormat: z
        .enum(['markdown', 'json', 'html'])
        .optional()
        .default('markdown')
        .describe('Output format (markdown, json, or html)'),
    normalizeText: z
        .boolean()
        .optional()
        .default(true)
        .describe('Apply text normalization and cleanup'),
})

/**
 * Output schema for PDF to Markdown conversion
 */
const PdfToMarkdownOutputSchema = z.object({
    success: z.boolean(),
    format: z.string(),
    content: z.string(),
    // Fix: z.record requires a key and value schema in this Zod version
    metadata: z.record(z.string(), z.unknown()).optional(),
    statistics: z.object({
        pageCount: z.number(),
        lineCount: z.number(),
        headingCount: z.number(),
        codeBlockCount: z.number(),
        linkCount: z.number(),
        tableCount: z.number(),
        imageCount: z.number(),
        processingTimeMs: z.number(),
    }),
    warnings: z.array(z.string()).optional(),
    error: z.string().optional(),
})

export const pdfToMarkdownTool = createTool({
    id: 'pdfToMarkdown:Tool',
    description: `
PDF to Markdown Data Conversion Tool

Convert PDF files to structured markdown format with comprehensive feature extraction:

Features:
- ✅ Sideloaded PDF parsing (avoids demo content parsing errors)
- 📝 Text extraction from multi-page PDFs
- 📊 Automatic table detection and markdown formatting
- 🖼️ Image reference tracking
- 🏷️ Metadata extraction (title, author, subject, keywords)
- 🔤 Text normalization and artifact removal
- 📈 Heading and structure detection
- ⚙️ Performance monitoring with AI tracing
- 🛡️ Comprehensive error handling

Sub-tools included:
- extractPdfText: Raw text extraction
- extractPdfMetadata: Document metadata
- normalizePdfText: Text cleanup
- convertToMarkdown: Format conversion
- extractTables: Table detection
- extractImageReferences: Image counting

Perfect for RAG indexing, documentation conversion, and content processing.
  `,
    inputSchema: PdfToMarkdownInputSchema,
    outputSchema: PdfToMarkdownOutputSchema,
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('pdfToMarkdownTool tool input streaming started', {
            toolCallId,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('pdfToMarkdownTool received input chunk', {
            toolCallId,
            inputTextDelta,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('pdfToMarkdownTool received input', {
            toolCallId,
            inputData: {
                pdfPath: input.pdfPath,
                maxPages: input.maxPages,
                includeMetadata: input.includeMetadata,
                includeTables: input.includeTables,
                includeImages: input.includeImages,
                outputFormat: input.outputFormat,
                normalizeText: input.normalizeText,
            },
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('pdfToMarkdownTool completed', {
            toolCallId,
            toolName,
            outputData: {
                success: output.success,
                format: output.format,
                metadata: output.metadata,
                statistics: output.statistics,
                warnings: output.warnings,
                error: output.error,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
    execute: async (inputData, context) => {
        const startTime = Date.now()
        logToolExecution('pdf-to-markdown', { input: inputData })
        const requestContext = context?.requestContext as PdfDataConversionContext | undefined

        await context?.writer?.custom({
            type: 'data-tool-progress',
            data: {
                message: `📄 Converting PDF to Markdown: ${inputData.pdfPath}`,
            },
        })

        // Create root tracing span
        const tracingContext = context?.tracingContext
        const rootSpan = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'pdf-to-markdown-tool',
            input: { pdfPath: inputData.pdfPath, maxPages: inputData.maxPages },
            metadata: { 'tool.id': 'pdfToMarkdown', 'tool.input.pdfPath': inputData.pdfPath, normalization: inputData.normalizeText, operation: 'pdf-to-markdown' }
        })
        // Note: nested child spans will be created from tracingContext or rootSpan as needed
        const warnings: string[] = []
        try {
            // Validate file path
            const absolutePath = path.isAbsolute(inputData.pdfPath)
                ? inputData.pdfPath
                : path.resolve(process.cwd(), inputData.pdfPath)
            logStepStart('pdf-file-validation', { path: absolutePath })
            // Check file exists and is readable
            const fileStats = await fs.stat(absolutePath)
            if (!fileStats.isFile()) {
                throw new Error(`Path is not a file: ${absolutePath}`)
            }
            if (!absolutePath.toLowerCase().endsWith('.pdf')) {
                warnings.push('File does not have .pdf extension')
            }
            // Size check (warn if > 50MB)
            const sizeMB = fileStats.size / (1024 * 1024)
            if (sizeMB > 50) {
                warnings.push(
                    `Large PDF detected (${sizeMB.toFixed(2)}MB) - processing may be slow`
                )
            }
            // Read PDF file
            const readSpan = rootSpan?.createChildSpan({ type: SpanType.TOOL_CALL, name: 'read-pdf-file', input: { filePath: absolutePath }, metadata: { 'tool.id': 'read-pdf-file', 'filePath': absolutePath, 'sizeBytes': fileStats.size } })
            const readStart = Date.now()
            const pdfBuffer = await fs.readFile(absolutePath)
            const readDuration = Date.now() - readStart
            readSpan?.end()
            // Provide size and read duration to match logger signature (name, payload, durationMs)
            logStepEnd(
                'pdf-file-read',
                { size: pdfBuffer.length },
                readDuration
            )
            // Extract text using unpdf (serverless PDF.js build)
            const extractSpan = rootSpan?.createChildSpan({ type: SpanType.TOOL_CALL, name: 'extract-pdf-text', input: { maxPages: inputData.maxPages }, metadata: { 'tool.id': 'extract-pdf-text', maxPages: inputData.maxPages } })

            const pdfContent = await extractPdfText(pdfBuffer, {
                maxPages: inputData.maxPages,
            })
            extractSpan?.update({ output: { pages: pdfContent.numpages, textLength: pdfContent.text.length } })
            extractSpan?.end()

            // Extract metadata
            const metadataSpan = rootSpan?.createChildSpan({ type: SpanType.TOOL_CALL, name: 'extract-metadata', input: {}, metadata: { 'tool.id': 'extract-metadata' } })

            const metadata = await extractPdfMetadata(pdfContent)
            metadataSpan?.update({ output: metadata })
            metadataSpan?.end()

            // Normalize text if requested
            let processedText = pdfContent.text
            if (inputData.normalizeText) {
                const normalizeSpan = rootSpan?.createChildSpan({ type: SpanType.TOOL_CALL, name: 'normalize-text', input: { textLength: processedText.length }, metadata: { 'tool.id': 'normalize-text', textLength: processedText.length } })

                processedText = normalizePdfText(processedText)
                normalizeSpan?.update({ output: { newLength: processedText.length } })
                normalizeSpan?.end()
            }

            // Convert to markdown
            const markdownSpan = rootSpan?.createChildSpan({ type: SpanType.TOOL_CALL, name: 'convert-to-markdown', input: {}, metadata: { 'tool.id': 'convert-to-markdown' } })
            const markdownResult = convertToMarkdown(processedText)
            markdownSpan?.update({ output: { lineCount: markdownResult.lineCount, headingCount: markdownResult.headingCount } })
            markdownSpan?.end()

            // Extract tables if requested
            let tableResult: TableExtractionResult = {
                tableCount: 0,
                tables: [],
            }
            if (inputData.includeTables) {
                const tableSpan = rootSpan?.createChildSpan({ type: SpanType.TOOL_CALL, name: 'extract-tables', input: {}, metadata: { 'tool.id': 'extract-tables' } })

                tableResult = extractTables(processedText)
                tableSpan?.update({ output: { tableCount: tableResult.tableCount } })
                tableSpan?.end()
            }

            // Extract images if requested
            let imageResult: ImageExtractionResult = {
                imageCount: 0,
                images: [],
            }
            if (inputData.includeImages) {
                const imageSpan = rootSpan?.createChildSpan({ type: SpanType.TOOL_CALL, name: 'extract-images', input: {}, metadata: { 'tool.id': 'extract-images' } })

                imageResult = extractImageReferences(pdfBuffer)
                imageSpan?.update({ output: { imageCount: imageResult.imageCount } })
                imageSpan?.end()
            }

            // Build final content based on format
            let finalContent = ''
            const outputMetadata: Record<string, unknown> = {}

            if (inputData.includeMetadata) {
                // Add YAML frontmatter
                const frontmatter = {
                    title: metadata.title,
                    author: metadata.author,
                    subject: metadata.subject,
                    keywords: metadata.keywords,
                    pages: metadata.pageCount,
                    source: 'pdf',
                    extractedAt: metadata.extractedAt,
                }

                outputMetadata['metadata'] = metadata
                outputMetadata['frontmatter'] = frontmatter

                if (inputData.outputFormat === 'markdown') {
                    finalContent = `---\n${Object.entries(frontmatter)
                        .map(
                            ([k, v]) =>
                                `${k}: ${typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}`
                        )
                        .join('\n')}\n---\n\n`
                }
            }

            // Add main content based on format
            switch (inputData.outputFormat) {
                case 'html': {
                    // Convert markdown to HTML using marked
                    finalContent += await marked(markdownResult.markdown)
                    break
                }
                case 'json': {
                    finalContent = JSON.stringify(
                        {
                            format: 'json',
                            metadata: outputMetadata,
                            content: markdownResult.markdown,
                            statistics: {
                                pageCount: pdfContent.numpages,
                                lineCount: markdownResult.lineCount,
                                headingCount: markdownResult.headingCount,
                                codeBlockCount: markdownResult.codeBlockCount,
                                linkCount: markdownResult.linkCount,
                                tableCount: tableResult.tableCount,
                                imageCount: imageResult.imageCount,
                            },
                        },
                        null,
                        2
                    )
                    break
                }
                case 'markdown':
                default: {
                    finalContent += markdownResult.markdown

                    // Append table section if found
                    if (tableResult.tableCount > 0) {
                        finalContent += '\n\n## Tables\n\n'
                        tableResult.tables.forEach((table) => {
                            finalContent += `### Table ${table.index + 1}\n\n${table.markdown}\n\n`
                        })
                    }

                    // Append images section if found
                    if (imageResult.imageCount > 0) {
                        finalContent += `\n\n## Images\n\nThis document contains ${imageResult.imageCount} embedded image(s).\n`
                    }
                    break
                }
            }

            const totalProcessingTime = Date.now() - startTime

            const output = {
                success: true,
                format: inputData.outputFormat,
                content: finalContent,
                metadata: inputData.includeMetadata
                    ? outputMetadata
                    : undefined,
                statistics: {
                    pageCount: pdfContent.numpages,
                    lineCount: markdownResult.lineCount,
                    headingCount: markdownResult.headingCount,
                    codeBlockCount: markdownResult.codeBlockCount,
                    linkCount: markdownResult.linkCount,
                    tableCount: tableResult.tableCount,
                    imageCount: imageResult.imageCount,
                    processingTimeMs: totalProcessingTime,
                },
                warnings: warnings.length > 0 ? warnings : undefined,
            }

            logStepEnd('pdf-to-markdown', output, totalProcessingTime)

            // End root tracing span
            rootSpan?.update({ output, metadata: { 'tool.output.success': true } })
            rootSpan?.end()

            return output
        } catch (error) {
            const processingTime = Date.now() - startTime
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error occurred'

            logError('pdf-to-markdown', error, {
                inputData,
                processingTimeMs: processingTime,
            })

            // Record error in tracing span
            rootSpan?.error({ error: error instanceof Error ? error : new Error(errorMessage), endSpan: true })

            return {
                success: false,
                format: inputData.outputFormat ?? 'markdown',
                content: '',
                statistics: {
                    pageCount: 0,
                    lineCount: 0,
                    headingCount: 0,
                    codeBlockCount: 0,
                    linkCount: 0,
                    tableCount: 0,
                    imageCount: 0,
                    processingTimeMs: processingTime,
                },
                warnings:
                    warnings.length > 0
                        ? [...warnings, errorMessage]
                        : [errorMessage],
            }
        }
    },
})

export type PdfToMarkdownUITool = InferUITool<typeof pdfToMarkdownTool>
// ============================================================================
// EXPORTS FOR SUB-TOOL TESTING AND COMPOSITION
// ============================================================================

export {
    convertTableToMarkdown,
    convertToMarkdown,
    extractImageReferences,
    extractPdfMetadata,
    extractPdfText,
    extractTables,
    normalizePdfText,
}
