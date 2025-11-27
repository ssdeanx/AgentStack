<!-- AGENTS-META {"title":"AgentStack README","version":"3.2.0","applies_to":"/","last_updated":"2025-11-27T00:00:00Z","status":"stable"} -->

<div align="center">

# 🚀 AgentStack

[![Runtime Dependencies](https://img.shields.io/badge/Runtime%20Deps-25-brightgreen.svg)](https://www.npmjs.com/package/@mastra/core)
[![Dev Dependencies](https://img.shields.io/badge/Dev%20Deps-15-blue.svg)](https://www.npmjs.com/package/@mastra/core)
[![Tests](https://img.shields.io/badge/Tests-97%25-brightgreen.svg)](https://vitest.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitMCP](https://img.shields.io/endpoint?url=https://gitmcp.io/badge/ssdeanx/AgentStack)](https://gitmcp.io/ssdeanx/AgentStack)

**AgentStack** is a **production-grade multi-agent framework** built on Mastra, delivering **30+ enterprise tools**, **25+ specialized agents**, **10 workflows**, **4 agent networks**, **49 UI components**, and **A2A/MCP orchestration** for scalable AI systems. Focuses on **financial intelligence**, **RAG pipelines**, **observability**, **secure governance**, and **AI chat interfaces**.

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

| Feature                      | AgentStack                                           | LangChain     | CrewAI        | AutoGen    |
| ---------------------------- | ---------------------------------------------------- | ------------- | ------------- | ---------- |
| **Production Observability** | ✅ **Full Arize/Phoenix tracing + custom scorers**   | ⚠️ Partial    | ❌ Basic      | ❌ Limited |
| **Financial Tools**          | ✅ **Polygon/Finnhub/AlphaVantage (20+ endpoints)**  | ❌ None       | ❌ None       | ❌ None    |
| **RAG Pipeline**             | ✅ **PgVector HNSW + rerank + graphRAG**             | ⚠️ External   | ❌ Basic      | ❌ None    |
| **Multi-Agent**              | ✅ **A2A MCP + parallel orchestration**              | ⚠️ Sequential | ✅ Sequential | ✅ Custom  |
| **Governance**               | ✅ **JWT/RBAC + path traversal + HTML sanitization** | ❌ Custom     | ❌ None       | ❌ None    |
| **TypeScript**               | ✅ **Zod schemas everywhere**                        | ⚠️ JS/TS mix  | ⚠️ JS focus   | ❌ Python  |
| **UI Components**            | ✅ **49 AI Elements + shadcn/ui**                    | ❌ None       | ❌ None       | ❌ None    |
| **Tests**                    | ✅ **97% Vitest coverage**                           | ⚠️ Partial    | ❌ Sparse     | ⚠️ Partial |

**Built for production**: Secure, observable, testable agents with **zero-config** PgVector RAG + **enterprise financial APIs**.

## ✨ **Core Capabilities**

- **💰 Financial Intelligence**: 20+ tools (Polygon quotes/aggs/fundamentals, Finnhub analysis, AlphaVantage indicators)
- **🔍 Semantic RAG**: PgVector (3072D embeddings) + MDocument chunking + rerank + graph traversal
- **🤖 25+ Agents**: Research → Learn → Report → Edit → Analyze (stock/crypto/copywriter/evaluator/data pipeline)
- **📋 10 Workflows**: Weather, content, financial reports, document processing, research synthesis, learning extraction
- **🌐 4 Agent Networks**: Primary routing, data pipeline, report generation, research pipeline
- **🔌 A2A/MCP**: MCP server coordinates parallel agents (research+stock→report)
- **🎨 49 UI Components**: AI Elements (30 chat/reasoning/canvas components) + shadcn/ui (19 base primitives)
- **📊 Full Observability**: Arize/Phoenix traces + 10+ custom scorers (diversity/quality/completeness)
- **🛡️ Enterprise Security**: JWT auth, RBAC, path validation, HTML sanitization, secrets masking
- **⚡ Extensible**: Model registry (Gemini/OpenAI/Anthropic), Zod schemas everywhere

## 🏗️ **Architecture**

```mermaid
graph TB
    subgraph "� Frontend (Next.js 16)"
        UI[AI Elements + shadcn/ui<br/>• 30 AI Components<br/>• 19 Base Primitives]
        App[App Router<br/>• React 19<br/>• Tailwind CSS 4]
    end

    subgraph "🌐 MCP/A2A Client"
        Client[Cursor/Claude/External Agents] --> Coord[A2A Coordinator MCP]
    end

    subgraph "🎯 AgentStack Runtime"
        Coord --> Agents[22+ Agents<br/>• ResearchAgent<br/>• StockAnalysis<br/>• Copywriter<br/>• ReportAgent]
        Agents --> Tools[30+ Tools<br/>• Polygon/Finnhub<br/>• SerpAPI 10+<br/>• PgVector RAG<br/>• PDF→MD]
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

    UI --> App
    App --> Agents

    style Client fill:#e1f5fe
    style Arize fill:#f3e5f5
    style UI fill:#e8f5e9
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
# Frontend
app/                      # 📱 Next.js 16 App Router (layouts, pages)
ui/                       # 🎨 shadcn/ui base components (19 primitives)
src/components/ai-elements/  # 🤖 AI Elements (30 chat/reasoning/canvas components)

# Backend
src/mastra/
├── index.ts              # 🎯 Mastra bootstrap (25+ agents, 10 workflows, 4 networks, MCP)
├── agents/               # 🤖 22+ agents (research/stock/copywriter/report/data pipeline...)
├── tools/                # 🔧 30+ tools (financial/RAG/scrape/PDF/SerpAPI...)
├── workflows/            # 📋 10 workflows (weather, content, financial, document, research)
├── networks/             # 🌐 4 agent networks (routing/coordination)
├── config/               # ⚙️ Models/PgVector/Logging/Auth
├── scorers/              # 📊 10+ evals (diversity/quality/completeness...)
├── mcp/                  # 🔌 MCP server (A2A coordination)
└── a2a/                  # 🤝 Agent-to-Agent coordinator
```

## 🛠️ **Development**

1. **New Tool**: `src/mastra/tools/my-tool.ts` → `createTool({zodSchema, execute})`
2. **New Agent**: `src/mastra/agents/my-agent.ts` → Compose tools + Zod instructions
3. **Test**: `npm test` (97% coverage) or `npx vitest src/mastra/tools/tests/my-tool.test.ts`
4. **Lint**: `npm run lint`

## 🔧 **Configuration**

| Env Var                        | Purpose                               | Required      |
| ------------------------------ | ------------------------------------- | ------------- |
| `PG_CONNECTION`                | Postgres + PgVector RAG               | ✅            |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini LLM/Embeddings                 | ✅            |
| `SERPAPI_API_KEY`              | Search/News/Shopping (10+ tools)      | ✅            |
| `POLYGON_API_KEY`              | Stock/Crypto quotes/aggs/fundamentals | ✅            |
| `PHOENIX_ENDPOINT`             | Arize/Phoenix tracing                 | Observability |

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

| Category             | Tools                                                  | Agents                                    |
| -------------------- | ------------------------------------------------------ | ----------------------------------------- |
| **🔍 Search**        | SerpAPI (News/Trends/Shopping/Scholar/Local/Yelp)      | ResearchAgent                             |
| **💰 Financial**     | Polygon (10+), Finnhub (6+), AlphaVantage (indicators) | StockAnalysis, CryptoAnalysis             |
| **📄 RAG**           | PgVector chunk/rerank/query/graph                      | Retrieve/Rerank/Answerer                  |
| **📝 Content**       | PDF→MD, Web Scraper, Copywriter/Editor                 | CopywriterAgent, EditorAgent, ReportAgent |
| **🎨 Visual**        | CSV↔Excalidraw, SVG/XML process                       | csvToExcalidrawAgent, imageToCsvAgent     |
| **🌐 Orchestration** | A2A MCP Server                                         | a2aCoordinatorAgent                       |
| **💻 UI**            | AI Elements (30), shadcn/ui (19), Radix primitives     | Chat/Reasoning/Canvas interfaces          |

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

- **[UI Components](ui/AGENTS.md)**: 19 shadcn/ui base components
- **[AI Elements](src/components/ai-elements/AGENTS.md)**: 30 AI chat/reasoning/canvas components
- **[Agents Catalog](src/mastra/agents/AGENTS.md)**: 22+ agents
- **[Tools Matrix](src/mastra/tools/AGENTS.md)**: 30+ tools
- **[Workflows](src/mastra/workflows/AGENTS.md)**: 10 multi-step workflows
- **[Networks](src/mastra/networks/AGENTS.md)**: 4 agent networks
- **[Config Guide](src/mastra/config/AGENTS.md)**: Setup + env vars
- **[MCP/A2A](src/mastra/mcp/AGENTS.md)**: Multi-agent federation
- **[Scorers](src/mastra/scorers/AGENTS.md)**: 10+ eval metrics

## 🏆 **Roadmap**

- [x] **Financial Suite**: Polygon/Finnhub/AlphaVantage (✅ Live)
- [x] **RAG Pipeline**: PgVector + rerank/graph (✅ Live)
- [x] **A2A MCP**: Parallel orchestration (✅ Live)
- [x] **10 Workflows**: Sequential, parallel, branch, loop, foreach, suspend/resume (✅ Live)
- [x] **4 Agent Networks**: Routing and coordination (✅ Live)
- [x] **UI Components**: AI Elements + shadcn/ui (49 components) (✅ Live)
- [ ] **Chat Interface**: Full agent chat UI with AI Elements
- [ ] **LangSmith/Phoenix**: Eval dashboards
- [ ] **Docker/Helm**: K8s deploy
- [ ] **OpenAI/Anthropic**: Model parity

---

⭐ **Star [ssdeanx/AgentStack](https://github.com/ssdeanx/AgentStack)**
🐦 **Follow [@ssdeanx](https://x.com/ssdeanx)**
📘 **[Docs](https://agentstack.ai)** (Coming Q1 2026)

_Last updated: 2025-11-27 | v3.2.0_
