import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { writeNoteTool } from '../../tools'

const prioritySchema = z.enum(['low', 'medium', 'high', 'critical'])

const requestSchema = z.object({
    taskTitle: z.string(),
    goal: z.string(),
    context: z.string(),
    files: z.array(z.string()).default([]),
    constraints: z.array(z.string()).default([]),
    priority: prioritySchema,
    saveNote: z.boolean().default(false),
})

const outputSchema = requestSchema.extend({
    keywords: z.array(z.string()),
    fileFamilies: z.array(z.string()),
    briefMarkdown: z.string(),
    noteStatus: z.enum(['saved', 'skipped']),
    notePath: z.string().optional(),
})

const cleanText = (value: string) => value.replace(/\s+/g, ' ').trim()

const uniqueStrings = (values: string[]) =>
    Array.from(new Set(values.map(cleanText).filter((value) => value.length > 0)))

const extractKeywords = (value: string) => {
    const stopWords = new Set(['and', 'the', 'for', 'with', 'that', 'from', 'into', 'this', 'task', 'code', 'need', 'make', 'build', 'update', 'work'])
    return uniqueStrings(
        value
            .toLowerCase()
            .split(/[^a-z0-9]+/g)
            .filter((word) => word.length > 3 && !stopWords.has(word)),
    )
}

const fileFamilyFromPath = (filePath: string) => {
    const normalized = filePath.toLowerCase()
    if (normalized.includes('test')) return 'testing'
    if (normalized.includes('spec')) return 'specification'
    if (normalized.includes('doc') || normalized.endsWith('.md')) return 'documentation'
    if (normalized.includes('api')) return 'integration'
    if (normalized.includes('config')) return 'configuration'
    if (normalized.includes('component') || normalized.includes('.tsx')) return 'ui'
    if (normalized.includes('tool')) return 'tooling'
    return 'core'
}

const toFileName = (value: string) =>
    cleanText(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

const normalizeStep = createStep({
    id: 'coding-brief-normalize',
    description: 'Normalize the coding request into a reusable brief',
    inputSchema: requestSchema,
    outputSchema: outputSchema.omit({ noteStatus: true, notePath: true }),
    execute: async ({ inputData, writer }) => {
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🧭 Normalizing coding brief for ${inputData.taskTitle}`,
                stage: 'coding-brief-normalize',
            },
            id: 'coding-brief-normalize',
        })

        const files = uniqueStrings(inputData.files)
        const constraints = uniqueStrings(inputData.constraints)
        const keywords = extractKeywords([
            inputData.taskTitle,
            inputData.goal,
            inputData.context,
            ...files,
            ...constraints,
        ].join(' '))
        const fileFamilies = uniqueStrings(files.map(fileFamilyFromPath))
        const briefMarkdown = [
            `# ${cleanText(inputData.taskTitle)}`,
            '',
            `**Goal:** ${cleanText(inputData.goal)}`,
            `**Priority:** ${inputData.priority}`,
            '',
            '## Context',
            cleanText(inputData.context),
            '',
            '## Files',
            ...(files.length > 0 ? files.map((filePath) => `- ${filePath}`) : ['- none']),
            '',
            '## Constraints',
            ...(constraints.length > 0 ? constraints.map((constraint) => `- ${constraint}`) : ['- none']),
            '',
            '## Keywords',
            ...(keywords.length > 0 ? keywords.map((keyword) => `- ${keyword}`) : ['- none']),
        ].join('\n')

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ Coding brief normalized for ${inputData.taskTitle}`,
                stage: 'coding-brief-normalize',
            },
            id: 'coding-brief-normalize',
        })

        return {
            taskTitle: cleanText(inputData.taskTitle),
            goal: cleanText(inputData.goal),
            context: cleanText(inputData.context),
            files,
            constraints,
            priority: inputData.priority,
            saveNote: inputData.saveNote,
            keywords,
            fileFamilies,
            briefMarkdown,
        }
    },
})

const persistStep = createStep({
    id: 'coding-brief-persist',
    description: 'Optionally persist the brief as a markdown note',
    inputSchema: outputSchema.omit({ noteStatus: true, notePath: true }),
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        const title = `${inputData.taskTitle} brief`
        const notePath = `notes/${toFileName(title) || 'coding-brief'}.md`

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: inputData.saveNote
                    ? `📝 Saving coding brief note: ${title}`
                    : `↩️ Skipping note save for ${title}`,
                stage: 'coding-brief-persist',
            },
            id: 'coding-brief-persist',
        })

        if (abortSignal?.aborted === true) {
            throw new Error('Coding brief workflow cancelled')
        }

        if (inputData.saveNote) {
            const executeWriteNote = writeNoteTool.execute
            if (!executeWriteNote) {
                throw new Error('writeNoteTool is not available')
            }

            await executeWriteNote(
                {
                    title,
                    content: inputData.briefMarkdown,
                },
                { writer, requestContext, tracingContext, abortSignal },
            )
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: inputData.saveNote
                    ? `✅ Coding brief saved to note ${title}`
                    : `✅ Coding brief prepared without writing a note`,
                stage: 'coding-brief-persist',
            },
            id: 'coding-brief-persist',
        })

        const noteStatus: 'saved' | 'skipped' = inputData.saveNote ? 'saved' : 'skipped'

        return {
            ...inputData,
            noteStatus,
            notePath: inputData.saveNote ? notePath : undefined,
        }
    },
})

export const codingBriefWorkflow = createWorkflow({
    id: 'coding-brief-workflow',
    description: 'Normalize a coding request and optionally save the brief as a note',
    inputSchema: requestSchema,
    outputSchema,
})
    .then(normalizeStep)
    .then(persistStep)
    .commit()
