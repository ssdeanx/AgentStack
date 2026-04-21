import type { MastraModelOutput } from '@mastra/core/stream'
import type { ChunkType } from '@mastra/core/stream'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import { z } from 'zod'
import { evaluationAgent } from '../agents/evaluationAgent'
import { log } from '../config/logger'

const evaluateResultOutputSchema = z.object({
    isRelevant: z.boolean(),
    reason: z.string(),
})

type EvaluateResultOutput = z.infer<typeof evaluateResultOutputSchema>
const evaluateResultFallbackOutput: EvaluateResultOutput = {
    isRelevant: false,
    reason: '',
}

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
    outputSchema: evaluateResultOutputSchema,
    strict: true,
    onInputStart: ({ toolCallId }) => {
        log.info('Evaluate result tool input streaming started', {
            toolCallId,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId }) => {
        log.info('Evaluate result received input chunk', {
            toolCallId,
            inputTextDelta,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId }) => {
        log.info('Evaluate result received complete input', {
            toolCallId,
            query: input.query,
            url: input.result.url,
            existingUrlsCount: input.existingUrls?.length ?? 0,
            hook: 'onInputAvailable',
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

        const evalSpan = getOrCreateSpan({
            type: SpanType.AGENT_RUN,
            name: 'evaluate_result',
            input: inputData,
            requestContext: context?.requestContext,
            tracingContext: context?.tracingContext,
            metadata: {
                'tool.id': 'evaluate-result',
                query: inputData.query,
                url: inputData.result.url,
                operation: 'evaluate_result',
            },
        })

        try {
            const { query, result, existingUrls = [] } = inputData
            log.info('Evaluating result', { inputData })

            // Check if URL already exists (only if existingUrls was provided)
            if (existingUrls?.includes(result.url)) {
                evalSpan?.update({
                    output: {
                        isRelevant: false,
                        reason: 'URL already processed',
                    },
                    metadata: { 'tool.output.status': 'already-processed' },
                })
                evalSpan?.end()
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

                    let streamedText = ''
                    const stream = (await agent.stream(
                        `Evaluate whether this search result is relevant and will help answer the query: "${query}".\n\nSearch result:\nTitle: ${result.title}\nURL: ${result.url}\nContent snippet: ${result.content.substring(0, 500)}...\n\nRespond with a JSON object containing:\n- isRelevant: boolean indicating if the result is relevant\n- reason: brief explanation of your decision`,
                        {
                            structuredOutput: {
                                schema: evaluateResultOutputSchema,
                            },
                            onChunk: (chunk: ChunkType<EvaluateResultOutput>) => {
                                if (
                                    chunk.type === 'text-delta' &&
                                    typeof chunk.payload?.text === 'string'
                                ) {
                                    streamedText += chunk.payload.text
                                }
                            },
                        }
                    )) as MastraModelOutput<EvaluateResultOutput> | undefined

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

                    try {
                        responseObject = await stream?.object
                    } catch {
                        const text = (await stream?.text) ?? streamedText
                        try {
                            responseObject = text ? JSON.parse(text) : {}
                        } catch {
                            responseObject = {}
                        }
                    }
                } catch (err) {
                    const errorMessage =
                        err instanceof Error ? err.message : String(err)
                    evalSpan?.error({
                        error:
                            err instanceof Error
                                ? err
                                : new Error(errorMessage),
                        endSpan: true,
                    })

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
                            const parsedJson: unknown = JSON.parse(
                                response.text
                            )
                            return parsedJson
                        } catch {
                            return {}
                        }
                    })()
            }

            const parsed = evaluateResultOutputSchema.safeParse(responseObject)

            if (!parsed.success) {
                log.warn('Evaluation agent returned unexpected shape', {
                    response: responseObject,
                })
                const error = 'Invalid response format from evaluation agent'
                evalSpan?.error({
                    error: new Error(error),
                    endSpan: true,
                })

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

            evalSpan?.end()

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

            evalSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })

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
    toModelOutput: (output: EvaluateResultOutput) => ({
        type: 'text',
        value: `${output.isRelevant ? 'Relevant' : 'Not relevant'}: ${output.reason}`,
    }),
    onOutput: ({ output, toolCallId, toolName }) => {
        log.info('Evaluate result completed', {
            toolCallId,
            toolName,
            outputData: {
                isRelevant: output.isRelevant,
                reason: output.reason,
            },
            hook: 'onOutput',
        })
    },
})

export type EvaluateResultUITool = InferUITool<typeof evaluateResultTool>
