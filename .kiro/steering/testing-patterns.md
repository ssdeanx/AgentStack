# Testing Patterns

## Test Framework

Project uses Vitest for testing:

```bash
npm test                                    # Run all tests
npx vitest -t "pattern"                    # Run tests matching pattern
npx vitest src/mastra/tools/tests/file.ts  # Run specific test file
npm run coverage                            # Generate coverage report
```

## Test File Location

- Tests go in `src/mastra/tools/tests/` for tools
- Or co-located with features in same directory
- Use `.test.ts` suffix: `my-tool.test.ts`

## Test Structure

```typescript
import { describe, it, expect } from 'vitest'
import { myTool } from '../my-tool'

describe('myTool', () => {
  it('should do something', async () => {
    const result = await myTool.execute({
      context: { /* input */ },
      tracingContext: undefined,
    })
    expect(result).toEqual({ /* expected */ })
  })
})
```

## Key Patterns

### Tool Testing
- Test tool execution with valid inputs
- Verify output matches schema
- Test error cases with invalid inputs
- Mock external API calls if needed

### Agent Testing
- Test agent with specific instructions
- Verify tool selection and usage
- Check response format and content

### Workflow Testing
- Test step execution in sequence
- Verify data flows correctly between steps
- Test error handling and edge cases

## Best Practices

- Keep tests focused on core functionality
- Use descriptive test names
- Test both success and failure paths
- Mock external dependencies
- Avoid over-testing edge cases
- Run tests before committing code
