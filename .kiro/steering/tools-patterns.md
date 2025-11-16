# Tools Implementation Patterns

## Tool Structure

Tools are created using `createTool()` from `@mastra/core/tools` with the following pattern:

```typescript
export const myTool = createTool({
  id: 'tool-id',
  description: 'Clear description of what the tool does',
  inputSchema: z.object({
    // Zod schema for inputs
  }),
  outputSchema: z.object({
    // Zod schema for outputs
  }),
  execute: async ({ context, tracingContext }) => {
    // Implementation
  },
})
```

## Key Patterns from Codebase

### Input/Output Schemas
- Use Zod for strict type validation
- Add `.describe()` to schema fields for clarity
- Example from weather-tool:
  ```typescript
  inputSchema: z.object({
    location: z.string().describe('City name'),
  })
  ```

### Execute Function
- Receives `{ context, tracingContext, runtimeContext }`
- `context` contains the validated input
- Use `tracingContext?.currentSpan?.createChildSpan()` for tracing
- Always wrap in try/catch with proper error logging

### Logging
- Import logger: `import { log } from '../config/logger'`
- Use `log.info()`, `log.error()` for operations
- Log at start and end of execution

### Tracing
- Create child spans for tool execution
- Use `AISpanType.TOOL_CALL` for tool calls
- End spans with output or error metadata

### Error Handling
- Catch errors and log them
- End tracing span with error metadata
- Throw descriptive errors

## File Naming
- Use kebab-case with `.tool.ts` suffix: `my-tool.tool.ts`
- Or descriptive names: `weather-tool.ts`, `serpapi-search.tool.ts`

## Location
- All tools go in `src/mastra/tools/`
- Tests go in `src/mastra/tools/tests/`
