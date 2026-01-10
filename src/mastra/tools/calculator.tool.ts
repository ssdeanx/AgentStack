import { SpanType } from '@mastra/core/observability'
import type { RequestContext } from '@mastra/core/request-context'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { log } from '../config/logger'

export type UserTier = 'free' | 'pro' | 'enterprise'

// RequestContext interface for Calculator tool
export interface CalculatorToolContext extends RequestContext {
  'user-tier': UserTier
  userId?: string
  precision?: number
  allowComplexExpressions?: boolean
  maxExpressionLength?: number
}


// Enhanced mathematical functions and constants
const MATH_CONSTANTS = {
  pi: Math.PI,
  e: Math.E,
  ln2: Math.LN2,
  ln10: Math.LN10,
  log2e: Math.LOG2E,
  log10e: Math.LOG10E,
  sqrt2: Math.SQRT2,
  sqrt1_2: Math.SQRT1_2,
  phi: (1 + Math.sqrt(5)) / 2, // Golden ratio
  tau: 2 * Math.PI, // Tau (2π)
}

const MATH_FUNCTIONS = {
  // Basic arithmetic
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  trunc: Math.trunc,
  sign: Math.sign,

  // Trigonometric functions
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,

  // Hyperbolic functions
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  asinh: Math.asinh,
  acosh: Math.acosh,
  atanh: Math.atanh,

  // Exponential and logarithmic
  exp: Math.exp,
  log: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  pow: Math.pow,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,

  // Min/Max
  max: Math.max,
  min: Math.min,

  // Random (with seed support)
  random: Math.random,

  // Special functions
  factorial,
  fibonacci,
  gcd,
  lcm,
  isPrime,
  combinations,
  permutations,
}

// Unit conversion factors (to base SI units)
const UNIT_CONVERSIONS = {
  // Length
  mm: 0.001,
  cm: 0.01,
  dm: 0.1,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,

  // Mass
  mg: 0.000001,
  g: 0.001,
  kg: 1,
  t: 1000,
  oz: 0.0283495,
  lb: 0.453592,
  st: 6.35029,

  // Temperature (special handling)
  celsius: 'celsius',
  fahrenheit: 'fahrenheit',
  kelvin: 'kelvin',

  // Time
  ms: 0.001,
  s: 1,
  min: 60,
  h: 3600,
  day: 86400,

  // Digital storage
  b: 1,
  B: 8,
  KB: 8000,
  MB: 8000000,
  GB: 8000000000,
  TB: 8000000000000,
}

// Create a safe evaluation context
function createSafeContext() {
  return {
    ...MATH_CONSTANTS,
    ...MATH_FUNCTIONS,
  }
}

// Enhanced expression evaluator with variable support
function evaluateExpression(
  expression: string,
  variables: Record<string, number> = {}
): number {
  // Remove whitespace
  const cleanExpr = expression.replace(/\s+/g, '')

  // Basic security checks
  if (/[^0-9+\-*/().\s,a-zA-Z_]/.test(cleanExpr)) {
    throw new Error('Invalid characters in expression')
  }

  if (
    cleanExpr.includes('__proto__') ||
    cleanExpr.includes('prototype') ||
    cleanExpr.includes('constructor')
  ) {
    throw new Error('Potentially unsafe expression')
  }

  // Create function with safe context and variables
  const context = { ...createSafeContext(), ...variables }
  const func = new Function(...Object.keys(context), `return ${cleanExpr}`)

  try {
    const result = func(...Object.values(context))
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Expression did not evaluate to a valid number')
    }
    return result
  } catch (error) {
    throw new Error(
      `Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

// Unit conversion function
function convertUnits(value: number, fromUnit: string, toUnit: string): number {
  // Special handling for temperature
  if (
    ['celsius', 'fahrenheit', 'kelvin'].includes(fromUnit) &&
    ['celsius', 'fahrenheit', 'kelvin'].includes(toUnit)
  ) {
    return convertTemperature(value, fromUnit as 'celsius' | 'fahrenheit' | 'kelvin', toUnit as 'celsius' | 'fahrenheit' | 'kelvin')
  }

  // Regular unit conversion
  const fromFactor =
    UNIT_CONVERSIONS[fromUnit as keyof typeof UNIT_CONVERSIONS]
  const toFactor = UNIT_CONVERSIONS[toUnit as keyof typeof UNIT_CONVERSIONS]

  if (typeof fromFactor !== 'number' || typeof toFactor !== 'number') {
    throw new Error(`Unsupported unit conversion: ${fromUnit} to ${toUnit}`)
  }

  // Convert to base unit, then to target unit
  const baseValue = value * fromFactor
  return baseValue / toFactor
}

function convertTemperature(
  value: number,
  from: 'celsius' | 'fahrenheit' | 'kelvin',
  to: 'celsius' | 'fahrenheit' | 'kelvin'
): number {
  let celsius: number

  // Convert to Celsius first
  switch (from) {
    case 'celsius':
      celsius = value
      break
    case 'fahrenheit':
      celsius = ((value - 32) * 5) / 9
      break
    case 'kelvin':
      celsius = value - 273.15
      break
    default:
      throw new Error(`Unsupported temperature unit: ${from}`)
  }

  // Convert from Celsius to target
  switch (to) {
    case 'celsius':
      return celsius
    case 'fahrenheit':
      return (celsius * 9) / 5 + 32
    case 'kelvin':
      return celsius + 273.15
    default:
      throw new Error(`Unsupported temperature unit: ${to}`)
  }
}

// Matrix operations
const MATRIX_OPERATIONS = {
  add: (a: number[][], b: number[][]) => {
    if (a.length !== b.length || a[0].length !== b[0].length) {
      throw new Error('Matrix dimensions must match for addition')
    }
    return a.map((row, i) => row.map((val, j) => val + b[i][j]))
  },

  subtract: (a: number[][], b: number[][]) => {
    if (a.length !== b.length || a[0].length !== b[0].length) {
      throw new Error('Matrix dimensions must match for subtraction')
    }
    return a.map((row, i) => row.map((val, j) => val - b[i][j]))
  },

  multiply: (a: number[][], b: number[][]) => {
    if (a[0].length !== b.length) {
      throw new Error('Matrix dimensions incompatible for multiplication')
    }
    const result = Array(a.length)
      .fill(0)
      .map(() => Array(b[0].length).fill(0))
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b[0].length; j++) {
        for (let k = 0; k < b.length; k++) {
          result[i][j] += a[i][k] * b[k][j]
        }
      }
    }
    return result
  },

  transpose: (matrix: number[][]) => {
    return matrix[0].map((_, colIndex) =>
      matrix.map((row) => row[colIndex])
    )
  },

  determinant: (matrix: number[][]) => {
    if (matrix.length !== matrix[0].length) {
      throw new Error('Matrix must be square for determinant calculation')
    }
    return calculateDeterminant(matrix)
  },

  inverse: (matrix: number[][]) => {
    const det = calculateDeterminant(matrix)
    if (det === 0) {
      throw new Error('Matrix is singular and cannot be inverted')
    }
    // Simplified inverse for 2x2 matrices
    if (matrix.length === 2 && matrix[0].length === 2) {
      const [[a, b], [c, d]] = matrix
      return [
        [d / det, -b / det],
        [-c / det, a / det],
      ]
    }
    throw new Error('Inverse calculation only supported for 2x2 matrices')
  },
}

export const calculatorTool = createTool({
  id: 'calculator',
  description:
    'Advanced mathematical calculator with expressions, unit conversions, and matrix operations',
  inputSchema: z.object({
    expression: z
      .string()
      .describe(
        'Mathematical expression to evaluate (supports variables, functions, and complex expressions)'
      ),
    variables: z
      .record(z.string(), z.number())
      .optional()
      .describe('Variable definitions for the expression'),
    precision: z
      .number()
      .optional()
      .default(6)
      .describe('Number of decimal places for the result'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    result: z.number(),
    formattedResult: z.string(),
    expression: z.string(),
    variables: z.record(z.string(), z.number()).optional(),
    message: z.string().optional(),
  }),

  execute: async (inputData, context) => {
    const writer = context?.writer
    const abortSignal = context?.abortSignal
    const tracingContext = context?.tracingContext

    const requestCtx = context?.requestContext as CalculatorToolContext | undefined
    const precision = requestCtx?.precision ?? 6
    const allowComplexExpressions = requestCtx?.allowComplexExpressions ?? true
    const maxExpressionLength = requestCtx?.maxExpressionLength ?? 1000

    // Create child span for calculator operation
    const calculatorSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'calculator-operation',
      input: inputData,
      metadata: {
        'tool.id': 'calculator',
        'tool.input.expression': inputData.expression,
        'tool.input.precision': precision,
        'user.id': requestCtx?.userId,
      },
    })

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `🔢 Evaluating expression: ${inputData.expression}`,
        stage: 'calculator',
      },
      id: 'calculator',
    })

    try {
      // Validate expression length
      if (inputData.expression.length > maxExpressionLength) {
        throw new Error(
          `Expression too long (max ${maxExpressionLength} characters)`
        )
      }

      const vars = (inputData.variables ?? {})
      const result = evaluateExpression(
        inputData.expression,
        vars
      )
      const actualPrecision = inputData.precision || precision
      const formattedResult = result.toFixed(actualPrecision)

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `✅ Result: ${formattedResult}`,
          stage: 'calculator',
        },
        id: 'calculator',
      })

      // Update span with successful result
      calculatorSpan?.update({
        output: { success: true, result, formattedResult },
        metadata: {
          'tool.output.success': true,
          'tool.output.result': result,
          'tool.input.expressionLength': inputData.expression.length,
        },
      })
      calculatorSpan?.end()

      return {
        success: true,
        result,
        formattedResult,
        expression: inputData.expression,
        variables: inputData.variables,
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      log.error(`Calculator evaluation failed: ${errorMsg}`, {
        error: errorMsg,
      })

      // Record error in span
      calculatorSpan?.error({
        error: e instanceof Error ? e : new Error(errorMsg),
        endSpan: true,
      })

      return {
        success: false,
        result: 0,
        formattedResult: '0',
        expression: inputData.expression,
        variables: inputData.variables,
        message: errorMsg,
      }
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Calculator tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
    log.info('Calculator tool received input chunk', {
      toolCallId,
      inputTextDelta,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputDelta',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Calculator tool received input', {
      toolCallId,
      messageCount: messages.length,
      inputData: {
        expression: input.expression,
        variablesCount: Object.keys(input.variables ?? {}).length,
      },
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Calculator tool completed', {
      toolCallId,
      toolName,
      outputData: {
        success: output.success,
        hasResult: output.result !== undefined,
      },
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput',
    })
  },
})

export const unitConverterTool = createTool({
  id: 'unit-converter',
  description:
    'Convert between different units of measurement (length, mass, temperature, time, digital storage)',
  inputSchema: z.object({
    value: z.number().describe('Value to convert'),
    fromUnit: z
      .string()
      .describe('Source unit (e.g., "m", "kg", "celsius", "MB")'),
    toUnit: z
      .string()
      .describe('Target unit (e.g., "ft", "lb", "fahrenheit", "GB")'),
    precision: z
      .number()
      .optional()
      .default(4)
      .describe('Decimal precision for result'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    result: z.number(),
    formattedResult: z.string(),
    value: z.number(),
    fromUnit: z.string(),
    toUnit: z.string(),
    conversionFactor: z.number(),
    message: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const writer = context?.writer
    const abortSignal = context?.abortSignal
    const tracingContext = context?.tracingContext
    const requestCtx = context?.requestContext as CalculatorToolContext | undefined

    // Create child span for unit conversion
    const unitConverterSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'unit-conversion',
      input: inputData,
      metadata: {
        'tool.id': 'unit-converter',
        'tool.input.value': inputData.value,
        'tool.input.fromUnit': inputData.fromUnit,
        'tool.input.toUnit': inputData.toUnit,
        'user.id': requestCtx?.userId,
      },
    })

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `🔄 Converting ${inputData.value} ${inputData.fromUnit} to ${inputData.toUnit}`,
        stage: 'unit-converter',
      },
      id: 'unit-converter',
    })

    try {
      if (typeof requestCtx?.userId === 'string') {
        log.debug('Executing unit conversion for user', {
          userId: requestCtx.userId,
        })
      }
      if (abortSignal?.aborted === true) {
        throw new Error('Unit conversion operation cancelled')
      }
      const result = convertUnits(
        inputData.value,
        inputData.fromUnit,
        inputData.toUnit
      )
      const formattedResult = result.toFixed(inputData.precision)

      // Calculate conversion factor
      const fromFactor =
        UNIT_CONVERSIONS[
        inputData.fromUnit as keyof typeof UNIT_CONVERSIONS
        ]
      const toFactor =
        UNIT_CONVERSIONS[
        inputData.toUnit as keyof typeof UNIT_CONVERSIONS
        ]
      const conversionFactor =
        typeof fromFactor === 'number' && typeof toFactor === 'number'
          ? toFactor / fromFactor
          : 1

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `✅ Converted: ${formattedResult} ${inputData.toUnit}`,
          stage: 'unit-converter',
        },
        id: 'unit-converter',
      })

      // Update span with successful result
      unitConverterSpan?.update({
        output: { success: true, result, formattedResult },
        metadata: {
          'tool.output.success': true,
          'tool.output.result': result,
          'tool.input.value': inputData.value,
        },
      })
      unitConverterSpan?.end()

      return {
        success: true,
        result,
        formattedResult,
        value: inputData.value,
        fromUnit: inputData.fromUnit,
        toUnit: inputData.toUnit,
        conversionFactor,
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      log.error(`Unit conversion failed: ${errorMsg}`, {
        error: errorMsg,
      })

      // Record error in span
      unitConverterSpan?.error({
        error: e instanceof Error ? e : new Error(errorMsg),
        endSpan: true,
      })

      return {
        success: false,
        result: 0,
        formattedResult: '0',
        value: inputData.value,
        fromUnit: inputData.fromUnit,
        toUnit: inputData.toUnit,
        conversionFactor: 1,
        message: errorMsg,
      }
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Unit Converter tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
    log.info('Unit Converter tool received input chunk', {
      toolCallId,
      inputTextDelta,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputDelta',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Unit Converter tool received input', {
      toolCallId,
      messageCount: messages.length,
      inputData: {
        value: input.value,
        fromUnit: input.fromUnit,
        toUnit: input.toUnit,
      },
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Unit Converter tool completed', {
      toolCallId,
      toolName,
      outputData: {
        success: output.success,
        result: output.formattedResult,
      },
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput',
    })
  },
})

export const matrixCalculatorTool = createTool({
  id: 'matrix-calculator',
  description:
    'Perform matrix operations (add, subtract, multiply, transpose, determinant, inverse)',
  inputSchema: z.object({
    operation: z
      .enum([
        'add',
        'subtract',
        'multiply',
        'transpose',
        'determinant',
        'inverse',
      ])
      .describe('Matrix operation to perform'),
    matrixA: z
      .array(z.array(z.number()))
      .describe('First matrix (or only matrix for unary operations)'),
    matrixB: z
      .array(z.array(z.number()))
      .optional()
      .describe('Second matrix (required for binary operations)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    result: z.union([z.array(z.array(z.number())), z.number()]),
    operation: z.string(),
    matrixA: z.array(z.array(z.number())),
    matrixB: z.array(z.array(z.number())).optional(),
    dimensions: z.object({
      a: z.array(z.number()),
      b: z.array(z.number()).optional(),
      result: z.array(z.number()),
    }),
    message: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const writer = context?.writer
    const abortSignal = context?.abortSignal
    const tracingContext = context?.tracingContext
    const requestCtx = context?.requestContext as CalculatorToolContext | undefined

    // Create child span for matrix calculation
    const matrixCalculatorSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'matrix-calculation',
      input: inputData,
      metadata: {
        'tool.id': 'matrix-calculator',
        'tool.input.operation': inputData.operation,
        'tool.input.matrixASize': inputData.matrixA.length,
        'user.id': requestCtx?.userId,
      },
    })

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `📐 Performing matrix ${inputData.operation}...`,
        stage: 'matrix-calculator',
      },
      id: 'matrix-calculator',
    })

    try {
      if (typeof requestCtx?.userId === 'string') {
        log.debug('Executing matrix calculation for user', {
          userId: requestCtx.userId,
        })
      }
      if (abortSignal?.aborted === true) {
        throw new Error('Matrix calculation operation cancelled')
      }
      let result: number[][] | number

      switch (inputData.operation) {
        case 'add':
          if (!inputData.matrixB) {
            throw new Error('Matrix B required for addition')
          }
          result = MATRIX_OPERATIONS.add(
            inputData.matrixA,
            inputData.matrixB
          )
          break
        case 'subtract':
          if (!inputData.matrixB) {
            throw new Error('Matrix B required for subtraction')
          }
          result = MATRIX_OPERATIONS.subtract(
            inputData.matrixA,
            inputData.matrixB
          )
          break
        case 'multiply':
          if (!inputData.matrixB) {
            throw new Error('Matrix B required for multiplication')
          }
          result = MATRIX_OPERATIONS.multiply(
            inputData.matrixA,
            inputData.matrixB
          )
          break
        case 'transpose':
          result = MATRIX_OPERATIONS.transpose(inputData.matrixA)
          break
        case 'determinant':
          result = MATRIX_OPERATIONS.determinant(inputData.matrixA)
          break
        case 'inverse':
          result = MATRIX_OPERATIONS.inverse(inputData.matrixA)
          break
        default:
          throw new Error(
            `Unknown matrix operation: ${inputData.operation}`
          )
      }

      const dimensions = {
        a: [
          inputData.matrixA.length,
          inputData.matrixA[0]?.length || 0,
        ],
        b: inputData.matrixB
          ? [
            inputData.matrixB.length,
            inputData.matrixB[0]?.length || 0,
          ]
          : undefined,
        result:
          Array.isArray(result) && Array.isArray(result[0])
            ? [result.length, result[0].length]
            : [1, 1],
      }

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `✅ Matrix ${inputData.operation} completed`,
          stage: 'matrix-calculator',
        },
        id: 'matrix-calculator',
      })

      // Update span with successful result
      matrixCalculatorSpan?.update({
        output: { success: true, operation: inputData.operation },
        metadata: {
          'tool.output.success': true,
          'tool.input.operation': inputData.operation,
        },
      })
      matrixCalculatorSpan?.end()

      return {
        success: true,
        result,
        operation: inputData.operation,
        matrixA: inputData.matrixA,
        matrixB: inputData.matrixB,
        dimensions,
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      log.error(`Matrix operation failed: ${errorMsg}`, {
        error: errorMsg,
      })

      // Record error in span
      matrixCalculatorSpan?.error({
        error: e instanceof Error ? e : new Error(errorMsg),
        endSpan: true,
      })

      return {
        success: false,
        result: [],
        operation: inputData.operation,
        matrixA: inputData.matrixA,
        matrixB: inputData.matrixB,
        dimensions: {
          a: [
            inputData.matrixA.length,
            inputData.matrixA[0]?.length || 0,
          ],
          b: inputData.matrixB
            ? [
              inputData.matrixB.length,
              inputData.matrixB[0]?.length || 0,
            ]
            : undefined,
          result: [0, 0],
        },
        message: errorMsg,
      }
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Matrix Calculator tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
    log.info('Matrix Calculator tool received input chunk', {
      toolCallId,
      inputTextDelta,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputDelta',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Matrix Calculator tool received input', {
      toolCallId,
      messageCount: messages.length,
      inputData: {
        operation: input.operation,
        matrixADims: [input.matrixA.length, input.matrixA[0]?.length || 0],
      },
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('Matrix Calculator tool completed', {
      toolCallId,
      toolName,
      outputData: {
        success: output.success,
        operation: output.operation,
      },
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput',
    })
  },
})

// Helper functions
function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) {
    throw new Error('Factorial requires a non-negative integer')
  }
  if (n === 0 || n === 1) {
    return 1
  }
  let result = 1
  for (let i = 2; i <= n; i++) {
    result *= i
  }
  return result
}

function fibonacci(n: number): number {
  if (n < 0 || !Number.isInteger(n)) {
    throw new Error('Fibonacci requires a non-negative integer')
  }
  if (n === 0) {
    return 0
  }
  if (n === 1) {
    return 1
  }
  let a = 0,
    b = 1
  for (let i = 2; i <= n; i++) {
    const temp = a + b
    a = b
    b = temp
  }
  return b
}

function gcd(...numbers: number[]): number {
  if (numbers.length < 2) {
    throw new Error('GCD requires at least two numbers')
  }
  return numbers.reduce((a, b) => {
    a = Math.abs(a)
    b = Math.abs(b)
    while (b !== 0) {
      const temp = b
      b = a % b
      a = temp
    }
    return a
  })
}

function lcm(...numbers: number[]): number {
  if (numbers.length < 2) {
    throw new Error('LCM requires at least two numbers')
  }
  return numbers.reduce((a, b) => Math.abs(a * b) / gcd(a, b))
}

function isPrime(n: number): boolean {
  if (!Number.isInteger(n)) {
    throw new Error('Prime check requires an integer')
  }
  if (n <= 1) {
    return false
  }
  if (n <= 3) {
    return true
  }
  if (n % 2 === 0 || n % 3 === 0) {
    return false
  }
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) {
      return false
    }
  }
  return true
}

function combinations(n: number, k: number): number {
  if (
    !Number.isInteger(n) ||
    !Number.isInteger(k) ||
    n < 0 ||
    k < 0 ||
    k > n
  ) {
    throw new Error('Invalid parameters for combinations')
  }
  return factorial(n) / (factorial(k) * factorial(n - k))
}

function permutations(n: number, k: number): number {
  if (
    !Number.isInteger(n) ||
    !Number.isInteger(k) ||
    n < 0 ||
    k < 0 ||
    k > n
  ) {
    throw new Error('Invalid parameters for permutations')
  }
  return factorial(n) / factorial(n - k)
}

function calculateDeterminant(matrix: number[][]): number {
  const n = matrix.length
  if (n === 1) {
    return matrix[0][0]
  }
  if (n === 2) {
    return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]
  }

  let det = 0
  for (let i = 0; i < n; i++) {
    const subMatrix = matrix
      .slice(1)
      .map((row) => row.filter((_, j) => j !== i))
    det += Math.pow(-1, i) * matrix[0][i] * calculateDeterminant(subMatrix)
  }
  return det
}

export type CalculatorUITool = InferUITool<typeof calculatorTool>
export type UnitConverterUITool = InferUITool<typeof unitConverterTool>
export type MatrixCalculatorUITool = InferUITool<typeof matrixCalculatorTool>
