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
import { TokenLimiterProcessor } from '@mastra/core/processors'

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
    model: googleAI,
    memory: pgMemory,
    tools: {
        jsonToCsvTool,
        dataValidatorToolJSON,
        writeDataFileTool,
        backupDataTool,
        listDataDirTool,
    },
    outputProcessors: [new TokenLimiterProcessor(1048576)],
    defaultOptions: {
      autoResumeSuspendedTools: true,
    },
})

log.info('Data Export Agent initialized')
