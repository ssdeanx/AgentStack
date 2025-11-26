<!-- AGENTS-META {"title":"Mastra Library","version":"2.0.0","applies_to":"/src/mastra","last_updated":"2025-11-26T00:00:00Z","status":"stable"} -->

# Mastra Core (`/src/mastra`)

## Persona

Name: Core Engineer — Objective: Build and maintain the framework primitives that agents and workflows consume.

## Purpose

This folder contains the middleware and high-level components that define Mastra's runtime: the top-level entry (`index.ts`), tools, agents, networks, config, and workflows.

## Key Files

| File | Description |
| ---- | ----------- |
| `index.ts` | Library entry point bootstrapping Mastra with 25+ agents, 10 workflows, 4 networks, MCP servers, and observability |
| `agents/` | 22+ agent definitions (weather, research, stock analysis, content, data processing) |
| `workflows/` | 10 workflow definitions (weather, content, financial, document, research) |
| `networks/` | 4 agent networks for routing (agentNetwork, dataPipelineNetwork, reportGenerationNetwork, researchPipelineNetwork) |
| `tools/` | 30+ reusable tools for agents (see `src/mastra/tools/AGENTS.md`) |
| `config/` | Runtime configuration for models, storage, and logging (see `src/mastra/config/AGENTS.md`) |
| `mcp/` | MCP server for A2A coordination |
| `a2a/` | Agent-to-Agent coordinator |
| `scorers/` | Evaluation scorers for quality assessment |

## How to extend

1. Add new tools under `src/mastra/tools` following the `createTool` pattern with Zod schemas.
2. Add agents under `src/mastra/agents` that wire tools together into higher-level behaviors.
3. Add workflows under `src/mastra/workflows` to orchestrate multi-step flows.
4. Add networks under `src/mastra/networks` to coordinate multiple agents.

## Local development tips

- Use `npm run dev` at the repo root to start the Mastra development environment.
- When adding new tools or providers, add env var placeholders to `.env` and document them in `src/mastra/config/AGENTS.md`.

## Tests & Debugging

- Add unit tests under `src/mastra/tools/tests`, `src/mastra/agents/tests`, or `src/mastra/workflows/tests` as appropriate.
- To run a single test file: `npx vitest src/mastra/tools/tests/<test>.test.ts`.

## Best practices

- Use explicit Zod schemas for every tool input/output.
- Keep tools small and side-effect-free when possible; agents orchestrate tools and handle context.
- Use `RuntimeContext` to enforce access control in tools and workflows.

---
Last updated: 2025-11-26
