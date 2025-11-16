
<!-- AGENTS-META {"title":"AgentStack README","version":"3.0.0","applies_to":"/","last_updated":"2025-11-25T00:00:00Z","status":"stable"} -->

<div align="center">

# 🚀 AgentStack

[![Runtime Dependencies](https://img.shields.io/badge/Runtime%20Deps-25-brightgreen.svg)](https://www.npmjs.com/package/@mastra/core)
[![Dev Dependencies](https://img.shields.io/badge/Dev%20Deps-15-blue.svg)](https://www.npmjs.com/package/@mastra/core)
[![Tests](https://img.shields.io/badge/Tests-97%25-brightgreen.svg)](https://vitest.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**AgentStack** is a **production-grade multi-agent framework** built on Mastra, delivering **50+ enterprise tools**, **25+ specialized agents**, and **A2A/MCP orchestration** for scalable AI systems. Focuses on **financial intelligence**, **RAG pipelines**, **observability**, and **secure governance**.

[![GitHub](https://img.shields.io/badge/GitHub-ssdeanx/AgentStack-blueviolet?logo=github)](https://github.com/ssdeanx/AgentStack)
[![@mastra/core](https://img.shields.io/npm/v/@mastra/core.svg)](https://www.npmjs.com/package/@mastra/core)
[![@mastra/pg](https://img.shields.io/npm/v/@mastra/pg.svg)](https://www.npmjs.com/package/@mastra/pg)
[![@mastra/rag](https://img.shields.io/npm/v/@mastra/rag.svg)](https://www.npmjs.com/package/@mastra/rag)
[![@mastra/memory](https://img.shields.io/npm/v/@mastra/memory.svg)](https://www.npmjs.com/package/@mastra/memory)

[![@ai-sdk/google](https://img.shields.io/npm/v/@ai-sdk/google.svg)](https://www.npmjs.com/package/@ai-sdk/google)
[![zod](https://img.shields.io/npm/v/zod.svg)](https://www.npmjs.com/package/zod)
[![vitest](https://img.shields.io/npm/v/vitest.svg)](https://vitest.dev/)

[![@mastra/arize](https://img.shields.io/npm/v/@mastra/arize.svg)](https://www.npmjs.com/package/@mastra/arize)
[![@mastra/mcp](https://img.shields.io/npm/v/@mastra/mcp.svg)](https://www.npmjs.com/package/@mastra/mcp)
[![cheerio](https://img.shields.io/npm/v/cheerio.svg)](https://www.npmjs.com/package/cheerio)
[![serpapi](https://img.shields.io/npm/v/serpapi.svg)](https://serpapi.com/)

[![PgVector](https://img.shields.io/badge/VectorStore-PgVector-blue.svg)](https://github.com/pgvector/pgvector)
[![Gemini](https://img.shields.io/badge/LLM-Gemini%202.5-orange.svg)](https://ai.google.dev/)

</div>

## 🎯 **Why AgentStack?**

| Feature | AgentStack | LangChain | CrewAI | AutoGen |
|---------|------------|-----------|--------|---------|
| **Production Observability** | ✅ **Full Arize/Phoenix tracing + custom scorers** | ⚠️ Partial | ❌ Basic | ❌ Limited |
| **Financial Tools** | ✅ **Polygon/Finnhub/AlphaVantage (20+ endpoints)** | ❌ None | ❌ None | ❌ None |
| **RAG Pipeline** | ✅ **PgVector HNSW + rerank + graphRAG** | ⚠️ External | ❌ Basic | ❌ None |
| **Multi-Agent** | ✅ **A2A MCP + parallel orchestration** | ⚠️ Sequential | ✅ Sequential | ✅ Custom |
| **Governance** | ✅ **JWT/RBAC + path traversal + HTML sanitization** | ❌ Custom | ❌ None | ❌ None |
| **TypeScript** | ✅ **Zod schemas everywhere** | ⚠️ JS/TS mix | ⚠️ JS focus | ❌ Python |
| **Tests** | ✅ **97% Vitest coverage** | ⚠️ Partial | ❌ Sparse | ⚠️ Partial |

**Built for production**: Secure, observable, testable agents with **zero-config** PgVector RAG + **enterprise financial APIs**.

## ✨ **Core Capabilities**

- **💰 Financial Intelligence**: 20+ tools (Polygon quotes/aggs/fundamentals, Finnhub analysis, AlphaVantage indicators)
- **🔍 Semantic RAG**: PgVector (3072D embeddings) + MDocument chunking + rerank + graph traversal
- **🤖 25+ Agents**: Research → Learn → Report → Edit → Analyze (stock/crypto/copywriter/evaluator)
- **🌐 A2A Orchestration**: MCP server coordinates parallel agents (research+stock→report)
- **📊 Full Observability**: Arize/Phoenix traces + 10+ custom scorers (diversity/quality/completeness)
- **🛡️ Enterprise Security**: JWT auth, RBAC, path validation, HTML sanitization, secrets masking
- **⚡ Extensible**: Model registry (Gemini/OpenAI/Anthropic), workflows, 50+ tools

## 🏗️ **Architecture**

```mermaid
graph TB
    subgraph "🌐 MCP/A2A Client"
        Client[Cursor/Claude/External Agents] --> Coord[A2A Coordinator MCP]
    end

    subgraph "🎯 AgentStack Runtime"
        Coord --> Agents[25+ Agents<br/>• ResearchAgent<br/>• StockAnalysis<br/>• Copywriter<br/>• ReportAgent]
        Agents --> Tools[50+ Tools<br/>• Polygon/Finnhub<br/>• SerpAPI (10+)<br/>• PgVector RAG<br/>• PDF→MD]
        Agents --> Workflows[Research→Report<br/>Weather→Activities]
    end

    subgraph "🗄️ PgVector Storage"
        Tools --> Embeddings[3072D Gemini<br/>HNSW/Flat Indexes]
        Tools --> Postgres[Traces/Evals<br/>Memory/Threads]
    end

    subgraph "📊 Observability"
        Agents --> Arize[Arize/Phoenix<br/>• 97% Traced<br/>• 10+ Scorers]
        Postgres --> Arize
    end

    style Client fill:#e1f5fe
    style Arize fill:#f3e5f5
```

## 🔄 **RAG Pipeline (Production-Grade)**

```mermaid
flowchart TD
    A[Docs/PDF/Web] --> B[MDocument Chunker<br/>• 10 Strategies<br/>• Metadata Extract]
    B --> C[Gemini Embeddings<br/>• 3072D Vectors]
    C --> D[PgVector Upsert<br/>• HNSW/Flat<br/>• Metadata Filter]
    E[Query] --> F[Query Embed]
    F --> G[Vector Search<br/>• Top-K + Rerank]
    G --> H[Graph Traversal<br/>• Relations/Context]
    H --> I[Answer Agent<br/>• Cite/Verify]
    I --> J[Response + Sources]
```

## 🤝 **A2A Multi-Agent Flow**

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Coord as A2A Coordinator
    participant Research as Research Agent
    participant Stock as Stock Agent
    participant Report as Report Agent

    Client->>Coord: coordinate_a2a_task("AAPL analysis")
    Note over Coord: Parallel Orchestration
    Coord->>+Research: research("AAPL fundamentals")
    Coord->>+Stock: analyze("AAPL technicals")
    Research->>Research: SerpAPI + PgVector RAG
    Stock->>Stock: Polygon + Finnhub APIs
    Research-->>-Coord: Insights + Learnings
    Stock-->>-Coord: Metrics + Targets
    Coord->>+Report: generate_report(rawData)
    Report-->>-Coord: Markdown Report
    Coord->>Client: Final Synthesized Report
```

## 🚀 **Quick Start**

### Prerequisites

- **Node.js ≥20.9.0**
- **PostgreSQL + pgvector** (for RAG/Memory)
- **API Keys**: `.env` (Gemini/SerpAPI/Polygon/etc.)

### Clone & Install

```bash
git clone https://github.com/ssdeanx/AgentStack.git
cd AgentStack
npm ci
```

### Setup `.env`

```bash
cp .env.example .env
# Add your keys (Gemini, SerpAPI, Polygon, etc.)
```

### Run Dev Server

```bash
npm run dev
```

### MCP Server (A2A)

```bash
npm run mcp-server  # http://localhost:6969/mcp
```

### Production

```bash
npm run build
npm run start
```

## 📁 **Structure**

```bash
src/mastra/
├── index.ts              # 🎯 Mastra bootstrap (agents/tools/workflows/MCP)
├── agents/               # 🤖 25+ agents (research/stock/copywriter/report...)
├── tools/                # 🔧 50+ tools (financial/RAG/scrape/PDF/SerpAPI...)
├── workflows/            # 📋 Multi-step (research→report, weather→activities)
├── config/               # ⚙️ Models/PgVector/Logging/Auth
├── scorers/              # 📊 10+ evals (diversity/quality/completeness...)
└── mcp/                  # 🌐 A2A Coordinator MCP server
```

## 🛠️ **Development**

1. **New Tool**: `src/mastra/tools/my-tool.ts` → `createTool({zodSchema, execute})`
2. **New Agent**: `src/mastra/agents/my-agent.ts` → Compose tools + Zod instructions
3. **Test**: `npm test` (97% coverage) or `npx vitest src/mastra/tools/tests/my-tool.test.ts`
4. **Lint**: `npm run lint`

## 🔧 **Configuration**

| Env Var | Purpose | Required |
|---------|---------|----------|
| `PG_CONNECTION` | Postgres + PgVector RAG | ✅ |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini LLM/Embeddings | ✅ |
| `SERPAPI_API_KEY` | Search/News/Shopping (10+ tools) | ✅ |
| `POLYGON_API_KEY` | Stock/Crypto quotes/aggs/fundamentals | ✅ |
| `PHOENIX_ENDPOINT` | Arize/Phoenix tracing | Observability |

**Full**: `.env.example` + `src/mastra/config/AGENTS.md`

## 🧪 **Testing (97% Coverage)**

```bash
npm test                    # All tests
npm run coverage            # LCOV report
npx vitest -t "polygon"     # Filter (e.g., financial tools)
```

- **Vitest + Zod**: Schema validation + mocks
- **API Mocks**: Financial/search tools fully mocked

## 🔒 **Security & Governance**

- **JWT Auth**: `jwt-auth.tool.ts` + RBAC
- **Path Traversal**: `validateDataPath()` everywhere
- **HTML Sanitization**: JSDOM + Cheerio (script/strip events)
- **Secrets Masking**: `maskSensitiveMessageData()`
- **Rate Limiting**: Built into financial APIs

## 📊 **Observability (Production-Ready)**

```bash
Arize/Phoenix Exporters:
├── Traces: 100% (spans/tools/agents)
├── Scorers: 10+ (diversity/quality/task-completion)
├── Metrics: Latency/errors/tool-calls
└── Sampling: Always-on + ratio (30-80%)
```

**Custom Scorers**: Source diversity, completeness, creativity, response quality.

## 🌐 **Integrations Matrix**

| Category | Tools | Agents |
|----------|-------|--------|
| **🔍 Search** | SerpAPI (News/Trends/Shopping/Scholar/Local/Yelp) | ResearchAgent |
| **💰 Financial** | Polygon (10+), Finnhub (6+), AlphaVantage (indicators) | StockAnalysis, CryptoAnalysis |
| **📄 RAG** | PgVector chunk/rerank/query/graph | Retrieve/Rerank/Answerer |
| **📝 Content** | PDF→MD, Web Scraper, Copywriter/Editor | CopywriterAgent, EditorAgent, ReportAgent |
| **🎨 Visual** | CSV↔Excalidraw, SVG/XML process | csvToExcalidrawAgent, imageToCsvAgent |
| **🌐 Orchestration** | A2A MCP Server | a2aCoordinatorAgent |

## 🚀 **Advanced Usage**

### Custom Agent

```ts
// src/mastra/agents/my-agent.ts
import { Agent } from '@mastra/core/agent'
export const myAgent = new Agent({
  id: 'my-agent',
  tools: { polygonStockQuotesTool, pgQueryTool },
  instructions: 'Analyze stocks with Polygon + RAG...',
  model: googleAI, // From model registry
  memory: pgMemory,
})
// Auto-registers in index.ts
```

### MCP/A2A Client

```bash
# Start server
npm run mcp-server

# Use in Cursor/Claude
# coordinate_a2a_task({task: "AAPL analysis", agents: ["research", "stock"]})
```

## 🤝 **Contributing**

1. **Fork**: `https://github.com/ssdeanx/AgentStack`
2. **Setup**: `npm ci && npm test`
3. **Add**: Tool/Agent + Zod schema + Vitest
4. **PR**: `npm test` + coverage >95%

**Guidelines**:

- **Zod Everywhere**: Input/output schemas
- **Stateless Tools**: Agents orchestrate
- **Mock APIs**: 100% test coverage
- **Trace Everything**: Arize spans

## 📚 **Resources**

- **[Agents Catalog](src/mastra/agents/AGENTS.md)**: 25+ agents
- **[Tools Matrix](src/mastra/tools/AGENTS.md)**: 50+ tools
- **[Config Guide](src/mastra/config/AGENTS.md)**: Setup + env vars
- **[MCP/A2A](src/mastra/mcp/AGENTS.md)**: Multi-agent federation
- **[Scorers](src/mastra/scorers/AGENTS.md)**: 10+ eval metrics

## 🏆 **Roadmap**

- [x] **Financial Suite**: Polygon/Finnhub/AlphaVantage (✅ Live)
- [x] **RAG Pipeline**: PgVector + rerank/graph (✅ Live)
- [x] **A2A MCP**: Parallel orchestration (✅ Live)
- [ ] **LangSmith/Phoenix**: Eval dashboards
- [ ] **Docker/Helm**: K8s deploy
- [ ] **OpenAI/Anthropic**: Model parity

---

⭐ **Star [ssdeanx/AgentStack](https://github.com/ssdeanx/AgentStack)**
🐦 **Follow [@ssdeanx](https://x.com/ssdeanx)**
📘 **[Docs](https://agentstack.ai)** (Coming Q1 2026)

*Last updated: 2025-11-25 | v3.0.0*
