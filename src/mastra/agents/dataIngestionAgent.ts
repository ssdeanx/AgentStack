import { Agent } from '@mastra/core/agent'

import { log } from '../config/logger'

import { InternalSpans } from '@mastra/core/observability'
import type { AgentRequestContext } from './request-context'
import { USER_ID_CONTEXT_KEY } from './request-context'
import { csvToJsonTool } from '../tools/csv-to-json.tool'
import { chartSupervisorTool } from '../tools/financial-chart-tools'
import { LibsqlMemory } from '../config/libsql'

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
- **Workspace file tools**: Read and inspect CSV/data files.
- **File Tools**: list, info, and read data files.

## Workflow
1. **Locate**: Find file via 'listDataDirTool' and verify with 'getDataFileInfoTool'.
2. **Read**: Use workspace file tools to read the input data file.
3. **Parse**: Convert to JSON via 'csvToJsonTool'.
4. **Validate**: Check against schema using workspace diagnostics and prompt-guided validation.
5. **Return**: Validated JSON with metadata (rows, cols).

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
- **Guidelines**: Handle encoding issues; truncate if > ${maxRows} rows.
`
  },
  model: "google/gemini-3.1-flash-lite-preview",
  memory: LibsqlMemory,
  tools: dataIngestionTools,
  options: {
    tracingPolicy: {
      internal: InternalSpans.ALL,
    },
  },
  // defaultOptions: {
  //      autoResumeSuspendedTools: true,
  //  },
})

log.info('Data Ingestion Agent initialized')
