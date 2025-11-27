# System Patterns

## Architecture & Orchestration

- **A2A / MCP coordinator**: `src/mastra/mcp/index.ts` exposes the `a2aCoordinatorAgent` as an MCP server so external clients can orchestrate multiple agents. Many of the resource URIs and metadata entries are placeholders today; the core orchestration logic still lives primarily inside individual agents and the 4 agent networks.
- **Agent Networks**: 4 networks coordinate multi-agent workflows:
  - `agentNetwork`: Primary routing and general orchestration
  - `dataPipelineNetwork`: Data ingestion/export/transformation coordination
  - `reportGenerationNetwork`: Research → transform → report workflows
  - `researchPipelineNetwork`: arXiv → PDF parse → chunk → index flows
- **Tool-first agents**: 22+ agents wire 30+ tools (`polygon-tools.ts`, `serpapi-search.tool.ts`, `csv-to-json.tool.ts`, `arxiv.tool.ts`, `pdf-data-conversion.tool.ts`, etc.) w/ Zod (`createTool`).
- **RAG pipeline**: Document ingestion uses the document chunker tool (`document-chunking.tool.ts`), Gemini embeddings via `google.textEmbedding('gemini-embedding-001')`, and PgVector-backed indexes (index name `governed_rag`) exposed through `graphQueryTool` and `pgQueryTool` in `src/mastra/config/pg-storage.ts`.
- **Frontend Layer**: Next.js 16 App Router (`app/`) with 49 UI components:
  - **AI Elements** (`src/components/ai-elements/`): 30 components for chat/reasoning/canvas UIs
  - **Base Primitives** (`ui/`): 19 shadcn/ui components (Radix UI + Tailwind CSS 4)

## Patterns & Practices

- **Agent/tool orchestration**: Agents orchestrate multiple tools (SerpAPI search, web scraping, RAG queries, financial APIs, PDF conversion, etc.), sometimes combining them within a single run (for example the `researchAgent` coordinating search, evaluation, learning extraction, and vector queries).
- **Workflow-based coordination**: 10 workflows (`weather-workflow.ts`, `content-studio-workflow.ts`, `financial-report-workflow.ts`, `research-synthesis-workflow.ts`, etc.) define multi-step processes using Mastra DSL with sequential, parallel, branch, loop, foreach, and suspend/resume patterns.
- **Custom scorers & evaluators**: The scorer suite under `src/mastra/scorers` and `@mastra/evals` provides metrics for tool-call accuracy, completeness, translation quality, relevancy, safety, source diversity, research completeness, summary quality, task completion, response quality, and creativity. Scorers are attached selectively per agent rather than globally.
- **Schema-driven governance**: Zod + runtime contexts guard inputs and outputs, while sanitization helpers (JSDOM, Cheerio) clean HTML and path utilities prevent directory traversal. JWT auth exists as a tool but verification is currently stubbed, so RBAC/JWT enforcement is still evolving.
- **Component-driven UI**: AI Elements components build on shadcn/ui primitives with Radix UI accessibility and Tailwind CSS 4 styling (oklch color variables, dark mode support).

## Observability & Feedback

- **Tracing with Arize/Phoenix**: Observability is configured in `src/mastra/index.ts` using `CloudExporter`, `ArizeExporter`, and `DefaultExporter` from Mastra's tracing framework, with always-on sampling. Individual tools and storage helpers add spans and structured logs as needed.
- **Memory & storage**: PgVector embeddings for semantic recall plus PostgreSQL (via `PostgresStore`) provide persistent memory, while LibSQL (`LibSQLStore`) backs the local `mastra.db` instance used by the top-level Mastra bootstrap.
