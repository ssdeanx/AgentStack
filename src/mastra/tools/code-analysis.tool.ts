import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { glob } from 'glob'
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { PythonParser } from './semantic-utils'
import type { RequestContext } from '@mastra/core/request-context';

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

const codeAnalysisInputSchema = z.object({
  target: z.union([
    z.string().describe('File path or glob pattern'),
    z.array(z.string()).describe('Array of file paths'),
  ]).describe('Files to analyze'),
  options: z.object({
    includeMetrics: z.boolean().default(true).describe('Calculate LOC and complexity'),
    detectPatterns: z.boolean().default(true).describe('Detect code patterns and issues'),
    maxFileSize: z.number().default(100000).describe('Skip files larger than this (bytes)'),
  }).optional(),
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

function calculateLoc(content: string, language: string): { loc: number; totalLines: number } {
  const lines = content.split('\n')
  const totalLines = lines.length

  let loc = 0
  let inBlockComment = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {continue}

    if (language === 'typescript' || language === 'javascript' || language === 'java' || language === 'cpp' || language === 'c' || language === 'csharp') {
      if (inBlockComment) {
        if (trimmed.includes('*/')) {inBlockComment = false}
        continue
      }
      if (trimmed.startsWith('/*')) {
        inBlockComment = !trimmed.includes('*/')
        continue
      }
      if (trimmed.startsWith('//')) {continue}
    } else if (language === 'python' || language === 'ruby') {
      if (trimmed.startsWith('#')) {continue}
    }

    loc++
  }

  return { loc, totalLines }
}

function estimateComplexity(content: string, language: string): number {
  let complexity = 1

  const patterns = [
    /\bif\b/g,
    /\belse\s+if\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /\b\?\s*[^:]+\s*:/g, // ternary
    /&&/g,
    /\|\|/g,
  ]

  for (const pattern of patterns) {
    const matches = content.match(pattern)
    if (matches) {complexity += matches.length}
  }

  return complexity
}

function detectIssues(content: string, language: string): Array<z.infer<typeof issueSchema>> {
  const issues: Array<z.infer<typeof issueSchema>> = []
  const lines = content.split('\n')

  const patterns = [
    { regex: /console\.log\(/g, message: 'Console statement found', rule: 'no-console', type: 'warning' as const },
    { regex: /debugger/g, message: 'Debugger statement found', rule: 'no-debugger', type: 'error' as const },
    { regex: /TODO:/gi, message: 'TODO comment found', rule: 'no-todo', type: 'info' as const },
    { regex: /FIXME:/gi, message: 'FIXME comment found', rule: 'no-fixme', type: 'warning' as const },
    { regex: /HACK:/gi, message: 'HACK comment found', rule: 'no-hack', type: 'warning' as const },
    { regex: /any(?:\s|;|,|\))/g, message: 'Explicit any type', rule: 'no-explicit-any', type: 'warning' as const },
    { regex: /==(?!=)/g, message: 'Loose equality used', rule: 'eqeqeq', type: 'warning' as const },
    { regex: /\bvar\b/g, message: 'var keyword used (prefer const/let)', rule: 'no-var', type: 'info' as const },
  ]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    for (const pattern of patterns) {
      if ((language === 'typescript' || language === 'javascript') || pattern.rule === 'no-todo' || pattern.rule === 'no-fixme' || pattern.rule === 'no-hack') {
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
  execute: async (inputData): Promise<CodeAnalysisOutput> => {
    const tracer = trace.getTracer('code-analysis-tool', '1.0.0');
    const span = tracer.startSpan('code-analysis', {
      attributes: {
        'tool.id': 'code-analysis',
        'tool.input.target': Array.isArray(inputData.target) ? inputData.target.join(',') : inputData.target,
      }
    });

    try {
      const { target, options } = inputData
      const includeMetrics = options?.includeMetrics ?? true
      const detectPatterns = options?.detectPatterns ?? true
      const maxFileSize = options?.maxFileSize ?? 100000

    let filePaths: string[] = []

    if (typeof target === 'string') {
      if (target.includes('*')) {
        filePaths = await glob(target, { nodir: true })
      } else {
        filePaths = [target]
      }
    } else {
      filePaths = target
    }

    const fileAnalyses: Array<z.infer<typeof fileAnalysisSchema>> = []

    for (const filePath of filePaths) {
      if (!await fileExists(filePath)) {continue}

      const stats = await fs.stat(filePath)
      if (stats.size > maxFileSize) {continue}
      if (stats.isDirectory()) {continue}

      const content = await fs.readFile(filePath, 'utf-8')
      const language = detectLanguage(filePath)

      const { loc, totalLines } = includeMetrics
        ? calculateLoc(content, language)
        : { loc: 0, totalLines: 0 }

      let complexity = 0
      if (includeMetrics) {
        if (language === 'python') {
          try {
            const complexityData = await PythonParser.analyzeComplexity(content)
            complexity = complexityData.cyclomaticComplexity
          } catch {
            complexity = estimateComplexity(content, language)
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
    }

    const totalLoc = fileAnalyses.reduce((sum, f) => sum + f.loc, 0)
    const avgComplexity = fileAnalyses.length > 0
      ? fileAnalyses.reduce((sum, f) => sum + f.complexity, 0) / fileAnalyses.length
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
    });
    span.end();

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    span?.recordException(error instanceof Error ? error : new Error(errorMessage));
    span?.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
    span?.end();
    throw error;
  }
  },
})
