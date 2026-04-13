import { createStep, createWorkflow } from '@mastra/core/workflows'
import nodePath from 'node:path'
import { z } from 'zod'
import { getFileContent, getRepoFileTree, searchCode } from '../../tools'
import { mainFilesystem } from '../../workspaces'

const inputSchema = z.object({
    owner: z.string(),
    repo: z.string(),
    branch: z.string().default('main'),
    query: z.string(),
    filePath: z.string().optional(),
    maxResults: z.number().int().positive().max(25).default(10),
    treeDepth: z.number().int().positive().max(10).default(2),
    includeFileContent: z.boolean().default(true),
})

const outputSchema = z.object({
    tree: z.object({
        totalEntries: z.number(),
        topEntries: z.array(z.string()),
    }),
    search: z.object({
        count: z.number(),
        topMatches: z.array(z.string()),
        query: z.string(),
    }),
    file: z
        .object({
            path: z.string().nullable(),
            contentPreview: z.string().nullable(),
        })
        .nullable(),
    summary: z.string(),
})

const treeStepOutputSchema = z.object({
    tree: z.object({
        totalEntries: z.number(),
        topEntries: z.array(z.string()),
    }),
})

const searchStepOutputSchema = z.object({
    search: z.object({
        count: z.number(),
        topMatches: z.array(z.string()),
        query: z.string(),
    }),
    owner: z.string(),
    repo: z.string(),
    branch: z.string(),
    filePath: z.string().nullable(),
})

const codeContextPreviewInputSchema = z.object({
    'github-code-tree': treeStepOutputSchema,
    'github-code-search': searchStepOutputSchema,
})

const toRepoRelativePath = (value: string) => {
    const absolutePath = nodePath.isAbsolute(value) ? value : nodePath.resolve(mainFilesystem.basePath, value)
    return nodePath.relative(mainFilesystem.basePath, absolutePath).split(nodePath.sep).join('/')
}

const codeTreeStep = createStep({
    id: 'github-code-tree',
    inputSchema,
    outputSchema: treeStepOutputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🌲 Indexing files for ${inputData.owner}/${inputData.repo}`,
                stage: 'github-code-tree',
            },
            id: 'github-code-tree',
        })

        const executeFileTree = getRepoFileTree.execute as NonNullable<typeof getRepoFileTree.execute>
        const treeResult = await executeFileTree(
            {
                owner: inputData.owner,
                repo: inputData.repo,
                branch: inputData.branch,
                recursive: true,
            },
            { writer, requestContext, tracingContext, abortSignal },
        )

        const treeSource = treeResult as any
        const treeEntries = Array.isArray(treeSource.tree)
            ? treeSource.tree
            : Array.isArray(treeSource.entries)
              ? treeSource.entries
              : Array.isArray(treeSource.files)
                ? treeSource.files
                : []

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ File tree indexed for ${inputData.owner}/${inputData.repo}`,
                stage: 'github-code-tree',
            },
            id: 'github-code-tree',
        })

        return {
            tree: {
                totalEntries: treeEntries.length,
                topEntries: treeEntries.slice(0, 10).map((entry: any) => {
                    if (typeof entry === 'string') return entry
                    if (typeof entry?.path === 'string') return entry.path
                    if (typeof entry?.name === 'string') return entry.name
                    return String(entry)
                }),
            },
        }
    },
})

const codeSearchStep = createStep({
    id: 'github-code-search',
    inputSchema,
    outputSchema: searchStepOutputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔍 Searching ${inputData.query} in ${inputData.owner}/${inputData.repo}`,
                stage: 'github-code-search',
            },
            id: 'github-code-search',
        })

        const executeSearchCode = searchCode.execute as NonNullable<typeof searchCode.execute>
        const searchResult = await executeSearchCode(
            {
                query: inputData.query,
                repo: `${inputData.owner}/${inputData.repo}`,
                perPage: inputData.maxResults,
            },
            { writer, requestContext, tracingContext, abortSignal },
        )

        const searchSource = searchResult as any
        const matches = Array.isArray(searchSource.results)
            ? searchSource.results
            : Array.isArray(searchSource.items)
              ? searchSource.items
              : []

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ Code search completed for ${inputData.owner}/${inputData.repo}`,
                stage: 'github-code-search',
            },
            id: 'github-code-search',
        })

        return {
            search: {
                count: matches.length,
                topMatches: matches.slice(0, 10).map((match: any) => {
                    const path = typeof match?.path === 'string' ? match.path : typeof match?.name === 'string' ? match.name : String(match)
                    const score = typeof match?.score === 'number' ? ` (${match.score})` : ''
                    return `${path}${score}`
                }),
                query: inputData.query,
            },
            owner: inputData.owner,
            repo: inputData.repo,
            branch: inputData.branch,
            filePath: inputData.filePath ?? null,
        }
    },
})

const codePreviewStep = createStep({
    id: 'github-code-preview',
    inputSchema: codeContextPreviewInputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        const executeGetFileContent = getFileContent.execute as NonNullable<typeof getFileContent.execute>
        const tree = inputData['github-code-tree'].tree
        const search = inputData['github-code-search'].search
        const chosenPath = inputData['github-code-search'].filePath ? toRepoRelativePath(inputData['github-code-search'].filePath) : tree.topEntries[0] ?? null

        let file: z.infer<typeof outputSchema>['file'] = null

        if (chosenPath !== null) {
            const fileResult = await executeGetFileContent(
                {
                    owner: inputData['github-code-search'].owner,
                    repo: inputData['github-code-search'].repo,
                    path: chosenPath,
                    ref: inputData['github-code-search'].branch,
                },
                { writer, requestContext, tracingContext, abortSignal },
            )
            const fileSource = fileResult as any
            const content = typeof fileSource.content === 'string' ? fileSource.content : typeof fileSource.text === 'string' ? fileSource.text : null
            file = {
                path: chosenPath,
                contentPreview: content === null ? null : content.slice(0, 500),
            }
        }

        const summary = [
            `${tree.totalEntries} files indexed`,
            `${search.count} code matches`,
            file?.path ? `previewing ${file.path}` : 'no file preview selected',
        ].join(' • ')

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ Code context ready for ${inputData['github-code-search'].search.query}`,
                stage: 'github-code-preview',
            },
            id: 'github-code-preview',
        })

        return {
            tree,
            search,
            file,
            summary,
        }
    },
})

export const githubCodeContextWorkflow = createWorkflow({
    id: 'github-code-context-workflow',
    description: 'Build a GitHub code context bundle from tree, search, and file preview data',
    inputSchema,
    outputSchema,
})
    .parallel([codeTreeStep, codeSearchStep])
    .then(codePreviewStep)
    .commit()
