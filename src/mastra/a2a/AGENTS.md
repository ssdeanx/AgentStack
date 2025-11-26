
<!-- AGENTS-META {"title":"A2A Coordinator","version":"2.0.0","applies_to":"/src/mastra/a2a","last_updated":"2025-11-26T00:00:00Z","status":"stable"} -->

# A2A Coordinator (`/src/mastra/a2a`)

## Persona

A2A Architect — objective: Design and implement Agent-to-Agent coordination for complex multi-agent workflows.

## Purpose

The A2A (Agent-to-Agent) directory contains the coordinator agent that orchestrates multiple specialized agents to handle complex tasks that require coordination across different domains.

## Key Files

| File                    | Export                | Purpose                                          |
| ----------------------- | --------------------- | ------------------------------------------------ |
| `a2aCoordinatorAgent.ts`| `a2aCoordinatorAgent` | Main coordinator agent for multi-agent routing   |

## A2A Coordinator Capabilities

The `a2aCoordinatorAgent` can:

1. **Route Tasks**: Analyze requests and delegate to appropriate specialist agents
2. **Parallel Orchestration**: Run multiple agents concurrently for faster results
3. **Sequential Workflows**: Chain agents for multi-step processes
4. **Result Synthesis**: Combine outputs from multiple agents into unified responses

## Coordinated Agent Categories

### Research & Knowledge
- `researchAgent`: Web research and information gathering
- `researchPaperAgent`: arXiv paper search and parsing
- `knowledgeIndexingAgent`: Vector store indexing and retrieval

### Content Creation
- `copywriterAgent`: Content writing and generation
- `editorAgent`: Content review and improvement
- `scriptWriterAgent`: Script writing for video/audio
- `contentStrategistAgent`: Content strategy development

### Data Processing
- `dataIngestionAgent`: CSV/data file parsing
- `dataTransformationAgent`: Data format conversion
- `dataExportAgent`: Data export and file creation
- `documentProcessingAgent`: PDF and document processing

### Financial Analysis
- `stockAnalysisAgent`: Stock market analysis

### Evaluation & Reports
- `evaluationAgent`: Quality scoring and evaluation
- `reportAgent`: Report generation
- `learningExtractionAgent`: Knowledge extraction

## Integration

The A2A coordinator is registered in `src/mastra/index.ts`:

```typescript
agents: {
  a2aCoordinatorAgent,
  // ... other agents
}
```

And exposed via MCP in `src/mastra/mcp/`:

```typescript
mcpServers: { a2aCoordinator: a2aCoordinatorMcpServer }
```

## Usage Patterns

### Direct Agent Call
```typescript
const result = await a2aCoordinatorAgent.generate('Research AAPL stock and create a report');
```

### Via MCP Tool
```typescript
// From MCP client
coordinate_a2a_task({
  task: 'Research AAPL stock and create a report',
  taskType: 'financial',
  workflow: 'sequential',
  priority: 'high'
});
```

---
## Change Log

| Version | Date (UTC) | Changes                                           |
| ------- | ---------- | ------------------------------------------------- |
| 2.0.0   | 2025-11-26 | Major update: documented all coordinated agents   |
| 1.0.0   | 2025-11-14 | Initial A2A coordinator implementation            |