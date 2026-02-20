<!-- AGENTS-META {"title":"Next.js API Routes","version":"1.0.0","applies_to":"app/api/","last_updated":"2026-02-16T00:00:00Z","status":"stable"} -->

# Next.js API Routes

## Purpose

This folder contains **Next.js 16 App Router API routes** for the AgentStack application. These routes serve as HTTP endpoints that bridge the frontend with the Mastra agent system, enabling streaming AI responses, contact form handling, and third-party integrations.

## Structure

```bash
app/api/
├── chat/
│   └── route.ts          # Primary chat endpoint (dynamic agent selection)
├── chat-extra/
│   └── route.ts          # Simplified chat endpoint (weather agent)
├── completion/
│   └── route.ts          # Simple completion endpoint
├── contact/
│   └── route.ts          # Contact form submission handler
└── v0/
    └── route.ts          # v0.dev SDK integration
```

## Tech Stack

- **Next.js 16**: App Router API routes with streaming support
- **Mastra Core**: Agent execution with `@mastra/core`
- **AI SDK**: `ai` package for UI message streaming
- **Zod**: Input validation (contact route)
- **v0-sdk**: Integration with v0.dev

## API Routes Overview

| Route         | Method | Purpose                 | Streaming | Agent             |
| ------------- | ------ | ----------------------- | --------- | ----------------- |
| `/chat`       | POST   | Multi-agent chat        | ✅        | Dynamic selection |
| `/chat-extra` | POST   | Weather agent chat      | ✅        | weatherAgent      |
| `/completion` | POST   | Simple completion       | ✅        | weatherAgent      |
| `/contact`    | POST   | Contact form submission | ❌        | None              |
| `/v0`         | POST   | v0.dev code generation  | ❌        | v0-1.5-sm         |

## Streaming Patterns

### Pattern 1: Manual Stream Conversion (Primary)

Used in `/api/chat/route.ts` for full control over streaming:

```typescript
import { mastra } from '../../../src/mastra'
import { RequestContext } from '@mastra/core/request-context'
import { toAISdkStream } from '@mastra/ai-sdk'
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'

export async function POST(req: Request) {
    const { messages, data, id } = await req.json()

    // Dynamic agent selection from request data
    const agentId = data?.agentId ?? id ?? 'weatherAgent'
    const myAgent = mastra.getAgent(agentId)

    // Set up request context for agent
    const requestContext = new RequestContext()
    if (data) {
        for (const [key, value] of Object.entries(data)) {
            requestContext.set(key, value)
        }
    }

    // Stream from agent
    const stream = await myAgent.stream(messages, { requestContext })

    // Convert to AI SDK UI message stream
    const uiStream = createUIMessageStream({
        originalMessages: messages,
        execute: async ({ writer }) => {
            const aiStream = toAISdkStream(stream, { from: 'agent' }) as any

            // Handle both AsyncIterable and ReadableStream
            if (typeof aiStream[Symbol.asyncIterator] === 'function') {
                for await (const part of aiStream as AsyncIterable<any>) {
                    await writer.write(part)
                }
            } else if (typeof aiStream.getReader === 'function') {
                const reader = aiStream.getReader()
                try {
                    while (true) {
                        const { value, done } = await reader.read()
                        if (done) break
                        await writer.write(value)
                    }
                } finally {
                    reader.releaseLock?.()
                }
            }
        },
    })

    return createUIMessageStreamResponse({ stream: uiStream })
}
```

**When to use:**

- Need to inject `RequestContext` data
- Want full control over stream transformation
- Supporting both `AsyncIterable` and `ReadableStream` sources

### Pattern 2: Built-in AI SDK Format (Simplified)

Used in `/api/chat-extra/route.ts` and `/api/completion/route.ts`:

```typescript
import { mastra } from '../../../src/mastra'
import { RequestContext } from '@mastra/core/request-context'

export async function POST(req: Request) {
    const { messages, data } = await req.json()
    const myAgent = mastra.getAgent('weatherAgent')

    const requestContext = new RequestContext()
    if (data) {
        for (const [key, value] of Object.entries(data)) {
            requestContext.set(key, value)
        }
    }

    // Use built-in AI SDK format
    const stream = await myAgent.stream(messages, {
        format: 'aisdk',
        requestContext,
    })

    // Direct conversion to UI message stream response
    return stream.toUIMessageStreamResponse()
}
```

**When to use:**

- Simple agent streaming without custom transformation
- Faster implementation with less code
- Mastra agent with native AI SDK support

### Pattern 3: Reusable Helper (Recommended)

Use `lib/client-stream-to-ai-sdk.ts` for production code:

```typescript
import { mastra } from '@/src/mastra'
import { createAgentStreamResponse } from '@/lib/client-stream-to-ai-sdk'

export async function POST(req: Request) {
    const { messages, agentId, threadId, resourceId, memory } = await req.json()

    return createAgentStreamResponse(mastra, agentId, messages, {
        threadId,
        resourceId,
        memory,
    })
}
```

**Helper features:**

- Handles both `ReadableStream` and `AsyncIterable`
- Automatic message format conversion
- Memory and thread support
- Consistent error handling

## Route Documentation

### POST /api/chat

**Purpose:** Primary chat endpoint with dynamic agent selection and request context.

**Request Body:**

```typescript
interface ChatRequest {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    data?: {
        agentId?: string
        [key: string]: unknown
    }
    id?: string
}
```

**Response:** Streaming `UIMessageStreamResponse`

**Example:**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is the weather?"}],
    "data": {"agentId": "stockAnalysisAgent", "symbol": "AAPL"}
  }'
```

**Agent Selection Logic:**

1. Check `data.agentId` (highest priority)
2. Fallback to `id` parameter
3. Default to `weatherAgent`

### POST /api/chat-extra

**Purpose:** Simplified chat endpoint for the weather agent.

**Request Body:**

```typescript
interface ChatExtraRequest {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    data?: Record<string, unknown>
}
```

**Response:** Streaming `UIMessageStreamResponse`

**Example:**

```bash
curl -X POST http://localhost:3000/api/chat-extra \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

### POST /api/completion

**Purpose:** Simple completion endpoint for single prompts.

**Request Body:**

```typescript
interface CompletionRequest {
    prompt: string
}
```

**Response:** Streaming `UIMessageStreamResponse`

**Example:**

```bash
curl -X POST http://localhost:3000/api/completion \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a haiku about coding"}'
```

### POST /api/contact

**Purpose:** Contact form submission handler with validation.

**Request Body:**

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

**Response:**

```typescript
interface ContactResponse {
    success: boolean
    message: string
}

interface ContactError {
    error: string
}
```

**Validation:**

- Required fields: `firstName`, `lastName`, `email`, `subject`, `message`
- Email format validation with regex
- 400 response for validation errors
- 500 response for server errors

**Example:**

```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "subject": "Question",
    "message": "Hello!"
  }'
```

### POST /api/v0

**Purpose:** Integration with v0.dev code generation service.

**Request Body:**

```typescript
interface V0Request {
    prompt: string
}
```

**Response:** JSON response from v0 SDK

**Example:**

```bash
curl -X POST http://localhost:3000/api/v0 \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a login form"}'
```

## Error Handling

### Streaming Routes

Errors in streaming routes should be handled gracefully:

```typescript
export async function POST(req: Request) {
    try {
        const { messages } = await req.json()

        // Validate input
        if (!messages || !Array.isArray(messages)) {
            return Response.json(
                { error: 'Invalid messages format' },
                { status: 400 }
            )
        }

        const stream = await myAgent.stream(messages, { format: 'aisdk' })
        return stream.toUIMessageStreamResponse()
    } catch (error) {
        console.error('Chat error:', error)
        return Response.json(
            { error: 'Failed to process request' },
            { status: 500 }
        )
    }
}
```

### Non-Streaming Routes

Return appropriate HTTP status codes:

```typescript
export async function POST(req: Request) {
    try {
        const data = await req.json()

        // Validation
        if (!data.required) {
            return Response.json(
                { error: 'Missing required field' },
                { status: 400 }
            )
        }

        // Process...
        return Response.json({ success: true })
    } catch (error) {
        console.error('Error:', error)
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
```

## Type Safety

### Request Types

Define Zod schemas for request validation:

```typescript
import { z } from 'zod'

const ChatRequestSchema = z.object({
    messages: z.array(
        z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string(),
        })
    ),
    data: z.record(z.unknown()).optional(),
    id: z.string().optional(),
})

export async function POST(req: Request) {
    const body = await req.json()
    const parsed = ChatRequestSchema.safeParse(body)

    if (!parsed.success) {
        return Response.json(
            { error: 'Invalid request', details: parsed.error.flatten() },
            { status: 400 }
        )
    }

    const { messages, data, id } = parsed.data
    // ...
}
```

### Response Types

Type streaming responses:

```typescript
import type { UIMessage } from 'ai'

// The streaming response is typed by the AI SDK
const stream: ReadableStream<Uint8Array> = createUIMessageStreamResponse({
    stream: uiStream,
}).body
```

## Best Practices

### 1. Use RequestContext for Data Passing

```typescript
// ✅ Good: Pass data through RequestContext
const requestContext = new RequestContext()
requestContext.set('userId', userId)
requestContext.set('preferences', userPrefs)

const stream = await agent.stream(messages, { requestContext })

// ❌ Bad: Modifying messages with metadata
messages.push({ role: 'system', content: `User: ${userId}` })
```

### 2. Prefer Built-in AI SDK Format

```typescript
// ✅ Good: Use format: 'aisdk' for simpler code
const stream = await agent.stream(messages, { format: 'aisdk' })
return stream.toUIMessageStreamResponse()

// ❌ Avoid: Manual conversion unless necessary
const stream = await agent.stream(messages)
const aiStream = toAISdkStream(stream, { from: 'agent' })
// ... manual iteration
```

### 3. Dynamic Agent Selection

```typescript
// ✅ Good: Flexible agent selection with fallback
const agentId = data?.agentId ?? id ?? 'defaultAgent'

// ❌ Bad: Hardcoded agent
const agent = mastra.getAgent('weatherAgent')
```

### 4. Input Validation

```typescript
// ✅ Good: Validate early
if (!messages?.length) {
    return Response.json({ error: 'Messages required' }, { status: 400 })
}

// ❌ Bad: No validation
const { messages } = await req.json()
```

### 5. Error Logging

```typescript
// ✅ Good: Structured logging
console.error('Chat error:', {
    agentId,
    error: error.message,
    stack: error.stack,
})

// ❌ Bad: Silent failures
catch (error) {
    return Response.json({ error: 'Failed' }, { status: 500 })
}
```

## Performance Considerations

### Streaming Latency

- Use `format: 'aisdk'` for lower latency (direct conversion)
- Avoid unnecessary data transformation in the hot path
- Consider edge runtime for global deployments

### Connection Handling

```typescript
// Ensure proper cleanup of stream readers
const reader = stream.getReader()
try {
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        // process value
    }
} finally {
    reader.releaseLock()
}
```

### Request Size Limits

Next.js has default body size limits. For large payloads:

```typescript
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
}
```

## Security

### Input Sanitization

```typescript
// Sanitize user input before processing
const sanitizeInput = (input: string): string => {
    return input.trim().slice(0, 10000) // Limit length
}

const sanitizedMessages = messages.map((m) => ({
    ...m,
    content: sanitizeInput(m.content),
}))
```

### Rate Limiting

Consider implementing rate limiting for production:

```typescript
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(10, '10 s'),
})

export async function POST(req: Request) {
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const { success } = await ratelimit.limit(ip)

    if (!success) {
        return Response.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Process request
}
```

## Related

- `lib/client-stream-to-ai-sdk.ts` - Reusable streaming helper
- `lib/mastra-client.ts` - Frontend MastraClient configuration
- `src/mastra/` - Mastra agent definitions
- `app/chat/` - Chat UI components

## Recent Updates

- 2026-02-16: Documented all API routes with streaming patterns
- 2026-02-16: Added type safety guidelines with Zod
- 2026-02-16: Included security best practices

---

Last updated: 2026-02-16
