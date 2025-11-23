# System Patterns

## Architecture & Orchestration

- **A2A / MCP coordinator**: `src/mastra/mcp/index.ts` exposes the `a2aCoordinatorAgent` as an MCP server so external clients can orchestrate multiple agents. Many of the resource URIs and metadata entries are placeholders today; the core orchestration logic still lives primarily inside individual agents.
- **Tool-first agents**: 17 agents wire 30+ tools (`polygon-tools.ts`, `serpapi-search.tool.ts`, `csv-to-json.tool.ts` etc.) w/ Zod (`createTool`).
- **RAG pipeline**: Document ingestion uses the document chunker tool (`document-chunking.tool.ts`), Gemini embeddings via `google.textEmbedding('gemini-embedding-001')`, and PgVector-backed indexes (index name `governed_rag`) exposed through `graphQueryTool` and `pgQueryTool` in `src/mastra/config/pg-storage.ts`.

## Patterns & Practices

- **Agent/tool orchestration**: Agents orchestrate multiple tools (SerpAPI search, web scraping, RAG queries, financial APIs, PDF conversion, etc.), sometimes combining them within a single run (for example the `researchAgent` coordinating search, evaluation, learning extraction, and vector queries).
- **Custom scorers & evaluators**: The scorer suite under `src/mastra/scorers` and `@mastra/evals` provides metrics for tool-call accuracy, completeness, translation quality, relevancy, safety, source diversity, research completeness, summary quality, task completion, response quality, and creativity. Scorers are attached selectively per agent rather than globally.
- **Schema-driven governance**: Zod + runtime contexts guard inputs and outputs, while sanitization helpers (JSDOM, Cheerio) clean HTML and path utilities prevent directory traversal. JWT auth exists as a tool but verification is currently stubbed, so RBAC/JWT enforcement is still evolving.

## Observability & Feedback

- **Tracing with Arize/Phoenix**: Observability is configured in `src/mastra/index.ts` using `CloudExporter`, `ArizeExporter`, and `DefaultExporter` from Mastra's tracing framework, with always-on sampling. Individual tools and storage helpers add spans and structured logs as needed.
- **Memory & storage**: PgVector embeddings for semantic recall plus PostgreSQL (via `PostgresStore`) provide persistent memory, while LibSQL (`LibSQLStore`) backs the local `mastra.db` instance used by the top-level Mastra bootstrap.
