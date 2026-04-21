import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import type { ChunkType, MastraModelOutput } from '@mastra/core/stream'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import type { TracingContext } from '@mastra/core/observability'
import { z } from 'zod'
import type { RequestContext } from '@mastra/core/request-context'
import type { BaseToolRequestContext } from './request-context.utils.js'
import { copywriterAgent } from '../agents/copywriterAgent'
import { log } from '../config/logger'

type CopywriterJsonPrimitive = string | number | boolean | null
type CopywriterJsonValue =
    | CopywriterJsonPrimitive
    | CopywriterJsonObject
    | CopywriterJsonValue[]

interface CopywriterJsonObject {
    [key: string]: CopywriterJsonValue
}

export interface CopywriterRequestContext {
    mocked?: boolean // placeholder for additional options
}

log.info('Initializing Enhanced Copywriter Agent Tool...')

const copywriterToolOutputSchema = z.object({
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
})

type CopywriterToolOutput = z.infer<typeof copywriterToolOutputSchema>

const copywriterToolFallbackOutput: CopywriterToolOutput = {
    content: '',
    contentType: 'general',
    keyPoints: [],
    wordCount: 0,
}

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
    outputSchema: copywriterToolOutputSchema,
    strict: true,
    onInputStart: ({ toolCallId, messages }) => {
        log.info('copywriterTool tool input streaming started', {
            toolCallId,
            messages: messages ?? [],
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages }) => {
        log.info('copywriterTool received input chunk', {
            toolCallId,
            inputTextDelta,
            inputChunkLength: inputTextDelta.length,
            messages: messages ?? [],
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages }) => {
        log.info('copywriterTool received input', {
            toolCallId,
            messages: messages ?? [],
            inputData: {
                topic: input.topic,
                contentType: input.contentType,
                targetAudience: input.targetAudience,
                tone: input.tone,
                length: input.length,
                hasSpecificRequirements:
                    typeof input.specificRequirements === 'string' &&
                    input.specificRequirements.trim().length > 0,
            },
            hook: 'onInputAvailable',
        })
    },
    execute: async (input, context) => {
        const writer = context.writer
        const mastra = context.mastra
        const tracingContext: TracingContext | undefined =
            context.tracingContext
        const userId =
            (context.requestContext as RequestContext<BaseToolRequestContext> | undefined)
                ?.all.userId
        const workspaceId =
            (context.requestContext as RequestContext<BaseToolRequestContext> | undefined)
                ?.all.workspaceId
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

        const span = getOrCreateSpan({
            type: SpanType.AGENT_RUN,
            name: 'copywriter-generate',
            input: {
                topic,
                contentType,
                targetAudience,
                tone,
                length,
            },
            requestContext: context.requestContext,
            tracingContext,
            metadata: {
                'tool.id': 'copywriter-agent',
                'user.id': userId,
                'workspace.id': workspaceId,
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
                    ...copywriterToolFallbackOutput,
                    content: `Unable to generate content: copywriterAgent is not available.`,
                    contentType,
                }
            }

            // Build the prompt with context
            let prompt = `Create ${length} ${contentType} content about: ${topic}`

            if (typeof userId === 'string' && userId.trim().length > 0) {
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
                    const stream = await agent.stream(prompt, {
                        structuredOutput: {
                            schema: copywriterToolOutputSchema,
                        },
                        onChunk: (chunk: ChunkType<CopywriterToolOutput>) => {
                            if (
                                chunk.type === 'text-delta' &&
                                typeof chunk.payload?.text === 'string'
                            ) {
                                contentText += chunk.payload.text
                            }
                        },
                    }) as MastraModelOutput<CopywriterToolOutput>

                    if (stream.textStream && writer) {
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
                            writer as WritableStream
                        )
                    } else if (stream.fullStream && writer) {
                        await writer?.custom({
                            type: 'data-tool-progress',
                            transient: true,
                            data: {
                                status: 'in-progress',
                                message:
                                    '🔁 Streaming from copywriter agent (full stream)',
                                stage: 'copywriter-agent',
                            },
                            id: 'copywriter-agent',
                        })
                        await stream.fullStream.pipeTo(writer as WritableStream)
                    }

                    const structured = await stream.object
                    if (structured && typeof structured.content === 'string') {
                        contentText = structured.content
                    } else {
                        contentText = (await stream.text) ?? contentText
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
                const response = await agent.generate(prompt, {
                    structuredOutput: {
                        schema: copywriterToolOutputSchema,
                    },
                })
                if (
                    response.object &&
                    typeof response.object.content === 'string'
                ) {
                    contentText = response.object.content
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
            const title = titleMatch ? titleMatch[1] : null

            // Create a simple summary from the first paragraph or first few sentences
            const firstParagraph =
                content.split('\n\n')[0] ?? content.split('\n')[0] ?? ''
            const summary =
                firstParagraph.length > 200
                    ? firstParagraph.substring(0, 200) + '...'
                    : firstParagraph

            span?.update({
                output: {
                    content,
                    contentType,
                    wordCount,
                    ...(title ? { title } : {}),
                    ...(summary ? { summary } : {}),
                },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.wordCount': wordCount,
                    'tool.output.contentLength': content.length,
                },
            })
            span?.end()

            return {
                content,
                contentType,
                ...(title ? { title } : {}),
                ...(summary ? { summary } : {}),
                keyPoints: [],
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

            return {
                ...copywriterToolFallbackOutput,
                content: `Failed to generate content: ${errorMsg}`,
                contentType,
            }
        }
    },
    toModelOutput: (output: CopywriterToolOutput) => ({
        type: 'content',
        value: (() => {
            const keyPoints = output.keyPoints ?? []

            return [
                ...(output.title
                    ? [
                          {
                              type: 'text' as const,
                              text: `Title: ${output.title}`,
                          },
                      ]
                    : []),
                ...(output.summary
                    ? [
                          {
                              type: 'text' as const,
                              text: `Summary: ${output.summary}`,
                          },
                      ]
                    : []),
                ...(keyPoints.length > 0
                    ? [
                          {
                              type: 'text' as const,
                              text: `Key points:\n- ${keyPoints.join('\n- ')}`,
                          },
                      ]
                    : []),
                {
                    type: 'text' as const,
                    text: output.content,
                },
            ]
        })(),
    }),
    onOutput: ({ output, toolCallId, toolName }) => {
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
            hook: 'onOutput',
        })
    },
})

// InferUITools expects a ToolSet (an object mapping ids to tools), not a single Tool.
// Provide an object with the tool id as the key to satisfy the constraint.
export type CopywriterUITool = InferUITool<typeof copywriterTool>
