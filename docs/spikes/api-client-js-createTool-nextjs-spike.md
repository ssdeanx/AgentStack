---
title: "Client-side createTool Integration (Next.js)"
category: "API Integration"
status: "🔴 Not Started"
priority: "High"
timebox: "1 week"
created: 2026-01-10
updated: 2026-01-10
owner: "ssdsk"
tags: ["technical-spike", "api-integration", "mastra", "client-js"]
---

# Client-side createTool Integration (Next.js)

## Summary

**Spike Objective:** Validate and implement a safe, documented example of using @mastra/client-js createTool on the frontend (Next.js App Router) so developers can run client-side tools and respond to tool-call chunks from Mastra agents.

**Why This Matters:** Enabling client-side tools expands the types of interactions agents can request (DOM updates, browser-only integrations, local device access) while keeping sensitive operations server-side. A documented, tested example will unblock UI work that relies on client-executed tools and ensures we follow security and architecture constraints.

**Timebox:** 1 week

**Decision Deadline:** 2026-01-17

## Research Question(s)

**Primary Question:** What is the recommended, secure pattern for using createTool from @mastra/client-js in a Next.js (App Router) client component so an agent can trigger client-side actions (change DOM, access device APIs) without exposing secrets or introducing vulnerabilities?

**Secondary Questions:**

- How do we authenticate the Mastra client in the browser (what env vars, and how to protect tokens)?
- Which agent / stored-agent configuration is required on the server to support the example (does an agent need pre-configured tools or description)?
- How does streaming (agent.stream) emit tool-call chunks and how should the client handle them (auto-call vs intercept)?
- What test coverage and E2E checks are appropriate for a client tool example (unit, integration, Playwright)?
- Are there browser compatibility or SSE authentication concerns (MCP/MCPClient differences)?
- Are there notable accessibility considerations when tools modify UI (focus, announcements)?

## Investigation Plan

### Research Tasks

- [ ] Review and summarize official docs for createTool in @mastra/client-js and agent streaming tool-call behavior (already started: client-js docs & examples).
- [ ] Confirm required server-side agent setup and whether a stored agent is needed (create sample stored agent or use an existing agent id).
- [ ] Prototype a minimal Next.js client component showing: mastraClient instance, createTool usage, agent.generate and agent.stream with clientTools, and stream.processDataStream handling tool-call chunks.
- [ ] Add tests (Vitest unit tests for utilities + Playwright E2E to validate tool-call triggers change in UI and streaming logs appear correctly).
- [ ] Create README docs and a short pattern note (security best practices for client tools).
- [ ] Security review: verify no secrets in client code, validate tool inputs with Zod, and add guardrails for tool operations that could leak sensitive data.

### Success Criteria

**This spike is complete when:**

- [ ] A working PoC exists inside the repository under app/examples (or app/chat) that demonstrates createTool in a Next.js client component
- [ ] The PoC uses a MastraClient instance configured via NEXT_PUBLIC_MASTRA_API_URL and does not include secrets in client code
- [ ] Unit tests and at least one Playwright E2E test verify expected behavior (tool call triggers client action and streaming output is handled)
- [ ] A short docs snippet (README or docs/examples) explains usage, security considerations, and how to run the example locally
- [ ] Implementation notes and required server-side setup are documented (agent id, any stored agent or network config)

## Technical Context

**Related Components:**

- Next.js App Router (client components) - app/examples or app/chat
- lib/mastra/mastra-client.ts (new client wrapper for MastraClient)
- Mastra server (local or remote) - must be running for PoC
- CI: Vitest (unit tests) and Playwright (E2E)

**Dependencies:**

- @mastra/client-js (client-side SDK)
- zod (schemas for tool input validation)
- @ai-sdk for model usage (if creating demo agent server-side)
- Playwright (for E2E test)
- Environment: NEXT_PUBLIC_MASTRA_API_URL set to Mastra server base URL (http://localhost:4111 by default)

**Constraints:**

- Client-side tools run in users' browsers — cannot access server secrets or privileged APIs
- Next.js server and client separation: createTool must be used inside a "use client" component
- SSE authentication and MCP-specific transport considerations (if an MCP server is used instead) — avoid complex MCP setups in the minimal example
- Must validate all input on client using Zod and avoid executing untrusted code

## Research Findings

### Investigation Results

- The official docs confirm createTool exists in @mastra/client-js and is intended for browser/client usage.
- Client tools are passed to agent.generate/agent.stream via the clientTools option and will run in the browser when the agent emits a tool-call chunk referencing the tool id.
- For streaming flows, tool-call chunks appear with chunk.type === "tool-call"; clients can either auto-run the provided client tool or intercept and perform custom logic.
- Tool lifecycle hooks (onInputStart, onInputDelta, onInputAvailable, onOutput) exist and are useful for streaming and progressive updates.
- Security notes in the docs: validate user input; do not place sensitive tokens in client code. Provide only public base URL via NEXT_PUBLIC_MASTRA_API_URL.
- MCP/MCPClient has additional considerations for SSE authentication; for this PoC we'll prefer straightforward MastraClient usage and avoid complex MCP transports.

### Prototype/Testing Notes

- The example will be a client component with a "Change Background Color" tool (validated via Zod) and a small chat-style UI that calls an agent.text prompt telling it to call the tool. The PoC will demonstrate:
  - createTool usage in browser
  - Passing clientTools to agent.generate/agent.stream
  - Handling streaming chunks and tool-calls
  - Using onOutput hook to display completion
- Server-side: either use an existing sample agent id (e.g., "frontend-demo-agent") or include instructions to create a simple stored agent on local Mastra server that will request the tool by name.

### External Resources

- Mastra docs: Reference: Agents API | Client SDK (client-js) — agents.mdx
- Mastra docs: Tools API | Client SDK — tools.mdx
- Mastra docs: createTool reference (client and server docs)
- Examples: "examples-client-side-tools" included in Mastra examples

## Decision

### Recommendation

Proceed with a 1-week spike that implements the PoC component in app/examples/client-tools, adds a Mastra client wrapper lib (lib/mastra/mastra-client.ts), writes tests (vitest + Playwright), and documents the required server setup in docs/examples or a README file. Keep the example minimal and secure (no secrets in repo) and prioritize readability and reusability.

### Rationale

- The docs and examples are already aligned with this approach and show a minimal footprint.
- A small PoC demonstrates the pattern for other teams and reduces risk for client-side tool usage in production environments.
- Tests and docs ensure maintainability and make the example useful for contributors.

### Implementation Notes

- Add files:
  - lib/mastra/mastra-client.ts — creates and exports MastraClient with base URL from NEXT_PUBLIC_MASTRA_API_URL
  - app/examples/client-tools/page.tsx — client component demo showing createTool usage and a small UI for running an agent command
  - tests/unit/client-tool.spec.ts — unit tests for helper functions and Zod validation
  - tests/e2e/client-tool.spec.ts — Playwright test that runs the page and asserts color change / logs
  - docs/examples/client-tools.md — short README describing how to run locally and security guidance
- Use tenant-safe patterns: use NEXT_PUBLIC_ prefix for public env and clearly document how to run Mastra server locally to test
- Ensure the agent used in examples exists or include a helper script that registers a stored agent via Mastra REST API

## Follow-up Actions

- [ ] Create PoC files and open PR
- [ ] Add unit & Playwright E2E tests
- [ ] Add docs/examples/README describing local setup and security guidance
- [ ] Security review (validate no secrets, validate Zod schemas, ensure we avoid executing arbitrary JS)
- [ ] Get review from frontend and integrations owners

## Status History

| Date       | Status         | Notes                                   |
| ---------- | -------------- | ---------------------------------------- |
| 2026-01-10 | 🔴 Not Started | Spike created and scoped                 |


---

_Last updated: 2026-01-10 by ssdsk_
