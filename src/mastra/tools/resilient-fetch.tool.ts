import { createTool } from '@mastra/core/tools'
import { SpanType } from '@mastra/core/observability'
import { z } from 'zod'
import { log } from '../config/logger'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import Bottleneck from 'bottleneck'

// Create a shared limiter instance (could be configurable per tool instance if needed)
const limiter = new Bottleneck({
    minTime: 200, // 5 requests per second
    maxConcurrent: 5,
})

// Configure axios with retry
const client = axios.create()
axiosRetry(client, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
        return (
            axiosRetry.isNetworkOrIdempotentRequestError(error) ||
            error.response?.status === 429
        )
    },
})

export const resilientFetchTool = createTool({
    id: 'resilient-fetch',
    description:
        'Fetches data from URLs with automatic retries and rate limiting',
    inputSchema: z.object({
        url: z.string().url(),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
        data: z.record(z.string(), z.unknown()).optional(),
        headers: z.record(z.string(), z.string()).optional(),
        priority: z
            .number()
            .min(0)
            .max(9)
            .default(5)
            .describe('Priority (0-9, higher is more important)'),
    }),
    outputSchema: z.object({
        status: z.number(),
        data: z.unknown(),
        headers: z.record(z.string(), z.unknown()),
    }),
    execute: async (input, context) => {
        const { url, method, data, headers, priority } = input

        await context?.writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Scheduling ${method} request to ${url}`,
                stage: 'resilient-fetch',
            },
            id: 'resilient-fetch',
        })

        try {
            // Schedule the request through bottleneck
            const response = await limiter.schedule({ priority }, () =>
                client.request({
                    url,
                    method,
                    data,
                    headers,
                })
            )

            await context?.writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Request complete: ${response.status} ${response.statusText}`,
                    stage: 'resilient-fetch',
                },
                id: 'resilient-fetch',
            })

            return {
                status: response.status,
                data: response.data,
                headers: response.headers as Record<string, any>,
            }
        } catch (error: any) {
            const errorMessage = error.response
                ? `${error.response.status} - ${JSON.stringify(error.response.data)}`
                : error.message

            log.error('Resilient fetch failed', {
                url,
                method,
                error: errorMessage,
            })

            await context?.writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Request failed: ${errorMessage}`,
                    stage: 'resilient-fetch',
                },
                id: 'resilient-fetch',
            })

            throw new Error(`Request failed: ${errorMessage}`)
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Resilient fetch tool input streaming started', {
            toolCallId,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Resilient fetch tool received input chunk', {
            toolCallId,
            inputTextDelta,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Resilient fetch tool received input', {
            toolCallId,
            inputData: { url: input.url, method: input.method },
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Resilient fetch tool completed', {
            toolCallId,
            toolName,
            outputData: { status: output.status },
            hook: 'onOutput',
        })
    },
})
