# AI SDK UI Master — Reference

Extended reference for ai-elements, agent config, API routes, and Mastra backend.

## Mastra Backend

**One reference per `src/mastra/` subdirectory:** [mastra-reference.md](mastra-reference.md)

- `src/mastra/index.ts` — Entry, chatRoute, networkRoute, workflowRoute
- `src/mastra/agents/` — 31+ agents (weatherAgent, researchAgent, stockAnalysisAgent, etc.)
- `src/mastra/tools/` — 60+ tools (financial, RAG, web, data, system)
- `src/mastra/networks/` — 13 networks (agentNetwork, dataPipelineNetwork, etc.)
- `src/mastra/workflows/` — 15+ workflows (weather, content, financial, document, research)
- `src/mastra/config/` — Models, storage, logger, vector stores
- `src/mastra/a2a/` — A2A coordinator agents
- `src/mastra/mcp/` — MCP server for external clients
- `src/mastra/evals/` — Scorers (completeness, keywordCoverage, sourceDiversity)
- `src/mastra/services/`, `data/`, `policy/` — Supporting modules

## AI Elements

**One reference per component category:** [ai-elements-reference.md](ai-elements-reference.md)

- Conversation & Messaging — conversation, message, attachments, inline-citation
- Code & Development — code-block, terminal, schema-display, stack-trace
- Reasoning & Debugging — reasoning, chain-of-thought, checkpoint, test-results
- Input & Controls — prompt-input, model-selector, toolbar, controls
- Visualization & Canvas — canvas, node, edge, panel
- Media & Audio — audio-player, speech-input, transcription, image
- Agent & Tool — agent, tool, artifact, sandbox, file-tree, web-preview
- Other — loader, context, sources, plan, queue, task, suggestion, confirmation, shimmer, snippet, commit, package-info
- tools/ — weather-tool, research-tools, financial-tools, polygon-tools, browser-tool, e2b-sandbox-tool, calculator-tool, execa-tool
- custom/ — workflow-execution, tool-execution-card, thinking-indicator, agent-response

## Agent Config Schema

From `app/chat/config/agents.ts`:

```typescript
export type AgentCategory =
  | 'core' | 'research' | 'content' | 'data' | 'financial'
  | 'diagram' | 'utility' | 'business' | 'coding'

export interface AgentFeatures {
  reasoning: boolean
  chainOfThought: boolean
  tools: boolean
  sources: boolean
  canvas: boolean
  artifacts: boolean
  fileUpload: boolean
  plan: boolean
  task: boolean
  confirmation: boolean
  checkpoint: boolean
  queue: boolean
  codeBlocks: boolean
  images: boolean
  webPreview: boolean
}

export interface AgentConfig {
  id: string
  name: string
  description: string
  category: AgentCategory
  features: AgentFeatures
  icon?: string
}
```

Use `getAgentConfig(agentId)` from `app/chat/config/agents.ts` to get config for the selected agent.

## app/api/mastra Routes

Next.js API routes used by the dashboard. Each route uses `MastraClient` server-side to proxy requests to the Mastra API. The dashboard calls these routes (e.g. `fetch('/api/mastra/agents')`), not MastraClient directly from the client.

| Route | Purpose |
|-------|---------|
| `GET/POST /api/mastra/agents` | List agents |
| `GET /api/mastra/agents/[agentId]` | Agent details |
| `GET/POST /api/mastra/workflows` | List workflows |
| `GET /api/mastra/workflows/[workflowId]` | Workflow details |
| `POST /api/mastra/workflows/[workflowId]/run` | Run workflow |
| `GET/POST /api/mastra/threads` | List threads |
| `GET/POST /api/mastra/threads/[threadId]` | Thread operations |
| `GET /api/mastra/threads/[threadId]/messages` | Thread messages |
| `POST /api/mastra/threads/[threadId]/clone` | Clone thread |
| `GET /api/mastra/traces` | List traces |
| `GET /api/mastra/traces/[traceId]` | Trace details |
| `GET /api/mastra/logs` | Logs |
| `GET /api/mastra/logs/[runId]` | Log by run |
| `GET /api/mastra/tools` | List tools |
| `GET /api/mastra/tools/[toolId]` | Tool details |
| `GET /api/mastra/vectors` | Vector stores |
| `GET /api/mastra/vectors/[vectorName]` | Vector store details |
| `POST /api/mastra/vectors/[vectorName]/query` | Vector query |
| `GET /api/mastra/memory/status` | Memory status |
| `GET /api/mastra/memory/working-memory` | Working memory |
| `GET /api/mastra/observability/scores` | Observability scores |

## API Route Patterns

### Streaming Chat (app/api/chat/route.ts)

```typescript
import { mastra } from '@/src/mastra'
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import { toAISdkStream } from '@mastra/ai-sdk'
import { RequestContext, MASTRA_RESOURCE_ID_KEY, MASTRA_THREAD_ID_KEY } from '@mastra/core/request-context'

export async function POST(req: Request) {
  const body = await req.json()
  const { messages, data, id } = body
  const agentId = data?.agentId ?? id ?? 'weatherAgent' //  This will only display weatherAgent so this is kinda useless since my mastra/index uses :agentid which makes the route dynamic and since its dynamic u can change agent by putting my other agents....  This would be a static port it must have a string for agent it wont just pick it up.
  const agent = mastra.getAgent(agentId)

  const requestContext = new RequestContext()
  if (body.resourceId) requestContext.set(MASTRA_RESOURCE_ID_KEY, body.resourceId)
  if (body.threadId) requestContext.set(MASTRA_THREAD_ID_KEY, body.threadId)

  const stream = await agent.stream(messages, {
    threadId: body.threadId,
    resourceId: body.resourceId,
    memory: body.memory,
    requestContext,
  })

  const uiStream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      const aiStream = toAISdkStream(stream, {
        from: 'agent',
        sendReasoning: true,
        sendSources: true,
      })
      // Handle ReadableStream or AsyncIterable
      for await (const value of aiStream) {
        await writer.write(value)
      }
    },
  })

  return createUIMessageStreamResponse({ stream: uiStream })
}
```

### Reusable Helper (lib/client-stream-to-ai-sdk.ts)

Use `createAgentStreamResponse(mastra, agentId, messages, options)` for consistent API route handling. Supports `threadId`, `resourceId`, `memory`, `maxSteps`, `format: 'aisdk' | 'mastra'`.
