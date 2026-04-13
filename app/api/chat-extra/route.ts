import { mastra } from '../../../src/mastra'
import {
    RequestContext,
    MASTRA_RESOURCE_ID_KEY,
    MASTRA_THREAD_ID_KEY,
} from '@mastra/core/request-context'
import { toAISdkStream } from '@mastra/ai-sdk'
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import type { UIMessage } from 'ai'
import type { MessageListInput } from '@mastra/core/agent/message-list'

interface ChatExtraRequestBody {
    messages: unknown[]
    data?: Record<string, unknown>
    id?: string
    threadId?: string
    resourceId?: string
    memory?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isReadableStream<T>(value: unknown): value is ReadableStream<T> {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as ReadableStream<T>).getReader === 'function'
    )
}

async function* asyncIterableFromReadableStream<T>(
    stream: ReadableStream<T>
): AsyncIterable<T> {
    const reader = stream.getReader()
    try {
        for (;;) {
            const { done, value } = await reader.read()
            if (done) {
                break
            }

            yield value
        }
    } finally {
        reader.releaseLock()
    }
}

function getNonEmptyString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0
        ? value
        : undefined
}

function parseChatExtraRequestBody(value: unknown): ChatExtraRequestBody {
    const record: Record<string, unknown> = isRecord(value) ? value : {}
    const data = isRecord(record.data) ? record.data : undefined
    const messages = Array.isArray(record.messages)
        ? (record.messages as unknown[])
        : []

    return {
        messages,
        data,
        id: getNonEmptyString(record.id),
        threadId:
            getNonEmptyString(record.threadId) ??
            getNonEmptyString(data?.threadId),
        resourceId:
            getNonEmptyString(record.resourceId) ??
            getNonEmptyString(data?.resourceId),
        memory: record.memory ?? data?.memory,
    }
}

export async function POST(req: Request) {
    const body = parseChatExtraRequestBody(await req.json())
    const { messages, data, id } = body

    const agentId =
        getNonEmptyString(data?.agentId) ?? id ?? 'weatherAgent'

    const agent = mastra.getAgent(agentId)

    const threadId = body.threadId
    const resourceId = body.resourceId

    const requestContext = new RequestContext()
    if (resourceId) {
        requestContext.set(MASTRA_RESOURCE_ID_KEY, resourceId)
    }
    if (threadId) {
        requestContext.set(MASTRA_THREAD_ID_KEY, threadId)
    }

    if (data) {
        for (const [key, value] of Object.entries(data)) {
            if (key === 'agentId' || key === 'threadId' || key === 'resourceId') {
                continue
            }

            requestContext.set(key, value)
        }
    }

    const streamOptions = {
        threadId,
        resourceId,
        memory: body.memory,
        requestContext,
    }

    const stream = await agent.stream(messages as MessageListInput, streamOptions)

    const uiStream = createUIMessageStream({
        originalMessages: Array.isArray(messages)
            ? (messages as UIMessage[])
            : undefined,
        execute: async ({ writer }) => {
            const aiStream = toAISdkStream(stream, {
                from: 'agent',
                sendReasoning: true,
                sendSources: true,
            })

            const iterable = isReadableStream(aiStream)
                ? asyncIterableFromReadableStream(aiStream)
                : (aiStream as AsyncIterable<unknown>)

            for await (const value of iterable) {
                writer.write(value as Parameters<typeof writer.write>[0])
            }
        },
    })

    return createUIMessageStreamResponse({ stream: uiStream })
}
