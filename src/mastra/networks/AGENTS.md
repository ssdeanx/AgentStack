<!-- AGENTS-META {"title":"Mastra Networks","version":"2.0.0","applies_to":"/src/mastra/networks","last_updated":"2025-11-26T00:00:00Z","status":"stable"} -->

# Agent Networks (`/src/mastra/networks`)

## Persona

Network Architect — objective: Design and implement agent routing networks that coordinate multiple specialized agents.

## Purpose

Networks are routing agents that coordinate multiple specialized agents to handle complex tasks. They analyze requests and delegate to the most appropriate agent or workflow.

## Current Networks (4 files)

| File                         | Export                    | Purpose                                                                    | Agents Coordinated                                          | Workflows Integrated                                    |
| ---------------------------- | ------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| `index.ts`                   | `agentNetwork`            | Primary network: routes to research, stock, weather, content agents        | research, stockAnalysis, weather, copywriter, editor, report| weatherWorkflow                                         |
| `dataPipelineNetwork.ts`     | `dataPipelineNetwork`     | Data processing: CSV/JSON operations, import/export/transform              | dataExport, dataIngestion, dataTransformation, report       | stockAnalysisWorkflow                                   |
| `reportGenerationNetwork.ts` | `reportGenerationNetwork` | Report coordination: research → transform → report workflows               | dataIngestion, dataTransformation, research, report         | weatherWorkflow, financialReport, researchSynthesis, learningExtraction |
| `researchPipelineNetwork.ts` | `researchPipelineNetwork` | Research lifecycle: arXiv → PDF → chunk → index → query                    | researchPaper, documentProcessing, knowledgeIndexing, research | documentProcessingWorkflow, contentReviewWorkflow      |

## Network Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     agentNetwork (Primary)                      │
│  Routes: research | stock | weather | content | general         │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌──────────────────┐   ┌────────────────────┐
│dataPipelineNet│   │reportGenerationNet│   │researchPipelineNet │
│               │   │                  │   │                    │
│ CSV/JSON ops  │   │ Multi-source     │   │ arXiv → Index      │
│ Import/Export │   │ Report workflows │   │ PDF → RAG          │
└───────────────┘   └──────────────────┘   └────────────────────┘
```

## How Networks Work

1. **Request Analysis**: Network analyzes user intent and keywords
2. **Agent Selection**: Routes to most appropriate specialist agent
3. **Workflow Integration**: Can invoke workflows for multi-step tasks
4. **Result Synthesis**: Combines agent outputs into unified response

## Routing Triggers

### agentNetwork
- **Research**: "research", "find out", "learn about"
- **Stock Analysis**: "stock", "crypto", "market", "finance"
- **Weather**: "weather" + "what to do"
- **Content**: "write", "copywrite", "edit"

### dataPipelineNetwork
- **Export**: "export", "create csv", "save as csv"
- **Import**: "import", "read csv", "parse csv"
- **Transform**: "convert", "transform", "restructure"

### reportGenerationNetwork
- **Research Report**: topic research → synthesis
- **Data Analysis**: import → transform → report
- **Financial Report**: multi-source financial data

### researchPipelineNetwork
- **Paper Search**: arXiv search and download
- **Document Processing**: PDF → markdown → chunks
- **Knowledge Indexing**: vector store indexing

## How to add a network

1. Create network file in `src/mastra/networks/`
2. Define routing instructions and agent coordination
3. Export from `index.ts`
4. Register in `src/mastra/index.ts`

## Best practices

- Keep routing logic clear and deterministic
- Use specific trigger keywords for each agent
- Chain agents for complex multi-step workflows
- Preserve context when passing between agents
- Log routing decisions for debugging

---
## Change Log

| Version | Date (UTC) | Changes                                                    |
| ------- | ---------- | ---------------------------------------------------------- |
| 2.0.0   | 2025-11-26 | Major update: 4 networks with workflows, architecture diagram |
| 1.0.0   | 2025-11-14 | Initial version with agentNetwork                          |
