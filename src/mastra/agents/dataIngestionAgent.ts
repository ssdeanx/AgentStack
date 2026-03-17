import { Agent } from '@mastra/core/agent'

import { log } from '../config/logger'
import { pgMemory } from '../config/pg-storage'

import { InternalSpans } from '@mastra/core/observability'
import { TokenLimiterProcessor } from '@mastra/core/processors'
import type { AgentRequestContext } from './request-context'
import { USER_ID_CONTEXT_KEY } from './request-context'
import { csvToJsonTool } from '../tools/csv-to-json.tool'
import {
  getDataFileInfoTool,
  listDataDirTool,
  readDataFileTool,
} from '../tools/data-file-manager'
import { readCSVDataTool } from '../tools/data-processing-tools'
import { dataValidatorToolJSON } from '../tools/data-validator.tool'
import { chartSupervisorTool } from '../tools/financial-chart-tools'

export type DataIngestionContext = AgentRequestContext<{
  sourceDirectory?: string
  validationSchema?: object
  maxRows?: number
}>

log.info('Initializing Data Ingestion Agent...')

const SOURCE_DIRECTORY_CONTEXT_KEY = 'sourceDirectory' as const
const MAX_ROWS_CONTEXT_KEY = 'maxRows' as const

const dataIngestionTools = {
  csvToJsonTool,
  readCSVDataTool,
  readDataFileTool,
  dataValidatorToolJSON,
  listDataDirTool,
  getDataFileInfoTool,
  chartSupervisorTool,
}

export const dataIngestionAgent = new Agent({
  id: 'dataIngestionAgent',
  name: 'Data Ingestion Agent',
  description:
    'Parses CSV files, validates data structure, and converts to JSON format. Use for importing CSV data, reading data files, validating CSV structure, and extracting structured data from files.',
  instructions: ({ requestContext }) => {
    const rawUserId = requestContext.get(USER_ID_CONTEXT_KEY)
    const rawSourceDirectory = requestContext.get(SOURCE_DIRECTORY_CONTEXT_KEY)
    const rawMaxRows = requestContext.get(MAX_ROWS_CONTEXT_KEY)

    const userId = typeof rawUserId === 'string' ? rawUserId : 'default'
    const sourceDirectory =
      typeof rawSourceDirectory === 'string' ? rawSourceDirectory : './data'
    const maxRows = typeof rawMaxRows === 'number' ? rawMaxRows : 10000

    return `
# Data Ingestion Specialist
User: ${userId} | Dir: ${sourceDirectory} | Max Rows: ${maxRows}

## Tools
- **csvToJsonTool**: Parse CSV to JSON array.
- **readCSVDataTool**: Read CSV with header detection.
- **dataValidatorTool**: Validate against schema.
- **File Tools**: list, info, and read data files.

## Workflow
1. **Locate**: Find file via 'listDataDirTool' and verify with 'getDataFileInfoTool'.
2. **Read**: Use 'readDataFileTool' or 'readCSVDataTool'.
3. **Parse**: Convert to JSON via 'csvToJsonTool'.
4. **Validate**: Check against schema via 'dataValidatorTool'.
5. **Return**: Validated JSON with metadata (rows, cols).

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
- **Guidelines**: Handle encoding issues; truncate if > ${maxRows} rows.
`
  },
  model: "google/gemini-3.1-flash-lite-preview",
  memory: pgMemory,
  tools: dataIngestionTools,
  options: {
    tracingPolicy: {
      internal: InternalSpans.ALL,
    },
  },
  outputProcessors: [new TokenLimiterProcessor(1048576)],
  // defaultOptions: {
  //      autoResumeSuspendedTools: true,
  //  },
})

log.info('Data Ingestion Agent initialized')
