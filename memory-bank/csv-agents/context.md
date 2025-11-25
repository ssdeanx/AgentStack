# CSV Agents & Data Pipeline Networks - Implementation Context

## Reference Patterns

This document contains implementation patterns and code snippets derived from comprehensive analysis of the existing codebase and Mastra documentation.

## Agent Pattern Reference (ACCURATE - from researchAgent.ts)

Based on `src/mastra/agents/researchAgent.ts` and `reportAgent.ts`:

```typescript
import { Agent } from '@mastra/core/agents'
import { InternalSpans } from '@mastra/core/ai-tracing'
import { googleAI } from '../config/google'
import { pgMemory } from '../config/pg-storage'

export const exampleAgent = new Agent({
  id: 'example-agent',           // REQUIRED: unique identifier
  name: 'Example Agent',          // Human-readable name
  description: 'Clear description for network routing. Explains when to use this agent.',  // CRITICAL for network routing
  instructions: `You are an example agent. Your role is to...
  
  Workflow:
  1. Step one
  2. Step two
  3. Step three
  
  Always:
  - Guideline one
  - Guideline two`,
  model: googleAI,
  memory: pgMemory,              // Include for stateful agents
  tools: {
    toolOne,
    toolTwo,
  },
  options: {
    tracingPolicy: { internal: InternalSpans.ALL }  // From reportAgent pattern
  }
})
```

## Network Pattern Reference (CORRECTED - Networks are Agent instances)

Based on `src/mastra/networks/index.ts` - **Networks use the Agent class with agents/workflows properties, NOT AgentNetwork class**:

```typescript
import { Agent } from '@mastra/core/agents'
import { InternalSpans } from '@mastra/core/ai-tracing'
import { googleAI } from '../config/google'
import { pgMemory } from '../config/pg-storage'

// Import member agents
import { agentOne } from '../agents/agentOne'
import { agentTwo } from '../agents/agentTwo'

// Import workflows
import { workflowOne } from '../workflows/workflowOne'

export const exampleNetwork = new Agent({
  id: 'example-network',
  name: 'Example Network',
  description: 'A routing agent that coordinates specialized agents.',  // CRITICAL
  instructions: `You are a routing agent. Analyze requests and delegate to appropriate agents:
    
    - agentOne: Use for task type A
    - agentTwo: Use for task type B
    
    Always explain which agent you're delegating to and why.`,
  model: googleAI,
  memory: pgMemory,              // REQUIRED for .network() method
  options: { tracingPolicy: { internal: InternalSpans.ALL } },
  agents: { agentOne, agentTwo },  // Object of agents
  tools: {},                       // Can be empty
  workflows: { workflowOne }       // Object of workflows (optional)
})
```

## Tool Pattern Reference (from csv-to-json.tool.ts)

```typescript
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { AISpanType } from '@mastra/core/ai-tracing'

export const exampleTool = createTool({
  id: 'example-tool',
  description: 'Tool description for agent to understand when to use.',
  inputSchema: z.object({
    param1: z.string().describe('Parameter description'),
    options: z.object({...}).optional()
  }),
  outputSchema: z.object({
    result: z.any(),
    error: z.string().optional()
  }),
  execute: async ({ context, writer, runtimeContext, tracingContext }) => {
    // Progress streaming
    await writer?.write({ type: 'progress', data: { message: '📊 Starting...' } })
    
    // Tracing span
    const rootSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'example-tool',
      input: { ...context }
    })
    
    try {
      // Runtime context for configuration
      const config = runtimeContext?.get('contextKey')
      
      // Tool logic here...
      const result = { /* ... */ }
      
      rootSpan?.end({ output: result })
      await writer?.write({ type: 'progress', data: { message: '✅ Complete' } })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      rootSpan?.error({ error: error instanceof Error ? error : new Error(errorMessage) })
      return { result: null, error: errorMessage }
    }
  }
})
```

## Tool Imports (VERIFIED from codebase)

### CSV Tools (from tools/)

```typescript
import { csvToJsonTool } from '../tools/csv-to-json.tool'
import { jsonToCsvTool } from '../tools/json-to-csv.tool'
import { dataValidatorTool } from '../tools/data-validator.tool'
```

### Data File Manager Tools (from tools/data-file-manager.ts)

```typescript
import {
  readDataFileTool,
  writeDataFileTool,
  deleteDataFileTool,
  listDataDirTool,
  copyDataFileTool,
  moveDataFileTool,
  searchDataFilesTool,
  getDataFileInfoTool,
  createDataDirTool,
  removeDataDirTool,
  archiveDataTool,
  backupDataTool,
} from '../tools/data-file-manager'
```

### Data Processing Tools (from tools/data-processing-tools.ts)

```typescript
import {
  readCSVDataTool,
  csvToExcalidrawTool,
  imageToCSVTool,
  validateExcalidrawTool,
  processSVGTool,
  processXMLTool,
  convertDataFormatTool,
  validateDataTool,
} from '../tools/data-processing-tools'
```

### Web/Document Tools (for extended workflows)

```typescript
import { webScraperTool, batchWebScraperTool } from '../tools/web-scraper-tool'
import { readPDF } from '../tools/pdf'
import { mastraChunker, mdocumentChunker, documentRerankerTool } from '../tools/document-chunking.tool'
```

## Model Configuration (from config/google.ts)

```typescript
// Fast, cost-effective - use for simple agents (DataExport, DataIngestion)
import { googleAI } from '../config/google'  // gemini-2.5-flash

// More capable reasoning - use for complex agents (DataTransformation, Networks)
import { googleAI3 } from '../config/google'  // gemini-3-pro  

// Even faster, lighter weight - use for simple routing
import { googleAIFlashLite } from '../config/google'  // gemini-flash-lite
```

## Memory Configuration (from config/pg-storage.ts)

```typescript
// PostgreSQL memory with PgVector - REQUIRED for networks
import { pgMemory, pgVector, pgStore } from '../config/pg-storage'

// Memory features included:
// - lastMessages: 500 (conversation history)
// - semanticRecall: { topK: 5, messageRange: { before: 3, after: 2 }, scope: 'resource' }
// - workingMemory: { enabled: true, scope: 'resource', version: 'vnext' }
// - embedder: google.textEmbedding('gemini-embedding-001') (3072 dimensions)
```

## Existing Agent Registrations (from index.ts)

In `src/mastra/index.ts`, agents are registered like:

```typescript
export const mastra = new Mastra({
  workflows: { weatherWorkflow, contentStudioWorkflow },
  agents: {
    weatherAgent,
    a2aCoordinatorAgent,
    csvToExcalidrawAgent,
    imageToCsvAgent,
    copywriterAgent,
    editorAgent,
    excalidrawValidatorAgent,
    reportAgent,
    learningExtractionAgent,
    evaluationAgent,
    researchAgent,
    agentNetwork,
    contentStrategistAgent,
    scriptWriterAgent,
    // ADD NEW AGENTS HERE:
    dataExportAgent,
    dataIngestionAgent,
    dataTransformationAgent,
    dataPipelineNetwork,
    reportGenerationNetwork,
  },
  // ...
})
```

## Mastra Index Update Pattern

After creating agents/networks, update `src/mastra/index.ts`:

```typescript
// Add imports at top
import { dataExportAgent } from './agents/dataExportAgent'
import { dataIngestionAgent } from './agents/dataIngestionAgent'
import { dataTransformationAgent } from './agents/dataTransformationAgent'
import { dataPipelineNetwork } from './networks/dataPipelineNetwork'
import { reportGenerationNetwork } from './networks/reportGenerationNetwork'

// Add to agents object in Mastra constructor
agents: {
  // ... existing agents
  dataExportAgent,
  dataIngestionAgent, 
  dataTransformationAgent,
  dataPipelineNetwork,
  reportGenerationNetwork,
},

// Add to server.apiRoutes
chatRoute({
  path: "/chat",
  agent: "..., dataExportAgent, dataIngestionAgent, dataTransformationAgent",
  // ...
}),
networkRoute({
  path: "/network",
  agent: "agentNetwork, dataPipelineNetwork, reportGenerationNetwork",
  // ...
}),
```

## Testing Pattern (from Vitest)

```typescript
import { describe, it, expect } from 'vitest'
import { dataExportAgent } from '../dataExportAgent'

describe('DataExportAgent', () => {
  it('should be defined', () => {
    expect(dataExportAgent).toBeDefined()
  })

  it('should have correct id and name', () => {
    expect(dataExportAgent.id).toBe('data-export-agent')
    expect(dataExportAgent.name).toBe('Data Export Agent')
  })

  it('should have required tools', () => {
    const toolIds = Object.keys(dataExportAgent.tools)
    expect(toolIds).toContain('jsonToCsvTool')
    expect(toolIds).toContain('dataValidatorTool')
  })

  it('should have memory configured', () => {
    expect(dataExportAgent.memory).toBeDefined()
  })

  it('should have description for routing', () => {
    expect(dataExportAgent.description).toBeDefined()
    expect(dataExportAgent.description.length).toBeGreaterThan(20)
  })
})
```

## File Paths

| Component | Path |
|-----------|------|
| DataExportAgent | `src/mastra/agents/dataExportAgent.ts` |
| DataIngestionAgent | `src/mastra/agents/dataIngestionAgent.ts` |
| DataTransformationAgent | `src/mastra/agents/dataTransformationAgent.ts` |
| DataPipelineNetwork | `src/mastra/networks/dataPipelineNetwork.ts` |
| ReportGenerationNetwork | `src/mastra/networks/reportGenerationNetwork.ts` |
| Agent Tests | `src/mastra/agents/tests/csv-agents.test.ts` |
| Network Tests | `src/mastra/networks/tests/csv-networks.test.ts` |
| Networks Index | `src/mastra/networks/index.ts` (update exports) |
| Main Index | `src/mastra/index.ts` (register agents) |

## Validation Checklist

After implementation, verify:

1. **Build Check**: `npm run build` passes
2. **Lint Check**: `npx eslint src/mastra/agents/data*.ts src/mastra/networks/*.ts --max-warnings=0`
3. **Test Check**: `npm test` passes
4. **Type Check**: `npx tsc --noEmit`
5. **Import Check**: No circular dependencies
6. **Network Check**: Networks have memory configured

## Key Implementation Notes

1. **Networks MUST have memory** - Without `memory: pgMemory`, the `.network()` method won't work
2. **Agent descriptions are CRITICAL** - The routing agent uses descriptions to decide delegation
3. **Tools are objects, not arrays** - Use `tools: { toolName: toolInstance }` format
4. **Use InternalSpans.ALL** - For full tracing visibility during development
5. **Export from index files** - Update `networks/index.ts` to export new networks

---

**Ready for implementation after PRD, Design, and Tasks approval.**
