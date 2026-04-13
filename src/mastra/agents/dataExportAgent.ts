import { Agent } from '@mastra/core/agent'

import { log } from '../config/logger'

import { InternalSpans } from '@mastra/core/observability'
import { TokenLimiterProcessor } from '@mastra/core/processors'
import { USER_ID_CONTEXT_KEY, type AgentRequestContext } from './request-context'
import { jsonToCsvTool } from '../tools/json-to-csv.tool'
import { LibsqlMemory } from '../config/libsql'

export type DataExportContext = AgentRequestContext<{
  outputDirectory?: string
  overwriteExisting?: boolean
  delimiter?: string
}>

log.info('Initializing Data Export Agent...')

const OUTPUT_DIRECTORY_CONTEXT_KEY = 'outputDirectory' as const
const OVERWRITE_EXISTING_CONTEXT_KEY = 'overwriteExisting' as const
const DELIMITER_CONTEXT_KEY = 'delimiter' as const

const dataExportTools = {
  jsonToCsvTool,
}

export const dataExportAgent = new Agent({
  id: 'dataExportAgent',
  name: 'Data Export Agent',
  description:
    'Converts structured data to CSV format and manages file output. Use for creating CSV exports, formatting data tables, saving structured data to files, and backing up existing data.',
  instructions: ({ requestContext }) => {
    const rawUserId = requestContext.get(USER_ID_CONTEXT_KEY)
    const rawOutputDirectory = requestContext.get(OUTPUT_DIRECTORY_CONTEXT_KEY)
    const rawOverwriteExisting = requestContext.get(OVERWRITE_EXISTING_CONTEXT_KEY)
    const rawDelimiter = requestContext.get(DELIMITER_CONTEXT_KEY)

    const userId = typeof rawUserId === 'string' ? rawUserId : 'default'
    const outputDirectory =
      typeof rawOutputDirectory === 'string' ? rawOutputDirectory : './data'
    const overwriteExisting =
      typeof rawOverwriteExisting === 'boolean' ? rawOverwriteExisting : false
    const delimiter = typeof rawDelimiter === 'string' ? rawDelimiter : ','

    return `
# Data Export Specialist
User: ${userId} | Out: ${outputDirectory} | Overwrite: ${overwriteExisting}

## Workflow
1. **Validate**: Use 'dataValidatorTool' to verify structure.
2. **Prepare**: Use 'backupDataTool' if overwriting; check existence with 'listDataDirTool'.
3. **Convert**: Use 'jsonToCsvTool' with delimiter: ${delimiter}.
4. **Write**: Use 'writeDataFileTool' and return summary (path, rows).

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
- **Guidelines**: Escape special characters; report errors clearly.
`
  },
  model: "google/gemini-3.1-flash-lite-preview",
  memory: LibsqlMemory,
  tools: dataExportTools,
  options: {
    tracingPolicy: {
      internal: InternalSpans.ALL,
    },
  },
  outputProcessors: [new TokenLimiterProcessor(1048576)],
  //   defaultOptions: {
  //       autoResumeSuspendedTools: true,
  //  },
})

log.info('Data Export Agent initialized')
