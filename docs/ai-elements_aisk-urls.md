# AI Elements URLs

## AI-SDK - Mastra Next.js Framework

Using Vercel AI SDK
Mastra integrates with Vercel's AI SDK to support model routing, React Hooks, and data streaming methods.

https://mastra.ai/docs/frameworks/agentic-uis/ai-sdk

- [AI-SDK Framework]

- [Next.js Framework](https://mastra.ai/docs/frameworks/web-frameworks/next-js)
- [Custom API Routes](https://mastra.ai/docs/server-db/custom-api-routes)
- [Mastra Runtime Context](https://mastra.ai/docs/server-db/runtime-context)
- [AI Elements](https://mastra.ai/docs/server-db/middleware)

## AI Elements Frontend Components

Location `C:/Users/ssdsk/mastra/ui` & `C:/Users/ssdsk/mastra/src/components/ai-elements`

- [AI Elements](https://ai-sdk.dev/elements)
- [Usage](https://ai-sdk.dev/elements/usage)

# Chatbot Components

- [Examples Chatbot](https://ai-sdk.dev/elements/examples/chatbot)
- [Examples v0](https://ai-sdk.dev/elements/examples/v0)
- [Chain of Thought](https://ai-sdk.dev/elements/components/chain-of-thought)
- [Checkpoint](https://ai-sdk.dev/elements/components/checkpoint)
- [Confirmation](https://ai-sdk.dev/elements/components/confirmation)
- [Conversation](https://ai-sdk.dev/elements/components/conversation)
- [Context](https://ai-sdk.dev/elements/components/context)
- [Inline Citation](https://ai-sdk.dev/elements/components/inline-citation)
- [Message](https://ai-sdk.dev/elements/components/message)
- [Model Selector](https://ai-sdk.dev/elements/components/model-selector)
- [Plan](https://ai-sdk.dev/elements/components/plan)
- [Prompt Input](https://ai-sdk.dev/elements/components/prompt-input)
- [Queue](https://ai-sdk.dev/elements/components/queue)
- [Reasoning](https://ai-sdk.dev/elements/components/reasoning)
- [Shimmer](https://ai-sdk.dev/elements/components/shimmer)
- [Sources](https://ai-sdk.dev/elements/components/sources)
- [Suggestions](https://ai-sdk.dev/elements/components/suggestions)
- [Task](https://ai-sdk.dev/elements/components/task)
- [Tool](https://ai-sdk.dev/elements/components/tool)

# Workflow Components

- [Workflow Examples](https://ai-sdk.dev/elements/examples/workflow)
- [Canvas](https://ai-sdk.dev/elements/components/canvas)
- [Connection](https://ai-sdk.dev/elements/components/connection)
- [Controls](https://ai-sdk.dev/elements/components/controls)
- [Edge](https://ai-sdk.dev/elements/components/edge)
- [Node](https://ai-sdk.dev/elements/components/node)
- [Panel](https://ai-sdk.dev/elements/components/panel)
- [Toolbar](https://ai-sdk.dev/elements/components/toolbar)

# Vibe Coding Components

- [Artifact](https://ai-sdk.dev/elements/components/artifact)
- [Web Preview](https://ai-sdk.dev/elements/components/web-preview)

# Documentation Components

- [Open in Chat](https://ai-sdk.dev/elements/components/open-in-chat)

# Utilities

- [Code Block](https://ai-sdk.dev/elements/components/code-block)
- [Image](https://ai-sdk.dev/elements/components/image)
- [Loader](https://ai-sdk.dev/elements/components/loader)


---

# Mastra Event Types and Templates

- The following TypeScript code defines event types and templates for Mastra workflow streaming.
- This is what the event stream looks like when a workflow is executed.
- This might be useful for building custom UIs or debugging workflows.  Ai-SDK integration uses similar event structures for streaming data.  These events can be adapted for various frontend components.

```ts
/**
 * Event types for Mastra workflow streaming
 */
export type MastraEventType =
    | 'start'
    | 'step-start'
    | 'tool-call'
    | 'tool-result'
    | 'step-finish'
    | 'tool-output'
    | 'step-result'
    | 'step-output'
    | 'finish'

// Event templates
const mastraEventTemplates: Record<MastraEventType, Record<string, unknown>> = {
    start: {
        type: 'start',
        from: 'WORKFLOW',
        payload: { workflowId: 'name-goes-here' },
    },
    'step-start': {
        type: 'step-start',
        from: 'WORKFLOW',
        payload: {
            stepName: 'callAgent',
            startedAt: Date.now(),
        },
    },
    'tool-call': {
        type: 'tool-call',
        from: 'AGENT',
        payload: {
            toolCallId: 'tc_' + Date.now(),
            args: {},
            toolName: 'chatAgent',
        },
    },
    'tool-result': {
        type: 'tool-result',
        from: 'AGENT',
        payload: {
            toolCallId: 'tc_' + Date.now(),
            toolName: 'chatAgent',
            result: { success: true },
        },
    },
    'step-finish': {
        type: 'step-finish',
        from: 'WORKFLOW',
        payload: {
            reason: 'completed',
            usage: {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
            },
            response: { text: '' },
            endedAt: Date.now(),
        },
    },
    'tool-output': {
        type: 'tool-output',
        from: 'AGENT',
        payload: {
            output: { text: '' },
            toolCallId: 'tc_' + Date.now(),
            toolName: 'chatAgent',
        },
    },
    'step-result': {
        type: 'step-result',
        from: 'WORKFLOW',
        payload: {
            stepName: 'callAgent',
            result: { content: '' },
            status: 'success',
            endedAt: Date.now(),
        },
    },
    'step-output': {
        type: 'step-output',
        from: 'AGENT',
        payload: {
            output: { text: '' },
            toolCallId: 'tc_' + Date.now(),
            toolName: 'chatAgent',
        },
    },
    finish: {
        type: 'finish',
        from: 'WORKFLOW',
        payload: {
            totalUsage: {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
            },
        },
    },
}
```