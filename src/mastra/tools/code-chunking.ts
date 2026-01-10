import type { RequestContext } from '@mastra/core/request-context'
import { createTool } from '@mastra/core/tools'
import { Project, SyntaxKind } from 'ts-morph'
import { z } from 'zod'

import { SpanType } from '@mastra/core/observability'
import { MDocument } from '@mastra/rag'
import { log } from '../config/logger'
import { PythonParser } from './semantic-utils'

export interface CodeChunkingRequestContext extends RequestContext {
  chunkSize?: number
  chunkOverlap?: number
}

const codeChunkingInputSchema = z.object({
  filePath: z.string(),
  content: z.string(),
  options: z
    .object({
      chunkSize: z.number().default(512),
      chunkOverlap: z.number().default(50),
    })
    .optional(),
})

const codeChunkingOutputSchema = z.object({
  chunks: z.array(
    z.object({
      text: z.string(),
      metadata: z.object({
        startLine: z.number(),
        endLine: z.number(),
        type: z.string(),
        name: z.string().optional(),
      }),
    })
  ),
})

export const codeChunkerTool = createTool({
  id: 'code-chunker',
  description:
    'Intelligently chunks code files based on syntax (functions, classes) for TS/JS and Python, falling back to recursive chunking for others.',
  inputSchema: codeChunkingInputSchema,
  outputSchema: codeChunkingOutputSchema,
  execute: async (input: z.infer<typeof codeChunkingInputSchema>, context) => {
    const { filePath, content, options } = input
    const requestContext = context?.requestContext as CodeChunkingRequestContext | undefined
    const ext = filePath.split('.').pop()?.toLowerCase()
    interface Chunk {
      text: string
      metadata: {
        startLine: number
        endLine: number
        type: string
        name?: string
      }
    }
    const chunks: Chunk[] = []

    const writer = context?.writer
    const abortSignal = context?.abortSignal

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `🔄 Starting code chunking for ${filePath}`,
        stage: 'code-chunker',
      },
      id: 'code-chunker',
    })

    const tracingContext = context?.tracingContext
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'code-chunker',
      input: { filePath, ext },
      metadata: {
        'tool.id': 'code-chunker',
        operation: 'code-chunking',
      },
    })

    try {
      if (['ts', 'tsx', 'js', 'jsx'].includes(ext ?? '')) {
        // TypeScript/JavaScript Chunking
        const project = new Project({ useInMemoryFileSystem: true })
        const sourceFile = project.createSourceFile(filePath, content)

        sourceFile.forEachChild((node) => {
          // typedNode narrows down the commonly used shape we need for code chunking
          const typedNode = node as unknown as {
            getName?: () => string
            getText: () => string
            getStartLineNumber: () => number
            getEndLineNumber: () => number
            getKindName: () => string
          }
          let name: string | undefined

          if (
            node.isKind(SyntaxKind.FunctionDeclaration) ||
            node.isKind(SyntaxKind.ClassDeclaration) ||
            node.isKind(SyntaxKind.InterfaceDeclaration) ||
            node.isKind(SyntaxKind.TypeAliasDeclaration) ||
            node.isKind(SyntaxKind.EnumDeclaration) ||
            node.isKind(SyntaxKind.VariableStatement)
          ) {
            if (typeof typedNode.getName === 'function') {
              name = typedNode.getName()
            }

            chunks.push({
              text: typedNode.getText(),
              metadata: {
                startLine: typedNode.getStartLineNumber(),
                endLine: typedNode.getEndLineNumber(),
                type: typedNode.getKindName(),
                name,
              },
            })
          }
        })

        // If no structural chunks found, or file is mostly top-level code, might want to fallback?
        // For now, if we got chunks, return them. If not, fallback to MDocument.
        if (chunks.length === 0 && content.trim().length > 0) {
          // Fallback to recursive
        } else {
          await writer?.custom({
            type: 'data-tool-progress',
            data: {
              status: 'done',
              message: `✅ Chunking complete: ${chunks.length} chunk${chunks.length !== 1 ? 's' : ''}`,
              stage: 'code-chunker',
            },
            id: 'code-chunker',
          })
          span?.update({ metadata: { 'tool.output.chunksCount': chunks.length } })
          span?.end()
          return { chunks }
        }
      }

      if (ext === 'py') {
        // Python Chunking
        try {
          const symbols = await PythonParser.findSymbols(content)
          const lines = content.split('\n')

          for (const symbol of symbols) {
            if (
              (symbol.kind === 'function' ||
                symbol.kind === 'class') &&
              symbol.endLine !== null &&
              symbol.endLine !== undefined &&
              symbol.endLine > 0
            ) {
              const chunkLines = lines.slice(
                symbol.line - 1,
                symbol.endLine
              )
              chunks.push({
                text: chunkLines.join('\n'),
                metadata: {
                  startLine: symbol.line,
                  endLine: symbol.endLine,
                  type: symbol.kind,
                  name: symbol.name,
                },
              })
            }
          }

          if (chunks.length > 0) {
            await writer?.custom({
              type: 'data-tool-progress',
              data: {
                status: 'done',
                message: `✅ Chunking complete: ${chunks.length} chunk${chunks.length !== 1 ? 's' : ''}`,
                stage: 'code-chunker',
              },
              id: 'code-chunker',
            })
            span?.update({ metadata: { 'tool.output.chunksCount': chunks.length } })
            span?.end()
            return { chunks }
          }
        } catch (e) {
          log.warn(
            `Python parsing failed for ${filePath}, falling back to text chunking: ${e}`
          )
        }
      }

      // Fallback: Recursive Chunking via MDocument
      const doc = new MDocument({
        docs: [{ text: content, metadata: { source: filePath } }],
        type: 'document',
      })

      if (abortSignal?.aborted) {
        span?.error({ error: new Error('Code chunking cancelled'), endSpan: true })
        await writer?.custom({
          type: 'data-tool-progress',
          data: {
            status: 'done',
            message: `🛑 Code chunking cancelled for ${filePath}`,
            stage: 'code-chunker',
          },
          id: 'code-chunker',
        })
        throw new Error('Code chunking cancelled')
      }

      const textChunks = await doc.chunk({
        strategy: 'recursive',
        maxSize: options?.chunkSize ?? requestContext?.chunkSize ?? 512,
        overlap: options?.chunkOverlap ?? requestContext?.chunkOverlap ?? 50,
        separators: ['\n\n', '\n', ' '],
      })

      const mapped = textChunks.map((c, i) => ({
        text: c.text ?? '',
        metadata: {
          startLine: 0, // MDocument doesn't give line numbers easily
          endLine: 0,
          type: 'text-chunk',
          name: `chunk-${i}`,
        },
      }))

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `✅ Chunking complete: ${mapped.length} chunk${mapped.length !== 1 ? 's' : ''}`,
          stage: 'code-chunker',
        },
        id: 'code-chunker',
      })
      span?.update({ metadata: { 'tool.output.chunksCount': mapped.length } })
      span?.end()
      return { chunks: mapped }
    } catch (error) {
      const errorMeta =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : { value: String(error) }

      log.error(`Error chunking ${filePath}:`, errorMeta)
      // Trace the exception and set status
      span?.error({
        error: error instanceof Error ? error : new Error(String(error)),
        endSpan: true,
      })

      // Final fallback
      return {
        chunks: [
          {
            text: content,
            metadata: {
              startLine: 1,
              endLine: content.split('\n').length,
              type: 'file',
              name: 'full-file',
            },
          },
        ],
      }
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Code chunker tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
    log.info('Code chunker received input chunk', {
      toolCallId,
      inputTextDelta,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputDelta',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Code chunker received input', {
      toolCallId,
      messageCount: messages.length,
      inputData: { filePath: input.filePath },
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Code chunker completed', {
      toolCallId,
      toolName,
      chunksCreated: output.chunks.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput',
    })
  },
})
