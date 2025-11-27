# PRD: Mastra Client SDK Integration

## Problem Statement

The project has a fully configured Mastra backend with 22+ agents, 30+ tools, 10 workflows, and 4 networks, but the Next.js 16 frontend is incomplete:
- `app/layout.tsx` is empty (no HTML structure or providers)
- `app/page.tsx` is empty (no landing page)
- No `@mastra/client-js` SDK for client-side agent interactions
- Server actions exist (`app/test/action.ts`) but client SDK pattern is missing
- AI Elements UI components (30) are installed but not wired to agents

## Goals

1. **Complete Next.js + Mastra Integration** - Wire frontend to Mastra backend using both server actions and client SDK patterns
2. **Create Mastra Client Instance** - Set up `lib/mastra-client.ts` for client-side agent interactions
3. **Fix Core App Structure** - Implement `layout.tsx` and `page.tsx` with proper providers
4. **Enable Dual-Mode Interaction** - Support both server actions (SSR) and client SDK (CSR) patterns
5. **Document Setup Requirements** - Ensure `.env` configuration is clear

## Success Criteria

| Criteria | Metric |
|----------|--------|
| App loads without errors | `npm run dev` starts Next.js successfully |
| Server action works | `/test` page calls agent via server action |
| Client SDK works | New page calls agent via `@mastra/client-js` |
| Mastra dev server runs | `mastra dev` exposes agents at `:4111` |
| Layout renders | Root layout with providers and dark mode |
| Homepage renders | Landing page with agent catalog overview |

## User Stories

### US-1: Developer Setup
As a developer, I want a working Next.js + Mastra setup so I can build AI-powered features.

**Acceptance Criteria:**
- `npm install` installs all dependencies including `@mastra/client-js`
- `npm run dev` starts Next.js at `:3000`
- `npm run dev:mastra` starts Mastra at `:4111` (if not using embedded)
- Environment variables are documented

### US-2: Server-Side Agent Calls
As a developer, I want to call agents from server actions so I can leverage SSR.

**Acceptance Criteria:**
- Import `mastra` from `src/mastra`
- Call `mastra.getAgent("weatherAgent").generate(...)` in server action
- Response streams to client

### US-3: Client-Side Agent Calls
As a developer, I want to call agents from client components using the Mastra Client SDK.

**Acceptance Criteria:**
- `MastraClient` configured with `baseUrl`
- Can call `agent.generate()` and `agent.stream()` from client
- Supports client tools pattern

### US-4: Agent Chat UI
As a user, I want to interact with agents through a chat interface.

**Acceptance Criteria:**
- Uses AI Elements components (`message`, `conversation`, `prompt-input`)
- Displays agent responses with reasoning visualization
- Supports streaming responses

## Out of Scope (v1)

- Full chat application with conversation history
- Memory/thread persistence in UI
- Multi-agent network UI
- Production deployment configuration

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `@mastra/client-js` | latest | Client SDK for agent interactions |
| `@mastra/core` | ^0.24.6 | Core Mastra framework |
| `next` | ^16.0.5 | React framework |
| `react` | ^19.2.0 | UI library |
| `next-themes` | ^0.4.6 | Dark mode support |

## References

- [Mastra Next.js Integration](https://mastra.ai/docs/frameworks/web-frameworks/next-js)
- [Mastra Client SDK Reference](https://mastra.ai/reference/client-js/mastra-client)
- [Mastra Agents API](https://mastra.ai/reference/client-js/agents)
