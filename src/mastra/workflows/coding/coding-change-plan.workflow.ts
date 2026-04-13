import { createStep, createWorkflow } from '@mastra/core/workflows'
import path from 'node:path'
import { z } from 'zod'
import { gitDiffTool, gitStatusTool } from '../../tools'
import { mainFilesystem } from '../../workspaces'

const inputSchema = z.object({
    repoPath: z.string().optional(),
    target: z.string().optional(),
})

const outputSchema = z.object({
    filesChanged: z.number(),
    diffSize: z.number(),
    changeScore: z.number(),
    recommendation: z.string(),
    status: z.any(),
    diff: z.any(),
})

const resolveRepoPath = (repoPath?: string) => path.resolve(mainFilesystem.basePath, repoPath ?? '.')

const statusStep = createStep({
    id: 'plan-status',
    inputSchema,
    outputSchema: z.any(),
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        const workspaceRepoPath = resolveRepoPath(inputData.repoPath)

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📊 Measuring repository state for ${workspaceRepoPath}`,
                stage: 'plan-status',
            },
            id: 'plan-status',
        })

        if (abortSignal?.aborted === true) {
            throw new Error('Change plan cancelled')
        }

        const executeGitStatus = gitStatusTool.execute as NonNullable<typeof gitStatusTool.execute>
        const result = await executeGitStatus(
            {
                repoPath: workspaceRepoPath,
                porcelain: false,
                branch: true,
                aheadBehind: true,
                untracked: true,
            },
            { writer, requestContext, tracingContext, abortSignal },
        )

        return result
    },
})

const diffStep = createStep({
    id: 'plan-diff',
    inputSchema,
    outputSchema: z.any(),
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        const workspaceRepoPath = resolveRepoPath(inputData.repoPath)

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔍 Measuring diff for ${workspaceRepoPath}`,
                stage: 'plan-diff',
            },
            id: 'plan-diff',
        })

        if (abortSignal?.aborted === true) {
            throw new Error('Change plan cancelled')
        }

        const executeGitDiff = gitDiffTool.execute as NonNullable<typeof gitDiffTool.execute>
        const result = await executeGitDiff(
            {
                repoPath: workspaceRepoPath,
                target: inputData.target,
                context: 3,
                stat: true,
                patch: false,
                wordDiff: false,
                ignoreWhitespace: false,
                functionContext: false,
            },
            { writer, requestContext, tracingContext, abortSignal },
        )

        return result
    },
})

const scoreStep = createStep({
    id: 'plan-score',
    inputSchema: z.object({
        'plan-status': z.any(),
        'plan-diff': z.any(),
    }),
    outputSchema: z.object({
        status: z.any(),
        diff: z.any(),
        filesChanged: z.number(),
        diffSize: z.number(),
        changeScore: z.number(),
    }),
    execute: async ({ inputData, writer }) => {
        const status = inputData['plan-status']
        const diff = inputData['plan-diff']

        const statusSource = status as Record<string, unknown>
        const diffSource = diff as Record<string, unknown>
        const filesChanged = Number(
            statusSource.filesChanged ?? statusSource.changedFiles ?? diffSource.filesChanged ?? diffSource.changed ?? 0,
        )
        const diffSize = Number(
            diffSource.diffSize ?? diffSource.linesChanged ?? diffSource.insertions ?? diffSource.deletions ?? 0,
        )

        const changeScore = Math.min(100, filesChanged * 12 + diffSize * 2)

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ Change score calculated: ${changeScore}`,
                stage: 'plan-score',
            },
            id: 'plan-score',
        })

        return { status, diff, filesChanged, diffSize, changeScore }
    },
})

const finalPlanStep = createStep({
    id: 'plan-final',
    inputSchema: scoreStep.outputSchema,
    outputSchema,
    execute: async ({ inputData, writer }) => {
        const recommendation =
            inputData.changeScore >= 80
                ? 'This change is large and should be split into smaller commits.'
                : inputData.changeScore >= 50
                  ? 'This change is moderate; review the diff carefully before committing.'
                  : 'This change looks small enough for a focused commit.'

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ Change plan ready: ${recommendation}`,
                stage: 'plan-final',
            },
            id: 'plan-final',
        })

        return {
            status: inputData.status,
            diff: inputData.diff,
            filesChanged: inputData.filesChanged,
            diffSize: inputData.diffSize,
            changeScore: inputData.changeScore,
            recommendation,
        }
    },
})

export const codingChangePlanWorkflow = createWorkflow({
    id: 'coding-change-plan-workflow',
    description: 'Analyze repository changes and generate a commit recommendation',
    inputSchema,
    outputSchema,
})
    .then(statusStep)
    .then(diffStep)
    .then(scoreStep)
    .then(finalPlanStep)
    .commit()
