import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { glob } from 'glob'

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

const codeSearchInputSchema = z.object({
  pattern: z.string().describe('Search pattern (string or regex)'),
  target: z.union([
    z.string().describe('File path or glob pattern'),
    z.array(z.string()).describe('Array of file paths or globs'),
  ]).describe('Files to search'),
  options: z.object({
    isRegex: z.boolean().optional().describe('Treat pattern as regex'),
    caseSensitive: z.boolean().optional().describe('Case-sensitive search'),
    maxResults: z.number().optional().describe('Maximum results to return'),
    includeContext: z.boolean().optional().describe('Include surrounding lines'),
    contextLines: z.number().optional().describe('Number of context lines'),
  }).optional(),
})

const matchSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  content: z.string(),
  context: z.object({
    before: z.array(z.string()),
    after: z.array(z.string()),
  }).optional(),
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
  execute: async ({ context }): Promise<CodeSearchOutput> => {
    const { pattern, target, options } = context
    const isRegex = options?.isRegex ?? false
    const caseSensitive = options?.caseSensitive ?? false
    const maxResults = options?.maxResults ?? 100
    const includeContext = options?.includeContext ?? true
    const contextLines = options?.contextLines ?? 2
    
    let filePaths: string[] = []
    const targets = Array.isArray(target) ? target : [target]
    
    for (const t of targets) {
      if (t.includes('*')) {
        const matches = await glob(t, { nodir: true })
        filePaths.push(...matches)
      } else if (await fileExists(t)) {
        const stat = await fs.stat(t)
        if (stat.isFile()) {
          filePaths.push(t)
        } else if (stat.isDirectory()) {
          const dirFiles = await glob(path.join(t, '**/*'), { nodir: true })
          filePaths.push(...dirFiles)
        }
      }
    }
    
    filePaths = [...new Set(filePaths)]
    
    const matches: z.infer<typeof matchSchema>[] = []
    const filesWithMatches = new Set<string>()
    let truncated = false
    
    const searchRegex = isRegex 
      ? new RegExp(pattern, caseSensitive ? 'g' : 'gi')
      : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi')
    
    for (const filePath of filePaths) {
      if (matches.length >= maxResults) {
        truncated = true
        break
      }
      
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const lines = content.split('\n')
        
        for (let i = 0; i < lines.length; i++) {
          if (matches.length >= maxResults) {
            truncated = true
            break
          }
          
          const line = lines[i]
          searchRegex.lastIndex = 0
          let match
          
          while ((match = searchRegex.exec(line)) !== null) {
            filesWithMatches.add(filePath)
            
            const contextObj = includeContext ? {
              before: lines.slice(Math.max(0, i - contextLines), i),
              after: lines.slice(i + 1, i + 1 + contextLines),
            } : undefined
            
            matches.push({
              file: filePath,
              line: i + 1,
              column: match.index + 1,
              content: line,
              context: contextObj,
            })
            
            if (!isRegex) break
          }
        }
      } catch {
        // Skip binary or unreadable files
      }
    }
    
    return {
      matches,
      stats: {
        totalMatches: matches.length,
        filesSearched: filePaths.length,
        filesWithMatches: filesWithMatches.size,
      },
      truncated,
    }
  },
})
