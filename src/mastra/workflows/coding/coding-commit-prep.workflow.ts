import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { gitCommitTool, gitDiffTool, gitStatusTool } from '../../tools'
import path from 'node:path'
import { mainFilesystem } from '../../workspaces'

const inputSchema = z.object({
    repoPath: z.string().optional(),
    commitNow: z.boolean().default(false),
    commitMessage: z.string().optional(),
})

const outputSchema = z.object({
    commitMessage: z.string(),
    commitPrepared: z.boolean(),
    committed: z.boolean(),
    commitHash: z.string().optional(),
    commitNow: z.boolean(),
    status: z.any(),
    diff: z.any(),
})

const resolveRepoPath = (repoPath?: string) => path.resolve(mainFilesystem.basePath, repoPath ?? '.')

const statusStep = createStep({
    id: 'commit-status',
    inputSchema,
    outputSchema: z.any(),
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '📊 Preparing commit from current repository state', stage: 'commit-status' }, id: 'commit-status' })
        if (abortSignal?.aborted === true) throw new Error('Commit prep cancelled')
        const executeGitStatus = gitStatusTool.execute as NonNullable<typeof gitStatusTool.execute>
        const workspaceRepoPath = resolveRepoPath(inputData.repoPath)

        const result = await executeGitStatus({ repoPath: workspaceRepoPath, porcelain: false, branch: true, aheadBehind: true, untracked: true }, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Repository state ready for commit prep', stage: 'commit-status' }, id: 'commit-status' })
        return { ...result, commitNow: inputData.commitNow, commitMessage: inputData.commitMessage }
    },
})

const diffStep = createStep({
    id: 'commit-diff',
    inputSchema,
    outputSchema: z.any(),
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🔍 Capturing diff for commit prep', stage: 'commit-diff' }, id: 'commit-diff' })
        if (abortSignal?.aborted === true) throw new Error('Commit prep cancelled')
        const executeGitDiff = gitDiffTool.execute as NonNullable<typeof gitDiffTool.execute>
        const workspaceRepoPath = resolveRepoPath(inputData.repoPath)
        const result = await executeGitDiff({ repoPath: workspaceRepoPath, context: 3, stat: true, patch: false, wordDiff: false, ignoreWhitespace: false, functionContext: false }, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Diff ready for commit prep', stage: 'commit-diff' }, id: 'commit-diff' })
        return { ...result, commitNow: inputData.commitNow, commitMessage: inputData.commitMessage }
    },
})

const prepareStep = createStep({
    id: 'commit-prepare',
    inputSchema: z.object({
        'commit-status': z.any(),
        'commit-diff': z.any(),
    }),
    outputSchema: outputSchema.omit({ status: true, diff: true }),
    execute: async ({ inputData, writer }) => {
        const status = inputData['commit-status']
        const diff = inputData['commit-diff']
        const commitNow = status?.commitNow ?? diff?.commitNow ?? false
        const commitMessageInput = status?.commitMessage ?? diff?.commitMessage
        const filesChanged = (status?.stagedFiles?.length ?? 0) + (status?.unstagedFiles?.length ?? 0) + (status?.untrackedFiles?.length ?? 0)
        const diffLines = String(diff?.diff ?? '').split('\n').length
        const commitMessage = commitMessageInput ?? `Update ${filesChanged} file${filesChanged === 1 ? '' : 's'} (${diffLines} diff lines)`

        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🧾 Preparing commit message', stage: 'commit-prepare' }, id: 'commit-prepare' })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Commit prepared: ${commitMessage}`, stage: 'commit-prepare' }, id: 'commit-prepare' })

        return {
            commitMessage,
            commitPrepared: true,
            committed: false,
            commitHash: undefined,
            commitNow,
        }
    },
})

const maybeCommitStep = createStep({
    id: 'commit-execute',
    inputSchema: outputSchema.omit({ status: true, diff: true }).extend({ commitNow: z.boolean() }),
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        if (!inputData.commitNow) {
            await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Commit execution skipped', stage: 'commit-execute' }, id: 'commit-execute' })
            return { ...inputData, status: undefined, diff: undefined, committed: false }
        }

        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `💾 Creating git commit: ${inputData.commitMessage}`, stage: 'commit-execute' }, id: 'commit-execute' })
        if (abortSignal?.aborted === true) throw new Error('Commit execution cancelled')

        const executeGitCommit = gitCommitTool.execute as NonNullable<typeof gitCommitTool.execute>

        const commitResult = await executeGitCommit(
            {
                message: inputData.commitMessage,
                amend: false,
                allowEmpty: false,
                sign: false,
                noVerify: false,
            },
            { writer, requestContext, tracingContext, abortSignal },
        )

        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Commit executed', stage: 'commit-execute' }, id: 'commit-execute' })

        const isCommitResult =
            commitResult !== null &&
            typeof commitResult === 'object' &&
            'success' in commitResult
        const committed = isCommitResult ? commitResult.success === true : false
        const commitHash =
            isCommitResult && 'commitHash' in commitResult
                ? commitResult.commitHash
                : undefined

        return {
            ...inputData,
            status: undefined,
            diff: undefined,
            committed,
            commitHash,
        }
    },
})

export const codingCommitPrepWorkflow = createWorkflow({
    id: 'coding-commit-prep-workflow',
    description: 'Prepare or create a commit from the current repository state',
    inputSchema,
    outputSchema,
})
    .parallel([statusStep, diffStep])
    .then(prepareStep)
    .then(maybeCommitStep)
    .commit()
