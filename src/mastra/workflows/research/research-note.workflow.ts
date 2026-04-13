import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { writeNoteTool } from '../../tools'

const inputSchema = z.object({
    title: z.string(),
    content: z.string(),
})

const outputSchema = z.any()

const researchNoteStep = createStep({
    id: 'research-note',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `📝 Writing research note: ${inputData.title}`, stage: 'research-note' }, id: 'research-note' })
        const executeWriteNote = writeNoteTool.execute as NonNullable<typeof writeNoteTool.execute>
        const result = await executeWriteNote(inputData, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Research note written', stage: 'research-note' }, id: 'research-note' })
        return result
    },
})

export const researchNoteWorkflow = createWorkflow({
    id: 'research-note-workflow',
    description: 'Save research notes into the workspace',
    inputSchema,
    outputSchema,
})
    .then(researchNoteStep)
    .commit()
