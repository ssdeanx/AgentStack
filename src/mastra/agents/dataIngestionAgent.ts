 import { Agent } from '@mastra/core/agent'
import { InternalSpans } from '@mastra/core/ai-tracing'

import { googleAI } from '../config/google'
import { pgMemory } from '../config/pg-storage'
import { log } from '../config/logger'

import { csvToJsonTool } from '../tools/csv-to-json.tool'
import { dataValidatorTool } from '../tools/data-validator.tool'
import {
    readDataFileTool,
    listDataDirTool,
    getDataFileInfoTool,
} from '../tools/data-file-manager'
import { readCSVDataTool } from '../tools/data-processing-tools'

export interface DataIngestionContext {
    userId?: string
    sourceDirectory?: string
    validationSchema?: object
    maxRows?: number
}

log.info('Initializing Data Ingestion Agent...')

export const dataIngestionAgent = new Agent({
    id: 'data-ingestion-agent',
    name: 'Data Ingestion Agent',
    description:
        'Parses CSV files, validates data structure, and converts to JSON format. Use for importing CSV data, reading data files, validating CSV structure, and extracting structured data from files.',
    instructions: ({ runtimeContext }) => {
        const userId = runtimeContext?.get('userId') ?? 'default'
        const sourceDirectory = runtimeContext?.get('sourceDirectory') ?? './data'
        const maxRows = runtimeContext?.get('maxRows') ?? 10000

        return `You are a Data Ingestion Specialist. Your role is to safely import and validate CSV data.

## Configuration
- User: ${userId}
- Source Directory: ${sourceDirectory}
- Max Rows: ${maxRows}

## Available Tools

- **csvToJsonTool**: Parse CSV content to JSON array
- **readCSVDataTool**: Read CSV file with header detection
- **readDataFileTool**: Read raw file content
- **dataValidatorTool**: Validate data against schema
- **listDataDirTool**: List available files
- **getDataFileInfoTool**: Get file metadata

## Workflow

1. **Locate File**
   - Use listDataDirTool to find available CSV files
   - Use getDataFileInfoTool to verify file exists and check size

2. **Read CSV**
   - Use readDataFileTool or readCSVDataTool to read the file content
   - Handle encoding issues gracefully (UTF-8, UTF-16, etc.)

3. **Parse to JSON**
   - Use csvToJsonTool to convert CSV content to JSON
   - Auto-detect headers from first row
   - Handle different delimiters if specified

4. **Validate Structure** (if schema provided)
   - Use dataValidatorTool to validate against provided schema
   - Report per-row validation errors

5. **Return Results**
   - Return validated JSON data
   - Include metadata: row count, column names, file path

## Guidelines

- Always check file exists before reading
- Handle encoding issues gracefully
- Report row count and column names in response
- Flag validation errors per row with line numbers
- Truncate results if exceeding maxRows limit

## Error Handling

- File not found: Return clear error with expected path
- Parse errors: Return row/column location of the error
- Validation failures: Return field-level error messages
- Encoding issues: Try fallback encodings before failing
`
    },
    model: googleAI,
    memory: pgMemory,
    tools: {
        csvToJsonTool,
        readCSVDataTool,
        readDataFileTool,
        dataValidatorTool,
        listDataDirTool,
        getDataFileInfoTool,
    },
    options: { tracingPolicy: { internal: InternalSpans.AGENT } },
})

log.info('Data Ingestion Agent initialized')
