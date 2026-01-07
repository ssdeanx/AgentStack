import type { MastraModelOutput } from '@mastra/core/stream'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { SpanStatusCode, trace } from '@opentelemetry/api'
import { z } from 'zod'
import { evaluationAgent } from '../agents/evaluationAgent'
import { log } from '../config/logger'

export const evaluateResultTool = createTool({
    id: 'evaluate-result',
    description:
        'Evaluate if a search result is relevant to the research query',
    inputSchema: z.object({
        query: z.string().describe('The original research query'),
        result: z
            .object({
                title: z.string(),
                url: z.string(),
                content: z.string(),
            })
            .describe('The search result to evaluate'),
        existingUrls: z
            .array(z.string())
            .describe('URLs that have already been processed')
            .optional(),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Evaluate result tool input streaming started', {
            toolCallId,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Evaluate result received input chunk', {
            toolCallId,
            inputTextDelta,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Evaluate result received complete input', {
            toolCallId,
            query: input.query,
            url: input.result.url,
            existingUrlsCount: input.existingUrls?.length || 0,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Evaluate result completed', {
            toolCallId,
            toolName,
            isRelevant: output.isRelevant,
            reason: output.reason,
            hook: 'onOutput',
        })
    },
    execute: async (inputData, context) => {
        await context?.writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message:
                    '🤔 Evaluating relevance of result: ' +
                    inputData.result.title,
                stage: 'evaluate-result',
            },
            id: 'evaluate-result',
        })

        const tracer = trace.getTracer('evaluate-result')
        const evalSpan = tracer.startSpan('evaluate_result', {
            attributes: {
                query: inputData.query,
                url: inputData.result.url,
                existingUrlsCount: inputData.existingUrls?.length ?? 0,
                operation: 'evaluate_result',
            },
        })

        try {
            const { query, result, existingUrls = [] } = inputData
            log.info('Evaluating result', { inputData })

            // Check if URL already exists (only if existingUrls was provided)
            if (existingUrls?.includes(result.url)) {
                evalSpan.end()
                await context?.writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: 'URL already processed',
                        stage: 'evaluate-result',
                    },
                    id: 'evaluate-result',
                })
                return {
                    isRelevant: false,
                    reason: 'URL already processed',
                }
            }

            // Use Mastra agent directly (follow nested-agent-stream-tool pattern)
            const agent =
                context?.mastra?.getAgent?.('evaluationAgent') ??
                evaluationAgent

            let responseObject: unknown = {}
            if (typeof agent.stream === 'function') {
                try {
                    await context?.writer?.custom({
                        type: 'data-tool-progress',
                        data: {
                            status: 'in-progress',
                            message: '🔁 Streaming evaluation from agent',
                            stage: 'evaluate-result',
                        },
                        id: 'evaluate-result',
                    })
                    // Use MastraModelOutput for accurate typing and pipe the appropriate stream into the writer
                    const stream = (await agent.stream(
                        `Evaluate whether this search result is relevant and will help answer the query: "${query}".\n\nSearch result:\nTitle: ${result.title}\nURL: ${result.url}\nContent snippet: ${result.content.substring(0, 500)}...\n\nRespond with a JSON object containing:\n- isRelevant: boolean indicating if the result is relevant\n- reason: brief explanation of your decision`
                    )) as MastraModelOutput | undefined

                    if (stream?.textStream && context?.writer) {
                        await context?.writer?.custom({
                            type: 'data-tool-progress',
                            data: {
                                status: 'in-progress',
                                message:
                                    '🔁 Streaming text from evaluation agent',
                                stage: 'evaluate-result',
                            },
                            id: 'evaluate-result',
                        })
                        await stream.textStream.pipeTo(
                            context.writer as unknown as WritableStream
                        )
                    } else if (stream?.fullStream && context?.writer) {
                        await context?.writer?.custom({
                            type: 'data-tool-progress',
                            data: {
                                status: 'in-progress',
                                message:
                                    '🔁 Streaming from evaluation agent (full stream)',
                                stage: 'evaluate-result',
                            },
                            id: 'evaluate-result',
                        })
                        await stream.fullStream.pipeTo(
                            context.writer as unknown as WritableStream
                        )
                    }

                    const text = (await stream?.text) ?? ''
                    try {
                        responseObject = JSON.parse(text)
                    } catch {
                        responseObject = {}
                    }
                } catch (err) {
                    const errorMessage =
                        err instanceof Error ? err.message : String(err)
                    evalSpan.recordException(new Error(errorMessage))
                    evalSpan.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: errorMessage,
                    })
                    evalSpan.end()

                    await context?.writer?.custom({
                        type: 'data-tool-progress',
                        data: {
                            status: 'done',
                            message: `❌ Error streaming evaluation: ${errorMessage}`,
                            stage: 'evaluate-result',
                        },
                        id: 'evaluate-result',
                    })
                    return {
                        isRelevant: false,
                        reason: 'Error in evaluation',
                    }
                }
            } else {
                const response = await agent.generate(
                    `Evaluate whether this search result is relevant and will help answer the query: "${query}".\n\nSearch result:\nTitle: ${result.title}\nURL: ${result.url}\nContent snippet: ${result.content.substring(0, 500)}...\n\nRespond with a JSON object containing:\n- isRelevant: boolean indicating if the result is relevant\n- reason: brief explanation of your decision`
                )
                responseObject =
                    response.object ??
                    (() => {
                        try {
                            return JSON.parse(response.text)
                        } catch {
                            return {}
                        }
                    })()
            }

            const outputSchema = z.object({
                isRelevant: z.boolean(),
                reason: z.string(),
            })

            const parsed = outputSchema.safeParse(responseObject)

            if (!parsed.success) {
                log.warn('Evaluation agent returned unexpected shape', {
                    response: responseObject,
                })
                const error = 'Invalid response format from evaluation agent'
                evalSpan.recordException(new Error(error))
                evalSpan.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: error,
                })

                evalSpan.end()
                await context?.writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: error,
                        stage: 'evaluate-result',
                    },
                    id: 'evaluate-result',
                })
                return {
                    isRelevant: false,
                    reason: error,
                }
            }

            evalSpan.end()

            await context?.writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: parsed.data.isRelevant
                        ? '✅ Result is relevant'
                        : '❌ Result is not relevant',
                    stage: 'evaluate-result',
                },
                id: 'evaluate-result',
            })
            return parsed.data
        } catch (error) {
            log.error('Error evaluating result:', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            })
            const errorMessage =
                error instanceof Error ? error.message : String(error)

            evalSpan.recordException(new Error(errorMessage))
            evalSpan.setStatus({
                code: SpanStatusCode.ERROR,
                message: errorMessage,
            })
            evalSpan.end()

            // Emit final progress event with error message
            await context?.writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Error evaluating result: ${errorMessage}`,
                    stage: 'evaluate-result',
                },
                id: 'evaluate-result',
            })

            return {
                isRelevant: false,
                reason: 'Error in evaluation',
            }
        }
    },
})

export type EvaluateResultUITool = InferUITool<typeof evaluateResultTool>
