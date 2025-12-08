---
trigger: model_decision
description: Mastra Conventions
name: conventions
title: Mastra Code Conventions
tags:
  - conventions
  - coding-standards
  - best-practices
---
Code Conventions

## Tool Implementation Pattern

All tools follow this structure:

```typescript
import type { InferUITool} from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { AISpanType, InternalSpans } from "@mastra/core/ai-tracing";
import { log } from "../config/logger";
import type { RuntimeContext } from '@mastra/core/runtime-context'
import type { TracingContext } from '@mastra/core/ai-tracing';

// Define the Zod schema for the runtime context
const weatherToolContextSchema = z.object({
    temperatureUnit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
})

// Infer the TypeScript type from the Zod schema
export type WeatherToolContext = z.infer<typeof weatherToolContextSchema>

export const weatherTool = createTool({
    id: 'get-weather',
    description: 'Get current weather for a location',
    inputSchema: z.object({
        location: z.string().describe('City name'),
    }),
    outputSchema: z.object({
        temperature: z.number(),
        feelsLike: z.number(),
        humidity: z.number(),
        windSpeed: z.number(),
        windGust: z.number(),
        conditions: z.string(),
        location: z.string(),
        unit: z.string(), // Add unit to output schema
    }),
    execute: async ({ context, writer, runtimeContext, tracingContext }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { message: `🚀 Starting weather lookup for ${context.location}` } });

        const { temperatureUnit } = weatherToolContextSchema.parse(
            runtimeContext.get('weatherToolContext')
        )

        log.info(
            `Fetching weather for location: ${context.location} in ${temperatureUnit}`
        )

        const weatherSpan = tracingContext?.currentSpan?.createChildSpan({
            type: AISpanType.TOOL_CALL,
            name: 'weather-tool',
            input: { location: context.location, temperatureUnit },
            tracingPolicy: { internal: InternalSpans.ALL },
            runtimeContext: runtimeContext as RuntimeContext<WeatherToolContext>,
        })

        try {
            await writer?.custom({ type: 'data-tool-progress', data: { message: '📍 Geocoding location...' } });
            const result = await getWeather(context.location, temperatureUnit)
            await writer?.custom({ type: 'data-tool-progress', data: { message: '🌤️ Processing weather data...' } });
            weatherSpan?.end({ output: result })
            log.info(`Weather fetched successfully for ${context.location}`)
            const finalResult = {
                ...result,
                unit: temperatureUnit === 'celsius' ? '°C' : '°F',
            };
            await writer?.custom({ type: 'data-tool-progress', data: { message: `✅ Weather ready: ${finalResult.temperature}${finalResult.unit} in ${finalResult.location}` } });
            return finalResult;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            await writer?.custom({ type: 'data-tool-progress', data: { message: `❌ Weather error: ${errorMessage}` } });
            weatherSpan?.end({ metadata: { error: errorMessage } })
            log.error(
                `Failed to fetch weather for ${context.location}: ${errorMessage}`
            )
            throw error
        }
    },
})
export type WeatherUITool = InferUITool<typeof weatherTool>;
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