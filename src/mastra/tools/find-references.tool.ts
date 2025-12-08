import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { ProjectCache, PythonParser } from './semantic-utils';
import { Node } from 'ts-morph';
import * as path from 'path';
import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { log } from '../config/logger';
import { AISpanType, InternalSpans } from '@mastra/core/ai-tracing';
import type { RuntimeContext } from '@mastra/core/runtime-context';

const referenceContextSchema = z.object({
  maxReferences: z.number().default(500),
});

export type ReferenceContext = z.infer<typeof referenceContextSchema>;

interface ReferenceInfo {
  filePath: string;
  line: number;
  column: number;
  text: string;
  isDefinition: boolean;
}

const findReferencesInputSchema = z.object({
  symbolName: z.string().describe('Name of the symbol to find references for'),
  projectPath: z.string().default(process.cwd()).describe('Project directory path'),
  filePath: z.string().optional().describe('File path where the symbol is defined (for precise lookup)'),
  line: z.number().optional().describe('Line number of the symbol definition (for precise lookup)'),
});

const findReferencesOutputSchema = z.object({
  references: z.array(z.object({
    filePath: z.string(),
    line: z.number(),
    column: z.number(),
    text: z.string(),
    isDefinition: z.boolean(),
  })),
  summary: z.object({
    totalReferences: z.number(),
    filesCount: z.number(),
    definitions: z.number(),
    usages: z.number(),
  }),
});

export const findReferencesTool = createTool({
  id: 'semantic:find-references',
  description: 'Find all references to a symbol (function, class, variable) across the codebase using semantic analysis.',
  inputSchema: findReferencesInputSchema,
  outputSchema: findReferencesOutputSchema,
  execute: async ({ context, tracingContext, runtimeContext }) => {
    const { symbolName, projectPath, filePath, line } = context;

    const refContext = runtimeContext?.get('semanticAnalysisContext');
    const { maxReferences } = referenceContextSchema.parse(refContext || {});

    const allReferences: ReferenceInfo[] = [];

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'find_references',
      input: { symbolName, projectPath, filePath, line, maxReferences },
      tracingPolicy: { internal: InternalSpans.ALL },
      runtimeContext: runtimeContext as RuntimeContext<ReferenceContext>
    });

    try {
      // 1. TypeScript/JavaScript Analysis
      const projectCache = ProjectCache.getInstance();
      const project = projectCache.getOrCreate(projectPath);

      if (filePath && line) {
        // Precise lookup
        const sourceFile = project.getSourceFile(filePath);
        if (sourceFile) {
          const position = sourceFile.compilerNode.getPositionOfLineAndCharacter(line - 1, 0);
          const node = sourceFile.getDescendantAtPos(position);

          if (node) {
            const symbol = node.getSymbol();
            if (symbol) {
              const references = project.getLanguageService().findReferencesAtPosition(sourceFile, position);
              if (references) {
                for (const ref of references) {
                  for (const reference of ref.getReferences()) {
                    const refSourceFile = reference.getSourceFile();
                    const refNode = reference.getNode();
                    const start = refNode.getStartLinePos();
                    const pos = refSourceFile.getLineAndColumnAtPos(start);

                    allReferences.push({
                      filePath: refSourceFile.getFilePath(),
                      line: pos.line,
                      column: pos.column,
                      text: refNode.getParent()?.getText().substring(0, 100) || refNode.getText(),
                      isDefinition: reference.isDefinition() || false
                    });
                  }
                }
              }
            }
          }
        }
      } else {
        // Name-based search
        for (const sourceFile of project.getSourceFiles()) {
          const sourceFilePath = sourceFile.getFilePath();
          if (sourceFilePath.includes('node_modules') || sourceFilePath.includes('.git')) {continue;}

          sourceFile.forEachDescendant((node) => {
            if (Node.isIdentifier(node) && node.getText() === symbolName) {
              const start = node.getStartLinePos();
              const pos = sourceFile.getLineAndColumnAtPos(start);
              const parent = node.getParent();

              // Simple heuristic for definition
              const isDefinition = isSymbolDefinition(node);

              allReferences.push({
                filePath: sourceFilePath,
                line: pos.line,
                column: pos.column,
                text: parent?.getText().substring(0, 100) || node.getText(),
                isDefinition
              });
            }
          });
        }
      }

      // 2. Python Analysis
      try {
        const pythonFiles = await glob(path.join(projectPath, '**/*.py'), {
          ignore: ['**/node_modules/**', '**/.git/**', '**/venv/**', '**/__pycache__/**'],
          nodir: true
        });

        for (const pyFile of pythonFiles) {
          try {
            const content = await readFile(pyFile, 'utf-8');
            const references = await PythonParser.findReferences(content, symbolName);

            for (const ref of references) {
              allReferences.push({
                filePath: pyFile,
                line: ref.line,
                column: ref.column + 1, // Convert 0-indexed column to 1-indexed
                text: ref.text.substring(0, 100),
                isDefinition: ref.isDefinition
              });
            }
          } catch (error) {
            log.warn(`Error parsing Python file ${pyFile}`, { error });
          }
        }
      } catch (error) {
        log.warn('Error searching Python files', { error });
      }

      const definitions = allReferences.filter(r => r.isDefinition);
      const usages = allReferences.filter(r => !r.isDefinition);
      const filesCount = new Set(allReferences.map(r => r.filePath)).size;

      span?.end({
        output: {
          totalReferences: allReferences.length,
          filesCount,
          definitions: definitions.length,
          usages: usages.length
        }
      });

      return {
        references: allReferences,
        summary: {
          totalReferences: allReferences.length,
          filesCount,
          definitions: definitions.length,
          usages: usages.length
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      span?.end({ metadata: { error: errorMessage } });
      throw error;
    }
  }
});

function isSymbolDefinition(node: Node): boolean {
  const parent = node.getParent();
  if (!parent) {return false;}

  return Node.isFunctionDeclaration(parent) ||
         Node.isClassDeclaration(parent) ||
         Node.isInterfaceDeclaration(parent) ||
         Node.isTypeAliasDeclaration(parent) ||
         Node.isVariableDeclaration(parent) ||
         Node.isMethodDeclaration(parent) ||
         Node.isPropertyDeclaration(parent) ||
         Node.isParameterDeclaration(parent);
}
