---
description: 'Copilot/Cursor instructions for working inside the Mastra repo'
applyTo: '**'
---

This repository uses the Mastra framework to build tools and agents. The instructions below are tailored for AI coding assistants (Copilot/Cursor) working inside this repo.

- Big picture: Mastra stitches small, schema-validated "Tools" (src/mastra/tools) with Agents (src/mastra/agents) and Workflows (src/mastra/workflows). The primary storage and semantic retrieval backend is Postgres with PgVector; see `src/mastra/config/pg-storage.ts`.

- Developer workflows (run these from repo root):
  - Start a dev server: `npm run dev`
  - Build: `npm run build`
  - Run: `npm run start`
  - Run tests: `npm test` (Vitest) — single-file tests: `npx vitest src/mastra/tools/tests/<file>.test.ts` or use `-t "pattern"` to run a subset.
  - Node engine: Node >=20.9.0 (see `package.json` & `AGENTS.md`)
  - Lint: `npx eslint "src/**/*.{ts,tsx}" --max-warnings=0` and Format: `npx prettier --write .`

- Naming & structure conventions:
  - Tools live at `src/mastra/tools/*` and export with a suffix `Tool` (e.g. `vectorQueryTool`). Tool ids use kebab-case (e.g. `vector-query`). Keep tool IDs documented in `src/mastra/tools/AGENTS.md` where applicable.
  - Use Zod for tool input/output validation: `inputSchema` & `outputSchema` — see `vector-query.tool.ts` and `web-scraper-tool.ts` for examples. Do not use `any` for Tool I/O.
  - Use `createTool({ id, inputSchema, outputSchema, execute })` from `@mastra/core/tools` for new tools.

- Security & validation:
  - Never log secrets. Use `maskStreamTags` and `maskSensitiveMessageData` utilities in `src/mastra/config/pg-storage.ts` when logging messages that might include secrets.
  - Validate critical environment variables with helper patterns; secure envs live in `src/mastra/config/*` (OpenAI, SERPAPI, PG connection, etc.). If a tool needs new environment variables, add a placeholder to `.env` in the repo root with a descriptive name and ensure tests mock/restore env values.

- Storage & vectors:
  - `src/mastra/config/pg-storage.ts` is the canonical entry point for the Postgres+PgVector setup. Embedding model dims & index names are pinned (e.g., `governed_rag`).
  - Vector store: `mastra.getVector('pgVector')` — treat as `PgVector` in tools. Be explicit about index names and embed dims in code comments or README when you add new indexes (e.g., `governed_rag`).
    - The `pg-storage.ts` file also exposes higher-level RAG tools: `graphQueryTool` (graph-based RAG) and `pgQueryTool` (vector-query using PgVector). These are used by many tools (see `src/mastra/tools/graph-rag-query.tool.ts`, `src/mastra/tools/vector-query.tool.ts`) and are good examples of how to wire `pgVector` and retrieval logic into tools.
    - For graph-based RAG, make sure the `indexName` and `dimension` match your embedding model (for example `gemini-embedding-001` dims), and add index creation SQL and documentation in `initializeDatabase()` if deploying to production.

- RuntimeContext & tracing:
  - Tools can get per-request context via `RuntimeContext` and performance/observability via `TracingContext`. RuntimeContext is used for access filters (see `vector-query.tool.ts`). Tracing spans use `AISpanType`.
  - Use `RuntimeContext` in unit tests to simulate auth roles and request-scoped filters.

  ## Logging & instrumentation
  - Use the structured logger at `src/mastra/config/logger.ts` for consistent telemetry. It exports helpers like `logWorkflowStart`, `logWorkflowEnd`, `logStepStart`, `logStepEnd`, `logToolExecution`, `logAgentActivity`, and `logError`.
  - Avoid logging secrets; when logging messages from tools or storage operations, call `maskSensitiveMessageData()` (see `src/mastra/config/pg-storage.ts`) to scrub fields such as `apiKey`, `password`, `token` before logging.
  - When adding telemetry, prefer `log.info` with structured metadata to make logs easy to filter in production.

- Scorers & evaluation:
  - Scorers are created in `src/mastra/scorers/*`. Use `createScorer` with `judge` instructions when building custom LLM-graded tests (see `weather-scorer.ts`).
  - Add unit tests for scorer logic and use the same mock runtime context patterns used for tools.

- Tests & mocking patterns:
  - Tests use Vitest + JSDOM. Tests commonly mock environment variables and external providers (see `testSetup.ts` for a lightweight provider mock). For tools that call external APIs, provide safe test keys and clean up `process.env` after tests.
  - Use `new RuntimeContext()` and a minimal mock `TracingContext` in tool tests.
  - Run single-file tests: `npx vitest src/mastra/tools/tests/<file>.test.ts` or filter by name: `npx vitest -t "pattern"`.

- Quick examples (follow exact patterns):
  - Vector query tool: `src/mastra/tools/vector-query.tool.ts` — shows `RuntimeContext` auth enforcement and `PgVector` usage.
   - See `src/mastra/tools/document-chunking.tool.ts` and `src/mastra/tools/graph-rag-query.tool.ts` for examples of chunking, embedding generation, and upserting to PgVector. These tests show how to mock PgVector and `generateEmbeddings()` in unit tests.
  - Web scraper: `src/mastra/tools/web-scraper-tool.ts` — shows sanitization (HtmlProcessor) + careful I/O & zod schemas.
  - Agent skeleton: `src/mastra/agents/weather-agent.ts` — shows how to bind tools, memory, scorers, and model selection.

- When writing code:
  - Keep functions small; prefer creating/reusing tools in `/tools` for agent calls; avoid duplicating network access logic.
  - Keep tool execution side-effect-free where possible; mark side effect docs at top of file when unavoidable.
  - Keep types strict, use zod for schema validation and explicit TypeScript interfaces for `RuntimeContext`.
  - Avoid `any`; prefer explicit TypeScript types and `z.object().strict()` schemas. Use structured logging via `src/mastra/config/logger.ts` and `maskStreamTags` when logging messages that may include sensitive data.

If anything in these instructions is unclear or you'd like more examples, tell me which area (tools, config, tests, or agents) and I'll expand. 

## Examples and code snippets

### Tool pattern (Zod + createTool)
Use Zod validation for inputs/outputs and keep tools side-effect-free where possible.
```typescript
import { z } from 'zod';

export const exampleTool = createTool({
  id: 'example-tool',
  inputSchema: z.object({ text: z.string() }).strict(),
  outputSchema: z.object({ result: z.string() }).strict(),
  async execute({ input, runtimeContext }) {
    // Example: validate runtimeContext if the tool is permissioned
    return { result: input.text.toUpperCase() };
  },
});
```

### Unit tests (Vitest + RuntimeContext)
```ts
const runtime = new RuntimeContext();
// simulate auth, env mocks, and network providers
```

### Validation & verification
- Add README or a short code snippet in `src/mastra/tools` for complex tooling.
- Include unit tests and ensure `npx vitest` runs locally and in CI.