<!-- AGENTS-META {"title":"API Routes","version":"1.0.0","applies_to":"app/api/","last_updated":"2026-02-21T00:00:00Z","status":"stable"} -->

# API Routes

This directory contains all Next.js App Router API endpoints for the Mastra application.

## Route Overview

### Core Chat/AI Routes

| Route             | Method | Purpose                                                         |
| ----------------- | ------ | --------------------------------------------------------------- |
| `/api/chat`       | POST   | Main chat endpoint using Mastra agents with streaming responses |
| `/api/chat-extra` | POST   | Alternative chat endpoint with RequestContext support           |
| `/api/completion` | POST   | Simple completion endpoint (weatherAgent)                       |
| `/api/audio`      | POST   | Audio transcription using noteTakerAgent voice.listen()         |
| `/api/v0`         | POST   | v0 SDK integration for code generation                          |

### Contact/Public Routes

| Route          | Method | Purpose                         |
| -------------- | ------ | ------------------------------- |
| `/api/contact` | POST   | Contact form submission handler |

### Mastra Proxy Routes

All routes under `/api/mastra/*` proxy requests to the Mastra server via `MastraClient` from `@mastra/client-js`.

**Configuration:**

```typescript
const mastraClient = new MastraClient({
    baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111',
})
```

#### Agents

| Route                          | Method | Purpose                                                              |
| ------------------------------ | ------ | -------------------------------------------------------------------- |
| `/api/mastra/agents`           | GET    | List all available agents with id, name, description, modelId, tools |
| `/api/mastra/agents/[agentId]` | GET    | Get single agent details                                             |

#### Workflows

| Route                                    | Method | Purpose                      |
| ---------------------------------------- | ------ | ---------------------------- |
| `/api/mastra/workflows`                  | GET    | List all available workflows |
| `/api/mastra/workflows/[workflowId]`     | GET    | Get workflow details         |
| `/api/mastra/workflows/[workflowId]/run` | POST   | Execute a workflow           |

#### Threads (Memory)

| Route                                     | Method             | Purpose                                             |
| ----------------------------------------- | ------------------ | --------------------------------------------------- |
| `/api/mastra/threads`                     | GET, POST          | List threads (with pagination) or create new thread |
| `/api/mastra/threads/[threadId]`          | GET, PATCH, DELETE | Get/update/delete a specific thread                 |
| `/api/mastra/threads/[threadId]/messages` | GET, POST          | Get or add messages to a thread                     |
| `/api/mastra/threads/[threadId]/clone`    | POST               | Clone an existing thread                            |

#### Memory

| Route                               | Method    | Purpose                    |
| ----------------------------------- | --------- | -------------------------- |
| `/api/mastra/memory/status`         | GET       | Check memory system status |
| `/api/mastra/memory/working-memory` | GET, POST | Access working memory      |

#### Tools

| Route                        | Method | Purpose                  |
| ---------------------------- | ------ | ------------------------ |
| `/api/mastra/tools`          | GET    | List all available tools |
| `/api/mastra/tools/[toolId]` | GET    | Get tool details         |

#### Vectors

| Route                                    | Method      | Purpose                             |
| ---------------------------------------- | ----------- | ----------------------------------- |
| `/api/mastra/vectors`                    | GET, POST   | List vector indexes or create index |
| `/api/mastra/vectors/[vectorName]`       | GET, DELETE | Get or delete specific vector store |
| `/api/mastra/vectors/[vectorName]/query` | POST        | Query vector store                  |

#### Observability

| Route                              | Method | Purpose                                   |
| ---------------------------------- | ------ | ----------------------------------------- |
| `/api/mastra/traces`               | GET    | List traces with pagination               |
| `/api/mastra/traces/[traceId]`     | GET    | Get specific trace details                |
| `/api/mastra/logs`                 | GET    | List logs (supports `?action=transports`) |
| `/api/mastra/logs/[runId]`         | GET    | Get logs for specific run                 |
| `/api/mastra/observability/scores` | GET    | Get observability scores                  |

## Key Implementations

### Chat Route (`/api/chat/route.ts`)

The main chat endpoint with full multi-tenancy support:

```typescript
// Agent selection from request body
const agentId = data?.agentId ?? id ?? 'weatherAgent'

// Multi-tenancy isolation via RequestContext
const requestContext = new RequestContext()
if (resourceId) requestContext.set(MASTRA_RESOURCE_ID_KEY, resourceId)
if (threadId) requestContext.set(MASTRA_THREAD_ID_KEY, threadId)

// Stream with reasoning and sources
const aiStream = toAISdkStream(stream, {
    from: 'agent',
    sendReasoning: true,
    sendSources: true,
})
```

**Request Body:**

```typescript
{
    messages: Message[],
    data?: {
        agentId?: string,
        threadId?: string,
        resourceId?: string,
        memory?: boolean
    },
    id?: string // fallback agentId
}
```

### Audio Route (`/api/audio/route.ts`)

Transcribes audio using the noteTakerAgent:

```typescript
const noteTakerAgent = mastra.getAgent('noteTakerAgent')
const text = await noteTakerAgent.voice?.listen(readable)
```

**Request:** `FormData` with `audio` file field
**Response:** `{ text: string }`

### Contact Route (`/api/contact/route.ts`)

Validates and processes contact form submissions:

```typescript
interface ContactFormData {
    firstName: string
    lastName: string
    email: string
    company?: string
    inquiryType?: string
    subject: string
    message: string
}
```

## File Structure

```
app/api/
├── route.ts files at each level
├── audio/
│   └── route.ts           # Audio transcription
├── chat/
│   └── route.ts           # Main chat endpoint
├── chat-extra/
│   └── route.ts           # Alternative chat
├── completion/
│   └── route.ts           # Simple completion
├── contact/
│   └── route.ts           # Contact form
├── v0/
│   └── route.ts           # v0 SDK integration
└── mastra/
    ├── agents/
    │   ├── route.ts
    │   └── [agentId]/
    │       └── route.ts
    ├── workflows/
    │   ├── route.ts
    │   └── [workflowId]/
    │       ├── route.ts
    │       └── run/
    │           └── route.ts
    ├── threads/
    │   ├── route.ts
    │   └── [threadId]/
    │       ├── route.ts
    │       ├── messages/
    │       │   └── route.ts
    │       └── clone/
    │           └── route.ts
    ├── memory/
    │   ├── status/
    │   │   └── route.ts
    │   └── working-memory/
    │       └── route.ts
    ├── tools/
    │   ├── route.ts
    │   └── [toolId]/
    │       └── route.ts
    ├── vectors/
    │   ├── route.ts
    │   └── [vectorName]/
    │       ├── route.ts
    │       └── query/
    │           └── route.ts
    ├── traces/
    │   ├── route.ts
    │   └── [traceId]/
    │       └── route.ts
    ├── logs/
    │   ├── route.ts
    │   └── [runId]/
    │       └── route.ts
    └── observability/
        └── scores/
            └── route.ts
```

## Dependencies

- `@mastra/client-js` - MastraClient for proxying to Mastra server
- `@mastra/core/request-context` - RequestContext for multi-tenancy
- `@mastra/ai-sdk` - toAISdkStream for stream conversion
- `ai` (Vercel AI SDK) - createUIMessageStream, createUIMessageStreamResponse
- `v0-sdk` - v0 code generation API

## Environment Variables

- `NEXT_PUBLIC_MASTRA_API_URL` - Mastra server URL (default: `http://localhost:4111`)

## Testing

Run API-specific tests:

```bash
npx vitest -t "api"
```

---

Last updated: 2026-02-21
