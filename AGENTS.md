<!-- AGENTS-META {"title":"Mastra Root","version":"2.0.0","applies_to":"/","last_updated":"2025-11-26T00:00:00Z","status":"stable"} -->
# AGENTS

## Project Overview

Mastra is a production-grade multi-agent framework for building agent-driven applications and RAG (retrieval-augmented generation) workflows. It provides **50+ enterprise tools**, **25+ specialized agents**, **10 workflows**, **4 agent networks**, and **A2A/MCP orchestration** for scalable AI systems. Key capabilities include **financial intelligence**, **RAG pipelines**, **observability**, and **secure governance**.

This repo is structured to keep tools, agents, workflows, networks, and configs separated, with strict Zod schemas for tool inputs/outputs and strong environment-based configuration in `src/mastra/config`.

## Quick Setup

Install dependencies:

```bash
npm install
```

Start development server (Mastra CLI is used by default):

```bash
npm run dev
```

Build and start production:

```bash
npm run build
npm run start
```

Run unit tests (Vitest):

```bash
npm test
```

Run a specific test with a pattern:

```bash
npx vitest -t "pattern"
```

## Runtime requirements & env vars

Node >= 20.9.0 is required (see `package.json` engine field).

At minimum, a local development environment should provide:

- `PG_CONNECTION` (for Postgres + PgVector in pg-storage)
- `OPENAI_API_KEY`, or other model provider keys like `GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY` for model access
- `SERPAPI_API_KEY` (if running SerpAPI-based tools)
- `ALPHA_VANTAGE_API_KEY` / `FINNHUB_API_KEY` / `POLYGON_API_KEY` for financial tools

Create a `.env` file for local development with the above placeholder variables. Example `.env`:

```env
PG_CONNECTION=postgres://user:password@localhost:5432/mastra
OPENAI_API_KEY=sk-xxxxx
SERPAPI_API_KEY=xxxx
ALPHA_VANTAGE_API_KEY=xxxx
```

## Development Workflow

- Start dev server: `npm run dev` (uses Mastra CLI to run in developer mode)
- Build: `npm run build`
- Start production server: `npm run start`
- Run tests: `npm test` (Vitest)
- Run linters/formatting: `npx eslint "src/**/*.{ts,tsx}" --max-warnings=0` and `npx prettier --write .`

## Architecture & conventions

- **Tools** (`src/mastra/tools`): 30+ tools implementing `createTool({ id, inputSchema, outputSchema, execute })` with strict Zod schemas. Categories: Financial (Polygon, Finnhub, AlphaVantage), Research (SerpAPI, ArXiv), Data (CSV, JSON), RAG (chunking, embeddings).
- **Agents** (`src/mastra/agents`): 22+ agents composing tools into specialized behaviors (research, stock analysis, content creation, data processing).
- **Networks** (`src/mastra/networks`): 4 agent networks for routing and orchestration (agentNetwork, dataPipelineNetwork, reportGenerationNetwork, researchPipelineNetwork).
- **Workflows** (`src/mastra/workflows`): 10 multi-step workflows using Mastra DSL (weather, content, financial reports, document processing, research synthesis).
- **Config** (`src/mastra/config`): Centralized provider clients (Google, OpenAI, Anthropic, OpenRouter, Vertex), pg-storage with PgVector, and role hierarchy.
- **Scorers** (`src/mastra/scorers`): Custom evaluation metrics for automated quality assessment.
- **MCP/A2A** (`src/mastra/mcp`, `src/mastra/a2a`): Model Context Protocol server and Agent-to-Agent coordination.

## Testing & CI

- Tests use Vitest. Unit tests are under `src/mastra/tools/tests` and other directories as appropriate.
- To run a single test file: `npx vitest src/mastra/tools/tests/your-test-file.test.ts`
- The `coverage` script runs `vitest run --coverage`.

## Pull Request Guidelines

- Title format: [<area>] Short summary — e.g., `[tools] Add new vector store tool`
- Run `npm test` and linters before opening a PR
- Add or update tests for any behavioral change in code
- Keep changes small and request reviewers who understand the affected subdomain (tools, config, agents, workflows).

## Security & Secrets

- Never commit API keys or secrets to the repo.
- Use `.env` locally and secure env variables in CI/CD (e.g., GitHub Actions Secrets).
- Mask secrets in logs and use `maskSensitiveMessageData()` helper from `src/mastra/config/pg-storage.ts` where needed.

## Where to look for more info

- `src/mastra/AGENTS.md`: top-level code-agent focused docs (this file is mirrored to subfolders)
- `src/mastra/tools/AGENTS.md`: 30+ tools and their patterns
- `src/mastra/agents/AGENTS.md`: 22+ agents catalog
- `src/mastra/workflows/AGENTS.md`: 10 workflow definitions
- `src/mastra/networks/AGENTS.md`: 4 agent networks
- `src/mastra/config/AGENTS.md`: configuration and storage guidance
- `src/mastra/config/vector/AGENTS.md`: vector store choices and configuration
- `src/mastra/mcp/AGENTS.md`: MCP server documentation
- `src/mastra/a2a/AGENTS.md`: A2A coordination

If you need more details for a subdirectory, open the folder-specific `AGENTS.md` which contains persona, purpose, and actionable commands.

---
Last updated: 2025-11-26
