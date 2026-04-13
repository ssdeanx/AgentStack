import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { createRelease, listCommits } from '../../tools'

const inputSchema = z.object({
    owner: z.string(),
    repo: z.string(),
    branch: z.string().default('main'),
    tagName: z.string(),
    releaseName: z.string().optional(),
    releaseBody: z.string().optional(),
    commitLimit: z.number().int().positive().max(100).default(20),
    createDraftRelease: z.boolean().default(false),
    prerelease: z.boolean().default(false),
})

const outputSchema = z.object({
    releaseNotes: z.object({
        tagName: z.string(),
        name: z.string().nullable(),
        body: z.string(),
        draft: z.boolean(),
        prerelease: z.boolean(),
    }),
    commits: z.object({
        count: z.number(),
        latestSha: z.string().nullable(),
        latestMessage: z.string().nullable(),
    }),
    publishedRelease: z
        .object({
            id: z.number().nullable(),
            url: z.string().nullable(),
            htmlUrl: z.string().nullable(),
        })
        .nullable(),
    summary: z.string(),
})

const releasePrepStep = createStep({
    id: 'github-release-prep',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🏷️ Preparing release ${inputData.tagName}`,
                stage: 'github-release-prep',
            },
            id: 'github-release-prep',
        })

        const executeListCommits = listCommits.execute as NonNullable<typeof listCommits.execute>
        const executeCreateRelease = createRelease.execute as NonNullable<typeof createRelease.execute>

        const commitResult = await executeListCommits(
            {
                owner: inputData.owner,
                repo: inputData.repo,
                sha: inputData.branch,
                perPage: inputData.commitLimit,
            },
            { writer, requestContext, tracingContext, abortSignal },
        )
        const commits = Array.isArray((commitResult as any).commits) ? (commitResult as any).commits : []
        const latestCommit = commits.length > 0 ? commits[0] : null
        const commitSummary = {
            count: commits.length,
            latestSha: typeof latestCommit?.sha === 'string' ? latestCommit.sha : null,
            latestMessage: typeof latestCommit?.commit?.message === 'string' ? latestCommit.commit.message : null,
        }

        const releaseBody =
            inputData.releaseBody ??
            [
                `Release ${inputData.tagName}`,
                '',
                `Commits included: ${commitSummary.count}`,
                commitSummary.latestMessage ? `Latest commit: ${commitSummary.latestMessage}` : 'Latest commit: unavailable',
            ].join('\n')

        let publishedRelease: z.infer<typeof outputSchema>['publishedRelease'] = null
        if (inputData.createDraftRelease) {
            const releaseResult = await executeCreateRelease(
                {
                    owner: inputData.owner,
                    repo: inputData.repo,
                    tagName: inputData.tagName,
                    name: inputData.releaseName,
                    body: releaseBody,
                    draft: true,
                    prerelease: inputData.prerelease,
                },
                { writer, requestContext, tracingContext, abortSignal },
            )

            const releaseSource = (releaseResult as any).release ?? releaseResult ?? {}
            publishedRelease = {
                id: typeof releaseSource.id === 'number' ? releaseSource.id : null,
                url: typeof releaseSource.url === 'string' ? releaseSource.url : null,
                htmlUrl: typeof releaseSource.htmlUrl === 'string' ? releaseSource.htmlUrl : null,
            }
        }

        const summary = [
            `release ${inputData.tagName}`,
            `${commitSummary.count} commits reviewed`,
            inputData.createDraftRelease ? 'draft release created' : 'release payload prepared only',
        ].join(' • ')

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ Release prep complete for ${inputData.tagName}`,
                stage: 'github-release-prep',
            },
            id: 'github-release-prep',
        })

        return {
            releaseNotes: {
                tagName: inputData.tagName,
                name: inputData.releaseName ?? null,
                body: releaseBody,
                draft: inputData.createDraftRelease,
                prerelease: inputData.prerelease,
            },
            commits: commitSummary,
            publishedRelease,
            summary,
        }
    },
})

export const githubReleasePrepWorkflow = createWorkflow({
    id: 'github-release-prep-workflow',
    description: 'Prepare release notes and optionally create a draft GitHub release',
    inputSchema,
    outputSchema,
})
    .then(releasePrepStep)
    .commit()
