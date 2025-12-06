---
title: Dashboard - Technical Documentation
component_path: app/dashboard
version: 1.0
date_created: 2025-12-06
last_updated: 2025-12-06
owner: AgentStack Frontend Team
tags: [component, ui, dashboard, observability, admin]
---

# Dashboard Documentation (app/dashboard)

Summary: The Dashboard is the Mastra / AgentStack admin surface for monitoring and managing agents, tools, workflows, observability traces, and system health. The frontend dashboard is built with small composable UI primitives and a QueryClient provider for data-fetching and caching.

## 1. Component Overview

### Purpose / Responsibility

- Provide a centralized admin console: actionable metrics (Agents, Workflows, Tools, Traces), quick navigation, and overviews for Observability, Memory, Vectors, Tools, Logs, Telemetry and Workflows.
- Offer fast controls for refreshing data, navigating to detail pages, and starting casual workflows or agent interactions.

### Scope

- In scope: the UI pages and components within `app/dashboard` (layout, providers, `page.tsx`, `_components/*`, nested sub-pages such as agents/logs/observability/telemetry/vectors, and interactive primitives used by the dashboard).
- Out of scope: backend telemetry storage and agent implementations which live elsewhere in the repo (e.g., `src/mastra`).

### System relationships

- Integrates with: React Query (`QueryClient`) for data fetching (`lib/hooks/use-dashboard-queries`), AI Elements UI primitives, and Mastra backend endpoints for traces/agents/workflows.
- Uses `ui/` shared components (Card, Badge, Button, etc.) and AI Elements (`_components/*`) to render the dashboard.

## 2. Architecture

- Pattern: Page composition → Providers → Presentational subcomponents.
- Dashboard page (`page.tsx`) is the composition root: it reads data via hooks (agents, workflows, tools, traces) and renders presentational components in `_components` (StatCard, EmptyState, DataTable, DetailPanel, Sidebar, etc.).

Mermaid overview:

```mermaid
graph TD
  App[NextJS App] --> DashboardPage[app/dashboard/page.tsx]
  DashboardPage --> DashboardProviders[DashboardProviders/providers.tsx]
  DashboardProviders --> ReactQuery[React Query (QueryClient)]
  DashboardPage --> Header[StatGrid / Cards]
  DashboardPage --> Content[Cards: Agents, Workflows, Traces]
  Content --> Subcomponents[_components/*: StatCard, DataTable, Sidebar, DetailPanel]
  DataFetch --> Hooks[lib/hooks/use-dashboard-queries]
  Hooks --> MastraAPI[Mastra Backend]
```

## 3. Interface Documentation

Key public hooks & components:

- useAgentsQuery(), useWorkflowsQuery(), useToolsQuery(), useTracesQuery() — typed query hooks that return { data, isLoading } from `lib/hooks/use-dashboard-queries`.
- `DashboardProviders` — wraps the dashboard with a React Query Client (query caching, retry/backoff) and optional DevTools.
- `StatCard` — small presentational card used by `page.tsx` to display metric title, value, icon, trends, and link.
- `_components/Sidebar` — primary navigation component for dashboard routes, supports collapsed state and tooltips.

Public props examples:

| Component | Important props | Returns / Behavior |
|---|---:|---|
| DashboardProviders | children: ReactNode | Provides QueryClient for dashboard routes. |
| StatCard | title, value, loading, icon, href, description | Presentational card with optional link and trend badge. |
| DataTable | columns, data, pagination | Renders rows with column definitions; typed Column exported from index. |
| DetailPanel | item, children | Right-hand detail panel (used by list/detail pages). |

## 4. Implementation Details

### Data fetching & caching

- `DashboardProviders` constructs a `QueryClient` with defaultOptions optimized for dashboard UX (staleTime 30s, gcTime 5m, retry policy). This keeps dashboard queries responsive while limiting network noise.

### Page composition

- `page.tsx` orchestrates queries, uses `useQueryClient().invalidateQueries()` to refresh all caches, and renders a grid of stat cards followed by cards for lists (agents, workflows) and traces. It uses `_components/*` for presentational blocks.

### UI primitives

- Cards and list components are intentionally small and composable: `StatCard` for metric tiles, `EmptyState` for fallback UI, `DataTable` for tabular data and `DetailPanel` for drill-ins.

### Sidebar

- The `Sidebar` component provides navigation links for dashboard sub-pages. It supports a collapsed mode (accessible icons-only) and uses tooltips when collapsed.

## 5. Usage Examples

### Wrap dashboard routes with providers

```tsx
// app/dashboard/layout.tsx
import { DashboardProviders } from './providers'

export default function DashboardLayout({children}){
  return (
    <DashboardProviders>
      {children}
    </DashboardProviders>
  )
}
```

### Rendering a stat card

```tsx
<StatCard title="Agents" value={agents.length} loading={agentsLoading} icon={Bot} href="/dashboard/agents" />
```

## 6. Quality Attributes

- Security: Dashboard is a privileged admin surface. Ensure server-side authorization for all endpoints, and validate the user's roles and permissions before showing control actions.
- Performance: React Query tunes staleTime & retry policy; expensive tables should use virtualization for very large datasets.
- Reliability: UI gracefully handles empty loading/failure states using `Skeleton` and `EmptyState` components.
- Maintainability: Small composable components and shared hooks make the dashboard easy to extend.

## 7. Testing & Observability

- Unit tests (Vitest):
  - `page.tsx` render behavior for loading / empty / populated states.
  - `StatCard`, `DataTable`, `DetailPanel`, `Sidebar` component behaviors.
  - `DashboardProviders` instantiation and default QueryClient options.

- Integration tests: Mock `use-dashboard-queries` hooks and simulate network failure/success states to validate UI fallbacks.

- Observability: dashboard integrates with Arize/Phoenix for traces; track query latencies and consecutive failures.

## 8. Next Actions / Recommendations

- Small: Add unit tests for `StatCard` and `Sidebar` interactions (collapsed state and tooltips).
- Medium: Add integration tests for the main dashboard page simulating streaming traces and verify refresh behavior.
- High: Add virtualization for DataTable to handle very large result sets and include role-based tests for admin features.

## 9. References

- Files: `app/dashboard/page.tsx`, `app/dashboard/providers.tsx`, `app/dashboard/_components/*`.
- Data hooks: `lib/hooks/use-dashboard-queries.ts`.

## Change history

- 2025-12-06 — v1.0 — created by documentation agent
