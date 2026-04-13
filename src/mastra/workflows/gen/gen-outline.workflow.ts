import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { randomGeneratorTool, writeNoteTool } from '../../tools'

const inputSchema = z.object({
    title: z.string(),
    sections: z.number().int().positive().default(4),
    saveNote: z.boolean().default(true),
})

const outputSchema = z.any()

const toStringList = (value: unknown): string[] =>
    Array.isArray(value) ? value.map((item) => String(item)) : value == null ? [] : [String(value)]

const outlineStep = createStep({
    id: 'gen-outline',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🧱 Creating an outline for ${inputData.title}`, stage: 'gen-outline' }, id: 'gen-outline' })
        const executeRandom = randomGeneratorTool.execute as any
        const sectionTitles = await executeRandom({ type: 'string', count: inputData.sections, options: { length: 18 } }, { writer, requestContext, tracingContext, abortSignal })
        const outline: string[] = toStringList(sectionTitles?.data)
        if (inputData.saveNote) {
            const executeWriteNote = writeNoteTool.execute as NonNullable<typeof writeNoteTool.execute>
            await executeWriteNote({ title: `${inputData.title} outline`, content: outline.map((section: string, index: number) => `## Section ${index + 1}\n${section}`).join('\n\n') }, { writer, requestContext, tracingContext, abortSignal })
        }
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Outline generated', stage: 'gen-outline' }, id: 'gen-outline' })
        return { title: inputData.title, outline, savedNote: inputData.saveNote }
    },
})

export const genOutlineWorkflow = createWorkflow({
    id: 'gen-outline-workflow',
    description: 'Generate a structured outline and optionally save it',
    inputSchema,
    outputSchema,
})
    .then(outlineStep)
    .commit()
