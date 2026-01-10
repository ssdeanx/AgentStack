import { SpanType } from '@mastra/core/observability'
import type { MastraModelOutput } from '@mastra/core/stream'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import type { RequestContext } from '@mastra/core/request-context'
import { copywriterAgent } from '../agents/copywriterAgent'
import { log } from '../config/logger'

export interface CopywriterRequestContext extends RequestContext {
    userId?: string
}

log.info('Initializing Enhanced Copywriter Agent Tool...')

export const copywriterTool = createTool({
    id: 'copywriter-agent',
    description:
        'Calls the copywriter agent to create engaging, high-quality content across multiple formats including blog posts, marketing copy, social media content, technical writing, and business communications.',
    inputSchema: z.object({
        topic: z.string().describe('The main topic or subject for the content'),
        contentType: z
            .enum([
                'blog',
                'marketing',
                'social',
                'technical',
                'business',
                'creative',
                'general',
            ])
            .optional()
            .describe("The type of content to create (defaults to 'blog')"),
        targetAudience: z
            .string()
            .optional()
            .describe('The intended audience for the content'),
        tone: z
            .enum([
                'professional',
                'casual',
                'formal',
                'engaging',
                'persuasive',
                'educational',
            ])
            .optional()
            .describe('Desired tone for the content'),
        length: z
            .enum(['short', 'medium', 'long'])
            .optional()
            .describe("Approximate content length (defaults to 'medium')"),
        specificRequirements: z
            .string()
            .optional()
            .describe('Any specific requirements, guidelines, or focus areas'),
    }),
    outputSchema: z.object({
        content: z.string().describe('The created content in markdown format'),
        contentType: z.string().describe('The type of content created'),
        title: z
            .string()
            .optional()
            .describe('Suggested title for the content'),
        summary: z.string().optional().describe('Brief summary of the content'),
        keyPoints: z
            .array(z.string())
            .optional()
            .describe('Key points or takeaways from the content'),
        wordCount: z
            .number()
            .optional()
            .describe('Approximate word count of the content'),
    }),
    execute: async (input, context) => {
        const writer = context?.writer
        const mastra = context?.mastra
        const tracingContext = context?.tracingContext
        const requestCtx = context?.requestContext as CopywriterRequestContext | undefined

        const userId =
            typeof requestCtx?.userId === 'string' && requestCtx.userId.trim().length > 0
                ? requestCtx.userId
                : 'anonymous'
        const {
            topic,
            contentType = 'blog',
            targetAudience,
            tone,
            length = 'medium',
            specificRequirements,
        } = input

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `✍️ Starting copywriter agent for ${contentType} about "${topic}"`,
                stage: 'copywriter-agent',
            },
            id: 'copywriter-agent',
        })

        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'copywriter-generate',
            input: {
                topic,
                contentType,
                targetAudience,
                tone,
                length,
            },
            metadata: {
                'tool.id': 'copywriter-agent',
                'user.id': requestCtx?.userId,
            },
        })

        try {
            const agent =
                mastra?.getAgent?.('copywriterAgent') ?? copywriterAgent

            // Validate agent has an invocation method (generate or stream).
            if (
                typeof agent.generate !== 'function' &&
                typeof agent.stream !== 'function'
            ) {
                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message:
                            'Copywriter agent is not available in this runtime.',
                        stage: 'copywriter-agent',
                    },
                    id: 'copywriter-agent',
                })

                return {
                    content: `Unable to generate content: copywriterAgent is not available.`,
                    contentType,
                    title: undefined,
                    summary: undefined,
                    keyPoints: [],
                    wordCount: 0,
                }
            }

            // Build the prompt with context
            let prompt = `Create ${length} ${contentType} content about: ${topic}`

            if (userId !== undefined) {
                prompt += `\n\nUser: ${userId}`
            }

            if (
                typeof targetAudience === 'string' &&
                targetAudience.trim().length > 0
            ) {
                prompt += `\n\nTarget audience: ${targetAudience}`
            }

            if (typeof tone === 'string' && tone.trim().length > 0) {
                prompt += `\n\nDesired tone: ${tone}`
            }

            if (
                typeof specificRequirements === 'string' &&
                specificRequirements.trim().length > 0
            ) {
                prompt += `\n\nSpecific requirements: ${specificRequirements}`
            }

            // Add content type specific guidance
            switch (contentType) {
                case 'blog':
                    prompt +=
                        '\n\nCreate a well-structured blog post with engaging introduction, body sections, and conclusion.'
                    break
                case 'marketing':
                    prompt +=
                        '\n\nCreate persuasive marketing copy that highlights benefits and includes clear calls-to-action.'
                    break
                case 'social':
                    prompt +=
                        '\n\nCreate concise, engaging social media content optimized for sharing and engagement.'
                    break
                case 'technical':
                    prompt +=
                        '\n\nCreate clear, accurate technical content with proper explanations and examples.'
                    break
                case 'business':
                    prompt +=
                        '\n\nCreate professional business communication with clear objectives and actionable content.'
                    break
                case 'creative':
                    prompt +=
                        '\n\nCreate engaging creative content with storytelling elements and vivid language.'
                    break
                case 'general': {
                    throw new Error('Not implemented yet: "general" case')
                }
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: '🤖 Generating content...',
                    stage: 'copywriter-agent',
                },
                id: 'copywriter-agent',
            })

            let contentText = ''
            if (typeof agent.stream === 'function') {
                try {
                    await writer?.custom({
                        type: 'data-tool-progress',
                        data: {
                            status: 'in-progress',
                            message:
                                '🔁 Streaming content from copywriter agent',
                            stage: 'copywriter-agent',
                        },
                        id: 'copywriter-agent',
                    })
                    const stream = (await agent.stream(prompt)) as
                        | MastraModelOutput
                        | undefined

                    if (stream?.textStream && writer) {
                        await writer?.custom({
                            type: 'data-tool-progress',
                            data: {
                                status: 'in-progress',
                                message:
                                    '🔁 Streaming text from copywriter agent',
                                stage: 'copywriter-agent',
                            },
                            id: 'copywriter-agent',
                        })
                        await stream.textStream.pipeTo(
                            writer as unknown as WritableStream
                        )
                    } else if (stream?.fullStream && writer) {
                        await writer?.custom({
                            type: 'data-tool-progress',
                            data: {
                                status: 'in-progress',
                                message:
                                    '🔁 Streaming from copywriter agent (full stream)',
                                stage: 'copywriter-agent',
                            },
                            id: 'copywriter-agent',
                        })
                        await stream.fullStream.pipeTo(
                            writer as unknown as WritableStream
                        )
                    }

                    const text = (await stream?.text) ?? ''
                    const responseObject =
                        stream?.object ??
                        (() => {
                            try {
                                return JSON.parse(text)
                            } catch {
                                return {}
                            }
                        })()

                    if (
                        Boolean(responseObject) &&
                        typeof responseObject === 'object'
                    ) {
                        const obj = responseObject as Record<string, unknown>
                        const contentVal = obj.content
                        if (typeof contentVal === 'string') {
                            contentText = contentVal
                        } else {
                            contentText = text
                        }
                    } else {
                        contentText = text
                    }
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err)
                    span?.error({
                        error: err instanceof Error ? err : new Error(msg),
                        endSpan: true,
                    })
                    await writer?.custom({
                        type: 'data-tool-progress',
                        data: {
                            status: 'done',
                            message: `❌ Error generating content: ${msg}`,
                            stage: 'copywriter-agent',
                        },
                        id: 'copywriter-agent',
                    })
                    throw err
                }
            } else {
                const response = await agent.generate(prompt)
                const responseObject =
                    response.object ??
                    (() => {
                        try {
                            return JSON.parse(response.text)
                        } catch {
                            return undefined
                        }
                    })()
                const obj = responseObject as
                    | Record<string, unknown>
                    | undefined
                if (obj && typeof obj.content === 'string') {
                    contentText = obj.content
                } else {
                    contentText = response.text
                }
            }

            // Final progress 'done' event
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: '✅ Content generated',
                    stage: 'copywriter-agent',
                },
                id: 'copywriter-agent',
            })

            // Parse and structure the response
            const content = contentText
            const wordCount = content.split(/\s+/).length

            // Extract title if present (look for # or ## at start)
            const titleMatch = /^#{1,2}\s+(.+)$/m.exec(content)
            const title = titleMatch ? titleMatch[1] : undefined

            // Create a simple summary from the first paragraph or first few sentences
            const firstParagraph =
                content.split('\n\n')[0] ?? content.split('\n')[0] ?? ''
            const summary =
                firstParagraph.length > 200
                    ? firstParagraph.substring(0, 200) + '...'
                    : firstParagraph

            span?.update({
                output: { content, contentType, title, wordCount },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.wordCount': wordCount,
                    'tool.output.contentLength': content.length,
                }
            })
            span?.end()

            return {
                content,
                contentType,
                title,
                summary,
                keyPoints: [], // Could be enhanced to extract key points
                wordCount,
            }
        } catch (error) {
            const errorMsg =
                error instanceof Error ? error.message : 'Unknown error'
            log.error('Copywriter agent tool error:', {
                error: errorMsg,
                topic,
                contentType,
            })
            span?.error({
                error: error instanceof Error ? error : new Error(errorMsg),
                endSpan: true,
            })
            throw new Error(`Failed to generate content: ${errorMsg}`)
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('copywriterTool tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('copywriterTool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('copywriterTool received input', {
            toolCallId,
            messageCount: messages.length,
            inputData: {
                topic: input.topic,
                contentType: input.contentType,
                targetAudience: input.targetAudience,
                tone: input.tone,
                length: input.length,
                specificRequirements: input.specificRequirements,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('copywriterTool completed', {
            toolCallId,
            toolName,
            outputData: {
                content: output.content,
                title: output.title,
                summary: output.summary,
                keyPoints: output.keyPoints,
                wordCount: output.wordCount,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

// InferUITools expects a ToolSet (an object mapping ids to tools), not a single Tool.
// Provide an object with the tool id as the key to satisfy the constraint.
export type CopywriterUITool = InferUITool<typeof copywriterTool>
