---
trigger: always_on
---

# Technology Stack

## Runtime & Build

- Node.js >= 20.9.0 (required)
- TypeScript 5.9+ with strict mode enabled
- ES Modules (type: "module" in package.json)
- Mastra CLI for dev/build/start commands
- tsup for building

## Core Framework

- @mastra/core: Agent and tool framework
- @mastra/pg: PostgreSQL storage with PgVector
- @mastra/rag: RAG pipeline components
- @mastra/memory: Conversation memory management
- @mastra/mcp: Model Context Protocol server
- @mastra/arize: Observability and tracing
- @mastra/evals: Evaluation scorers

## LLM Providers

- @ai-sdk/google: Google Gemini models
- @ai-sdk/google-vertex: Vertex AI
- @ai-sdk/openai: OpenAI models
- @openrouter/ai-sdk-provider: OpenRouter
- ai: Vercel AI SDK

## Data & Storage

- PostgreSQL with pgvector extension (required for RAG)
- LibSQL for local storage
- Zod 4.x for schema validation

## Testing

- Vitest 4.x for unit tests
- @vitest/coverage-v8 for coverage reports
- jsdom for DOM testing
- 97% test coverage target

## Key Libraries

- cheerio: HTML parsing and scraping
- playwright: Browser automation
- pdf-parse: PDF processing
- marked: Markdown processing
- crawlee: Web crawling
- serpapi: Search API integration

## Common Commands

```bash
# Development
npm run dev              # Start Mastra dev server with dotenvx
npm run build            # Build with Mastra CLI
npm run start            # Start production server

# Testing
npm test                 # Run all tests with dotenvx
npm run coverage         # Generate coverage report
npx vitest -t "pattern"  # Run specific tests

# Linting
npx eslint "src/**/*.{ts,tsx}" --max-warnings=0
npx prettier --write .
```

## Environment Variables

Required for local development:

```env
# LLM Providers
GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key
GOOGLE_API_KEY=your-google-api-key
OPENAI_API_KEY=your-openai-api-key

# Database (PostgreSQL + PgVector)
DATABASE_URL=postgresql://user:password@localhost:5432/mastra
DB_SCHEMA=mastra
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# Search & Financial APIs
SERPAPI_API_KEY=your-serpapi-key
POLYGON_API_KEY=your-polygon-key
FINNHUB_API_KEY=your-finnhub-key
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
```

Optional for observability:

```env
PHOENIX_ENDPOINT=http://localhost:6006/v1/traces
PHOENIX_API_KEY=your-phoenix-api-key
PHOENIX_PROJECT_NAME=mastra-service
```

Optional RAG/Embedding configuration:

```env
EMBEDDING_MAX_RETRIES=3
MEMORY_LAST_MESSAGES=500
SEMANTIC_TOP_K=5
PG_MIN_SCORE=0.7
PG_EF=100
LOG_LEVEL=debug
```
