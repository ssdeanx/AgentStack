# Progress

## What's Done **[Synced Nov 25 from dirs/AGENTS.md]**

| Category | Status | Key Files/Details |
|----------|--------|-------------------|
| Bootstrap | ✅ | `index.ts`: agents/tools/workflows/MCP/pg-storage/observability. |
| Agents | 23 files | a2aCoordinatorAgent.ts, researchAgent.ts, stockAnalysisAgent.ts, copywriterAgent.ts, editorAgent.ts, reportAgent.ts, scriptWriterAgent.ts, contentStrategistAgent.ts, learningExtractionAgent.ts, evaluationAgent.ts, weather-agent.ts, excalidraw_validator.ts, csv_to_excalidraw.ts, image_to_csv.ts, dataExportAgent.ts, dataIngestionAgent.ts, dataTransformationAgent.ts, **researchPaperAgent.ts**, **documentProcessingAgent.ts**, **knowledgeIndexingAgent.ts** (+ dane.ts/sql.ts/package-publisher.ts). |
| Networks | 4 files | agentNetwork, dataPipelineNetwork, reportGenerationNetwork, **researchPipelineNetwork** |
| Tools | 30+ | Financial: polygon-tools.ts(10+), finnhub-tools.ts(6+), alpha-vantage.tool.ts; Research: serpapi-*.tool.ts(5+), **arxiv.tool.ts** (search, pdf-parser, downloader); Data: csv-to-json.tool.ts, json-to-csv.tool.ts, data-validator.tool.ts; RAG: **document-chunking.tool.ts** (mastraChunker, mdocumentChunker, documentRerankerTool), **pdf-data-conversion.tool.ts** (pdfToMarkdownTool); Web: browser-tool.ts, web-scraper-tool.ts; Other: jwt-auth.tool.ts, execa-tool.ts, github.ts, fs.ts. |
| Workflows | 5 | weather-workflow.ts, content-studio-workflow.ts, changelog.ts, new-contributor.ts, telephone-game.ts. |
| MCP | ✅ | `mcp/index.ts`: a2aCoordinatorMcpServer; tools: coordinate_a2a_task etc. |
| Scorers | ✅ | weather-scorer.ts, custom-scorers.ts. |
| Observability | ✅ | Arize/Phoenix exporters; always-on sampling. |
| Config | ✅ | pg-storage.ts (PgVector/Postgres); models (google/openai/anthropic/openrouter/vertex/gemini-cli). |
| Tests | Progress | Vitest data tools verified; target 97%. |

## What’s Next

- **Research & Document Processing Feature** (✅ Complete):
  - ✅ ResearchPaperAgent: Search arXiv, download papers, parse PDFs
  - ✅ DocumentProcessingAgent: PDF→markdown, document chunking
  - ✅ KnowledgeIndexingAgent: PgVector indexing, semantic search with reranking
  - ✅ ResearchPipelineNetwork: Coordinates full research workflow

- **CSV Agents Feature** (✅ Complete):
  - ✅ DataExportAgent, DataIngestionAgent, DataTransformationAgent
  - ✅ DataPipelineNetwork, ReportGenerationNetwork
  
- Add or update tests to cover new tools/agents and improve Vitest coverage (see `src/mastra` and `src/mastra/config/tests`), using `tests/test-results/test-results.json` as a baseline for tracking.
- Tighten alignment between AGENTS docs and actual code (ensure every documented agent/tool exists and vice versa).
- Expand evaluation and observability dashboards (Arize/Phoenix) using the existing exporters and scorer outputs.
- Flesh out the A2A coordinator’s orchestration story so that the MCP metadata and prompts reflect real, wired workflows rather than placeholders.

## Current Blockers / Risks

- Requires correct environment configuration (database connection, model API keys, financial API keys, `PHOENIX_ENDPOINT`/`PHOENIX_API_KEY`/`PHOENIX_PROJECT_NAME`, etc.) to exercise all capabilities.
- A2A coordination complexity grows with new agents; needs careful documentation and evaluation to avoid misalignment.
- JWT auth is currently stubbed; until verification is implemented and policies are enforced, flows that depend on strict auth should be treated as experimental.
