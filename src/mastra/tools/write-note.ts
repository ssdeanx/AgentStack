import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { trace } from '@opentelemetry/api'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { z } from 'zod'
import { log } from '../config/logger'

const NOTES_DIR = path.join(process.cwd(), 'notes')

export const writeNoteTool = createTool({
    id: 'write',
    description: 'Write a new note or overwrite an existing one.',
    inputSchema: z.object({
        title: z
            .string()
            .nonempty()
            .describe('The title of the note. This will be the filename.'),
        content: z
            .string()
            .nonempty()
            .describe('The markdown content of the note.'),
    }),
    outputSchema: z.string().nonempty(),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('writeNoteTool tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('writeNoteTool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('writeNoteTool received input', {
            toolCallId,
            messageCount: messages.length,
            inputData: {
                title: input.title,
                content: input.content,
            },
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('writeNoteTool completed', {
            toolCallId,
            toolName,
            outputData: output,
            hook: 'onOutput',
        })
    },
    execute: async (inputData) => {
        const startTime = Date.now()

        // Get tracer from OpenTelemetry API
        const tracer = trace.getTracer('write-note-tool', '1.0.0')
        const span = tracer.startSpan('write-note', {
            attributes: {
                'tool.id': 'write-note',
                'tool.input.title': inputData.title,
                'tool.input.contentLength': inputData.content.length,
                'notes.dir': NOTES_DIR,
            },
        })

        try {
            const { title, content } = inputData
            const filePath = path.join(NOTES_DIR, `${title}.md`)
            await fs.mkdir(NOTES_DIR, { recursive: true })
            await fs.writeFile(filePath, content, 'utf-8')

            const result = `Successfully wrote to note "${title}".`
            span.setAttributes({
                'tool.output.success': true,
                'tool.output.filePath': filePath,
                'tool.output.processingTimeMs': Date.now() - startTime,
            })
            span.end()
            return result
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            if (error instanceof Error) {
                span.recordException(error)
            }
            span.setStatus({ code: 2, message: errorMessage }) // ERROR status
            span.setAttribute(
                'tool.output.processingTimeMs',
                Date.now() - startTime
            )
            span.end()
            return `Error writing note: ${errorMessage}`
        }
    },
})

export type WriteNoteUITool = InferUITool<typeof writeNoteTool>
