import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { ProjectCache, PythonParser } from './semantic-utils';
import type { SourceFile } from 'ts-morph';
import { Node } from 'ts-morph';
import * as path from 'path';
import fg from 'fast-glob';
import { readFile } from 'fs/promises';
import { log } from '../config/logger';

import { trace, SpanStatusCode } from "@opentelemetry/api";

const referenceContextSchema = z.object({
  maxReferences: z.number().default(500),
  includeNodeModules: z.boolean().default(false),
  caseSensitive: z.boolean().default(false),
});

export type ReferenceContext = z.infer<typeof referenceContextSchema>;

interface ReferenceInfo {
  filePath: string;
  line: number;
  column: number;
  text: string;
  isDefinition: boolean;
  context: string;
  kind: string;
}

const findReferencesInputSchema = z.object({
  symbolName: z.string().describe('Name of the symbol to find references for'),
  projectPath: z.string().default(process.cwd()).describe('Project directory path'),
  filePath: z.string().optional().describe('File path where the symbol is defined (for precise lookup)'),
  line: z.number().optional().describe('Line number of the symbol definition (for precise lookup)'),
  includeDependencies: z.boolean().default(false).describe('Include node_modules in search'),
});

const findReferencesOutputSchema = z.object({
  references: z.array(z.object({
    filePath: z.string(),
    line: z.number(),
    column: z.number(),
    text: z.string(),
    isDefinition: z.boolean(),
    context: z.string(),
    kind: z.string(),
  })),
  summary: z.object({
    totalReferences: z.number(),
    filesCount: z.number(),
    definitions: z.number(),
    usages: z.number(),
    searchTime: z.number(),
  }),
});

export const findReferencesTool = createTool({
  id: 'semantic:find-references',
  description: 'Find all references to a symbol (function, class, variable) across the codebase using semantic analysis.',
  inputSchema: findReferencesInputSchema,
  outputSchema: findReferencesOutputSchema,
  execute: async (inputData, context) => {
    const writer = context?.writer;
    await writer?.custom({ type: 'data-tool-progress', data: { message: `🔎 Starting semantic find-references for '${inputData.symbolName}' at ${inputData.projectPath}` } });
    const { symbolName, projectPath, filePath, line } = inputData;

    const requestContext = context?.requestContext;
    const refContext = requestContext?.get('semanticAnalysisContext');
    const { maxReferences, includeNodeModules, caseSensitive } = referenceContextSchema.parse(refContext ?? {});

    const allReferences: ReferenceInfo[] = [];

    const tracer = trace.getTracer('semantic-analysis');
    const span = tracer.startSpan('find_references', {
      attributes: {
        symbolName,
        projectPath,
        filePath,
        line,
        maxReferences,
        operation: 'find_references'
      }
    });

    try {
      // Normalize search term
      const searchTerm = caseSensitive ? symbolName : symbolName.toLowerCase();
      const startTime = Date.now();

      // 1. TypeScript/JavaScript Analysis
      await writer?.custom({ type: 'data-tool-progress', data: { message: `🧭 Starting TypeScript/JavaScript analysis` } });
      const projectCache = ProjectCache.getInstance();
      const project = projectCache.getOrCreate(projectPath);

      if (typeof filePath === 'string' && filePath.trim() !== '' && typeof line === 'number') {
        await writer?.custom({ type: 'data-tool-progress', data: { message: `📌 Precise lookup: ${filePath}:${line}` } });
        // Precise lookup
        const sourceFile = project.getSourceFile(filePath);
        if (sourceFile) {
          const position = sourceFile.compilerNode.getPositionOfLineAndCharacter(line - 1, 0);
          const node = sourceFile.getDescendantAtPos(position);

          if (node) {
            const symbol = node.getSymbol();
            if (symbol) {
              const references = project.getLanguageService().findReferencesAtPosition(sourceFile, position);
              for (const ref of references ?? []) {
                for (const reference of ref.getReferences()) {
                    const refSourceFile = reference.getSourceFile();
                    const refNode = reference.getNode();
                    const start = refNode.getStartLinePos();
                    const pos = refSourceFile.getLineAndColumnAtPos(start);

                    const codeContext = getCodeContext(refSourceFile, pos.line, 2);
                    const kind = getReferenceKind(refNode);

                    allReferences.push({
                      filePath: refSourceFile.getFilePath(),
                      line: pos.line,
                      column: pos.column,
                      text: refNode.getParent()?.getText().substring(0, 100) ?? refNode.getText(),
                      isDefinition: reference.isDefinition() ?? false,
                      context: codeContext,
                      kind
                    });
                }
              }
            }
          }
        }
      } else {
        await writer?.custom({ type: 'data-tool-progress', data: { message: `📁 Name-based search across project files...` } });
        // Name-based search across all files
        const sourceFiles = project.getSourceFiles();

        for (const sourceFile of sourceFiles) {
          if (allReferences.length >= maxReferences) {break;}

          const sourceFilePath = sourceFile.getFilePath();

          // Skip excluded patterns
          if (!(includeNodeModules) && sourceFilePath.includes('node_modules')) {continue;}
          if (sourceFilePath.includes('.git') || sourceFilePath.includes('dist') || sourceFilePath.includes('build')) {continue;}

          try {
            const fileReferences = await analyzeTypeScriptReferences(sourceFile, searchTerm, caseSensitive, maxReferences - allReferences.length);
            await writer?.custom({ type: 'data-tool-progress', data: { message: `📄 Scanned: ${sourceFile.getFilePath()} (${fileReferences.length} matches)` } });

            for (const ref of fileReferences) {
              allReferences.push({
                ...ref,
                filePath: sourceFilePath
              });
            }
          } catch (error) {
            log.warn(`Error analyzing file ${sourceFilePath}`, { error });
          }
        }
      }

      // 2. Python Analysis
      await writer?.custom({ type: 'data-tool-progress', data: { message: `🐍 Starting Python analysis` } });
      try {
        const pythonFiles = await fg(path.join(projectPath, '**/*.py'), {
          ignore: ['**/node_modules/**', '**/.git/**', '**/venv/**', '**/__pycache__/**'],
          onlyFiles: true,
          absolute: true,
          dot: true,
          unique: true,
        });

        await writer?.custom({ type: 'data-tool-progress', data: { message: `🐍 Python files to check: ${pythonFiles.length}` } });
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
                isDefinition: ref.isDefinition,
                context: '',
                kind: ''
              });
            }
            if (references.length > 0) {
              await writer?.custom({ type: 'data-tool-progress', data: { message: `🐍 Found ${references.length} matches in ${pyFile}` } });
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
      const searchTime = Date.now() - startTime;

      await writer?.custom({ type: 'data-tool-progress', data: { message: `✅ Find references complete: ${allReferences.length} references across ${filesCount} files` } });

      span.end();

      return {
        references: allReferences,
        summary: {
          totalReferences: allReferences.length,
          filesCount,
          definitions: definitions.length,
          usages: usages.length,
          searchTime
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await writer?.custom({ type: 'data-tool-progress', data: { message: `❌ Find references failed: ${errorMessage}` } });
      span.recordException(new Error(errorMessage));
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
      span.end();
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

async function analyzeTypeScriptReferences(
  sourceFile: SourceFile,
  searchTerm: string,
  caseSensitive: boolean,
  maxResults: number
): Promise<Array<{line: number; column: number; text: string; isDefinition: boolean; context: string; kind: string}>> {
  const references: Array<{line: number; column: number; text: string; isDefinition: boolean; context: string; kind: string}> = [];

  sourceFile.forEachDescendant((node: Node) => {
    if (references.length >= maxResults) {return;}

    if (Node.isIdentifier(node)) {
      const name = node.getText();
      const matches = caseSensitive ? name === searchTerm : name.toLowerCase() === searchTerm;

      if (matches) {
        const start = node.getStartLinePos();
        const pos = sourceFile.getLineAndColumnAtPos(start);
        const parent = node.getParent();

        const isDefinition = isSymbolDefinition(node);
        const context = getCodeContext(sourceFile, pos.line, 2);
        const kind = getReferenceKind(node);

        references.push({
          line: pos.line,
          column: pos.column,
          text: parent?.getText().substring(0, 100) || node.getText(),
          isDefinition,
          context,
          kind
        });
      }
    }
  });

  return references;
}

function getCodeContext(sourceFile: SourceFile, lineNumber: number, contextLines: number): string {
  const lines = sourceFile.getFullText().split('\n');
  const start = Math.max(0, lineNumber - contextLines - 1);
  const end = Math.min(lines.length, lineNumber + contextLines);

  return lines.slice(start, end).join('\n');
}

function getReferenceKind(node: Node): string {
  const parent = node.getParent();
  if (!parent) {return 'usage';}

  if (Node.isFunctionDeclaration(parent) || Node.isMethodDeclaration(parent)) {
    return 'function';
  }
  if (Node.isClassDeclaration(parent)) {
    return 'class';
  }
  if (Node.isInterfaceDeclaration(parent)) {
    return 'interface';
  }
  if (Node.isVariableDeclaration(parent)) {
    return 'variable';
  }
  if (Node.isPropertyDeclaration(parent)) {
    return 'property';
  }
  if (Node.isTypeAliasDeclaration(parent)) {
    return 'type';
  }
  if (Node.isEnumDeclaration(parent)) {
    return 'enum';
  }

  return 'usage';
}
