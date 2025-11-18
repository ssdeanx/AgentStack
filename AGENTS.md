<!-- AGENTS-META {"title":"Mastra Root","version":"1.0.0","applies_to":"/","last_updated":"2025-11-14T00:00:00Z","status":"stable"} -->
# AGENTS

## Project Overview

Mastra is a toolkit for building agent-driven applications and RAG (retrieval-augmented generation) workflows. It provides a set of tools, agents, data connectors, and configuration patterns to compose secure, production-ready AI agents backed by a PostgreSQL + PgVector vector store, multiple model providers, and several auxiliary integrations (SerpAPI, Alpha Vantage, Finnhub, Polygon, ArXiv, and more).

This repo is structured to keep tools, agents, workflows, and configs separated, with strict Zod schemas for tool inputs/outputs and strong environment-based configuration in `src/mastra/config`.

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

- Tools are implemented under `src/mastra/tools` and export `createTool({ id, inputSchema, outputSchema, execute })` with strict Zod schemas and typed RuntimeContext.
- Config and environment: `src/mastra/config` centralizes provider clients, pg-storage, and role hierarchy.
- Agents live in `src/mastra/agents` and use tool factories and reusable building blocks.
- Workflows are under `src/mastra/workflows` and orchestrate the tools and agents.
- Scorers are defined in `src/mastra/scorers` for automated evaluations.

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
- `src/mastra/tools/AGENTS.md`: tools and their patterns
- `src/mastra/config/AGENTS.md`: configuration and storage guidance
- `src/mastra/config/vector/AGENTS.md`: vector store choices and configuration

If you need more details for a subdirectory, open the folder-specific `AGENTS.md` which contains persona, purpose, and actionable commands.

---
Last updated: 2025-11-14
