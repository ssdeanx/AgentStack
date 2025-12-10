import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { ProjectCache, PythonParser } from './semantic-utils';
import { Node } from 'ts-morph';
import * as path from 'path';
import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { log } from '../config/logger';
import type { RequestContext } from '@mastra/core/request-context';
import { trace } from "@opentelemetry/api";

const symbolContextSchema = z.object({
  maxResults: z.number().default(100),
  excludePatterns: z.array(z.string()).default([]),
});

export type SymbolContext = z.infer<typeof symbolContextSchema>;

interface SymbolInfo {
  name: string;
  kind: string;
  filePath: string;
  line: number;
  column: number;
  preview: string;
}

const findSymbolInputSchema = z.object({
  symbolName: z.string().describe('Name of the symbol to find'),
  projectPath: z.string().default(process.cwd()).describe('Project directory path'),
  symbolType: z.enum(['all', 'function', 'class', 'interface', 'variable', 'type']).default('all').describe('Type of symbol to search for'),
});

const findSymbolOutputSchema = z.object({
  symbols: z.array(z.object({
    name: z.string(),
    kind: z.string(),
    filePath: z.string(),
    line: z.number(),
    column: z.number(),
    preview: z.string(),
  })),
  summary: z.string(),
});

export const findSymbolTool = createTool({
  id: 'semantic:find-symbol',
  description: 'Find symbol definitions (functions, classes, variables) across the codebase using semantic analysis.',
  inputSchema: findSymbolInputSchema,
  outputSchema: findSymbolOutputSchema,
  execute: async (inputData, context) => {
    const { symbolName, projectPath, symbolType } = inputData;
    const requestContext = context?.requestContext as RequestContext<SymbolContext>;

    const maxResults = requestContext?.get('maxResults');
    const excludePatterns = requestContext?.get('excludePatterns');

    const symbols: SymbolInfo[] = [];

    const tracer = trace.getTracer('semantic-tools');
    const span = tracer.startSpan('find_symbol', {
      attributes: {
        'tool.id': 'semantic:find-symbol',
        'tool.input.symbolName': symbolName,
        'tool.input.projectPath': projectPath,
        'tool.input.symbolType': symbolType,
        'tool.input.maxResults': maxResults,
      }
    });

    try {
      // 1. TypeScript/JavaScript Analysis
      const projectCache = ProjectCache.getInstance();
      const project = projectCache.getOrCreate(projectPath);

      for (const sourceFile of project.getSourceFiles()) {
        const filePath = sourceFile.getFilePath();
        if (filePath.includes('node_modules') || filePath.includes('.git')) {continue;}
        if (excludePatterns.some(pattern => filePath.includes(pattern))) {continue;}

        sourceFile.forEachDescendant((node) => {
          if (symbols.length >= maxResults) {return;}

          const nodeSymbol = extractSymbolInfo(node, symbolName, symbolType);
          if (nodeSymbol) {
            const start = node.getStartLinePos();
            const pos = sourceFile.getLineAndColumnAtPos(start);

            symbols.push({
              name: nodeSymbol.name,
              kind: nodeSymbol.kind,
              filePath,
              line: pos.line,
              column: pos.column,
              preview: node.getText().substring(0, 100)
            });
          }
        });
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
            const pythonSymbols = await PythonParser.findSymbols(content);

            for (const pySymbol of pythonSymbols) {
              if (pySymbol.name.includes(symbolName) &&
                  (symbolType === 'all' || symbolType === pySymbol.kind)) {
                symbols.push({
                  name: pySymbol.name,
                  kind: pySymbol.kind,
                  filePath: pyFile,
                  line: pySymbol.line,
                  column: pySymbol.column,
                  preview: pySymbol.docstring?.substring(0, 100) ?? `${pySymbol.kind} ${pySymbol.name}`
                });
              }
            }
          } catch (error) {
            log.warn(`Error parsing Python file ${pyFile}`, { error });
          }
        }
      } catch (error) {
        log.warn('Error searching Python files', { error });
      }

      const summary = generateSummary(symbols, symbolName);

      span.setAttributes({
        'tool.output.symbolsCount': symbols.length,
      });
      span.end();

      return {
        symbols,
        summary
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      span.recordException(error instanceof Error ? error : new Error(errorMessage));
      span.setStatus({ code: 2, message: errorMessage });
      span.end();
      throw error;
    }
  }
});

function extractSymbolInfo(
  node: Node,
  symbolName: string,
  symbolType: string
): { name: string; kind: string } | null {
  // Function declarations and expressions
  if (symbolType === 'all' || symbolType === 'function') {
    if (Node.isFunctionDeclaration(node) || Node.isMethodDeclaration(node)) {
      const name = node.getName();
      if (name?.includes(symbolName)) {
        return { name, kind: 'function' };
      }
    }
    if (Node.isVariableDeclaration(node)) {
      const name = node.getName();
      const initializer = node.getInitializer();
      if (name && name.includes(symbolName) &&
          (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer))) {
        return { name, kind: 'function' };
      }
    }
  }

  // Class declarations
  if ((symbolType === 'all' || symbolType === 'class') && Node.isClassDeclaration(node)) {
    const name = node.getName();
    if (name?.includes(symbolName)) {
      return { name, kind: 'class' };
    }
  }

  // Interface declarations
  if ((symbolType === 'all' || symbolType === 'interface') && Node.isInterfaceDeclaration(node)) {
    const name = node.getName();
    if (name?.includes(symbolName)) {
      return { name, kind: 'interface' };
    }
  }

  // Type aliases
  if ((symbolType === 'all' || symbolType === 'type') && Node.isTypeAliasDeclaration(node)) {
    const name = node.getName();
    if (name?.includes(symbolName)) {
      return { name, kind: 'type' };
    }
  }

  // Variables
  if ((symbolType === 'all' || symbolType === 'variable') && Node.isVariableDeclaration(node)) {
        const name = node.getName();
        const initializer = node.getInitializer();
        if (name && name.includes(symbolName) &&
            !Node.isArrowFunction(initializer) &&
            !Node.isFunctionExpression(initializer)) {
          return { name, kind: 'variable' };
        }
  }

  return null;
}

function generateSummary(symbols: SymbolInfo[], query: string): string {
  if (symbols.length === 0) {
    return `No symbols found matching "${query}"`;
  }

  const byKind: Record<string, number> = {};
  symbols.forEach(s => {
    byKind[s.kind] = (byKind[s.kind] || 0) + 1;
  });

  const summary = Object.entries(byKind)
    .map(([kind, count]) => `${count} ${kind}${count > 1 ? 's' : ''}`)
    .join(', ');

  return `Found ${symbols.length} symbols: ${summary}`;
}
