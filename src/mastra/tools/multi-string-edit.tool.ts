import { z } from 'zod'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { createPatch } from 'diff'
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { createTool } from '@mastra/core/tools';
import RE2 from 're2'

const DATA_DIR = path.join(process.cwd(), './data')

/**
 * Ensure the data directory exists
 */
async function ensureDataDir(): Promise<void> {
  const dataPath = path.resolve(DATA_DIR)
  try {
    await fs.mkdir(dataPath, { recursive: true })
  } catch {
    // Ignore errors - directory might already exist
  }
}

const editOperationSchema = z.object({
  filePath: z.string().describe('Absolute path to the file to edit'),
  oldString: z.string().describe('Exact text to find and replace (or regex pattern)'),
  newString: z.string().describe('Text to replace oldString with'),
  useRegex: z.boolean().optional().describe('Treat oldString as a regex pattern'),
  replaceAll: z.boolean().optional().describe('Replace all occurrences (default: false)'),
  description: z.string().optional().describe('Explanation of this change'),
})

const multiStringEditInputSchema = z.object({
  edits: z.array(editOperationSchema).min(1).describe('Array of edit operations to apply'),
  dryRun: z.boolean().optional().describe('Preview changes without applying them'),
  createBackup: z.boolean().optional().describe('Create .bak backup files before editing'),
  projectRoot: z.string().optional().describe('Project root for path validation (security boundary)'),
  maxFileSize: z.number().optional().describe('Skip files larger than this (bytes)'),
})

const editResultSchema = z.object({
  filePath: z.string(),
  status: z.enum(['applied', 'skipped', 'failed']),
  reason: z.string().optional(),
  backup: z.string().optional(),
  diff: z.string().optional(),
})

const multiStringEditOutputSchema = z.object({
  success: z.boolean(),
  results: z.array(editResultSchema),
  summary: z.object({
    total: z.number(),
    applied: z.number(),
    skipped: z.number(),
    failed: z.number(),
  }),
})

export type MultiStringEditInput = z.infer<typeof multiStringEditInputSchema>
export type MultiStringEditOutput = z.infer<typeof multiStringEditOutputSchema>

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Check if a file path is within the specified boundary for security
 */
function isPathWithinBoundary(filePath: string, boundary: string): boolean {
  const resolvedPath = path.resolve(filePath)
  const resolvedBoundary = path.resolve(boundary)
  return resolvedPath.startsWith(resolvedBoundary + path.sep) || resolvedPath === resolvedBoundary
}

/**
 * Process a single file edit operation
 */
async function processFileEdit(
  edit: z.infer<typeof editOperationSchema>,
  defaultBoundary: string,
  dryRun: boolean,
  createBackup: boolean,
  appliedBackups: Map<string, string>,
  maxFileSize: number
): Promise<z.infer<typeof editResultSchema>> {
  const { filePath, oldString, newString, description, useRegex, replaceAll } = edit

  if (!isPathWithinBoundary(filePath, defaultBoundary)) {
    return {
      filePath,
      status: 'failed',
      reason: `Path outside project boundary: ${defaultBoundary}`,
    }
  }

  if (!await fileExists(filePath)) {
    return {
      filePath,
      status: 'failed',
      reason: 'File does not exist',
    }
  }

  try {
    const stat = await fs.stat(filePath)
    if (!stat.isFile()) {
      return {
        filePath,
        status: 'failed',
        reason: 'Target path is not a file',
      }
    }

    if (stat.size > maxFileSize) {
      return {
        filePath,
        status: 'skipped',
        reason: `File too large (${stat.size} bytes) - exceeds maxFileSize (${maxFileSize})`,
      }
    }

    const content = await fs.readFile(filePath, 'utf-8')
    let newContent = content
    let matchFound = false

    if (useRegex === true) {
      const flags = replaceAll === true ? 'g' : ''
      let regex: RE2
      try {
        regex = new RE2(oldString, flags)
      } catch (error) {
        return {
          filePath,
          status: 'failed',
          reason: `Invalid regex: ${error instanceof Error ? error.message : String(error)}`,
        }
      }
      if (regex.test(content)) {
        newContent = content.replace(regex as unknown as RegExp, newString)
        matchFound = true
      }
    } else if (content.includes(oldString)) {
      if (replaceAll === true) {
        newContent = content.split(oldString).join(newString)
        matchFound = true
      } else {
        const occurrences = content.split(oldString).length - 1
        if (occurrences > 1) {
          return {
            filePath,
            status: 'skipped',
            reason: `Multiple occurrences found (${occurrences}). Use replaceAll: true to replace all.`,
          }
        }
        newContent = content.replace(oldString, newString)
        matchFound = true
      }
    }

    if (!matchFound) {
      return {
        filePath,
        status: 'skipped',
        reason: 'Old string/pattern not found in file',
      }
    }

    const diff = createPatch(
      path.basename(filePath),
      content,
      newContent,
      'original',
      'modified'
    )

    if (dryRun) {
      return {
        filePath,
        status: 'applied',
        reason: description ?? 'Dry run - changes not written',
        diff,
      }
    }

    if (createBackup && !appliedBackups.has(filePath)) {
      const backupPath = `${filePath}.bak`
      await fs.copyFile(filePath, backupPath)
      appliedBackups.set(filePath, backupPath)
    }

    await fs.writeFile(filePath, newContent, 'utf-8')

    return {
      filePath,
      status: 'applied',
      reason: description,
      backup: appliedBackups.get(filePath),
      diff,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      filePath,
      status: 'failed',
      reason: errorMessage,
    }
  }
}

export const multiStringEditTool = createTool({
  id: 'coding:multiStringEdit',
  description: `Apply multiple string replacements across files atomically.
Each edit specifies a file path, the exact text to find, and the replacement text.
Supports dry-run mode to preview changes and automatic backup creation.
Use for batch refactoring, multi-file updates, and coordinated code changes.`,
  inputSchema: multiStringEditInputSchema,
  outputSchema: multiStringEditOutputSchema,
  execute: async (inputData, context): Promise<MultiStringEditOutput> => {
    const writer = context?.writer;

    // Ensure data directory exists
    await ensureDataDir();

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🔁 Starting multi-string edit: ${inputData.edits.length} edits${inputData.dryRun === true ? ' (dry run)' : ''}`, stage: 'coding:multiStringEdit' }, id: 'coding:multiStringEdit' });
    const { edits, dryRun = false, createBackup = true, projectRoot } = inputData
    const maxFileSize = inputData.maxFileSize ?? 1_000_000

    const tracer = trace.getTracer('coding-tools');
    const span = tracer.startSpan('multi_string_edit', {
      attributes: {
        editsCount: edits.length,
        dryRun,
        createBackup,
        projectRoot,
        operation: 'multi_string_edit'
      }
    });

    const results: Array<z.infer<typeof editResultSchema>> = []
    const appliedBackups: Map<string, string> = new Map()
    let hasFailure = false

    const defaultBoundary = projectRoot ?? process.cwd()

    for (const edit of edits) {
      await writer?.custom?.({ type: 'data-tool-progress', data: { status: 'in-progress', message: `✏️ Processing edit for: ${edit.filePath}`, stage: 'coding:multiStringEdit' }, id: 'coding:multiStringEdit' });
      const result = await processFileEdit(edit, defaultBoundary, dryRun, createBackup, appliedBackups, maxFileSize);
      results.push(result);
      if (result.status === 'failed') {
        hasFailure = true;
      }
    }

    if (hasFailure && !dryRun) {
      for (const [filePath, backupPath] of appliedBackups) {
        try {
          await fs.copyFile(backupPath, filePath)
        } catch (error) {
          // Best effort rollback
          span.recordException(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    const summary = {
      total: results.length,
      applied: results.filter(r => r.status === 'applied').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'failed').length,
    }

    const success = !hasFailure;

    if (!success) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'One or more edits failed' });
    }

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Multi-string edit complete: ${summary.applied} applied, ${summary.failed} failed, ${summary.skipped} skipped`, stage: 'coding:multiStringEdit' }, id: 'coding:multiStringEdit' });
    span.end();

    return {
      success,
      results,
      summary,
    }
  },
})
