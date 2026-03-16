import type { RequestContext } from '@mastra/core/request-context'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import type { TracingContext } from '@mastra/core/observability'
import excalidrawToSvg from 'excalidraw-to-svg'
import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import svgjson from 'svgjson'
import { z } from 'zod'
import { log } from '../config/logger'

// Type for SVG JSON nodes from svgjson
interface SvgJsonNode {
    name?: string
    attributes?: Record<string, string>
    children?: SvgJsonNode[]
    text?: string
    content?: string
}

// Define runtime context for these tools
export interface DataProcessingContext extends RequestContext {
    userId?: string
    workspaceId?: string
    format?: 'csv' | 'json' | 'xml' | 'svg' | 'excalidraw'
}

// Type definition for XML element info collected by processXMLTool
interface XmlElementInfo {
    tagName: string
    textContent?: string | null
    attributes: Record<string, string>
    children: XmlElementInfo[]
}

// Type for extracted data produced by processXMLTool
type ExtractedData = Record<
    string,
    XmlElementInfo[] | Array<{ element: string; value: string }>
>

// Type for processSVGTool result
interface ProcessSVGResult {
    svgJson: SvgJsonNode
    paths?: SvgJsonNode[]
    textElements?: string[]
    styles?: Record<string, string>
    dimensions: {
        width?: number
        height?: number
        viewBox?: string
    }
    elementCount: number
}

const DATA_DIR = path.join(process.cwd(), 'file: ./data')

/**
 * Ensures the given filePath is within the DATA_DIR.
 */
function validateDataPath(filePath: string): string {
    const absolutePath = path.resolve(DATA_DIR, filePath)
    if (!absolutePath.startsWith(DATA_DIR)) {
        throw new Error(
            `Access denied: File path "${filePath}" is outside the allowed data directory.`
        )
    }
    return absolutePath
}

// Excalidraw element schema
const ExcalidrawElementSchema = z.object({
    id: z.string(),
    type: z.enum([
        'rectangle',
        'ellipse',
        'diamond',
        'arrow',
        'text',
        'line',
        'freedraw',
        'image',
    ]),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    text: z.string().optional(),
    strokeColor: z.string().default('#000000'),
    backgroundColor: z.string().default('transparent'),
    fillStyle: z.enum(['solid', 'hachure', 'cross-hatch']).default('solid'),
    strokeWidth: z.number().default(2),
    strokeStyle: z.enum(['solid', 'dashed', 'dotted']).default('solid'),
    roughness: z.number().default(1),
    opacity: z.number().default(100),
    angle: z.number().default(0),
    points: z.array(z.array(z.number())).optional(),
    startBinding: z.unknown().optional(),
    endBinding: z.unknown().optional(),
    arrowheads: z.unknown().optional(),
    fontSize: z.number().optional(),
    fontFamily: z.number().optional(),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
    verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
    groupIds: z.array(z.string()).optional(),
    frameId: z.string().nullable().optional(),
    roundness: z.unknown().optional(),
    seed: z.number().default(Math.floor(Math.random() * 1000000)),
    version: z.number().default(1),
    versionNonce: z.number().default(Math.floor(Math.random() * 1000000)),
    isDeleted: z.boolean().default(false),
    boundElements: z.unknown().optional(),
    updated: z.number().default(Date.now()),
    link: z.string().nullable().optional(),
    locked: z.boolean().default(false),
})

const ExcalidrawSchema = z.object({
    type: z.literal('excalidraw'),
    version: z.number(),
    source: z.string(),
    elements: z.array(ExcalidrawElementSchema),
    appState: z.object({
        gridSize: z.number().nullable().optional(),
        gridStep: z.number().optional(),
        gridModeEnabled: z.boolean().optional(),
        viewBackgroundColor: z.string(),
    }),
    files: z.record(z.string(), z.unknown()).optional(),
})

// Type aliases derived from Zod schemas to avoid using `any`
type ExcalidrawElementType = z.infer<typeof ExcalidrawElementSchema>

const CSVRowSchema = z.record(z.string(), z.string())

/**
 * Reads and parses CSV data from a file
 */
export const readCSVDataTool = createTool({
    id: 'read:CSVdata',
    description: 'Reads and parses CSV data from a file in the data directory',
    inputSchema: z.object({
        fileName: z
            .string()
            .describe('The name of the CSV file (relative to data directory)'),
        hasHeaders: z.boolean().optional().default(true),
        delimiter: z.string().optional().default(','),
    }),
    outputSchema: z.object({
        headers: z.array(z.string()).optional(),
        rows: z.array(CSVRowSchema),
        rawCSV: z.string(),
    }),

    execute: async (inputData, context) => {
        const writer = context?.writer

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '📖 Reading CSV file: ' + inputData.fileName,
                stage: 'read:CSVdata',
            },
            id: 'read:CSVdata',
        })

        const tracingContext: TracingContext | undefined =
            context?.tracingContext
        const span = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'read_csv_data',
            input: inputData,
            metadata: {
                'tool.id': 'read:CSVdata',
                'tool.input.fileName': inputData.fileName,
            },
        })

        try {
            const { fileName, hasHeaders = true, delimiter = ',' } = inputData
            const fullPath = validateDataPath(fileName)
            const realFullPath = await fs.realpath(fullPath)

            if (!realFullPath.startsWith(DATA_DIR)) {
                throw new Error(
                    `Access denied: File path is outside allowed directory`
                )
            }

            const content = await fs.readFile(realFullPath, 'utf-8')
            const lines = content.trim().split('\n')

            let headers: string[] = []
            const rows: Array<z.infer<typeof CSVRowSchema>> = []

            if (hasHeaders && lines.length > 0) {
                headers = lines[0]
                    .split(delimiter)
                    .map((h) => h.trim().replace(/"/g, ''))
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i]
                        .split(delimiter)
                        .map((v) => v.trim().replace(/"/g, ''))
                    const row: z.infer<typeof CSVRowSchema> = {}
                    headers.forEach((header, index) => {
                        if (values[index] !== undefined) {
                            row[header] = values[index]
                        }
                    })
                    rows.push(row)
                }
            } else {
                // No headers, treat all as data rows
                for (const line of lines) {
                    const values = line
                        .split(delimiter)
                        .map((v) => v.trim().replace(/"/g, ''))
                    const row: z.infer<typeof CSVRowSchema> = {}
                    values.forEach((value, index) => {
                        row[`field_${index}`] = value
                    })
                    rows.push(row)
                }
                headers = rows.length > 0 ? Object.keys(rows[0]) : []
            }

            span?.update({
                output: { rowCount: rows.length, headerCount: headers.length },
                metadata: {
                    'tool.output.rowCount': rows.length,
                    'tool.output.headerCount': headers.length,
                },
            })
            span?.end()
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Read ${rows.length} rows from CSV`,
                    stage: 'read:CSVdata',
                },
                id: 'read:CSVdata',
            })
            return { headers, rows, rawCSV: content }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            span?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            throw error
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Read CSV tool input streaming started', {
            toolCallId,
            messages: messages.length,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Read CSV tool received input chunk', {
            toolCallId,
            inputTextDelta,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Read CSV received complete input', {
            toolCallId,
            messageCount: messages.length,
            fileName: input.fileName,
            hasHeaders: input.hasHeaders,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Read CSV completed', {
            toolCallId,
            toolName,
            rowCount: output.rows.length,
            headerCount: output.headers?.length || 0,
            hook: 'onOutput',
        })
    },
})

/**
 * Converts CSV data to Excalidraw format
 */
export const csvToExcalidrawTool = createTool({
    id: 'csv-to-excalidraw',
    description: 'Converts CSV data into an Excalidraw diagram format',
    inputSchema: z.object({
        csvData: z.string().describe('CSV data as string'),
        layoutType: z
            .enum(['table', 'flowchart', 'mindmap', 'timeline'])
            .optional()
            .default('table'),
        title: z.string().optional(),
        hasHeaders: z.boolean().optional().default(true),
        delimiter: z.string().optional().default(','),
    }),
    outputSchema: z.object({
        filename: z.string(),
        contents: ExcalidrawSchema,
        elementCount: z.number(),
        layoutInfo: z.object({
            totalWidth: z.number(),
            totalHeight: z.number(),
            elementSpacing: z.number(),
        }),
    }),

    execute: async (inputData, context) => {
        const writer = context?.writer

        const tracingContext: TracingContext | undefined =
            context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'csv-to-excalidraw',
            input: inputData,
            metadata: {
                'tool.id': 'csv-to-excalidraw',
                'tool.input.layoutType': inputData.layoutType,
                'tool.input.hasHeaders': inputData.hasHeaders,
            },
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '🔁 Converting CSV to Excalidraw',
                stage: 'csv-to-excalidraw',
            },
            id: 'csv-to-excalidraw',
        })

        try {
            const {
                csvData,
                delimiter = ',',
                hasHeaders = true,
                layoutType = 'table',
                title,
            } = inputData

            const lines = String(csvData || '')
                .trim()
                .split('\n')
                .filter((l) => l.length > 0)

            let headers: string[] = []
            const rows: string[][] = []

            if (hasHeaders && lines.length > 0) {
                headers = lines[0]
                    .split(delimiter)
                    .map((h) => h.trim().replace(/"/g, ''))
                for (let i = 1; i < lines.length; i++) {
                    rows.push(
                        lines[i]
                            .split(delimiter)
                            .map((v) => v.trim().replace(/"/g, ''))
                    )
                }
            } else {
                for (const line of lines) {
                    rows.push(
                        line
                            .split(delimiter)
                            .map((v) => v.trim().replace(/"/g, ''))
                    )
                }
                headers =
                    rows.length > 0 ? rows[0].map((_, i) => `col${i + 1}`) : []
            }

            const elements: ExcalidrawElementType[] = []
            const generateId = () => Math.random().toString(36).substring(2, 15)

            // Layout parameters
            const cellW = 120
            const cellH = 36
            const spacing = 8
            const startX = 50
            let startY = 50

            // Add title if provided
            if (typeof title === 'string' && title.trim().length > 0) {
                elements.push({
                    id: generateId(),
                    type: 'text',
                    x: startX,
                    y: startY,
                    width: Math.max(100, title.length * 8),
                    height: 30,
                    text: title,
                    fontSize: 20,
                    fontFamily: 1,
                    textAlign: 'left',
                    verticalAlign: 'top',
                    strokeColor: '#000000',
                    backgroundColor: 'transparent',
                    fillStyle: 'solid',
                    strokeWidth: 1,
                    strokeStyle: 'solid',
                    roughness: 1,
                    opacity: 100,
                    angle: 0,
                    seed: Math.floor(Math.random() * 1000000),
                    version: 1,
                    versionNonce: Math.floor(Math.random() * 1000000),
                    isDeleted: false,
                    boundElements: null,
                    updated: Date.now(),
                    link: null,
                    locked: false,
                } as ExcalidrawElementType)

                startY += 40
            }

            // If has headers, render header row first
            let currentY = startY
            if (hasHeaders && headers.length > 0) {
                for (let col = 0; col < headers.length; col++) {
                    const x = startX + col * (cellW + spacing)
                    // cell background
                    elements.push({
                        id: generateId(),
                        type: 'rectangle',
                        x,
                        y: currentY,
                        width: cellW,
                        height: cellH,
                        strokeColor: '#000000',
                        backgroundColor: '#f3f4f6',
                        fillStyle: 'solid',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        angle: 0,
                        seed: Math.floor(Math.random() * 1000000),
                        version: 1,
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        boundElements: null,
                        updated: Date.now(),
                        link: null,
                        locked: false,
                    } as ExcalidrawElementType)

                    // header text
                    elements.push({
                        id: generateId(),
                        type: 'text',
                        x: x + 8,
                        y: currentY + 6,
                        width: cellW - 16,
                        height: 24,
                        text: headers[col],
                        fontSize: 14,
                        fontFamily: 1,
                        textAlign: 'left',
                        verticalAlign: 'top',
                        strokeColor: '#111827',
                        backgroundColor: 'transparent',
                        fillStyle: 'solid',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        angle: 0,
                        seed: Math.floor(Math.random() * 1000000),
                        version: 1,
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        boundElements: null,
                        updated: Date.now(),
                        link: null,
                        locked: false,
                    } as ExcalidrawElementType)
                }
                currentY += cellH + spacing
            }

            // Render data rows
            for (let r = 0; r < rows.length; r++) {
                const row = rows[r]
                for (
                    let col = 0;
                    col < Math.max(row.length, headers.length);
                    col++
                ) {
                    const x = startX + col * (cellW + spacing)
                    const value = row[col] ?? ''

                    elements.push({
                        id: generateId(),
                        type: 'rectangle',
                        x,
                        y: currentY,
                        width: cellW,
                        height: cellH,
                        strokeColor: '#000000',
                        backgroundColor: '#ffffff',
                        fillStyle: 'solid',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        angle: 0,
                        seed: Math.floor(Math.random() * 1000000),
                        version: 1,
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        boundElements: null,
                        updated: Date.now(),
                        link: null,
                        locked: false,
                    } as ExcalidrawElementType)

                    elements.push({
                        id: generateId(),
                        type: 'text',
                        x: x + 8,
                        y: currentY + 6,
                        width: cellW - 16,
                        height: 24,
                        text: String(value),
                        fontSize: 14,
                        fontFamily: 1,
                        textAlign: 'left',
                        verticalAlign: 'top',
                        strokeColor: '#111827',
                        backgroundColor: 'transparent',
                        fillStyle: 'solid',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roughness: 1,
                        opacity: 100,
                        angle: 0,
                        seed: Math.floor(Math.random() * 1000000),
                        version: 1,
                        versionNonce: Math.floor(Math.random() * 1000000),
                        isDeleted: false,
                        boundElements: null,
                        updated: Date.now(),
                        link: null,
                        locked: false,
                    } as ExcalidrawElementType)
                }
                currentY += cellH + spacing
            }

            const totalCols = Math.max(headers.length, rows[0]?.length ?? 0)
            const totalWidth =
                totalCols * cellW + Math.max(0, totalCols - 1) * spacing
            const totalHeight = currentY - startY

            const excalidrawData = {
                type: 'excalidraw' as const,
                version: 2,
                source: 'csv-to-excalidraw',
                elements,
                appState: {
                    gridSize: 20,
                    viewBackgroundColor: '#ffffff',
                },
                files: {},
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Converted ${elements.length} elements to Excalidraw`,
                    stage: 'csv-to-excalidraw',
                },
                id: 'csv-to-excalidraw',
            })

            const result = {
                filename: `csv-to-excalidraw-${Date.now()}.excalidraw.json`,
                contents: excalidrawData,
                elementCount: elements.length,
                layoutInfo: {
                    totalWidth,
                    totalHeight,
                    elementSpacing: spacing,
                },
            }

            span?.update({
                output: result,
                metadata: {
                    'tool.output.elementCount': result.elementCount,
                    'tool.output.totalWidth': totalWidth,
                    'tool.output.totalHeight': totalHeight,
                },
            })
            span?.end()
            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            span?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            throw new Error(
                `CSV to Excalidraw conversion failed: ${errorMessage}`
            )
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('CSV to Excalidraw tool input streaming started', {
            toolCallId,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('CSV to Excalidraw received complete input', {
            toolCallId,
            rows: String(input.csvData ?? '').split('\n').length,
            layoutType: input.layoutType,
            hasHeaders: input.hasHeaders,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('CSV to Excalidraw completed', {
            toolCallId,
            toolName,
            elementCount: output.elementCount,
            layoutInfo: output.layoutInfo,
            hook: 'onOutput',
        })
    },
})

/**
 * Validates data against a schema
 */
export const validateDataTool = createTool({
    id: 'validate-data',
    description: 'Validates data against a specified schema',
    inputSchema: z.object({
        data: z.unknown().describe('Data to validate'),
        schemaType: z.enum(['excalidraw', 'csv', 'json', 'xml']),
        strict: z.boolean().optional().default(true),
    }),
    outputSchema: z.object({
        isValid: z.boolean(),
        errors: z.array(z.string()),
        warnings: z.array(z.string()),
        validatedData: z.unknown().optional(),
    }),

    execute: async (inputData, context) => {
        const writer = context?.writer

        const tracingContext: TracingContext | undefined =
            context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'validate-data',
            input: inputData,
            metadata: {
                'tool.id': 'validate-data',
                'tool.input.schemaType': inputData.schemaType,
                'tool.input.strict': inputData.strict,
            },
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ Validating ${inputData.schemaType} data`,
                stage: 'validate-data',
            },
            id: 'validate-data',
        })
        const { data, schemaType, strict = true } = inputData
        const errors: string[] = []
        const warnings: string[] = []

        let isValid = false
        let validatedData: unknown = undefined

        try {
            switch (schemaType) {
                case 'excalidraw': {
                    const schemaToUse = strict
                        ? ExcalidrawSchema
                        : ExcalidrawSchema.partial()
                    const excalidrawValidation = schemaToUse.safeParse(data)
                    isValid = excalidrawValidation.success

                    if (!isValid && excalidrawValidation.error) {
                        errors.push(
                            ...excalidrawValidation.error.issues.map(
                                (e: z.core.$ZodIssue) =>
                                    `${e.path.join('.')}: ${e.message}`
                            )
                        )
                        if (!strict) {
                            // When not strict, attempt to accept partial data
                            warnings.push(
                                'Non-strict validation: some fields are missing or invalid; partial data accepted'
                            )
                            isValid = true
                            validatedData = data
                        }
                    } else {
                        validatedData = data
                    }
                    break
                }

                case 'csv': {
                    // Basic CSV validation
                    const csvString = String(data)
                    const lines = csvString.trim().split('\n')

                    if (lines.length === 0) {
                        errors.push('CSV data is empty')
                    } else {
                        const firstLine = lines[0]
                        if (!firstLine.includes(',') && strict) {
                            errors.push(
                                'No comma separators found in CSV header'
                            )
                        }

                        // Check for consistent column count
                        const headerColumns = firstLine.split(',').length
                        for (let i = 1; i < lines.length; i++) {
                            const columns = lines[i].split(',').length
                            if (columns !== headerColumns) {
                                // Duplicated checking logic in original code, simplifying
                                if (strict) {
                                    errors.push(
                                        `Row ${i + 1} has ${columns} columns, expected ${headerColumns}`
                                    )
                                } else {
                                    warnings.push(
                                        `Row ${i + 1} has ${columns} columns, expected ${headerColumns}`
                                    )
                                }
                            }
                        }

                        isValid = errors.length === 0
                        if (isValid) {
                            validatedData = data
                        } else if (!strict && warnings.length > 0) {
                            // In lenient mode, accept CSV with warnings
                            isValid = true
                            validatedData = data
                        }
                    }
                    break
                }

                case 'json':
                    try {
                        JSON.parse(String(data))
                        isValid = true
                        validatedData = data
                    } catch (parseError) {
                        errors.push(`Invalid JSON: ${String(parseError)}`)
                    }
                    break

                case 'xml':
                    try {
                        const parserOptions = {
                            ignoreAttributes: false,
                            attributeNamePrefix: '@_',
                            textNodeName: '#text',
                            parseAttributeValue: true,
                            trimValues: true,
                        }
                        const parser = new XMLParser(parserOptions)
                        const parsed = parser.parse(String(data))

                        if (
                            parsed === null ||
                            parsed === undefined ||
                            (typeof parsed === 'object' &&
                                Object.keys(parsed).length === 0)
                        ) {
                            if (strict) {
                                errors.push(
                                    'XML parsing error: no valid root element found'
                                )
                            } else {
                                warnings.push(
                                    'XML parsing error: non-strict mode accepted'
                                )
                                isValid = true
                                validatedData = data
                            }
                        } else {
                            isValid = true
                            validatedData = data
                        }
                    } catch (parseError) {
                        if (strict) {
                            errors.push(
                                `XML validation failed: ${String(parseError)}`
                            )
                        } else {
                            warnings.push(
                                `XML validation error ignored in non-strict mode: ${String(parseError)}`
                            )
                            isValid = true
                            validatedData = data
                        }
                    }
                    break
            }

            await writer?.write({
                type: 'progress',
                data: { message: `✅ Validation complete. Valid: ${isValid}` },
            })

            const result = {
                isValid,
                errors,
                warnings,
                validatedData,
            }

            span?.update({
                output: result,
                metadata: {
                    'tool.output.isValid': isValid,
                    'tool.output.errorCount': errors.length,
                },
            })
            span?.end()
            return result
        } catch (error) {
            const errorMsg = String(error)
            span?.error({
                error: error instanceof Error ? error : new Error(errorMsg),
                endSpan: true,
            })
            return {
                isValid: false,
                errors: [`Validation failed: ${errorMsg}`],
                warnings,
                elementCount: 0,
            }
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Validate data tool input streaming started', {
            toolCallId,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Validate data received complete input', {
            toolCallId,
            schemaType: input.schemaType,
            strict: input.strict,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Validate data completed', {
            toolCallId,
            toolName,
            isValid: output.isValid,
            errorCount: output.errors.length,
            hook: 'onOutput',
        })
    },
})

/**
 * Helper function to convert JSON to XML using fast-xml-parser
 */
type JSONLike =
    | string
    | number
    | boolean
    | null
    | JSONLike[]
    | { [key: string]: JSONLike }

function jsonToXML(data: JSONLike, rootElement = 'root'): string {
    try {
        const builderOptions = {
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            textNodeName: '#text',
            format: true,
            indentBy: '  ',
            suppressEmptyNode: false,
        }

        const builder = new XMLBuilder(builderOptions)
        const xmlObj = { [rootElement]: data }
        return builder.build(xmlObj)
    } catch {
        // Fallback to simple conversion if fast-xml-parser fails
        function objectToXML(currentData: JSONLike, nodeName: string): string {
            if (currentData === null || currentData === undefined) {
                return ''
            }

            if (
                typeof currentData === 'string' ||
                typeof currentData === 'number' ||
                typeof currentData === 'boolean'
            ) {
                return `<${nodeName}>${currentData}</${nodeName}>`
            }

            if (Array.isArray(currentData)) {
                const singular =
                    nodeName.endsWith('s') && nodeName.length > 1
                        ? nodeName.slice(0, -1)
                        : nodeName
                return currentData
                    .map((item) => objectToXML(item, singular))
                    .join('')
            }

            if (typeof currentData === 'object') {
                let xml = `<${nodeName}>`
                for (const [key, value] of Object.entries(currentData)) {
                    xml += objectToXML(value, key)
                }
                xml += `</${nodeName}>`
                return xml
            }

            return ''
        }

        return objectToXML(data, rootElement)
    }
}

/**
 * Converts Excalidraw diagram to SVG format
 */
export const excalidrawToSVGTool = createTool({
    id: 'excalidraw-to-svg',
    description:
        'Converts Excalidraw diagram data to SVG format for rendering and export',
    inputSchema: z.object({
        excalidrawData: ExcalidrawSchema.describe(
            'Excalidraw diagram data to convert'
        ),
        exportOptions: z
            .object({
                exportPadding: z
                    .number()
                    .optional()
                    .default(10)
                    .describe('Padding around the diagram in pixels'),
                exportBackground: z
                    .boolean()
                    .optional()
                    .default(true)
                    .describe('Whether to include background color'),
                viewBackgroundColor: z
                    .string()
                    .optional()
                    .describe('Background color override'),
                exportWithDarkMode: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe('Export with dark mode theme'),
                exportScale: z
                    .number()
                    .optional()
                    .default(1)
                    .describe('Scale factor for export (1 = 100%)'),
            })
            .optional(),
        saveToFile: z
            .boolean()
            .optional()
            .describe('Whether to save SVG to file'),
        fileName: z
            .string()
            .optional()
            .describe('Optional filename for saved SVG'),
    }),
    outputSchema: z.object({
        svgContent: z.string().describe('Generated SVG content'),
        savedFilePath: z
            .string()
            .optional()
            .describe('Path to saved file if saveToFile was true'),
        dimensions: z
            .object({
                width: z.number(),
                height: z.number(),
            })
            .describe('SVG dimensions'),
        elementCount: z
            .number()
            .describe('Number of Excalidraw elements converted'),
    }),

    execute: async (inputData, context) => {
        const writer = context?.writer

        const tracingContext: TracingContext | undefined =
            context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'excalidraw-to-svg',
            input: inputData,
            metadata: {
                'tool.id': 'excalidraw-to-svg',
                'tool.input.elementCount':
                    inputData.excalidrawData.elements.length,
                'tool.input.saveToFile': inputData.saveToFile,
            },
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '🎨 Converting Excalidraw to SVG',
                stage: 'excalidraw-to-svg',
            },
            id: 'excalidraw-to-svg',
        })

        try {
            // Validate Excalidraw data
            const validation = ExcalidrawSchema.safeParse(
                inputData.excalidrawData
            )
            if (!validation.success) {
                throw new Error(
                    `Invalid Excalidraw data: ${validation.error.message}`
                )
            }

            // Convert to SVG
            type ExcalidrawSvgInput = Parameters<typeof excalidrawToSvg>[0]
            const svgReadyData: ExcalidrawSvgInput = {
                ...inputData.excalidrawData,
                elements: inputData.excalidrawData.elements.map((element) => ({
                    ...element,
                    angle: element.angle ?? 0,
                    strokeColor: element.strokeColor ?? '#000000',
                    backgroundColor: element.backgroundColor ?? 'transparent',
                    fillStyle: element.fillStyle ?? 'solid',
                    strokeWidth: element.strokeWidth ?? 2,
                    strokeStyle: element.strokeStyle ?? 'solid',
                    roughness: element.roughness ?? 1,
                    opacity: element.opacity ?? 100,
                    groupIds: element.groupIds ?? [],
                    frameId: element.frameId ?? null,
                    seed: element.seed ?? 0,
                    version: element.version ?? 1,
                    versionNonce: element.versionNonce ?? 0,
                    isDeleted: element.isDeleted ?? false,
                    updated: element.updated ?? Date.now(),
                    locked: element.locked ?? false,
                })),
            }

            const svgContent = await excalidrawToSvg(
                svgReadyData,
                inputData.exportOptions
            )

            // Extract dimensions from SVG
            const widthRegex = /width="(\d+)"/
            const heightRegex = /height="(\d+)"/
            const widthMatch = widthRegex.exec(svgContent)
            const heightMatch = heightRegex.exec(svgContent)
            const dimensions = {
                width: widthMatch ? parseInt(widthMatch[1], 10) : 0,
                height: heightMatch ? parseInt(heightMatch[1], 10) : 0,
            }

            let savedFilePath: string | undefined

            // Save to file if requested
            if (inputData.saveToFile === true) {
                try {
                    const providedName = inputData.fileName
                    const fileName =
                        typeof providedName === 'string' &&
                        providedName.trim().length > 0
                            ? providedName.endsWith('.svg')
                                ? providedName
                                : `${providedName}.svg`
                            : `excalidraw-${Date.now()}.svg`

                    const fullPath = validateDataPath(fileName)
                    await fs.mkdir(path.dirname(fullPath), { recursive: true })
                    await fs.writeFile(fullPath, svgContent, 'utf-8')
                    savedFilePath = fileName

                    await writer?.custom({
                        type: 'data-tool-progress',
                        data: {
                            status: 'done',
                            message: `💾 Saved SVG to ${fileName}`,
                            stage: 'excalidraw-to-svg',
                        },
                        id: 'excalidraw-to-svg',
                    })
                } catch (error) {
                    const errorMsg =
                        error instanceof Error ? error.message : String(error)
                    await writer?.custom({
                        type: 'data-tool-progress',
                        data: {
                            status: 'done',
                            message: `⚠️ Failed to save file: ${errorMsg}`,
                            stage: 'excalidraw-to-svg',
                        },
                        id: 'excalidraw-to-svg',
                    })
                }
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Converted ${inputData.excalidrawData.elements.length} elements to SVG`,
                    stage: 'excalidraw-to-svg',
                },
                id: 'excalidraw-to-svg',
            })

            const result = {
                svgContent,
                savedFilePath,
                dimensions,
                elementCount: inputData.excalidrawData.elements.length,
            }

            span?.update({
                output: result,
                metadata: {
                    'tool.output.elementCount': result.elementCount,
                    'tool.output.width': dimensions.width,
                    'tool.output.height': dimensions.height,
                },
            })
            span?.end()
            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            span?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            throw new Error(
                `Excalidraw to SVG conversion failed: ${errorMessage}`
            )
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Excalidraw to SVG tool input streaming started', {
            toolCallId,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Excalidraw to SVG received complete input', {
            toolCallId,
            elementCount: input.excalidrawData.elements.length,
            saveToFile: input.saveToFile,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Excalidraw to SVG completed', {
            toolCallId,
            toolName,
            elementCount: output.elementCount,
            width: output.dimensions.width,
            height: output.dimensions.height,
            hook: 'onOutput',
        })
    },
})

/**
 * Converts SVG back to Excalidraw format (simplified conversion)
 */
export const svgToExcalidrawTool = createTool({
    id: 'svg-to-excalidraw',
    description:
        'Converts SVG content to Excalidraw diagram format (basic shapes only)',
    inputSchema: z.object({
        svgContent: z.string().describe('SVG content to convert'),
        title: z.string().optional().describe('Optional title for the diagram'),
    }),
    outputSchema: z.object({
        excalidrawData: ExcalidrawSchema,
        elementCount: z.number(),
        warnings: z.array(z.string()).optional(),
    }),

    execute: async (inputData, context) => {
        const writer = context?.writer

        const tracingContext: TracingContext | undefined =
            context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'svg-to-excalidraw',
            input: inputData,
            metadata: {
                'tool.id': 'svg-to-excalidraw',
            },
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '🔄 Converting SVG to Excalidraw',
                stage: 'svg-to-excalidraw',
            },
            id: 'svg-to-excalidraw',
        })

        try {
            // Parse SVG using svgjson
            const svgJson = svgjson.svg2json(
                inputData.svgContent
            ) as SvgJsonNode
            const elements: ExcalidrawElementType[] = []
            const warnings: string[] = []
            const generateId = (): string =>
                Math.random().toString(36).substring(2, 15)

            // Add title if provided
            if (
                typeof inputData.title === 'string' &&
                inputData.title.trim().length > 0
            ) {
                elements.push({
                    id: generateId(),
                    type: 'text',
                    x: 50,
                    y: 40,
                    width: inputData.title.length * 10,
                    height: 30,
                    text: inputData.title,
                    fontSize: 20,
                    fontFamily: 1,
                    textAlign: 'left',
                    verticalAlign: 'top',
                    strokeColor: '#000000',
                    backgroundColor: 'transparent',
                    fillStyle: 'solid',
                    strokeWidth: 2,
                    strokeStyle: 'solid',
                    roughness: 1,
                    opacity: 100,
                    angle: 0,
                    seed: Math.floor(Math.random() * 1000000),
                    version: 1,
                    versionNonce: Math.floor(Math.random() * 1000000),
                    isDeleted: false,
                    boundElements: null,
                    updated: Date.now(),
                    link: null,
                    locked: false,
                } as ExcalidrawElementType)
            }

            // Convert SVG elements to Excalidraw (simplified)
            function convertSvgElement(
                node: SvgJsonNode,
                parentX = 0,
                parentY = 0
            ) {
                if (typeof node.name !== 'string' || node.name.length === 0) {
                    return
                }

                const attrs = node.attributes ?? {}
                const x = parseFloat(attrs.x || '0') + parentX
                const y = parseFloat(attrs.y || '0') + parentY

                switch (node.name) {
                    case 'rect':
                        elements.push({
                            id: generateId(),
                            type: 'rectangle',
                            x,
                            y,
                            width: parseFloat(attrs.width || '100'),
                            height: parseFloat(attrs.height || '50'),
                            strokeColor: attrs.stroke || '#000000',
                            backgroundColor: attrs.fill || 'transparent',
                            fillStyle: 'solid',
                            strokeWidth: parseFloat(
                                attrs['stroke-width'] || '2'
                            ),
                            strokeStyle: 'solid',
                            roughness: 1,
                            opacity: parseFloat(attrs.opacity || '1') * 100,
                            angle: 0,
                            seed: Math.floor(Math.random() * 1000000),
                            version: 1,
                            versionNonce: Math.floor(Math.random() * 1000000),
                            isDeleted: false,
                            boundElements: null,
                            updated: Date.now(),
                            link: null,
                            locked: false,
                        } as ExcalidrawElementType)
                        break

                    case 'circle':
                    case 'ellipse': {
                        const cx = parseFloat(attrs.cx ?? '0')
                        const cy = parseFloat(attrs.cy ?? '0')
                        const r = parseFloat(attrs.r ?? attrs.rx ?? '25')
                        elements.push({
                            id: generateId(),
                            type: 'ellipse',
                            x: cx - r + parentX,
                            y: cy - r + parentY,
                            width: r * 2,
                            height: r * 2,
                            strokeColor: attrs.stroke || '#000000',
                            backgroundColor: attrs.fill || 'transparent',
                            fillStyle: 'solid',
                            strokeWidth: parseFloat(
                                attrs['stroke-width'] || '2'
                            ),
                            strokeStyle: 'solid',
                            roughness: 1,
                            opacity: parseFloat(attrs.opacity || '1') * 100,
                            angle: 0,
                            seed: Math.floor(Math.random() * 1000000),
                            version: 1,
                            versionNonce: Math.floor(Math.random() * 1000000),
                            isDeleted: false,
                            boundElements: null,
                            updated: Date.now(),
                            link: null,
                            locked: false,
                        } as ExcalidrawElementType)
                        break
                    }

                    case 'text': {
                        const textContent = node.text ?? node.content ?? ''
                        if (
                            typeof textContent === 'string' &&
                            textContent.length > 0
                        ) {
                            elements.push({
                                id: generateId(),
                                type: 'text',
                                x,
                                y,
                                width: textContent.length * 8,
                                height: 20,
                                text: textContent,
                                fontSize: parseFloat(
                                    attrs['font-size'] ?? '16'
                                ),
                                fontFamily: 1,
                                textAlign: 'left',
                                verticalAlign: 'top',
                                strokeColor: attrs.fill ?? '#000000',
                                backgroundColor: 'transparent',
                                fillStyle: 'solid',
                                strokeWidth: 1,
                                strokeStyle: 'solid',
                                roughness: 1,
                                opacity: parseFloat(attrs.opacity ?? '1') * 100,
                                angle: 0,
                                seed: Math.floor(Math.random() * 1000000),
                                version: 1,
                                versionNonce: Math.floor(
                                    Math.random() * 1000000
                                ),
                                isDeleted: false,
                                boundElements: null,
                                updated: Date.now(),
                                link: null,
                                locked: false,
                            } as ExcalidrawElementType)
                        }
                        break
                    }

                    case 'path':
                    case 'line':
                    case 'polyline':
                    case 'polygon':
                        warnings.push(
                            `Complex shape '${node.name}' converted to basic rectangle approximation`
                        )
                        elements.push({
                            id: generateId(),
                            type: 'rectangle',
                            x,
                            y,
                            width: 100,
                            height: 50,
                            strokeColor: attrs.stroke || '#000000',
                            backgroundColor: 'transparent',
                            fillStyle: 'solid',
                            strokeWidth: parseFloat(
                                attrs['stroke-width'] || '2'
                            ),
                            strokeStyle: 'solid',
                            roughness: 1,
                            opacity: parseFloat(attrs.opacity || '1') * 100,
                            angle: 0,
                            seed: Math.floor(Math.random() * 1000000),
                            version: 1,
                            versionNonce: Math.floor(Math.random() * 1000000),
                            isDeleted: false,
                            boundElements: null,
                            updated: Date.now(),
                            link: null,
                            locked: false,
                        } as ExcalidrawElementType)
                        break
                }

                // Process children
                if (node.children) {
                    node.children.forEach((child) =>
                        convertSvgElement(child, x, y)
                    )
                }
            }

            // Process SVG root and children
            if (svgJson.children) {
                svgJson.children.forEach((child) => convertSvgElement(child))
            }

            const excalidrawData = {
                type: 'excalidraw' as const,
                version: 2,
                source: 'https://excalidraw.com',
                elements,
                appState: {
                    gridSize: 20,
                    viewBackgroundColor: '#ffffff',
                },
                files: {},
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Converted to ${elements.length} Excalidraw elements`,
                    stage: 'svg-to-excalidraw',
                },
                id: 'svg-to-excalidraw',
            })

            const result = {
                excalidrawData,
                elementCount: elements.length,
                warnings: warnings.length > 0 ? warnings : undefined,
            }

            span?.update({
                output: result,
                metadata: { 'tool.output.elementCount': elements.length },
            })
            span?.end()
            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            span?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            throw new Error(
                `SVG to Excalidraw conversion failed: ${errorMessage}`
            )
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('SVG to Excalidraw tool input streaming started', {
            toolCallId,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('SVG to Excalidraw received complete input', {
            toolCallId,
            title: input.title,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('SVG to Excalidraw completed', {
            toolCallId,
            toolName,
            elementCount: output.elementCount,
            warningsCount: output.warnings?.length || 0,
            hook: 'onOutput',
        })
    },
})

export type ReadCSVDataToolUITool = InferUITool<typeof readCSVDataTool>
export type CsvToExcalidrawUITool = InferUITool<typeof csvToExcalidrawTool>
export type DataValidationUITool = InferUITool<typeof validateDataTool>
export type ExcalidrawToSVGUITool = InferUITool<typeof excalidrawToSVGTool>
export type SVGToExcalidrawUITool = InferUITool<typeof svgToExcalidrawTool>
