import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { randomGeneratorTool } from '../../tools'

const inputSchema = z.object({
    count: z.number().int().positive().default(5),
})

const outputSchema = z.any()

const toStringList = (value: unknown): string[] =>
    Array.isArray(value) ? value.map((item) => String(item)) : value === null ? [] : [String(value)]

const identifierStep = createStep({
    id: 'gen-identifier-pack',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🪪 Generating ${inputData.count} identifier(s)`, stage: 'gen-identifier-pack' }, id: 'gen-identifier-pack' })
        const executeRandom = randomGeneratorTool.execute as any
        const uuids = await executeRandom({ type: 'uuid', count: inputData.count }, { writer, requestContext, tracingContext, abortSignal })
        const names = await executeRandom({ type: 'name', count: inputData.count }, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Identifiers generated', stage: 'gen-identifier-pack' }, id: 'gen-identifier-pack' })
        return { uuids: toStringList(uuids?.data), names: toStringList(names?.data) }
    },
})

export const genIdentifierPackWorkflow = createWorkflow({
    id: 'gen-identifier-pack-workflow',
    description: 'Generate identifier packs for testing or prototyping',
    inputSchema,
    outputSchema,
})
    .then(identifierStep)
    .commit()
