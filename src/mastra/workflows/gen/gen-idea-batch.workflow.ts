import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { randomGeneratorTool, writeNoteTool } from '../../tools'

const inputSchema = z.object({
    theme: z.string(),
    count: z.number().int().positive().default(5),
    saveNote: z.boolean().default(false),
})

const outputSchema = z.any()

const hasData = (value: unknown): value is { data: unknown } =>
    typeof value === 'object' && value !== null && 'data' in value

const toStringList = (value: unknown) =>
    Array.isArray(value) ? value.map((item) => String(item)) : value === null || value === undefined ? [] : [String(value)]

const ideaStep = createStep({
    id: 'gen-idea-batch',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `💡 Generating ideas for ${inputData.theme}`, stage: 'gen-idea-batch' }, id: 'gen-idea-batch' })
        const executeRandom = randomGeneratorTool.execute as NonNullable<typeof randomGeneratorTool.execute>
        const result = await executeRandom({ type: 'string', count: inputData.count, options: { length: 24 } }, { writer, requestContext, tracingContext, abortSignal })
        const ideas = toStringList(hasData(result) ? result.data : null)
        if (inputData.saveNote) {
            const executeWriteNote = writeNoteTool.execute as NonNullable<typeof writeNoteTool.execute>
            await executeWriteNote({ title: `${inputData.theme} ideas`, content: ideas.map((idea: string, index: number) => `- Idea ${index + 1}: ${idea}`).join('\n') }, { writer, requestContext, tracingContext, abortSignal })
        }
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Ideas generated', stage: 'gen-idea-batch' }, id: 'gen-idea-batch' })
        return { theme: inputData.theme, ideas, savedNote: inputData.saveNote }
    },
})

export const genIdeaBatchWorkflow = createWorkflow({
    id: 'gen-idea-batch-workflow',
    description: 'Generate a batch of idea strings for a theme',
    inputSchema,
    outputSchema,
})
    .then(ideaStep)
    .commit()
