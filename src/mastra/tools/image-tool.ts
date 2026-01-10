/**
 * @fileoverview Image processing tool for OCR, image manipulation, and conversion.
 * Provides OCR extraction via Tesseract.js and image processing via Sharp.
 */
import type { RequestContext } from '@mastra/core/request-context'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { SpanType } from '@mastra/core/observability'
import { z } from 'zod'
import { log } from '../config/logger'
import * as fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import type { PSM } from 'tesseract.js'
import { createWorker } from 'tesseract.js'

export interface ImageToolContext extends RequestContext {
    maxImageSize?: number
    defaultLanguage?: string
    userId?: string
    workspaceId?: string
}

/**
 * Extracts text from images using Tesseract OCR
 */
export const ocrTool = createTool({
    id: 'ocr',
    description:
        'Extract text from images using OCR. Supports multiple languages and provides confidence scores.',
    inputSchema: z.object({
        imagePath: z.string().describe('Path to the image file'),
        language: z
            .string()
            .default('eng')
            .describe('Language code for OCR (e.g., "eng", "spa", "fra")'),
        preserveLayout: z
            .boolean()
            .default(true)
            .describe('Preserve text layout and structure'),
        psm: z.number().default(3).describe('Tesseract page segmentation mode'),
    }),
    outputSchema: z.object({
        text: z.string().describe('Extracted text from the image'),
        confidence: z.number().describe('OCR confidence score (0-100)'),
        blocks: z
            .array(
                z.object({
                    text: z.string(),
                    bbox: z.array(z.number()),
                    type: z.enum(['text', 'table', 'figure']),
                })
            )
            .describe('Text blocks with bounding boxes'),
    }),
    execute: async (input, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext = context?.tracingContext
        const requestCtx = context?.requestContext as
            | ImageToolContext
            | undefined

        if (abortSignal?.aborted ?? false) {
            throw new Error('OCR operation cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📄 Starting OCR for ${path.basename(input.imagePath)}`,
                stage: 'ocr',
            },
            id: 'ocr',
        })

        const ocrSpan = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'ocr-extraction',
            input: { imagePath: input.imagePath, language: input.language },
            metadata: {
                'tool.id': 'ocr',
                'tool.input.imagePath': input.imagePath,
                'tool.input.language': input.language,
            },
        })

        try {
            // Verify file exists
            await fs.access(input.imagePath)

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `🔍 Processing image with Tesseract...`,
                    stage: 'ocr',
                },
                id: 'ocr',
            })

            const worker = await createWorker(input.language, undefined, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        writer?.custom({
                            type: 'data-tool-progress',
                            data: {
                                status: 'in-progress',
                                message: `🔍 OCR progress: ${Math.round(m.progress * 100)}%`,
                                stage: 'ocr',
                            },
                            id: 'ocr',
                        })
                    }
                },
            })

            await worker.setParameters({
                tessedit_pageseg_mode: input.psm as unknown as PSM,
            })

            if (abortSignal?.aborted ?? false) {
                await worker.terminate()
                ocrSpan?.error({
                    error: new Error('OCR cancelled'),
                    endSpan: true,
                })
                throw new Error('OCR operation cancelled during processing')
            }

            const { data } = await worker.recognize(input.imagePath)

            await worker.terminate()

            const blocks =
                data.blocks?.flatMap(
                    (block) =>
                        block.paragraphs?.flatMap(
                            (para) =>
                                para.lines?.map((line) => ({
                                    text: line.text,
                                    bbox: [
                                        line.bbox.x0,
                                        line.bbox.y0,
                                        line.bbox.x1,
                                        line.bbox.y1,
                                    ],
                                    type: 'text' as const,
                                })) ?? []
                        ) ?? []
                ) ?? []

            ocrSpan?.update({
                output: {
                    text: data.text,
                    confidence: data.confidence,
                    blockCount: blocks.length,
                },
                metadata: {
                    'tool.output.textLength': data.text.length,
                    'tool.output.confidence': data.confidence,
                    'tool.output.blockCount': blocks.length,
                },
            })
            ocrSpan?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ OCR complete: ${data.text.split(/\s+/).length} words, ${data.confidence.toFixed(1)}% confidence`,
                    stage: 'ocr',
                },
                id: 'ocr',
            })

            return {
                text: data.text,
                confidence: data.confidence,
                blocks,
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Unknown OCR error'
            ocrSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            throw error instanceof Error ? error : new Error(errorMessage)
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('OCR tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('OCR tool received input chunk', {
            toolCallId,
            inputTextDelta,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('OCR tool received complete input', {
            toolCallId,
            messageCount: messages.length,
            inputData: { imagePath: input.imagePath, language: input.language },
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('OCR tool completed', {
            toolCallId,
            toolName,
            outputData: {
                textLength: output.text.length,
                confidence: output.confidence,
                blockCount: output.blocks.length,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

/**
 * Processes images (resize, crop, convert, compress)
 */
export const imageProcessorTool = createTool({
    id: 'image-processor',
    description:
        'Process images: resize, crop, convert format, compress, and optimize.',
    inputSchema: z.object({
        inputPath: z.string().describe('Path to input image'),
        outputPath: z.string().describe('Path for output image'),
        operations: z
            .object({
                resize: z
                    .object({
                        width: z.number().optional(),
                        height: z.number().optional(),
                        fit: z
                            .enum([
                                'cover',
                                'contain',
                                'fill',
                                'inside',
                                'outside',
                            ])
                            .default('inside'),
                    })
                    .optional(),
                crop: z
                    .object({
                        left: z.number(),
                        top: z.number(),
                        width: z.number(),
                        height: z.number(),
                    })
                    .optional(),
                format: z
                    .enum(['jpeg', 'png', 'webp', 'avif', 'tiff'])
                    .optional(),
                quality: z.number().min(1).max(100).optional(),
                grayscale: z.boolean().default(false),
                blur: z.number().min(1).max(1000).optional(),
                sharpen: z.boolean().default(false),
                rotate: z.number().optional(),
                flip: z.boolean().default(false),
                flop: z.boolean().default(false),
            })
            .optional()
            .default(() => ({
                grayscale: false,
                sharpen: false,
                flip: false,
                flop: false,
            })),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        outputPath: z.string(),
        width: z.number(),
        height: z.number(),
        format: z.string(),
        sizeBytes: z.number(),
    }),
    execute: async (input, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext = context?.tracingContext

        if (abortSignal?.aborted ?? false) {
            throw new Error('Image processing cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🖼️ Processing image: ${path.basename(input.inputPath)}`,
                stage: 'image-processor',
            },
            id: 'image-processor',
        })

        const processSpan = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'image-processing',
            input,
            metadata: {
                'tool.id': 'image-processor',
                'tool.input.inputPath': input.inputPath,
            },
        })

        try {
            await fs.access(input.inputPath)
            const metadata = await sharp(input.inputPath).metadata()

            let pipeline = sharp(input.inputPath)
            const ops = input.operations

            if (ops.resize) {
                pipeline = pipeline.resize({
                    width: ops.resize.width,
                    height: ops.resize.height,
                    fit: ops.resize.fit,
                })
            }

            if (ops.crop) {
                pipeline = pipeline.extract({
                    left: ops.crop.left,
                    top: ops.crop.top,
                    width: ops.crop.width,
                    height: ops.crop.height,
                })
            }

            if (ops.rotate !== undefined) {
                pipeline = pipeline.rotate(ops.rotate)
            }

            if (ops.flip) {
                pipeline = pipeline.flip()
            }

            if (ops.flop) {
                pipeline = pipeline.flop()
            }
            if (ops.grayscale) {
                pipeline = pipeline.grayscale()
            }
            if (ops.blur !== null) {
                pipeline = pipeline.blur(ops.blur)
            }
            if (ops.sharpen) {
                pipeline = pipeline.sharpen()
            }

            if (ops.format) {
                pipeline = pipeline.toFormat(ops.format, {
                    quality: ops.quality,
                })
            } else if (ops.quality) {
                pipeline = pipeline
                    .jpeg({ quality: ops.quality })
                    .png({ compressionLevel: 9 })
                    .webp({ quality: ops.quality })
            }

            await pipeline.toFile(input.outputPath)

            const outputMetadata = await sharp(input.outputPath).metadata()
            const fileStat = await fs.stat(input.outputPath)
            const sizeBytes = fileStat.size

            processSpan?.update({
                output: {
                    success: true,
                    outputPath: input.outputPath,
                    width: outputMetadata.width,
                    height: outputMetadata.height,
                    format: outputMetadata.format || 'unknown',
                    sizeBytes,
                },
                metadata: {
                    'tool.output.width': outputMetadata.width,
                    'tool.output.height': outputMetadata.height,
                    'tool.output.sizeBytes': sizeBytes,
                },
            })
            processSpan?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Image processed: ${outputMetadata.width}x${outputMetadata.height}`,
                    stage: 'image-processor',
                },
                id: 'image-processor',
            })

            return {
                success: true,
                outputPath: input.outputPath,
                width: outputMetadata.width ?? 0,
                height: outputMetadata.height ?? 0,
                format: outputMetadata.format ?? 'unknown',
                sizeBytes,
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Unknown error'
            processSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            throw error instanceof Error ? error : new Error(errorMessage)
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Image processor tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Image processor tool received input chunk', {
            toolCallId,
            inputTextDelta,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Image processor tool received complete input', {
            toolCallId,
            messageCount: messages.length,
            inputData: {
                inputPath: input.inputPath,
                outputPath: input.outputPath,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Image processor tool completed', {
            toolCallId,
            toolName,
            outputData: {
                success: output.success,
                width: output.width,
                height: output.height,
                sizeBytes: output.sizeBytes,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

/**
 * Converts images to markdown format with OCR and layout analysis
 */
export const imageToMarkdownTool = createTool({
    id: 'image-to-markdown',
    description:
        'Convert images to structured markdown with OCR text and layout analysis.',
    inputSchema: z.object({
        imagePath: z.string().describe('Path to image file'),
        extractTables: z
            .boolean()
            .default(true)
            .describe('Detect and format tables'),
        extractLists: z
            .boolean()
            .default(true)
            .describe('Detect and format lists'),
        headingLevel: z
            .number()
            .min(1)
            .max(6)
            .default(2)
            .describe('Base heading level for detected headings'),
    }),
    outputSchema: z.object({
        markdown: z.string().describe('Generated markdown content'),
        metadata: z.object({
            imageDimensions: z.object({
                width: z.number(),
                height: z.number(),
            }),
            wordCount: z.number(),
            lineCount: z.number(),
            hasTables: z.boolean(),
            hasLists: z.boolean(),
            hasHeadings: z.boolean(),
        }),
    }),
    execute: async (input, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext = context?.tracingContext

        if (abortSignal?.aborted ?? false) {
            throw new Error('Image to markdown conversion cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📝 Converting image to markdown: ${path.basename(input.imagePath)}`,
                stage: 'image-to-markdown',
            },
            id: 'image-to-markdown',
        })

        const convertSpan = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'image-to-markdown',
            input: {
                imagePath: input.imagePath,
                extractTables: input.extractTables,
                extractLists: input.extractLists,
            },
            metadata: {
                'tool.id': 'image-to-markdown',
                'tool.input.imagePath': input.imagePath,
            },
        })

        try {
            // First run OCR
            const ocrResult = await ocrTool.execute(
                {
                    imagePath: input.imagePath,
                    language: 'eng',
                    preserveLayout: true,
                    psm: 1,
                },
                context
            )

            if (abortSignal?.aborted ?? false) {
                throw new Error('Conversion cancelled during OCR')
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `📋 Generating structured markdown...`,
                    stage: 'image-to-markdown',
                },
                id: 'image-to-markdown',
            })

            // Get image metadata
            const metadata = await sharp(input.imagePath).metadata()

            // Simple markdown generation (could be enhanced with ML for layout analysis)
            let markdown = ''

            // Type guard to check if OCR result is successful and has text
            if (!('text' in ocrResult) || !ocrResult.text) {
                convertSpan?.error({
                    error: new Error('OCR failed to extract text from image'),
                    endSpan: true,
                })
                throw new Error('OCR failed to extract text from image')
            }

            const lines = ocrResult.text
                .split('\n')
                .filter((l: string) => l.trim())

            let inList = false
            let inTable = false
            let tableRows: string[][] = []

            for (const line of lines) {
                const trimmed = line.trim()

                // Detect list items
                if (/^[\d]+\.?\s/.test(trimmed) || /^[-*]\s/.test(trimmed)) {
                    if (inTable) {
                        markdown +=
                            tableRows
                                .map((r) => `| ${r.join(' | ')} |`)
                                .join('\n') + '\n\n'
                        tableRows = []
                        inTable = false
                    }
                    markdown += `- ${trimmed.replace(/^[\d]+\.\s*|^[-*]\s*/, '')}\n`
                    inList = true
                    continue
                }

                // Detect table-like structures (multiple separators)
                if (trimmed.includes('|') && input.extractTables) {
                    const cells = trimmed
                        .split('|')
                        .map((c: string) => c.trim())
                        .filter((c: string) => c)
                    if (cells.length >= 2) {
                        inList = false
                        inTable = true
                        tableRows.push(cells)
                        continue
                    }
                }

                // Detect headings (all caps or short lines)
                if (
                    trimmed.length > 0 &&
                    trimmed.length < 80 &&
                    /^[A-Z\s\d]+$/.test(trimmed)
                ) {
                    if (inTable) {
                        markdown +=
                            tableRows
                                .map((r) => `| ${r.join(' | ')} |`)
                                .join('\n') + '\n\n'
                        tableRows = []
                        inTable = false
                    }
                    if (inList) {
                        inList = false
                    }
                    const level = Math.min(input.headingLevel, 6)
                    markdown += `${'#'.repeat(level)} ${trimmed}\n\n`
                    continue
                }

                // Regular paragraph
                if (trimmed.length > 0) {
                    if (inTable) {
                        markdown +=
                            tableRows
                                .map((r) => `| ${r.join(' | ')} |`)
                                .join('\n') + '\n\n'
                        tableRows = []
                        inTable = false
                    }
                    if (inList) {
                        inList = false
                    }
                    markdown += trimmed + '\n\n'
                }
            }

            // Close any open table
            if (inTable && tableRows.length > 0) {
                markdown +=
                    tableRows.map((r) => `| ${r.join(' | ')} |`).join('\n') +
                    '\n\n'
            }

            const hasTables = markdown.includes('|')
            const hasLists = markdown.includes('- ')
            const hasHeadings = markdown.includes('#')

            convertSpan?.update({
                output: {
                    markdown,
                    metadata: {
                        imageDimensions: {
                            width: metadata.width || 0,
                            height: metadata.height || 0,
                        },
                        wordCount: ocrResult.text.split(/\s+/).length,
                        lineCount: lines.length,
                        hasTables,
                        hasLists,
                        hasHeadings,
                    },
                },
                metadata: {
                    'tool.output.wordCount': ocrResult.text.split(/\s+/).length,
                    'tool.output.hasTables': hasTables,
                },
            })
            convertSpan?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Markdown generated: ${ocrResult.text.split(/\s+/).length} words`,
                    stage: 'image-to-markdown',
                },
                id: 'image-to-markdown',
            })

            return {
                markdown,
                metadata: {
                    imageDimensions: {
                        width: metadata.width || 0,
                        height: metadata.height || 0,
                    },
                    wordCount: ocrResult.text.split(/\s+/).length,
                    lineCount: lines.length,
                    hasTables,
                    hasLists,
                    hasHeadings,
                },
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Unknown error'
            convertSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            throw error instanceof Error ? error : new Error(errorMessage)
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Image to markdown tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Image to markdown tool received input chunk', {
            toolCallId,
            inputTextDelta,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Image to markdown tool received complete input', {
            toolCallId,
            messageCount: messages.length,
            inputData: { imagePath: input.imagePath },
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Image to markdown tool completed', {
            toolCallId,
            toolName,
            outputData: {
                wordCount: output.metadata.wordCount,
                lineCount: output.metadata.lineCount,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export type OcrUITool = InferUITool<typeof ocrTool>
export type ImageProcessorUITool = InferUITool<typeof imageProcessorTool>
export type ImageToMarkdownUITool = InferUITool<typeof imageToMarkdownTool>
