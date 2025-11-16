<!-- AGENTS-META {"title":"Mastra Library","version":"1.0.0","applies_to":"/src/mastra","last_updated":"2025-11-14T00:00:00Z","status":"stable"} -->

# Mastra Core (`/src/mastra`)

## Persona

Name: Core Engineer — Objective: Build and maintain the framework primitives that agents and workflows consume.

## Purpose

This folder contains the middleware and high-level components that define Mastra's runtime: the top-level entry (`index.ts`), tools, agents, config, and workflows.

## Key Files

| File | Description |
| ---- | ----------- |
| `index.ts` | Library entry point for bootstrapping Mastra apps and exporting utilities |
| `agents/` | Contains agent definitions such as `weather-agent.ts` |
| `workflows/` | Defines workflows like `weather-workflow.ts` |
| `tools/` | Reusable tools for agents (see `src/mastra/tools/AGENTS.md`) |
| `config/` | Runtime configuration for models, storage, and logging (see `src/mastra/config/AGENTS.md`) |

## How to extend

1. Add new tools under `src/mastra/tools` following the `createTool` pattern with Zod schemas.
2. Add agents under `src/mastra/agents` that wire tools together into higher-level behaviors.
3. Add workflows under `src/mastra/workflows` to orchestrate multi-step flows.

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
Last updated: 2025-11-14
