import * as fs from 'fs/promises'
import * as path from 'path'
import { z } from 'zod'
import { createTool } from '@mastra/core/tools'
import { AISpanType } from '@mastra/core/ai-tracing'

// Import data processing libraries
// svgjson does not ship with TypeScript types. Rather than attempting to
// augment the module (which can trigger "cannot be augmented" errors when
// the package has an existing untyped JS entry point), define a local
// interface to represent the JSON structure returned by svgjson and cast
// the runtime import to this local type.
interface SvgJsonNode {
    name?: string
    attributes?: Record<string, string>
    children?: SvgJsonNode[]
    text?: string
    content?: string
}

// svgjson does not ship with types; require it and cast to a local interface
// to avoid TypeScript errors when the @types package is not installed. The
// ambient declaration above provides minimal typing when available.
const svgjson = require('svgjson') as (input: string) => SvgJsonNode
import { DOMParser, XMLSerializer } from 'xmldom'

// Define runtime context for these tools
export interface DataProcessingContext {
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
type ExtractedData = Record<string, XmlElementInfo[] | Array<{ element: string; value: string }>>

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

const DATA_DIR = path.join(process.cwd(), 'src/mastra/data')

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
    type: z.enum(['rectangle', 'ellipse', 'diamond', 'arrow', 'text', 'line', 'freedraw', 'image']),
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
    text: z.string().optional(),
    strokeColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    fillStyle: z.enum(['solid', 'hachure', 'cross-hatch']).optional(),
    strokeWidth: z.number().optional(),
    strokeStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
    roughness: z.number().optional(),
    opacity: z.number().optional(),
    angle: z.number().optional(),
    points: z.array(z.array(z.number())).optional(),
    startBinding: z.any().optional(),
    endBinding: z.any().optional(),
    arrowheads: z.any().optional(),
    fontSize: z.number().optional(),
    fontFamily: z.number().optional(),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
    verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
    groupIds: z.array(z.string()).optional(),
    frameId: z.string().nullable().optional(),
    roundness: z.any().optional(),
    seed: z.number().optional(),
    version: z.number().optional(),
    versionNonce: z.number().optional(),
    isDeleted: z.boolean().optional(),
    boundElements: z.any().optional(),
    updated: z.number().optional(),
    link: z.string().nullable().optional(),
    locked: z.boolean().optional(),
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
    files: z.record(z.string(), z.any()).optional(),
})

// Type aliases derived from Zod schemas to avoid using `any`
type ExcalidrawElementType = z.infer<typeof ExcalidrawElementSchema>


const CSVRowSchema = z.record(z.string(), z.string())

/**
 * Reads and parses CSV data from a file
 */
export const readCSVDataTool = createTool({
    id: 'read-csv-data',
    description: 'Reads and parses CSV data from a file in the data directory',
    inputSchema: z.object({
        fileName: z.string().describe('The name of the CSV file (relative to data directory)'),
        hasHeaders: z.boolean().optional().default(true),
        delimiter: z.string().optional().default(','),
    }),
    outputSchema: z.object({
        headers: z.array(z.string()).optional(),
        rows: z.array(CSVRowSchema),
        rawCSV: z.string(),
    }),
    execute: async ({ context, tracingContext }) => {
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: AISpanType.TOOL_CALL,
            name: 'read_csv_data',
            input: { fileName: context.fileName },
        })

        try {
            const { fileName, hasHeaders = true, delimiter = ',' } = context
            const fullPath = validateDataPath(fileName)
            const realFullPath = await fs.realpath(fullPath)

            if (!realFullPath.startsWith(DATA_DIR)) {
                throw new Error(`Access denied: File path is outside allowed directory`)
            }

            const content = await fs.readFile(realFullPath, 'utf-8')
            const lines = content.trim().split('\n')

            let headers: string[] = []
            const rows: Array<z.infer<typeof CSVRowSchema>> = []

            if (hasHeaders && lines.length > 0) {
                headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''))
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''))
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
                    const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ''))
                    const row: z.infer<typeof CSVRowSchema> = {}
                    values.forEach((value, index) => {
                        row[`field_${index}`] = value
                    })
                    rows.push(row)
                }
                headers = rows.length > 0 ? Object.keys(rows[0]) : []
            }

            span?.end({ output: { rowCount: rows.length, headerCount: headers.length } })
            return { headers, rows, rawCSV: content }
        } catch (error) {
            span?.end({ metadata: { error: String(error) } })
            throw error
        }
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
        layoutType: z.enum(['table', 'flowchart', 'mindmap', 'timeline']).optional().default('table'),
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
    execute: async ({ context }) => {
        const { csvData, layoutType = 'table', title, hasHeaders = true, delimiter = ',' } = context

        const lines = csvData.trim().split('\n')
        let headers: string[] = []
        let dataRows: string[][] = []

        if (hasHeaders && lines.length > 0) {
            headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''))
            dataRows = lines.slice(1).map(line => line.split(delimiter).map(v => v.trim().replace(/"/g, '')))
        } else {
            dataRows = lines.map(line => line.split(delimiter).map(v => v.trim().replace(/"/g, '')))
            headers = dataRows[0]?.map((_, index) => `Field ${index + 1}`) ?? []
        }

        const elements = []
        const spacing = 120
        const elementWidth = 100
        const elementHeight = 40
        const startX = 50
        const startY = 100

        // Generate unique IDs
        const generateId = () => Math.random().toString(36).substring(2, 15)

        // Title
        const titleText = typeof title === 'string' ? title.trim() : ''

        if (titleText.length > 0) {
            elements.push({
                id: generateId(),
                type: 'text' as const,
                x: startX,
                y: startY - 60,
                width: titleText.length * 10,
                height: 30,
                text: titleText,
                fontSize: 20,
                fontFamily: 1,
                textAlign: 'left' as const,
                verticalAlign: 'top' as const,
                strokeColor: '#000000',
                backgroundColor: 'transparent',
                fillStyle: 'solid' as const,
                strokeWidth: 2,
                strokeStyle: 'solid' as const,
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
            })
        }

        if (layoutType === 'table') {
            // Create table layout
            let currentY = startY

            // Headers row
            headers.forEach((header, index) => {
                elements.push({
                    id: generateId(),
                    type: 'rectangle' as const,
                    x: startX + (index * (elementWidth + 20)),
                    y: currentY,
                    width: elementWidth,
                    height: elementHeight,
                    strokeColor: '#1976d2',
                    backgroundColor: '#e3f2fd',
                    fillStyle: 'solid' as const,
                    strokeWidth: 2,
                    strokeStyle: 'solid' as const,
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
                })

                elements.push({
                    id: generateId(),
                    type: 'text' as const,
                    x: startX + (index * (elementWidth + 20)) + 10,
                    y: currentY + 10,
                    width: elementWidth - 20,
                    height: elementHeight - 20,
                    text: header,
                    fontSize: 12,
                    fontFamily: 1,
                    textAlign: 'center' as const,
                    verticalAlign: 'middle' as const,
                    strokeColor: '#000000',
                    backgroundColor: 'transparent',
                    fillStyle: 'solid' as const,
                    strokeWidth: 1,
                    strokeStyle: 'solid' as const,
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
                })
            })

            currentY += elementHeight + 20

            // Data rows (limit to first 10 rows to avoid overcrowding)
            const maxRows = Math.min(dataRows.length, 10)
            for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
                const row = dataRows[rowIndex]
                headers.forEach((header, colIndex) => {
                    elements.push({
                        id: generateId(),
                        type: 'rectangle',
                        x: startX + (colIndex * (elementWidth + 20)),
                        y: currentY,
                        width: elementWidth,
                        height: elementHeight,
                        strokeColor: '#666666',
                        backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f5f5f5',
                        fillStyle: 'solid' as const,
                        strokeWidth: 1,
                        strokeStyle: 'solid' as const,
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
                    })

                    elements.push({
                        id: generateId(),
                        type: 'text',
                        x: startX + (colIndex * (elementWidth + 20)) + 5,
                        y: currentY + 5,
                        width: elementWidth - 10,
                        height: elementHeight - 10,
                        text: row[colIndex] || '',
                        fontSize: 10,
                        fontFamily: 1,
                        textAlign: 'left' as const,
                        verticalAlign: 'top' as const,
                        strokeColor: '#000000',
                        backgroundColor: 'transparent',
                        fillStyle: 'solid' as const,
                        strokeWidth: 1,
                        strokeStyle: 'solid' as const,
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
                    })
                })
                currentY += elementHeight + 10
            }
        }

        const totalWidth = headers.length * (elementWidth + 20) + 20
        const totalHeight = elements.length > 0 ? Math.max(...elements.map(el => (el.y || 0) + (el.height || 0))) - startY + 100 : 400

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

        const filename = `csv-diagram-${Date.now()}.excalidraw`

        return {
            filename,
            contents: excalidrawData,
            elementCount: elements.length,
            layoutInfo: {
                totalWidth,
                totalHeight,
                elementSpacing: spacing,
            },
        }
    },
})

/**
 * Converts image descriptions to CSV format
 */
export const imageToCSVTool = createTool({
    id: 'image-to-csv',
    description: 'Converts image analysis data into structured CSV format',
    inputSchema: z.object({
        elements: z.array(z.object({
            id: z.string(),
            type: z.string(),
            x: z.number(),
            y: z.number(),
            width: z.number().optional(),
            height: z.number().optional(),
            text: z.string().optional(),
            strokeColor: z.string().optional(),
            backgroundColor: z.string().optional(),
            description: z.string().optional(),
        })).describe('Array of visual elements from image analysis'),
        filename: z.string().optional().describe('Optional filename for the CSV output'),
    }),
    outputSchema: z.object({
        csvContent: z.string(),
        filename: z.string(),
        elementCount: z.number(),
        columns: z.array(z.string()),
    }),
    execute: async ({ context }) => {
        const { elements, filename } = context

        const columns = [
            'id', 'type', 'x', 'y', 'width', 'height', 'text',
            'strokeColor', 'backgroundColor', 'description'
        ]

        let csvContent = columns.join(',') + '\n'

        elements.forEach(element => {
             const row = columns.map(col => {
                const value = (element as Record<string, unknown>)[col] ?? ''
                // Escape CSV values containing commas, quotes, or newlines
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`
                }
                return value
            })
            csvContent += row.join(',') + '\n'
        })

        const outputFilename = filename ?? `image-analysis-${Date.now()}.csv`

        return {
            csvContent,
            filename: outputFilename,
            elementCount: elements.length,
            columns,
        }
    },
})

/**
 * Validates and fixes Excalidraw JSON
 */
export const validateExcalidrawTool = createTool({
    id: 'validate-excalidraw',
    description: 'Validates and fixes Excalidraw JSON format',
    inputSchema: z.object({
        excalidrawData: z.any().describe('Excalidraw JSON data to validate'),
        autoFix: z.boolean().optional().default(true),
    }),
    outputSchema: z.object({
        isValid: z.boolean(),
        fixedData: ExcalidrawSchema.optional(),
        errors: z.array(z.string()),
        warnings: z.array(z.string()),
        elementCount: z.number(),
    }),
    execute: async ({ context }) => {
        const { excalidrawData, autoFix = true } = context
        const errors: string[] = []
        const warnings: string[] = []

        try {
            // Validate against schema
            const validation = ExcalidrawSchema.safeParse(excalidrawData)

            if (!validation.success) {
                errors.push(...validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`))
            }

            let fixedData = excalidrawData

            if (autoFix && errors.length > 0) {
                // Auto-fix common issues
                fixedData = { ...excalidrawData }

                // Ensure required fields
                fixedData.type ??= 'excalidraw';
                fixedData.version ??= 2;
                fixedData.source = fixedData.source ?? 'https://excalidraw.com';
                fixedData.elements ??= [];
                fixedData.appState ??= { viewBackgroundColor: '#ffffff' };

                // Fix elements
                if (Array.isArray(fixedData.elements)) {
                    fixedData.elements = fixedData.elements.map((element: unknown, index: number) => {
                        const fixedElement = { ...(element as Partial<ExcalidrawElementType>) } as Partial<ExcalidrawElementType>

                        // Generate ID if missing or empty
                        if (
                            fixedElement.id === undefined ||
                            fixedElement.id === null ||
                            (typeof fixedElement.id === 'string' && fixedElement.id.trim() === '')
                        ) {
                            fixedElement.id = `element-${Date.now()}-${index}`
                            warnings.push(`Generated missing ID for element ${index}`)
                        }

                        fixedElement.type = fixedElement.type ?? 'rectangle';
                        fixedElement.strokeColor ??= '#000000';
                        fixedElement.backgroundColor ??= 'transparent';
                        fixedElement.fillStyle = fixedElement.fillStyle ?? 'solid';
                        fixedElement.strokeWidth ??= 2;
                        fixedElement.strokeStyle = fixedElement.strokeStyle ?? 'solid';
                        fixedElement.roughness ??= 1;
                        fixedElement.opacity ??= 100;
                        fixedElement.angle ??= 0;
                        fixedElement.seed ??= Math.floor(Math.random() * 1000000);
                        fixedElement.version ??= 1;
                        fixedElement.versionNonce ??= Math.floor(Math.random() * 1000000);
                        fixedElement.isDeleted ??= false;
                        if (fixedElement.boundElements === undefined) {fixedElement.boundElements = null}
                        fixedElement.updated ??= Date.now();
                        if (fixedElement.link === undefined) {fixedElement.link = null}
                        fixedElement.locked ??= false;

                        // Type-specific fixes
                        if (fixedElement.type === 'rectangle' || fixedElement.type === 'ellipse') {
                            fixedElement.width ??= 100;
                            fixedElement.height ??= 50;
                        }

                        if (fixedElement.type === 'text') {
                            fixedElement.fontSize ??= 20;
                            fixedElement.fontFamily ??= 1;
                            fixedElement.textAlign ??= 'left';
                            fixedElement.verticalAlign ??= 'top';
                        }

                        if (fixedElement.type === 'arrow') {
                            fixedElement.points = fixedElement.points ?? [[0, 0], [100, 0]];
                            if (fixedElement.arrowheads === undefined) {fixedElement.arrowheads = 'arrow'}
                        }

                        return fixedElement
                    })
                }

                // Re-validate after fixes
                const revalidation = ExcalidrawSchema.safeParse(fixedData)
                if (revalidation.success) {
                    errors.length = 0 // Clear errors if fixed successfully
                    warnings.push('Auto-fixed validation errors')
                }
            }

            return {
                isValid: errors.length === 0,
                fixedData: errors.length === 0 ? undefined : fixedData,
                errors,
                warnings,
                elementCount: Array.isArray(fixedData?.elements) ? fixedData.elements.length : 0,
            }
        } catch (error) {
            return {
                isValid: false,
                errors: [`Validation failed: ${String(error)}`],
                warnings,
                elementCount: 0,
            }
        }
    },
})

/**
 * Processes SVG data and converts to JSON
 */
export const processSVGTool = createTool({
    id: 'process-svg',
    description: 'Processes SVG data and converts to structured JSON format',
    inputSchema: z.object({
        svgContent: z.string().describe('SVG content as string'),
        extractPaths: z.boolean().optional().default(true),
        extractText: z.boolean().optional().default(true),
        extractStyles: z.boolean().optional().default(true),
    }),
    outputSchema: z.object({
        svgJson: z.any(),
        paths: z.array(z.any()).optional(),
        textElements: z.array(z.string()).optional(),
        styles: z.record(z.string(), z.string()).optional(),
        dimensions: z.object({
            width: z.number().optional(),
            height: z.number().optional(),
            viewBox: z.string().optional(),
        }),
        elementCount: z.number(),
    }),
    execute: async ({ context }) => {
        const { svgContent, extractPaths = true, extractText = true, extractStyles = true } = context

        try {
            // Use svgjson to parse SVG
            const svgJson = svgjson(svgContent)

            const result: ProcessSVGResult = {
                svgJson,
                elementCount: 0,
                dimensions: {},
            }

            if (svgJson?.attributes) {
                const attrs = svgJson.attributes
                result.dimensions = {
                    width: attrs.width ? parseFloat(attrs.width) : undefined,
                    height: attrs.height ? parseFloat(attrs.height) : undefined,
                    viewBox: attrs.viewBox ?? undefined,
                }
            }

            // Extract paths if requested
            if (extractPaths && svgJson.children) {
                const paths: SvgJsonNode[] = []
                function extractPathsRecursive(element: SvgJsonNode) {
                    if (element.name === 'path') {
                        paths.push(element)
                    }
                    if (element.children) {
                        element.children.forEach(extractPathsRecursive)
                    }
                }
                extractPathsRecursive(svgJson)
                result.paths = paths
            }

            // Extract text elements if requested
            if (extractText && svgJson.children) {
                const textElements: string[] = []
                function extractTextRecursive(element: SvgJsonNode) {
                    if (element.name === 'text' || element.name === 'tspan') {
                        textElements.push(element.text ?? element.content ?? '')
                    }
                    if (element.children) {
                        element.children.forEach(extractTextRecursive)
                    }
                }
                extractTextRecursive(svgJson)
                result.textElements = textElements
            }

            // Extract styles if requested
            if (extractStyles) {
                const styles: Record<string, string> = {}

                function extractStylesRecursive(element: SvgJsonNode) {
                    if (element.attributes) {
                        const attrs = element.attributes
                        Object.keys(attrs).forEach(attr => {
                            if (attr.startsWith('style') || attr.includes('color') || attr.includes('stroke') || attr.includes('fill')) {
                                styles[attr] = attrs[attr]
                            }
                        })
                    }
                    if (element.children) {
                        element.children.forEach(extractStylesRecursive)
                    }
                }

                extractStylesRecursive(svgJson)
                result.styles = styles
            }

            result.elementCount = svgJson.children ? svgJson.children.length : 0

            return result
        } catch (error) {
            throw new Error(`SVG processing failed: ${String(error)}`)
        }
    },
})

/**
 * Processes XML data using xmldom
 */
export const processXMLTool = createTool({
    id: 'process-xml',
    description: 'Processes XML data and extracts structured information',
    inputSchema: z.object({
        xmlContent: z.string().describe('XML content as string'),
        extractElements: z.array(z.string()).optional().describe('Specific element names to extract'),
        extractAttributes: z.array(z.string()).optional().describe('Specific attributes to extract'),
    }),
    outputSchema: z.object({
        document: z.any(),
        elements: z.array(z.object({
            tagName: z.string(),
            textContent: z.string().nullable().optional(),
            attributes: z.any(),
            children: z.array(z.any()),
        })),
        extractedData: z.any(),
        rootElement: z.string(),
    }),
    execute: async ({ context }) => {
        const { xmlContent, extractElements = [], extractAttributes = [] } = context

        try {
            const parser = new DOMParser()
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')

            if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                throw new Error('XML parsing error')
            }

            const elements: XmlElementInfo[] = []
            const extractedData: ExtractedData = {}

            function traverseElements(element: Element): XmlElementInfo {
                const elementInfo: XmlElementInfo = {
                    tagName: element.tagName,
                    textContent: element.textContent,
                    attributes: {} as Record<string, string>,
                    children: [] as XmlElementInfo[],
                }

                // Extract attributes
                if (element.attributes !== null && element.attributes !== undefined && element.attributes.length > 0) {
                    for (let i = 0; i < element.attributes.length; i++) {
                        const attr = element.attributes[i]
                        elementInfo.attributes[attr.name] = attr.value
                    }
                }

                // Extract children: ensure there are any child nodes by checking the length
                if (element.hasChildNodes?.()) {
                    for (let i = 0; i < element.childNodes.length; i++) {
                        const child = element.childNodes[i]
                        if (child?.nodeType === 1) { // Element node
                            elementInfo.children.push(traverseElements(child as Element))
                        }
                    }
                }

                elements.push(elementInfo)
                return elementInfo
            }

            traverseElements(xmlDoc.documentElement)

            // Extract specific elements if requested
            if (extractElements.length > 0) {
                extractElements.forEach(elementName => {
                    const matchingElements = elements.filter(el => el.tagName === elementName)
                    if (matchingElements.length > 0) {
                        extractedData[elementName] = matchingElements
                    }
                })
            }

            // Extract specific attributes if requested
            if (extractAttributes.length > 0) {
                extractAttributes.forEach(attrName => {
                    elements.forEach(element => {
                        if (element.attributes[attrName]) {
                            // Initialize the attribute extraction array with the correct type
                            if (!(attrName in extractedData)) {
                                extractedData[attrName] = [] as Array<{ element: string; value: string }>
                            }
                            ;(extractedData[attrName] as Array<{ element: string; value: string }>).push({
                                element: element.tagName,
                                value: element.attributes[attrName],
                            })
                        }
                    })
                })
            }

            return {
                document: xmlDoc,
                elements,
                extractedData,
                rootElement: xmlDoc.documentElement?.tagName ?? 'unknown',
            }
        } catch (error) {
            throw new Error(`XML processing failed: ${String(error)}`)
        }
    },
})

/**
 * Converts data between different formats
 */
export const convertDataFormatTool = createTool({
    id: 'convert-data-format',
    description: 'Converts data between different formats (JSON, CSV, XML)',
    inputSchema: z.object({
        inputData: z.any().describe('Input data to convert'),
        inputFormat: z.enum(['json', 'csv', 'xml', 'excalidraw']),
        outputFormat: z.enum(['json', 'csv', 'xml', 'excalidraw']),
        options: z.any().optional().describe('Conversion options'),
    }),
    outputSchema: z.object({
        convertedData: z.any(),
        format: z.string(),
        metadata: z.object({
            originalFormat: z.string(),
            targetFormat: z.string(),
            conversionType: z.string(),
        }),
    }),
    execute: async ({ context }) => {
        const { inputData, inputFormat, outputFormat, options = {} } = context

        let convertedData: string | Record<string, unknown> | Array<Record<string, unknown>> | undefined
        const metadata = {
            originalFormat: inputFormat,
            targetFormat: outputFormat,
            conversionType: `${inputFormat}-to-${outputFormat}`,
        }

        try {
            switch (`${inputFormat}-${outputFormat}`) {
                case 'json-csv':
                    if (Array.isArray(inputData)) {
                        const rows = inputData as Array<Record<string, unknown>>
                        const headers = Object.keys(rows[0] ?? {})
                        let csv = headers.join(',') + '\n'
                        rows.forEach((row: Record<string, unknown>) => {
                            const values = headers.map(header => {
                                const value = row[header]
                                if (value === undefined || value === null) {
                                    return ''
                                }
                                if (typeof value === 'string') {
                                    return (value.includes(',') || value.includes('"'))
                                        ? `"${value.replace(/"/g, '""')}"`
                                        : value
                                }
                                // Convert non-string values to string
                                return String(value)
                            })
                            csv += values.join(',') + '\n'
                        })
                        convertedData = csv
                    } else {
                        convertedData = JSON.stringify(inputData)
                    }
                    break

                case 'csv-json':
                    { const lines = String(inputData).trim().split('\n')
                    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
                    convertedData = []

                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
                        const obj: Record<string, string> = {}
                        headers.forEach((header, index) => {
                            obj[header] = values[index] ?? ''
                        })
                        convertedData.push(obj)
                    }
                    break }

                case 'json-xml':
                    // Simple JSON to XML conversion
                    convertedData = jsonToXML(inputData, options.rootElement ?? 'root')
                    break

                case 'xml-json':
                    // This would require more complex parsing
                    convertedData = { error: 'XML to JSON conversion not implemented in this tool. Use processXMLTool instead.' }
                    break

                case 'excalidraw-csv':
                    // Ensure inputData is an object with an elements array before proceeding
                        {
                            type GenericElement = Record<string, unknown>
                            const inputObj = inputData as { elements?: GenericElement[] } | null | undefined
                            if (inputObj !== null && inputObj !== undefined && Array.isArray(inputObj.elements)) {
                        const columns = ['id', 'type', 'x', 'y', 'width', 'height', 'text', 'strokeColor', 'backgroundColor']
                        let csv = columns.join(',') + '\n'

                        const elementsArray = inputObj.elements
                        elementsArray.forEach((element: GenericElement) => {
                            const row = columns.map(col => {
                                const value = (element[col] ?? '')
                                return typeof value === 'string' && (value.includes(',') || value.includes('"'))
                                    ? `"${value.replace(/"/g, '""')}"`
                                    : value
                            })
                            csv += row.join(',') + '\n'
                        })
                        convertedData = csv
                        } else {
                            convertedData = inputData
                        }
                    }
                    break

                default:
                    convertedData = inputData
                    metadata.conversionType = 'no-conversion'
            }

            return {
                convertedData,
                format: outputFormat,
                metadata,
            }
        } catch (error) {
            throw new Error(`Data conversion failed: ${String(error)}`)
        }
    },
})

/**
 * Validates data against a schema
 */
export const validateDataTool = createTool({
    id: 'validate-data',
    description: 'Validates data against a specified schema',
    inputSchema: z.object({
        data: z.any().describe('Data to validate'),
        schemaType: z.enum(['excalidraw', 'csv', 'json', 'xml']),
        strict: z.boolean().optional().default(true),
    }),
    outputSchema: z.object({
        isValid: z.boolean(),
        errors: z.array(z.string()),
        warnings: z.array(z.string()),
        validatedData: z.any().optional(),
    }),
    execute: async ({ context }) => {
        const { data, schemaType, strict = true } = context
        const errors: string[] = []
        const warnings: string[] = []

        let isValid = false
        let validatedData: unknown = undefined

        try {
            switch (schemaType) {
                case 'excalidraw':
                    { const schemaToUse = strict ? ExcalidrawSchema : ExcalidrawSchema.partial()
                    const excalidrawValidation = schemaToUse.safeParse(data)
                    isValid = excalidrawValidation.success

                    if (!isValid && excalidrawValidation.error) {
                        errors.push(...excalidrawValidation.error.issues.map((e: z.core.$ZodIssue) => `${e.path.join('.')}: ${e.message}`))
                        if (!strict) {
                            // When not strict, attempt to accept partial data
                            warnings.push('Non-strict validation: some fields are missing or invalid; partial data accepted')
                            isValid = true
                            validatedData = data
                        }
                    } else {
                        validatedData = data
                    }
                    break }

                case 'csv':
                    // Basic CSV validation
                    { const csvString = String(data)
                    const lines = csvString.trim().split('\n')

                    if (lines.length === 0) {
                        errors.push('CSV data is empty')
                    } else {
                        const firstLine = lines[0]
                        if (!firstLine.includes(',') && strict) {
                            errors.push('No comma separators found in CSV header')
                        }

                        // Check for consistent column count
                        const headerColumns = firstLine.split(',').length
                        for (let i = 1; i < lines.length; i++) {
                            const columns = lines[i].split(',').length
                            if (columns !== headerColumns) {
                                if (strict) {
                                    errors.push(`Row ${i + 1} has ${columns} columns, expected ${headerColumns}`)
                                } else {
                                    warnings.push(`Row ${i + 1} has ${columns} columns, expected ${headerColumns}`)
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
                    break }

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
                        const parser = new DOMParser()
                        const xmlDoc = parser.parseFromString(String(data), 'text/xml')

                        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                            if (strict) {
                                errors.push('XML parsing error')
                            } else {
                                warnings.push('XML parsing error: non-strict mode accepted')
                                isValid = true
                                validatedData = data
                            }
                        } else {
                            isValid = true
                            validatedData = data
                        }
                    } catch (parseError) {
                        if (strict) {
                            errors.push(`XML validation failed: ${String(parseError)}`)
                        } else {
                            warnings.push(`XML validation error ignored in non-strict mode: ${String(parseError)}`)
                            isValid = true
                            validatedData = data
                        }
                    }
                    break
            }

            return {
                isValid,
                errors,
                warnings,
                validatedData,
            }
        } catch (error) {
            return {
                isValid: false,
                errors: [`Validation failed: ${String(error)}`],
                warnings,
            }
        }
    },
})

/**
 * Helper function to convert JSON to XML
 */
type JSONLike = string | number | boolean | null | JSONLike[] | { [key: string]: JSONLike }

function jsonToXML(data: JSONLike, rootElement = 'root'): string {
    function objectToXML(currentData: JSONLike, nodeName: string): string {
        if (currentData === null || currentData === undefined) {
            return ''
        }

        if (typeof currentData === 'string' || typeof currentData === 'number' || typeof currentData === 'boolean') {
            return `<${nodeName}>${currentData}</${nodeName}>`
        }

        if (Array.isArray(currentData)) {
            // For arrays, emit repeated child nodes. Attempt to use a singular form of the node name
            // by trimming a trailing 's' if present; otherwise, use the same node name.
            const singular = nodeName.endsWith('s') && nodeName.length > 1 ? nodeName.slice(0, -1) : nodeName
            return currentData.map((item) => objectToXML(item, singular)).join('')
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
