import type { RequestContext } from '@mastra/core/request-context'
import { createTool } from '@mastra/core/tools'
import { trace } from '@opentelemetry/api'
import fg from 'fast-glob'
import { readFile } from 'node:fs/promises'
import * as path from 'node:path'
import type { SourceFile } from 'ts-morph'
import { Node, SyntaxKind } from 'ts-morph'
import { z } from 'zod'
import { log } from '../config/logger'
import { ProjectCache, PythonParser } from './semantic-utils'

// Define the expected shape of the runtime context for this tool
export interface SymbolContext {
    maxResults?: number
    excludePatterns?: string[]
    includeNodeModules?: boolean
    caseSensitive?: boolean
    searchType: 'semantic' | 'text' // Required field
}

interface SymbolInfo {
    name: string
    kind: string
    filePath: string
    line: number
    column: number
    preview: string
    module?: string
    isExported?: boolean
}

const findSymbolInputSchema = z.object({
    symbolName: z.string().describe('Name of the symbol to find'),
    projectPath: z
        .string()
        .default(process.cwd())
        .describe('Project directory path'),
    symbolType: z
        .enum([
            'all',
            'function',
            'class',
            'interface',
            'variable',
            'type',
            'method',
            'property',
            'enum',
        ])
        .default('all')
        .describe('Type of symbol to search for'),
    includeDependencies: z
        .boolean()
        .default(false)
        .describe('Include node_modules in search'),
})

const findSymbolOutputSchema = z.object({
    symbols: z.array(
        z.object({
            name: z.string(),
            kind: z.string(),
            filePath: z.string(),
            line: z.number(),
            column: z.number(),
            preview: z.string(),
            module: z.string().optional(),
            isExported: z.boolean().optional(),
        })
    ),
    summary: z.string(),
    stats: z.object({
        totalFiles: z.number(),
        searchTime: z.number(),
        cacheHits: z.number(),
    }),
})

export const findSymbolTool = createTool({
    id: 'semantic:find-symbol',
    description:
        'Find symbol definitions (functions, classes, variables) across the codebase using semantic analysis.',
    inputSchema: findSymbolInputSchema,
    outputSchema: findSymbolOutputSchema,

    execute: async (inputData, context) => {
        const { symbolName, projectPath, symbolType, includeDependencies } =
            inputData
        const requestContext =
            context?.requestContext as RequestContext<SymbolContext>
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Symbol search cancelled')
        }

        const maxResults = requestContext?.get('maxResults') ?? 100
        const excludePatterns = requestContext?.get('excludePatterns') ?? []
        const includeNodeModules =
            requestContext?.get('includeNodeModules') ?? includeDependencies
        const caseSensitive = requestContext?.get('caseSensitive') ?? false

        const symbols: SymbolInfo[] = []
        const startTime = Date.now()
        let cacheHits = 0

        // Emit progress event for starting symbol search
        await context?.writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔍 Starting symbol search for '${symbolName}' in ${projectPath}`,
                stage: 'semantic:find-symbol',
            },
            id: 'semantic:find-symbol',
        })

        const tracer = trace.getTracer('semantic-tools')
        const span = tracer.startSpan('find_symbol', {
            attributes: {
                'tool.id': 'semantic:find-symbol',
                'tool.input.symbolName': symbolName,
                'tool.input.projectPath': projectPath,
                'tool.input.symbolType': symbolType,
                'tool.input.maxResults': maxResults,
            },
        })

        try {
            // Check for cancellation before symbol search
            if (abortSignal?.aborted) {
                span.setStatus({
                    code: 2,
                    message: 'Operation cancelled during symbol search',
                })
                span.end()
                throw new Error('Symbol search cancelled during processing')
            }

            // Normalize search term
            const searchTerm = caseSensitive
                ? symbolName
                : symbolName.toLowerCase()

            // 1. TypeScript/JavaScript Analysis
            const projectCache = ProjectCache.getInstance()
            const project = projectCache.getOrCreate(projectPath)
            cacheHits++

            const sourceFiles = project.getSourceFiles()
            let processedFiles = 0

            for (const sourceFile of sourceFiles) {
                if (symbols.length >= maxResults) {
                    break
                }

                const filePath = sourceFile.getFilePath()

                // Skip excluded patterns
                if (!includeNodeModules && filePath.includes('node_modules')) {
                    continue
                }
                if (
                    excludePatterns.some((pattern) =>
                        filePath.includes(pattern)
                    )
                ) {
                    continue
                }

                // Skip non-source files
                if (!/\.(ts|tsx|js|jsx)$/.exec(filePath)) {
                    continue
                }

                try {
                    const moduleName = getModuleName(filePath, projectPath)
                    const fileSymbols = await analyzeTypeScriptFile(
                        sourceFile,
                        searchTerm,
                        symbolType,
                        caseSensitive
                    )

                    for (const symbol of fileSymbols) {
                        if (symbols.length >= maxResults) {
                            break
                        }

                        symbols.push({
                            ...symbol,
                            filePath,
                            module: moduleName,
                            isExported: isSymbolExported(
                                sourceFile,
                                symbol.name
                            ),
                        })
                    }

                    processedFiles++
                } catch (error) {
                    log.warn(`Error analyzing file ${filePath}`, { error })
                }
            }

            // 2. Python Analysis
            try {
                const pythonFiles = await fg(
                    path.join(projectPath, '**/*.py'),
                    {
                        ignore: includeNodeModules
                            ? []
                            : [
                                  '**/node_modules/**',
                                  '**/.git/**',
                                  '**/venv/**',
                                  '**/__pycache__/**',
                              ],
                        onlyFiles: true,
                        absolute: true,
                        dot: true,
                        unique: true,
                    }
                )

                for (const pyFile of pythonFiles) {
                    if (symbols.length >= maxResults) {
                        break
                    }
                    if (
                        excludePatterns.some((pattern) =>
                            pyFile.includes(pattern)
                        )
                    ) {
                        continue
                    }

                    try {
                        const content = await readFile(pyFile, 'utf-8')
                        const pythonSymbols =
                            await PythonParser.findSymbols(content)

                        for (const pySymbol of pythonSymbols) {
                            if (symbols.length >= maxResults) {
                                break
                            }

                            const symbolNameMatch = caseSensitive
                                ? pySymbol.name.includes(symbolName)
                                : pySymbol.name
                                      .toLowerCase()
                                      .includes(searchTerm)

                            if (
                                symbolNameMatch &&
                                (symbolType === 'all' ||
                                    symbolType === pySymbol.kind)
                            ) {
                                symbols.push({
                                    name: pySymbol.name,
                                    kind: pySymbol.kind,
                                    filePath: pyFile,
                                    line: pySymbol.line,
                                    column: pySymbol.column,
                                    preview:
                                        pySymbol.docstring?.substring(0, 100) ??
                                        `${pySymbol.kind} ${pySymbol.name}`,
                                    module: getModuleName(pyFile, projectPath),
                                    isExported: isPythonSymbolExported(
                                        content,
                                        pySymbol.name
                                    ),
                                })
                            }
                        }
                    } catch (error) {
                        log.warn(`Error parsing Python file ${pyFile}`, {
                            error,
                        })
                    }
                }
            } catch (error) {
                log.warn('Error searching Python files', { error })
            }

            const searchTime = Date.now() - startTime
            const summary = generateSummary(symbols, symbolName, processedFiles)

            // Emit completion progress event
            await context?.writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Found ${symbols.length} symbols for '${symbolName}' in ${processedFiles} files (${searchTime}ms)`,
                    stage: 'semantic:find-symbol',
                },
                id: 'semantic:find-symbol',
            })

            span.setAttributes({
                'tool.output.symbolsCount': symbols.length,
                'tool.output.processedFiles': processedFiles,
                'tool.output.searchTime': searchTime,
                'tool.output.cacheHits': cacheHits,
            })
            span.end()

            return {
                symbols,
                summary,
                stats: {
                    totalFiles: processedFiles,
                    searchTime,
                    cacheHits,
                },
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)

            // Handle AbortError specifically
            if (error instanceof Error && error.name === 'AbortError') {
                const cancelMessage = `Symbol search cancelled for "${symbolName}"`
                span.setStatus({ code: 2, message: cancelMessage })
                span.end()

                await context?.writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: `🛑 ${cancelMessage}`,
                        stage: 'semantic:find-symbol',
                    },
                    id: 'semantic:find-symbol',
                })

                log.warn(cancelMessage)
                throw new Error(cancelMessage)
            }

            span.recordException(
                error instanceof Error ? error : new Error(errorMessage)
            )
            span.setStatus({ code: 2, message: errorMessage })
            span.end()
            throw error
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Find symbol tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Find symbol tool received input chunk', {
            toolCallId,
            inputTextDelta,
            abortSignal: abortSignal?.aborted,
            messageCount: messages.length,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Find symbol received complete input', {
            toolCallId,
            messageCount: messages.length,
            symbolName: input.symbolName,
            projectPath: input.projectPath,
            symbolType: input.symbolType,
            includeDependencies: input.includeDependencies,
            hook: 'onInputAvailable',
            abortSignal: abortSignal?.aborted,
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Find symbol search completed', {
            toolCallId,
            toolName,
            symbolsFound: output.symbols.length,
            totalFiles: output.stats.totalFiles,
            searchTime: output.stats.searchTime,
            cacheHits: output.stats.cacheHits,
            hook: 'onOutput',
            abortSignal: abortSignal?.aborted,
        })
    },
})

function extractSymbolInfo(
    node: Node,
    searchTerm: string,
    symbolType: string,
    caseSensitive: boolean
): { name: string; kind: string } | null {
    // Function declarations and expressions
    if (symbolType === 'all' || symbolType === 'function') {
        if (
            node.isKind(SyntaxKind.FunctionDeclaration) ||
            node.isKind(SyntaxKind.MethodDeclaration)
        ) {
            const name = node.getName()
            if (
                name &&
                name !== undefined &&
                matchesSearch(name, searchTerm, caseSensitive)
            ) {
                return { name, kind: 'function' }
            }
        }
        if (node.isKind(SyntaxKind.VariableDeclaration)) {
            const name = node.getName()
            const initializer = node.getInitializer()
            if (
                name &&
                name !== undefined &&
                matchesSearch(name, searchTerm, caseSensitive) &&
                (Node.isArrowFunction(initializer) ||
                    Node.isFunctionExpression(initializer))
            ) {
                return { name, kind: 'function' }
            }
        }
    }

    // Class declarations
    if (
        (symbolType === 'all' || symbolType === 'class') &&
        node.isKind(SyntaxKind.ClassDeclaration)
    ) {
        const name = node.getName()
        if (
            name &&
            name !== undefined &&
            matchesSearch(name, searchTerm, caseSensitive)
        ) {
            return { name, kind: 'class' }
        }
    }

    // Interface declarations
    if (
        (symbolType === 'all' || symbolType === 'interface') &&
        node.isKind(SyntaxKind.InterfaceDeclaration)
    ) {
        const name = node.getName()
        if (
            name &&
            name !== undefined &&
            matchesSearch(name, searchTerm, caseSensitive)
        ) {
            return { name, kind: 'interface' }
        }
    }

    // Type aliases
    if (
        (symbolType === 'all' || symbolType === 'type') &&
        node.isKind(SyntaxKind.TypeAliasDeclaration)
    ) {
        const name = node.getName()
        if (
            name &&
            name !== undefined &&
            matchesSearch(name, searchTerm, caseSensitive)
        ) {
            return { name, kind: 'type' }
        }
    }

    // Enum declarations
    if (
        (symbolType === 'all' || symbolType === 'enum') &&
        node.isKind(SyntaxKind.EnumDeclaration)
    ) {
        const name = node.getName()
        if (
            name &&
            name !== undefined &&
            matchesSearch(name, searchTerm, caseSensitive)
        ) {
            return { name, kind: 'enum' }
        }
    }

    // Property declarations
    if (
        (symbolType === 'all' || symbolType === 'property') &&
        node.isKind(SyntaxKind.PropertyDeclaration)
    ) {
        const name = node.getName()
        if (
            name &&
            name !== undefined &&
            matchesSearch(name, searchTerm, caseSensitive)
        ) {
            return { name, kind: 'property' }
        }
    }

    // Variables
    if (
        (symbolType === 'all' || symbolType === 'variable') &&
        node.isKind(SyntaxKind.VariableDeclaration)
    ) {
        const name = node.getName()
        const initializer = node.getInitializer()
        if (
            name &&
            name !== undefined &&
            matchesSearch(name, searchTerm, caseSensitive) &&
            !Node.isArrowFunction(initializer) &&
            !Node.isFunctionExpression(initializer)
        ) {
            return { name, kind: 'variable' }
        }
    }

    return null
}

function generateSummary(
    symbols: SymbolInfo[],
    query: string,
    processedFiles: number
): string {
    if (symbols.length === 0) {
        return `No symbols found matching "${query}" in ${processedFiles} files`
    }

    const byKind: Record<string, number> = {}
    symbols.forEach((s) => {
        byKind[s.kind] = (byKind[s.kind] || 0) + 1
    })

    const summary = Object.entries(byKind)
        .map(([kind, count]) => `${count} ${kind}${count > 1 ? 's' : ''}`)
        .join(', ')

    return `Found ${symbols.length} symbols matching "${query}" in ${processedFiles} files: ${summary}`
}

function getModuleName(filePath: string, projectPath: string): string {
    const relativePath = path.relative(projectPath, filePath)
    const parsed = path.parse(relativePath)
    return parsed.dir ? `${parsed.dir}/${parsed.name}` : parsed.name
}

async function analyzeTypeScriptFile(
    sourceFile: SourceFile,
    searchTerm: string,
    symbolType: string,
    caseSensitive: boolean
): Promise<
    Array<{
        name: string
        kind: string
        line: number
        column: number
        preview: string
    }>
> {
    const symbols: Array<{
        name: string
        kind: string
        line: number
        column: number
        preview: string
    }> = []

    sourceFile.forEachDescendant((node: Node) => {
        const symbolInfo = extractSymbolInfo(
            node,
            searchTerm,
            symbolType,
            caseSensitive
        )
        if (symbolInfo) {
            const start = node.getStartLinePos()
            const pos = sourceFile.getLineAndColumnAtPos(start)

            symbols.push({
                name: symbolInfo.name,
                kind: symbolInfo.kind,
                line: pos.line,
                column: pos.column,
                preview: node.getText().substring(0, 100),
            })
        }
    })

    return symbols
}

function matchesSearch(
    name: string,
    searchTerm: string,
    caseSensitive: boolean
): boolean {
    return caseSensitive
        ? name.includes(searchTerm)
        : name.toLowerCase().includes(searchTerm)
}

function isSymbolExported(sourceFile: SourceFile, symbolName: string): boolean {
    // Check if symbol is exported
    const exports = sourceFile.getExportSymbols()
    return exports.some((exp: unknown) => {
        const exportSymbol = exp as { getName?: () => string }
        return exportSymbol.getName?.() === symbolName
    })
}

function isPythonSymbolExported(content: string, symbolName: string): boolean {
    // Simple heuristic: check if symbol appears in __all__ or is imported
    const lines = content.split('\n')
    for (const line of lines) {
        if (line.includes('__all__') && line.includes(symbolName)) {
            return true
        }
        if (line.trim().startsWith('from ') && line.includes(symbolName)) {
            return true
        }
    }
    return false
}
