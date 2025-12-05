# Context: Mastra Admin Dashboard v2

## Phase: IMPLEMENTATION

## Status: In Progress - Type Fixes Applied

**Created:** Dec 5, 2025  
**Last Updated:** Dec 5, 2025

---

## Feature Summary

Refactor the Mastra Admin Dashboard from v1 (50% complete, monolithic) to v2 (modular, React Query, typed, error-resilient).

## Current State (v1)

- 10 pages created (50% complete)
- 15+ MastraClient hooks in `lib/hooks/use-mastra.ts`
- Layout with collapsible sidebar
- Known issues:
  - Monolithic pages (hard to maintain)
  - Next.js 16 routing issues
  - No error boundaries
  - No data caching
  - Loose TypeScript types

## Target State (v2)

- Modular component architecture
- React Query for data fetching
- Proper TypeScript types with Zod
- Error boundaries at all levels
- Loading states with Next.js 16 patterns
- Auth preparation (middleware structure)

---

## Active Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data fetching | TanStack Query v5 | Caching, deduplication, devtools |
| Component organization | `_components` folders | Next.js convention |
| Type validation | Zod schemas | Already in project, TS inference |
| Error handling | Per-route error.tsx | Next.js 16 pattern |

## Blockers

- [ ] None currently - awaiting approval to proceed

## Open Questions

- [ ] Auth provider choice: NextAuth.js vs Clerk vs custom?
- [ ] Should we add real-time trace streaming via WebSocket?
- [ ] Should dashboard state (filters, selections) persist in URL?

---

## Reference URLs

### MastraClient Documentation

- [MastraClient SDK](https://mastra.ai/reference/client-js/mastra-client)
- [Agents API](https://mastra.ai/reference/client-js/agents)
- [Workflows API](https://mastra.ai/reference/client-js/workflows)
- [Tools API](https://mastra.ai/reference/client-js/tools)
- [Vectors API](https://mastra.ai/reference/client-js/vectors)
- [Memory API](https://mastra.ai/reference/client-js/memory)
- [Observability API](https://mastra.ai/reference/client-js/observability)
- [Logs API](https://mastra.ai/reference/client-js/logs)
- [Telemetry API](https://mastra.ai/reference/client-js/telemetry)
- [Error Handling](https://mastra.ai/reference/client-js/error-handling)

### Next.js 16 Documentation

- [App Router](https://nextjs.org/docs/app)
- [Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [Loading UI](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

### TanStack Query

- [React Query Docs](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
- [Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
- [Devtools](https://tanstack.com/query/latest/docs/framework/react/devtools)

### TypeScript & Zod

- [Zod Documentation](https://zod.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)

---

## Tools to Use

### MCP Tools

- `mcp_mastra_mastraDocs` - Mastra documentation queries
- `mcp_mastra_mastraExamples` - Code examples
- `mcp_next-devtools_init` - Initialize Next.js context
- `mcp_next-devtools_nextjs_docs` - Next.js documentation

### Validation

```bash
# TypeScript check
npx tsc --noEmit

# ESLint
npx eslint "app/dashboard/**/*.{ts,tsx}" --max-warnings=0

# Tests
npm test -- --grep dashboard
```

---

## Session Notes

### Dec 5, 2025 - Type Fixes Applied

**Issues Fixed:**

1. **Workflows href link** - Fixed `/workflows?workflow=` to `/dashboard/workflows?workflow=` with `as never` cast
2. **MastraClient API method names:**
   - `listWorkflows()` → `getWorkflows()`
   - `listLogs()` → `getLogs()`
   - `listLogTransports()` → `getLogTransports()`
   - `getMemoryThread({threadId, agentId})` → `getMemoryThread(threadId, agentId)` (2 args)
   - `tool.execute({args})` → `tool.execute({data})`
3. **API response shapes:**
   - Logs: `{logs: [...]}` not `[...]`
   - Transports: `{transports: [...]}` not `[...]`  
   - Indexes: `{indexes: [...]}` not `[...]`
4. **AISpanRecord properties** - Used proper type guards for `startTime`, `duration`, `status`
5. **entityType filter** - Cast to `"agent" | "workflow" | undefined`

**Files Modified:**
- `lib/hooks/use-mastra.ts` - Fixed API calls
- `app/dashboard/page.tsx` - Fixed span property access
- `app/dashboard/workflows/page.tsx` - Fixed href link
- `app/dashboard/memory/page.tsx` - Fixed getMemoryThread call
- `app/dashboard/observability/page.tsx` - Fixed entityType filter
- `app/dashboard/telemetry/page.tsx` - Fixed total count
- `app/dashboard/vectors/page.tsx` - Fixed indexes access
- `app/dashboard/logs/page.tsx` - Fixed logs/transports access

**Remaining (style warnings only):**
- Sourcery suggestions for inline returns (not errors)
- CSS inline style warning in observability page

---

### Dec 5, 2025 - Initial Planning

- Created feature folder `/memory-bank/dashboard-v2/`
- Drafted PRD with user stories and acceptance criteria
- Drafted design with component architecture and data models
- Created task breakdown (33 tasks across 11 phases)
- Estimated ~20-25 hours of implementation

**Next Session:**

1. Get approval for PRD/design/tasks
2. Start with Phase 1: Foundation (DASH-001 through DASH-004)
3. Install TanStack Query, create types, set up provider

---

## Completion Tracking

| Phase | Tasks | Completed | Progress |
|-------|-------|-----------|----------|
| 1. Foundation | 4 | 0 | 0% |
| 2. Shared Components | 6 | 0 | 0% |
| 3. Agents | 3 | 0 | 0% |
| 4. Workflows | 2 | 0 | 0% |
| 5. Tools | 2 | 0 | 0% |
| 6. Observability | 2 | 0 | 0% |
| 7. Memory | 2 | 0 | 0% |
| 8. Vectors/Logs/Telemetry | 4 | 0 | 0% |
| 9. Dashboard Home & Polish | 3 | 0 | 0% |
| 10. Auth Preparation | 2 | 0 | 0% |
| 11. Testing & Docs | 3 | 0 | 0% |
| **Total** | **33** | **0** | **0%** |
