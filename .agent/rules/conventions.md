---
trigger: always_on
---

# Code Conventions

## Tool Implementation Pattern

All tools follow this structure:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { AISpanType } from "@mastra/core/ai-tracing";
import type { RuntimeContext } from "@mastra/core/runtime-context";
import { log } from "../config/logger";

export const myTool = createTool({
  id: "my-tool",
  description: "Clear description of what the tool does",
  inputSchema: z.object({
    param: z.string().describe("Parameter description")
  }),
  outputSchema: z.object({
    data: z.any().describe("Result data"),
    error: z.string().optional()
  }),
  execute: async ({ context, tracingContext, runtimeContext }) => {
    const startTime = Date.now();
    
    // Create root tracing span
    const rootSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'my-tool',
      input: context,
    });

    try {
      // Tool logic here
      log.info('my-tool executed', { context });
      
      rootSpan?.end({ output: result });
      return result;
    } catch (error) {
      log.error('my-tool error', { error, context });
      rootSpan?.error({ error });
      return { data: null, error: errorMessage };
    }
  }
});
```

## Key Patterns

### Zod Schemas Everywhere

- All tool inputs and outputs use Zod schemas
- Add `.describe()` to every field for LLM understanding
- Use strict validation - no `any` without good reason

### Error Handling

- Always return structured errors, never throw from tools
- Use `{ data: result, error: undefined }` pattern
- Log errors with context using `log.error()`
- Update tracing spans with error information

### Tracing & Observability

- Create child spans for all significant operations
- Log operations with `log.info()`, `log.error()`, etc.
- Include governance context (userId, tenantId, roles) when available
- Track timing for performance monitoring

### Environment Variables

- Use `process.env.VAR_NAME` for API keys
- Check for undefined/null/empty before use
- Return error if required env var is missing
- Never log or expose API keys (use `[REDACTED]`)

### Runtime Context

- Extract governance info from runtimeContext
- Support optional context fields with defaults
- Type runtime context with custom interfaces when needed

### API Calls

- Create child spans for external API calls
- Redact API keys in logged URLs
- Handle response errors gracefully
- Track timing for performance monitoring

## Agent Implementation Pattern

```typescript
import { Agent } from '@mastra/core/agent'
import { googleAI } from '../config/google'
import { pgMemory } from '../config/pg-storage'

export const myAgent = new Agent({
  id: 'my-agent',
  name: 'My Agent',
  description: 'What this agent does',
  instructions: ({ runtimeContext }) => {
    // Dynamic instructions based on context
    return `You are an expert at...`;
  },
  model: googleAI,
  tools: {
    tool1,
    tool2,
  },
  memory: pgMemory,
  scorers: {
    quality: {
      scorer: myScorer,
      sampling: { type: "ratio", rate: 0.5 }
    }
  }
});
```

## Testing Conventions

### Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('myTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully execute', async () => {
    // Mock external dependencies
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockData)
    });

    // Create mock contexts
    const mockRuntimeContext = {
      get: vi.fn().mockReturnValue(value)
    } as any;

    const mockTracingContext = {
      currentSpan: {
        createChildSpan: vi.fn().mockReturnValue({
          end: vi.fn(),
          error: vi.fn()
        })
      }
    } as any;

    // Execute and assert
    const result = await myTool.execute({
      context: { param: 'value' },
      runtimeContext: mockRuntimeContext,
      tracingContext: mockTracingContext
    });

    expect(result.data).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it('should handle errors', async () => {
    // Test error cases
  });
});
```

### Testing Rules

- Mock all external API calls with `vi.fn()`
- Test success and error paths
- Mock runtimeContext and tracingContext
- Use `beforeEach` to clear mocks
- Colocate tests in `tests/` subdirectory
- Aim for 95%+ coverage

## TypeScript Conventions

- Use strict mode (enabled in tsconfig.json)
- Prefer interfaces for public APIs, types for internal
- Use explicit return types for public functions
- Avoid `any` - use `unknown` or proper types
- Use optional chaining (`?.`) for nullable access
- Use nullish coalescing (`??`) for defaults

## Import Organization

```typescript
// 1. External framework imports
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// 2. Type imports
import type { RuntimeContext } from "@mastra/core/runtime-context";

// 3. Internal imports (config, tools, etc.)
import { log } from "../config/logger";
import { pgQueryTool } from "../config/pg-storage";
```

## Security Practices

- Validate all inputs with Zod schemas
- Sanitize HTML content (use JSDOM/Cheerio)
- Validate file paths to prevent traversal
- Mask sensitive data in logs
- Use JWT/RBAC for access control
- Never commit API keys or secrets

## Naming Conventions

- Tools: camelCase with "Tool" suffix (e.g., `webScraperTool`)
- Agents: camelCase with "Agent" suffix (e.g., `researchAgent`)
- Functions: camelCase (e.g., `extractLearnings`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_KEY`)
- Types/Interfaces: PascalCase (e.g., `RuntimeContext`)
- Files: kebab-case (e.g., `web-scraper-tool.ts`)
