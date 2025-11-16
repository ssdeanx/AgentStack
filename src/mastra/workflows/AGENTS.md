<!-- AGENTS-META {"title":"Mastra Workflows","version":"1.0.0","applies_to":"/src/mastra/workflows","last_updated":"2025-11-14T00:00:00Z","status":"stable"} -->

# Workflows (`/src/mastra/workflows`)

## Persona

Workflow Engineer — objective: Orchestrate tools and agents into reliable, testable multi-step processes.

## Purpose

Workflows orchestrate agents and tools into multi-step scenarios (e.g., data ingestion → indexing → RAG retrieval → evaluation) and implement long-running or stateful operations where necessary.

## Key Files

| File | Responsibility |
| ---- | -------------- |
| `weather-workflow.ts` | Example workflow demonstrating a multi-step, orchestrated task using the weather agent and tools |

## How to add a workflow

1. Define the workflow using Mastra DSL patterns (see existing `weather-workflow.ts`).
2. Use tools and agents as building blocks; prefer composition over duplication.
3. Add tests and, where appropriate, add e2e test harnesses to validate integrations.

## Execution & debugging

- Workflows are executed by the Mastra runtime and can be invoked in development using `npm run dev` and programmatic calls from the code.
- Use `TracingContext` to instrument workflow steps with spans and useful metadata.

## Best practices

- Keep steps idempotent when possible; implement checkpointing for long-running operations.
- Reuse tools across workflows to reduce duplication.
- Add logs and robust error handling.

---
Last updated: 2025-11-14

