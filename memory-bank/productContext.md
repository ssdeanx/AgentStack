# Product Context

## Problem Space

- Enterprise teams need multi-domain intelligence (financial, research, regulatory, creative) but existing agents often lack observability, governance, or comprehensive tooling.
- Financial and RAG workloads must juggle rate-limited APIs, strict schema validation, and vector search performance while keeping auditability and security guarantees intact.

## Approach

- Mastra platform w/ 17 agents (`a2aCoordinatorAgent.ts`, `researchAgent.ts`, `stockAnalysisAgent.ts`, `copywriterAgent.ts` etc., 14 doc'd in AGENTS.md) exposed via MCP (`mcp/index.ts`); orchestration evolving (`a2aCoordinatorMcpServer`).
- Integrate the existing tool suite (financial APIs like Polygon/Finnhub/AlphaVantage, SerpAPI-based research tools, document chunking, PDF conversion, Excalidraw helpers) so every agent can access the data it needs, with room to grow toward the larger roadmap described in the README.
- Bake in observability (CloudExporter + Arize/Phoenix traces) and a rich set of scorers (tool-call accuracy, completeness, translation quality, relevancy, safety, source diversity, research completeness, summary quality, task completion, response quality, creativity) plus governance primitives (JWT auth scaffolding, RBAC policy file, HTML sanitization, path traversal protection). JWT verification in `jwt-auth.tool.ts` is currently stubbed and not yet wired into all flows.

## Value Delivered

- A solid foundation for multi-agent orchestration with clearly defined, Zod-validated tools and agents.
- Type-safe tools and agents with an expanding Vitest test suite (not yet at a specific coverage target) that reduce runtime surprises.
- Security, monitoring, and vector search capabilities that make complex workflows more traceable, explainable, and governable, with clear extension points for stricter policies.
