import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import fg from 'fast-glob'
import type { Options as FastGlobOptions } from 'fast-glob'
import stripComments from 'strip-comments'
import { trace, SpanStatusCode } from '@opentelemetry/api'
import { PythonParser } from './semantic-utils'
import { log } from '../config/logger'
// RequestContext typing not used to avoid incompatibility with ToolExecutionContext

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
    }
}

const fastGlobDefaults: FastGlobOptions = {
    onlyFiles: true,
    absolute: true,
    dot: true,
    unique: true,
}

async function globFiles(
    pattern: string,
    options?: FastGlobOptions
): Promise<string[]> {
    return fg(pattern, { ...fastGlobDefaults, ...options })
}

const DEFAULT_IGNORE = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
]

const codeAnalysisInputSchema = z.object({
    target: z
        .union([
            z.string().describe('File path or glob pattern'),
            z.array(z.string()).describe('Array of file paths'),
        ])
        .describe('Files to analyze'),
    options: z
        .object({
            includeMetrics: z
                .boolean()
                .default(true)
                .describe('Calculate LOC and complexity'),
            detectPatterns: z
                .boolean()
                .default(true)
                .describe('Detect code patterns and issues'),
            maxFileSize: z
                .number()
                .default(100000)
                .describe('Skip files larger than this (bytes)'),
        })
        .optional(),
})

const issueSchema = z.object({
    type: z.enum(['error', 'warning', 'info']),
    line: z.number(),
    column: z.number().optional(),
    message: z.string(),
    rule: z.string().optional(),
})

const fileAnalysisSchema = z.object({
    path: z.string(),
    language: z.string(),
    loc: z.number().describe('Lines of code (non-empty, non-comment)'),
    totalLines: z.number(),
    complexity: z.number().describe('Estimated cyclomatic complexity'),
    issues: z.array(issueSchema),
})

const codeAnalysisOutputSchema = z.object({
    files: z.array(fileAnalysisSchema),
    summary: z.object({
        totalFiles: z.number(),
        totalLoc: z.number(),
        avgComplexity: z.number(),
        issueCount: z.record(z.string(), z.number()),
    }),
})

export type CodeAnalysisInput = z.infer<typeof codeAnalysisInputSchema>
export type CodeAnalysisOutput = z.infer<typeof codeAnalysisOutputSchema>

const LANGUAGE_MAP: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.rs': 'rust',
    '.go': 'go',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.md': 'markdown',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
}

function detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    return LANGUAGE_MAP[ext] || 'unknown'
}

function calculateLoc(content: string): { loc: number; totalLines: number } {
    const totalLines = content.split('\n').length
    let sanitized = content

    try {
        sanitized = stripComments(content, { preserveNewlines: true })
    } catch {
        sanitized = content
    }

    const loc = sanitized
        .split('\n')
        .reduce((count, line) => (line.trim() ? count + 1 : count), 0)

    return { loc, totalLines }
}

/**
 * Estimates the cyclomatic complexity of the given code content.
 * This function counts decision points in the code such as if statements, loops, ternary operators, and logical operators.
 * Starts with a base complexity of 1 and increments for each matching pattern.
 * @param content The code content as a string.
 * @param language The programming language of the code (e.g., 'typescript', 'javascript', 'python').
 * @returns The estimated complexity number.
 */
function estimateComplexity(content: string, language: string): number {
    let complexity = 1

    const languagePatterns: Record<string, RegExp[]> = {
        typescript: [
            /\bif\b/g,
            /\belse\s+if\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\bcase\b/g,
            /\bcatch\b/g,
            /\b\?\s*[^:]+\s*:/g, // ternary
            /&&/g,
            /\|\|/g,
        ],
        javascript: [
            /\bif\b/g,
            /\belse\s+if\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\bcase\b/g,
            /\bcatch\b/g,
            /\b\?\s*[^:]+\s*:/g, // ternary
            /&&/g,
            /\|\|/g,
        ],
        python: [
            /\bif\b/g,
            /\belif\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\band\b/g,
            /\bor\b/g,
        ],
        java: [
            /\bif\b/g,
            /\belse\s+if\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\bcase\b/g,
            /\bcatch\b/g,
            /\b\?\s*[^:]+\s*:/g, // ternary
            /&&/g,
            /\|\|/g,
        ],
        cpp: [
            /\bif\b/g,
            /\belse\s+if\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\bcase\b/g,
            /\bcatch\b/g,
            /\b\?\s*[^:]+\s*:/g, // ternary
            /&&/g,
            /\|\|/g,
        ],
        c: [
            /\bif\b/g,
            /\belse\s+if\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\bcase\b/g,
            /\b\?\s*[^:]+\s*:/g, // ternary
            /&&/g,
            /\|\|/g,
        ],
        csharp: [
            /\bif\b/g,
            /\belse\s+if\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\bcase\b/g,
            /\bcatch\b/g,
            /\b\?\s*[^:]+\s*:/g, // ternary
            /&&/g,
            /\|\|/g,
        ],
        rust: [
            /\bif\b/g,
            /\belse\s+if\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\bmatch\b/g,
            /\b\?\s*[^:]+\s*:/g, // ternary
            /&&/g,
            /\|\|/g,
        ],
        go: [
            /\bif\b/g,
            /\belse\s+if\b/g,
            /\bfor\b/g,
            /\bcase\b/g,
            /\b\?\s*[^:]+\s*:/g, // ternary
            /&&/g,
            /\|\|/g,
        ],
        ruby: [
            /\bif\b/g,
            /\belsif\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\bcase\b/g,
            /\band\b/g,
            /\bor\b/g,
        ],
        php: [
            /\bif\b/g,
            /\belseif\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\bcase\b/g,
            /\bcatch\b/g,
            /\b\?\s*[^:]+\s*:/g, // ternary
            /&&/g,
            /\|\|/g,
        ],
        swift: [
            /\bif\b/g,
            /\belse\s+if\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\bcase\b/g,
            /\bcatch\b/g,
            /\b\?\s*[^:]+\s*:/g, // ternary
            /&&/g,
            /\|\|/g,
        ],
        kotlin: [
            /\bif\b/g,
            /\belse\s+if\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\bwhen\b/g,
            /\bcatch\b/g,
            /\b\?\s*[^:]+\s*:/g, // ternary
            /&&/g,
            /\|\|/g,
        ],
    }

    const patterns =
        language in languagePatterns
            ? languagePatterns[language]
            : languagePatterns['typescript'] // default to typescript patterns

    for (const pattern of patterns) {
        const matches = content.match(pattern)
        if (matches) {
            complexity += matches.length
        }
    }

    return complexity
}

function detectIssues(
    content: string,
    language: string
): Array<z.infer<typeof issueSchema>> {
    const issues: Array<z.infer<typeof issueSchema>> = []
    const lines = content.split('\n')

    const patterns = [
        {
            regex: /console\.log\(/g,
            message: 'Console statement found',
            rule: 'no-console',
            type: 'warning' as const,
        },
        {
            regex: /debugger/g,
            message: 'Debugger statement found',
            rule: 'no-debugger',
            type: 'error' as const,
        },
        {
            regex: /TODO:/gi,
            message: 'TODO comment found',
            rule: 'no-todo',
            type: 'info' as const,
        },
        {
            regex: /FIXME:/gi,
            message: 'FIXME comment found',
            rule: 'no-fixme',
            type: 'warning' as const,
        },
        {
            regex: /HACK:/gi,
            message: 'HACK comment found',
            rule: 'no-hack',
            type: 'warning' as const,
        },
        {
            regex: /any(?:\s|;|,|\))/g,
            message: 'Explicit any type',
            rule: 'no-explicit-any',
            type: 'warning' as const,
        },
        {
            regex: /==(?!=)/g,
            message: 'Loose equality used',
            rule: 'eqeqeq',
            type: 'warning' as const,
        },
        {
            regex: /\bvar\b/g,
            message: 'var keyword used (prefer const/let)',
            rule: 'no-var',
            type: 'info' as const,
        },
    ]

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        for (const pattern of patterns) {
            if (
                language === 'typescript' ||
                language === 'javascript' ||
                pattern.rule === 'no-todo' ||
                pattern.rule === 'no-fixme' ||
                pattern.rule === 'no-hack'
            ) {
                if (pattern.regex.test(line)) {
                    issues.push({
                        type: pattern.type,
                        line: i + 1,
                        message: pattern.message,
                        rule: pattern.rule,
                    })
                }
                pattern.regex.lastIndex = 0
            }
        }

        if (line.length > 120) {
            issues.push({
                type: 'info',
                line: i + 1,
                message: `Line exceeds 120 characters (${line.length})`,
                rule: 'max-line-length',
            })
        }
    }

    return issues
}

export const codeAnalysisTool = createTool({
    id: 'coding:codeAnalysis',
    description: `Analyze source code files for metrics and issues.
Returns lines of code, complexity estimates, and detected patterns.
Supports TypeScript, JavaScript, Python, and other languages.
Use for code review preparation, quality assessment, and refactoring planning.`,
    inputSchema: codeAnalysisInputSchema,
    outputSchema: codeAnalysisOutputSchema,
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Code analysis tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Code analysis tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Code analysis tool received input', {
            toolCallId,
            messageCount: messages.length,
            inputData: { target: input.target, options: input.options },
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Code analysis tool completed', {
            toolCallId,
            toolName,
            outputData: {
                totalFiles: output.summary.totalFiles,
                totalLoc: output.summary.totalLoc,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
    execute: async (inputData, context): Promise<CodeAnalysisOutput> => {
        const writer = context?.writer
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔬 Starting code analysis for target: ${Array.isArray(inputData.target) ? inputData.target.join(',') : inputData.target}`,
                stage: 'coding:codeAnalysis',
            },
            id: 'coding:codeAnalysis',
        })
        const tracer = trace.getTracer('code-analysis-tool', '1.0.0')
        const span = tracer.startSpan('code-analysis', {
            attributes: {
                'tool.id': 'code-analysis',
                'tool.input.target': Array.isArray(inputData.target)
                    ? inputData.target.join(',')
                    : inputData.target,
            },
        })

        try {
            const { target, options } = inputData
            const includeMetrics = options?.includeMetrics ?? true
            const detectPatterns = options?.detectPatterns ?? true
            const maxFileSize = options?.maxFileSize ?? 100000

            const targets = Array.isArray(target) ? target : [target]
            let filePaths: string[] = []

            for (const t of targets) {
                if (t.includes('*')) {
                    const matches = await globFiles(t, {
                        ignore: DEFAULT_IGNORE,
                    })
                    filePaths.push(...matches)
                    continue
                }

                if (!(await fileExists(t))) {
                    continue
                }

                const stat = await fs.stat(t)
                if (stat.isDirectory()) {
                    const dirFiles = await globFiles(path.join(t, '**/*'), {
                        ignore: DEFAULT_IGNORE,
                    })
                    filePaths.push(...dirFiles)
                } else if (stat.isFile()) {
                    filePaths.push(t)
                }
            }

            filePaths = [...new Set(filePaths)]

            const fileAnalyses: Array<z.infer<typeof fileAnalysisSchema>> = []

            for (const filePath of filePaths) {
                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'in-progress',
                        message: `📄 Analyzing file: ${filePath}`,
                        stage: 'coding:codeAnalysis',
                    },
                    id: 'coding:codeAnalysis',
                })

                try {
                    const stats = await fs.stat(filePath)
                    if (!stats.isFile()) {
                        continue
                    }
                    if (stats.size > maxFileSize) {
                        continue
                    }

                    const content = await fs.readFile(filePath, 'utf-8')
                    const language = detectLanguage(filePath)

                    const { loc, totalLines } = includeMetrics
                        ? calculateLoc(content)
                        : { loc: 0, totalLines: 0 }

                    let complexity = 0
                    if (includeMetrics) {
                        if (language === 'python') {
                            try {
                                const complexityData =
                                    await PythonParser.analyzeComplexity(
                                        content
                                    )
                                complexity = complexityData.cyclomaticComplexity
                            } catch {
                                complexity = estimateComplexity(
                                    content,
                                    language
                                )
                            }
                        } else {
                            complexity = estimateComplexity(content, language)
                        }
                    }

                    const issues = detectPatterns
                        ? detectIssues(content, language)
                        : []

                    fileAnalyses.push({
                        path: filePath,
                        language,
                        loc,
                        totalLines,
                        complexity,
                        issues,
                    })
                } catch {
                    // Skip unreadable files
                }
            }

            const totalLoc = fileAnalyses.reduce((sum, f) => sum + f.loc, 0)
            const avgComplexity =
                fileAnalyses.length > 0
                    ? fileAnalyses.reduce((sum, f) => sum + f.complexity, 0) /
                      fileAnalyses.length
                    : 0

            const issueCount: Record<string, number> = {}
            for (const file of fileAnalyses) {
                for (const issue of file.issues) {
                    issueCount[issue.type] = (issueCount[issue.type] || 0) + 1
                }
            }

            span.setAttributes({
                'tool.output.totalFiles': fileAnalyses.length,
                'tool.output.totalLoc': totalLoc,
                'tool.output.avgComplexity': avgComplexity,
            })
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Code analysis complete: ${fileAnalyses.length} files analyzed`,
                    stage: 'coding:codeAnalysis',
                },
                id: 'coding:codeAnalysis',
            })
            span.end()

            return {
                files: fileAnalyses,
                summary: {
                    totalFiles: fileAnalyses.length,
                    totalLoc,
                    avgComplexity: Math.round(avgComplexity * 100) / 100,
                    issueCount,
                },
            }
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            span?.recordException(
                error instanceof Error ? error : new Error(errorMessage)
            )
            span?.setStatus({
                code: SpanStatusCode.ERROR,
                message: errorMessage,
            })
            span?.end()
            throw error
        }
    },
})
