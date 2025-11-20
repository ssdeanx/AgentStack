---
trigger: always_on
---

# Project Structure

## Root Directory

```bash
src/mastra/              # Main source directory
├── index.ts             # Mastra bootstrap - registers all agents, tools, workflows, MCP servers
├── agents/              # Agent implementations
├── tools/               # Tool implementations
├── workflows/           # Multi-step workflows
├── config/              # Configuration and external service setup
├── scorers/             # Custom evaluation scorers
├── mcp/                 # MCP server implementations
├── policy/              # RBAC policies (YAML)
└── data/                # Static data files (Excalidraw, test data)

tests/                   # Test results and coverage reports
.mastra/                 # Mastra CLI generated files
dist/                    # Build output
```

## Key Directories

### src/mastra/agents/

Agent implementations that compose tools and define behavior:

- Each agent exports a configured Agent instance
- Agents define instructions, tools, model, memory, and scorers
- Examples: researchAgent, stockAnalysisAgent, reportAgent, copywriterAgent

### src/mastra/tools/

Tool implementations using createTool pattern:

- Each tool has id, description, inputSchema (Zod), outputSchema (Zod), execute function
- Tools are stateless - agents orchestrate them
- Organized by domain: financial (polygon, finnhub, alpha-vantage), search (serpapi), RAG, scraping
- Tests colocated in tools/tests/

### src/mastra/config/

External service configuration and initialization:

- Model providers: google.ts, openai.ts, anthropic.ts, openrouter.ts, vertex.ts
- Storage: pg-storage.ts (PostgreSQL + PgVector - main storage backend)
- Logging: logger.ts (Pino-based structured logging)
- Security: role-hierarchy.ts (RBAC)
- All use environment variables for API keys

### src/mastra/workflows/

Multi-step workflow orchestrations:

- Combine multiple agents and tools
- Define step-by-step execution flows
- Example: weatherWorkflow

### src/mastra/scorers/

Custom evaluation scorers for observability:

- Implement scorer interface for quality metrics
- Examples: sourceDiversityScorer, researchCompletenessScorer, summaryQualityScorer
- Used with Arize/Phoenix tracing

### src/mastra/mcp/

Model Context Protocol server implementations:

- A2A (Agent-to-Agent) coordination
- Exposes agents as MCP tools for external clients

## File Naming Conventions

- Tools: `{domain}-{function}.tool.ts` (e.g., `polygon-tools.ts`, `web-scraper-tool.ts`)
- Agents: `{name}Agent.ts` (e.g., `researchAgent.ts`, `stockAnalysisAgent.ts`)
- Tests: `{filename}.test.ts` colocated in tests/ subdirectory
- Config: `{service}.ts` (e.g., `google.ts`, `pg-storage.ts`)

## Import Patterns

- Use relative imports within src/mastra/
- Path alias `@/*` maps to workspace root
- Import from @mastra packages for framework features
- Import from config/ for shared services (logger, storage, models)

## Documentation

- Each subdirectory has AGENTS.md with domain-specific guidance
- README.md at root for project overview
- Inline JSDoc comments for tools and complex functions
