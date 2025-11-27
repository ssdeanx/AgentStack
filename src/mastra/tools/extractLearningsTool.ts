import { AISpanType, InternalSpans } from '@mastra/core/ai-tracing'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { log } from '../config/logger'

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
    execute: async ({ context, mastra, writer, tracingContext }) => {
        await writer?.write({ type: 'progress', data: { message: '🧠 Extracting learnings from search result' } });
        const extractSpan = tracingContext?.currentSpan?.createChildSpan({
            type: AISpanType.TOOL_CALL,
            name: 'extract_learnings',
            input: {
                query: context.query,
                url: context.result.url,
                contentLength: context.result.content.length,
            },
            tracingPolicy: { internal: InternalSpans.TOOL }
        })

        try {
            const { query, result } = context

            if (!mastra) {
                throw new Error('Mastra instance not found')
            }
            // The Learning Extraction Agent's id is 'learning' (see agents/learningExtractionAgent.ts)
            const learningExtractionAgent = mastra.getAgent('learning')
            // Validate the agent exists and exposes the expected API
            if (
                learningExtractionAgent === null ||
                typeof (learningExtractionAgent as { generate?: unknown }).generate !== 'function'
            ) {
                throw new Error(
                    'learningExtractionAgent not found or invalid on mastra instance'
                )
            }
            log.info('Extracting learnings from search result', {
                title: result.title,
                url: result.url,
            })
            await writer?.write({ type: 'progress', data: { message: '🤖 Generating insights with learning agent' } });
            const response = await learningExtractionAgent.generate([
                {
                    role: 'user',
                    content: `The user is researching "${query}".
            Extract a key learning and generate follow-up questions from this search result:

            Title: ${result.title}
            URL: ${result.url}
            Content: ${result.content.substring(0, 8000)}...

            Respond with a JSON object containing:
            - learning: string with the key insight from the content
            - followUpQuestions: array of up to 1 follow-up question for deeper research`,
                },
            ])

            const outputSchema = z.object({
                learning: z.string(),
                followUpQuestions: z.array(z.string()).max(1),
            })

            log.info('Learning extraction response', {
                result: response.object,
            })

            const parsed = outputSchema.safeParse(response.object)

            if (!parsed.success) {
                log.warn(
                    'Learning extraction agent returned unexpected shape',
                    {
                        response: response.object,
                    }
                )
                // Safely compute lengths from the potentially unknown response.object
                const respObj = response.object as unknown
                let learningLength = 0
                let followUpQuestionsCount = 0
                if (
                    respObj !== null &&
                    respObj !== undefined &&
                    typeof respObj === 'object'
                ) {
                    const maybeLearning = (respObj as { learning?: unknown }).learning
                    if (typeof maybeLearning === 'string') {
                        learningLength = maybeLearning.length
                    }
                    const maybeFollowUpQuestions = (respObj as { followUpQuestions?: unknown }).followUpQuestions
                    if (Array.isArray(maybeFollowUpQuestions)) {
                        followUpQuestionsCount = maybeFollowUpQuestions.length
                    }
                }

                extractSpan?.end({
                    output: {
                        learningLength,
                        followUpQuestionsCount,
                    },
                    metadata: { invalidResponse: true },
                })
                await writer?.write({ type: 'progress', data: { message: '⚠️ Invalid response format from agent' } });
                return {
                    learning:
                        'Invalid response format from learning extraction agent',
                    followUpQuestions: [],
                }
            }

            extractSpan?.end({
                output: {
                    learningLength: parsed.data.learning.length,
                    followUpQuestionsCount:
                        parsed.data.followUpQuestions.length,
                },
            })
            await writer?.write({ type: 'progress', data: { message: '✅ Learnings extracted successfully' } });
            return parsed.data
        } catch (error) {
            log.error('Error extracting learnings', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            })
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            extractSpan?.end({ metadata: { error: errorMessage } })
            return {
                learning: `Error extracting information: ${errorMessage}`,
                followUpQuestions: [],
            }
        }
    },
})
