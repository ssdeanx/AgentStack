import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { createPatch, structuredPatch } from 'diff'

const diffReviewInputSchema = z.object({
  original: z.string().describe('Original code content'),
  modified: z.string().describe('Modified code content'),
  filename: z.string().optional().describe('Filename for diff header'),
  context: z.number().optional().describe('Lines of context around changes'),
})

const hunkSchema = z.object({
  oldStart: z.number(),
  oldLines: z.number(),
  newStart: z.number(),
  newLines: z.number(),
  lines: z.array(z.string()),
})

const changeSchema = z.object({
  type: z.enum(['addition', 'deletion', 'context']),
  lineNumber: z.number(),
  content: z.string(),
})

const diffReviewOutputSchema = z.object({
  unifiedDiff: z.string(),
  hunks: z.array(hunkSchema),
  changes: z.array(changeSchema),
  stats: z.object({
    additions: z.number(),
    deletions: z.number(),
    totalChanges: z.number(),
  }),
  summary: z.string(),
})

export type DiffReviewInput = z.infer<typeof diffReviewInputSchema>
export type DiffReviewOutput = z.infer<typeof diffReviewOutputSchema>

export const diffReviewTool = createTool({
  id: 'coding:diffReview',
  description: `Generate and analyze unified diffs between code versions.
Returns structured diff data with hunks, individual changes, and statistics.
Use for code review, comparing versions, and analyzing modifications.`,
  inputSchema: diffReviewInputSchema,
  outputSchema: diffReviewOutputSchema,
  execute: async ({ context }): Promise<DiffReviewOutput> => {
    const { original, modified, filename = 'file', context: contextLines = 3 } = context

    const unifiedDiff = createPatch(
      filename,
      original,
      modified,
      'original',
      'modified',
      { context: contextLines }
    )

    const structured = structuredPatch(
      filename,
      filename,
      original,
      modified,
      'original',
      'modified',
      { context: contextLines }
    )

    interface DiffHunk {
      oldStart: number
      oldLines: number
      newStart: number
      newLines: number
      lines: string[]
    }

    const hunks: Array<z.infer<typeof hunkSchema>> = (structured.hunks as DiffHunk[]).map(hunk => ({
      oldStart: hunk.oldStart,
      oldLines: hunk.oldLines,
      newStart: hunk.newStart,
      newLines: hunk.newLines,
      lines: hunk.lines,
    }))

    const changes: Array<z.infer<typeof changeSchema>> = []
    let additions = 0
    let deletions = 0

    for (const hunk of structured.hunks) {
      let oldLine = hunk.oldStart
      let newLine = hunk.newStart

      for (const line of hunk.lines) {
        if (line.startsWith('+')) {
          changes.push({
            type: 'addition',
            lineNumber: newLine,
            content: line.substring(1),
          })
          additions++
          newLine++
        } else if (line.startsWith('-')) {
          changes.push({
            type: 'deletion',
            lineNumber: oldLine,
            content: line.substring(1),
          })
          deletions++
          oldLine++
        } else if (line.startsWith(' ')) {
          changes.push({
            type: 'context',
            lineNumber: newLine,
            content: line.substring(1),
          })
          oldLine++
          newLine++
        }
      }
    }

    const totalChanges = additions + deletions
    let summary: string

    if (totalChanges === 0) {
      summary = 'No changes detected between the two versions.'
    } else {
      const parts: string[] = []
      if (additions > 0) {parts.push(`${additions} addition${additions !== 1 ? 's' : ''}`)}
      if (deletions > 0) {parts.push(`${deletions} deletion${deletions !== 1 ? 's' : ''}`)}
      summary = `${totalChanges} change${totalChanges !== 1 ? 's' : ''}: ${parts.join(', ')} across ${hunks.length} hunk${hunks.length !== 1 ? 's' : ''}.`
    }

    return {
      unifiedDiff,
      hunks,
      changes,
      stats: {
        additions,
        deletions,
        totalChanges,
      },
      summary,
    }
  },
})
