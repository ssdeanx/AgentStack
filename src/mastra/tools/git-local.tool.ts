import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { SpanType } from '@mastra/core/observability'
import type { ExecaError as ExecaErrorType } from 'execa'
import execa from 'execa'
import { z } from 'zod'
import { log } from '../config/logger'

import type { RequestContext } from '@mastra/core/request-context'

export interface GitToolContext extends RequestContext {
    defaultBranch?: string
    allowForce?: boolean
    allowAmend?: boolean
    maxCommits?: number
    timeout?: number
}

const gitToolContextSchema = z.object({
    defaultBranch: z.string().optional(),
    allowForce: z.boolean().optional(),
    allowAmend: z.boolean().optional(),
    maxCommits: z.number().optional(),
    timeout: z.number().optional(),
})

// Enhanced Git Status Tool with more detailed information
export const gitStatusTool = createTool({
    id: 'git:status',
    description:
        'Get comprehensive git status information including staged/unstaged files, branch info, and repository state',
    inputSchema: z.object({
        repoPath: z
            .string()
            .optional()
            .describe(
                'Path to the git repository (defaults to current directory)'
            ),
        porcelain: z
            .boolean()
            .optional()
            .default(false)
            .describe('Use porcelain format for machine parsing'),
        branch: z
            .boolean()
            .optional()
            .default(true)
            .describe('Include current branch information'),
        aheadBehind: z
            .boolean()
            .optional()
            .default(true)
            .describe('Show ahead/behind counts for current branch'),
        untracked: z
            .boolean()
            .optional()
            .default(true)
            .describe('Include untracked files'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        status: z.string(),
        isClean: z.boolean(),
        currentBranch: z.string().optional(),
        ahead: z.number().optional(),
        behind: z.number().optional(),
        stagedFiles: z.array(z.string()),
        unstagedFiles: z.array(z.string()),
        untrackedFiles: z.array(z.string()),
        conflictedFiles: z.array(z.string()),
        message: z.string().optional(),
    }),

    execute: async (inputData, context) => {
        const writer = context?.writer
        const requestCtx = context?.requestContext as GitToolContext | undefined
        const timeout = requestCtx?.timeout ?? 30000
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Git status cancelled')
        }

        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'git-status',
            input: {
                repoPath: inputData.repoPath,
                porcelain: inputData.porcelain,
            },
            metadata: {
                'tool.id': 'git:status',
                'tool.input.repoPath': inputData.repoPath,
            },
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📊 Checking git status...`,
                stage: 'git:status',
            },
            id: 'git:status',
        })

        try {
            const cwd = inputData.repoPath ?? process.cwd()
            const args = ['status', '--porcelain']

            if (!inputData.porcelain) {
                args.push('--long')
            }

            const result = await execa('git', args, {
                cwd,
                stdio: 'pipe',
                timeout,
            })

            const statusOutput = result.stdout || ''
            const isClean = statusOutput.trim() === ''

            // Parse porcelain output to categorize files
            const stagedFiles: string[] = []
            const unstagedFiles: string[] = []
            const untrackedFiles: string[] = []
            const conflictedFiles: string[] = []

            if (inputData.porcelain && statusOutput) {
                const lines = statusOutput
                    .split('\n')
                    .filter((line) => line.trim())
                for (const line of lines) {
                    const status = line.substring(0, 2)
                    const file = line.substring(3)

                    // Check staged status (first character)
                    if (!status.startsWith(' ') && !status.startsWith('?')) {
                        stagedFiles.push(file)
                    }
                    // Check unstaged status (second character)
                    if (status[1] !== ' ') {
                        unstagedFiles.push(file)
                    }
                    // Check for untracked files
                    if (status === '??') {
                        untrackedFiles.push(file)
                    }
                    // Check for conflicted files (during merge)
                    if (
                        status.includes('U') ||
                        (status.includes('A') && status.includes('U'))
                    ) {
                        conflictedFiles.push(file)
                    }
                }
            }

            // Get current branch and ahead/behind info
            let currentBranch: string | undefined
            let ahead: number | undefined
            let behind: number | undefined

            if (inputData.branch) {
                try {
                    const branchResult = await execa(
                        'git',
                        ['rev-parse', '--abbrev-ref', 'HEAD'],
                        {
                            cwd,
                            stdio: 'pipe',
                            timeout: 5000,
                        }
                    )
                    currentBranch = branchResult.stdout.trim()

                    if (inputData.aheadBehind && currentBranch !== 'HEAD') {
                        const aheadBehindResult = await execa(
                            'git',
                            [
                                'rev-list',
                                '--count',
                                '--left-right',
                                `${currentBranch}...origin/${currentBranch}`,
                            ],
                            {
                                cwd,
                                stdio: 'pipe',
                                timeout: 5000,
                            }
                        ).catch(() => ({ stdout: '' })) // Ignore if no remote tracking branch

                        if (aheadBehindResult.stdout) {
                            const [behindCount, aheadCount] =
                                aheadBehindResult.stdout.trim().split('\t')
                            ahead = parseInt(aheadCount) || 0
                            behind = parseInt(behindCount) || 0
                        }
                    }
                } catch (branchError) {
                    // Ignore branch info errors
                }
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Git status retrieved (${isClean ? 'clean' : 'dirty'})`,
                    stage: 'git:status',
                },
                id: 'git:status',
            })

            span?.update({
                output: { success: true, isClean },
                metadata: {
                    'tool.output.isClean': isClean,
                    'tool.output.stagedCount': stagedFiles.length,
                    'tool.output.unstagedCount': unstagedFiles.length,
                },
            })
            span?.end()

            return {
                success: true,
                status: statusOutput,
                isClean,
                currentBranch,
                ahead,
                behind,
                stagedFiles,
                unstagedFiles,
                untrackedFiles,
                conflictedFiles,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`Git status failed: ${errorMsg}`)

            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true,
            })

            return {
                success: false,
                status: '',
                isClean: false,
                stagedFiles: [],
                unstagedFiles: [],
                untrackedFiles: [],
                conflictedFiles: [],
                message: errorMsg,
            }
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Git status tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Git status tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Git status tool received input', {
            toolCallId,
            messageCount: messages.length,
            inputData: { repoPath: input.repoPath, porcelain: input.porcelain },
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Git status tool completed', {
            toolCallId,
            toolName,
            abortSignal: abortSignal?.aborted,
            outputData: {
                success: output.success,
                isClean: output.isClean,
                stagedCount: output.stagedFiles.length,
                unstagedCount: output.unstagedFiles.length,
                untrackedCount: output.untrackedFiles.length,
            },
            hook: 'onOutput',
        })
    },
})

// Enhanced Git Diff Tool with better formatting and options
export const gitDiffTool = createTool({
    id: 'git:diff',
    description:
        'Show git diff with advanced options including patch format, word diff, and statistics',
    inputSchema: z.object({
        repoPath: z.string().optional().describe('Path to the git repository'),
        target: z
            .string()
            .optional()
            .describe('Target to diff against (commit, branch, or --staged)'),
        paths: z
            .array(z.string())
            .optional()
            .describe('Specific files or paths to diff'),
        context: z
            .number()
            .optional()
            .default(3)
            .describe('Number of context lines'),
        wordDiff: z
            .boolean()
            .optional()
            .default(false)
            .describe('Show word-level diff instead of line-level'),
        stat: z
            .boolean()
            .optional()
            .default(false)
            .describe('Show diffstat instead of full diff'),
        patch: z
            .boolean()
            .optional()
            .default(false)
            .describe('Generate patch format'),
        ignoreWhitespace: z
            .boolean()
            .optional()
            .default(false)
            .describe('Ignore whitespace changes'),
        functionContext: z
            .boolean()
            .optional()
            .default(false)
            .describe('Show function context in diff'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        diff: z.string(),
        stats: z
            .object({
                insertions: z.number(),
                deletions: z.number(),
                files: z.number(),
            })
            .optional(),
        patch: z.string().optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Git diff cancelled')
        }

        const { timeout } = gitToolContextSchema.parse(
            requestContext?.get('gitToolContext')
        )

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔍 Generating git diff...`,
                stage: 'git:diff',
            },
            id: 'git:diff',
        })

        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'git-diff',
            input: { target: inputData.target, context: inputData.context },
            metadata: {
                'tool.id': 'git:diff',
                'tool.input.target': inputData.target,
                'tool.input.context': inputData.context,
            },
        })

        try {
            const cwd = inputData.repoPath ?? process.cwd()
            const args = ['diff']

            if (inputData.target) {
                args.push(inputData.target)
            }

            if (inputData.context !== 3) {
                args.push(`-U${inputData.context}`)
            }

            if (inputData.wordDiff) {
                args.push('--word-diff')
            }

            if (inputData.ignoreWhitespace) {
                args.push('--ignore-all-space')
            }

            if (inputData.functionContext) {
                args.push('--function-context')
            }

            if (inputData.paths && inputData.paths.length > 0) {
                args.push('--', ...inputData.paths)
            }

            const result = await execa('git', args, {
                cwd,
                stdio: 'pipe',
                timeout,
            })

            const diffOutput = result.stdout || ''

            // Get diff stats if requested
            let stats = undefined
            if (inputData.stat) {
                try {
                    const statArgs = ['diff', '--stat']
                    if (inputData.target) {
                        statArgs.push(inputData.target)
                    }
                    if (inputData.paths && inputData.paths.length > 0) {
                        statArgs.push('--', ...inputData.paths)
                    }

                    const statResult = await execa('git', statArgs, {
                        cwd,
                        stdio: 'pipe',
                        timeout,
                    })
                    const statOutput = statResult.stdout || ''

                    // Parse the summary line (last line of --stat output)
                    const lines = statOutput
                        .split('\n')
                        .filter((line) => line.trim())
                    if (lines.length > 0) {
                        const summaryLine = lines[lines.length - 1]
                        const match =
                            /(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/.exec(
                                summaryLine
                            )
                        if (match) {
                            stats = {
                                files: parseInt(match[1]) || 0,
                                insertions: parseInt(match[2]) || 0,
                                deletions: parseInt(match[3]) || 0,
                            }
                        }
                    }
                } catch (statError) {
                    // Ignore stat parsing errors
                }
            }

            // Generate patch if requested
            let patch = undefined
            if (inputData.patch) {
                try {
                    const patchArgs = ['diff', '--no-color', '--patch']
                    if (inputData.target) {
                        patchArgs.push(inputData.target)
                    }
                    if (inputData.paths && inputData.paths.length > 0) {
                        patchArgs.push('--', ...inputData.paths)
                    }

                    const patchResult = await execa('git', patchArgs, {
                        cwd,
                        stdio: 'pipe',
                        timeout,
                    })
                    patch = patchResult.stdout || ''
                } catch (patchError) {
                    // Ignore patch generation errors
                }
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Git diff generated (${diffOutput.length} chars)`,
                    stage: 'git:diff',
                },
                id: 'git:diff',
            })

            span?.update({
                output: { success: true, diffLength: diffOutput.length },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.diffLength': diffOutput.length,
                },
            })
            span?.end()

            return {
                success: true,
                diff: diffOutput,
                stats,
                patch,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`Git diff failed: ${errorMsg}`)

            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true,
            })

            return {
                success: false,
                diff: '',
                message: errorMsg,
            }
        }
    },
})

// Enhanced Git Commit Tool with better validation and options
export const gitCommitTool = createTool({
    id: 'git:commit',
    description:
        'Create a git commit with comprehensive options including signing, amending, and validation',
    inputSchema: z.object({
        repoPath: z.string().optional().describe('Path to the git repository'),
        message: z.string().describe('Commit message'),
        amend: z
            .boolean()
            .optional()
            .default(false)
            .describe('Amend the last commit'),
        allowEmpty: z
            .boolean()
            .optional()
            .default(false)
            .describe('Allow empty commits'),
        sign: z
            .boolean()
            .optional()
            .default(false)
            .describe('GPG sign the commit'),
        noVerify: z
            .boolean()
            .optional()
            .default(false)
            .describe('Skip pre-commit hooks'),
        author: z
            .string()
            .optional()
            .describe('Override author (format: "Name <email>")'),
        date: z.string().optional().describe('Override commit date'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        commitHash: z.string().optional(),
        previousHash: z.string().optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext

        const requestCtx = context?.requestContext as GitToolContext | undefined
        const allowAmend = requestCtx?.allowAmend ?? false
        const timeout = requestCtx?.timeout ?? 30000
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Git commit cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `💾 Creating git commit...`,
                stage: 'git:commit',
            },
            id: 'git:commit',
        })

        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'git-commit',
            input: { message: inputData.message, amend: inputData.amend },
            metadata: {
                'tool.id': 'git:commit',
                'tool.input.amend': inputData.amend,
            },
        })

        try {
            const cwd = inputData.repoPath ?? process.cwd()

            // Validate amend permission
            if (inputData.amend && !allowAmend) {
                throw new Error('Amend operation not allowed by configuration')
            }

            // Check if there are staged changes (unless allowEmpty is true)
            if (!inputData.allowEmpty) {
                const statusResult = await execa(
                    'git',
                    ['diff', '--cached', '--name-only'],
                    {
                        cwd,
                        stdio: 'pipe',
                        timeout: 5000,
                    }
                )
                if (!statusResult.stdout.trim()) {
                    throw new Error(
                        'No staged changes to commit. Use git add or --allow-empty'
                    )
                }
            }

            const args = ['commit', '-m', inputData.message]

            if (inputData.amend) {
                args.push('--amend')
            }

            if (inputData.allowEmpty) {
                args.push('--allow-empty')
            }

            if (inputData.sign) {
                args.push('-S')
            }

            if (inputData.noVerify) {
                args.push('--no-verify')
            }

            if (inputData.author) {
                args.push('--author', inputData.author)
            }

            if (inputData.date) {
                args.push('--date', inputData.date)
            }

            const result = await execa('git', args, {
                cwd,
                stdio: 'pipe',
                timeout,
            })

            // Get the commit hash
            const hashResult = await execa('git', ['rev-parse', 'HEAD'], {
                cwd,
                stdio: 'pipe',
                timeout: 5000,
            })

            const commitHash = hashResult.stdout.trim()

            // Get previous commit hash (for amend tracking)
            let previousHash: string | undefined
            try {
                const prevResult = await execa('git', ['rev-parse', 'HEAD~1'], {
                    cwd,
                    stdio: 'pipe',
                    timeout: 5000,
                })
                previousHash = prevResult.stdout.trim()
            } catch (prevError) {
                // No previous commit (first commit)
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Commit created: ${commitHash.substring(0, 8)}`,
                    stage: 'git:commit',
                },
                id: 'git:commit',
            })

            span?.update({
                output: { success: true, commitHash },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.commitHash': commitHash,
                },
            })
            span?.end()

            return {
                success: true,
                commitHash,
                previousHash,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`Git commit failed: ${errorMsg}`)

            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true,
            })

            return {
                success: false,
                message: errorMsg,
            }
        }
    },
})

// Enhanced Git Log Tool with advanced filtering and statistics
export const gitLogTool = createTool({
    id: 'git:log',
    description:
        'Show git commit history with advanced filtering, formatting, and analysis options',
    inputSchema: z.object({
        repoPath: z.string().optional().describe('Path to the git repository'),
        count: z
            .number()
            .optional()
            .default(10)
            .describe('Number of commits to show'),
        author: z.string().optional().describe('Filter by author'),
        since: z.string().optional().describe('Show commits since date'),
        until: z.string().optional().describe('Show commits until date'),
        branch: z.string().optional().describe('Branch to show commits from'),
        path: z
            .string()
            .optional()
            .describe('Filter commits that modified this path'),
        grep: z
            .string()
            .optional()
            .describe('Filter commits by message content'),
        oneline: z
            .boolean()
            .optional()
            .default(false)
            .describe('Show compact one-line format'),
        graph: z
            .boolean()
            .optional()
            .default(false)
            .describe('Show branch graph'),
        stat: z
            .boolean()
            .optional()
            .default(false)
            .describe('Show diff stats for each commit'),
        follow: z
            .boolean()
            .optional()
            .default(false)
            .describe('Follow file renames'),
        noMerges: z
            .boolean()
            .optional()
            .default(false)
            .describe('Exclude merge commits'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        log: z.string(),
        commits: z.array(
            z.object({
                hash: z.string(),
                author: z.string(),
                date: z.string(),
                message: z.string(),
                stats: z
                    .object({
                        insertions: z.number().optional(),
                        deletions: z.number().optional(),
                        files: z.number().optional(),
                    })
                    .optional(),
            })
        ),
        totalCommits: z.number(),
        summary: z
            .object({
                authors: z.record(z.string(), z.number()),
                dateRange: z
                    .object({
                        earliest: z.string(),
                        latest: z.string(),
                    })
                    .optional(),
                totalInsertions: z.number(),
                totalDeletions: z.number(),
            })
            .optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext

        const requestCtx = context?.requestContext as GitToolContext | undefined
        const maxCommits = requestCtx?.maxCommits ?? 100
        const timeout = requestCtx?.timeout ?? 30000
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Git log cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📜 Fetching git log...`,
                stage: 'git:log',
            },
            id: 'git:log',
        })

        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'git-log',
            input: { count: inputData.count, oneline: inputData.oneline },
            metadata: {
                'tool.id': 'git:log',
                'tool.input.count': inputData.count,
                'tool.input.oneline': inputData.oneline,
            },
        })

        try {
            const cwd = inputData.repoPath ?? process.cwd()
            const actualCount = Math.min(inputData.count, maxCommits)
            const args = ['log']

            // Basic formatting
            if (inputData.oneline) {
                args.push('--oneline')
            } else if (inputData.graph) {
                args.push(
                    '--graph',
                    '--pretty=format:%h -%d %s (%cr) <%an>',
                    '--abbrev-commit'
                )
            } else {
                args.push('--pretty=format:%H|%an|%ad|%s', '--date=iso')
            }

            // Limits and filters
            args.push(`--max-count=${actualCount}`)

            if (inputData.author) {
                args.push(`--author=${inputData.author}`)
            }

            if (inputData.since) {
                args.push(`--since=${inputData.since}`)
            }

            if (inputData.until) {
                args.push(`--until=${inputData.until}`)
            }

            if (inputData.grep) {
                args.push(`--grep=${inputData.grep}`)
            }

            if (inputData.follow) {
                args.push('--follow')
            }

            if (inputData.noMerges) {
                args.push('--no-merges')
            }

            if (inputData.branch) {
                args.push(inputData.branch)
            }

            if (inputData.path) {
                args.push('--', inputData.path)
            }

            const result = await execa('git', args, {
                cwd,
                stdio: 'pipe',
                timeout,
            })

            const logOutput = result.stdout || ''
            const commits: Array<{
                hash: string
                author: string
                date: string
                message: string
                stats?: {
                    insertions?: number
                    deletions?: number
                    files?: number
                }
            }> = []

            if (!inputData.oneline && !inputData.graph && logOutput) {
                const lines = logOutput
                    .split('\n')
                    .filter((line) => line.trim())
                for (const line of lines) {
                    const [hash, author, date, ...messageParts] =
                        line.split('|')
                    if (hash && author && date) {
                        const commit: {
                            hash: string
                            author: string
                            date: string
                            message: string
                            stats?: {
                                insertions?: number
                                deletions?: number
                                files?: number
                            }
                        } = {
                            hash,
                            author,
                            date,
                            message: messageParts.join('|'),
                        }

                        // Get stats for this commit if requested
                        if (inputData.stat) {
                            try {
                                const statResult = await execa(
                                    'git',
                                    ['show', '--stat', '--format=', hash],
                                    {
                                        cwd,
                                        stdio: 'pipe',
                                        timeout: 5000,
                                    }
                                )
                                const statOutput = statResult.stdout || ''
                                const statMatch =
                                    /(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/.exec(
                                        statOutput
                                    )
                                if (statMatch) {
                                    commit.stats = {
                                        files: parseInt(statMatch[1]),
                                        insertions: parseInt(statMatch[2]) || 0,
                                        deletions: parseInt(statMatch[3]) || 0,
                                    }
                                }
                            } catch {
                                // Ignore stat errors
                            }
                        }

                        commits.push(commit)
                    }
                }
            }

            // Compute summary statistics
            const authors: Record<string, number> = {}
            let earliestDate: string | undefined
            let latestDate: string | undefined
            let totalInsertions = 0
            let totalDeletions = 0

            for (const commit of commits) {
                // Count commits per author
                if (!authors[commit.author]) {
                    authors[commit.author] = 0
                }
                authors[commit.author]++

                // Track date range
                if (!earliestDate || commit.date < earliestDate) {
                    earliestDate = commit.date
                }
                if (!latestDate || commit.date > latestDate) {
                    latestDate = commit.date
                }

                // Sum insertions and deletions
                if (commit.stats) {
                    totalInsertions += commit.stats.insertions ?? 0
                    totalDeletions += commit.stats.deletions ?? 0
                }
            }

            const summary = {
                authors,
                dateRange:
                    earliestDate && latestDate
                        ? { earliest: earliestDate, latest: latestDate }
                        : undefined,
                totalInsertions,
                totalDeletions,
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Git log retrieved (${commits.length} commits)`,
                    stage: 'git:log',
                },
                id: 'git:log',
            })

            span?.update({
                output: { success: true, commitCount: commits.length },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.commitCount': commits.length,
                },
            })
            span?.end()

            return {
                success: true,
                log: logOutput,
                commits,
                totalCommits: commits.length,
                summary,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`Git log failed: ${errorMsg}`)

            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true,
            })

            return {
                success: false,
                log: '',
                commits: [],
                totalCommits: 0,
                message: errorMsg,
            }
        }
    },
})

// New Git Branch Management Tool
export const gitBranchTool = createTool({
    id: 'git:branch',
    description:
        'Comprehensive git branch management (create, delete, switch, rename, list)',
    inputSchema: z.object({
        repoPath: z.string().optional().describe('Path to the git repository'),
        operation: z
            .enum([
                'list',
                'create',
                'delete',
                'switch',
                'rename',
                'merge',
                'rebase',
            ])
            .describe('Branch operation to perform'),
        branchName: z
            .string()
            .optional()
            .describe('Branch name for operations'),
        newBranchName: z
            .string()
            .optional()
            .describe('New branch name for rename operation'),
        baseBranch: z
            .string()
            .optional()
            .describe('Base branch for create operation'),
        targetBranch: z
            .string()
            .optional()
            .describe('Target branch for merge/rebase operations'),
        force: z
            .boolean()
            .optional()
            .default(false)
            .describe('Force operation (for delete/switch)'),
        remote: z
            .boolean()
            .optional()
            .default(false)
            .describe('Include remote branches in list'),
        all: z
            .boolean()
            .optional()
            .default(false)
            .describe('Show all branches (local and remote)'),
        track: z
            .boolean()
            .optional()
            .default(false)
            .describe('Set up tracking for new branch'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        branches: z
            .array(
                z.object({
                    name: z.string(),
                    current: z.boolean(),
                    remote: z.boolean(),
                    lastCommit: z.string().optional(),
                    tracking: z.string().optional(),
                })
            )
            .optional(),
        currentBranch: z.string().optional(),
        affectedCommits: z.number().optional(),
        conflicts: z.array(z.string()).optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext

        const { timeout } = gitToolContextSchema.parse(
            requestContext?.get('gitToolContext')
        )
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Git branch cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🌿 Performing git branch ${inputData.operation}...`,
                stage: 'git:branch',
            },
            id: 'git:branch',
        })

        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'git-branch',
            input: {
                operation: inputData.operation,
                branchName: inputData.branchName,
            },
            metadata: {
                'tool.id': 'git:branch',
                'tool.input.operation': inputData.operation,
            },
        })

        try {
            const cwd = inputData.repoPath ?? process.cwd()
            let result: any = {}

            switch (inputData.operation) {
                case 'list': {
                    const args = ['branch']
                    if (inputData.all || inputData.remote) {
                        args.push('-a')
                    } else {
                        args.push('-l')
                    }
                    args.push(
                        '--format=%(refname:short)|%(HEAD)|%(upstream:short)|%(committerdate:iso)'
                    )

                    const branchResult = await execa('git', args, {
                        cwd,
                        stdio: 'pipe',
                        timeout,
                    })

                    const currentBranchResult = await execa(
                        'git',
                        ['rev-parse', '--abbrev-ref', 'HEAD'],
                        {
                            cwd,
                            stdio: 'pipe',
                            timeout: 5000,
                        }
                    )

                    const currentBranch = currentBranchResult.stdout.trim()
                    const branches: Array<{
                        name: string
                        current: boolean
                        remote: boolean
                        lastCommit?: string
                        tracking?: string
                    }> = []

                    const lines = branchResult.stdout
                        .split('\n')
                        .filter((line) => line.trim())
                    for (const line of lines) {
                        const [name, head, upstream, date] = line.split('|')
                        if (name) {
                            const isCurrent = head === '*'
                            const isRemote =
                                name.includes('remotes/') ||
                                name.includes('origin/')
                            branches.push({
                                name: name.replace('remotes/', ''),
                                current: isCurrent,
                                remote: isRemote,
                                lastCommit: date || undefined,
                                tracking: upstream || undefined,
                            })
                        }
                    }

                    result = { branches, currentBranch }
                    break
                }

                case 'create': {
                    if (!inputData.branchName) {
                        throw new Error(
                            'Branch name required for create operation'
                        )
                    }

                    const args = ['checkout', '-b', inputData.branchName]
                    if (inputData.baseBranch) {
                        args.push(inputData.baseBranch)
                    }

                    await execa('git', args, {
                        cwd,
                        stdio: 'pipe',
                        timeout,
                    })

                    if (
                        inputData.track &&
                        inputData.baseBranch?.includes('origin/')
                    ) {
                        await execa(
                            'git',
                            [
                                'branch',
                                '--set-upstream-to',
                                inputData.baseBranch,
                                inputData.branchName,
                            ],
                            {
                                cwd,
                                stdio: 'pipe',
                                timeout: 5000,
                            }
                        )
                    }

                    result = {
                        message: `Created and switched to branch '${inputData.branchName}'`,
                    }
                    break
                }

                case 'switch': {
                    if (!inputData.branchName) {
                        throw new Error(
                            'Branch name required for switch operation'
                        )
                    }

                    const args = ['checkout', inputData.branchName]
                    if (inputData.force) {
                        args.push('--force')
                    }

                    await execa('git', args, {
                        cwd,
                        stdio: 'pipe',
                        timeout,
                    })

                    result = {
                        message: `Switched to branch '${inputData.branchName}'`,
                    }
                    break
                }

                case 'delete': {
                    if (!inputData.branchName) {
                        throw new Error(
                            'Branch name required for delete operation'
                        )
                    }

                    const args = ['branch']
                    if (inputData.force) {
                        args.push('-D')
                    } else {
                        args.push('-d')
                    }
                    args.push(inputData.branchName)

                    await execa('git', args, {
                        cwd,
                        stdio: 'pipe',
                        timeout,
                    })

                    result = {
                        message: `Deleted branch '${inputData.branchName}'`,
                    }
                    break
                }

                case 'rename': {
                    if (!inputData.branchName || !inputData.newBranchName) {
                        throw new Error(
                            'Both current and new branch names required for rename operation'
                        )
                    }

                    await execa(
                        'git',
                        [
                            'branch',
                            '-m',
                            inputData.branchName,
                            inputData.newBranchName,
                        ],
                        {
                            cwd,
                            stdio: 'pipe',
                            timeout,
                        }
                    )

                    result = {
                        message: `Renamed branch '${inputData.branchName}' to '${inputData.newBranchName}'`,
                    }
                    break
                }

                case 'merge': {
                    if (!inputData.targetBranch) {
                        throw new Error(
                            'Target branch required for merge operation'
                        )
                    }

                    const args = ['merge', inputData.targetBranch]
                    if (inputData.force) {
                        args.push('--no-ff')
                    }

                    const mergeResult = await execa('git', args, {
                        cwd,
                        stdio: 'pipe',
                        timeout: (timeout ?? 30000) * 2, // Merges can take longer
                    })

                    // Check for conflicts
                    const statusResult = await execa(
                        'git',
                        ['status', '--porcelain'],
                        {
                            cwd,
                            stdio: 'pipe',
                            timeout: 5000,
                        }
                    )

                    const conflicts = statusResult.stdout
                        .split('\n')
                        .filter((line) => line.includes('U'))
                        .map((line) => line.substring(3))

                    result = {
                        message:
                            conflicts.length > 0
                                ? 'Merge completed with conflicts'
                                : 'Merge completed successfully',
                        conflicts: conflicts.length > 0 ? conflicts : undefined,
                    }
                    break
                }

                case 'rebase': {
                    if (!inputData.targetBranch) {
                        throw new Error(
                            'Target branch required for rebase operation'
                        )
                    }

                    await execa('git', ['rebase', inputData.targetBranch], {
                        cwd,
                        stdio: 'pipe',
                        timeout: (timeout ?? 30000) * 2, // Merges can take longer
                    })

                    result = {
                        message: `Successfully rebased onto '${inputData.targetBranch}'`,
                    }
                    break
                }

                default:
                    throw new Error(`Unknown operation: ${inputData.operation}`)
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Git branch ${inputData.operation} completed`,
                    stage: 'git:branch',
                },
                id: 'git:branch',
            })

            span?.update({
                output: { success: true, operation: inputData.operation },
                metadata: {
                    'tool.output.success': true,
                    'tool.input.operation': inputData.operation,
                },
            })
            span?.end()

            return {
                success: true,
                ...result,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`Git branch failed: ${errorMsg}`)

            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true,
            })

            return {
                success: false,
                message: errorMsg,
            }
        }
    },
})

// New Git Stash Management Tool
export const gitStashTool = createTool({
    id: 'git:stash',
    description:
        'Advanced git stash management with detailed information and operations',
    inputSchema: z.object({
        repoPath: z.string().optional().describe('Path to the git repository'),
        operation: z
            .enum([
                'list',
                'save',
                'apply',
                'drop',
                'pop',
                'show',
                'clear',
                'create',
            ])
            .describe('Stash operation to perform'),
        message: z.string().optional().describe('Message for save operation'),
        stashIndex: z
            .number()
            .optional()
            .describe('Stash index for apply/drop/pop/show operations'),
        includeUntracked: z
            .boolean()
            .optional()
            .default(false)
            .describe('Include untracked files in stash'),
        includeIgnored: z
            .boolean()
            .optional()
            .default(false)
            .describe('Include ignored files in stash'),
        patch: z
            .boolean()
            .optional()
            .default(false)
            .describe('Interactively select hunks for stash'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        stashes: z
            .array(
                z.object({
                    index: z.number(),
                    message: z.string(),
                    date: z.string(),
                    author: z.string(),
                    branch: z.string().optional(),
                    files: z.number().optional(),
                })
            )
            .optional(),
        appliedFiles: z.number().optional(),
        stashHash: z.string().optional(),
        diff: z.string().optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext

        const { timeout } = gitToolContextSchema.parse(
            requestContext?.get('gitToolContext')
        )
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Git stash cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📦 Performing git stash ${inputData.operation}...`,
                stage: 'git:stash',
            },
            id: 'git:stash',
        })

        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'git-stash',
            input: {
                operation: inputData.operation,
                stashIndex: inputData.stashIndex,
            },
            metadata: {
                'tool.id': 'git:stash',
                'tool.input.operation': inputData.operation,
            },
        })

        try {
            const cwd = inputData.repoPath || process.cwd()
            let result: any = {}

            switch (inputData.operation) {
                case 'list': {
                    const stashResult = await execa(
                        'git',
                        ['stash', 'list', '--pretty=format:%gd|%gs|%ai|%an|%D'],
                        {
                            cwd,
                            stdio: 'pipe',
                            timeout,
                        }
                    )

                    const stashes: Array<{
                        index: number
                        message: string
                        date: string
                        author: string
                        branch?: string
                        files?: number
                    }> = []
                    const lines = stashResult.stdout
                        .split('\n')
                        .filter((line) => line.trim())

                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i]
                        const parts = line.split('|')
                        if (parts.length >= 4) {
                            stashes.push({
                                index: i,
                                message: parts[1] || '',
                                date: parts[2] || '',
                                author: parts[3] || '',
                                branch: parts[4] || undefined,
                            })
                        }
                    }

                    result = { stashes }
                    break
                }

                case 'save': {
                    const args = ['stash']
                    if (inputData.includeUntracked) {
                        args.push('-u')
                    }
                    if (inputData.includeIgnored) {
                        args.push('--include-untracked')
                    }
                    if (inputData.message) {
                        args.push('save', inputData.message)
                    } else {
                        args.push('save')
                    }

                    await execa('git', args, {
                        cwd,
                        stdio: 'pipe',
                        timeout,
                    })

                    result = { message: 'Stashed changes' }
                    break
                }

                case 'apply': {
                    const args = ['stash', 'apply']
                    if (inputData.stashIndex !== undefined) {
                        args.push(`stash@{${inputData.stashIndex}}`)
                    }
                    if (inputData.includeUntracked) {
                        args.push('--index')
                    }

                    await execa('git', args, {
                        cwd,
                        stdio: 'pipe',
                        timeout,
                    })

                    result = { message: 'Applied stash' }
                    break
                }

                case 'pop': {
                    const args = ['stash', 'pop']
                    if (inputData.stashIndex !== undefined) {
                        args.push(`stash@{${inputData.stashIndex}}`)
                    }

                    await execa('git', args, {
                        cwd,
                        stdio: 'pipe',
                        timeout,
                    })

                    result = { message: 'Popped stash' }
                    break
                }

                case 'drop': {
                    const args = ['stash', 'drop']
                    if (inputData.stashIndex !== undefined) {
                        args.push(`stash@{${inputData.stashIndex}}`)
                    }

                    await execa('git', args, {
                        cwd,
                        stdio: 'pipe',
                        timeout,
                    })

                    result = { message: 'Dropped stash' }
                    break
                }

                case 'show': {
                    const args = ['stash', 'show']
                    if (inputData.stashIndex !== undefined) {
                        args.push(`stash@{${inputData.stashIndex}}`)
                    }

                    const showResult = await execa('git', args, {
                        cwd,
                        stdio: 'pipe',
                        timeout,
                    })

                    const diffResult = await execa(
                        'git',
                        [
                            'stash',
                            'show',
                            '-p',
                            inputData.stashIndex !== undefined
                                ? `stash@{${inputData.stashIndex}}`
                                : 'stash@{0}',
                        ],
                        {
                            cwd,
                            stdio: 'pipe',
                            timeout,
                        }
                    )

                    result = {
                        diff: diffResult.stdout || '',
                    }
                    break
                }

                case 'clear': {
                    await execa('git', ['stash', 'clear'], {
                        cwd,
                        stdio: 'pipe',
                        timeout,
                    })

                    result = { message: 'Cleared all stashes' }
                    break
                }

                case 'create': {
                    const createResult = await execa(
                        'git',
                        ['stash', 'create', inputData.message || ''],
                        {
                            cwd,
                            stdio: 'pipe',
                            timeout,
                        }
                    )

                    result = {
                        stashHash: createResult.stdout.trim() || undefined,
                    }
                    break
                }

                default:
                    throw new Error(`Unknown operation: ${inputData.operation}`)
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Git stash ${inputData.operation} completed`,
                    stage: 'git:stash',
                },
                id: 'git:stash',
            })

            span?.update({
                output: { success: true, operation: inputData.operation },
                metadata: {
                    'tool.output.success': true,
                    'tool.input.operation': inputData.operation,
                },
            })
            span?.end()

            return {
                success: true,
                ...result,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`Git stash failed: ${errorMsg}`)

            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true,
            })

            return {
                success: false,
                message: errorMsg,
            }
        }
    },
})

// New Git Config Management Tool
export const gitConfigTool = createTool({
    id: 'git:config',
    description:
        'Manage git configuration settings (get, set, list, unset)',
    inputSchema: z.object({
        repoPath: z.string().optional().describe('Path to the git repository'),
        operation: z
            .enum(['get', 'set', 'list', 'unset'])
            .describe('Configuration operation to perform'),
        key: z.string().optional().describe('Configuration key'),
        value: z.string().optional().describe('Configuration value for set operation'),
        global: z
            .boolean()
            .optional()
            .default(false)
            .describe('Use global configuration instead of local'),
        local: z
            .boolean()
            .optional()
            .default(false)
            .describe('Use local configuration (repository-specific)'),
        system: z
            .boolean()
            .optional()
            .default(false)
            .describe('Use system-wide configuration'),
        showOrigin: z
            .boolean()
            .optional()
            .default(false)
            .describe('Show the origin of the configuration'),
        showScope: z
            .boolean()
            .optional()
            .default(false)
            .describe('Show the scope of the configuration'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        config: z.record(z.string(), z.string()).optional(),
        value: z.string().optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext

        const { timeout } = gitToolContextSchema.parse(
            requestContext?.get('gitToolContext')
        )
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Git config cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `⚙️ Performing git config ${inputData.operation}...`,
                stage: 'git:config',
            },
            id: 'git:config',
        })

        const tracingContext = context?.tracingContext
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'git-config',
            input: {
                operation: inputData.operation,
                key: inputData.key,
            },
            metadata: {
                'tool.id': 'git:config',
                'tool.input.operation': inputData.operation,
            },
        })

        try {
            const cwd = inputData.repoPath ?? process.cwd()
            let result: any = {}

            switch (inputData.operation) {
                case 'get': {
                    if (!inputData.key) {
                        throw new Error('Key required for get operation')
                    }

                    const args = ['config']
                    if (inputData.global) {
                        args.push('--global')
                    } else if (inputData.local) {
                        args.push('--local')
                    } else if (inputData.system) {
                        args.push('--system')
                    }
                    if (inputData.showOrigin) {
                        args.push('--show-origin')
                    }
                    args.push(inputData.key)

                    const configResult = await execa('git', args, {
                        cwd,
                        stdio: 'pipe',
                        timeout,
                    })

                    result = { value: configResult.stdout.trim() }
                    break
                }

                case 'set': {
                    if (!inputData.key || inputData.value === undefined) {
                        throw new Error('Key and value required for set operation')
                    }

                    const args = ['config']
                    if (inputData.global) {
                        args.push('--global')
                    } else if (inputData.local) {
                        args.push('--local')
                    } else if (inputData.system) {
                        args.push('--system')
                    }
                    args.push(inputData.key, inputData.value)

                    await execa('git', args, {
                        cwd,
                        stdio: 'pipe',
                        timeout,
                    })

                    result = { message: `Set ${inputData.key} = ${inputData.value}` }
                    break
                }

                case 'list': {
                    const args = ['config', '--list']
                    if (inputData.global) {
                        args.push('--global')
                    } else if (inputData.local) {
                        args.push('--local')
                    } else if (inputData.system) {
                        args.push('--system')
                    }
                    if (inputData.showOrigin) {
                        args.push('--show-origin')
                    }
                    if (inputData.showScope) {
                        args.push('--show-scope')
                    }

                    const listResult = await execa('git', args, {
                        cwd,
                        stdio: 'pipe',
                        timeout,
                    })

                    const config: Record<string, string> = {}
                    const lines = listResult.stdout
                        .split('\n')
                        .filter((line) => line.trim())
                    for (const line of lines) {
                        const [key, ...valueParts] = line.split('=')
                        if (key && valueParts.length > 0) {
                            config[key.trim()] = valueParts.join('=').trim()
                        }
                    }

                    result = { config }
                    break
                }

                case 'unset': {
                    if (!inputData.key) {
                        throw new Error('Key required for unset operation')
                    }

                    const args = ['config', '--unset']
                    if (inputData.global) {
                        args.push('--global')
                    } else if (inputData.local) {
                        args.push('--local')
                    } else if (inputData.system) {
                        args.push('--system')
                    }
                    args.push(inputData.key)

                    await execa('git', args, {
                        cwd,
                        stdio: 'pipe',
                        timeout,
                    })

                    result = { message: `Unset ${inputData.key}` }
                    break
                }

                default:
                    throw new Error(`Unknown operation: ${inputData.operation}`)
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Git config ${inputData.operation} completed`,
                    stage: 'git:config',
                },
                id: 'git:config',
            })

            span?.update({
                output: { success: true, operation: inputData.operation },
                metadata: {
                    'tool.output.success': true,
                    'tool.input.operation': inputData.operation,
                },
            })
            span?.end()

            return {
                success: true,
                ...result,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`Git config failed: ${errorMsg}`)

            span?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true,
            })

            return {
                success: false,
                message: errorMsg,
            }
        }
    },
})

export type GitStatusUITool = InferUITool<typeof gitStatusTool>
export type GitDiffUITool = InferUITool<typeof gitDiffTool>
export type GitCommitUITool = InferUITool<typeof gitCommitTool>
export type GitLogUITool = InferUITool<typeof gitLogTool>
export type GitBranchUITool = InferUITool<typeof gitBranchTool>
export type GitStashUITool = InferUITool<typeof gitStashTool>
export type GitConfigUITool = InferUITool<typeof gitConfigTool>
