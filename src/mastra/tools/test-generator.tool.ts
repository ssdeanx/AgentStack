import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { trace, SpanStatusCode } from "@opentelemetry/api";


async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

const testGeneratorInputSchema = z.object({
  sourceFile: z.string().describe('Path to the source file to generate tests for'),
  outputPath: z.string().optional().describe('Output path for test file (defaults to __tests__ folder)'),
  options: z.object({
    includeEdgeCases: z.boolean().default(true).describe('Generate edge case tests'),
    mockExternals: z.boolean().default(true).describe('Add mock setup for external dependencies'),
    testStyle: z.enum(['describe-it', 'test-only']).default('describe-it').describe('Test structure style'),
  }).optional(),
})

const testCaseSchema = z.object({
  name: z.string(),
  type: z.enum(['unit', 'integration', 'edge-case']),
  code: z.string(),
})

const testGeneratorOutputSchema = z.object({
  testFile: z.string(),
  sourceFile: z.string(),
  framework: z.literal('vitest'),
  content: z.string(),
  tests: z.array(testCaseSchema),
  coverage: z.object({
    functions: z.array(z.string()),
    exports: z.array(z.string()),
  }),
  runCommand: z.string(),
}).describe('Test generator output')

export type TestGeneratorInput = z.infer<typeof testGeneratorInputSchema>
export type TestGeneratorOutput = z.infer<typeof testGeneratorOutputSchema>

interface ParsedFunction {
  name: string
  isAsync: boolean
  isExported: boolean
  params: string[]
  returnType?: string
}

function parseTypeScriptFunctions(content: string): ParsedFunction[] {
  const functions: ParsedFunction[] = []

  // Match exported functions: export function name(params): type
  const exportFuncRegex = /export\s+(async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/g
  let match: RegExpExecArray | null
  while ((match = exportFuncRegex.exec(content)) !== null) {
    functions.push({
      name: match[2],
      isAsync: !!match[1],
      isExported: true,
      params: match[3] ? match[3].split(',').map(p => p.trim().split(':')[0].trim()).filter(Boolean) : [],
      returnType: match[4]?.trim(),
    })
  }

  // Match exported const arrow functions: export const name = (params) =>
  const exportConstRegex = /export\s+const\s+(\w+)\s*=\s*(async\s+)?\(([^)]*)\)(?:\s*:\s*([^=]+))?\s*=>/g
  while ((match = exportConstRegex.exec(content)) !== null) {
    functions.push({
      name: match[1],
      isAsync: !!match[2],
      isExported: true,
      params: match[3] ? match[3].split(',').map(p => p.trim().split(':')[0].trim()).filter(Boolean) : [],
      returnType: match[4]?.trim(),
    })
  }

  // Match regular functions (not exported)
  const funcRegex = /(?<!export\s+)(async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/g
  while ((match = funcRegex.exec(content)) !== null) {
    const matchedName = match[2]
    if (!functions.some(f => f.name === matchedName)) {
      functions.push({
        name: matchedName,
        isAsync: !!match[1],
        isExported: false,
        params: match[3] ? match[3].split(',').map(p => p.trim().split(':')[0].trim()).filter(Boolean) : [],
        returnType: match[4]?.trim(),
      })
    }
  }

  return functions
}

function parseExports(content: string): string[] {
  const exports: string[] = []

  const namedExportRegex = /export\s+(?:const|let|var|function|class|type|interface)\s+(\w+)/g
  let exportMatch: RegExpExecArray | null
  while ((exportMatch = namedExportRegex.exec(content)) !== null) {
    exports.push(exportMatch[1])
  }

  const defaultExportRegex = /export\s+default\s+(?:function\s+)?(\w+)?/g
  while ((exportMatch = defaultExportRegex.exec(content)) !== null) {
    if (exportMatch[1]) {exports.push(`default (${exportMatch[1]})`)}
    else {exports.push('default')}
  }

  return [...new Set(exports)]
}

function generateTestCase(
  func: ParsedFunction,
  sourceFile: string,
  options: { includeEdgeCases?: boolean; testStyle?: string }
): Array<z.infer<typeof testCaseSchema>> {
  const tests: Array<z.infer<typeof testCaseSchema>> = []


  // Basic unit test
  const asyncPrefix = func.isAsync ? 'async ' : ''
  const awaitPrefix = func.isAsync ? 'await ' : ''

  tests.push({
    name: `${func.name} - should work correctly`,
    type: 'unit',
    code: `  it('should work correctly', ${asyncPrefix}() => {
    // Arrange
    ${func.params.length > 0 ? func.params.map(p => `const ${p} = undefined // TODO: Add test value`).join('\n    ') : '// No parameters'}
    
    // Act
    const result = ${awaitPrefix}${func.name}(${func.params.join(', ')})
    
    // Assert
    expect(result).toBeDefined()
  })`,
  })

  // Edge case tests
  if (options.includeEdgeCases !== false) {
    if (func.params.length > 0) {
      tests.push({
        name: `${func.name} - should handle empty/null inputs`,
        type: 'edge-case',
        code: `  it('should handle edge cases', ${asyncPrefix}() => {
    // Test with undefined/null inputs
    ${func.isAsync ? 'await ' : ''}expect(() => ${func.name}(${func.params.map(() => 'undefined').join(', ')})).not.toThrow()
  })`,
      })
    }

    if (func.isAsync) {
      tests.push({
        name: `${func.name} - should handle async errors`,
        type: 'edge-case',
        code: `  it('should handle async errors gracefully', async () => {
    // Test error handling
    // TODO: Mock dependencies to throw and verify error handling
    expect(true).toBe(true)
  })`,
      })
    }
  }

  return tests
}

function generateTestFile(
  sourceFile: string,
  functions: ParsedFunction[],
  exports: string[],
  options: { testStyle?: string; mockExternals?: boolean; includeEdgeCases?: boolean }
): { content: string; tests: Array<z.infer<typeof testCaseSchema>> } {
  const moduleName = path.basename(sourceFile, path.extname(sourceFile))
  const allTests: Array<z.infer<typeof testCaseSchema>> = []

  const exportedFuncs = functions.filter(f => f.isExported)
  const importNames = exportedFuncs.map(f => f.name).join(', ')

  let content = `import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ${importNames || moduleName} } from './${moduleName}'

`

  if (options.mockExternals !== false) {
    content += `// Mock external dependencies
// vi.mock('dependency-name', () => ({ ... }))

beforeEach(() => {
  vi.clearAllMocks()
})

`
  }

  for (const func of exportedFuncs) {
    const testCases = generateTestCase(func, sourceFile, options)
    allTests.push(...testCases)

    if (options.testStyle === 'describe-it') {
      content += `describe('${func.name}', () => {
${testCases.map(t => t.code).join('\n\n')}
})

`
    } else {
      for (const test of testCases) {
        content += `test('${func.name} - ${test.name}', ${func.isAsync ? 'async ' : ''}() => {
${test.code.replace(/^ {2}/gm, '')}
})

`
      }
    }
  }

  return { content: content.trim() + '\n', tests: allTests }
}

export const testGeneratorTool = createTool({
  id: 'coding:testGenerator',
  description: `Generate Vitest test scaffolds for TypeScript/JavaScript source files.
Parses exported functions and creates test cases with describe/it blocks.
Supports edge case generation and mock setup for external dependencies.
Use for increasing test coverage and establishing testing patterns.`,
  inputSchema: testGeneratorInputSchema,
  outputSchema: testGeneratorOutputSchema,
  execute: async (inputData, context?) => {
    const { sourceFile, outputPath, options } = inputData
    const { includeEdgeCases, mockExternals, testStyle } = options ?? {}

    const tracer = trace.getTracer('test-generator-tool');
    const span = tracer.startSpan('test-generator', {
        attributes: {
            sourceFile,
            testStyle,
            operation: 'generate-tests'
        }
    });

    try {
        if (!await fileExists(sourceFile)) {
          throw new Error(`Source file not found: ${sourceFile}`)
        }

        await context?.writer?.custom({
            type: 'data-tool-progress',
            data: { status: 'in-progress', message: `🧪 Generating tests for: ${sourceFile}`, stage: 'coding:testGenerator' },
            id: 'coding:testGenerator'
        });

    const content = await fs.readFile(sourceFile, 'utf-8')
    const functions = parseTypeScriptFunctions(content)
    const exports = parseExports(content)

    const { content: testContent, tests } = generateTestFile(
      sourceFile,
      functions,
      exports,
      { testStyle, mockExternals, includeEdgeCases }
    )

    const sourceDir = path.dirname(sourceFile)
    const sourceName = path.basename(sourceFile, path.extname(sourceFile))
    const testFile = outputPath ?? path.join(sourceDir, '__tests__', `${sourceName}.test.ts`)

    span.end();
    return {
      testFile,
      sourceFile,
      framework: 'vitest' as const,
      content: testContent,
      tests,
      coverage: {
        functions: functions.filter(f => f.isExported).map(f => f.name),
        exports,
      },
      runCommand: `npx vitest ${testFile}`,
    }
  } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      span.recordException(error instanceof Error ? error : new Error(errorMessage));
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
      span.end();
      throw error;
  }
  },
})
