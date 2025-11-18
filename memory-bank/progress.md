# Progress

## What’s Done

- Mastra bootstrap (`src/mastra/index.ts`) wires up the weather workflow, agents, tools, vectors, storage, and observability.
- Core agents implemented and registered: weather, research, stock analysis, csv↔Excalidraw, image→CSV, Excalidraw validator, learning extraction, evaluation, report, editor, copywriter, and the A2A coordinator.
- Tooling suite under `src/mastra/tools` provides financial APIs (AlphaVantage, Finnhub, Polygon), SerpAPI-based research tools, document chunking, PDF conversion, JWT auth scaffolding, and web scraping.
- A2A/MCP coordinator server implemented under `src/mastra/mcp` and registered in `index.ts` as `mcpServers: { a2aCoordinator: a2aCoordinatorMcpServer }`.
- Scorers for weather and richer evaluation registered via `src/mastra/scorers` and attached to agents like `weatherAgent` and `researchAgent`.
- Observability is wired using Mastra tracing exporters (`CloudExporter`, `ArizeExporter`, `DefaultExporter`) with sampling configured in the Mastra instance.
- `/memory-bank` has been audited against the actual codebase (agents, tools, config, MCP, scorers) so that descriptions no longer rely on README marketing claims or guessed coverage numbers.

## What’s Next

- Add or update tests to cover new tools/agents and improve Vitest coverage (see `src/mastra/tools/tests` and `src/mastra/config/tests`), using `tests/test-results/test-results.json` as a baseline for tracking.
- Tighten alignment between AGENTS docs and actual code (ensure every documented agent/tool exists and vice versa).
- Expand evaluation and observability dashboards (Arize/Phoenix) using the existing exporters and scorer outputs.
- Flesh out the A2A coordinator’s orchestration story so that the MCP metadata and prompts reflect real, wired workflows rather than placeholders.

## Current Blockers / Risks

- Requires correct environment configuration (database connection, model API keys, financial API keys, `PHOENIX_ENDPOINT`/`PHOENIX_API_KEY`/`PHOENIX_PROJECT_NAME`, etc.) to exercise all capabilities.
- A2A coordination complexity grows with new agents; needs careful documentation and evaluation to avoid misalignment.
- JWT auth is currently stubbed; until verification is implemented and policies are enforced, flows that depend on strict auth should be treated as experimental.
