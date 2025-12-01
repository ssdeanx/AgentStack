<!-- AGENTS-META {"title":"Mastra Root","version":"2.2.0","applies_to":"/","last_updated":"2025-11-27T00:00:00Z","status":"stable"} -->
# AGENTS

## Project Overview

Mastra is a production-grade multi-agent framework for building agent-driven applications and RAG (retrieval-augmented generation) workflows. It provides **30+ enterprise tools**, **22+ specialized agents**, **10 workflows**, **4 agent networks**, **A2A/MCP orchestration**, and now a **complete UI component library** (49 components) for scalable AI systems. Key capabilities include **financial intelligence**, **RAG pipelines**, **observability**, **secure governance**, and **AI chat interfaces**.

This repo is structured to keep tools, agents, workflows, networks, UI components, and configs separated, with strict Zod schemas for tool inputs/outputs and strong environment-based configuration in `src/mastra/config`.

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

- `SUPABASE` / `DATABASE_URL` (for Postgres + PgVector in pg-storage)
- `GOOGLE_GENERATIVE_AI_API_KEY` / `GOOGLE_API_KEY` (primary model provider)
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY` (alternative providers)
- `SERPAPI_API_KEY` (if running SerpAPI-based tools)
- `ALPHA_VANTAGE_API_KEY` / `FINNHUB_API_KEY` / `POLYGON_API_KEY` for financial tools

Create a `.env` file for local development. Example `.env`:

```env
# Database
SUPABASE=postgresql://user:password@localhost:5432/mastra
DATABASE_URL=postgresql://user:password@localhost:5432/mastra
DB_SCHEMA=mastra

# AI Providers (Google Gemini is primary)
GOOGLE_GENERATIVE_AI_API_KEY=your-key
GOOGLE_API_KEY=your-key

# Optional providers
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=xxxxx
OPENROUTER_API_KEY=xxxxx

# Tools
SERPAPI_API_KEY=xxxx
ALPHA_VANTAGE_API_KEY=xxxx
FINNHUB_API_KEY=xxxx
POLYGON_API_KEY=xxxx

# Mastra API
NEXT_PUBLIC_MASTRA_API_URL=http://localhost:4111
```

## Development Workflow

- Start dev server: `npm run dev` (uses Mastra CLI to run in developer mode)
- Build: `npm run build`
- Start production server: `npm run start`
- Run tests: `npm test` (Vitest)
- Run linters/formatting: `npx eslint "src/**/*.{ts,tsx}" --max-warnings=0` and `npx prettier --write .`

## Architecture & conventions

- **Frontend** (`app/`, `ui/`, `src/components/ai-elements/`): Next.js 16 App Router with React 19. AI Elements (30 components) for chat/reasoning/canvas UIs. shadcn/ui base (19 components) in `ui/`. Tailwind CSS 4 with oklch color variables.
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

- `app/AGENTS.md`: Next.js App Router pages and layouts
- `ui/AGENTS.md`: shadcn/ui base components (19 components)
- `src/components/ai-elements/AGENTS.md`: AI Elements library (30 components)
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
Last updated: 2025-11-27
