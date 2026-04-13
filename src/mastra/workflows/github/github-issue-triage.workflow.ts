import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { createIssue, getIssue, listIssues } from '../../tools'

const inputSchema = z.object({
    owner: z.string(),
    repo: z.string(),
    state: z.enum(['open', 'closed', 'all']).default('open'),
    issueNumber: z.number().int().positive().optional(),
    issueLimit: z.number().int().positive().max(100).default(10),
    labels: z.array(z.string()).default([]),
    createFollowUpIssue: z.boolean().default(false),
    followUpTitle: z.string().optional(),
    followUpBody: z.string().optional(),
    assignees: z.array(z.string()).default([]),
})

const outputSchema = z.object({
    queue: z.object({
        count: z.number(),
        topIssues: z.array(
            z.object({
                number: z.number(),
                title: z.string(),
                state: z.string(),
                author: z.string(),
                url: z.string(),
                createdAt: z.string(),
                updatedAt: z.string(),
                labels: z.array(z.string()),
                comments: z.number(),
            }),
        ),
    }),
    issue: z
        .object({
            number: z.number(),
            title: z.string(),
            state: z.string(),
            author: z.string(),
            url: z.string(),
            createdAt: z.string(),
            updatedAt: z.string(),
            labels: z.array(z.string()),
            comments: z.number(),
            body: z.string().nullable(),
        })
        .nullable(),
    createdIssue: z
        .object({
            number: z.number(),
            title: z.string(),
            url: z.string(),
        })
        .nullable(),
    triage: z.object({
        priority: z.enum(['low', 'medium', 'high']),
        summary: z.string(),
        recommendation: z.string(),
    }),
})

const queueStepOutputSchema = z.object({
    queue: z.object({
        count: z.number(),
        topIssues: z.array(
            z.object({
                number: z.number(),
                title: z.string(),
                state: z.string(),
                author: z.string(),
                url: z.string(),
                createdAt: z.string(),
                updatedAt: z.string(),
                labels: z.array(z.string()),
                comments: z.number(),
            }),
        ),
    }),
    owner: z.string(),
    repo: z.string(),
    state: z.enum(['open', 'closed', 'all']),
    labels: z.array(z.string()),
    createFollowUpIssue: z.boolean(),
    followUpTitle: z.string().optional(),
    followUpBody: z.string().optional(),
    assignees: z.array(z.string()),
    issueLimit: z.number(),
    issueNumber: z.number().int().positive().optional(),
})

const issueStepOutputSchema = z.object({
    issue: z
        .object({
            number: z.number(),
            title: z.string(),
            state: z.string(),
            author: z.string(),
            url: z.string(),
            createdAt: z.string(),
            updatedAt: z.string(),
            labels: z.array(z.string()),
            comments: z.number(),
            body: z.string().nullable(),
        })
        .nullable(),
})

const followUpInputSchema = z.object({
    'github-issue-queue': queueStepOutputSchema,
    'github-issue-detail': issueStepOutputSchema,
})

const issueQueueStep = createStep({
    id: 'github-issue-queue',
    inputSchema,
    outputSchema: queueStepOutputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🧭 Loading issue queue for ${inputData.owner}/${inputData.repo}`,
                stage: 'github-issue-queue',
            },
            id: 'github-issue-queue',
        })

        const executeListIssues = listIssues.execute as NonNullable<typeof listIssues.execute>
        const issueQueueResult = await executeListIssues(
            {
                owner: inputData.owner,
                repo: inputData.repo,
                state: inputData.state,
                labels: inputData.labels.length > 0 ? inputData.labels.join(',') : undefined,
                perPage: inputData.issueLimit,
            },
            { writer, requestContext, tracingContext, abortSignal },
        )

        const queueIssues = Array.isArray((issueQueueResult as any).issues) ? (issueQueueResult as any).issues : []
        const queue = {
            count: queueIssues.length,
            topIssues: queueIssues.slice(0, 5),
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ Issue queue ready for ${inputData.owner}/${inputData.repo}`,
                stage: 'github-issue-queue',
            },
            id: 'github-issue-queue',
        })

        return {
            queue,
            owner: inputData.owner,
            repo: inputData.repo,
            state: inputData.state,
            labels: inputData.labels,
            createFollowUpIssue: inputData.createFollowUpIssue,
            followUpTitle: inputData.followUpTitle,
            followUpBody: inputData.followUpBody,
            assignees: inputData.assignees,
            issueLimit: inputData.issueLimit,
            issueNumber: inputData.issueNumber,
        }
    },
})

const issueDetailStep = createStep({
    id: 'github-issue-detail',
    inputSchema,
    outputSchema: issueStepOutputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        if (inputData.issueNumber === undefined) {
            return { issue: null }
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔍 Loading issue #${inputData.issueNumber}`,
                stage: 'github-issue-detail',
            },
            id: 'github-issue-detail',
        })

        const executeGetIssue = getIssue.execute as NonNullable<typeof getIssue.execute>
        const issueResult = await executeGetIssue(
            {
                owner: inputData.owner,
                repo: inputData.repo,
                issueNumber: inputData.issueNumber,
            },
            { writer, requestContext, tracingContext, abortSignal },
        )

        const issueSource = (issueResult as any).issue ?? issueResult ?? {}
        const issue = {
            number: typeof issueSource.number === 'number' ? issueSource.number : inputData.issueNumber,
            title: typeof issueSource.title === 'string' ? issueSource.title : `Issue #${inputData.issueNumber}`,
            state: typeof issueSource.state === 'string' ? issueSource.state : inputData.state,
            author: typeof issueSource.author === 'string' ? issueSource.author : 'unknown',
            url: typeof issueSource.url === 'string' ? issueSource.url : '',
            createdAt: typeof issueSource.createdAt === 'string' ? issueSource.createdAt : new Date().toISOString(),
            updatedAt: typeof issueSource.updatedAt === 'string' ? issueSource.updatedAt : new Date().toISOString(),
            labels: Array.isArray(issueSource.labels) ? issueSource.labels.map((label: unknown) => String(label)) : [],
            comments: typeof issueSource.comments === 'number' ? issueSource.comments : 0,
            body: typeof issueSource.body === 'string' ? issueSource.body : null,
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ Issue detail ready for #${inputData.issueNumber}`,
                stage: 'github-issue-detail',
            },
            id: 'github-issue-detail',
        })

        return { issue }
    },
})

const issueFollowUpStep = createStep({
    id: 'github-issue-follow-up',
    inputSchema: followUpInputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        const queue = inputData['github-issue-queue'].queue
        const issue = inputData['github-issue-detail'].issue

        const priority: 'low' | 'medium' | 'high' =
            issue === null
                ? 'low'
                : issue.labels.some((label) => /urgent|critical|blocker/i.test(label))
                  ? 'high'
                  : issue.comments >= 5
                    ? 'medium'
                    : 'low'

        const summary = issue
            ? `${issue.title} (${issue.state}) with ${issue.comments} comments`
            : `${queue.count} issues in the ${inputData['github-issue-queue'].state} queue`

        let createdIssue: z.infer<typeof outputSchema>['createdIssue'] = null
        if (inputData['github-issue-queue'].createFollowUpIssue) {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `📝 Creating follow-up issue for ${inputData['github-issue-queue'].owner}/${inputData['github-issue-queue'].repo}`,
                    stage: 'github-issue-follow-up',
                },
                id: 'github-issue-follow-up',
            })

            const executeCreateIssue = createIssue.execute as NonNullable<typeof createIssue.execute>
            const followUpTitle =
                inputData['github-issue-queue'].followUpTitle ??
                `Follow-up: ${issue?.title ?? `${inputData['github-issue-queue'].owner}/${inputData['github-issue-queue'].repo} triage`}`
            const followUpBody =
                inputData['github-issue-queue'].followUpBody ??
                [
                    `Source repository: ${inputData['github-issue-queue'].owner}/${inputData['github-issue-queue'].repo}`,
                    issue ? `Primary issue: #${issue.number} ${issue.title}` : 'Primary issue: none selected',
                    `Issue queue count: ${queue.count}`,
                    `Priority: ${priority}`,
                ].join('\n')

            const createResult = await executeCreateIssue(
                {
                    owner: inputData['github-issue-queue'].owner,
                    repo: inputData['github-issue-queue'].repo,
                    title: followUpTitle,
                    body: followUpBody,
                    labels: inputData['github-issue-queue'].labels.length > 0 ? inputData['github-issue-queue'].labels : undefined,
                    assignees: inputData['github-issue-queue'].assignees.length > 0 ? inputData['github-issue-queue'].assignees : undefined,
                },
                { writer, requestContext, tracingContext, abortSignal },
            )

            const createdSource = (createResult as any).issue ?? createResult ?? {}
            createdIssue = {
                number: typeof createdSource.number === 'number' ? createdSource.number : 0,
                title: typeof createdSource.title === 'string' ? createdSource.title : followUpTitle,
                url: typeof createdSource.url === 'string' ? createdSource.url : '',
            }
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ Issue triage completed for ${inputData['github-issue-queue'].owner}/${inputData['github-issue-queue'].repo}`,
                stage: 'github-issue-follow-up',
            },
            id: 'github-issue-follow-up',
        })

        return {
            queue,
            issue,
            createdIssue,
            triage: {
                priority,
                summary,
                recommendation: createdIssue
                    ? 'Follow up issue created from the current triage context.'
                    : issue
                      ? 'Review the selected issue and decide whether to file a follow-up issue.'
                      : 'Review the queue and select an issue to dig into next.',
            },
        }
    },
})

export const githubIssueTriageWorkflow = createWorkflow({
    id: 'github-issue-triage-workflow',
    description: 'Triage issues and optionally open a follow-up issue',
    inputSchema,
    outputSchema,
})
    .parallel([issueQueueStep, issueDetailStep])
    .then(issueFollowUpStep)
    .commit()
