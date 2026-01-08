import { createTool } from '@mastra/core/tools'
import { SpanStatusCode, trace } from '@opentelemetry/api'
import fg, { type Options as FastGlobOptions } from 'fast-glob'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import RE2 from 're2'
import { z } from 'zod'
import type { RequestContext } from '@mastra/core/request-context'
import { log } from '../config/logger'

export interface CodeSearchRequestContext extends RequestContext {
    caseSensitive?: boolean
    maxResults?: number
    includeContext?: boolean
    contextLines?: number
    maxFileSize?: number
}

interface RegexLike {
    lastIndex?: number
    exec: RegExp['exec']
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
    }
}

const defaultGlobOptions: FastGlobOptions = {
    onlyFiles: true,
    absolute: true,
    dot: true,
    unique: true,
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
}

async function globFiles(
    pattern: string,
    options?: FastGlobOptions
): Promise<string[]> {
    return fg(pattern, { ...defaultGlobOptions, ...options })
}

const codeSearchInputSchema = z.object({
    pattern: z.string().describe('Search pattern (string or regex)'),
    target: z
        .union([
            z.string().describe('File path or glob pattern'),
            z.array(z.string()).describe('Array of file paths or globs'),
        ])
        .describe('Files to search'),
    options: z
        .object({
            isRegex: z.boolean().optional().describe('Treat pattern as regex'),
            caseSensitive: z
                .boolean()
                .optional()
                .describe('Case-sensitive search'),
            maxResults: z
                .number()
                .optional()
                .describe('Maximum results to return'),
            includeContext: z
                .boolean()
                .optional()
                .describe('Include surrounding lines'),
            contextLines: z
                .number()
                .optional()
                .describe('Number of context lines'),
            maxFileSize: z
                .number()
                .optional()
                .describe('Skip files larger than this (bytes)'),
        })
        .optional(),
})

const matchSchema = z.object({
    file: z.string(),
    line: z.number(),
    column: z.number(),
    content: z.string(),
    context: z
        .object({
            before: z.array(z.string()),
            after: z.array(z.string()),
        })
        .optional(),
})

const codeSearchOutputSchema = z.object({
    matches: z.array(matchSchema),
    stats: z.object({
        totalMatches: z.number(),
        filesSearched: z.number(),
        filesWithMatches: z.number(),
    }),
    truncated: z.boolean(),
})

export type CodeSearchInput = z.infer<typeof codeSearchInputSchema>
export type CodeSearchOutput = z.infer<typeof codeSearchOutputSchema>

export const codeSearchTool = createTool({
    id: 'coding:codeSearch',
    description: `Search for patterns across source files.
Supports string and regex patterns with context lines.
Use for finding usages, identifying patterns, and code exploration.`,
    inputSchema: codeSearchInputSchema,
    outputSchema: codeSearchOutputSchema,
    execute: async (input: z.infer<typeof codeSearchInputSchema>, context): Promise<CodeSearchOutput> => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const requestContext = context?.requestContext as CodeSearchRequestContext | undefined

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Code search cancelled')
        }
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔎 Starting code search for pattern '${input.pattern}'`,
                stage: 'coding:codeSearch',
            },
            id: 'coding:codeSearch',
        })
        const tracer = trace.getTracer('code-search')
        const span = tracer.startSpan('code-search', {
            attributes: {
                pattern: input.pattern,
                targetCount: Array.isArray(input.target)
                    ? input.target.length
                    : 1,
                operation: 'code-search',
            },
        })

        try {
            const { pattern, target, options } = input
            const isRegex = options?.isRegex ?? false
            const caseSensitive = options?.caseSensitive ?? requestContext?.caseSensitive ?? false
            const maxResults = options?.maxResults ?? requestContext?.maxResults ?? 100
            const includeContext = options?.includeContext ?? requestContext?.includeContext ?? true
            const contextLines = options?.contextLines ?? requestContext?.contextLines ?? 2
            const maxFileSize = options?.maxFileSize ?? requestContext?.maxFileSize ?? 1_000_000

            let filePaths: string[] = []
            const targets = Array.isArray(target) ? target : [target]

            for (const t of targets) {
                if (t.includes('*')) {
                    const matches = await globFiles(t)
                    filePaths.push(...matches)
                } else if (await fileExists(t)) {
                    const stat = await fs.stat(t)
                    if (stat.isFile()) {
                        filePaths.push(t)
                    } else if (stat.isDirectory()) {
                        const dirFiles = await globFiles(path.join(t, '**/*'))
                        filePaths.push(...dirFiles)
                    }
                }
            }

            filePaths = [...new Set(filePaths)]

            // Check for cancellation before file processing
            if (abortSignal?.aborted) {
                span.setStatus({
                    code: 2,
                    message: 'Operation cancelled during file processing',
                })
                span.end()
                throw new Error('Code search cancelled during file processing')
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `📁 Files to search: ${filePaths.length}`,
                    stage: 'coding:codeSearch',
                },
                id: 'coding:codeSearch',
            })

            const matches: Array<z.infer<typeof matchSchema>> = []
            const filesWithMatches = new Set<string>()
            let truncated = false

            let searchRegex: RegexLike
            try {
                if (isRegex) {
                    searchRegex = new RE2(
                        pattern,
                        caseSensitive ? 'g' : 'gi'
                    ) as unknown as RegexLike
                } else {
                    searchRegex = new RegExp(
                        pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                        caseSensitive ? 'g' : 'gi'
                    )
                }
            } catch (error) {
                throw new Error(
                    `Invalid ${isRegex ? 'regex' : 'pattern'}: ${error instanceof Error ? error.message : String(error)}`
                )
            }

            for (const filePath of filePaths) {
                if (matches.length >= maxResults) {
                    truncated = true
                    break
                }

                try {
                    const stat = await fs.stat(filePath)
                    if (!stat.isFile()) {
                        continue
                    }
                    if (stat.size > maxFileSize) {
                        continue
                    }
                    const content = await fs.readFile(filePath, 'utf-8')
                    const lines = content.split('\n')

                    for (let i = 0; i < lines.length; i++) {
                        if (matches.length >= maxResults) {
                            truncated = true
                            break
                        }

                        const line = lines[i]
                        if (typeof searchRegex.lastIndex === 'number') {
                            searchRegex.lastIndex = 0
                        }
                        let match

                        while ((match = searchRegex.exec(line)) !== null) {
                            filesWithMatches.add(filePath)

                            const contextObj = includeContext
                                ? {
                                      before: lines.slice(
                                          Math.max(0, i - contextLines),
                                          i
                                      ),
                                      after: lines.slice(
                                          i + 1,
                                          i + 1 + contextLines
                                      ),
                                  }
                                : undefined

                            matches.push({
                                file: filePath,
                                line: i + 1,
                                column: match.index + 1,
                                content: line,
                                context: contextObj,
                            })

                            if (!isRegex) {
                                break
                            }
                        }
                    }
                } catch {
                    // Skip binary or unreadable files
                }
            }

            const result = {
                matches,
                stats: {
                    totalMatches: matches.length,
                    filesSearched: filePaths.length,
                    filesWithMatches: filesWithMatches.size,
                },
                truncated,
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Code search complete: ${result.stats.totalMatches} matches across ${result.stats.filesWithMatches} files`,
                    stage: 'coding:codeSearch',
                },
                id: 'coding:codeSearch',
            })
            span.end()
            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)

            // Handle AbortError specifically
            if (error instanceof Error && error.name === 'AbortError') {
                const cancelMessage = `Code search cancelled for pattern "${input.pattern}"`
                span.setStatus({ code: 2, message: cancelMessage })
                span.end()

                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: `🛑 ${cancelMessage}`,
                        stage: 'coding:codeSearch',
                    },
                    id: 'coding:codeSearch',
                })

                log.warn(cancelMessage)
                throw new Error(cancelMessage)
            }

            span.recordException(new Error(errorMessage))
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: errorMessage,
            })
            span.end()
            throw error
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Code search tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Code search tool received input chunk', {
            toolCallId,
            inputTextDelta,
            abortSignal: abortSignal?.aborted,
            messageCount: messages.length,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        const targetDesc = Array.isArray(input.target)
            ? `${input.target.length} targets`
            : input.target
        log.info('Code search received complete input', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            pattern: input.pattern,
            target: targetDesc,
            isRegex: input.options?.isRegex ?? false,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Code search completed', {
            toolCallId,
            toolName,
            abortSignal: abortSignal?.aborted,
            totalMatches: output.stats.totalMatches,
            filesWithMatches: output.stats.filesWithMatches,
            filesSearched: output.stats.filesSearched,
            truncated: output.truncated,
            hook: 'onOutput',
        })
    },
})
