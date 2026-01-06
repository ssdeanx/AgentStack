# Progress

## What's Done **[Synced Dec 8 from session work]**

| Category                    | Status    | Key Files/Details                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bootstrap                   | ✅         | `index.ts`: 25+ agents, 12 workflows, 4 networks, MCP/pg-storage/observability.                                                                                                                                                                                                                                                                                                                                                                                              |
| Agents                      | 22+ files | a2aCoordinatorAgent.ts, researchAgent.ts, stockAnalysisAgent.ts, copywriterAgent.ts, editorAgent.ts, reportAgent.ts, scriptWriterAgent.ts, contentStrategistAgent.ts, learningExtractionAgent.ts, evaluationAgent.ts, weather-agent.ts, excalidraw_validator.ts, csv_to_excalidraw.ts, image_to_csv.ts, dataExportAgent.ts, dataIngestionAgent.ts, dataTransformationAgent.ts, researchPaperAgent.ts, documentProcessingAgent.ts, knowledgeIndexingAgent.ts, dane.ts, sql.ts |
| Networks                    | 4 files   | agentNetwork, dataPipelineNetwork, reportGenerationNetwork, researchPipelineNetwork                                                                                                                                                                                                                                                                                                                                                                                          |
| Workflows                   | 12 files  | weather-workflow.ts, content-studio-workflow.ts, content-review-workflow.ts, document-processing-workflow.ts, financial-report-workflow.ts, learning-extraction-workflow.ts, research-synthesis-workflow.ts, stock-analysis-workflow.ts, changelog.ts, telephone-game.ts, **repo-ingestion-workflow.ts (NEW)**, **spec-generation-workflow.ts (NEW)**                                                                                                                        |
| Tools                       | ✅         | Unified all 40+ tools in `src/mastra/tools/index.ts`. All `UITool` types consolidated in `src/components/ai-elements/tools/types.ts`. Includes Financial, Research, Data, RAG, Code, Browser, Sandbox/Exec, Calendar, GitHub, and PNPM tools. |
| MCP                         | ✅         | `mcp/index.ts`: a2aCoordinatorMcpServer; tools: coordinate_a2a_task etc.                                                                                                                                                                                                                                                                                                                                                                                                     |
| Scorers                     | ✅         | weather-scorer.ts, custom-scorers.ts.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Observability               | ✅         | Arize/Phoenix exporters; always-on sampling.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Config                      | ✅         | pg-storage.ts (PgVector/Postgres); **models config (150+ models from 6 providers: google, openai, anthropic, openrouter, ollama, vertex)**.                                                                                                                                                                                                                                                                                                                                  |
| Tests                       | Progress  | Vitest data tools verified; target 97%.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| AGENTS.md Sync              | ✅         | All AGENTS.md files updated Dec 5 with accurate counts, dates, and meta headers.                                                                                                                                                                                                                                                                                                                                                                                             |
| **UI Components**           | ✅         | **49 files**: AI Elements (30 in `src/components/ai-elements/`) + shadcn/ui base (19 in `ui/`). Next.js 16, React 19, Tailwind CSS 4.                                                                                                                                                                                                                                                                                                                                        |
| **Chat Components**         | ✅ Dec 8   | **11 components improved**: agent-task, agent-tools, agent-reasoning, agent-chain-of-thought, agent-plan, agent-sources, agent-suggestions, agent-queue, agent-confirmation, agent-checkpoint, chat-input. Production-grade enhancements. **Fixed chat input background noise.**                                                                                                                                                                                                                             |
| **Mastra Client SDK**       | ✅         | **lib/mastra-client.ts**: MastraClient instance for client-side agent calls.                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Next.js Frontend**        | ✅         | **app/layout.tsx**: Root layout with ThemeProvider. **app/page.tsx**: Landing page with agent overview. **app/chat/page.tsx**: Full chat interface with AI Elements.                                                                                                                                                                                                                                                                                                         |
| **AI Elements Integration** | ✅ 92%     | **app/chat/**: 12/13 tasks complete. All features integrated. Model selector with 150+ models. Pending: E2E tests only.                                                                                                                                                                                                                                                                                                                                                      |
| **Networks UI**             | ✅         | **app/networks/**: Full network interface with model selector, routing visualization, agent coordination. Shares model config with chat.                                                                                                                                                                                                                                                                                                                                     |
| **Workflows UI**            | ✅ 100%    | **app/workflows/**: Full Canvas visualization with 8 components, AI SDK streaming, input panels. **12 workflows** (added repoIngestion, specGeneration). Fixed pending/skipped status bug. **Fixed node blurriness.**                                                                                                                                                                                                                                                        |
| **UI Clarity Fix**          | ✅ 2026-01 | Added `ui-crisp` scoped overrides to disable backdrop-blur/noise/3D transforms on `/chat` + `/workflows` to prevent Windows text softening.                                                                                                                                                                                                                                                                                                                                  |
| **Mastra Admin Dashboard**  | 🔄 70%     | **app/dashboard/**: TanStack Query v5 installed, shared components created, loading/error files for all routes. See `/memory-bank/dashboard-v2/` for detailed tracking. |
| **Custom Skills**           | ✅ 2026-01 | **skills/**: Enhanced 5 core skills (`generative-ui`, `multi-agent-orch`, `webapp-testing`, etc.) with automation scripts and 2026 best practices. |

## Tooling Hardening **[Synced Dec 12]**

- **Semantic tools runtime fixes**
  - `src/mastra/tools/semantic-utils.ts`: removed CommonJS `require('fs')` usage (repo is ESM) and added `unref()` on the cache cleanup interval to avoid keeping Node alive.

- **Web scraping governance + crawl behavior**
  - `src/mastra/tools/web-scraper-tool.ts`: added allowlist enforcement via `WEB_SCRAPER_ALLOWED_DOMAINS` (comma-separated domains). Requests outside the allowlist now fail with `DOMAIN_NOT_ALLOWED`.
  - `web:scraper`: `followLinks` now actually crawls internal links using Crawlee `enqueueLinks` with depth tracking.
  - Request tuning: retries/delay and headers/user-agent are applied consistently.

- **Code tools robustness**
  - `src/mastra/tools/code-search.tool.ts`: default ignore patterns (`node_modules`, `.git`, `dist`, `build`), safe regex compilation, and max file-size guard.
  - `src/mastra/tools/code-analysis.tool.ts`: supports directory targets; adds default ignore patterns; refactors file loop for readability/robustness.
  - `src/mastra/tools/multi-string-edit.tool.ts`: adds max file-size guard; invalid regex now returns a structured failed result instead of throwing.

## Dependency Audit Notes **[Dec 12]**

- **Keep (good, maintained choices)**
  - `ts-morph` (semantic TS/JS analysis)
  - `fast-glob` (file discovery)
  - `diff` (patch generation)
  - `crawlee` + `cheerio` (scraping/crawling)
  - `zod` (schemas)
  - `@opentelemetry/api` (tracing)

- **Consider tightening / de-duplicating**
  - **Motion libs**: you have both `framer-motion` and `motion` pinned to the same version. If only one is used, remove the other to reduce bundle risk.
  - **Monaco**: `@monaco-editor/react` is an `-rc` version; for production, prefer a stable tag unless you depend on the RC fixes.
  - **Multiple AI provider packages**: you have many `ai-sdk-provider-*` providers plus `@ai-sdk/*` packages. If some are unused, drop them to reduce supply-chain surface.

- **High-impact / caution**
  - `isolated-vm`: native dependency; can complicate Windows installs and serverless deploys. Keep only if you truly need strong sandboxing.
  - `playwright`: large + postinstall; keep if browser automation is needed; otherwise it materially increases install/CI time.

## Regex Hardening **[Dec 12]**

- Installed `re2` and wired it into tools that accept user-supplied regex:
  - `src/mastra/tools/code-search.tool.ts`: when `options.isRegex === true`, patterns compile using `re2` (RE2 engine).
  - `src/mastra/tools/multi-string-edit.tool.ts`: when `useRegex === true`, patterns compile using `re2`.

## npm Install Notes **[Dec 12]**

- `npm i re2` succeeded but reported peer warnings around `zod` version expectations for some AI SDK packages.
- `npm audit` reports **1 high severity vulnerability** (follow-up: review `npm audit` output and decide whether to run `npm audit fix` or pin/override).

## Monaco Editor **[Dec 12]**

- **Production worker/assets**
  - `app/components/monaco/theme-loader.ts`: configured Monaco loader to use `'/monaco/vs'`.
  - Manual asset copy: `node_modules/monaco-editor/min/vs` → `public/monaco/vs` (run once after install).
  - Postinstall script removed from package.json - assets now managed manually or via webpack plugin.

- **Webpack plugin (production builds)**
  - `next.config.ts`: added `monaco-editor-webpack-plugin` to client webpack config (languages: TypeScript, JavaScript, JSON, CSS, Markdown).
  - Note: Next 16 dev uses Turbopack (`next dev --turbopack`), so the webpack plugin primarily affects `next build`.

- **VS Code-style Workbench UI**
  - `app/components/monaco/MonacoWorkbench.tsx`: Complete VS Code-like layout with Explorer, Tabs, Editor, BottomPanel, and RightPanel.
  - `app/components/monaco/MonacoExplorer.tsx`: File explorer panel with file selection and new file creation.
  - `app/components/monaco/MonacoBottomPanel.tsx`: Bottom panel with terminal and problems tabs.
  - `app/components/monaco/MonacoRightPanel.tsx`: Right sidebar panel for workspace details.
  - State persistence: Files, active tab, theme, and view state (cursor/scroll) preserved across sessions via localStorage.
  - Tab management: Proper tab switching without editor remounts, view state preservation per tab.

## What's Next

- **Migration: Mastra v1 - Memory** (🔄 started 2025-12-06)
- Created `/memory-bank/upgrade-to-v1` with PRD, design, tasks, context and scan-results
- Next: run codemods, update types (MastraMessageV2→MastraDBMessage), move Memory processors to Agent-level, add tests

- **Mastra Admin Dashboard** (🔄 70% Complete - Priority):
  - ✅ TanStack Query v5 installed and configured
  - ✅ Created `lib/types/mastra-api.ts` with Zod v4 schemas
  - ✅ Created `app/dashboard/providers.tsx` with QueryClientProvider
  - ✅ Created `lib/hooks/use-dashboard-queries.ts` with React Query hooks
  - ✅ Created 7 shared components (`_components/`: sidebar, stat-card, data-table, etc.)
  - ✅ Updated dashboard layout to use providers
  - ✅ Added loading.tsx and error.tsx for all routes
  - ✅ Refactored dashboard home page with StatCard, EmptyState
  - ✅ Extracted agents page into modular components
  - ✅ Fixed Next.js 16 typed routes (`href as never` pattern)
  - ✅ Fixed Zod v4 syntax (`z.record(z.string(), z.unknown())`)
  - ⬜ Fix remaining type errors in memory/observability/vectors/telemetry pages
  - ⬜ Create feature components for workflows, tools pages
  - ⬜ Add auth preparation middleware structure
  - ⬜ Add unit tests for hooks
- **AI Elements Integration** (✅ 92% Complete):
  - ✅ AIEL-001-012: All core features complete
  - ⬜ AIEL-013: E2E tests with Vitest (optional)

- **Mastra Client SDK Integration** (✅ Complete Nov 28):
  - ✅ lib/mastra-client.ts: MastraClient instance
  - ✅ app/layout.tsx: Root layout with ThemeProvider
  - ✅ app/page.tsx: Landing page with agent overview
  - ✅ app/chat/page.tsx: Full chat with AI Elements

- **UI/Frontend Development** (✅ Chat Complete):
  - ✅ Chat interface built with AI Elements components
  - ✅ Model selector and conversation views implemented
  - ✅ Wired to Mastra agents via API routes

- **Research & Document Processing Feature** (✅ Complete):
  - ✅ ResearchPaperAgent: Search arXiv, download papers, parse PDFs
  - ✅ DocumentProcessingAgent: PDF→markdown, document chunking
  - ✅ KnowledgeIndexingAgent: PgVector indexing, semantic search with reranking
  - ✅ ResearchPipelineNetwork: Coordinates full research workflow

- **Workflows Integration** (✅ Complete Nov 26):
  - ✅ All 10 workflows registered in index.ts
  - ✅ Workflows integrated into networks
  - ✅ API routes updated

- **Documentation Sync** (✅ Complete Nov 27):
  - ✅ All AGENTS.md files synced with current state
  - ✅ README.md updated to v3.2.0
  - ✅ Memory bank files updated with UI components

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
