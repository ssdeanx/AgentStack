<!-- AGENTS-META {"title":"Mastra Agents","version":"2.0.0","applies_to":"/src/mastra/agents","last_updated":"2025-11-26T00:00:00Z","status":"stable"} -->

# Agents (`/src/mastra/agents`)

## Persona

Agent Developer — objective: Implement higher-level behaviors by composing tools into responsible, auditable agents.

## Purpose

This directory contains 22+ agent definitions that map use-case intents to sequences of tool invocations, policies, and memory usage.

## Current Agents (31 files)

| File                         | Export                     | Agent ID                   | Purpose                                                          | Dependencies                      |
| ---------------------------- | -------------------------- | -------------------------- | ---------------------------------------------------------------- | --------------------------------- |
| `a2aCoordinatorAgent.ts`     | `a2aCoordinatorAgent`      | `a2aCoordinator`           | Orchestrates and routes tasks across multiple specialized agents | Core Mastra, Agent Registry       |
| `weather-agent.ts`           | `weatherAgent`             | `weatherAgent`             | Fetches weather data and suggests activities                     | `weatherTool`, Web Scraping Tools |
| `csv_to_excalidraw.ts`       | `csvToExcalidrawAgent`     | `csvToExcalidrawAgent`     | Converts CSV data to Excalidraw diagrams                         | Data Processing Tools             |
| `image_to_csv.ts`            | `imageToCsvAgent`          | `imageToCsvAgent`          | Extracts tabular data from images                                | Image Processing, OCR Tools       |
| `excalidraw_validator.ts`    | `excalidrawValidatorAgent` | `excalidrawValidatorAgent` | Validates and fixes Excalidraw diagrams                          | Data Validation Tools             |
| `reportAgent.ts`             | `reportAgent`              | `reportAgent`              | Generates formatted reports from processed data                  | Data Processing, Templating       |
| `learningExtractionAgent.ts` | `learningExtractionAgent`  | `learningExtractionAgent`  | Extracts learnings and insights from content                     | NLP, Text Processing              |
| `evaluationAgent.ts`         | `evaluationAgent`          | `evaluationAgent`          | Evaluates and scores agent performance and content quality       | Evaluation Metrics, Scorers       |
| `researchAgent.ts`           | `researchAgent`            | `research`                 | Conducts research using web search and analysis tools            | SerpAPI, Web Scraping             |
| `editorAgent.ts`             | `editorAgent`              | `editorAgent`              | Reviews and improves written content                             | Content Processing, NLP           |
| `copywriterAgent.ts`         | `copywriterAgent`          | `copywriterAgent`          | Handles content writing and generation                           | NLP, Content Generation           |
| `contentStrategistAgent.ts`  | `contentStrategistAgent`   | `contentStrategistAgent`   | Develops content strategies and plans                            | Research Tools                    |
| `scriptWriterAgent.ts`       | `scriptWriterAgent`        | `scriptWriterAgent`        | Writes scripts for video and audio content                       | NLP, Script Formatting            |
| `stockAnalysisAgent.ts`      | `stockAnalysisAgent`       | `stockAnalysisAgent`       | Analyzes stock market data with technical/fundamental analysis   | Polygon, Finnhub, AlphaVantage    |
| `recharts.ts`                | `chartTypeAdvisorAgent`    | `chart-type-advisor`       | Recommends optimal Recharts chart types for financial data       | Recharts                          |
| `recharts.ts`                | `chartDataProcessorAgent`  | `chart-data-processor`     | Transforms financial API data into Recharts format               | Polygon, Finnhub, AlphaVantage    |
| `recharts.ts`                | `chartGeneratorAgent`      | `chart-generator`          | Generates Recharts React component code                          | Recharts                          |
| `recharts.ts`                | `chartSupervisorAgent`     | `chart-supervisor`         | Orchestrates the chart creation pipeline                         | Polygon, Finnhub, AlphaVantage    |
| `dataExportAgent.ts`         | `dataExportAgent`          | `dataExportAgent`          | JSON → CSV conversion, file writing, backup, validation          | CSV/JSON Tools, File System       |
| `dataIngestionAgent.ts`      | `dataIngestionAgent`       | `dataIngestionAgent`       | CSV parsing, file reading, structure validation                  | CSV/JSON Tools, File System       |
| `dataTransformationAgent.ts` | `dataTransformationAgent`  | `dataTransformationAgent`  | CSV↔JSON↔XML transformations and restructuring                   | Data Processing Tools             |
| `researchPaperAgent.ts`      | `researchPaperAgent`       | `researchPaperAgent`       | Search arXiv, download papers, parse PDFs to markdown            | arXiv Tools, PDF Tools            |
| `documentProcessingAgent.ts` | `documentProcessingAgent`  | `documentProcessingAgent`  | Convert PDFs to markdown, chunk documents for RAG                | PDF Tools, Chunking Tools         |
| `knowledgeIndexingAgent.ts`  | `knowledgeIndexingAgent`   | `knowledgeIndexingAgent`   | Index documents into PgVector, semantic search with reranking    | RAG Tools, PgVector               |
| `socialMediaAgent.ts`        | `socialMediaAgent`         | `social-media-agent`       | Creates and schedules social media content across platforms      | Content Tools, Calendar Tools     |
| `seoAgent.ts`                | `seoAgent`                 | `seo-agent`                | Optimizes content for search engines and performance tracking    | Research Tools, Content Tools     |
| `translationAgent.ts`        | `translationAgent`         | `translation-agent`        | Professional translation with cultural adaptation                | Evaluation Tools, Research Tools  |
| `customerSupportAgent.ts`    | `customerSupportAgent`     | `customer-support-agent`   | Handles customer inquiries and technical support                 | Research Tools, Report Tools      |
| `projectManagementAgent.ts`  | `projectManagementAgent`   | `project-management-agent` | Manages projects, tasks, timelines, and team coordination        | Calendar Tools, Report Tools      |
| `dane.ts`                    | `dane`                     | `dane`                     | Utility agent for development and testing                        | Various                           |
| `sql.ts`                     | `sqlAgent`                 | `sqlAgent`                 | SQL query generation and database operations                     | pg-sql-tool                       |

## Agent Development

### How to Add a New Agent

1. **Create Agent File**
    - Create `src/mastra/agents/your-agent-name.ts`
    - Follow the pattern from existing agents

    ```typescript
    import { Agent } from '@mastra/core/agent'

    export const yourAgent = new Agent({
        id: 'your-agent-id',
        name: 'Your Agent Name',
        description: 'Brief description of what this agent does',
        // ... other configurations
    })
    ```

2. **Register the Agent**
    - Add your agent to `src/mastra/index.ts` in the agents object

    ```typescript
    export const mastra = new Mastra({
        agents: {
            // ... other agents
            yourAgent,
        },
        // ... rest of config
    })
    ```

3. **Add Tests**
    - Create tests in `src/mastra/__tests__/agents/your-agent.test.ts`
    - Test both success and error cases

## Best Practices

- **Single Responsibility**: Each agent should have one clear purpose
- **Tool Usage**: Use existing tools from `src/mastra/tools` when possible
- **Error Handling**: Implement proper error handling and validation
- **Logging**: Use the provided logger for consistent logging
- **Testing**: Write unit tests for all agent functionality
- **Documentation**: Document your agent's purpose, inputs, and outputs

## Execution & Testing

Run tests:

```bash
# Run all agent tests
npm test src/mastra/__tests__/agents/

# Run a specific agent's tests
npm test src/mastra/__tests__/agents/your-agent.test.ts
```

## Dependencies

- `@mastra/core`: Core agent framework
- Various tools from `src/mastra/tools`
- Configuration from `src/mastra/config`

## Related Documentation

- [Tools Documentation](../tools/AGENTS.md)
- [Configuration Guide](../config/README.md)
- [Mastra Core Documentation](https://docs.mastra.ai/core/agents)

## Change Log

| Version | Date (UTC) | Changes                                                                                                                              |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 2.2.0   | 2025-12-15 | Added 5 new specialized agents: socialMediaAgent, seoAgent, translationAgent, customerSupportAgent, projectManagementAgent.          |
| 2.1.0   | 2025-11-28 | Added 4 Financial Chart agents: chartTypeAdvisorAgent, chartDataProcessorAgent, chartGeneratorAgent, chartSupervisorAgent.           |
| 2.0.0   | 2025-11-26 | Major update: 22 agents documented. Added data pipeline, research paper, document processing, knowledge indexing agents.             |
| 1.2.0   | 2025-11-19 | Added content creation and stock analysis agents.                                                                                    |
| 1.1.0   | 2025-11-16 | Complete reorganization of agents documentation. Added detailed sections for each agent, development guidelines, and best practices. |
| 1.0.0   | 2025-11-15 | Initial version with core agents for web scraping, data processing, and API integrations.                                            |
