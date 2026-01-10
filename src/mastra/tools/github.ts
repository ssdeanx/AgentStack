import { retry } from '@octokit/plugin-retry'
import { Octokit } from 'octokit'

// Use Octokit with retry plugin to improve resilience for API calls
const OctokitWithRetry = Octokit.plugin(retry)

import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { SpanType } from '@mastra/core/observability'
import { z } from 'zod'
import { log } from '../config/logger'
import type { RequestContext } from '@mastra/core/request-context'

export interface GithubToolContext extends RequestContext {
    userId?: string
}

interface GitHubRepo {
    name: string
    full_name: string
    description: string | null
    html_url: string
    default_branch: string
    stargazers_count: number
    forks_count: number
    private: boolean
    updated_at: string
}

// Octokit response types used in this file to avoid `any`
interface GitHubIssueCreateResponse {
    number: number
    html_url: string
    title: string
}

interface GitHubRepoResponse {
    name: string
    full_name: string
    description: string | null
    html_url: string
    default_branch: string
    stargazers_count: number
    forks_count: number
    watchers_count: number
    open_issues_count: number
    private: boolean
    language?: string | null
    topics?: string[]
    created_at: string
    updated_at: string
    pushed_at: string
}

interface GitHubContentFile {
    encoding: string
    content: string
    sha: string
    size: number
}

interface GitHubBranchResponse {
    commit: {
        commit: {
            tree: {
                sha: string
            }
        }
    }
}

interface GitHubTreeItem {
    path: string
    mode: string
    type: string
    sha: string
    size?: number
    url?: string
}

interface GitHubTreeResponse {
    tree?: GitHubTreeItem[]
    truncated?: boolean
}

interface GitHubSearchItem {
    name: string
    path: string
    repository?: { full_name?: string }
    html_url: string
    sha: string
}

function getOctokit() {
    const token =
        process.env.GITHUB_API_KEY ?? process.env.GITHUB_PERSONAL_ACCESS_TOKEN
    // Set retry configuration with a short retryAfter and maximum retries for github calls
    return new OctokitWithRetry({
        auth: token,
        request: { retries: 3, retryAfter: 60 },
    })
}

// Helper to normalize or map repository items into our shape
function mapRepo(repo: GitHubRepo) {
    return {
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        defaultBranch: repo.default_branch,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        isPrivate: repo.private,
        updatedAt: repo.updated_at,
    }
}

// Map input 'type' (combined set) to org-specific types accepted by listForOrg
function mapTypeForOrg(
    type?: string
): 'all' | 'public' | 'private' | 'forks' | 'sources' | 'member' | undefined {
    if (type === undefined || type === null || type === '') {
        return undefined
    }
    switch (type) {
        case 'all':
        case 'public':
        case 'private':
        case 'forks':
        case 'sources':
        case 'member':
            return type as any
        default:
            return undefined
    }
}

// Map input 'type' to authenticated user types accepted by listForAuthenticatedUser
function mapTypeForAuthenticatedUser(
    type?: string
): 'all' | 'owner' | 'public' | 'private' | 'member' | undefined {
    if (type === undefined || type === null || type === '') {
        return undefined
    }
    switch (type) {
        case 'all':
        case 'owner':
        case 'public':
        case 'private':
        case 'member':
            return type
        default:
            return undefined
    }
}

export const listRepositories = createTool({
    id: 'github:listRepositories',
    description:
        'List repositories for the authenticated user or a specified organization',
    inputSchema: z.object({
        org: z
            .string()
            .optional()
            .describe('Organization name (optional, defaults to user repos)'),
        type: z
            .enum([
                'all',
                'public',
                'private',
                'member',
                'owner',
                'forks',
                'sources',
            ])
            .optional()
            .default('all'),
        sort: z
            .enum(['created', 'updated', 'pushed', 'full_name'])
            .optional()
            .default('updated'),
        perPage: z.number().optional().default(30),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        repositories: z
            .array(
                z.object({
                    name: z.string(),
                    fullName: z.string(),
                    description: z.string().nullable(),
                    url: z.string(),
                    defaultBranch: z.string(),
                    stars: z.number(),
                    forks: z.number(),
                    isPrivate: z.boolean(),
                    updatedAt: z.string(),
                })
            )
            .optional(),
        message: z.string().optional(),
    }),

    execute: async (inputData, context) => {
        const requestContext = context?.requestContext as GithubToolContext | undefined
        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'github-list-repos',
            input: {
                org: inputData.org,
                type: inputData.type,
            },
            metadata: {
                'tool.id': 'github:listRepositories',
                'tool.input.org': inputData.org,
                'tool.input.type': inputData.type,
            },
        })

        const writer = context?.writer
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('GitHub repository listing cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '📚 Fetching repositories...',
                stage: 'github:listRepositories',
            },
            id: 'github:listRepositories',
        })

        try {
            // Check for cancellation before API call
            if (abortSignal?.aborted) {
                span?.update({
                    metadata: {
                        status: 'cancelled',
                        message: 'Operation cancelled during API call',
                    }
                })
                span?.end()
                throw new Error(
                    'GitHub repository listing cancelled during API call'
                )
            }

            const octokit = getOctokit()
            let response
            if (inputData.org !== undefined) {
                response = await octokit.rest.repos.listForOrg({
                    org: inputData.org,
                    type: mapTypeForOrg(inputData.type),
                    sort: inputData.sort,
                    per_page: inputData.perPage,
                })
            } else {
                response = await octokit.rest.repos.listForAuthenticatedUser({
                    type: mapTypeForAuthenticatedUser(inputData.type),
                    sort: inputData.sort,
                    per_page: inputData.perPage,
                })
            }
            const data = response.data as GitHubRepo[]

            const repositories = data.map(mapRepo)

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Found ${repositories.length} repositories`,
                    stage: 'github:listRepositories',
                },
                id: 'github:listRepositories',
            })

            span?.update({
                output: { success: true, count: repositories.length },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.count': repositories.length,
                }
            })
            span?.end()

            return { success: true, repositories }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'

            // Handle AbortError specifically
            if (e instanceof Error && e.name === 'AbortError') {
                const cancelMessage = `GitHub repository listing cancelled`
                span?.update({
                    metadata: {
                        status: 'cancelled',
                        message: cancelMessage,
                    }
                })
                span?.end()

                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: `🛑 ${cancelMessage}`,
                        stage: 'github:listRepositories',
                    },
                    id: 'github:listRepositories',
                })

                log.warn(cancelMessage)
                throw new Error(cancelMessage)
            }

            log.error(`GitHub list repos failed: ${errorMsg}`)

            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true
            })

            return { success: false, message: errorMsg }
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('GitHub list repositories tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('GitHub list repositories tool received input chunk', {
            toolCallId,
            inputTextDelta,
            abortSignal: abortSignal?.aborted,
            messageCount: messages.length,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        const scope = input.org ? `org:${input.org}` : 'user'
        log.info('GitHub list repositories received complete input', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            scope,
            type: input.type,
            sort: input.sort,
            perPage: input.perPage,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        if (output.success && output.repositories) {
            log.info('GitHub list repositories completed', {
                toolCallId,
                toolName,
                abortSignal: abortSignal?.aborted,
                repositoriesFound: output.repositories.length,
                hook: 'onOutput',
            })
        } else {
            log.warn('GitHub list repositories failed', {
                toolCallId,
                toolName,
                abortSignal: abortSignal?.aborted,
                errorMessage: output.message,
                hook: 'onOutput',
            })
        }
    },
})

interface GitHubPR {
    number: number
    title: string
    state: string
    user: { login: string } | null | undefined
    html_url: string
    created_at: string
    updated_at: string
    draft?: boolean
    labels: Array<{ name: string }>
}

interface GitHubIssue {
    number: number
    title: string
    state: string
    user?: { login?: string } | null
    html_url: string
    created_at: string
    updated_at: string
    labels?: Array<{ name: string }>
    comments: number
    pull_request?: Record<string, unknown> | null
}

export const listPullRequests = createTool({
    id: 'github:listPullRequests',
    description: 'List pull requests for a repository',
    inputSchema: z.object({
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name'),
        state: z.enum(['open', 'closed', 'all']).optional().default('open'),
        sort: z
            .enum(['created', 'updated', 'popularity', 'long-running'])
            .optional()
            .default('updated'),
        direction: z.enum(['asc', 'desc']).optional().default('desc'),
        perPage: z.number().optional().default(30),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        pullRequests: z
            .array(
                z.object({
                    number: z.number(),
                    title: z.string(),
                    state: z.string(),
                    author: z.string(),
                    url: z.string(),
                    createdAt: z.string(),
                    updatedAt: z.string(),
                    draft: z.boolean(),
                    labels: z.array(z.string()),
                })
            )
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const requestContext = context?.requestContext as GithubToolContext | undefined
        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'github-list-prs',
            input: {
                owner: inputData.owner,
                repo: inputData.repo,
            },
            metadata: {
                'tool.id': 'github:listPullRequests',
                'tool.input.owner': inputData.owner,
                'tool.input.repo': inputData.repo,
            },
        })

        const writer = context?.writer

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📋 Fetching PRs for ${inputData.owner}/${inputData.repo}...`,
                stage: 'github:listPullRequests',
            },
            id: 'github:listPullRequests',
        })

        try {
            const octokit = getOctokit()
            const response = await octokit.rest.pulls.list({
                owner: inputData.owner,
                repo: inputData.repo,
                state: inputData.state,
                sort: inputData.sort,
                direction: inputData.direction,
                per_page: inputData.perPage,
            })

            const pullRequests = (response.data ?? []).map((pr: GitHubPR) => ({
                number: pr.number,
                title: pr.title,
                state: pr.state,
                author: pr.user?.login ?? 'unknown',
                url: pr.html_url,
                createdAt: pr.created_at,
                updatedAt: pr.updated_at,
                draft: pr.draft ?? false,
                labels: pr.labels.map((l) => l.name),
            }))

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Found ${pullRequests.length} pull requests`,
                    stage: 'github:listPullRequests',
                },
                id: 'github:listPullRequests',
            })

            span?.update({
                output: { success: true, count: pullRequests.length },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.count': pullRequests.length,
                }
            })
            span?.end()

            return { success: true, pullRequests }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'
            log.error(`GitHub list PRs failed: ${errorMsg}`)

            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true
            })

            return { success: false, message: errorMsg }
        }
    },
})
export const listCommits = createTool({
    id: 'github:listCommits',
    description: 'List commits for a repository (branch/ref/path/since/until)',
    inputSchema: z.object({
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name'),
        sha: z.string().optional().describe('Commit SHA, branch, or ref'),
        path: z.string().optional().describe('Path to restrict commit list'),
        since: z
            .string()
            .optional()
            .describe('Only commits after this ISO date'),
        until: z
            .string()
            .optional()
            .describe('Only commits before this ISO date'),
        perPage: z.number().optional().default(30),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        commits: z
            .array(
                z.object({
                    sha: z.string(),
                    message: z.string(),
                    author: z.string().nullable(),
                    date: z.string(),
                    url: z.string(),
                })
            )
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const requestContext = context?.requestContext as GithubToolContext | undefined
        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'github-list-commits',
            input: {
                owner: inputData.owner,
                repo: inputData.repo,
            },
            metadata: {
                'tool.id': 'github:listCommits',
                'tool.input.owner': inputData.owner,
                'tool.input.repo': inputData.repo,
            },
        })

        const writer = context?.writer
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔎 Fetching commits for ${inputData.owner}/${inputData.repo}`,
                stage: 'github:listCommits',
            },
            id: 'github:listCommits',
        })

        try {
            const octokit = getOctokit()
            const res = await octokit.rest.repos.listCommits({
                owner: inputData.owner,
                repo: inputData.repo,
                sha: inputData.sha,
                path: inputData.path,
                since: inputData.since,
                until: inputData.until,
                per_page: inputData.perPage,
            })

            const commits = (res.data ?? []).map((c: any) => ({
                sha: c.sha as string,
                message: c.commit?.message ?? '',
                author: (c.commit?.author?.name as string) ?? null,
                date: c.commit?.author?.date ?? '',
                url: c.html_url ?? '',
            }))

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Found ${commits.length} commits`,
                    stage: 'github:listCommits',
                },
                id: 'github:listCommits',
            })

            span?.update({
                output: { success: true, count: commits.length },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.count': commits.length,
                }
            })
            span?.end()
            return { success: true, commits }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'
            log.error(`GitHub list commits failed: ${errorMsg}`)
            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true
            })
            return { success: false, message: errorMsg }
        }
    },
})
export const listIssues = createTool({
    id: 'github:listIssues',
    description: 'List issues for a repository',
    inputSchema: z.object({
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name'),
        state: z.enum(['open', 'closed', 'all']).optional().default('open'),
        labels: z
            .string()
            .optional()
            .describe('Comma-separated list of labels'),
        sort: z
            .enum(['created', 'updated', 'comments'])
            .optional()
            .default('updated'),
        direction: z.enum(['asc', 'desc']).optional().default('desc'),
        perPage: z.number().optional().default(30),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        issues: z
            .array(
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
                })
            )
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const requestContext = context?.requestContext as GithubToolContext | undefined
        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'github-list-issues',
            input: {
                owner: inputData.owner,
                repo: inputData.repo,
            },
            metadata: {
                'tool.id': 'github:listIssues',
                'tool.input.owner': inputData.owner,
                'tool.input.repo': inputData.repo,
            },
        })

        const writer = context?.writer

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🐛 Fetching issues for ${inputData.owner}/${inputData.repo}...`,
                stage: 'github:listIssues',
            },
            id: 'github:listIssues',
        })

        try {
            const octokit = getOctokit()
            const response = await octokit.rest.issues.listForRepo({
                owner: inputData.owner,
                repo: inputData.repo,
                state: inputData.state,
                labels: inputData.labels,
                sort: inputData.sort,
                direction: inputData.direction,
                per_page: inputData.perPage,
            })

            const data = response.data as GitHubIssue[]
            const issues = data
                .filter(
                    (issue) =>
                        issue.pull_request === undefined ||
                        issue.pull_request === null
                )
                .map((issue) => ({
                    number: issue.number,
                    title: issue.title,
                    state: issue.state,
                    author:
                        ((issue.user as Record<string, unknown>)
                            ?.login as string) ?? 'unknown',
                    url: issue.html_url,
                    createdAt: issue.created_at,
                    updatedAt: issue.updated_at,
                    labels: (
                        (issue.labels as Array<Record<string, unknown>>) ?? []
                    ).map((l) => l.name as string),
                    comments: issue.comments,
                }))

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Found ${issues.length} issues`,
                    stage: 'github:listIssues',
                },
                id: 'github:listIssues',
            })

            span?.update({
                output: { success: true, count: issues.length },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.count': issues.length,
                }
            })
            span?.end()

            return { success: true, issues }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'
            log.error(`GitHub list issues failed: ${errorMsg}`)

            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true
            })

            return { success: false, message: errorMsg }
        }
    },
})

export const createIssue = createTool({
    id: 'github:createIssue',
    description: 'Create a new issue in a repository',
    inputSchema: z.object({
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name'),
        title: z.string().describe('Issue title'),
        body: z.string().optional().describe('Issue body/description'),
        labels: z.array(z.string()).optional().describe('Labels to add'),
        assignees: z
            .array(z.string())
            .optional()
            .describe('Usernames to assign'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        issue: z
            .object({
                number: z.number(),
                url: z.string(),
                title: z.string(),
            })
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const requestContext = context?.requestContext as GithubToolContext | undefined
        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'github-create-issue',
            input: {
                owner: inputData.owner,
                repo: inputData.repo,
                title: inputData.title,
            },
            metadata: {
                'tool.id': 'github:createIssue',
                'tool.input.owner': inputData.owner,
                'tool.input.repo': inputData.repo,
                'tool.input.title': inputData.title,
            },
        })

        const writer = context?.writer

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📝 Creating issue in ${inputData.owner}/${inputData.repo}...`,
                stage: 'github:createIssue',
            },
            id: 'github:createIssue',
        })

        try {
            const octokit = getOctokit()
            const response = await octokit.rest.issues.create({
                owner: inputData.owner,
                repo: inputData.repo,
                title: inputData.title,
                body: inputData.body,
                labels: inputData.labels,
                assignees: inputData.assignees,
            })
            const data = response.data as GitHubIssueCreateResponse

            const issue = {
                number: data.number,
                url: data.html_url,
                title: data.title,
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Created issue #${issue.number}`,
                    stage: 'github:createIssue',
                },
                id: 'github:createIssue',
            })

            span?.update({
                output: { success: true, issueNumber: issue.number },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.issueNumber': issue.number,
                }
            })
            span?.end()

            return { success: true, issue }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'
            log.error(`GitHub create issue failed: ${errorMsg}`)

            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true
            })

            return { success: false, message: errorMsg }
        }
    },
})

export const createRelease = createTool({
    id: 'github:createRelease',
    description: 'Create a release for a repository',
    inputSchema: z.object({
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name'),
        tagName: z.string().describe('Tag for the release'),
        name: z.string().optional().describe('Release name'),
        body: z.string().optional().describe('Release notes'),
        draft: z.boolean().optional().default(false),
        prerelease: z.boolean().optional().default(false),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        release: z
            .object({
                id: z.number(),
                url: z.string(),
                tag: z.string(),
                name: z.string().nullable(),
            })
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const requestContext = context?.requestContext as GithubToolContext | undefined
        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'github-create-release',
            input: {
                owner: inputData.owner,
                repo: inputData.repo,
            },
            metadata: {
                'tool.id': 'github:createRelease',
                'tool.input.owner': inputData.owner,
                'tool.input.repo': inputData.repo,
            },
        })

        const writer = context?.writer
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔔 Creating release ${inputData.tagName} for ${inputData.owner}/${inputData.repo}`,
                stage: 'github:createRelease',
            },
            id: 'github:createRelease',
        })

        try {
            const octokit = getOctokit()
            const res = await octokit.rest.repos.createRelease({
                owner: inputData.owner,
                repo: inputData.repo,
                tag_name: inputData.tagName,
                name: inputData.name,
                body: inputData.body,
                draft: inputData.draft,
                prerelease: inputData.prerelease,
            })

            const release = {
                id: res.data.id,
                url: res.data.html_url,
                tag: res.data.tag_name,
                name: res.data.name ?? null,
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Release created: ${release.tag}`,
                    stage: 'github:createRelease',
                },
                id: 'github:createRelease',
            })

            if (res.status >= 200 && res.status < 300) {
                span?.update({
                    output: { success: true, releaseId: release.id },
                    metadata: {
                        'tool.output.success': true,
                        'tool.output.releaseId': release.id,
                    }
                })
                span?.end()
                return { success: true, release }
            }
            span?.error({
                error: new Error(`Failed with status ${res.status}`),
                endSpan: true
            })
            return {
                success: false,
                message: `Failed with status ${res.status}`,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'
            log.error(`GitHub create release failed: ${errorMsg}`)
            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true
            })
            return { success: false, message: errorMsg }
        }
    },
})

export const getRepositoryInfo = createTool({
    id: 'github:getRepositoryInfo',
    description: 'Get detailed information about a repository',
    inputSchema: z.object({
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        repository: z
            .object({
                name: z.string(),
                fullName: z.string(),
                description: z.string().nullable(),
                url: z.string(),
                defaultBranch: z.string(),
                stars: z.number(),
                forks: z.number(),
                watchers: z.number(),
                openIssues: z.number(),
                isPrivate: z.boolean(),
                language: z.string().nullable(),
                topics: z.array(z.string()),
                createdAt: z.string(),
                updatedAt: z.string(),
                pushedAt: z.string(),
            })
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const requestContext = context?.requestContext as GithubToolContext | undefined
        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'github-get-repo-info',
            input: {
                owner: inputData.owner,
                repo: inputData.repo,
            },
            metadata: {
                'tool.id': 'github:getRepositoryInfo',
                'tool.input.owner': inputData.owner,
                'tool.input.repo': inputData.repo,
            },
        })

        const writer = context?.writer

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📊 Fetching repository info for ${inputData.owner}/${inputData.repo}...`,
                stage: 'github:getRepositoryInfo',
            },
            id: 'github:getRepositoryInfo',
        })

        try {
            const octokit = getOctokit()
            const res = await octokit.rest.repos.get({
                owner: inputData.owner,
                repo: inputData.repo,
            })
            const repo = res.data as GitHubRepoResponse

            const repository = {
                name: repo.name,
                fullName: repo.full_name,
                description: (repo.description as string) ?? null,
                url: repo.html_url,
                defaultBranch: repo.default_branch,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                watchers: repo.watchers_count,
                openIssues: repo.open_issues_count,
                isPrivate: repo.private,
                language: (repo.language as string) ?? null,
                topics: (repo.topics as string[]) ?? [],
                createdAt: repo.created_at,
                updatedAt: repo.updated_at,
                pushedAt: repo.pushed_at,
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: '✅ Repository info retrieved',
                    stage: 'github:getRepositoryInfo',
                },
                id: 'github:getRepositoryInfo',
            })

            span?.update({
                output: { success: true },
                metadata: {
                    'tool.output.success': true,
                }
            })
            span?.end()

            return { success: true, repository }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'
            log.error(`GitHub get repo info failed: ${errorMsg}`)

            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true
            })

            return { success: false, message: errorMsg }
        }
    },
})

export const searchCode = createTool({
    id: 'github:searchCode',
    description: 'Search for code across GitHub repositories',
    inputSchema: z.object({
        query: z.string().describe('Search query'),
        repo: z
            .string()
            .optional()
            .describe('Limit search to specific repo (owner/repo format)'),
        language: z
            .string()
            .optional()
            .describe('Filter by programming language'),
        perPage: z.number().optional().default(30),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        results: z
            .array(
                z.object({
                    name: z.string(),
                    path: z.string(),
                    repository: z.string(),
                    url: z.string(),
                    sha: z.string(),
                })
            )
            .optional(),
        totalCount: z.number().optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const requestContext = context?.requestContext as GithubToolContext | undefined
        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'github-search-code',
            input: {
                query: inputData.query,
            },
            metadata: {
                'tool.id': 'github:searchCode',
                'tool.input.query': inputData.query,
            },
        })

        const writer = context?.writer

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔍 Searching code for "${inputData.query}"...`,
                stage: 'github:searchCode',
            },
            id: 'github:searchCode',
        })

        try {
            const octokit = getOctokit()
            let q = inputData.query
            if (
                inputData.repo !== undefined &&
                inputData.repo !== null &&
                inputData.repo !== ''
            ) {
                q += ` repo:${inputData.repo}`
            }
            if (
                inputData.language !== undefined &&
                inputData.language !== null &&
                inputData.language !== ''
            ) {
                q += ` language:${inputData.language}`
            }

            const data = await octokit.rest.search.code({
                q,
                per_page: inputData.perPage,
            })
            const items = data.data.items as GitHubSearchItem[]

            const results = items.map((item) => ({
                name: item.name,
                path: item.path,
                repository:
                    ((item.repository as Record<string, unknown>)
                        ?.full_name as string) ?? 'unknown',
                url: item.html_url,
                sha: item.sha,
            }))

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Found ${data.data.total_count} results`,
                    stage: 'github:searchCode',
                },
                id: 'github:searchCode',
            })

            span?.update({
                output: { success: true, totalCount: data.data.total_count },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.totalCount': data.data.total_count,
                }
            })
            span?.end()

            return { success: true, results, totalCount: data.data.total_count }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'
            log.error(`GitHub search code failed: ${errorMsg}`)

            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true
            })

            return { success: false, message: errorMsg }
        }
    },
})

export const getFileContent = createTool({
    id: 'github:getFileContent',
    description: 'Get the content of a file from a repository',
    inputSchema: z.object({
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name'),
        path: z.string().describe('Path to the file'),
        ref: z
            .string()
            .optional()
            .describe(
                'Branch, tag, or commit SHA (defaults to default branch)'
            ),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        content: z.string().optional(),
        encoding: z.string().optional(),
        sha: z.string().optional(),
        size: z.number().optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const requestContext = context?.requestContext as GithubToolContext | undefined
        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'github-get-file',
            input: {
                owner: inputData.owner,
                repo: inputData.repo,
                path: inputData.path,
            },
            metadata: {
                'tool.id': 'github:getFileContent',
                'tool.input.owner': inputData.owner,
                'tool.input.repo': inputData.repo,
                'tool.input.path': inputData.path,
            },
        })

        const writer = context?.writer

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📄 Fetching file ${inputData.path}...`,
                stage: 'github:getFileContent',
            },
            id: 'github:getFileContent',
        })

        try {
            const octokit = getOctokit()
            const response = await octokit.rest.repos.getContent({
                owner: inputData.owner,
                repo: inputData.repo,
                path: inputData.path,
                ref: inputData.ref,
            })
            const data = response.data as GitHubContentFile

            if (Array.isArray(data)) {
                throw new Error('Path points to a directory, not a file')
            }

            const content =
                data.encoding === 'base64'
                    ? Buffer.from(data.content, 'base64').toString('utf-8')
                    : data.content

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: '✅ File content retrieved',
                    stage: 'github:getFileContent',
                },
                id: 'github:getFileContent',
            })

            span?.update({
                output: { success: true, size: data.size },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.size': data.size,
                }
            })
            span?.end()

            return {
                success: true,
                content,
                encoding: data.encoding,
                sha: data.sha,
                size: data.size,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'
            log.error(`GitHub get file failed: ${errorMsg}`)

            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true
            })

            return { success: false, message: errorMsg }
        }
    },
})

export const getRepoFileTree = createTool({
    id: 'github:getRepoFileTree',
    description: 'Get the full file tree of a repository recursively',
    inputSchema: z.object({
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name'),
        branch: z.string().optional().default('main').describe('Branch name'),
        recursive: z
            .boolean()
            .optional()
            .default(true)
            .describe('Whether to fetch recursively'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        tree: z
            .array(
                z.object({
                    path: z.string(),
                    mode: z.string(),
                    type: z.string(),
                    sha: z.string(),
                    size: z.number().optional(),
                    url: z.string().optional(),
                })
            )
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const requestContext = context?.requestContext as GithubToolContext | undefined
        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'github-get-tree',
            input: {
                owner: inputData.owner,
                repo: inputData.repo,
                branch: inputData.branch,
            },
            metadata: {
                'tool.id': 'github:getRepoFileTree',
                'tool.input.owner': inputData.owner,
                'tool.input.repo': inputData.repo,
                'tool.input.branch': inputData.branch,
            },
        })

        const writer = context?.writer

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🌳 Fetching file tree for ${inputData.owner}/${inputData.repo}...`,
                stage: 'github:getRepoFileTree',
            },
            id: 'github:getRepoFileTree',
        })

        try {
            const octokit = getOctokit()
            // Get branch commit to find tree SHA
            const branchRes = await octokit.rest.repos.getBranch({
                owner: inputData.owner,
                repo: inputData.repo,
                branch: inputData.branch,
            })
            const treeSha = (branchRes.data as GitHubBranchResponse).commit
                .commit.tree.sha

            const treeRes = await octokit.rest.git.getTree({
                owner: inputData.owner,
                repo: inputData.repo,
                tree_sha: treeSha,
                recursive: inputData.recursive ? '1' : '0',
            })
            const data = treeRes.data as GitHubTreeResponse

            const tree = (data.tree ?? []).map((item: GitHubTreeItem) => ({
                path: item.path,
                mode: item.mode,
                type: item.type,
                sha: item.sha,
                size: item.size,
                url: item.url,
            }))

            if (data.truncated === true) {
                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message:
                            '⚠️ Warning: File tree was truncated by GitHub API limit',
                        stage: 'github:getRepoFileTree',
                    },
                    id: 'github:getRepoFileTree',
                })
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Found ${tree.length} items`,
                    stage: 'github:getRepoFileTree',
                },
                id: 'github:getRepoFileTree',
            })

            span?.update({
                output: { success: true, count: tree.length },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.count': tree.length,
                }
            })
            span?.end()

            return { success: true, tree }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'
            log.error(`GitHub get tree failed: ${errorMsg}`)

            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true
            })

            return { success: false, message: errorMsg }
        }
    },
})

export const createPullRequest = createTool({
    id: 'github:createPullRequest',
    description: 'Create a new pull request',
    inputSchema: z.object({
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name'),
        title: z.string().describe('PR title'),
        head: z
            .string()
            .describe(
                'The name of the branch where your changes are implemented'
            ),
        base: z
            .string()
            .describe(
                'The name of the branch you want the changes pulled into'
            ),
        body: z.string().optional().describe('PR body/description'),
        draft: z.boolean().optional().default(false),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        pullRequest: z
            .object({
                number: z.number(),
                url: z.string(),
                title: z.string(),
            })
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const requestContext = context?.requestContext as GithubToolContext | undefined
        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'github-create-pr',
            input: {
                owner: inputData.owner,
                repo: inputData.repo,
                title: inputData.title,
            },
            metadata: {
                'tool.id': 'github:createPullRequest',
                'tool.input.owner': inputData.owner,
                'tool.input.repo': inputData.repo,
                'tool.input.title': inputData.title,
            },
        })

        const writer = context?.writer
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔀 Creating PR in ${inputData.owner}/${inputData.repo}...`,
                stage: 'github:createPullRequest',
            },
            id: 'github:createPullRequest',
        })

        try {
            const octokit = getOctokit()
            const response = await octokit.rest.pulls.create({
                owner: inputData.owner,
                repo: inputData.repo,
                title: inputData.title,
                head: inputData.head,
                base: inputData.base,
                body: inputData.body,
                draft: inputData.draft,
            })

            const pullRequest = {
                number: response.data.number,
                url: response.data.html_url,
                title: response.data.title,
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Created PR #${pullRequest.number}`,
                    stage: 'github:createPullRequest',
                },
                id: 'github:createPullRequest',
            })

            span?.update({
                output: { success: true, prNumber: pullRequest.number },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.prNumber': pullRequest.number,
                }
            })
            span?.end()

            return { success: true, pullRequest }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'
            log.error(`GitHub create PR failed: ${errorMsg}`)
            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true
            })
            return { success: false, message: errorMsg }
        }
    },
})

export const mergePullRequest = createTool({
    id: 'github:mergePullRequest',
    description: 'Merge a pull request',
    inputSchema: z.object({
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name'),
        pullNumber: z.number().describe('PR number'),
        commitTitle: z
            .string()
            .optional()
            .describe('Title for the merge commit'),
        commitMessage: z
            .string()
            .optional()
            .describe('Message for the merge commit'),
        mergeMethod: z
            .enum(['merge', 'squash', 'rebase'])
            .optional()
            .default('merge'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        merged: z.boolean().optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const requestContext = context?.requestContext as GithubToolContext | undefined
        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'github-merge-pr',
            input: {
                owner: inputData.owner,
                repo: inputData.repo,
                pullNumber: inputData.pullNumber,
            },
            metadata: {
                'tool.id': 'github:mergePullRequest',
                'tool.input.owner': inputData.owner,
                'tool.input.repo': inputData.repo,
                'tool.input.pullNumber': inputData.pullNumber,
            },
        })

        const writer = context?.writer
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🤝 Merging PR #${inputData.pullNumber} in ${inputData.owner}/${inputData.repo}...`,
                stage: 'github:mergePullRequest',
            },
            id: 'github:mergePullRequest',
        })

        try {
            const octokit = getOctokit()
            const response = await octokit.rest.pulls.merge({
                owner: inputData.owner,
                repo: inputData.repo,
                pull_number: inputData.pullNumber,
                commit_title: inputData.commitTitle,
                commit_message: inputData.commitMessage,
                merge_method: inputData.mergeMethod,
            })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Merged PR #${inputData.pullNumber}`,
                    stage: 'github:mergePullRequest',
                },
                id: 'github:mergePullRequest',
            })

            span?.update({
                output: { success: true, merged: response.data.merged },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.merged': response.data.merged,
                }
            })
            span?.end()

            return {
                success: true,
                merged: response.data.merged,
                message: response.data.message,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'
            log.error(`GitHub merge PR failed: ${errorMsg}`)
            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true
            })
            return { success: false, message: errorMsg }
        }
    },
})

export const addIssueComment = createTool({
    id: 'github:addIssueComment',
    description: 'Add a comment to an issue or pull request',
    inputSchema: z.object({
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name'),
        issueNumber: z.number().describe('Issue or PR number'),
        body: z.string().describe('Comment body'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        comment: z
            .object({
                id: z.number(),
                url: z.string(),
            })
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const requestContext = context?.requestContext as GithubToolContext | undefined
        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'github-add-comment',
            input: {
                owner: inputData.owner,
                repo: inputData.repo,
                issueNumber: inputData.issueNumber,
            },
            metadata: {
                'tool.id': 'github:addIssueComment',
                'tool.input.owner': inputData.owner,
                'tool.input.repo': inputData.repo,
                'tool.input.issueNumber': inputData.issueNumber,
            },
        })

        const writer = context?.writer
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `💬 Adding comment to #${inputData.issueNumber}...`,
                stage: 'github:addIssueComment',
            },
            id: 'github:addIssueComment',
        })

        try {
            const octokit = getOctokit()
            const response = await octokit.rest.issues.createComment({
                owner: inputData.owner,
                repo: inputData.repo,
                issue_number: inputData.issueNumber,
                body: inputData.body,
            })

            const comment = {
                id: response.data.id,
                url: response.data.html_url,
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Added comment to #${inputData.issueNumber}`,
                    stage: 'github:addIssueComment',
                },
                id: 'github:addIssueComment',
            })

            span?.update({
                output: { success: true, commentId: comment.id },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.commentId': comment.id,
                }
            })
            span?.end()

            return { success: true, comment }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'
            log.error(`GitHub add comment failed: ${errorMsg}`)
            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true
            })
            return { success: false, message: errorMsg }
        }
    },
})

export const getPullRequest = createTool({
    id: 'github:getPullRequest',
    description: 'Get detailed information about a pull request',
    inputSchema: z.object({
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name'),
        pullNumber: z.number().describe('PR number'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        pullRequest: z
            .object({
                number: z.number(),
                title: z.string(),
                body: z.string().nullable(),
                state: z.string(),
                author: z.string(),
                url: z.string(),
                createdAt: z.string(),
                updatedAt: z.string(),
                merged: z.boolean(),
                mergeable: z.boolean().nullable(),
                draft: z.boolean(),
                base: z.string(),
                head: z.string(),
                labels: z.array(z.string()),
            })
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const requestContext = context?.requestContext as GithubToolContext | undefined
        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'github-get-pr',
            input: {
                owner: inputData.owner,
                repo: inputData.repo,
                pullNumber: inputData.pullNumber,
            },
            metadata: {
                'tool.id': 'github:getPullRequest',
                'tool.input.owner': inputData.owner,
                'tool.input.repo': inputData.repo,
                'tool.input.pullNumber': inputData.pullNumber,
            },
        })

        const writer = context?.writer
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔍 Fetching PR #${inputData.pullNumber}...`,
                stage: 'github:getPullRequest',
            },
            id: 'github:getPullRequest',
        })

        try {
            const octokit = getOctokit()
            const response = await octokit.rest.pulls.get({
                owner: inputData.owner,
                repo: inputData.repo,
                pull_number: inputData.pullNumber,
            })

            const pr = response.data
            const pullRequest = {
                number: pr.number,
                title: pr.title,
                body: pr.body ?? null,
                state: pr.state,
                author: pr.user?.login ?? 'unknown',
                url: pr.html_url,
                createdAt: pr.created_at,
                updatedAt: pr.updated_at,
                merged: pr.merged ?? false,
                mergeable: pr.mergeable ?? null,
                draft: pr.draft ?? false,
                base: pr.base.ref,
                head: pr.head.ref,
                labels: (pr.labels ?? []).map(
                    (l: { name?: string }) => l.name ?? ''
                ),
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ PR #${inputData.pullNumber} retrieved`,
                    stage: 'github:getPullRequest',
                },
                id: 'github:getPullRequest',
            })

            span?.update({
                output: { success: true },
                metadata: {
                    'tool.output.success': true,
                }
            })
            span?.end()

            return { success: true, pullRequest }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'
            log.error(`GitHub get PR failed: ${errorMsg}`)
            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true
            })
            return { success: false, message: errorMsg }
        }
    },
})

export const getIssue = createTool({
    id: 'github:getIssue',
    description: 'Get detailed information about an issue',
    inputSchema: z.object({
        owner: z.string().describe('Repository owner'),
        repo: z.string().describe('Repository name'),
        issueNumber: z.number().describe('Issue number'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        issue: z
            .object({
                number: z.number(),
                title: z.string(),
                body: z.string().nullable(),
                state: z.string(),
                author: z.string(),
                url: z.string(),
                createdAt: z.string(),
                updatedAt: z.string(),
                labels: z.array(z.string()),
                comments: z.number(),
            })
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const requestContext = context?.requestContext as GithubToolContext | undefined
        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'github-get-issue',
            input: {
                owner: inputData.owner,
                repo: inputData.repo,
                issueNumber: inputData.issueNumber,
            },
            metadata: {
                'tool.id': 'github:getIssue',
                'tool.input.owner': inputData.owner,
                'tool.input.repo': inputData.repo,
                'tool.input.issueNumber': inputData.issueNumber,
            },
        })

        const writer = context?.writer
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔍 Fetching issue #${inputData.issueNumber}...`,
                stage: 'github:getIssue',
            },
            id: 'github:getIssue',
        })

        try {
            const octokit = getOctokit()
            const response = await octokit.rest.issues.get({
                owner: inputData.owner,
                repo: inputData.repo,
                issue_number: inputData.issueNumber,
            })

            const issueData = response.data
            const issue = {
                number: issueData.number,
                title: issueData.title,
                body: issueData.body ?? null,
                state: issueData.state,
                author: issueData.user?.login ?? 'unknown',
                url: issueData.html_url,
                createdAt: issueData.created_at,
                updatedAt: issueData.updated_at,
                labels: (issueData.labels ?? []).map(
                    (l: string | { name?: string }) =>
                        typeof l === 'string' ? l : (l.name ?? '')
                ),
                comments: issueData.comments,
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Issue #${inputData.issueNumber} retrieved`,
                    stage: 'github:getIssue',
                },
                id: 'github:getIssue',
            })

            span?.update({
                output: { success: true },
                metadata: {
                    'tool.output.success': true,
                }
            })
            span?.end()

            return { success: true, issue }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Unknown error'
            log.error(`GitHub get issue failed: ${errorMsg}`)
            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true
            })
            return { success: false, message: errorMsg }
        }
    },
})

export type GitHubListRepositoriesUITool = InferUITool<typeof listRepositories>
export type GitHubListPullRequestsUITool = InferUITool<typeof listPullRequests>
export type GitHubListIssuesUITool = InferUITool<typeof listIssues>
export type GitHubCreateIssueUITool = InferUITool<typeof createIssue>
export type GitHubGetRepositoryInfoUITool = InferUITool<
    typeof getRepositoryInfo
>
export type GitHubSearchCodeUITool = InferUITool<typeof searchCode>
export type GitHubGetFileContentUITool = InferUITool<typeof getFileContent>
export type GitHubGetRepoFileTreeUITool = InferUITool<typeof getRepoFileTree>
export type GitHubCreatePullRequestUITool = InferUITool<
    typeof createPullRequest
>
export type GitHubMergePullRequestUITool = InferUITool<typeof mergePullRequest>
export type GitHubAddIssueCommentUITool = InferUITool<typeof addIssueComment>
export type GitHubGetPullRequestUITool = InferUITool<typeof getPullRequest>
export type GitHubGetIssueUITool = InferUITool<typeof getIssue>
