import { RequestContext } from "@mastra/core/request-context";
import type { InferUITool } from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import { trace } from "@opentelemetry/api";
import excalidrawToSvg from 'excalidraw-to-svg';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import svgjson from 'svgjson';
import { z } from 'zod';
import { log } from '../config/logger';

// Type for SVG JSON nodes from svgjson
interface SvgJsonNode extends RequestContext {
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
interface XmlElementInfo extends RequestContext {
  tagName: string
  textContent?: string | null
  attributes: Record<string, string>
  children: XmlElementInfo[]
}

// Type for extracted data produced by processXMLTool
type ExtractedData = Record<string, XmlElementInfo[] | Array<{ element: string; value: string }>>

// Type for processSVGTool result
interface ProcessSVGResult extends RequestContext {
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
  type: z.enum(['rectangle', 'ellipse', 'diamond', 'arrow', 'text', 'line', 'freedraw', 'image']),
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
  seed: z.number().default(Math.floor(Math.random() * 1000000)),
  version: z.number().default(1),
  versionNonce: z.number().default(Math.floor(Math.random() * 1000000)),
  isDeleted: z.boolean().default(false),
  boundElements: z.any().optional(),
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
  files: z.record(z.string(), z.any()).optional(),
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
    fileName: z.string().describe('The name of the CSV file (relative to data directory)'),
    hasHeaders: z.boolean().optional().default(true),
    delimiter: z.string().optional().default(','),
  }),
  outputSchema: z.object({
    headers: z.array(z.string()).optional(),
    rows: z.array(CSVRowSchema),
    rawCSV: z.string(),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Read CSV tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Read CSV received complete input', {
      toolCallId,
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
  execute: async (inputData, context) => {
    const writer = context?.writer;

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '📖 Reading CSV file: ' + inputData.fileName, stage: 'read:CSVdata' }, id: 'read:CSVdata' });

    const tracer = trace.getTracer('data-processing');
    const span = tracer.startSpan('read_csv_data', {
      attributes: {
        'tool.id': 'read:CSVdata',
        'tool.input.fileName': inputData.fileName,
      }
    });

    try {
      const { fileName, hasHeaders = true, delimiter = ',' } = inputData
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

      span.setAttributes({ 'tool.output.rowCount': rows.length, 'tool.output.headerCount': headers.length });
      span.end();
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Read ${rows.length} rows from CSV`, stage: 'read:CSVdata' }, id: 'read:CSVdata' });
      return { headers, rows, rawCSV: content }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      span.recordException(error instanceof Error ? error : new Error(errorMessage));
      span.setStatus({ code: 2, message: errorMessage });
      span.end();
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
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('CSV to Excalidraw tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('CSV to Excalidraw received complete input', {
      toolCallId,
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
      filename: output.filename,
      hook: 'onOutput',
    })
  },
  execute: async (inputData, context) => {
    const writer = context?.writer;

    const tracer = trace.getTracer('data-processing');
    const span = tracer.startSpan('csv-to-excalidraw', {
      attributes: {
        'tool.id': 'csv-to-excalidraw',
        'tool.input.layoutType': inputData.layoutType,
        'tool.input.hasHeaders': inputData.hasHeaders,
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🎨 Converting CSV to Excalidraw', stage: 'csv-to-excalidraw' }, id: 'csv-to-excalidraw' });
    const { csvData, layoutType = 'table', title, hasHeaders = true, delimiter = ',' } = inputData

    try {
      const lines = String(csvData ?? '').trim().length > 0 ? String(csvData).trim().split('\n') : []
      let headers: string[] = []
      let dataRows: string[][] = []

      if (hasHeaders && lines.length > 0) {
        headers = lines[0].split(delimiter).map((h: string) => h.trim().replace(/"/g, ''))
        dataRows = lines.slice(1).map((line: string) => line.split(delimiter).map((v: string) => v.trim().replace(/"/g, '')))
      } else {
        dataRows = lines.map((line: string) => line.split(delimiter).map((v: string) => v.trim().replace(/"/g, '')))
        headers = dataRows[0]?.map((_, index) => `Field ${index + 1}`) ?? []
      }

      // Typed elements array to avoid 'never' typing issues
      const elements: ExcalidrawElementType[] = []
      const spacing = 120
      const elementWidth = 100
      const elementHeight = 40
      const startX = 50
      const startY = 100

      // Generate unique IDs
      const generateId = (): string => Math.random().toString(36).substring(2, 15)

      // Title
      const titleText = typeof title === 'string' ? title.trim() : ''

      if (titleText.length > 0) {
        elements.push({
          id: generateId(),
          type: 'text',
          x: startX,
          y: startY - 60,
          width: titleText.length * 10,
          height: 30,
          text: titleText,
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

      if (layoutType === 'table') {
        // Create table layout
        let currentY = startY

        // Headers row
        headers.forEach((header: string, index: number) => {
          elements.push({
            id: generateId(),
            type: 'rectangle',
            x: startX + (index * (elementWidth + 20)),
            y: currentY,
            width: elementWidth,
            height: elementHeight,
            strokeColor: '#1976d2',
            backgroundColor: '#e3f2fd',
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

          elements.push({
            id: generateId(),
            type: 'text',
            x: startX + (index * (elementWidth + 20)) + 10,
            y: currentY + 10,
            width: elementWidth - 20,
            height: elementHeight - 20,
            text: header,
            fontSize: 12,
            fontFamily: 1,
            textAlign: 'center',
            verticalAlign: 'middle',
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
        })

        currentY += elementHeight + 20

        // Data rows (limit to first 10 rows to avoid overcrowding)
        const maxRows = Math.min(dataRows.length, 10)
        for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
          const row = dataRows[rowIndex]
          headers.forEach((_header: string, colIndex: number) => {
            elements.push({
              id: generateId(),
              type: 'rectangle',
              x: startX + (colIndex * (elementWidth + 20)),
              y: currentY,
              width: elementWidth,
              height: elementHeight,
              strokeColor: '#666666',
              backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f5f5f5',
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
              x: startX + (colIndex * (elementWidth + 20)) + 5,
              y: currentY + 5,
              width: elementWidth - 10,
              height: elementHeight - 10,
              text: row[colIndex] || '',
              fontSize: 10,
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
          })
          currentY += elementHeight + 10
        }
      }

      const totalWidth = headers.length * (elementWidth + 20) + 20
      const totalHeight = elements.length > 0
        ? Math.max(...elements.map((el) => (el.y ?? 0) + (el.height ?? 0))) - startY + 100
        : 400

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

      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Generated Excalidraw diagram with ${elements.length} elements`, stage: 'csv-to-excalidraw' }, id: 'csv-to-excalidraw' });

      const result = {
        filename,
        contents: excalidrawData,
        elementCount: elements.length,
        layoutInfo: {
          totalWidth,
          totalHeight,
          elementSpacing: spacing,
        },
      };

      span.setAttributes({ 'tool.output.elementCount': elements.length, 'tool.output.filename': filename });
      span.end();
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      span.recordException(error instanceof Error ? error : new Error(errorMessage));
      span.setStatus({ code: 2, message: errorMessage });
      span.end();
      throw error;
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
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Image to CSV tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Image to CSV received complete input', {
      toolCallId,
      elementCount: input.elements.length,
      filename: input.filename,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Image to CSV completed', {
      toolCallId,
      toolName,
      elementCount: output.elementCount,
      filename: output.filename,
      hook: 'onOutput',
    })
  },
  execute: async (inputData, context) => {
    const writer = context?.writer;

    const tracer = trace.getTracer('data-processing');
    const span = tracer.startSpan('image-to-csv', {
      attributes: {
        'tool.id': 'image-to-csv',
        'tool.input.elementCount': inputData.elements.length,
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🖼️ Converting image analysis to CSV', stage: 'image-to-csv' }, id: 'image-to-csv' });
    const { elements, filename } = inputData

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

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Converted ${elements.length} elements to CSV`, stage: 'image-to-csv' }, id: 'image-to-csv' });

    const result = {
      csvContent,
      filename: outputFilename,
      elementCount: elements.length,
      columns,
    };

    span.setAttributes({ 'tool.output.elementCount': elements.length, 'tool.output.filename': outputFilename });
    span.end();
    return result;
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
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Validate Excalidraw tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Validate Excalidraw received complete input', {
      toolCallId,
      autoFix: input.autoFix,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Validate Excalidraw completed', {
      toolCallId,
      toolName,
      isValid: output.isValid,
      errorCount: output.errors.length,
      elementCount: output.elementCount,
      hook: 'onOutput',
    })
  },
  execute: async (inputData, context) => {
    const writer = context?.writer;

    const tracer = trace.getTracer('data-processing');
    const span = tracer.startSpan('validate-excalidraw', {
      attributes: {
        'tool.id': 'validate-excalidraw',
        'tool.input.autoFix': inputData.autoFix,
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🔍 Validating Excalidraw data', stage: 'validate-excalidraw' }, id: 'validate-excalidraw' });
    const { excalidrawData, autoFix = true } = inputData
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
            if (fixedElement.boundElements === undefined) { fixedElement.boundElements = null }
            fixedElement.updated ??= Date.now();
            if (fixedElement.link === undefined) { fixedElement.link = null }
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
              if (fixedElement.arrowheads === undefined) { fixedElement.arrowheads = 'arrow' }
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

      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Validation complete. Valid: ${errors.length === 0}`, stage: 'validate-excalidraw' }, id: 'validate-excalidraw' });
      const result = {
        isValid: errors.length === 0,
        fixedData: errors.length === 0 ? undefined : fixedData,
        errors,
        warnings,
        elementCount: Array.isArray(fixedData?.elements) ? fixedData.elements.length : 0,
      };

      span.setAttributes({ 'tool.output.isValid': result.isValid, 'tool.output.errorCount': errors.length });
      span.end();
      return result;
    } catch (error) {
      const errorMsg = String(error);
      span.recordException(error instanceof Error ? error : new Error(errorMsg));
      span.setAttributes({ 'tool.output.isValid': false });
      span.end();
      return {
        isValid: false,
        errors: [`Validation failed: ${errorMsg}`],
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
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Process SVG tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Process SVG received complete input', {
      toolCallId,
      extractPaths: input.extractPaths,
      extractText: input.extractText,
      extractStyles: input.extractStyles,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Process SVG completed', {
      toolCallId,
      toolName,
      elementCount: output.elementCount,
      hook: 'onOutput',
    })
  },
  execute: async (inputData, context) => {
    const writer = context?.writer;

    const tracer = trace.getTracer('data-processing');
    const span = tracer.startSpan('process-svg', {
      attributes: {
        'tool.id': 'process-svg',
        'tool.input.extractPaths': inputData.extractPaths,
        'tool.input.extractText': inputData.extractText,
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🖼️ Processing SVG content', stage: 'process-svg' }, id: 'process-svg' });
    const { svgContent, extractPaths = true, extractText = true, extractStyles = true } = inputData

    try {
      // Use svgjson to parse SVG
      const svgJson = svgjson.svg2json(svgContent) as SvgJsonNode

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

      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Processed SVG with ${result.elementCount} elements`, stage: 'process-svg' }, id: 'process-svg' });
      span.setAttributes({ 'tool.output.elementCount': result.elementCount });
      span.end();
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      span.recordException(error instanceof Error ? error : new Error(errorMessage));
      span.setStatus({ code: 2, message: errorMessage });
      span.end();
      throw new Error(`SVG processing failed: ${errorMessage}`)
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
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Process XML tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Process XML received complete input', {
      toolCallId,
      extractElements: input.extractElements?.join(','),
      extractAttributes: input.extractAttributes?.join(','),
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Process XML completed', {
      toolCallId,
      toolName,
      elementCount: output.elements.length,
      rootElement: output.rootElement,
      hook: 'onOutput',
    })
  },
  execute: async (inputData, context) => {
    const writer = context?.writer;

    const tracer = trace.getTracer('data-processing');
    const span = tracer.startSpan('process-xml', {
      attributes: {
        'tool.id': 'process-xml',
        'tool.input.extractElements': inputData.extractElements?.join(','),
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '📄 Processing XML content', stage: 'process-xml' }, id: 'process-xml' });
    const { xmlContent, extractElements = [], extractAttributes = [] } = inputData

    try {
      // Configure fast-xml-parser for secure and detailed parsing
      const parserOptions = {
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        parseAttributeValue: true,
        trimValues: true,
        ignoreDeclaration: true,
        removeNSPrefix: false,
        allowBooleanAttributes: true,
      }

      const parser = new XMLParser(parserOptions)
      const xmlDoc = parser.parse(xmlContent)

      const elements: XmlElementInfo[] = []
      const extractedData: ExtractedData = {}

      function traverseElements(obj: Record<string, unknown> | unknown): XmlElementInfo[] {
        const result: XmlElementInfo[] = []

        if (typeof obj !== 'object' || obj === null) {
          return result
        }

        for (const [key, value] of Object.entries(obj)) {
          if (key.startsWith('@_')) {
            continue // Skip attributes at this level
          }

          const tagName = key
          const elementInfo: XmlElementInfo = {
            tagName,
            textContent: null,
            attributes: {} as Record<string, string>,
            children: [] as XmlElementInfo[],
          }

          if (typeof value === 'object' && value !== null) {
            // Extract attributes
            for (const [attrKey, attrValue] of Object.entries(value)) {
              if (attrKey.startsWith('@_')) {
                const attrName = attrKey.substring(2)
                elementInfo.attributes[attrName] = String(attrValue)
              } else if (attrKey === '#text') {
                elementInfo.textContent = String(attrValue)
              }
            }

            // Extract children
            for (const [childKey, childValue] of Object.entries(value)) {
              if (!childKey.startsWith('@_') && childKey !== '#text') {
                if (Array.isArray(childValue)) {
                  childValue.forEach((item) => {
                    const childElements = traverseElements({ [childKey]: item })
                    elementInfo.children.push(...childElements)
                  })
                } else {
                  const childElements = traverseElements({ [childKey]: childValue })
                  elementInfo.children.push(...childElements)
                }
              }
            }
          } else {
            elementInfo.textContent = String(value)
          }

          result.push(elementInfo)
          elements.push(elementInfo)
        }

        return result
      }

      // Start traversal from root
      traverseElements(xmlDoc)

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
              ; (extractedData[attrName] as Array<{ element: string; value: string }>).push({
                element: element.tagName,
                value: element.attributes[attrName],
              })
            }
          })
        })
      }

      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Processed XML with ${elements.length} elements`, stage: 'process-xml' }, id: 'process-xml' });

      const rootElement = elements.length > 0 ? elements[0].tagName : 'unknown'

      const result = {
        document: xmlDoc,
        elements,
        extractedData,
        rootElement,
      };

      span.setAttributes({ 'tool.output.elementCount': elements.length, 'tool.output.rootElement': result.rootElement });
      span.end();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      span.recordException(error instanceof Error ? error : new Error(errorMessage));
      span.setStatus({ code: 2, message: errorMessage });
      span.end();
      throw new Error(`XML processing failed: ${errorMessage}`)
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
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Convert data format tool input streaming started', {
      toolCallId,
      hook: 'onInputStart',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Convert data format received complete input', {
      toolCallId,
      inputFormat: input.inputFormat,
      outputFormat: input.outputFormat,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Convert data format completed', {
      toolCallId,
      toolName,
      success: true,
      format: output.format,
      hook: 'onOutput',
    })
  },
  execute: async (inputData, context) => {
    const writer = context?.writer;

    const tracer = trace.getTracer('data-processing');
    const span = tracer.startSpan('convert-data-format', {
      attributes: {
        'tool.id': 'convert-data-format',
        'tool.input.inputFormat': inputData.inputFormat,
        'tool.input.outputFormat': inputData.outputFormat,
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🔄 Converting data from ${inputData.inputFormat} to ${inputData.outputFormat}`, stage: 'convert-data-format' }, id: 'convert-data-format' });
    const { inputData: dataToConvert, inputFormat, outputFormat, options = {} } = inputData

    let convertedData: string | Record<string, unknown> | Array<Record<string, unknown>> | undefined
    const metadata = {
      originalFormat: inputFormat,
      targetFormat: outputFormat,
      conversionType: `${inputFormat}-${outputFormat}`,
    }

    try {
      switch (`${inputFormat}-${outputFormat}`) {
        case 'json-csv':
          if (Array.isArray(dataToConvert)) {
            const rows = dataToConvert as Array<Record<string, unknown>>
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
            convertedData = JSON.stringify(dataToConvert)
          }
          break

        case 'csv-json':
          {
            const lines = String(dataToConvert).trim().split('\n')
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
            break
          }

        case 'json-xml':
          // Simple JSON to XML conversion
          convertedData = jsonToXML(dataToConvert, options.rootElement ?? 'root')
          break

        case 'xml-json':
          // This would require more complex parsing
          convertedData = { error: 'XML to JSON conversion not implemented in this tool. Use processXMLTool instead.' }
          break

        case 'excalidraw-csv':
          // Ensure dataToConvert is an object with an elements array before proceeding
          {
            type GenericElement = Record<string, unknown>
            const inputObj = dataToConvert as { elements?: GenericElement[] } | null | undefined
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
              convertedData = dataToConvert
            }
          }
          break

        default:
          convertedData = dataToConvert
          metadata.conversionType = 'no-conversion'
      }

      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Data conversion successful', stage: 'convert-data-format' }, id: 'convert-data-format' });

      const result = {
        convertedData,
        format: outputFormat,
        metadata,
      };

      span.setAttributes({ 'tool.output.success': true, 'tool.output.format': outputFormat });
      span.end();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      span.recordException(error instanceof Error ? error : new Error(errorMessage));
      span.setStatus({ code: 2, message: errorMessage });
      span.end();
      throw new Error(`Data conversion failed: ${errorMessage}`)
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
  execute: async (inputData, context) => {
    const writer = context?.writer;

    const tracer = trace.getTracer('data-processing');
    const span = tracer.startSpan('validate-data', {
      attributes: {
        'tool.id': 'validate-data',
        'tool.input.schemaType': inputData.schemaType,
        'tool.input.strict': inputData.strict,
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Validating ${inputData.schemaType} data`, stage: 'validate-data' }, id: 'validate-data' });
    const { data, schemaType, strict = true } = inputData
    const errors: string[] = []
    const warnings: string[] = []

    let isValid = false
    let validatedData: unknown = undefined

    try {
      switch (schemaType) {
        case 'excalidraw':
          {
            const schemaToUse = strict ? ExcalidrawSchema : ExcalidrawSchema.partial()
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
            break
          }

        case 'csv':
          // Basic CSV validation
          {
            const csvString = String(data)
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
                  // Duplicated checking logic in original code, simplifying
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

            if (parsed === null || parsed === undefined || (typeof parsed === 'object' && Object.keys(parsed).length === 0)) {
              if (strict) {
                errors.push('XML parsing error: no valid root element found')
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

      await writer?.write({ type: 'progress', data: { message: `✅ Validation complete. Valid: ${isValid}` } });

      const result = {
        isValid,
        errors,
        warnings,
        validatedData,
      };

      span.setAttributes({ 'tool.output.isValid': isValid, 'tool.output.errorCount': errors.length });
      span.end();
      return result;
    } catch (error) {
      const errorMsg = String(error);
      span.recordException(error instanceof Error ? error : new Error(errorMsg));
      span.setAttributes({ 'tool.output.isValid': false });
      span.end();
      return {
        isValid: false,
        errors: [`Validation failed: ${errorMsg}`],
        warnings,
        elementCount: 0,
      }
    }
  },
})

/**
 * Helper function to convert JSON to XML using fast-xml-parser
 */
type JSONLike = string | number | boolean | null | JSONLike[] | { [key: string]: JSONLike }

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

      if (typeof currentData === 'string' || typeof currentData === 'number' || typeof currentData === 'boolean') {
        return `<${nodeName}>${currentData}</${nodeName}>`
      }

      if (Array.isArray(currentData)) {
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
}


/**
 * Converts Excalidraw diagram to SVG format
 */
export const excalidrawToSVGTool = createTool({
  id: 'excalidraw-to-svg',
  description: 'Converts Excalidraw diagram data to SVG format for rendering and export',
  inputSchema: z.object({
    excalidrawData: ExcalidrawSchema.describe('Excalidraw diagram data to convert'),
    exportOptions: z.object({
      exportPadding: z.number().optional().default(10).describe('Padding around the diagram in pixels'),
      exportBackground: z.boolean().optional().default(true).describe('Whether to include background color'),
      viewBackgroundColor: z.string().optional().describe('Background color override'),
      exportWithDarkMode: z.boolean().optional().default(false).describe('Export with dark mode theme'),
      exportScale: z.number().optional().default(1).describe('Scale factor for export (1 = 100%)'),
    }).optional(),
    saveToFile: z.boolean().optional().describe('Whether to save SVG to file'),
    fileName: z.string().optional().describe('Optional filename for saved SVG'),
  }),
  outputSchema: z.object({
    svgContent: z.string().describe('Generated SVG content'),
    savedFilePath: z.string().optional().describe('Path to saved file if saveToFile was true'),
    dimensions: z.object({
      width: z.number(),
      height: z.number(),
    }).describe('SVG dimensions'),
    elementCount: z.number().describe('Number of Excalidraw elements converted'),
  }),
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
  execute: async (inputData, context) => {
    const writer = context?.writer;

    const tracer = trace.getTracer('data-processing');
    const span = tracer.startSpan('excalidraw-to-svg', {
      attributes: {
        'tool.id': 'excalidraw-to-svg',
        'tool.input.elementCount': inputData.excalidrawData.elements.length,
        'tool.input.saveToFile': inputData.saveToFile,
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🎨 Converting Excalidraw to SVG', stage: 'excalidraw-to-svg' }, id: 'excalidraw-to-svg' });

    try {
      // Validate Excalidraw data
      const validation = ExcalidrawSchema.safeParse(inputData.excalidrawData)
      if (!validation.success) {
        throw new Error(`Invalid Excalidraw data: ${validation.error.message}`)
      }

      // Convert to SVG
      const svgContent = await excalidrawToSvg(
        inputData.excalidrawData,
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
            typeof providedName === 'string' && providedName.trim().length > 0
              ? providedName.endsWith('.svg')
                ? providedName
                : `${providedName}.svg`
              : `excalidraw-${Date.now()}.svg`

          const fullPath = validateDataPath(fileName)
          await fs.mkdir(path.dirname(fullPath), { recursive: true })
          await fs.writeFile(fullPath, svgContent, 'utf-8')
          savedFilePath = fileName

          await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `💾 Saved SVG to ${fileName}`, stage: 'excalidraw-to-svg' }, id: 'excalidraw-to-svg' });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `⚠️ Failed to save file: ${errorMsg}`, stage: 'excalidraw-to-svg' }, id: 'excalidraw-to-svg' });
        }
      }

      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Converted ${inputData.excalidrawData.elements.length} elements to SVG`, stage: 'excalidraw-to-svg' }, id: 'excalidraw-to-svg' });

      const result = {
        svgContent,
        savedFilePath,
        dimensions,
        elementCount: inputData.excalidrawData.elements.length,
      };

      span.setAttributes({
        'tool.output.elementCount': result.elementCount,
        'tool.output.width': dimensions.width,
        'tool.output.height': dimensions.height,
      });
      span.end();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      span.recordException(error instanceof Error ? error : new Error(errorMessage));
      span.setStatus({ code: 2, message: errorMessage });
      span.end();
      throw new Error(`Excalidraw to SVG conversion failed: ${errorMessage}`)
    }
  },
})

/**
 * Converts SVG back to Excalidraw format (simplified conversion)
 */
export const svgToExcalidrawTool = createTool({
  id: 'svg-to-excalidraw',
  description: 'Converts SVG content to Excalidraw diagram format (basic shapes only)',
  inputSchema: z.object({
    svgContent: z.string().describe('SVG content to convert'),
    title: z.string().optional().describe('Optional title for the diagram'),
  }),
  outputSchema: z.object({
    excalidrawData: ExcalidrawSchema,
    elementCount: z.number(),
    warnings: z.array(z.string()).optional(),
  }),
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
  execute: async (inputData, context) => {
    const writer = context?.writer;

    const tracer = trace.getTracer('data-processing');
    const span = tracer.startSpan('svg-to-excalidraw', {
      attributes: {
        'tool.id': 'svg-to-excalidraw',
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🔄 Converting SVG to Excalidraw', stage: 'svg-to-excalidraw' }, id: 'svg-to-excalidraw' });

    try {
      // Parse SVG using svgjson
      const svgJson = svgjson.svg2json(inputData.svgContent) as SvgJsonNode
      const elements: ExcalidrawElementType[] = []
      const warnings: string[] = []
      const generateId = (): string => Math.random().toString(36).substring(2, 15)

      // Add title if provided
      if (typeof inputData.title === 'string' && inputData.title.trim().length > 0) {
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
      function convertSvgElement(node: SvgJsonNode, parentX = 0, parentY = 0) {
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
              strokeWidth: parseFloat(attrs['stroke-width'] || '2'),
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
              strokeWidth: parseFloat(attrs['stroke-width'] || '2'),
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
            if (typeof textContent === 'string' && textContent.length > 0) {
              elements.push({
                id: generateId(),
                type: 'text',
                x,
                y,
                width: textContent.length * 8,
                height: 20,
                text: textContent,
                fontSize: parseFloat(attrs['font-size'] ?? '16'),
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
                versionNonce: Math.floor(Math.random() * 1000000),
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
            warnings.push(`Complex shape '${node.name}' converted to basic rectangle approximation`)
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
              strokeWidth: parseFloat(attrs['stroke-width'] || '2'),
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
          node.children.forEach(child => convertSvgElement(child, x, y))
        }
      }

      // Process SVG root and children
      if (svgJson.children) {
        svgJson.children.forEach(child => convertSvgElement(child))
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

      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Converted to ${elements.length} Excalidraw elements`, stage: 'svg-to-excalidraw' }, id: 'svg-to-excalidraw' });

      const result = {
        excalidrawData,
        elementCount: elements.length,
        warnings: warnings.length > 0 ? warnings : undefined,
      };

      span.setAttributes({ 'tool.output.elementCount': elements.length });
      span.end();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      span.recordException(error instanceof Error ? error : new Error(errorMessage));
      span.setStatus({ code: 2, message: errorMessage });
      span.end();
      throw new Error(`SVG to Excalidraw conversion failed: ${errorMessage}`)
    }
  },
})

export type ReadCSVDataToolUITool = InferUITool<typeof readCSVDataTool>;
export type ImageToCSVUITool = InferUITool<typeof imageToCSVTool>;
export type DataProcessingUITool = InferUITool<typeof convertDataFormatTool>;
export type ExcalidrawValidationUITool = InferUITool<typeof validateExcalidrawTool>;
export type SVGProcessingUITool = InferUITool<typeof processSVGTool>;
export type XMLProcessingUITool = InferUITool<typeof processXMLTool>;
export type DataValidationUITool = InferUITool<typeof validateDataTool>;
export type ExcalidrawToSVGUITool = InferUITool<typeof excalidrawToSVGTool>;
export type SVGToExcalidrawUITool = InferUITool<typeof svgToExcalidrawTool>;
