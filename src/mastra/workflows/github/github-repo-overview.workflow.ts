import { createStep, createWorkflow } from '@mastra/core/workflows'
import path from 'node:path'
import { z } from 'zod'
import { getRepoFileTree, getRepositoryInfo, gitStatusTool, listCommits } from '../../tools'
import { mainFilesystem } from '../../workspaces'

const inputSchema = z.object({
    owner: z.string(),
    repo: z.string(),
    repoPath: z.string().optional(),
    branch: z.string().default('main'),
    treeDepth: z.number().int().positive().max(10).default(2),
    commitLimit: z.number().int().positive().max(100).default(10),
    includeTree: z.boolean().default(true),
})

const outputSchema = z.object({
    repository: z.object({
        fullName: z.string(),
        description: z.string().nullable(),
        defaultBranch: z.string().nullable(),
        visibility: z.string().nullable(),
        url: z.string().nullable(),
        stars: z.number().nullable(),
        forks: z.number().nullable(),
        openIssues: z.number().nullable(),
    }),
    local: z.object({
        branch: z.string().nullable(),
        ahead: z.number().nullable(),
        behind: z.number().nullable(),
        modifiedCount: z.number(),
        untrackedCount: z.number(),
        summary: z.string(),
    }),
    tree: z
        .object({
            rootPath: z.string().nullable(),
            totalEntries: z.number(),
            topEntries: z.array(z.string()),
        })
        .optional(),
    commits: z
        .object({
            count: z.number(),
            latestSha: z.string().nullable(),
            latestMessage: z.string().nullable(),
        })
        .optional(),
    summary: z.string(),
})

const repositoryStepOutputSchema = z.object({
    repository: z.object({
        fullName: z.string(),
        description: z.string().nullable(),
        defaultBranch: z.string().nullable(),
        visibility: z.string().nullable(),
        url: z.string().nullable(),
        stars: z.number().nullable(),
        forks: z.number().nullable(),
        openIssues: z.number().nullable(),
    }),
})

const statusStepOutputSchema = z.object({
    local: z.object({
        branch: z.string().nullable(),
        ahead: z.number().nullable(),
        behind: z.number().nullable(),
        modifiedCount: z.number(),
        untrackedCount: z.number(),
        summary: z.string(),
    }),
})

const commitsStepOutputSchema = z.object({
    commits: z
        .object({
            count: z.number(),
            latestSha: z.string().nullable(),
            latestMessage: z.string().nullable(),
        })
        .optional(),
})

const treeStepOutputSchema = z.object({
    tree: z
        .object({
            rootPath: z.string().nullable(),
            totalEntries: z.number(),
            topEntries: z.array(z.string()),
        })
        .optional(),
})

const repoOverviewSummaryInputSchema = z.object({
    'github-repo-meta': repositoryStepOutputSchema,
    'github-repo-status': statusStepOutputSchema,
    'github-repo-commits': commitsStepOutputSchema,
    'github-repo-tree': treeStepOutputSchema,
})

const resolveRepoPath = (repoPath?: string) => path.resolve(mainFilesystem.basePath, repoPath ?? '.')

const repoMetadataStep = createStep({
    id: 'github-repo-meta',
    inputSchema,
    outputSchema: repositoryStepOutputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📦 Loading repository metadata for ${inputData.owner}/${inputData.repo}`,
                stage: 'github-repo-meta',
            },
            id: 'github-repo-meta',
        })

        const executeRepositoryInfo = getRepositoryInfo.execute as NonNullable<typeof getRepositoryInfo.execute>
        const repositoryResult = await executeRepositoryInfo(
            { owner: inputData.owner, repo: inputData.repo },
            { writer, requestContext, tracingContext, abortSignal },
        )

        const repositorySource = (repositoryResult as any).repository ?? repositoryResult ?? {}
        const repository = {
            fullName: typeof repositorySource.fullName === 'string' ? repositorySource.fullName : `${inputData.owner}/${inputData.repo}`,
            description: typeof repositorySource.description === 'string' ? repositorySource.description : null,
            defaultBranch: typeof repositorySource.defaultBranch === 'string' ? repositorySource.defaultBranch : inputData.branch,
            visibility: typeof repositorySource.visibility === 'string' ? repositorySource.visibility : repositorySource.private === true ? 'private' : 'public',
            url: typeof repositorySource.url === 'string' ? repositorySource.url : null,
            stars: typeof repositorySource.stargazersCount === 'number' ? repositorySource.stargazersCount : null,
            forks: typeof repositorySource.forksCount === 'number' ? repositorySource.forksCount : null,
            openIssues: typeof repositorySource.openIssuesCount === 'number' ? repositorySource.openIssuesCount : null,
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ Repository metadata ready for ${inputData.owner}/${inputData.repo}`,
                stage: 'github-repo-meta',
            },
            id: 'github-repo-meta',
        })

        return { repository }
    },
})

const repoStatusStep = createStep({
    id: 'github-repo-status',
    inputSchema,
    outputSchema: statusStepOutputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        const workspaceRepoPath = resolveRepoPath(inputData.repoPath)

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🛰️ Loading local git status for ${workspaceRepoPath}`,
                stage: 'github-repo-status',
            },
            id: 'github-repo-status',
        })

        const executeGitStatus = gitStatusTool.execute as NonNullable<typeof gitStatusTool.execute>
        const statusResult = await executeGitStatus(
            {
                repoPath: workspaceRepoPath,
                porcelain: false,
                branch: true,
                aheadBehind: true,
                untracked: true,
            },
            { writer, requestContext, tracingContext, abortSignal },
        )

        const statusSource = statusResult as any
        const modifiedCount = Array.isArray(statusSource.modifiedFiles) ? statusSource.modifiedFiles.length : 0
        const untrackedCount = Array.isArray(statusSource.untrackedFiles) ? statusSource.untrackedFiles.length : 0

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ Local git status ready for ${inputData.owner}/${inputData.repo}`,
                stage: 'github-repo-status',
            },
            id: 'github-repo-status',
        })

        return {
            local: {
                branch: typeof statusSource.current === 'string' ? statusSource.current : inputData.branch,
                ahead: typeof statusSource.ahead === 'number' ? statusSource.ahead : null,
                behind: typeof statusSource.behind === 'number' ? statusSource.behind : null,
                modifiedCount,
                untrackedCount,
                summary: `${modifiedCount} modified, ${untrackedCount} untracked`,
            },
        }
    },
})

const repoCommitsStep = createStep({
    id: 'github-repo-commits',
    inputSchema,
    outputSchema: commitsStepOutputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🧾 Loading recent commits for ${inputData.owner}/${inputData.repo}`,
                stage: 'github-repo-commits',
            },
            id: 'github-repo-commits',
        })

        const executeListCommits = listCommits.execute as NonNullable<typeof listCommits.execute>
        const commitResult = await executeListCommits(
            {
                owner: inputData.owner,
                repo: inputData.repo,
                sha: inputData.branch,
                perPage: inputData.commitLimit,
            },
            { writer, requestContext, tracingContext, abortSignal },
        )

        const commitsSource = commitResult as any
        const commits = Array.isArray(commitsSource.commits) ? commitsSource.commits : []
        const commitSummary = commits.length > 0 ? commits[0] : null

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ Commit history ready for ${inputData.owner}/${inputData.repo}`,
                stage: 'github-repo-commits',
            },
            id: 'github-repo-commits',
        })

        return {
            commits: commits.length > 0
                ? {
                      count: commits.length,
                      latestSha: typeof commitSummary?.sha === 'string' ? commitSummary.sha : null,
                      latestMessage: typeof commitSummary?.commit?.message === 'string' ? commitSummary.commit.message : null,
                  }
                : undefined,
        }
    },
})

const repoTreeStep = createStep({
    id: 'github-repo-tree',
    inputSchema,
    outputSchema: treeStepOutputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        if (!inputData.includeTree) {
            return { tree: undefined }
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🌲 Loading repository tree for ${inputData.owner}/${inputData.repo}`,
                stage: 'github-repo-tree',
            },
            id: 'github-repo-tree',
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
        const entries = Array.isArray(treeSource.tree)
            ? treeSource.tree
            : Array.isArray(treeSource.entries)
              ? treeSource.entries
              : Array.isArray(treeSource.files)
                ? treeSource.files
                : []

        const tree = {
            rootPath: typeof treeSource.path === 'string' ? treeSource.path : null,
            totalEntries: entries.length,
            topEntries: entries.slice(0, 10).map((entry: any) => {
                if (typeof entry === 'string') return entry
                if (typeof entry?.path === 'string') return entry.path
                if (typeof entry?.name === 'string') return entry.name
                return String(entry)
            }),
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ Repository tree ready for ${inputData.owner}/${inputData.repo}`,
                stage: 'github-repo-tree',
            },
            id: 'github-repo-tree',
        })

        return { tree }
    },
})

const repoSummaryStep = createStep({
    id: 'github-repo-summary',
    inputSchema: repoOverviewSummaryInputSchema,
    outputSchema,
    execute: async ({ inputData, writer }) => {
        const repository = inputData['github-repo-meta'].repository
        const local = inputData['github-repo-status'].local
        const tree = inputData['github-repo-tree'].tree
        const commits = inputData['github-repo-commits'].commits

        const summary = [
            `${repository.fullName} on ${local.branch}`,
            `${local.modifiedCount} modified / ${local.untrackedCount} untracked`,
            commits ? `latest commit ${String(commits.latestSha ?? 'unknown')}` : 'no commit data',
            tree ? `${tree.totalEntries} tree entries` : 'tree skipped',
        ].join(' • ')

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `✅ Repository overview ready for ${repository.fullName}`,
                stage: 'github-repo-summary',
            },
            id: 'github-repo-summary',
        })

        return {
            repository,
            local,
            tree,
            commits,
            summary,
        }
    },
})

export const githubRepoOverviewWorkflow = createWorkflow({
    id: 'github-repo-overview-workflow',
    description: 'Combine GitHub repository data with local git status and commit context',
    inputSchema,
    outputSchema,
})
    .parallel([repoMetadataStep, repoStatusStep, repoCommitsStep, repoTreeStep])
    .then(repoSummaryStep)
    .commit()
