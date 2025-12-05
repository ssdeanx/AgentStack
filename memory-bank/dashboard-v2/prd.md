# PRD: Mastra Admin Dashboard v2

## Summary

Refactor and complete the Mastra Admin Dashboard (`/dashboard`) with modular components, Next.js 16 compatibility, proper error handling, React Query integration, TypeScript improvements, and authentication preparation. The dashboard provides a comprehensive admin interface for managing agents, workflows, tools, vectors, memory, observability, logs, and telemetry using MastraClient.

## Problem Statement

The current dashboard (v1, 50% complete) has:

1. **Monolithic pages** - Each page is a single large component, making maintenance difficult
2. **Next.js 16 routing issues** - Some `Link` href patterns don't follow App Router best practices
3. **No error boundaries** - Errors crash entire pages instead of graceful degradation
4. **No data caching** - Every navigation refetches data unnecessarily
5. **Loose TypeScript types** - MastraClient responses typed as `any`
6. **No authentication** - Dashboard is publicly accessible
7. **Missing loading states** - Inconsistent skeleton/loading UX

## Goals

1. **Modular Architecture** - Extract reusable components from monolithic pages
2. **Next.js 16 Compliance** - Fix all routing and Link patterns
3. **Error Resilience** - Add error boundaries at page and component level
4. **Performance** - Implement React Query/TanStack Query for caching
5. **Type Safety** - Define proper TypeScript interfaces for all MastraClient responses
6. **Auth Preparation** - Add route protection structure (implementation in future phase)
7. **Polish** - Consistent loading states, empty states, and UX patterns

## User Stories

### US-1: Admin Views Dashboard Overview
**As an** admin  
**I want to** see a dashboard overview with key metrics  
**So that** I can quickly assess system health

**Acceptance Criteria:**

- GIVEN I navigate to `/dashboard`
- WHEN the page loads
- THEN I see stats cards for agents, workflows, tools, traces
- AND recent activity lists load with proper loading states
- AND errors show in error boundaries without crashing the page

### US-2: Admin Manages Agents
**As an** admin  
**I want to** view, search, and inspect agents  
**So that** I can monitor agent configurations and evaluations

**Acceptance Criteria:**

- GIVEN I navigate to `/dashboard/agents`
- WHEN I search for an agent
- THEN the list filters in real-time
- AND selecting an agent shows details in a side panel
- AND data is cached so re-selecting doesn't refetch

### US-3: Admin Executes Tools
**As an** admin  
**I want to** execute tools with custom arguments  
**So that** I can test tool functionality

**Acceptance Criteria:**

- GIVEN I select a tool in `/dashboard/tools`
- WHEN I enter JSON arguments and click Execute
- THEN the tool runs and shows results
- AND errors are displayed gracefully
- AND the form validates JSON before submission

### US-4: Admin Views Traces
**As an** admin  
**I want to** view and filter AI traces  
**So that** I can debug agent/workflow execution

**Acceptance Criteria:**

- GIVEN I navigate to `/dashboard/observability`
- WHEN I apply filters (name, type, date range)
- THEN traces are filtered and paginated
- AND selecting a trace shows the span tree
- AND I can score traces using registered scorers

### US-5: Admin Manages Memory
**As an** admin  
**I want to** view and manage memory threads  
**So that** I can inspect conversation history and working memory

**Acceptance Criteria:**

- GIVEN I navigate to `/dashboard/memory`
- WHEN I select a resource/agent combination
- THEN I see all threads for that combination
- AND I can view messages in a thread
- AND I can edit working memory content

## Non-Functional Requirements

### NFR-1: Performance
- Initial page load < 2s (LCP)
- Subsequent navigations < 500ms (cached)
- React Query stale time: 30s for lists, 60s for details

### NFR-2: Error Handling
- Component-level error boundaries for each section
- Page-level error boundaries for full page crashes
- Retry mechanism for failed API calls (3 retries with backoff)

### NFR-3: Type Safety
- No `any` types in production code
- All MastraClient responses properly typed
- Zod schemas for form validation

### NFR-4: Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation for all interactive elements
- Screen reader support for dynamic content

### NFR-5: Security (Preparation)
- Route protection middleware structure
- Session management hooks
- Auth state in React context

## Out of Scope (v2)

- Full authentication implementation (OAuth, credentials)
- Role-based access control (RBAC)
- Real-time WebSocket updates
- Dashboard customization/widgets
- Export/import functionality
- Mobile-optimized layouts

## Open Questions

- [ ] Which auth provider to use? (NextAuth.js vs Clerk vs custom)
- [ ] Should we add real-time trace streaming?
- [ ] Do we need dashboard state persistence (filters, selections)?

## Success Metrics

| Metric | Target |
|--------|--------|
| Page load time (LCP) | < 2s |
| TypeScript errors | 0 |
| Component test coverage | > 80% |
| Lighthouse accessibility | > 90 |

## Reference Documentation

### MastraClient API

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

### Next.js 16

- [App Router](https://nextjs.org/docs/app)
- [Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [Loading UI](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)

### React Query

- [TanStack Query](https://tanstack.com/query/latest)
- [Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)

---

**Created:** Dec 5, 2025  
**Status:** Draft - Awaiting Approval
