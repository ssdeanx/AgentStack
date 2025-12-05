# Tasks: Mastra Admin Dashboard v2

## Phase 1: Foundation & Infrastructure

### DASH-001: Install TanStack Query
**Description:** Add React Query for data fetching and caching.

**Acceptance Criteria:**

- GIVEN the project dependencies
- WHEN I run `npm install`
- THEN `@tanstack/react-query` and `@tanstack/react-query-devtools` are installed

**Files:** `package.json`

**Commands:**

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

**Effort:** S

**Dependencies:** None

---

### DASH-002: Create TypeScript Types
**Description:** Define Zod schemas and TypeScript types for MastraClient responses.

**Acceptance Criteria:**

- GIVEN the MastraClient API responses
- WHEN I import types from `lib/types/mastra-api.ts`
- THEN all API response shapes are properly typed
- AND Zod schemas can validate responses

**Files:**

- `lib/types/mastra-api.ts` (new)

**Effort:** M

**Dependencies:** None

---

### DASH-003: Create Query Client Provider
**Description:** Set up React Query provider with default options.

**Acceptance Criteria:**

- GIVEN the dashboard layout
- WHEN React Query provider wraps children
- THEN queries have default stale time (30s)
- AND retries are configured (3 with exponential backoff)
- AND devtools are available in development

**Files:**

- `app/dashboard/providers.tsx` (new)
- `app/dashboard/layout.tsx` (update)

**Effort:** S

**Dependencies:** DASH-001

---

### DASH-004: Create React Query Hooks
**Description:** Convert existing `use-mastra.ts` hooks to React Query.

**Acceptance Criteria:**

- GIVEN the existing custom hooks
- WHEN I use `useAgentsQuery()` instead of `useAgents()`
- THEN data is cached and deduplicated
- AND loading/error states are handled
- AND refetch functions are available

**Files:**

- `lib/hooks/use-dashboard-queries.ts` (new)

**Effort:** L

**Dependencies:** DASH-002, DASH-003

---

## Phase 2: Shared Components

### DASH-005: Extract Sidebar Component
**Description:** Extract sidebar navigation from layout into reusable component.

**Acceptance Criteria:**

- GIVEN the dashboard layout
- WHEN I import `<Sidebar />`
- THEN it renders the navigation with collapse state
- AND active route is highlighted
- AND links use Next.js 16 patterns

**Files:**

- `app/dashboard/_components/sidebar.tsx` (new)
- `app/dashboard/layout.tsx` (update)

**Effort:** M

**Dependencies:** None

---

### DASH-006: Create Error Fallback Components
**Description:** Create reusable error boundary fallback UI.

**Acceptance Criteria:**

- GIVEN an error in a component
- WHEN the error boundary catches it
- THEN a user-friendly error message is shown
- AND a retry button is available
- AND the error is logged to console

**Files:**

- `app/dashboard/_components/error-fallback.tsx` (new)
- `app/dashboard/error.tsx` (new)

**Effort:** S

**Dependencies:** None

---

### DASH-007: Create Loading Components
**Description:** Create page-level and component-level loading skeletons.

**Acceptance Criteria:**

- GIVEN a loading state
- WHEN data is being fetched
- THEN appropriate skeleton UI is shown
- AND layout matches the expected content

**Files:**

- `app/dashboard/loading.tsx` (new)
- `app/dashboard/_components/loading-skeleton.tsx` (new)
- `app/dashboard/agents/loading.tsx` (new)
- (similar for other routes)

**Effort:** M

**Dependencies:** None

---

### DASH-008: Create Empty State Component
**Description:** Create reusable empty state display.

**Acceptance Criteria:**

- GIVEN no data available
- WHEN a list is empty
- THEN a friendly empty state is shown
- AND optional action button is available

**Files:**

- `app/dashboard/_components/empty-state.tsx` (new)

**Effort:** S

**Dependencies:** None

---

### DASH-009: Create Data Table Component
**Description:** Create generic data table with sorting/filtering.

**Acceptance Criteria:**

- GIVEN a list of items
- WHEN I use `<DataTable columns={[...]} data={[...]} />`
- THEN items are displayed in a table
- AND columns can be sorted
- AND search/filter is available

**Files:**

- `app/dashboard/_components/data-table.tsx` (new)

**Effort:** L

**Dependencies:** None

---

### DASH-010: Create Detail Panel Component
**Description:** Create reusable side panel for detail views.

**Acceptance Criteria:**

- GIVEN a selected item
- WHEN I use `<DetailPanel open={true} title="..." />`
- THEN a slide-out panel appears
- AND can be closed via button or escape key

**Files:**

- `app/dashboard/_components/detail-panel.tsx` (new)

**Effort:** M

**Dependencies:** None

---

## Phase 3: Feature Components - Agents

### DASH-011: Extract Agent List Component
**Description:** Extract agent list from page into component.

**Acceptance Criteria:**

- GIVEN the agents page
- WHEN I use `<AgentList onSelect={...} />`
- THEN agents are listed with search
- AND uses React Query for data
- AND selection callback is invoked

**Files:**

- `app/dashboard/agents/_components/agent-list.tsx` (new)
- `app/dashboard/agents/_components/agent-list-item.tsx` (new)

**Effort:** M

**Dependencies:** DASH-004, DASH-009

---

### DASH-012: Extract Agent Details Component
**Description:** Extract agent details panel into component.

**Acceptance Criteria:**

- GIVEN a selected agent ID
- WHEN I use `<AgentDetails agentId="..." />`
- THEN agent details are displayed
- AND tabs for details/tools/evals work
- AND uses React Query for data

**Files:**

- `app/dashboard/agents/_components/agent-details.tsx` (new)
- `app/dashboard/agents/_components/agent-tools-tab.tsx` (new)
- `app/dashboard/agents/_components/agent-evals-tab.tsx` (new)

**Effort:** L

**Dependencies:** DASH-004, DASH-010

---

### DASH-013: Refactor Agents Page
**Description:** Update agents page to use new components.

**Acceptance Criteria:**

- GIVEN the agents page
- WHEN I navigate to `/dashboard/agents`
- THEN it renders `<AgentList />` and `<AgentDetails />`
- AND page is a thin wrapper
- AND loading/error states are handled

**Files:**

- `app/dashboard/agents/page.tsx` (update)

**Effort:** S

**Dependencies:** DASH-011, DASH-012

---

## Phase 4: Feature Components - Workflows

### DASH-014: Extract Workflow Components
**Description:** Extract workflow list and details components.

**Acceptance Criteria:**

- GIVEN the workflows page
- WHEN components are extracted
- THEN `<WorkflowList />` and `<WorkflowDetails />` work independently
- AND workflow execution modal works

**Files:**

- `app/dashboard/workflows/_components/workflow-list.tsx` (new)
- `app/dashboard/workflows/_components/workflow-details.tsx` (new)
- `app/dashboard/workflows/_components/workflow-runner.tsx` (new)

**Effort:** L

**Dependencies:** DASH-004

---

### DASH-015: Refactor Workflows Page
**Description:** Update workflows page to use new components.

**Files:**

- `app/dashboard/workflows/page.tsx` (update)

**Effort:** S

**Dependencies:** DASH-014

---

## Phase 5: Feature Components - Tools

### DASH-016: Extract Tool Components
**Description:** Extract tool list, details, and executor components.

**Acceptance Criteria:**

- GIVEN the tools page
- WHEN components are extracted
- THEN `<ToolList />`, `<ToolDetails />`, `<ToolExecutor />` work independently
- AND JSON validation works in executor

**Files:**

- `app/dashboard/tools/_components/tool-list.tsx` (new)
- `app/dashboard/tools/_components/tool-details.tsx` (new)
- `app/dashboard/tools/_components/tool-executor.tsx` (new)
- `app/dashboard/tools/_components/tool-schema-viewer.tsx` (new)

**Effort:** L

**Dependencies:** DASH-004

---

### DASH-017: Refactor Tools Page
**Description:** Update tools page to use new components.

**Files:**

- `app/dashboard/tools/page.tsx` (update)

**Effort:** S

**Dependencies:** DASH-016

---

## Phase 6: Feature Components - Observability

### DASH-018: Extract Trace Components
**Description:** Extract trace list, filters, and detail components.

**Acceptance Criteria:**

- GIVEN the observability page
- WHEN components are extracted
- THEN `<TraceList />`, `<TraceFilters />`, `<TraceDetails />` work
- AND span tree visualization works
- AND trace scoring works

**Files:**

- `app/dashboard/observability/_components/trace-list.tsx` (new)
- `app/dashboard/observability/_components/trace-filters.tsx` (new)
- `app/dashboard/observability/_components/trace-details.tsx` (new)
- `app/dashboard/observability/_components/span-tree.tsx` (new)
- `app/dashboard/observability/_components/trace-scorer.tsx` (new)

**Effort:** XL

**Dependencies:** DASH-004

---

### DASH-019: Refactor Observability Page
**Description:** Update observability page to use new components.

**Files:**

- `app/dashboard/observability/page.tsx` (update)

**Effort:** S

**Dependencies:** DASH-018

---

## Phase 7: Feature Components - Memory

### DASH-020: Extract Memory Components
**Description:** Extract thread list, message viewer, and working memory editor.

**Acceptance Criteria:**

- GIVEN the memory page
- WHEN components are extracted
- THEN `<ThreadList />`, `<MessageViewer />`, `<WorkingMemoryEditor />` work
- AND thread creation works
- AND working memory updates work

**Files:**

- `app/dashboard/memory/_components/thread-list.tsx` (new)
- `app/dashboard/memory/_components/thread-details.tsx` (new)
- `app/dashboard/memory/_components/message-list.tsx` (new)
- `app/dashboard/memory/_components/working-memory-editor.tsx` (new)

**Effort:** L

**Dependencies:** DASH-004

---

### DASH-021: Refactor Memory Page
**Description:** Update memory page to use new components.

**Files:**

- `app/dashboard/memory/page.tsx` (update)

**Effort:** S

**Dependencies:** DASH-020

---

## Phase 8: Feature Components - Vectors, Logs, Telemetry

### DASH-022: Extract Vectors Components
**Description:** Extract vector index management components.

**Files:**

- `app/dashboard/vectors/_components/index-list.tsx` (new)
- `app/dashboard/vectors/_components/index-details.tsx` (new)
- `app/dashboard/vectors/_components/vector-query-form.tsx` (new)
- `app/dashboard/vectors/_components/query-results.tsx` (new)

**Effort:** L

**Dependencies:** DASH-004

---

### DASH-023: Extract Logs Components
**Description:** Extract log viewing and filtering components.

**Files:**

- `app/dashboard/logs/_components/log-list.tsx` (new)
- `app/dashboard/logs/_components/log-filters.tsx` (new)
- `app/dashboard/logs/_components/log-entry.tsx` (new)

**Effort:** M

**Dependencies:** DASH-004

---

### DASH-024: Extract Telemetry Components
**Description:** Extract telemetry viewing components.

**Files:**

- `app/dashboard/telemetry/_components/telemetry-list.tsx` (new)
- `app/dashboard/telemetry/_components/telemetry-stats.tsx` (new)
- `app/dashboard/telemetry/_components/telemetry-entry.tsx` (new)

**Effort:** M

**Dependencies:** DASH-004

---

### DASH-025: Refactor Remaining Pages
**Description:** Update vectors, logs, telemetry pages to use new components.

**Files:**

- `app/dashboard/vectors/page.tsx` (update)
- `app/dashboard/logs/page.tsx` (update)
- `app/dashboard/telemetry/page.tsx` (update)

**Effort:** M

**Dependencies:** DASH-022, DASH-023, DASH-024

---

## Phase 9: Dashboard Home & Polish

### DASH-026: Refactor Dashboard Home
**Description:** Update dashboard home page with stats and quick links.

**Acceptance Criteria:**

- GIVEN the dashboard home
- WHEN I navigate to `/dashboard`
- THEN stats cards show correct counts
- AND recent items are displayed
- AND quick links work

**Files:**

- `app/dashboard/page.tsx` (update)
- `app/dashboard/_components/stat-card.tsx` (new)
- `app/dashboard/_components/recent-activity.tsx` (new)

**Effort:** M

**Dependencies:** DASH-004

---

### DASH-027: Add Loading States
**Description:** Add loading.tsx files to all dashboard routes.

**Files:**

- `app/dashboard/loading.tsx`
- `app/dashboard/agents/loading.tsx`
- `app/dashboard/workflows/loading.tsx`
- `app/dashboard/tools/loading.tsx`
- `app/dashboard/vectors/loading.tsx`
- `app/dashboard/memory/loading.tsx`
- `app/dashboard/observability/loading.tsx`
- `app/dashboard/logs/loading.tsx`
- `app/dashboard/telemetry/loading.tsx`

**Effort:** M

**Dependencies:** DASH-007

---

### DASH-028: Add Error Boundaries
**Description:** Add error.tsx files to all dashboard routes.

**Files:**

- `app/dashboard/agents/error.tsx`
- `app/dashboard/workflows/error.tsx`
- `app/dashboard/tools/error.tsx`
- `app/dashboard/vectors/error.tsx`
- `app/dashboard/memory/error.tsx`
- `app/dashboard/observability/error.tsx`
- `app/dashboard/logs/error.tsx`
- `app/dashboard/telemetry/error.tsx`

**Effort:** M

**Dependencies:** DASH-006

---

## Phase 10: Auth Preparation

### DASH-029: Create Auth Context Structure
**Description:** Create auth context and hooks for future authentication.

**Acceptance Criteria:**

- GIVEN the auth context
- WHEN auth is implemented later
- THEN the structure supports session management
- AND route protection middleware is prepared

**Files:**

- `lib/hooks/use-auth.ts` (new - placeholder)
- `app/dashboard/providers.tsx` (update)

**Effort:** M

**Dependencies:** None

---

### DASH-030: Add Protected Route Middleware
**Description:** Create middleware structure for route protection.

**Acceptance Criteria:**

- GIVEN the middleware
- WHEN auth is implemented
- THEN dashboard routes can be protected
- AND unauthorized users are redirected

**Files:**

- `middleware.ts` (update or new)

**Effort:** M

**Dependencies:** None

---

## Phase 11: Testing & Documentation

### DASH-031: Add Component Tests
**Description:** Add unit tests for shared components.

**Files:**

- `app/dashboard/_components/__tests__/*.test.tsx`

**Effort:** L

**Dependencies:** All component tasks

---

### DASH-032: Add Hook Tests
**Description:** Add unit tests for React Query hooks.

**Files:**

- `lib/hooks/__tests__/use-dashboard-queries.test.ts`

**Effort:** M

**Dependencies:** DASH-004

---

### DASH-033: Update Documentation
**Description:** Update AGENTS.md and README with dashboard v2 info.

**Files:**

- `app/dashboard/AGENTS.md` (update)
- `README.md` (update)

**Effort:** S

**Dependencies:** All tasks

---

## Task Summary

| ID | Title | Effort | Phase | Dependencies | Status |
|----|-------|--------|-------|--------------|--------|
| DASH-001 | Install TanStack Query | S | 1 | None | ⬜ |
| DASH-002 | Create TypeScript Types | M | 1 | None | ⬜ |
| DASH-003 | Create Query Client Provider | S | 1 | DASH-001 | ⬜ |
| DASH-004 | Create React Query Hooks | L | 1 | DASH-002,003 | ⬜ |
| DASH-005 | Extract Sidebar Component | M | 2 | None | ⬜ |
| DASH-006 | Create Error Fallback Components | S | 2 | None | ⬜ |
| DASH-007 | Create Loading Components | M | 2 | None | ⬜ |
| DASH-008 | Create Empty State Component | S | 2 | None | ⬜ |
| DASH-009 | Create Data Table Component | L | 2 | None | ⬜ |
| DASH-010 | Create Detail Panel Component | M | 2 | None | ⬜ |
| DASH-011 | Extract Agent List Component | M | 3 | DASH-004,009 | ⬜ |
| DASH-012 | Extract Agent Details Component | L | 3 | DASH-004,010 | ⬜ |
| DASH-013 | Refactor Agents Page | S | 3 | DASH-011,012 | ⬜ |
| DASH-014 | Extract Workflow Components | L | 4 | DASH-004 | ⬜ |
| DASH-015 | Refactor Workflows Page | S | 4 | DASH-014 | ⬜ |
| DASH-016 | Extract Tool Components | L | 5 | DASH-004 | ⬜ |
| DASH-017 | Refactor Tools Page | S | 5 | DASH-016 | ⬜ |
| DASH-018 | Extract Trace Components | XL | 6 | DASH-004 | ⬜ |
| DASH-019 | Refactor Observability Page | S | 6 | DASH-018 | ⬜ |
| DASH-020 | Extract Memory Components | L | 7 | DASH-004 | ⬜ |
| DASH-021 | Refactor Memory Page | S | 7 | DASH-020 | ⬜ |
| DASH-022 | Extract Vectors Components | L | 8 | DASH-004 | ⬜ |
| DASH-023 | Extract Logs Components | M | 8 | DASH-004 | ⬜ |
| DASH-024 | Extract Telemetry Components | M | 8 | DASH-004 | ⬜ |
| DASH-025 | Refactor Remaining Pages | M | 8 | DASH-022-024 | ⬜ |
| DASH-026 | Refactor Dashboard Home | M | 9 | DASH-004 | ⬜ |
| DASH-027 | Add Loading States | M | 9 | DASH-007 | ⬜ |
| DASH-028 | Add Error Boundaries | M | 9 | DASH-006 | ⬜ |
| DASH-029 | Create Auth Context Structure | M | 10 | None | ⬜ |
| DASH-030 | Add Protected Route Middleware | M | 10 | None | ⬜ |
| DASH-031 | Add Component Tests | L | 11 | All components | ⬜ |
| DASH-032 | Add Hook Tests | M | 11 | DASH-004 | ⬜ |
| DASH-033 | Update Documentation | S | 11 | All tasks | ⬜ |

**Legend:** S = Small (< 30 min), M = Medium (30-60 min), L = Large (> 1 hr), XL = Extra Large (> 2 hrs)

**Estimated Total:** ~20-25 hours

---

**Created:** Dec 5, 2025  
**Status:** Draft - Awaiting Approval
