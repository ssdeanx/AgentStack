import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import type { RequestContext } from '@mastra/core/request-context'
import type { AgentRequestContext } from './request-context'

import { google } from '../config/google'
import { log } from '../config/logger'

import {
  calculatorTool,
  colorChangeTool,
  //    documentChunkingTool,
  //    codeChunkingTool,
  //    dataProcessingTools,
  csvToJsonTool,
  //    dataValidatorTool,
  dateTimeTool,
  jsonToCsvTool,
  randomGeneratorTool,
} from '../tools'

import { InternalSpans } from '@mastra/core/observability'
import { evaluateResultTool } from '../tools/evaluateResultTool'
import { LibsqlMemory } from '../config/libsql'

export type DataProcessingRuntimeContext = AgentRequestContext<{
  processingMode?: 'fast' | 'accurate' | 'balanced'
}>

log.info('Initializing Data Processing Agent...')

export const dataProcessingAgent = new Agent({
  id: 'dataProcessingAgent',
  name: 'Data Processing Agent',
  description:
    'Specialist in data transformation, validation, and processing. Handles document chunking, format conversion, data cleaning, and quality checks.',
  instructions: ({
    requestContext,
  }: {
    requestContext: RequestContext<DataProcessingRuntimeContext>
  }) => {
    const role = requestContext.get('role') ?? 'user'
    const language = requestContext.get('language') ?? 'en'
    const processingMode =
      requestContext.get('processingMode') ?? 'balanced'

    return {
      role: 'system',
      content: `
# Data Processing Specialist
Role: ${role} | Lang: ${language} | Mode: ${processingMode}

## Expertise
- Document and code chunking for RAG systems
- Data format conversion (CSV, JSON, etc.)
- Data validation and quality checks
- Data cleaning and normalization
- Calculations and transformations
- Time and date operations

## Tool Selection Guide
- **Document Chunking**: Use 'documentChunkingTool' for text/document splitting.
- **Code Chunking**: Use 'codeChunkingTool' for source code splitting.
- **Data Processing**: Use 'dataProcessingTools' for common operations (filtering, aggregation).
- **Format Conversion**: Use 'csvToJsonTool' and 'jsonToCsvTool' for format changes.
- **Validation**: Use 'dataValidatorTool' to check data quality and schema compliance.
- **Calculations**: Use 'calculatorTool' for mathematical operations.
- **Dates/Times**: Use 'dateTimeTool' for time-based transformations.
- **Colors**: Use 'colorChangeTool' for color manipulation.
- **Random Data**: Use 'randomGeneratorTool' for test data generation.
- **Quality Check**: Use 'evaluateResultTool' to assess output quality.

## Processing Protocol
1. **Input Validation**: Validate input data structure and quality.
2. **Transformation**: Apply appropriate processing operations.
3. **Quality Check**: Validate output data.
4. **Formatting**: Ensure output matches expected schema.
5. **Documentation**: Record processing steps and parameters.

## Rules
- **Precision**: Maintain data precision and avoid unnecessary rounding.
- **Validation**: Always validate outputs, especially for user-facing data.
- **Efficiency**: Choose the most efficient processing method.
- **Error Handling**: Handle edge cases and malformed data gracefully.
- **Documentation**: Keep track of all transformations applied.

## Output Format
Provide processed data with:
- Structured output matching expected schema
- Summary of transformations applied
- Quality metrics and validation results
- Any warnings or issues found
- Processing time and resource usage

${processingMode === 'accurate'
          ? `
## Accurate Mode
- Double-check all calculations
- Use higher precision where possible
- Validate outputs against multiple criteria
`
          : processingMode === 'fast'
            ? `
## Fast Mode
- Prioritize speed over precision where acceptable
- Use optimized algorithms
- Batch operations when possible
`
            : ''
        }
`,
      providerOptions: {
        google: {
          responseModalities: ['TEXT'],
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: 'medium',
          },
        } satisfies GoogleGenerativeAIProviderOptions,
      },
    }
  },
  model: ({ requestContext }) => {
    const role = requestContext.get('role') ?? 'user'
    if (role === 'admin') {
      return google.chat('gemini-3.1-pro-preview')
    }
    return google.chat('gemini-3.1-flash-lite-preview')
  },
  tools: {
    //     documentChunkingTool,
    //     codeChunkingTool,
    //     dataProcessingTools,
    csvToJsonTool,
    jsonToCsvTool,
    //     dataValidatorTool,
    dateTimeTool,
    colorChangeTool,
    randomGeneratorTool,
    calculatorTool,
    evaluateResultTool,
  },
  memory: LibsqlMemory,
  maxRetries: 3,
  options: {
    tracingPolicy: {
      internal: InternalSpans.AGENT,
    },
  },
  //  defaultOptions: {
  //     autoResumeSuspendedTools: true,
  // },
})
