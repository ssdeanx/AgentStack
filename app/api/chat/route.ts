import { mastra } from '../../../src/mastra'
import {
    RequestContext,
    MASTRA_RESOURCE_ID_KEY,
    MASTRA_THREAD_ID_KEY,
} from '@mastra/core/request-context'
import { toAISdkStream } from '@mastra/ai-sdk'
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import type { UIMessage } from 'ai'

export async function POST(req: Request) {
    const body = await req.json()
    const { messages, data, id } = body

    // Agent selection logic
    const agentId =
        (typeof data?.agentId === 'string' && data.agentId.length > 0
            ? data.agentId
            : undefined) ??
        (typeof id === 'string' && id.length > 0 ? id : undefined) ??
        'weatherAgent'

    const agent = mastra.getAgent(agentId)

    if (!agent) {
        return Response.json(
            { error: `Agent "${agentId}" not found` },
            { status: 404 }
        )
    }

    // Extract multi-tenancy IDs
    const threadId = body.threadId ?? data?.threadId
    const resourceId = body.resourceId ?? data?.resourceId

    // Create RequestContext for multi-tenancy isolation
    const requestContext = new RequestContext()
    if (resourceId) {requestContext.set(MASTRA_RESOURCE_ID_KEY, resourceId)}
    if (threadId) {requestContext.set(MASTRA_THREAD_ID_KEY, threadId)}

    // Merge other data into context if present
    if (data && typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
            if (
                key !== 'agentId' &&
                key !== 'threadId' &&
                key !== 'resourceId'
            ) {
                requestContext.set(key, value)
            }
        }
    }

    // Prepare stream options
    const streamOptions = {
        threadId,
        resourceId,
        memory: body.memory ?? data?.memory,
        requestContext,
    }

    const stream = await agent.stream(messages, streamOptions)

    const uiStream = createUIMessageStream({
        originalMessages: messages as UIMessage[],
        execute: async ({ writer }) => {
            const aiStream = toAISdkStream(stream, {
                from: 'agent',
                sendReasoning: true,
                sendSources: true,
            })

            // Support both ReadableStream and AsyncIterable (robust bridge)
            if (
                aiStream &&
                typeof (aiStream as any).getReader === 'function'
            ) {
                const reader = (aiStream as ReadableStream<any>).getReader()
                try {
                    while (true) {
                        const { value, done } = await reader.read()
                        if (done) {break}
                        await writer.write(value)
                    }
                } finally {
                    reader.releaseLock?.()
                }
            } else if (aiStream && Symbol.asyncIterator in aiStream) {
                for await (const part of aiStream as AsyncIterable<any>) {
                    await writer.write(part)
                }
            }
        },
    })

    return createUIMessageStreamResponse({ stream: uiStream })
}
