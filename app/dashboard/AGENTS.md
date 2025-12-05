# Dashboard AGENTS.md

## Overview

The Dashboard (`app/dashboard/`) is a comprehensive admin interface that uses **MastraClient** to interact with the Mastra server for observability, management, and data access. It complements the AI SDK-based streaming pages (chat, workflows, networks) by providing REST-based data retrieval and management capabilities.

## Architecture

```
app/dashboard/
├── layout.tsx           # Sidebar navigation layout
├── page.tsx             # Overview dashboard with metrics
├── agents/page.tsx      # Agent management
├── workflows/page.tsx   # Workflow management & execution
├── tools/page.tsx       # Tool execution & details
├── vectors/page.tsx     # Vector index management
├── memory/page.tsx      # Thread & working memory management
├── observability/page.tsx # Traces, spans, scoring
├── logs/page.tsx        # System & run logs
└── telemetry/page.tsx   # Metrics & analytics
```

## Key Files

### lib/hooks/use-mastra.ts

Custom React hooks wrapping MastraClient for data fetching:

| Hook | Purpose |
|------|---------|
| `useAgents()` | List all agents |
| `useAgent(id)` | Get agent details |
| `useAgentEvals(id)` | Get CI/live evaluations |
| `useWorkflows()` | List all workflows |
| `useWorkflow(id)` | Get workflow details |
| `useTools()` | List all tools |
| `useTool(id)` | Get tool details |
| `useVectorIndexes(name)` | List vector indexes |
| `useVectorDetails(name, index)` | Get index details |
| `useMemoryThreads(resourceId, agentId)` | List memory threads |
| `useMemoryThread(threadId, agentId)` | Get thread messages |
| `useWorkingMemory(agentId, threadId, resourceId)` | Get working memory |
| `useAITraces(params)` | List AI traces with filtering |
| `useAITrace(traceId)` | Get complete trace |
| `useLogs(transportId)` | Get system logs |
| `useRunLogs(runId, transportId)` | Get run-specific logs |
| `useTelemetry(params)` | Get telemetry data |

### Action Hooks

| Hook | Purpose |
|------|---------|
| `useExecuteTool()` | Execute a tool with args |
| `useCreateMemoryThread()` | Create new thread |
| `useUpdateWorkingMemory()` | Update working memory |
| `useVectorQuery()` | Query vectors |
| `useScoreTraces()` | Score traces |

## Features by Page

### Dashboard Home (`/dashboard`)
- Stats overview (agents, workflows, tools, traces)
- Recent agents list
- Recent workflows list
- Recent traces
- Quick links to all sections

### Agents (`/dashboard/agents`)
- List/search agents
- View agent details (instructions, config)
- View agent tools
- View CI/live evaluations
- Link to chat with agent

### Workflows (`/dashboard/workflows`)
- List/search workflows
- View workflow details & steps
- Run workflows with custom input
- View input schema

### Tools (`/dashboard/tools`)
- List/search tools
- View tool details
- View input/output schemas
- Execute tools with custom args

### Vectors (`/dashboard/vectors`)
- List vector indexes
- Create new indexes (name, dimension, metric)
- View index details
- Query vectors with filters
- Delete indexes

### Memory (`/dashboard/memory`)
- List memory threads by resource/agent
- Create new threads
- View thread messages
- View/edit working memory
- Delete threads

### Observability (`/dashboard/observability`)
- List AI traces with pagination
- Filter by name, span type, entity type
- View complete trace with all spans
- Score traces with registered scorers
- View trace attributes

### Logs (`/dashboard/logs`)
- List system logs
- Filter by transport, level
- Search logs
- View run-specific logs
- Expandable log entries

### Telemetry (`/dashboard/telemetry`)
- View telemetry data
- Filter by name, scope
- Aggregate stats (duration, success rate)
- Expandable telemetry entries

## Usage Pattern

The dashboard separates concerns:

1. **AI SDK** (`@ai-sdk/react`) - Used for real-time streaming in `/chat`, `/workflows`, `/networks`
2. **MastraClient** (`@mastra/client-js`) - Used for REST-based data access in `/dashboard/*`

This allows:
- Real-time interactions via AI SDK's optimized streaming
- Data management and monitoring via MastraClient's comprehensive API
- Clean separation between "do work" and "view results" interfaces

## Environment Variables

```env
NEXT_PUBLIC_MASTRA_API_URL=http://localhost:4111
```

## MastraClient Configuration

```typescript
import { MastraClient } from "@mastra/client-js"

export const mastraClient = new MastraClient({
  baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || "http://localhost:4111",
  retries: 3,
  backoffMs: 300,
  maxBackoffMs: 5000,
})
```

---
Last updated: 2025-12-05
