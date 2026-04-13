import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { getFileContent, getRepoFileTree, searchCode } from '../../tools'

const inputSchema = z.object({
    owner: z.string(),
    repo: z.string(),
    branch: z.string().default('main'),
    query: z.string(),
    filePath: z.string().optional(),
})

const treeSchema = z.object({
    owner: z.string(),
    repo: z.string(),
    branch: z.string(),
    query: z.string(),
    filePath: z.string().optional(),
    tree: z.any(),
})

const searchSchema = treeSchema.extend({
    search: z.any(),
})

const outputSchema = searchSchema.extend({
    file: z.any(),
    chosenPath: z.string().optional(),
})

const treeStep = createStep({
    id: 'reference-tree',
    inputSchema,
    outputSchema: treeSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🌳 Loading file tree for ${inputData.owner}/${inputData.repo}`, stage: 'reference-tree' }, id: 'reference-tree' })
        if (abortSignal?.aborted === true) throw new Error('Reference search cancelled')

        const executeGetRepoFileTree = getRepoFileTree.execute as NonNullable<typeof getRepoFileTree.execute>
        const tree = await executeGetRepoFileTree({ owner: inputData.owner, repo: inputData.repo, branch: inputData.branch, recursive: true }, { writer, requestContext, tracingContext, abortSignal })

        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ File tree loaded', stage: 'reference-tree' }, id: 'reference-tree' })

        return {
            owner: inputData.owner,
            repo: inputData.repo,
            branch: inputData.branch,
            query: inputData.query,
            filePath: inputData.filePath,
            tree,
        }
    },
})

const searchStep = createStep({
    id: 'reference-search',
    inputSchema: treeSchema,
    outputSchema: searchSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🔍 Searching code for ${inputData.query}`, stage: 'reference-search' }, id: 'reference-search' })
        if (abortSignal?.aborted === true) throw new Error('Reference search cancelled')

        const executeSearchCode = searchCode.execute as NonNullable<typeof searchCode.execute>
        const search = await executeSearchCode({ query: inputData.query, repo: `${inputData.owner}/${inputData.repo}`, perPage: 10 }, { writer, requestContext, tracingContext, abortSignal })

        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Search results loaded', stage: 'reference-search' }, id: 'reference-search' })

        return {
            ...inputData,
            search,
        }
    },
})

const fileStep = createStep({
    id: 'reference-file',
    inputSchema: searchSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        const searchResults = inputData.search?.results ?? []
        const chosenPath = inputData.filePath ?? searchResults[0]?.path ?? searchResults[0]?.name

        if (!chosenPath) {
            await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: 'ℹ️ No file path was selected for retrieval', stage: 'reference-file' }, id: 'reference-file' })
            return { ...inputData, file: { success: true, content: undefined }, chosenPath: undefined }
        }

        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `📄 Loading file content for ${chosenPath}`, stage: 'reference-file' }, id: 'reference-file' })

        const executeGetFileContent = getFileContent.execute as NonNullable<typeof getFileContent.execute>
        const file = await executeGetFileContent({ owner: inputData.owner, repo: inputData.repo, path: chosenPath, ref: inputData.branch }, { writer, requestContext, tracingContext, abortSignal })

        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ File content loaded', stage: 'reference-file' }, id: 'reference-file' })

        return { ...inputData, file, chosenPath }
    },
})

export const codingReferenceSearchWorkflow = createWorkflow({
    id: 'coding-reference-search-workflow',
    description: 'Search a repository and fetch the most relevant file content',
    inputSchema,
    outputSchema,
})
    .then(treeStep)
    .then(searchStep)
    .then(fileStep)
    .commit()
