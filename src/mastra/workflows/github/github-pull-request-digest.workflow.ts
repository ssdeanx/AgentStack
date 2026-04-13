import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { getPullRequest, listCommits } from '../../tools'

const inputSchema = z.object({
    owner: z.string(),
    repo: z.string(),
    pullNumber: z.number().int().positive(),
    includeCommits: z.boolean().default(true),
    commitLimit: z.number().int().positive().max(100).default(10),
})

const outputSchema = z.object({
    pullRequest: z.object({
        number: z.number(),
        title: z.string(),
        state: z.string(),
        draft: z.boolean(),
        merged: z.boolean(),
        url: z.string(),
        headRef: z.string().nullable(),
        baseRef: z.string().nullable(),
        author: z.string().nullable(),
        additions: z.number().nullable(),
        deletions: z.number().nullable(),
        changedFiles: z.number().nullable(),
    }),
    commits: z
        .object({
            count: z.number(),
            latestSha: z.string().nullable(),
            latestMessage: z.string().nullable(),
        })
        .optional(),
    summary: z.string(),
})

const pullRequestDigestStep = createStep({
    id: 'github-pull-request-digest',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔀 Loading pull request #${inputData.pullNumber}`,
                stage: 'github-pull-request-digest',
            },
            id: 'github-pull-request-digest',
        })

        const executeGetPullRequest = getPullRequest.execute as NonNullable<typeof getPullRequest.execute>
        const executeListCommits = listCommits.execute as NonNullable<typeof listCommits.execute>

        const pullRequestResult = await executeGetPullRequest(
            {
                owner: inputData.owner,
                repo: inputData.repo,
                pullNumber: inputData.pullNumber,
            },
            { writer, requestContext, tracingContext, abortSignal },
        )

        const pullRequestSource = (pullRequestResult as any).pullRequest ?? pullRequestResult ?? {}
        const headRef = typeof pullRequestSource.head?.ref === 'string' ? pullRequestSource.head.ref : typeof pullRequestSource.head?.sha === 'string' ? pullRequestSource.head.sha : null
        const baseRef = typeof pullRequestSource.base?.ref === 'string' ? pullRequestSource.base.ref : typeof pullRequestSource.base?.sha === 'string' ? pullRequestSource.base.sha : null
        let commitSummary:
            | {
                  count: number
                  latestSha: string | null
                  latestMessage: string | null
              }
            | undefined

        if (inputData.includeCommits && headRef) {
            const commitResult = await executeListCommits(
                {
                    owner: inputData.owner,
                    repo: inputData.repo,
                    sha: headRef,
                    perPage: inputData.commitLimit,
                },
                { writer, requestContext, tracingContext, abortSignal },
            )

            const commits = Array.isArray((commitResult as any).commits) ? (commitResult as any).commits : []
            const latestCommit = commits.length > 0 ? commits[0] : null
            commitSummary = {
                count: commits.length,
                latestSha: typeof latestCommit?.sha === 'string' ? latestCommit.sha : null,
                latestMessage: typeof latestCommit?.commit?.message === 'string' ? latestCommit.commit.message : null,
            }
        }

        const pullRequest = {
            number: typeof pullRequestSource.number === 'number' ? pullRequestSource.number : inputData.pullNumber,
            title: typeof pullRequestSource.title === 'string' ? pullRequestSource.title : `Pull request #${inputData.pullNumber}`,
            state: typeof pullRequestSource.state === 'string' ? pullRequestSource.state : 'unknown',
            draft: pullRequestSource.draft === true,
            merged: pullRequestSource.merged === true,
            url: typeof pullRequestSource.url === 'string' ? pullRequestSource.url : null,
            headRef,
            baseRef,
            author: typeof pullRequestSource.user?.login === 'string' ? pullRequestSource.user.login : null,
            additions: typeof pullRequestSource.additions === 'number' ? pullRequestSource.additions : null,
            deletions: typeof pullRequestSource.deletions === 'number' ? pullRequestSource.deletions : null,
            changedFiles: typeof pullRequestSource.changed_files === 'number' ? pullRequestSource.changed_files : null,
        }

        const summary = [
            `${pullRequest.title}`,
            `head ${pullRequest.headRef ?? 'unknown'} → base ${pullRequest.baseRef ?? 'unknown'}`,
            commitSummary ? `${commitSummary.count} commits` : 'commit list skipped',
        ].join(' • ')

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ Pull request digest ready for #${inputData.pullNumber}`,
                stage: 'github-pull-request-digest',
            },
            id: 'github-pull-request-digest',
        })

        return {
            pullRequest,
            commits: commitSummary,
            summary,
        }
    },
})

export const githubPullRequestDigestWorkflow = createWorkflow({
    id: 'github-pull-request-digest-workflow',
    description: 'Summarize a pull request with optional commit context',
    inputSchema,
    outputSchema,
})
    .then(pullRequestDigestStep)
    .commit()
