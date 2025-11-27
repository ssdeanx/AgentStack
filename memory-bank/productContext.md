# Product Context

## Problem Space

- Enterprise teams need multi-domain intelligence (financial, research, regulatory, creative) but existing agents often lack observability, governance, or comprehensive tooling.
- Financial and RAG workloads must juggle rate-limited APIs, strict schema validation, and vector search performance while keeping auditability and security guarantees intact.
- AI interactions need polished, accessible UIs that visualize reasoning, tool usage, and agent coordination.

## Approach

- Mastra platform w/ 22+ agents (`a2aCoordinatorAgent.ts`, `researchAgent.ts`, `stockAnalysisAgent.ts`, `copywriterAgent.ts`, `dataExportAgent.ts`, `researchPaperAgent.ts`, `documentProcessingAgent.ts`, etc.) exposed via MCP (`mcp/index.ts`); orchestration via 4 agent networks (`agentNetwork`, `dataPipelineNetwork`, `reportGenerationNetwork`, `researchPipelineNetwork`).
- Integrate the existing tool suite (financial APIs like Polygon/Finnhub/AlphaVantage, SerpAPI-based research tools, document chunking, PDF conversion, Excalidraw helpers) so every agent can access the data it needs, with room to grow toward the larger roadmap described in the README.
- Bake in observability (CloudExporter + Arize/Phoenix traces) and a rich set of scorers (tool-call accuracy, completeness, translation quality, relevancy, safety, source diversity, research completeness, summary quality, task completion, response quality, creativity) plus governance primitives (JWT auth scaffolding, RBAC policy file, HTML sanitization, path traversal protection). JWT verification in `jwt-auth.tool.ts` is currently stubbed and not yet wired into all flows.
- Provide a **complete UI component library** (49 components): 30 AI Elements (`src/components/ai-elements/`) for chat/reasoning/canvas interfaces + 19 shadcn/ui base primitives (`ui/`) built on Radix UI and Tailwind CSS 4.

## Value Delivered

- A solid foundation for multi-agent orchestration with clearly defined, Zod-validated tools and agents coordinated by 4 specialized networks.
- Type-safe tools and agents with an expanding Vitest test suite (targeting 97% coverage) that reduce runtime surprises.
- Security, monitoring, and vector search capabilities that make complex workflows more traceable, explainable, and governable, with clear extension points for stricter policies.
- Production-ready UI components for building AI chat interfaces with support for reasoning visualization, tool displays, and canvas workflows.
