<!-- AGENTS-META {"title":"Mastra Agents","version":"1.0.0","applies_to":"/src/mastra/agents","last_updated":"2025-11-15T00:00:00Z","status":"stable"} -->

# Agents (`/src/mastra/agents`)

## Persona

Agent Developer — objective: Implement higher-level behaviors by composing tools into responsible, auditable agents.

## Purpose

This directory contains agent definitions that map use-case intents to sequences of tool invocations, policies, and memory usage.

## Key Files

| File | Export | Agent ID | Responsibility |
| ---- | ------ | -------- | -------------- |
| `a2aCoordinatorAgent.ts` | export: `a2aCoordinatorAgent` | id: `a2aCoordinator` | A2A Coordinator — orchestrates and routes tasks across multiple specialized agents in parallel |
| `weather-agent.ts` | export: `weatherAgent` | id: (none) | `Weather Agent` — fetches weather data, suggests activities, uses `weatherTool` and web scraping for sources |
| `stockAnalysisAgent.ts` | export: `stockAnalysisAgent` | id: `stock-analysis` | `Stock Analysis Agent` — market analysis using Polygon/Finnhub/AlphaVantage data and dashboards |
| `csv_to_excalidraw.ts` | export: `csvToExcalidrawAgent` | id: `csvToExcalidrawAgent` | `CSV to Excalidraw` — convert CSV tabular data into Excalidraw JSON diagrams |
| `image_to_csv.ts` | export: `imageToCsvAgent` | id: `imageToCsvAgent` | `Image to CSV` — extract structured CSV-friendly data out of images and diagrams |
| `excalidraw_validator.ts` | export: `excalidrawValidatorAgent` | id: `excalidrawValidatorAgent` | `Excalidraw Validator` — validate and fix Excalidraw JSON diagrams to match schema |

## How to add an agent

1. Create a new `X-agent.ts` file defining an Agent with a descriptive name.
2. Implement the agent using tools from `src/mastra/tools` and stateful memory accessors.
3. Define unit tests for the agent behaviour and add them to `src/mastra/tools/tests` or a new `agents/tests` folder.

## Execution & Testing

- Agents are not directly invoked from the CLI; they are used by workflows or run programmatically via the Mastra runtime (`npm run dev`).
- Use existing tools' test patterns to mock runtime contexts & provider clients.

## Best practices

- Keep side effects restricted to tools; agents should orchestrate and apply policies.
- Use `RuntimeContext` to enforce auth and filter data at tool boundaries.
- Add explicit tests covering success, error, and policy-permission denial cases.

---
Last updated: 2025-11-15

## Where to look for more info

- `src/mastra/AGENTS.md`: top-level Mastra repository guidance and cross-cutting patterns
- `src/mastra/tools/AGENTS.md`: tools and their patterns
- `src/mastra/config/AGENTS.md`: configuration and storage guidance
- `src/mastra/config/vector/AGENTS.md`: vector store choices and configuration
