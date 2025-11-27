# Tech Context

## Core Stack

- **Runtime**: Node.js ≥20.9.0 with ES modules.
- **Language**: TypeScript with strict compiler settings, and Zod schemas decorating tools, agents, and workflows.
- **Frameworks**: `@mastra/core`, `@mastra/mcp` for MCP/A2A integration, `@mastra/rag` for RAG pipelines, `@mastra/pg` for Postgres + PgVector, `@mastra/memory` for shared context.
- **Frontend**: Next.js 16 with App Router, React 19, Tailwind CSS 4, Radix UI primitives.
- **UI Libraries**: AI Elements (30 components for AI chat interfaces), shadcn/ui (19 base components, new-york style).

## Tooling & Quality

- **Testing**: Vitest (`vitest.config.ts`); suites in `tools/tests`, `config/tests`; 97% goal per README/package.json.
- **Linting/Formatting**: ESLint per `eslint.config.cjs` and Prettier (`prettier.config.js`).
- **Type Safety**: Runtime context types, Zod validation, and strict compiler settings catch issues before runtime.
- **Styling**: Tailwind CSS 4 with CSS variables (oklch color space), dark mode support via `next-themes`.

## Environment & Constraints

- **Database**: PostgreSQL with `pgvector` extension for embeddings and trace/eval storage, wired via `PostgresStore` and `PgVector` in `src/mastra/config/pg-storage.ts`. Local Mastra bootstrap also uses `LibSQLStore` with `mastra.db` for app storage.
- **AI Providers**: Gemini (via `@ai-sdk/google`), OpenAI, Anthropic, OpenRouter, and Vertex are all represented in the `model-registry` and provider config files under `src/mastra/config`.
- **Secrets**: Environment variables such as `SUPABASE`, `DB_SCHEMA`, `PG_MIN_SCORE`, `GOOGLE_GENERATIVE_AI_API_KEY`, `SERPAPI_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `FINNHUB_API_KEY`, `POLYGON_API_KEY`, `PHOENIX_ENDPOINT`, `PHOENIX_API_KEY`, and `PHOENIX_PROJECT_NAME` are used across config and tools. `.env` is used locally (and should be git-ignored), while `.env.example` documents safe placeholders.
- **Observability**: `@mastra/arize` and Mastra's tracing exporters (`CloudExporter`, `DefaultExporter`) capture traces and metrics configured in `src/mastra/index.ts`.

## Frontend Structure

- **App Directory**: `app/` with Next.js App Router (`layout.tsx`, `globals.css`, `test/` pages).
- **AI Elements**: `src/components/ai-elements/` with 30 AI-focused components (message, reasoning, canvas, tools, etc.).
- **Base UI**: `ui/` with 19 shadcn/ui components (button, card, dialog, input, etc.).
- **Configuration**: `components.json` for shadcn/ui (new-york style, lucide icons, zinc base color).
- **Styling**: CSS variables in `app/globals.css` using oklch color space for precise color control.
