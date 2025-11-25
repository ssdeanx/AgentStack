# CSV Agents & Data Pipeline Networks - Tasks

## Task Overview

| ID | Task | Status | Priority | Estimate |
|----|------|--------|----------|----------|
| CSV-001 | Create DataExportAgent | Not Started | High | 2h |
| CSV-002 | Create DataIngestionAgent | Not Started | High | 2h |
| CSV-003 | Create DataTransformationAgent | Not Started | High | 3h |
| CSV-004 | Create DataPipelineNetwork | Not Started | Medium | 2h |
| CSV-005 | Create ReportGenerationNetwork | Not Started | Medium | 2h |
| CSV-006 | Register agents in index.ts | Not Started | High | 0.5h |
| CSV-007 | Add basic tests | Not Started | Medium | 2h |

---

## CSV-001: Create DataExportAgent

**Status:** Not Started  
**Priority:** High  
**Estimate:** 2 hours

### Description
Create an agent that exports structured data to CSV format using existing CSV tools.

### Acceptance Criteria

- [ ] Agent created at `src/mastra/agents/dataExportAgent.ts`
- [ ] Uses `googleAI` model from config
- [ ] Integrates tools: `jsonToCsvTool`, `writeDataFileTool`, `dataValidatorTool`, `backupDataTool`
- [ ] Includes proper instructions for CSV export workflow
- [ ] Exports `dataExportAgent` from module
- [ ] Follows patterns from `researchAgent.ts`

### Implementation Notes

```typescript
// File: src/mastra/agents/dataExportAgent.ts
// Model: googleAI
// Tools: jsonToCsvTool, writeDataFileTool, dataValidatorTool, backupDataTool
// Memory: Optional (pgMemory if state needed)
```

### Dependencies

- `src/mastra/tools/json-to-csv.tool.ts`
- `src/mastra/tools/data-validator.tool.ts`
- `src/mastra/tools/data-file-manager.ts`
- `src/mastra/config/google.ts`

---

## CSV-002: Create DataIngestionAgent

**Status:** Not Started  
**Priority:** High  
**Estimate:** 2 hours

### Description
Create an agent that ingests and validates CSV files, converting them to JSON.

### Acceptance Criteria

- [ ] Agent created at `src/mastra/agents/dataIngestionAgent.ts`
- [ ] Uses `googleAI` model from config
- [ ] Integrates tools: `csvToJsonTool`, `readDataFileTool`, `dataValidatorTool`, `readCSVDataTool`
- [ ] Includes proper instructions for CSV ingestion workflow
- [ ] Exports `dataIngestionAgent` from module
- [ ] Handles validation schema from context

### Implementation Notes

```typescript
// File: src/mastra/agents/dataIngestionAgent.ts
// Model: googleAI
// Tools: csvToJsonTool, readDataFileTool, dataValidatorTool, readCSVDataTool
// RuntimeContext: DataIngestionContext with maxRows, validationSchema
```

### Dependencies

- `src/mastra/tools/csv-to-json.tool.ts`
- `src/mastra/tools/data-validator.tool.ts`
- `src/mastra/tools/data-file-manager.ts`
- `src/mastra/tools/data-processing-tools.ts`

---

## CSV-003: Create DataTransformationAgent

**Status:** Not Started  
**Priority:** High  
**Estimate:** 3 hours

### Description

Create an agent for complex format transformations between CSV, JSON, and XML.

### Acceptance Criteria

- [ ] Agent created at `src/mastra/agents/dataTransformationAgent.ts`
- [ ] Uses `googleAIPro` model (needs reasoning capabilities)
- [ ] Integrates tools: `csvToJsonTool`, `jsonToCsvTool`, `convertDataFormatTool`, `validateDataTool`, `processXMLTool`
- [ ] Includes comprehensive instructions for multi-format transformations
- [ ] Exports `dataTransformationAgent` from module
- [ ] Handles chained transformations

### Implementation Notes

```typescript
// File: src/mastra/agents/dataTransformationAgent.ts
// Model: googleAIPro (complex reasoning)
// Tools: csvToJsonTool, jsonToCsvTool, convertDataFormatTool, validateDataTool, processXMLTool
// RuntimeContext: DataTransformationContext with preserveTypes, flattenNested
```

### Dependencies

- `src/mastra/tools/csv-to-json.tool.ts`
- `src/mastra/tools/json-to-csv.tool.ts`
- `src/mastra/tools/data-processing-tools.ts`

---

## CSV-004: Create DataPipelineNetwork

**Status:** Not Started
**Priority:** Medium
**Estimate:** 2 hours

### Description
Create an agent network that routes data processing requests to appropriate specialist agents.

### Acceptance Criteria

- [ ] Network created at `src/mastra/networks/dataPipelineNetwork.ts`
- [ ] Includes agents: `dataExportAgent`, `dataIngestionAgent`, `dataTransformationAgent`, `reportAgent`
- [ ] Uses routing instructions for intent-based dispatch
- [ ] Integrates with `pgMemory` for state
- [ ] Exports `dataPipelineNetwork` from module
- [ ] Network accessible via `.network()` method

### Implementation Notes

```typescript
// File: src/mastra/networks/dataPipelineNetwork.ts
// Model: googleAI (for routing)
// Agents: dataExportAgent, dataIngestionAgent, dataTransformationAgent, reportAgent
// Memory: pgMemory
```

### Dependencies

- CSV-001: DataExportAgent
- CSV-002: DataIngestionAgent
- CSV-003: DataTransformationAgent
- `src/mastra/agents/reportAgent.ts`

---

## CSV-005: Create ReportGenerationNetwork

**Status:** Not Started  
**Priority:** Medium  
**Estimate:** 2 hours

### Description
Create an agent network that coordinates multi-step report generation workflows.

### Acceptance Criteria

- [ ] Network created at `src/mastra/networks/reportGenerationNetwork.ts`
- [ ] Includes agents: `dataIngestionAgent`, `dataTransformationAgent`, `researchAgent`, `reportAgent`
- [ ] Includes workflows: `weatherWorkflow` (as example data source)
- [ ] Uses routing instructions for workflow orchestration
- [ ] Exports `reportGenerationNetwork` from module

### Implementation Notes

```typescript
// File: src/mastra/networks/reportGenerationNetwork.ts
// Model: googleAIPro (complex orchestration)
// Agents: dataIngestionAgent, dataTransformationAgent, researchAgent, reportAgent
// Workflows: weatherWorkflow
// Memory: pgMemory
```

### Dependencies

- CSV-002: DataIngestionAgent
- CSV-003: DataTransformationAgent
- `src/mastra/agents/researchAgent.ts`
- `src/mastra/agents/reportAgent.ts`
- `src/mastra/workflows/weatherWorkflow.ts`

---

## CSV-006: Register Agents in index.ts

**Status:** Not Started  
**Priority:** High  
**Estimate:** 0.5 hours

### Description
Register new agents and networks in the main Mastra configuration.

### Acceptance Criteria

- [ ] Import new agents in `src/mastra/index.ts`
- [ ] Add agents to `agents` object in Mastra config
- [ ] Import new networks
- [ ] Verify no import errors
- [ ] Verify agents accessible via API

### Implementation Notes

```typescript
// In src/mastra/index.ts
import { dataExportAgent } from './agents/dataExportAgent'
import { dataIngestionAgent } from './agents/dataIngestionAgent'
import { dataTransformationAgent } from './agents/dataTransformationAgent'
import { dataPipelineNetwork } from './networks/dataPipelineNetwork'
import { reportGenerationNetwork } from './networks/reportGenerationNetwork'

// Add to agents object
agents: {
  // ... existing agents
  dataExportAgent,
  dataIngestionAgent,
  dataTransformationAgent,
}
```

### Dependencies

- CSV-001 through CSV-005 complete

---

## CSV-007: Add Basic Tests

**Status:** Not Started  
**Priority:** Medium  
**Estimate:** 2 hours

### Description
Create basic smoke tests for new agents and networks.

### Acceptance Criteria

- [ ] Test file at `src/mastra/agents/tests/csv-agents.test.ts`
- [ ] Test file at `src/mastra/networks/tests/csv-networks.test.ts`
- [ ] Tests verify agent creation without errors
- [ ] Tests verify tool bindings
- [ ] Tests verify network routing (basic)
- [ ] All tests pass with `npm test`

### Implementation Notes

```typescript
// Basic test structure
describe('DataExportAgent', () => {
  it('should be defined', () => {
    expect(dataExportAgent).toBeDefined()
  })
  
  it('should have required tools', () => {
    expect(dataExportAgent.tools).toContainEqual(
      expect.objectContaining({ id: 'json-to-csv' })
    )
  })
})
```

### Dependencies

- CSV-001 through CSV-006 complete

---

## Progress Tracking

### Sprint 1 (Implementation)

- [ ] CSV-001: DataExportAgent
- [ ] CSV-002: DataIngestionAgent
- [ ] CSV-003: DataTransformationAgent

### Sprint 2 (Networks & Integration)

- [ ] CSV-004: DataPipelineNetwork
- [ ] CSV-005: ReportGenerationNetwork
- [ ] CSV-006: Register in index.ts

### Sprint 3 (Testing)

- [ ] CSV-007: Add tests

---

**Next Step:** `/approve tasks` to begin implementation
