# Project Brief

AgentStack is a multi-agent toolkit built on top of Mastra. In this repo it defines a focused set of core agents and tools, wired together with PgVector-backed RAG pipelines to support financial analysis, document research, content generation, and diagram workflows. An A2A coordinator agent and an MCP server expose these capabilities to external clients.

**Vision:** Provide transparent, observable reasoning and tool execution so teams can rely on automated workflows without sacrificing explainability, compliance, or performance.

**Scope:** Deliver an extensible toolkit with financial APIs (Polygon, Finnhub, AlphaVantage), search/knowledge tools (SerpAPI, web scrapers, Excalidraw converters), path-safe data/file utilities, PgVector search, and observability via Mastra's CloudExporter + Arize/Phoenix integration. JWT auth and RBAC live as scaffolding (for example `jwt-auth.tool.ts` and `policy/acl.yaml`) and are not yet fully enforced across every workflow. Testing currently focuses on tool- and config-level behaviour using Vitest; coverage is improving but not yet a formal target.

The project prioritizes schema-driven tooling, self-documenting agents, and production readiness (Node >=20.9, TypeScript strict mode, comprehensive Zod validation). It stays tuned to new models via the central model registry (Gemini/OpenAI/Anthropic/OpenRouter/Vertex) while expanding enterprise readiness (Docker/Kubernetes, richer evaluation dashboards).
