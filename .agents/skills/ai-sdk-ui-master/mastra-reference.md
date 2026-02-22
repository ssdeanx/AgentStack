# Mastra Backend Reference

One reference per `src/mastra/` subdirectory. Use when integrating AI SDK UI with Mastra agents, tools, networks, or workflows.

## src-mastra-index

**Purpose:** Library entry point. Bootstraps Mastra with 25+ agents, 15+ workflows, 13 networks, MCP servers, and observability.

**Key exports:** `mastra` (Mastra instance)

**API routes:** `chatRoute`, `networkRoute`, `workflowRoute` from `@mastra/ai-sdk` — paths `/chat/:agentId`, `/network/:agentId`, `/workflow/:workflowId`

**Usage:** `import { mastra } from '@/src/mastra'` — `mastra.getAgent(id)`, `mastra.getWorkflow(id)`, `mastra.getNetwork(id)`

---

## src-mastra-agents

**Purpose:** 31+ agent definitions. Maps use-case intents to tool invocations and memory.

**Key files:** `weather-agent.ts`, `researchAgent.ts`, `stockAnalysisAgent.ts`, `copywriterAgent.ts`, `recharts.ts` (chart agents), `codingAgents.ts`, `businessLegalAgents.ts`, `dane.ts`, etc.

**See:** [src/mastra/agents/AGENTS.md](../../../src/mastra/agents/AGENTS.md)

**Agent IDs:** `weatherAgent`, `researchAgent`, `stockAnalysisAgent`, `reportAgent`, `chartSupervisorAgent`, `agentNetwork`, etc. Must match `app/chat/config/agents.ts` and `AGENT_CONFIGS`.

---

## src-mastra-tools

**Purpose:** 60+ tools. Atomic operations with Zod schemas, tracing, lifecycle hooks.

**Key categories:** Financial (AlphaVantage, Finnhub, Polygon), RAG (document chunking, PDF), Web (SerpAPI, web scraper, browser), Data (CSV/JSON, data validator), System (FS, GitHub, execa, calendar).

**See:** [src/mastra/tools/AGENTS.md](../../../src/mastra/tools/AGENTS.md)

**Pattern:** `createTool({ id, description, inputSchema, outputSchema, execute })`. Tools emit `data-tool-progress` events for UI progress display.

---

## src-mastra-networks

**Purpose:** 13 agent networks. Routing agents that coordinate multiple specialized agents.

**Key files:** `index.ts` (agentNetwork), `dataPipelineNetwork.ts`, `reportGenerationNetwork.ts`, `researchPipelineNetwork.ts`, `contentCreationNetwork.ts`, `codingTeamNetwork.ts`, `financialIntelligenceNetwork.ts`, `learningNetwork.ts`, `marketingAutomationNetwork.ts`, `devopsNetwork.ts`, `businessIntelligenceNetwork.ts`, `securityNetwork.ts`

**See:** [src/mastra/networks/AGENTS.md](../../../src/mastra/networks/AGENTS.md)

**Endpoint:** `${MASTRA_API_URL}/network/${agentId}` — used by `app/networks` with `DefaultChatTransport` and `useChat`.

---

## src-mastra-workflows

**Purpose:** 15+ workflows. Multi-step orchestration with `.then()`, `.parallel()`, `.branch()`, `.foreach()`, `.dowhile()`, `suspend()`/`resume()`.

**Key files:** `weather-workflow.ts`, `content-studio-workflow.ts`, `content-review-workflow.ts`, `document-processing-workflow.ts`, `financial-report-workflow.ts`, `learning-extraction-workflow.ts`, `research-synthesis-workflow.ts`, `stock-analysis-workflow.ts`, `changelog.ts`, `telephone-game.ts`, `repo-ingestion-workflow.ts`, `spec-generation-workflow.ts`, `governed-rag-index.workflow.ts`, etc.

**See:** [src/mastra/workflows/AGENTS.md](../../../src/mastra/workflows/AGENTS.md)

**Endpoint:** `${MASTRA_API_URL}/workflow/${workflowId}` — used by `app/workflows` with `DefaultChatTransport` and `useChat`.

---

## src-mastra-config

**Purpose:** Runtime configuration. Models, storage, logging, vector stores.

**Key files:** `index.ts`, `google.ts`, `openai.ts`, `anthropic.ts`, `pg-storage.ts`, `logger.ts`, `vector/` (qdrant, pinecone, etc.)

**See:** [src/mastra/config/AGENTS.md](../../../src/mastra/config/AGENTS.md)

**Env vars:** `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY`, `SUPABASE`, `DB_SCHEMA`, `POLYGON_API_KEY`, `FINNHUB_API_KEY`, `SERPAPI_API_KEY`, etc.

---

## src-mastra-a2a

**Purpose:** Agent-to-Agent coordination. A2A coordinator for multi-agent routing.

**Key files:** `a2aCoordinatorAgent.ts`, `codingA2ACoordinator.ts`

**See:** [src/mastra/a2a/AGENTS.md](../../../src/mastra/a2a/AGENTS.md)

**Agent IDs:** `a2aCoordinatorAgent`, `codingA2ACoordinator` — registered in `mastra.agents` and exposed via MCP.

---

## src-mastra-mcp

**Purpose:** MCP server. Exposes A2A coordination and tools to external MCP clients (Cursor, Windsurf, Claude Desktop).

**Key files:** `index.ts` (a2aCoordinatorMcpServer), `server.ts` (notes), `mcp-client.ts`, `prompts.ts`, `resources.ts`

**See:** [src/mastra/mcp/AGENTS.md](../../../src/mastra/mcp/AGENTS.md)

**Tools:** `coordinate_a2a_task`, `list_a2a_agents`, `create_a2a_workflow`, `ask_a2aCoordinator`

---

## src-mastra-evals

**Purpose:** Evaluation scorers. Prebuilt scorers for completeness, keyword coverage, source diversity, tool-call accuracy, etc.

**Key files:** `scorers/prebuilt.ts`, `scorers/keyword-coverage.ts`, `scorers/custom-scorers.ts`

**See:** [src/mastra/evals/AGENTS.md](../../../src/mastra/evals/AGENTS.md)

**Registered in:** `mastra.scorers` in `src/mastra/index.ts`

---

## src-mastra-services

**Purpose:** Shared services used by agents and workflows.

**See:** [src/mastra/services/AGENTS.md](../../../src/mastra/services/AGENTS.md)

---

## src-mastra-data

**Purpose:** Data processing utilities and schemas.

**See:** [src/mastra/data/AGENTS.md](../../../src/mastra/data/AGENTS.md)

---

## src-mastra-policy

**Purpose:** Policy and access control definitions.

**See:** [src/mastra/policy/AGENTS.md](../../../src/mastra/policy/AGENTS.md)

---

## src/mastra/workspaces.ts

**Purpose:** Workspace definitions for multi-tenant or multi-environment setups.

**See:** Referenced in `src/mastra/index.ts` (optional workspace config).
