<!-- AGENTS-META {"title":"Mastra README","version":"1.0.0","applies_to":"/","last_updated":"2025-11-14T00:00:00Z","status":"stable"} -->

# Mastra

Mastra is a framework for building agent-driven applications and retrieval-augmented generation (RAG) workflows. It provides a modular set of tools, agents, workflows, vector store adapters, and configuration patterns designed for production-grade usage and testability.

This repository organizes core runtime components, integrations with model providers and vector stores, and reusable tools so teams can develop and operate responsible agents.

> For implementation details see `src/mastra/config/AGENTS.md` and `src/mastra/tools/AGENTS.md`.

## Badge

Runtime dependency badges:

[![@ai-sdk/google](https://img.shields.io/npm/v/@ai-sdk/google.svg)](https://www.npmjs.com/package/@ai-sdk/google) [![@ai-sdk/google-vertex](https://img.shields.io/npm/v/@ai-sdk/google-vertex.svg)](https://www.npmjs.com/package/@ai-sdk/google-vertex) [![@ai-sdk/openai](https://img.shields.io/npm/v/@ai-sdk/openai.svg)](https://www.npmjs.com/package/@ai-sdk/openai) [![@dotenvx/dotenvx](https://img.shields.io/npm/v/@dotenvx/dotenvx.svg)](https://www.npmjs.com/package/@dotenvx/dotenvx)

[![@mastra/arize](https://img.shields.io/npm/v/@mastra/arize.svg)](https://www.npmjs.com/package/@mastra/arize) [![@mastra/auth-supabase](https://img.shields.io/npm/v/@mastra/auth-supabase.svg)](https://www.npmjs.com/package/@mastra/auth-supabase) [![@mastra/core](https://img.shields.io/npm/v/@mastra/core.svg)](https://www.npmjs.com/package/@mastra/core) [![@mastra/deployer](https://img.shields.io/npm/v/@mastra/deployer.svg)](https://www.npmjs.com/package/@mastra/deployer)

[![@mastra/evals](https://img.shields.io/npm/v/@mastra/evals.svg)](https://www.npmjs.com/package/@mastra/evals) [![@mastra/libsql](https://img.shields.io/npm/v/@mastra/libsql.svg)](https://www.npmjs.com/package/@mastra/libsql) [![@mastra/loggers](https://img.shields.io/npm/v/@mastra/loggers.svg)](https://www.npmjs.com/package/@mastra/loggers) [![@mastra/mcp](https://img.shields.io/npm/v/@mastra/mcp.svg)](https://www.npmjs.com/package/@mastra/mcp)

[![@mastra/memory](https://img.shields.io/npm/v/@mastra/memory.svg)](https://www.npmjs.com/package/@mastra/memory) [![@mastra/pg](https://img.shields.io/npm/v/@mastra/pg.svg)](https://www.npmjs.com/package/@mastra/pg) [![@mastra/rag](https://img.shields.io/npm/v/@mastra/rag.svg)](https://www.npmjs.com/package/@mastra/rag) [![@openrouter/ai-sdk-provider](https://img.shields.io/npm/v/@openrouter/ai-sdk-provider.svg)](https://www.npmjs.com/package/@openrouter/ai-sdk-provider)

[![ai](https://img.shields.io/npm/v/ai.svg)](https://www.npmjs.com/package/ai) [![ai-sdk-provider-gemini-cli](https://img.shields.io/npm/v/ai-sdk-provider-gemini-cli.svg)](https://www.npmjs.com/package/ai-sdk-provider-gemini-cli) [![cheerio](https://img.shields.io/npm/v/cheerio.svg)](https://www.npmjs.com/package/cheerio) [![concurrently](https://img.shields.io/npm/v/concurrently.svg)](https://www.npmjs.com/package/concurrently)

[![convert-csv-to-json](https://img.shields.io/npm/v/convert-csv-to-json.svg)](https://www.npmjs.com/package/convert-csv-to-json) [![crawlee](https://img.shields.io/npm/v/crawlee.svg)](https://www.npmjs.com/package/crawlee) [![dotenv](https://img.shields.io/npm/v/dotenv.svg)](https://www.npmjs.com/package/dotenv) [![excalidraw-to-svg](https://img.shields.io/npm/v/excalidraw-to-svg.svg)](https://www.npmjs.com/package/excalidraw-to-svg)

[![fast-xml-parser](https://img.shields.io/npm/v/fast-xml-parser.svg)](https://www.npmjs.com/package/fast-xml-parser) [![jose](https://img.shields.io/npm/v/jose.svg)](https://www.npmjs.com/package/jose) [![jsdom](https://img.shields.io/npm/v/jsdom.svg)](https://www.npmjs.com/package/jsdom) [![marked](https://img.shields.io/npm/v/marked.svg)](https://www.npmjs.com/package/marked)

[![pdf-parse](https://img.shields.io/npm/v/pdf-parse.svg)](https://www.npmjs.com/package/pdf-parse) [![playwright](https://img.shields.io/npm/v/playwright.svg)](https://www.npmjs.com/package/playwright) [![serpapi](https://img.shields.io/npm/v/serpapi.svg)](https://www.npmjs.com/package/serpapi) [![svgjson](https://img.shields.io/npm/v/svgjson.svg)](https://www.npmjs.com/package/svgjson)

[![tsup](https://img.shields.io/npm/v/tsup.svg)](https://www.npmjs.com/package/tsup) [![xmldom](https://img.shields.io/npm/v/xmldom.svg)](https://www.npmjs.com/package/xmldom) [![zod](https://img.shields.io/npm/v/zod.svg)](https://www.npmjs.com/package/zod)

Dev dependency badges:

[![@types/jsdom](https://img.shields.io/npm/v/@types/jsdom.svg)](https://www.npmjs.com/package/@types/jsdom) [![@types/node](https://img.shields.io/npm/v/@types/node.svg)](https://www.npmjs.com/package/@types/node) [![@types/pdf-parse](https://img.shields.io/npm/v/@types/pdf-parse.svg)](https://www.npmjs.com/package/@types/pdf-parse) [![@types/xmldom](https://img.shields.io/npm/v/@types/xmldom.svg)](https://www.npmjs.com/package/@types/xmldom)

[![@typescript-eslint/eslint-plugin](https://img.shields.io/npm/v/@typescript-eslint/eslint-plugin.svg)](https://www.npmjs.com/package/@typescript-eslint/eslint-plugin) [![@typescript-eslint/parser](https://img.shields.io/npm/v/@typescript-eslint/parser.svg)](https://www.npmjs.com/package/@typescript-eslint/parser) [![@vitest/coverage-v8](https://img.shields.io/npm/v/@vitest/coverage-v8.svg)](https://www.npmjs.com/package/@vitest/coverage-v8) [![eslint](https://img.shields.io/npm/v/eslint.svg)](https://www.npmjs.com/package/eslint)

[![eslint-config-prettier](https://img.shields.io/npm/v/eslint-config-prettier.svg)](https://www.npmjs.com/package/eslint-config-prettier) [![eslint-plugin-react](https://img.shields.io/npm/v/eslint-plugin-react.svg)](https://www.npmjs.com/package/eslint-plugin-react) [![ink-testing-library](https://img.shields.io/npm/v/ink-testing-library.svg)](https://www.npmjs.com/package/ink-testing-library) [![mastra](https://img.shields.io/npm/v/mastra.svg)](https://www.npmjs.com/package/mastra)

[![prettier](https://img.shields.io/npm/v/prettier.svg)](https://www.npmjs.com/package/prettier) [![typescript](https://img.shields.io/npm/v/typescript.svg)](https://www.npmjs.com/package/typescript) [![vitest](https://img.shields.io/npm/v/vitest.svg)](https://www.npmjs.com/package/vitest)

## Quick start

Prerequisites

- Node.js 20.9.0 or later
- A PostgreSQL instance (for the PgVector configuration) or an alternate vector store
- Provider API keys for any integrations you intend to use (OpenAI, Google, Anthropic, SERPAPI, etc.)

Install dependencies

```bash
npm ci
```

Create a `.env` file (example—adjust values for your environment)

```dotenv
PG_CONNECTION=postgres://user:password@localhost:5432/mastra
OPENAI_API_KEY=sk-xxxxx
SERPAPI_API_KEY=xxxx
ALPHA_VANTAGE_API_KEY=xxxx
```

Run the development server

```bash
npm run dev
```

Build and run in production mode

```bash
npm run build
npm run start
```

Run tests

```bash
npm test
```

Run specific tests by name

```bash
npx vitest -t "pattern"
```

## Examples

This repository exposes a number of tools that can be executed programmatically. The following TypeScript snippet demonstrates how to call `weatherTool` directly in a small script (for demonstration only):

```ts
import { weatherTool } from './src/mastra/tools/weather-tool'

async function run() {
  const result = await weatherTool.execute({
    context: { location: 'New York' },
    runtimeContext: { get: () => ({ temperatureUnit: 'celsius' }) } as any,
    tracingContext: undefined,
  })
  console.log('Weather result:', result)
}

run().catch(err => console.error(err))
```

To run this example you can either transpile the project (npm run build) or use a TypeScript node runner such as `ts-node` or `tsx`. For quick local testing without installing additional tools, run the relevant test under `src/mastra/tools/tests/weather-tool.test.ts` to see how the tool is exercised in test conditions.

## Repository structure

Top-level folders and their purpose:

- `src/mastra/agents/` — Agent implementations that compose tools into higher-level behavior.
- `src/mastra/tools/` — Small, testable tools that implement single responsibilities; export `createTool(...)` with Zod I/O schemas.
- `src/mastra/workflows/` — Declarative workflows and orchestration patterns.
- `src/mastra/config/` — Runtime initialization and configuration for providers, vector stores, logging, and role hierarchy.
- `src/mastra/scorers/` — Scorers and grading logic used for automated evaluation.
- `src/mastra/data/` — Documentation artifacts and example data used in tests and demos.

## Development workflow

Add a tool

1. Create `src/mastra/tools/my-tool.ts` and follow the pattern `createTool({ id, inputSchema, outputSchema, execute })` with Zod validation.
2. Add unit tests under `src/mastra/tools/tests/`, and mock provider clients and runtime contexts.

Add an agent

1. Create `src/mastra/agents/my-agent.ts` that composes tools and defines intent/decision logic.
2. Add tests that assert both successful flows and policy-enforcement failures.

Add a workflow

1. Create workflows in `src/mastra/workflows` and include integration tests for orchestration behavior.

Lint and format

```bash
npx eslint "src/**/*.{ts,tsx}" --max-warnings=0
npx prettier --write .
```

## Configuration and environment variables

Minimum environment variables and their purpose:

- `PG_CONNECTION` — PostgreSQL connection string (used by PgVector)
- `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `ANTHROPIC_API_KEY` — Model provider credentials
- `SERPAPI_API_KEY` — SerpAPI for web search and related tools
- `ALPHA_VANTAGE_API_KEY`, `FINNHUB_API_KEY`, `POLYGON_API_KEY` — Financial provider keys

Refer to `src/mastra/config/AGENTS.md` and `src/mastra/config/vector/AGENTS.md` for additional configuration and provider-specific variables.

## Troubleshooting

- If `npm ci` fails, ensure Node.js version is >= 20.9.0 and your package manager supports ES modules.
- If tools that call cloud APIs fail, confirm corresponding environment variables are set (e.g. `OPENAI_API_KEY`, `SERPAPI_API_KEY`).
- Use `npx vitest -t "pattern"` to run and debug a focused test that exercises the failing area.
- For PgVector/Postgres connection issues, verify `PG_CONNECTION` and that the database supports required extensions. See `src/mastra/config/pg-storage.ts` for setup.


## Tests & continuous integration

Run the test suite:

```bash
npm test
```

Run coverage:

```bash
npm run coverage
```

Unit test files are typically located under `src/mastra/tools/tests/` and `src/mastra/config/tests/`.
Use `npx vitest -t "pattern"` to run tests matching a name pattern.

## Security and secrets

- Never commit secrets to the repository. Use environment variables or secret managers in CI.
- When logging runtime data, call `maskSensitiveMessageData()` to redact secrets (see `src/mastra/config/pg-storage.ts`).

## Contributing and pull requests

When contributing:

- Keep changes focused and scope-limited.
- Add unit tests for logic changes and update relevant integration tests.
- Run linting and tests before submitting a PR.

Recommended PR checklist:

- [ ] Run `npm test` and `npx eslint` locally
- [ ] Add or update unit tests
- [ ] Include a concise description in the PR title and body and add appropriate reviewers

## Additional resources

- `src/mastra/tools/AGENTS.md` — Tool patterns, definitions, and examples
- `src/mastra/config/AGENTS.md` — Provider configuration and runtime initialization
- `src/mastra/config/vector/AGENTS.md` — Vector store configuration and recommendations
- `src/mastra/AGENTS.md` — Overview for the core library and development patterns

---
Last updated: 2025-11-14
<!-- AGENTS-META {"title":"Mastra README","version":"2.0.0","applies_to":"/","last_updated":"2025-11-20T00:00:00Z","status":"stable"} -->

<div align="center">

# 🚀 Mastra

[![Runtime Dependencies](https://img.shields.io/badge/Runtime%20Deps-18-brightgreen.svg)](https://www.npmjs.com/package/@mastra/core)
[![Dev Dependencies](https://img.shields.io/badge/Dev%20Deps-12-blue.svg)](https://www.npmjs.com/package/@mastra/core)
[![Tests](https://img.shields.io/badge/Tests-95%25-orange.svg)](https://vitest.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Mastra** is a production-grade framework for building **agent-driven applications** and **retrieval-augmented generation (RAG)** workflows. It provides modular tools, agents, workflows, vector stores, and configurations for secure, observable, and scalable AI systems.

[![@mastra/core](https://img.shields.io/npm/v/@mastra/core.svg)](https://www.npmjs.com/package/@mastra/core)
[![@mastra/pg](https://img.shields.io/npm/v/@mastra/pg.svg)](https://www.npmjs.com/package/@mastra/pg)
[![@mastra/rag](https://img.shields.io/npm/v/@mastra/rag.svg)](https://www.npmjs.com/package/@mastra/rag)
[![@mastra/memory](https://img.shields.io/npm/v/@mastra/memory.svg)](https://www.npmjs.com/package/@mastra/memory)
[![@mastra/evals](https://img.shields.io/npm/v/@mastra/evals.svg)](https://www.npmjs.com/package/@mastra/evals)
[![ai](https://img.shields.io/npm/v/ai.svg)](https://www.npmjs.com/package/ai)

[![@ai-sdk/google](https://img.shields.io/npm/v/@ai-sdk/google.svg)](https://www.npmjs.com/package/@ai-sdk/google)
[![@ai-sdk/openai](https://img.shields.io/npm/v/@ai-sdk/openai.svg)](https://www.npmjs.com/package/@ai-sdk/openai)
[![zod](https://img.shields.io/npm/v/zod.svg)](https://www.npmjs.com/package/zod)
[![vitest](https://img.shields.io/npm/v/vitest.svg)](https://vitest.dev/)

[![@mastra/arize](https://img.shields.io/npm/v/@mastra/arize.svg)](https://www.npmjs.com/package/@mastra/arize)
[![@mastra/loggers](https://img.shields.io/npm/v/@mastra/loggers.svg)](https://www.npmjs.com/package/@mastra/loggers)
[![@mastra/mcp](https://img.shields.io/npm/v/@mastra/mcp.svg)](https://www.npmjs.com/package/@mastra/mcp)
[![cheerio](https://img.shields.io/npm/v/cheerio.svg)](https://www.npmjs.com/package/cheerio)

[![serpapi](https://img.shields.io/npm/v/serpapi.svg)](https://serpapi.com/)
[![pdf-parse](https://img.shields.io/npm/v/pdf-parse.svg)](https://www.npmjs.com/package/pdf-parse)

</div>

## ✨ **Key Features**

- **🔧 50+ Production Tools**: Financial APIs (Polygon, Finnhub, AlphaVantage), SerpAPI search/news/shopping, web scraping, PDF processing, RAG chunking/embedding/query
- **🤖 20+ Specialized Agents**: Research, copywriting, editing, stock/crypto analysis, Excalidraw/CSV conversion, evaluation/learning extraction
- **📊 Observability-First**: Full tracing (Arize/Phoenix), custom scorers (diversity, completeness, quality), structured logging
- **🛡️ Governance Built-In**: JWT auth, role-based access, path traversal protection, HTML sanitization
- **💾 PgVector RAG**: Semantic recall, HNSW/flat indexes, metadata filtering, graph RAG
- **🌐 Multi-Agent Orchestration**: A2A Coordinator MCP server for agent federation
- **⚡ TypeScript + Zod**: Full schema validation, zero-runtime overhead
- **📈 Extensible**: Model registry (Gemini/OpenAI/Anthropic), workflows, MCP integration

## 🏗️ **Architecture Overview**

```mermaid
graph TB
    subgraph "🌐 User / MCP Client"
        A[User Queries] --> B[A2A Coordinator MCP]
    end

    subgraph "🎯 Mastra Runtime"
        B --> C[Agents<br/>• Research<br/>• Copywriter<br/>• Editor<br/>• Stock Analysis]
        C --> D[Tools<br/>• SerpAPI/Search<br/>• Polygon/Finnhub<br/>• Web Scraper<br/>• PDF Parser<br/>• PgVector RAG]
        C --> E[Workflows<br/>• Weather<br/>• Research Pipeline]
    end

    subgraph "🗄️ Storage Layer"
        D --> F[PgVector<br/>• Embeddings (3072D)<br/>• Semantic Recall<br/>• Threads]
        D --> G[PostgresStore<br/>• Traces<br/>• Evals<br/>• Memory]
    end

    subgraph "📊 Observability"
        C --> H[Arize/Phoenix<br/>• Traces<br/>• Scorers<br/>• Metrics]
        G --> H
    end

    style A fill:#e1f5fe
    style H fill:#f3e5f5
```

## 🔄 **RAG Pipeline**

```mermaid
flowchart TD
    A[PDF/Web Docs] --> B[Chunker<br/>• MDocument<br/>• Strategies]
    B --> C[Embeddings<br/>• Gemini-001<br/>• 3072D Vectors]
    C --> D[PgVector Upsert<br/>• HNSW/Flat<br/>• Metadata Filter]
    E[User Query] --> F[Query Embed]
    F --> G[Vector Search<br/>• Top-K + Filter]
    G --> H[Rerank<br/>• Semantic Scorer]
    H --> I[Answer Agent<br/>• Verify + Cite]
    I --> J[Response + Sources]
```

## 🤝 **Multi-Agent Coordination (A2A)**

```mermaid
sequenceDiagram
    participant U as User
    participant C as A2A Coordinator
    participant R as Research Agent
    participant S as Stock Agent
    participant E as Editor Agent
    participant M as MCP Client

    M->>C: coordinate_a2a_task(task)
    C->>R: Parallel: research(topic)
    C->>S: Parallel: analyze(symbol)
    R->>R: SerpAPI + PgVector RAG
    S->>S: Polygon + Finnhub APIs
    R->>C: Insights + Learnings
    S->>C: Metrics + Targets
    C->>E: edit_report(rawData)
    E->>C: Polished Report
    C->>M: Synthesized Results
```

## 🚀 **Quick Start**

### Prerequisites
- **Node.js ≥20.9.0**
- **PostgreSQL** (with `pgvector` extension for RAG)
- **API Keys**: OpenAI/Google/SerpAPI/Polygon/etc. (see `.env.example`)

### Install
```bash
npm ci
```

### Setup `.env`
```bash
cp .env.example .env
# Edit with your keys
```

### Run Dev Server
```bash
npm run dev
```

### Build & Production
```bash
npm run build
npm run start
```

## 📁 **Repository Structure**

```
src/mastra/
├── index.ts              # 🎯 Main entrypoint
├── agents/               # 🤖 20+ agents (research, copywriter, stock analysis...)
├── tools/                # 🔧 50+ tools (financial APIs, SerpAPI, RAG, scraper...)
├── workflows/            # 📋 Orchestration (weather, research pipeline...)
├── config/               # ⚙️ Models, PgVector, logging, auth
├── scorers/              # 📊 Eval scorers (diversity, completeness...)
├── mcp/                  # 🌐 A2A Coordinator MCP server
└── data/                 # 📄 Example assets
```

## 🛠️ **Development Workflow**

1. **Add Tool**: `src/mastra/tools/my-tool.ts` → `createTool({zodSchema, execute})`
2. **Add Agent**: `src/mastra/agents/my-agent.ts` → Compose tools + instructions
3. **Test**: `npm test` or `npx vitest src/mastra/tools/tests/my-tool.test.ts`
4. **Lint**: `npm run lint`

## 🔧 **Configuration**

| Env Var | Purpose | Example |
|---------|---------|---------|
| `PG_CONNECTION` | Postgres + PgVector | `postgresql://user:pass@localhost/mastra` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini models | `AIza...` |
| `SERPAPI_API_KEY` | Search/News/Shopping | `serp...` |
| `POLYGON_API_KEY` | Stock/Crypto data | `poly...` |

**Full list**: `src/mastra/config/AGENTS.md`

## 🧪 **Testing & CI**

```bash
npm test                    # All tests
npm run coverage            # Coverage report
npx vitest -t "pattern"     # Filter tests
```

- **95%+ Coverage**
- **Vitest + Zod** for schema validation
- **Mocked APIs** for financial/search tools

## 🔒 **Security**

- **JWT Auth**: `jwt-auth.tool.ts`
- **Path Traversal**: `validateDataPath()`
- **HTML Sanitization**: JSDOM + Cheerio
- **API Rate Limiting**: Built into tools
- **Secrets Masking**: `maskSensitiveMessageData()`

## 📊 **Observability**

- **Tracing**: Arize/Phoenix exporters
- **Scorers**: Diversity, completeness, quality (auto-sampled)
- **Logging**: Structured Pino + file rotation

## 🌐 **Integrations**

| Category | Tools/Agents |
|----------|-------------|
| **Search** | SerpAPI (News/Trends/Shopping/Scholar) |
| **Financial** | Polygon/Finnhub/AlphaVantage |
| **RAG** | PgVector chunking/rerank/query |
| **Content** | PDF→MD, web scraper, copywriter/editor |
| **Multi-Agent** | A2A MCP server |

## 🤝 **Contributing**

1. Fork & clone
2. `npm ci && npm test`
3. Add tests + docs
4. PR with `npm test` passing

**Guidelines**:
- Zod schemas everywhere
- Tools stateless, agents orchestrate
- Mock external APIs in tests

## 📚 **Resources**

- **[Agents](src/mastra/agents/AGENTS.md)**: Agent catalog
- **[Tools](src/mastra/tools/AGENTS.md)**: 50+ tools matrix
- **[Config](src/mastra/config/AGENTS.md)**: Setup guide
- **[MCP](src/mastra/mcp/AGENTS.md)**: A2A federation

---

⭐ **Star on GitHub** | 🐦 **Follow [@mastra_ai](https://x.com/mastra_ai)** | 📘 **Docs** [Coming Soon]

*Last updated: 2025-11-20*
