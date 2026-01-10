import type { MastraModelOutput } from '@mastra/core/stream'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { SpanType } from "@mastra/core/observability";
import { z } from 'zod'
import { editorAgent } from '../agents/editorAgent'
import { log } from '../config/logger'
import type { RequestContext } from '@mastra/core/request-context'

export interface EditorAgentContext extends RequestContext {
    userId?: string
}

export const editorTool = createTool({
    id: 'editor-agent',
    description:
        'Calls the editor agent to edit and improve content across multiple formats including blog posts, technical documentation, business communications, creative writing, and general content.',
    inputSchema: z.object({
        content: z.string().describe('The content to be edited'),
        contentType: z
            .enum(['blog', 'technical', 'business', 'creative', 'general'])
            .optional()
            .describe(
                "The type of content being edited (defaults to 'general')"
            ),
        instructions: z
            .string()
            .optional()
            .describe('Specific editing instructions or focus areas'),
        tone: z
            .enum(['professional', 'casual', 'formal', 'engaging', 'technical'])
            .optional()
            .describe('Desired tone for the edited content'),
    }),
    outputSchema: z.object({
        editedContent: z.string().describe('The edited and improved content'),
        contentType: z.string().describe('The identified content type'),
        changes: z.array(z.string()).describe('List of key changes made'),
        suggestions: z
            .array(z.string())
            .optional()
            .describe('Additional suggestions for improvement'),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('editorTool tool input streaming started', {
            toolCallId,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('editorTool received input chunk', {
            toolCallId,
            inputTextDelta,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('editorTool received input', {
            toolCallId,
            inputData: {
                content: input.content,
                contentType: input.contentType,
                instructions: input.instructions,
                tone: input.tone,
            },
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('editorTool completed', {
            toolCallId,
            toolName,
            outputData: {
                editedContent: output.editedContent,
                contentType: output.contentType,
                changes: output.changes,
                suggestions: output.suggestions,
            },
            hook: 'onOutput',
        })
    },
    // Streaming: Pipe a nested agent's textStream into the tool writer so the UI
    // receives nested agent chunks while the tool is running. See:
    // https://mastra.ai/docs/streaming/tool-streaming#tool-using-an-agent
    execute: async (inputData, context) => {
        // Emit progress start
        await context?.writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '📝 Starting editor agent',
                stage: 'editor-agent',
            },
            id: 'editor-agent',
        })

        const {
            content,
            contentType = 'general',
            instructions,
            tone,
        } = inputData
        const writer = context?.writer
        const requestContext = context?.requestContext as EditorAgentContext | undefined
        const tracingContext = context?.tracingContext

        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'editor-agent',
            input: inputData,
            metadata: {
                'tool.id': 'editor-agent',
                contentType,
                tone: tone ?? 'not-specified',
                operation: 'editor-agent-run',
            },
        })

        try {
            // Direct agent usage

            // Build the prompt with context
            let prompt = `Edit the following content`
            if (contentType !== 'general') {
                prompt += ` (content type: ${contentType})`
            }
            if (tone) {
                prompt += ` with a ${tone} tone`
            }
            if (
                typeof instructions === 'string' &&
                instructions.trim().length > 0
            ) {
                prompt += `. Additional instructions: ${instructions}`
            }
            prompt += `:\n\n${content}`

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: '🤖 Generating edited content',
                    stage: 'editor-agent',
                },
                id: 'editor-agent',
            })

            // Use the agent's streaming API when available, following the Mastra nested-agent example.
            // Prefer the agent instance registered on `context.mastra` so usage is correctly
            // attributed to the running Mastra runtime; fall back to the imported agent.
            let resultText = ''
            try {
                const agent =
                    context?.mastra?.getAgent?.('editorAgent') ?? editorAgent
                const stream = (await agent.stream(prompt)) as
                    | MastraModelOutput
                    | undefined

                // Stream the agent's text stream into the tool writer so the UI receives
                // nested and merged chunks while the tool is running. This also allows
                // Mastra to aggregate usage into the tool run (see docs).
                if (stream?.textStream && writer) {
                    await context?.writer?.custom({
                        type: 'data-tool-progress',
                        data: {
                            status: 'in-progress',
                            message: '🔁 Streaming text from editor agent',
                            stage: 'editor-agent',
                        },
                        id: 'editor-agent',
                    })
                    await stream.textStream.pipeTo(
                        writer as unknown as WritableStream
                    )
                    resultText = (await stream.text) ?? ''
                } else if (stream?.fullStream && writer) {
                    // Some runtimes expose a fullStream; pipe it so nested events and
                    // structured payloads are forwarded to the tool writer.
                    await context?.writer?.custom({
                        type: 'data-tool-progress',
                        data: {
                            status: 'in-progress',
                            message:
                                '🔁 Streaming from editor agent (full stream)',
                            stage: 'editor-agent',
                        },
                        id: 'editor-agent',
                    })
                    await stream.fullStream.pipeTo(
                        writer as unknown as WritableStream
                    )
                    resultText = (await stream.text) ?? ''
                } else if (stream) {
                    // No UI writer available, but stream exists
                    resultText = (await stream.text) ?? ''
                } else {
                    // Fallback to synchronous generate using the agent instance
                    const result = await agent.generate(prompt)
                    resultText = result.text
                }
            } catch (err) {
                // Streaming/generation error — bubble up after logging
                const msg = err instanceof Error ? err.message : String(err)
                span?.error({
                    error: err instanceof Error ? err : new Error(msg),
                    endSpan: true,
                })
                throw err
            }

            // Parse the structured response from the editor agent
            let parsedResult
            try {
                parsedResult = JSON.parse(resultText)
            } catch {
                // Fallback for non-JSON responses
                parsedResult = {
                    editedContent: resultText,
                    contentType,
                    changes: ['Content edited and improved'],
                    suggestions: [],
                }
            }

            span?.update({
                output: parsedResult,
                metadata: {
                    'tool.output.success': true,
                }
            })
            span?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: '✅ Editing complete',
                    stage: 'editor-agent',
                },
                id: 'editor-agent',
            })

            return {
                editedContent:
                    parsedResult.editedContent ??
                    parsedResult.copy ??
                    resultText,
                contentType: parsedResult.contentType ?? contentType,
                changes: parsedResult.changes ?? [
                    'Content edited and improved',
                ],
                suggestions: parsedResult.suggestions ?? [],
            }
        } catch (error) {
            const errorMsg =
                error instanceof Error ? error.message : 'Unknown error'
            span?.error({
                error: error instanceof Error ? error : new Error(errorMsg),
                endSpan: true,
            })
            throw new Error(`Failed to edit content: ${errorMsg}`)
        }
    },
})

export type EditorAgentUITool = InferUITool<typeof editorTool>
