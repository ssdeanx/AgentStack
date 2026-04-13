import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { writeNoteTool } from '../../tools'

const inputSchema = z.object({
    title: z.string(),
    content: z.string(),
})

const outputSchema = z.any()

const noteStep = createStep({
    id: 'utility-note',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `📝 Writing note: ${inputData.title}`, stage: 'utility-note' }, id: 'utility-note' })
        const executeWriteNote = writeNoteTool.execute as NonNullable<typeof writeNoteTool.execute>
        const result = await executeWriteNote(inputData, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Note written', stage: 'utility-note' }, id: 'utility-note' })
        return result
    },
})

export const utilityNoteWorkflow = createWorkflow({
    id: 'utility-note-workflow',
    description: 'Write a markdown note into the workspace',
    inputSchema,
    outputSchema,
})
    .then(noteStep)
    .commit()
