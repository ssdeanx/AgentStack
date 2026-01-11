<!-- AGENTS-META {"title":"Tool Tests Coverage","version":"1.0.0","last_updated":"2025-12-15T00:00:00Z","applies_to":"src/mastra/tools/tests","status":"in_progress"} -->

# Tool Tests Coverage Tracking

## Purpose

Track test coverage for all tools in `src/mastra/tools/`. Goal: 97% test coverage.

## Test Files Status

| File                        | Tests  | Status          | Notes                                         |
| --------------------------- | ------ | --------------- | --------------------------------------------- |
| json-to-csv.tool.test.ts    | 7      | ✅ Complete     | Input: `{data}`, Output: `{csv}`              |
| data-validator.tool.test.ts | 7      | ✅ Complete     | Import: `dataValidatorToolJSON`               |
| csv-to-json.tool.test.ts    | 8      | ✅ Complete     | Input: `{csvData, options}`, Tracing verified |
| weather-tool.test.ts        | 5      | ✅ Complete     | Weather API tests                             |
| jwt-auth.tool.test.ts       | 5      | ✅ Complete     | JWT validation with RequestContext mocks      |
| serpapi-search.tool.test.ts | 4/5    | ⚠️ Partial      | 1 test requires env var setup                 |
| spatial-index.tool.test.ts  | 2      | ✅ Pre-existing |                                               |
| downsample.tool.test.ts     | 4      | ✅ Pre-existing |                                               |
| chartjs.integration.test.ts | 1      | ✅ Pre-existing |                                               |
| write-note.tool.test.ts     | 2      | ✅ Added        | File IO + error handling                      |
| text-analysis.tool.test.ts  | 5      | ✅ Added        | Readability, sentiment, language, summary     |
| technical-analysis.tool.test.ts | 3  | ✅ Added        | Stats, SMA/EMA, empty-data check              |
| random-generator.tool.test.ts | 4    | ✅ Added        | Random types generation                       |
| code-search.tool.test.ts    | 2      | ✅ Added        | Regex/string searches & truncation            |
| code-analysis.tool.test.ts  | 1      | ✅ Added        | LOC, patterns, long-line detection            |
| multi-string-edit.tool.test.ts | 2   | ✅ Added        | Dry-run and apply flows                       |
| find-symbol.tool.test.ts    | 1      | ✅ Added        | Mocks ProjectCache/PythonParser               |
| find-references.tool.test.ts| 1      | ✅ Added        | Mocks ProjectCache/PythonParser & fast-glob   |
| **TOTAL**                   | **52** | **47 passing**  |                                               |

## Tools Coverage Matrix

### Data Conversion (4 tools)

| Tool                   | Has Tests | Test File                   | Status       |
| ---------------------- | --------- | --------------------------- | ------------ |
| csv-to-json.tool.ts    | ✅        | csv-to-json.tool.test.ts    | Complete     |
| json-to-csv.tool.ts    | ✅        | json-to-csv.tool.test.ts    | Complete     |
| data-validator.tool.ts | ✅        | data-validator.tool.test.ts | Complete     |
| downsample.tool.ts     | ✅        | downsample.tool.test.ts     | Pre-existing |

### Web Scraping (4 tools)

| Tool                        | Has Tests | Test File                   | Status        |
| --------------------------- | --------- | --------------------------- | ------------- |
| web-scraper-tool.ts         | ⏳        | -                           | **NEEDED**    |
| browser-tool.ts             | ⏳        | -                           | **NEEDED**    |
| serpapi-search.tool.ts      | ✅        | serpapi-search.tool.test.ts | Partial (4/5) |
| serpapi-news-trends.tool.ts | ⏳        | -                           | **NEEDED**    |

### Data & File (4 tools)

| Tool                     | Has Tests | Test File | Status     |
| ------------------------ | --------- | --------- | ---------- |
| fs.ts                    | ⏳        | -         | **NEEDED** |
| data-processing-tools.ts | ⏳        | -         | **NEEDED** |
| write-note.ts            | ✅        | write-note.tool.test.ts | ✅ Added |
| pdf.ts                   | ⏳        | -         | **NEEDED** |

### Financial (3 tools)

| Tool                  | Has Tests | Test File | Status     |
| --------------------- | --------- | --------- | ---------- |
| alpha-vantage.tool.ts | ⏳        | -         | **NEEDED** |
| polygon-tools.ts      | ⏳        | -         | **NEEDED** |
| finnhub-tools.ts      | ⏳        | -         | **NEEDED** |

### Developer (4 tools)

| Tool                | Has Tests | Test File | Status                       |
| ------------------- | --------- | --------- | ---------------------------- |
| github.ts           | ⏳        | -         | **NEEDED** (complex mocking) |
| code-search.tool.ts | ⏳        | -         | **NEEDED**                   |
| find-symbol.tool.ts | ⏳        | -         | **NEEDED**                   |
| execa-tool.ts       | ⏳        | -         | **NEEDED**                   |

### Other (3 tools)

| Tool             | Has Tests | Test File             | Status     |
| ---------------- | --------- | --------------------- | ---------- |
| arxiv.tool.ts    | ⏳        | -                     | **NEEDED** |
| jwt-auth.tool.ts | ✅        | jwt-auth.tool.test.ts | Complete   |
| calendar-tool.ts | ⏳        | -                     | **NEEDED** |

### Visualization (2 tools)

| Tool                        | Has Tests | Test File                  | Status       |
| --------------------------- | --------- | -------------------------- | ------------ |
| spatial-index.tool.ts       | ✅        | spatial-index.tool.test.ts | Pre-existing |
| chartjs.integration.test.ts | ✅        | -                          | Pre-existing |

## Coverage Progress

- **Total Tools**: ~32
- **Tools with Tests**: 17
- **Coverage**: ~53% (17/32)
- **Tests Passing**: 47/52 (approx. current passing test files)

## Test Patterns

### Basic Test Pattern

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toolName } from '../tool-name.tool'

describe('toolName', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('handles valid input', async () => {
        const result = await toolName.execute({ input: 'test' })
        expect(result.output).toBeDefined()
    })

    it('handles error cases', async () => {
        await expect(toolName.execute({ input: 'invalid' })).rejects.toThrow(
            'Expected error'
        )
    })
})
```

### With Tracing Verification

```typescript
it('creates tracing span', async () => {
    const mockTracingContext = {
        currentSpan: {
            createChildSpan: vi.fn().mockReturnValue({
                update: vi.fn(),
                end: vi.fn(),
                error: vi.fn(),
            }),
        },
    }

    await tool.execute(
        { input: 'test' },
        {
            tracingContext: mockTracingContext,
        }
    )

    expect(mockTracingContext.currentSpan.createChildSpan).toHaveBeenCalledWith(
        expect.objectContaining({
            type: 'tool_call',
            name: 'tool-name',
        })
    )
})
```

### With RequestContext Mock

```typescript
it('uses request context', async () => {
    const mockContext = {
        requestContext: {
            get: vi.fn((key: string) => {
                if (key === 'jwt') return 'valid-jwt-token'
                return undefined
            }),
            set: vi.fn(),
            has: vi.fn(() => false),
            delete: vi.fn(),
            entries: vi.fn(),
            keys: vi.fn(),
            values: vi.fn(),
            forEach: vi.fn(),
            toObject: vi.fn(() => ({})),
            clear: vi.fn(),
            size: 0,
            toJSON: vi.fn(() => ({})),
        } as any,
        tracingContext: {
            currentSpan: {
                createChildSpan: vi.fn().mockReturnValue({
                    update: vi.fn(),
                    end: vi.fn(),
                }),
            },
        },
    }

    const result = await tool.execute({}, mockContext)
    expect(result).toBeDefined()
})
```

## Update Log

| Date       | Tests Added       | Coverage Before | Coverage After |
| ---------- | ----------------- | --------------- | -------------- |
| 2025-12-15 | 29 (fixed + new)  | ~3%             | ~22%           |
| 2026-01-11 | +12 (jwt + fixes) | ~22%            | ~25%           |
| Next       | +20 test files    | ~25%            | ~97%           |

---

Last updated: 2026-01-11
