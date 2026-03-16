# lib

## Overview

The `lib/` directory serves as the frontend client library layer for AgentStack, providing shared utilities, type definitions, and React hooks for interacting with the Mastra API.

## Where to Look

- **`hooks/`**: React hooks for data fetching and state management, primarily using TanStack Query.
- **`types/`**: Centralized Zod schemas and TypeScript definitions for API consistency.
- **Root `lib/`**: Core client SDK configuration, API wrappers, and shared utility functions.

## Key Files

- **`mastra-client.ts`**: Configures the `MastraClient` SDK instance for frontend use, including base URL and retry logic.
- **`hooks/use-dashboard-queries.ts`**: The primary data layer for the dashboard, containing 15+ TanStack Query hooks for managing agents, workflows, tools, traces, and memory.
- **`hooks/use-mastra.ts`**: A generic fetch hook with loading and error states for retrieving MastraClient data.
- **`types/mastra-api.ts`**: Defines the Zod schemas and TypeScript types for core entities like `Agent`, `Workflow`, and `Message`.
- **`client-stream-to-ai-sdk.ts`**: Provides utilities for converting Mastra agent streams into formats compatible with the Vercel AI SDK.
- **`api.ts`**: Contains typed API client functions that wrap the underlying fetch calls to the Mastra backend.
- **`utils.ts`**: Shared UI and logic utilities, including `cn` for Tailwind class merging and date formatting helpers.
- **`a2a.ts` & `auth.ts`**: Utilities for Agent-to-Agent coordination and authentication management.

## Recent Update (2026-03-05)

- `hooks/use-mastra-query.ts` was expanded with workspace/sandbox UI hooks aligned to `@mastra/client-js` Workspace APIs:
  - Queries: `useWorkspaceInfo`, `useWorkspaceFiles`, `useWorkspaceReadFile`, `useWorkspaceStat`, `useWorkspaceSearch`, `useWorkspaceSkills`, `useWorkspaceSearchSkills`
  - Mutations: `useWorkspaceWriteFileMutation`, `useWorkspaceDeleteMutation`, `useWorkspaceMkdirMutation`, `useWorkspaceIndexMutation`
- Added granular workspace query keys to support frontend cache invalidation after file/index mutations.

## Recent Update (2026-03-16)

- `hooks/use-mastra-query.ts` now exposes the full installed `@mastra/client-js` dataset/eval/scorer surface for frontend consumers:
  - scorer/eval queries: `useScorers`, `useScorer`, `useScoresByRun`, `useScoresByScorer`, `useScoresByEntity`
  - dataset queries: `useDatasets`, `useDataset`, `useDatasetItems`, `useDatasetItem`, `useDatasetItemHistory`, `useDatasetItemVersion`, `useDatasetVersions`
  - experiment queries: `useDatasetExperiments`, `useDatasetExperiment`, `useDatasetExperimentResults`, `useCompareExperiments`
  - dataset/eval mutations: create/update/delete dataset, add/update/delete item, batch item insert/delete, trigger experiment, save score
- `hooks/use-mastra.ts` mirrors the same dataset/scorer/experiment API surface using the generic `useMastraFetch` pattern for non-React-Query consumers.

## Recent Update (2026-03-16 - Full client-js parity expansion)

- `hooks/use-mastra-query.ts` was further expanded to cover the remaining installed `@mastra/client-js` resource families used by frontend consumers:
  - provider/processor queries: tool providers, provider toolkits/tools/schema, processors, processor providers
  - advanced memory queries: thread detail, working memory, memory search, observational memory, await-buffer status
  - stored-resource queries: stored agent versions/compare, stored prompt blocks, stored scorers, stored MCP clients, stored skills
  - discovery/resource queries: vectors, embedders, workspace skill details/references, workflow schema, A2A streaming entry point, Agent Builder actions/runs
  - mutations: workflow run lifecycle helpers, save/delete/clone memory-thread helpers, processor execute, stored resource CRUD/version helpers, Agent Builder execution helpers
- Validation: targeted `get_errors` on `hooks/use-mastra-query.ts` returned **No errors found**.
