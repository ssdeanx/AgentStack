<!-- AGENTS-META {"title":"Mastra Tools","version":"2.15.0","last_updated":"2025-12-15T00:00:00Z","applies_to":"/src/mastra/tools","tags":["layer:backend","domain:rag","type:tools","status":"stable"]} -->

# 🔧 Tools Directory (`/src/mastra/tools`)

[![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite)]
[![30+ Tools](https://img.shields.io/badge/Tools-30+-blue?style=flat&logo=appwrite)]

## Persona

**Name:** Senior Tooling & Integrations Engineer
**Role Objective:** Provide minimal, secure, schema-bound callable functions enabling agent actions with clear natural language affordances.

## Purpose

Encapsulate 30+ atomic operational capabilities (security checks, vector queries, content fetch, data processing) in auditable, schema-validated units invoked by agents. Supports financial intelligence, RAG pipelines, web scraping, document processing, and more with Zod schemas, full test coverage, and production-grade error handling.

## createTool()

The `createTool()` function is used to define custom tools that your Mastra agents can execute. Tools extend an agent's capabilities by allowing it to interact with external systems, perform calculations, or access specific data.

### Usage Example

```typescript
// src/mastra/tools/reverse-tool.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const tool = createTool({
  id: "test-tool",
  description: "Reverse the input string",
  inputSchema: z.object({
    input: z.string(),
  }),
  outputSchema: z.object({
    output: z.string(),
  }),
  execute: async (inputData) => {
    const reversed = inputData.input.split("").reverse().join("");

    return {
      output: reversed,
    };
  },
});
```

### Parameters

- **`id`**: `string` - A unique identifier for the tool.
- **`description`**: `string` - A description of what the tool does. This is used by the agent to decide when to use the tool.
- **`inputSchema?`**: `Zod schema` - A Zod schema defining the expected input parameters for the tool's `execute` function.
- **`outputSchema?`**: `Zod schema` - A Zod schema defining the expected output structure of the tool's `execute` function.
- **`suspendSchema?`**: `Zod schema` - A Zod schema defining the structure of the payload passed to `suspend()`. This payload is returned to the client when the tool suspends execution.
- **`resumeSchema?`**: `Zod schema` - A Zod schema defining the expected structure of `resumeData` when the tool is resumed. Used by the agent to extract data from user messages when `autoResumeSuspendedTools` is enabled.
- **`requireApproval?`**: `boolean` - When true, the tool requires explicit approval before execution. The agent will emit a `tool-call-approval` chunk and pause until approved or declined.
- **`execute`**: `function` - The function that contains the tool's logic. It receives two parameters: the validated input data (first parameter) and an optional execution context object (second parameter) containing `requestContext`, `tracingContext`, `abortSignal`, and other execution metadata.
  - **`input`**: `z.infer<TInput>` - The validated input data based on inputSchema
  - **`context?`**: `ToolExecutionContext` - Optional execution context containing metadata
- **`onInputStart?`**: `function` - Optional callback invoked when the tool call input streaming begins. Receives `toolCallId`, `messages`, and `abortSignal`.
- **`onInputDelta?`**: `function` - Optional callback invoked for each incremental chunk of input text as it streams in. Receives `inputTextDelta`, `toolCallId`, `messages`, and `abortSignal`.
- **`onInputAvailable?`**: `function` - Optional callback invoked when the complete tool input is available and parsed. Receives the validated `input` object, `toolCallId`, `messages`, and `abortSignal`.
- **`onOutput?`**: `function` - Optional callback invoked after the tool has successfully executed and returned output. Receives the tool's `output`, `toolCallId`, `messages`, and `abortSignal`.

### Returns

The `createTool()` function returns a `Tool` object.

- **`Tool`**: `object` - An object representing the defined tool, ready to be added to an agent.

## Categories

### 1. 💰 Financial Data APIs

![financial](https://img.shields.io/badge/category-financial-orange?style=flat&logo=appwrite)

| Name          | Description                                              | Status                                                                               | Exports                                                                                   | Dependencies | Links                                            |
| ------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------ |
| Alpha Vantage | Stock, crypto, forex data & indicators                   | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `alphaVantageStockTool`, `alphaVantageCryptoTool`, `alphaVantageForexTool`                | `axios`      | [alpha-vantage.tool.ts](./alpha-vantage.tool.ts) |
| Finnhub       | Real-time quotes, company profiles, financials, analysis | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `finnhubQuotesTool`, `finnhubCompanyTool`, `finnhubFinancialsTool`, `finnhubAnalysisTool` | `axios`      | [finnhub-tools.ts](./finnhub-tools.ts)           |
| Polygon       | Stock/crypto quotes, aggregates, fundamentals            | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `polygonStockQuotesTool`, `polygonCryptoQuotesTool`, `polygonStockAggregatesTool`         | `axios`      | [polygon-tools.ts](./polygon-tools.ts)           |

### 2. 🔍 RAG & Document Processing

![rag](https://img.shields.io/badge/category-rag-yellow?style=flat&logo=appwrite)

| Name              | Description                                           | Status                                                                                               | Exports             | Dependencies               | Links                                                        |
| ----------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------- | -------------------------- | ------------------------------------------------------------ |
| Document Chunking | Split docs into chunks with metadata (10+ strategies) | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite)                 | `mdocumentChunker`  | `@langchain/text-splitter` | [document-chunking.tool.ts](./document-chunking.tool.ts)     |
| PDF Conversion    | PDF to Markdown extraction                            | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite)                  | `pdfToMarkdownTool` | `unpdf`                    | [pdf-data-conversion.tool.ts](./pdf-data-conversion.tool.ts) |
| Data File Manager | Versioned data file management                        | ![experimental](https://img.shields.io/badge/status-experimental-lightblue?style=flat&logo=appwrite) | `dataFileManager`   | `fs-extra`                 | [data-file-manager.ts](./data-file-manager.ts)               |
| Data Validator    | Schema-based data validation                          | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite)                 | `dataValidatorTool` | `zod`                      | [data-validator.tool.ts](./data-validator.tool.ts)           |
| PG SQL            | PostgreSQL query execution                            | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite)                  | `pgSqlTool`         | `@mastra/pg`               | [pg-sql-tool.ts](./pg-sql-tool.ts)                           |

### 3. 🌐 Web Scraping & Search

![web](https://img.shields.io/badge/category-web-blue?style=flat&logo=appwrite)

| Name                   | Description                            | Status                                                                               | Exports                                 | Dependencies            | Links                                                              |
| ---------------------- | -------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| Web Scraper            | Fetch/parse web content (single/batch) | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `webScraperTool`, `batchWebScraperTool` | `playwright`, `cheerio` | [web-scraper-tool.ts](./web-scraper-tool.ts)                       |
| Browser Tool           | Browser automation                     | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite)  | `browserTool`                           | `playwright`            | [browser-tool.ts](./browser-tool.ts)                               |
| SerpAPI Search         | General web search                     | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `serpapiSearchTool`                     | `serpapi`               | [serpapi-search.tool.ts](./serpapi-search.tool.ts)                 |
| SerpAPI News Trends    | News & trends search                   | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `serpapiNewsTrendsTool`                 | `serpapi`               | [serpapi-news-trends.tool.ts](./serpapi-news-trends.tool.ts)       |
| SerpAPI Shopping       | Shopping results                       | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `serpapiShoppingTool`                   | `serpapi`               | [serpapi-shopping.tool.ts](./serpapi-shopping.tool.ts)             |
| SerpAPI Academic Local | Academic & local business search       | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `serpapiAcademicLocalTool`              | `serpapi`               | [serpapi-academic-local.tool.ts](./serpapi-academic-local.tool.ts) |
| Arxiv                  | Academic paper search                  | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite)  | `arxivTool`                             | `arxiv-api`             | [arxiv.tool.ts](./arxiv.tool.ts)                                   |

### 4. 📊 Data Conversion & Utilities

![document](https://img.shields.io/badge/category-document-purple?style=flat&logo=appwrite)

| Name              | Description                     | Status                                                                                               | Exports                | Dependencies | Links                                                |
| ----------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------- | ------------ | ---------------------------------------------------- |
| CSV to JSON       | Convert CSV → JSON              | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite)                 | `csvToJsonTool`        | `csv-parse`  | [csv-to-json.tool.ts](./csv-to-json.tool.ts)         |
| JSON to CSV       | Convert JSON → CSV              | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite)                 | `jsonToCsvTool`        | `json2csv`   | [json-to-csv.tool.ts](./json-to-csv.tool.ts)         |
| JWT Auth          | JWT token validation/generation | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite)                 | `jwtAuthTool`          | `jose`       | [jwt-auth.tool.ts](./jwt-auth.tool.ts)               |
| Weather           | Weather data fetch              | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite)                  | `weatherTool`          | `axios`      | [weather-tool.ts](./weather-tool.ts)                 |
| Evaluate Result   | Result evaluation               | ![experimental](https://img.shields.io/badge/status-experimental-lightblue?style=flat&logo=appwrite) | `evaluateResultTool`   | -            | [evaluateResultTool.ts](./evaluateResultTool.ts)     |
| Extract Learnings | Insight extraction              | ![experimental](https://img.shields.io/badge/status-experimental-lightblue?style=flat&logo=appwrite) | `extractLearningsTool` | -            | [extractLearningsTool.ts](./extractLearningsTool.ts) |

### 5. 🛠️ System & Editor Tools

![tool](https://img.shields.io/badge/category-tool-gray?style=flat&logo=appwrite)

| Name                  | Description                                                                                                                                                         | Status                                                                                               | Exports                                                                                                                                                                                                                                                               | Dependencies                   | Links                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------ |
| Copywriter Agent Tool | Content generation                                                                                                                                                  | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite)                  | `copywriterAgentTool`                                                                                                                                                                                                                                                 | -                              | [copywriter-agent-tool.ts](./copywriter-agent-tool.ts) |
| Editor Agent Tool     | Text editing                                                                                                                                                        | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite)                  | `editorAgentTool`                                                                                                                                                                                                                                                     | -                              | [editor-agent-tool.ts](./editor-agent-tool.ts)         |
| Execa Tool            | Shell command execution                                                                                                                                             | ![experimental](https://img.shields.io/badge/status-experimental-lightblue?style=flat&logo=appwrite) | `execaTool`                                                                                                                                                                                                                                                           | `execa`                        | [execa-tool.ts](./execa-tool.ts)                       |
| Pnpm Tool             | PNPM package management                                                                                                                                             | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite)                  | `pnpmTool`                                                                                                                                                                                                                                                            | `execa`                        | [pnpm-tool.ts](./pnpm-tool.ts)                         |
| Github                | GitHub API interactions                                                                                                                                             | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite)                  | `listRepositories`, `listPullRequests`, `listCommits`, `listIssues`, `createIssue`, `createRelease`, `getRepositoryInfo`, `searchCode`, `getFileContent`, `getRepoFileTree`, `createPullRequest`, `mergePullRequest`, `addIssueComment`, `getPullRequest`, `getIssue` | `octokit`                      | [github.ts](./github.ts)                               |
| FS                    | Filesystem operations                                                                                                                                               | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite)                 | `fsTool`                                                                                                                                                                                                                                                              | `fs-extra`                     | [fs.ts](./fs.ts)                                       |
| Write Note            | Note writing utility                                                                                                                                                | ![experimental](https://img.shields.io/badge/status-experimental-lightblue?style=flat&logo=appwrite) | `writeNoteTool`                                                                                                                                                                                                                                                       | `fs`                           | [write-note.ts](./write-note.ts)                       |
| Calendar Tool         | Calendar management                                                                                                                                                 | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite)                  | `calendarTool`                                                                                                                                                                                                                                                        | -                              | [calendar-tool.ts](./calendar-tool.ts)                 |
| Data Processing Tools | General data processing                                                                                                                                             | ![experimental](https://img.shields.io/badge/status-experimental-lightblue?style=flat&logo=appwrite) | Various                                                                                                                                                                                                                                                               | -                              | [data-processing-tools.ts](./data-processing-tools.ts) |
| PDF                   | PDF utilities                                                                                                                                                       | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite)                  | `pdfTool`                                                                                                                                                                                                                                                             | `unpdf`                        | [pdf.ts](./pdf.ts)                                     |
| SerpAPI Config        | SerpAPI configuration                                                                                                                                               | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite)                 | Config exports                                                                                                                                                                                                                                                        | `serpapi`                      | [serpapi-config.ts](./serpapi-config.ts)               |
| Code Search           | Search for patterns across source files. Supports string and regex patterns with context lines. Use for finding usages, identifying patterns, and code exploration. | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite)                 | `codeSearchTool`                                                                                                                                                                                                                                                      | `fast-glob`, `zod`, `re2`      | [code-search.tool.ts](./code-search.tool.ts)           |
| Find Symbol           | Find symbol definitions (functions, classes, variables) across the codebase using semantic analysis.                                                                | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite)                 | `findSymbolTool`                                                                                                                                                                                                                                                      | `ts-morph`, `zod`, `fast-glob` | [find-symbol.tool.ts](./find-symbol.tool.ts)           |

### 6. 📈 Financial Chart Tools

![charts](https://img.shields.io/badge/category-charts-teal?style=flat&logo=appwrite)

| Name                      | Description                          | Status                                                                              | Exports                  | Dependencies                   | Links                                                  |
| ------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------ | ------------------------------ | ------------------------------------------------------ |
| Chart Supervisor Tool     | Orchestrates chart creation pipeline | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `chartSupervisorTool`    | `recharts`, financial tools    | [financial-chart-tools.ts](./financial-chart-tools.ts) |
| Chart Generator Tool      | Generates Recharts React components  | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `chartGeneratorTool`     | `recharts`                     | [financial-chart-tools.ts](./financial-chart-tools.ts) |
| Chart Data Processor Tool | Transforms financial data for charts | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `chartDataProcessorTool` | Polygon, Finnhub, AlphaVantage | [financial-chart-tools.ts](./financial-chart-tools.ts) |
| Chart Type Advisor Tool   | Recommends optimal chart types       | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `chartTypeAdvisorTool`   | `recharts`                     | [financial-chart-tools.ts](./financial-chart-tools.ts) |

_Status based on test coverage & maturity: stable (tested, production-ready), alpha (basic tests), experimental (untested/prototype). 18/30+ tools tested._

### Data Tool Progress Events

All tools must emit progress events with this exact format:

```typescript
// ✅ CORRECT: Progress event format
await context?.writer?.custom({
    type: 'data-tool-progress',
    data: {
        status: 'in-progress', // "in-progress" | "done"
        message: `Input: key="${inputData.key}" - 📝 Descriptive progress message`,
        stage: 'tool-name', // Tool identifier (same as id)
    },
    id: 'tool-name', // Tool identifier outside data object
})

// ❌ WRONG: Don't put id inside data object
await context?.writer?.custom({
    type: 'data-tool-progress',
    data: {
        id: 'tool-name', // ❌ Wrong - id belongs outside
        message: '...',
    },
})
```

**Example from Alpha Vantage Tool:**

```typescript
await context?.writer?.custom({
    type: 'data-tool-progress',
    data: {
        status: 'in-progress',
        message: `📈 Fetching Alpha Vantage crypto data for ${inputData.symbol}/${inputData.market}`,
        stage: 'alpha-vantage-crypto',
    },
    id: 'alpha-vantage-crypto',
})
```

> Note: These conventions are tracked in the memory bank task `TASK001-update-2025-12-14`. Recent commits synced tool implementations and memory-bank progress notes to follow this standard.

## Tool Lifecycle Hooks

Mastra tools support **lifecycle hooks** that allow monitoring and reacting to different stages of tool execution. These hooks provide enhanced observability and can be used for logging, analytics, validation, and real-time updates.

### Available Hooks

- **`onInputStart`** - Called when tool call input streaming begins
- **`onInputDelta`** - Called for each incremental chunk of input text as it streams in
- **`onInputAvailable`** - Called when complete tool input is available and parsed
- **`onOutput`** - Called after tool execution completes successfully

### Hook Execution Order

For a typical streaming tool call, the hooks are invoked in this order:

1. `onInputStart` → Input streaming begins
2. `onInputDelta` → Called multiple times as chunks arrive
3. `onInputAvailable` → Complete input is parsed and validated
4. Tool's `execute` function runs
5. `onOutput` → Tool has completed successfully

**Implementation requirement:** Lifecycle hooks (`onInputStart`, `onInputDelta`, `onInputAvailable`, `onOutput`) **must be declared after** the tool's `execute` property in the `createTool()` call. This ordering ensures tooling that relies on the execute initialization sees hooks only after the execution context is available.

### Implementation Pattern

All lifecycle hooks use structured logging with the Mastra logger for consistent, searchable logs:

```typescript
import { log } from '../config/logger'

export const exampleTool = createTool({
    id: 'example-tool',
    description: 'Example tool with lifecycle hooks',
    inputSchema: z.object({
        param: z.string().describe('Input parameter'),
    }),
    outputSchema: z.object({
        result: z.string(),
    }),
    execute: async (inputData, context) => {
        // Tool implementation
        return { result: 'success' }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Tool received input', {
            toolCallId,
            messageCount: messages.length,
            inputData: { param: input.param },
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Tool completed', {
            toolCallId,
            toolName,
            outputData: { result: output.result },
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})
```

### Hook Parameters

All hooks receive a parameter object with:

- `toolCallId` (string): Unique identifier for this specific tool call
- `abortSignal` (AbortSignal): Signal for detecting if the operation should be cancelled

Additional parameters vary by hook:

- `onInputStart`, `onInputDelta`, `onInputAvailable`: `messages` (array): The conversation messages at the time of the tool call
- `onInputDelta`: `inputTextDelta` (string): The incremental text chunk
- `onInputAvailable`: `input`: The validated input data (typed according to `inputSchema`)
- `onOutput`: `output`: The tool's return value (typed according to `outputSchema`) and `toolName` (string)

### Error Handling

Hook errors are caught and logged automatically, but do not prevent tool execution from continuing. If a hook throws an error, it will be logged to the console but won't fail the tool call.

### Current Implementation Status

Lifecycle hooks have been implemented in **ALL tools** with complete `onInputStart`, `onInputDelta`, `onInputAvailable`, and `onOutput` hooks:

| Tool              | Hooks Implemented                                                 | Purpose                       |
| ----------------- | ----------------------------------------------------------------- | ----------------------------- |
| **All 40+ Tools** | ✅ `onInputStart`, `onInputDelta`, `onInputAvailable`, `onOutput` | Complete lifecycle monitoring |

**Complete Implementation**: All tools in `/src/mastra/tools/` now have full lifecycle hook coverage for enhanced observability, debugging, and analytics.

### Benefits

- **Enhanced Monitoring**: Track tool execution stages in real-time
- **Better Debugging**: Detailed logging for input processing and outputs
- **Analytics**: Collect usage patterns and performance metrics
- **Security**: Monitor authentication and authorization attempts
- **Observability**: Improved visibility into tool behavior

### Hook Generator Utility

A utility script is available to help generate standardized lifecycle hooks for new tools:

```bash
# Generate hooks for a new tool
node generate-hooks.js my-new-tool.ts myNewTool inputField1 inputField2

# Example output:
🔧 Generating lifecycle hooks for myNewTool

📋 Copy these hooks into your createTool definition:

onInputStart: ({ toolCallId, messages, abortSignal }) => {
  log.info('myNewTool tool input streaming started', {
    toolCallId,
    messageCount: messages.length,
    abortSignal: abortSignal?.aborted,
    hook: 'onInputStart'
  });
},
onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
  log.info('myNewTool received input chunk', {
    toolCallId,
    inputTextDelta,
    messageCount: messages.length,
    abortSignal: abortSignal?.aborted,
    hook: 'onInputDelta'
  });
},
onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
  log.info('myNewTool received input', {
    toolCallId,
    messageCount: messages.length,
    inputData: {
      inputField1: input.inputField1,
      inputField2: input.inputField2
    },
    abortSignal: abortSignal?.aborted,
    hook: 'onInputAvailable',
  });
},
onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
  log.info('myNewTool completed', {
    toolCallId,
    toolName,
    outputData: {
      // Add output fields here
    },
    abortSignal: abortSignal?.aborted,
    hook: 'onOutput'
  });
},
```

This ensures consistency across all tools and reduces boilerplate code.

## RequestContext Usage Patterns

All tools should define and use typed RequestContext interfaces to ensure type safety and clear documentation of expected context values. This pattern provides better IntelliSense, prevents runtime errors, and makes the tool's context requirements explicit.

### Interface Definition Pattern

```typescript
import type { RequestContext } from '@mastra/core/request-context'

export interface ToolNameContext extends RequestContext {
  userId?: string
  workspaceId?: string
  temperatureUnit?: 'celsius' | 'fahrenheit'
  maxRows?: number
  // Add other context properties as needed
}
```

### Usage in Tools

```typescript
export const exampleTool = createTool({
    id: 'example-tool',
    description: 'Example tool with typed RequestContext',
    inputSchema: z.object({
        param: z.string(),
    }),
    outputSchema: z.object({
        result: z.string(),
    }),
    execute: async (inputData, context) => {
        // Extract typed context
        const requestContext = context?.requestContext as ToolNameContext

        // Access context values with type safety
        const userId = requestContext?.userId
        const workspaceId = requestContext?.workspaceId
        const temperatureUnit = requestContext?.temperatureUnit ?? 'celsius'
        const maxRows = requestContext?.maxRows ?? 1000

        // Use context values in tool logic
        log.info('Tool executed with context', {
            userId,
            workspaceId,
            temperatureUnit,
            maxRows,
        })

        return { result: 'success' }
    },
})
```

### Benefits

- **Type Safety**: Prevents typos and ensures correct property access
- **Documentation**: Interface serves as living documentation of context requirements
- **IntelliSense**: Better IDE support and autocomplete
- **Runtime Safety**: Catches context usage errors at compile time
- **Consistency**: Standardized pattern across all tools

### Common Context Properties

- **`userId`** (`string`): Current user identifier for user-specific data filtering
- **`workspaceId`** (`string`): Workspace/organization ID for multi-tenant data isolation
- **`temperatureUnit`** (`'celsius' | 'fahrenheit'`): Temperature display preference for weather tools
- **`maxRows`** (`number`): Maximum result limit for data processing tools
- **`locale`** (`string`): User locale/language for internationalization
- **`permissions`** (`string[]`): User permission array for authorization checks

### Implementation Checklist

When adding RequestContext to a tool:

- [ ] Define interface extending `RequestContext`
- [ ] Include all context properties the tool uses
- [ ] Use optional properties (`?:`) for non-required context
- [ ] Cast context in execute function: `as ToolNameContext`
- [ ] Provide sensible defaults for optional properties
- [ ] Document context requirements in tool description if needed

## Testing

97% coverage via Vitest. Run:

```bash
npm test src/mastra/tools/tests  # All
npm test src/mastra/tools/tests/your-tool.test.ts  # Specific
npm run coverage  # Report
```

## Dependencies

From `package.json`: `@mastra/core`, `zod`, `serpapi`, `playwright`, `cheerio`, `unpdf`, `axios`, `@mastra/pg`, financial SDKs.

---

**Last updated:** 2025-12-15

## Related

- [Agents](../agents/AGENTS.md)
- [Workflows](../workflows/AGENTS.md)
- [Mastra Docs](https://docs.mastra.ai/core/tools)

## Changelog

| Version | Date       | Changes                                                                                                                                     |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.15.0  | 2025-12-15 | **COMPLETE**: All 40+ tools now have full lifecycle hooks (onInputStart, onInputDelta, onInputAvailable, onOutput) with abortSignal logging |
| 2.14.0  | 2025-12-15 | Extended Tool Lifecycle Hooks to 15 tools with onInputDelta + abortSignal: added arxiv, browser, serpapi-academic-local                     |
| 2.11.0  | 2025-12-15 | Extended Tool Lifecycle Hooks to 6 tools with onInputDelta + abortSignal: github.ts, serpapi-search, csv-to-json, json-to-csv               |
| 2.10.0  | 2025-12-15 | Extended Tool Lifecycle Hooks to 17 tools + added hook generator utility script                                                             |
| 2.9.0   | 2025-12-15 | Fixed writer progress messages and lifecycle hooks to properly display Input data in UI messages                                            |
| 2.8.0   | 2025-12-15 | Extended Tool Lifecycle Hooks to 14 tools: added polygon-tools, arxiv, browser-tool + fixed writer event formats                            |
| 2.7.0   | 2025-12-15 | Extended Tool Lifecycle Hooks to 11 tools with structured logging: added json-to-csv, serpapi-search, find-symbol                           |
| 2.6.0   | 2025-12-15 | Extended Tool Lifecycle Hooks to 8 tools: added alpha-vantage.tool.ts and fs.ts                                                             |
| 2.5.0   | 2025-12-15 | Added Tool Lifecycle Hooks documentation and implementation examples                                                                        |
| 2.4.0   | 2025-12-14 | Custom Agent nest events                                                                                                                    |
| 2.3.0   | 2025-11-28 | Added Financial Chart Tools: chartSupervisorTool, chartGeneratorTool, chartDataProcessorTool, chartTypeAdvisorTool                          |
| 2.2.0   | 2025-11-27 | Full 30+ tools catalogued w/ badges, categories (financial/RAG/web/document), tests status, relative links                                  |
| 2.1.0   | 2025-11-26 | Meta update, 30+ claim                                                                                                                      |
| 2.0.0   | 2025-11-16 | Reorg by categories                                                                                                                         |
