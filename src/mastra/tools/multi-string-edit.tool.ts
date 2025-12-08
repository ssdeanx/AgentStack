import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { createPatch } from 'diff'

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

function isPathWithinBoundary(filePath: string, boundary: string): boolean {
  const resolvedPath = path.resolve(filePath)
  const resolvedBoundary = path.resolve(boundary)
  return resolvedPath.startsWith(resolvedBoundary + path.sep) || resolvedPath === resolvedBoundary
}

function generateSimpleDiff(original: string, modified: string, filePath: string): string {
  const originalLines = original.split('\n')
  const modifiedLines = modified.split('\n')
  
  const diffLines: string[] = [`--- a/${path.basename(filePath)}`, `+++ b/${path.basename(filePath)}`]
  
  let i = 0, j = 0
  while (i < originalLines.length || j < modifiedLines.length) {
    if (i < originalLines.length && j < modifiedLines.length && originalLines[i] === modifiedLines[j]) {
      diffLines.push(` ${originalLines[i]}`)
      i++
      j++
    } else if (i < originalLines.length && (j >= modifiedLines.length || originalLines[i] !== modifiedLines[j])) {
      diffLines.push(`-${originalLines[i]}`)
      i++
    } else if (j < modifiedLines.length) {
      diffLines.push(`+${modifiedLines[j]}`)
      j++
    }
  }
  
  return diffLines.join('\n')
}

export const multiStringEditTool = createTool({
  id: 'coding:multiStringEdit',
  description: `Apply multiple string replacements across files atomically.
Each edit specifies a file path, the exact text to find, and the replacement text.
Supports dry-run mode to preview changes and automatic backup creation.
Use for batch refactoring, multi-file updates, and coordinated code changes.`,
  inputSchema: multiStringEditInputSchema,
  outputSchema: multiStringEditOutputSchema,
  execute: async ({ context }): Promise<MultiStringEditOutput> => {
    const { edits, dryRun = false, createBackup = true, projectRoot } = context
    const results: Array<z.infer<typeof editResultSchema>> = []
    const appliedBackups: Map<string, string> = new Map()
    let hasFailure = false

    const defaultBoundary = projectRoot ?? process.cwd()

    for (const edit of edits) {
      const { filePath, oldString, newString, description } = edit

      if (!isPathWithinBoundary(filePath, defaultBoundary)) {
        results.push({
          filePath,
          status: 'failed',
          reason: `Path outside project boundary: ${defaultBoundary}`,
        })
        hasFailure = true
        continue
      }

      if (!await fileExists(filePath)) {
        results.push({
          filePath,
          status: 'failed',
          reason: 'File does not exist',
        })
        hasFailure = true
        continue
      }

      try {
        const content = await fs.readFile(filePath, 'utf-8')
        let newContent = content
        let matchFound = false

        if (edit.useRegex) {
                  const flags = edit.replaceAll ? 'g' : ''
                  const regex = new RegExp(edit.oldString, flags)
                  if (regex.test(content)) {
                    newContent = content.replace(regex, edit.newString)
                    matchFound = true
                  }
                }
        else if (content.includes(edit.oldString)) {
                    if (edit.replaceAll) {
                      newContent = content.split(edit.oldString).join(edit.newString)
                      matchFound = true
                    } else {
                      const occurrences = content.split(edit.oldString).length - 1
                      if (occurrences > 1) {
                        results.push({
                          filePath,
                          status: 'skipped',
                          reason: `Multiple occurrences found (${occurrences}). Use replaceAll: true to replace all.`,
                        })
                        continue
                      }
                      newContent = content.replace(edit.oldString, edit.newString)
                      matchFound = true
                    }
                  }

        if (!matchFound) {
          results.push({
            filePath,
            status: 'skipped',
            reason: 'Old string/pattern not found in file',
          })
          continue
        }

        const diff = createPatch(path.basename(filePath), content, newContent, 'original', 'modified')

        if (dryRun) {
          results.push({
            filePath,
            status: 'applied',
            reason: description || 'Dry run - changes not written',
            diff,
          })
          continue
        }

        if (createBackup && !appliedBackups.has(filePath)) {
          const backupPath = `${filePath}.bak`
          await fs.copyFile(filePath, backupPath)
          appliedBackups.set(filePath, backupPath)
        }

        await fs.writeFile(filePath, newContent, 'utf-8')

        results.push({
          filePath,
          status: 'applied',
          reason: description,
          backup: appliedBackups.get(filePath),
          diff,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        results.push({
          filePath,
          status: 'failed',
          reason: errorMessage,
        })
        hasFailure = true
      }
    }

    if (hasFailure && !dryRun) {
      for (const [filePath, backupPath] of appliedBackups) {
        try {
          await fs.copyFile(backupPath, filePath)
        } catch {
          // Best effort rollback
        }
      }
    }

    const summary = {
      total: results.length,
      applied: results.filter(r => r.status === 'applied').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'failed').length,
    }

    return {
      success: !hasFailure,
      results,
      summary,
    }
  },
})
