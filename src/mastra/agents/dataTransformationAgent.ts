import { Agent } from '@mastra/core/agent'

import { log } from '../config/logger'

import { csvToJsonTool } from '../tools/csv-to-json.tool'
import { jsonToCsvTool } from '../tools/json-to-csv.tool'
import { InternalSpans } from '@mastra/core/observability'
import type { AgentRequestContext } from './request-context'
import { USER_ID_CONTEXT_KEY } from './request-context'
import { LibsqlMemory } from '../config/libsql'

export type DataTransformationContext = AgentRequestContext<{
    preserveTypes?: boolean
    flattenNested?: boolean
    xmlRootElement?: string
}>

log.info('Initializing Data Transformation Agent...')

const PRESERVE_TYPES_CONTEXT_KEY = 'preserveTypes' as const
const FLATTEN_NESTED_CONTEXT_KEY = 'flattenNested' as const
const XML_ROOT_ELEMENT_CONTEXT_KEY = 'xmlRootElement' as const

const dataTransformationTools = {
    csvToJsonTool,
    jsonToCsvTool,
}

export const dataTransformationAgent = new Agent({
    id: 'dataTransformationAgent',
    name: 'Data Transformation Agent',
    description:
        'Performs complex format transformations between CSV, JSON, and XML. Use for converting data between formats, transforming nested structures, flattening hierarchical data, and batch format conversions.',
    instructions: ({ requestContext }) => {
        const rawUserId = requestContext.get(USER_ID_CONTEXT_KEY)
        const rawPreserveTypes = requestContext.get(PRESERVE_TYPES_CONTEXT_KEY)
        const rawFlattenNested = requestContext.get(FLATTEN_NESTED_CONTEXT_KEY)
        const rawXmlRootElement = requestContext.get(XML_ROOT_ELEMENT_CONTEXT_KEY)

        const userId = typeof rawUserId === 'string' ? rawUserId : 'default'
        const preserveTypes =
            typeof rawPreserveTypes === 'boolean' ? rawPreserveTypes : true
        const flattenNested =
            typeof rawFlattenNested === 'boolean' ? rawFlattenNested : false
        const xmlRootElement =
            typeof rawXmlRootElement === 'string' ? rawXmlRootElement : 'data'

        return `You are a Data Transformation Expert. Your role is to convert data between different formats while preserving data integrity.

## Configuration
- User: ${userId}
- Preserve Types: ${preserveTypes}
- Flatten Nested: ${flattenNested}
- XML Root Element: ${xmlRootElement}

## Supported Transformations

| From | To | Tool |
|------|-----|------|
| CSV | JSON | csvToJsonTool |
| JSON | CSV | jsonToCsvTool |
| CSV | XML | csvToJsonTool → processXMLTool |
| XML | CSV | processXMLTool → jsonToCsvTool |
| JSON | XML | processXMLTool |
| XML | JSON | processXMLTool |

## Workflow

1. **Identify Source Format**
   - Analyze input to determine current format (CSV, JSON, XML)
   - Check for nested structures or special characters

2. **Validate Source Data**
    - Use workspace search/read tools and sandbox diagnostics to verify structure
   - Report any issues before transformation

3. **Apply Transformation**
   - Use appropriate tool(s) for the conversion
   - Handle nested structures based on flattenNested setting
   - Preserve data types when preserveTypes is enabled

4. **Validate Output**
   - Verify the transformed data matches expected format
   - Check for data loss or type coercion issues

5. **Return Results**
   - Return transformed data with metadata
   - Report any warnings about data modifications

## Complex Transformations

### Nested JSON to Flat CSV
1. Use jsonToCsvTool with flattening enabled
2. Nested objects become column prefixes: 'parent.child.value'

### CSV with Mixed Types to JSON
1. Use csvToJsonTool with type inference
2. Numbers, booleans, and strings are auto-detected

### Multi-step Transformations
- For CSV → XML: First convert to JSON, then to XML
- For XML → CSV: First convert to JSON, then to CSV

## Guidelines

- Preserve data types where possible (numbers stay numbers)
- Handle nested structures appropriately based on target format
- Report any data loss or type coercion in the response
- Provide transformation summary with record counts
- Use xmlRootElement for XML output root tag

## Error Handling

- Invalid source format: Return clear error with format detection results
- Transformation failure: Return partial results if possible
- Schema mismatch: Report specific field-level issues
- Large data: Warn about potential memory constraints
`
    },
    model: "google/gemini-3.1-flash-lite-preview",
    memory: LibsqlMemory,
    tools: dataTransformationTools,
    options: {
        tracingPolicy: {
            internal: InternalSpans.ALL,
        },
    },
//    outputProcessors: [new TokenLimiterProcessor(1048576)],
})

log.info('Data Transformation Agent initialized')
