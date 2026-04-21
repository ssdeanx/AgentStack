import type { MastraModelOutput } from '@mastra/core/stream'
import type { ChunkType } from '@mastra/core/stream'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import { z } from 'zod'
import { log } from '../config/logger'
import type { RequestContext } from '@mastra/core/request-context'

export interface ExtractLearningsContext extends RequestContext {
    userId?: string
}

const extractLearningsOutputSchema = z.object({
    learning: z.string(),
    followUpQuestions: z.array(z.string()).max(1),
})

type ExtractLearningsOutput = z.infer<typeof extractLearningsOutputSchema>

const extractLearningsFallbackOutput: ExtractLearningsOutput = {
    learning: '',
    followUpQuestions: [],
}

export const extractLearningsTool = createTool({
    id: 'extract-learnings',
    description:
        'Extract key learnings and follow-up questions from a search result',
    inputSchema: z.object({
        query: z.string().describe('The original research query'),
        result: z
            .object({
                title: z.string(),
                url: z.string(),
                content: z.string(),
            })
            .describe('The search result to process'),
    }),
    outputSchema: extractLearningsOutputSchema,
    strict: true,
    onInputStart: ({ toolCallId, messages }) => {
        log.info('extractLearningsTool tool input streaming started', {
            toolCallId,
            messages,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages }) => {
        log.info('extractLearningsTool received input chunk', {
            toolCallId,
            inputTextDelta,
            messages,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages }) => {
        log.info('extractLearningsTool received input', {
            toolCallId,
            messages,
            inputData: {
                query: input.query,
                result: {
                    title: input.result.title,
                    url: input.result.url,
                },
            },
            hook: 'onInputAvailable',
        })
    },
    execute: async (inputData, context) => {
        const mastra = context?.mastra
        const writer = context?.writer
        const requestContext = context?.requestContext as
            | ExtractLearningsContext
            | undefined

        // Emit progress start event
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '🧠 Extracting learnings from search result',
                stage: 'extract-learnings',
            },
            id: 'extract-learnings',
        })

        const extractSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'extract-learnings',
            input: {
                query: inputData?.query,
                url: inputData?.result?.url,
                contentLength: inputData?.result?.content?.length,
            },
            metadata: {
                'tool.id': 'extract-learnings',
                'tool.input.query': inputData?.query,
                'tool.input.url': inputData?.result?.url,
                'tool.input.contentLength': inputData?.result?.content?.length,
                'user.id': requestContext?.userId,
            },
        })

        try {
            const { query, result } = inputData

            log.info('Extracting learnings from search result', {
                title: result.title,
                url: result.url,
            })
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: '🤖 Generating insights with learning agent',
                    stage: 'extract-learnings',
                },
                id: 'extract-learnings',
            })

            const truncatedContent = (result?.content ?? '').slice(0, 8000)
            const contentWithTruncation =
                (result?.content ?? '').length > 8000
                    ? truncatedContent + 'AAAA...'
                    : truncatedContent

            const prompt = `The user is researching "${query}".\nExtract a key learning and generate follow-up questions from this search result:\n\nTitle: ${result?.title}\nURL: ${result?.url}\nContent: ${contentWithTruncation}\n\nRespond with a JSON object containing:\n- learning: string with the key insight from the content\n- followUpQuestions: array of up to 1 follow-up question for deeper research`

            if (mastra === undefined || mastra === null) {
                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: '❌ Mastra instance not provided',
                        stage: 'extract-learnings',
                    },
                    id: 'extract-learnings',
                })
                extractSpan?.update({
                    output: {
                        learning: 'Mastra instance not provided',
                        followUpQuestions: [],
                    },
                    metadata: {
                        'output.learningLength': 0,
                        'output.followUpQuestionsCount': 0,
                    },
                })
                extractSpan?.end()
                return {
                    learning: 'Mastra instance not provided',
                    followUpQuestions: [],
                }
            }

            const agent = mastra.getAgent('learningExtractionAgent')
            if (agent === undefined || agent === null) {
                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: '❌ learningExtractionAgent not available',
                        stage: 'extract-learnings',
                    },
                    id: 'extract-learnings',
                })
                extractSpan?.update({
                    output: {
                        learning: 'learningExtractionAgent not available',
                        followUpQuestions: [],
                    },
                    metadata: {
                        'output.learningLength': 0,
                        'output.followUpQuestionsCount': 0,
                    },
                })
                extractSpan?.end()
                return {
                    learning: 'learningExtractionAgent not available',
                    followUpQuestions: [],
                }
            }

            let responseObject: z.infer<typeof extractLearningsOutputSchema> =
                extractLearningsFallbackOutput
            if (typeof agent.stream === 'function') {
                // Use MastraModelOutput for accurate typing and pipe fullStream into the writer (Mastra nested-agent pattern)
                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'in-progress',
                        message: '🔁 Streaming learnings from agent',
                        stage: 'extract-learnings',
                    },
                    id: 'extract-learnings',
                })
                let streamedText = ''
                const stream = (await agent.stream(prompt, {
                    structuredOutput: {
                        schema: extractLearningsOutputSchema,
                    },
                    onChunk: (chunk: ChunkType<ExtractLearningsOutput>) => {
                        if (
                            chunk.type === 'text-delta' &&
                            typeof chunk.payload?.text === 'string'
                        ) {
                            streamedText += chunk.payload.text
                        }
                    },
                })) as MastraModelOutput<ExtractLearningsOutput> | undefined

                if (stream?.fullStream !== undefined && writer) {
                    await stream.fullStream.pipeTo(
                        writer as WritableStream
                    )
                }

                if (stream) {
                    try {
                        const structured = await stream.object
                        responseObject =
                            structured ?? extractLearningsFallbackOutput
                    } catch {
                        const text = (await stream.text) ?? streamedText
                        try {
                            responseObject = text
                                ? JSON.parse(text)
                                : extractLearningsFallbackOutput
                        } catch {
                            responseObject = extractLearningsFallbackOutput
                        }
                    }
                } else {
                    responseObject = extractLearningsFallbackOutput
                }
            } else {
                const response = await agent.generate(prompt)
                try {
                    responseObject =
                        response.object ??
                        (response.text
                            ? JSON.parse(response.text)
                            : extractLearningsFallbackOutput)
                } catch {
                    responseObject = extractLearningsFallbackOutput
                }
            }

            log.info('Learning extraction response', {
                result: responseObject,
            })

            const parsed = extractLearningsOutputSchema.safeParse(responseObject)

            if (!parsed.success) {
                log.warn(
                    'Learning extraction agent returned unexpected shape',
                    { response: responseObject }
                )

                extractSpan?.update({
                    output: {
                        learning:
                            'Invalid response format from learning extraction agent',
                        followUpQuestions: [],
                    },
                    metadata: {
                        'output.learningLength': 0,
                        'output.followUpQuestionsCount': 0,
                    },
                })
                extractSpan?.end()

                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: '⚠️ Invalid response format from agent',
                        stage: 'extract-learnings',
                    },
                    id: 'extract-learnings',
                })

                return {
                    learning:
                        'Invalid response format from learning extraction agent',
                    followUpQuestions: [],
                }
            }

            const learningLength = parsed.data.learning.length ?? 0
            const followUpQuestionsCount =
                parsed.data.followUpQuestions?.length ?? 0

            extractSpan?.update({
                output: parsed.data,
                metadata: {
                    'output.learningLength': learningLength,
                    'output.followUpQuestionsCount': followUpQuestionsCount,
                },
            })
            extractSpan?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: '✅ Learnings extracted successfully',
                    stage: 'extract-learnings',
                },
                id: 'extract-learnings',
            })

            return parsed.data
        } catch (error) {
            log.error('Error extracting learnings', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            })
            const errorMessage =
                error instanceof Error ? error.message : String(error)

            extractSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Error extracting information: ${errorMessage}`,
                    stage: 'extract-learnings',
                },
                id: 'extract-learnings',
            })

            return {
                learning: `Error extracting information: ${errorMessage}`,
                followUpQuestions: [],
            }
        }
    },
    toModelOutput: (output: ExtractLearningsOutput) => ({
        type: 'content',
        value: [
            {
                type: 'text' as const,
                text: `Learning: ${output.learning}`,
            },
            output.followUpQuestions.length > 0
                ? {
                      type: 'text' as const,
                      text: `Follow-up questions:\n- ${output.followUpQuestions.join('\n- ')}`,
                  }
                : undefined,
        ].filter(
            (part): part is { type: 'text'; text: string } => Boolean(part)
        ),
    }),
    onOutput: ({ output, toolCallId, toolName }) => {
        log.info('extractLearningsTool completed', {
            toolCallId,
            toolName,
            outputData: {
                learning: output.learning,
                followUpQuestions: output.followUpQuestions,
            },
            hook: 'onOutput',
        })
    },
})

export type ExtractLearningsUITool = InferUITool<typeof extractLearningsTool>
