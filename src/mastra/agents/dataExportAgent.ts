import { Agent } from '@mastra/core/agent'

import { googleAI } from '../config/google'
import { pgMemory } from '../config/pg-storage'
import { log } from '../config/logger'

import { jsonToCsvTool } from '../tools/json-to-csv.tool'
import { dataValidatorToolJSON } from '../tools/data-validator.tool'
import {
    writeDataFileTool,
    backupDataTool,
    listDataDirTool,
} from '../tools/data-file-manager'
import type { RequestContext } from '@mastra/core/request-context'

export interface DataExportContext {
    userId?: string
    outputDirectory?: string
    overwriteExisting?: boolean
    delimiter?: string
}

log.info('Initializing Data Export Agent...')

export const dataExportAgent = new Agent({
  id: 'dataExportAgent',
    name: 'Data Export Agent',
    description:
        'Converts structured data to CSV format and manages file output. Use for creating CSV exports, formatting data tables, saving structured data to files, and backing up existing data.',
    instructions: ({ requestContext }: { requestContext: RequestContext<DataExportContext> }) => {
        const userId = requestContext.get('userId') ?? 'default'
        const outputDirectory = requestContext.get('outputDirectory') ?? './data'
        const overwriteExisting = requestContext.get('overwriteExisting') ?? false
        const delimiter = requestContext.get('delimiter') ?? ','

        return `You are a Data Export Specialist. Your role is to convert structured data into clean, valid CSV files.

## Configuration
- User: ${userId}
- Output Directory: ${outputDirectory}
- Overwrite Existing: ${overwriteExisting}
- CSV Delimiter: ${delimiter}

## Workflow

1. **Validate Input Data**
   - Use dataValidatorTool to verify the input data structure
   - Ensure data is an array of objects with consistent keys
   - Report any validation errors clearly

2. **Prepare for Export**
   - If overwriting, use backupDataTool to create a backup first
   - Use listDataDirTool to check if file already exists

3. **Convert to CSV**
   - Use jsonToCsvTool to convert the validated JSON data
   - Apply the configured delimiter
   - Ensure headers are included

4. **Write Output**
   - Use writeDataFileTool to save the CSV to the output directory
   - Return the file path and row count

## Guidelines

- Always validate data before conversion
- Handle arrays of objects as rows, object keys as headers
- Escape special characters (quotes, delimiters, newlines) properly
- Report any validation or conversion errors clearly
- Provide a summary: file path, row count, column count

## Error Handling

- If validation fails, return detailed error messages per field
- If file exists and overwrite is false, ask for confirmation
- If backup fails, abort the export and report the issue
`
    },
    model: googleAI,
    memory: pgMemory,
    tools: {
        jsonToCsvTool,
        dataValidatorToolJSON,
        writeDataFileTool,
        backupDataTool,
        listDataDirTool,
    },
})

log.info('Data Export Agent initialized')
