# Project Brief

AgentStack is a multi-agent toolkit built on top of Mastra. In this repo it defines a focused set of core agents and tools, wired together with PgVector-backed RAG pipelines to support financial analysis, document research, content generation, and diagram workflows. An A2A coordinator agent and an MCP server expose these capabilities to external clients.

**Vision:** Provide transparent, observable reasoning and tool execution so teams can rely on automated workflows without sacrificing explainability, compliance, or performance.

**Scope:** Extensible toolkit w/ 17 agents (`src/mastra/agents`), 30+ tools (`src/mastra/tools`: polygon-tools/10+, finnhub/6+, serpapi-*, csv-to-json etc.), 5 workflows, PgVector RAG (`pg-storage.ts`), observability (Arize/Phoenix). JWT/RBAC scaffolding (`jwt-auth.tool.ts`, `acl.yaml`); Vitest tests →97% goal.

The project prioritizes schema-driven tooling, self-documenting agents, and production readiness (Node >=20.9, TypeScript strict mode, comprehensive Zod validation). It stays tuned to new models via the central model registry (Gemini/OpenAI/Anthropic/OpenRouter/Vertex) while expanding enterprise readiness (Docker/Kubernetes, richer evaluation dashboards).
