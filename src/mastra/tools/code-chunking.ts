import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Project, SyntaxKind } from 'ts-morph';
import { PythonParser } from './semantic-utils';
import { MDocument } from '@mastra/rag';
import { log } from '../config/logger';
import { trace } from "@opentelemetry/api";
import type { RequestContext } from '@mastra/core/request-context';

const codeChunkingInputSchema = z.object({
  filePath: z.string(),
  content: z.string(),
  options: z.object({
    chunkSize: z.number().default(512),
    chunkOverlap: z.number().default(50),
  }).optional(),
});

const codeChunkingOutputSchema = z.object({
  chunks: z.array(z.object({
    text: z.string(),
    metadata: z.object({
      startLine: z.number(),
      endLine: z.number(),
      type: z.string(),
      name: z.string().optional(),
    }),
  })),
});

export const codeChunkerTool = createTool({
  id: 'code-chunker',
  description: 'Intelligently chunks code files based on syntax (functions, classes) for TS/JS and Python, falling back to recursive chunking for others.',
  inputSchema: codeChunkingInputSchema,
  outputSchema: codeChunkingOutputSchema,
  execute: async ({ context }) => {
    const { filePath, content, options } = context;
    const ext = filePath.split('.').pop()?.toLowerCase();
    const chunks: any[] = [];

    try {
      if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) {
        // TypeScript/JavaScript Chunking
        const project = new Project({ useInMemoryFileSystem: true });
        const sourceFile = project.createSourceFile(filePath, content);

        sourceFile.forEachChild(node => {
          const kind = node.getKind();
          let name: string | undefined;

          if (node.isKind(SyntaxKind.FunctionDeclaration) ||
              node.isKind(SyntaxKind.ClassDeclaration) ||
              node.isKind(SyntaxKind.InterfaceDeclaration) ||
              node.isKind(SyntaxKind.TypeAliasDeclaration) ||
              node.isKind(SyntaxKind.EnumDeclaration) ||
              node.isKind(SyntaxKind.VariableStatement)) {

            if ('getName' in node && typeof (node as any).getName === 'function') {
              name = (node as any).getName();
            }

            chunks.push({
              text: node.getText(),
              metadata: {
                startLine: node.getStartLineNumber(),
                endLine: node.getEndLineNumber(),
                type: node.getKindName(),
                name,
              }
            });
          }
        });

        // If no structural chunks found, or file is mostly top-level code, might want to fallback?
        // For now, if we got chunks, return them. If not, fallback to MDocument.
        if (chunks.length === 0 && content.trim().length > 0) {
           // Fallback to recursive
        } else {
            return { chunks };
        }
      }

      if (ext === 'py') {
        // Python Chunking
        try {
          const symbols = await PythonParser.findSymbols(content);
          const lines = content.split('\n');

          for (const symbol of symbols) {
            if ((symbol.kind === 'function' || symbol.kind === 'class') && symbol.endLine) {
                  const chunkLines = lines.slice(symbol.line - 1, symbol.endLine);
                  chunks.push({
                    text: chunkLines.join('\n'),
                    metadata: {
                      startLine: symbol.line,
                      endLine: symbol.endLine,
                      type: symbol.kind,
                      name: symbol.name,
                    }
                  });
            }
          }

          if (chunks.length > 0) {
            return { chunks };
          }
        } catch (e) {
          log.warn(`Python parsing failed for ${filePath}, falling back to text chunking: ${e}`);
        }
      }

      // Fallback: Recursive Chunking via MDocument
      const doc = new MDocument({
        docs: [{ text: content, metadata: { source: filePath } }],
        type: 'document'
      });

      const textChunks = await doc.chunk({
        strategy: 'recursive',
        maxSize: options?.chunkSize ?? 512,
        overlap: options?.chunkOverlap ?? 50,
        separators: ['\n\n', '\n', ' ']
      });

      return {
        chunks: textChunks.map((c, i) => ({
          text: c.text || '',
          metadata: {
            startLine: 0, // MDocument doesn't give line numbers easily
            endLine: 0,
            type: 'text-chunk',
            name: `chunk-${i}`
          }
        }))
      };

    } catch (error) {
      const errorMeta = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { value: String(error) };

      log.error(`Error chunking ${filePath}:`, errorMeta);
      // Final fallback
      return {
        chunks: [{
          text: content,
          metadata: { startLine: 1, endLine: content.split('\n').length, type: 'file', name: 'full-file' }
        }]
      };
    }
  }
});
