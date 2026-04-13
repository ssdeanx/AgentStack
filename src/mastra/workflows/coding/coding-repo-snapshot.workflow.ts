import { createStep, createWorkflow } from '@mastra/core/workflows'
import path from 'node:path'
import { z } from 'zod'
import { gitDiffTool, gitLogTool, gitStatusTool } from '../../tools'
import { mainFilesystem } from '../../workspaces'

const inputSchema = z.object({
    repoPath: z.string().optional(),
    target: z.string().optional(),
    count: z.number().int().positive().default(10),
})

const outputSchema = z.object({
    status: z.any(),
    diff: z.any(),
    log: z.any(),
    summary: z.string(),
})

const resolveRepoPath = (repoPath?: string) => path.resolve(mainFilesystem.basePath, repoPath ?? '.')

const statusStep = createStep({
    id: 'repo-status',
    inputSchema,
    outputSchema: z.any(),
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        const workspaceRepoPath = resolveRepoPath(inputData.repoPath)

        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `📊 Capturing git status for ${workspaceRepoPath}`, stage: 'repo-status' }, id: 'repo-status' })
        if (abortSignal?.aborted === true) throw new Error('Repo snapshot cancelled')
        const executeGitStatus = gitStatusTool.execute
        if (!executeGitStatus) throw new Error('gitStatusTool is not available')
        const result = await executeGitStatus({ repoPath: workspaceRepoPath, porcelain: false, branch: true, aheadBehind: true, untracked: true }, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Git status captured', stage: 'repo-status' }, id: 'repo-status' })
        return result
    },
})

const diffStep = createStep({
    id: 'repo-diff',
    inputSchema,
    outputSchema: z.any(),
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        const workspaceRepoPath = resolveRepoPath(inputData.repoPath)

        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🔍 Capturing git diff${inputData.target ? ` vs ${inputData.target}` : ''}`, stage: 'repo-diff' }, id: 'repo-diff' })
        if (abortSignal?.aborted === true) throw new Error('Repo snapshot cancelled')
        const executeGitDiff = gitDiffTool.execute
        if (!executeGitDiff) throw new Error('gitDiffTool is not available')
        const result = await executeGitDiff({ repoPath: workspaceRepoPath, target: inputData.target, context: 3, stat: true, patch: false, wordDiff: false, ignoreWhitespace: false, functionContext: false }, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Git diff captured', stage: 'repo-diff' }, id: 'repo-diff' })
        return result
    },
})

const logStep = createStep({
    id: 'repo-log',
    inputSchema,
    outputSchema: z.any(),
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        const workspaceRepoPath = resolveRepoPath(inputData.repoPath)

        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `📜 Capturing git log (${inputData.count} commits) from ${workspaceRepoPath}`, stage: 'repo-log' }, id: 'repo-log' })
        if (abortSignal?.aborted === true) throw new Error('Repo snapshot cancelled')
        const executeGitLog = gitLogTool.execute
        if (!executeGitLog) throw new Error('gitLogTool is not available')
        const result = await executeGitLog({ repoPath: workspaceRepoPath, count: inputData.count, oneline: true, graph: false, stat: false, follow: false, noMerges: false }, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Git log captured', stage: 'repo-log' }, id: 'repo-log' })
        return result
    },
})

const mergeStep = createStep({
    id: 'repo-snapshot-merge',
    inputSchema: z.object({
        'repo-status': z.any(),
        'repo-diff': z.any(),
        'repo-log': z.any(),
    }),
    outputSchema,
    execute: async ({ inputData, writer }) => {
        const status = inputData['repo-status']
        const diff = inputData['repo-diff']
        const log = inputData['repo-log']
        const summary = [
            `status:${status?.success === false ? 'failed' : 'ready'}`,
            `diff:${diff?.success === false ? 'failed' : 'ready'}`,
            `log:${log?.success === false ? 'failed' : 'ready'}`,
        ].join(' | ')

        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Repo snapshot assembled', stage: 'repo-snapshot-merge' }, id: 'repo-snapshot-merge' })

        return { status, diff, log, summary }
    },
})

export const codingRepoSnapshotWorkflow = createWorkflow({
    id: 'coding-repo-snapshot-workflow',
    description: 'Capture a streaming repository snapshot from git tools',
    inputSchema,
    outputSchema,
})
    .parallel([statusStep, diffStep, logStep])
    .then(mergeStep)
    .commit()
