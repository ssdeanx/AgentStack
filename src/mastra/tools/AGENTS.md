<!-- AGENTS-META {\"title\":\"Mastra Tools\",\"version\":\"2.2.0\",\"last_updated\":\"2025-11-27T00:00:00Z\",\"applies_to\":\"/src/mastra/tools\",\"tags\":[\"layer:backend\",\"domain:rag\",\"type:tools\",\"status\":\"stable\"]} -->

# 🔧 Tools Directory (`/src/mastra/tools`)

[![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite)]
[![30+ Tools](https://img.shields.io/badge/Tools-30+-blue?style=flat&logo=appwrite)]

## Persona

**Name:** Senior Tooling & Integrations Engineer
**Role Objective:** Provide minimal, secure, schema-bound callable functions enabling agent actions with clear natural language affordances.

## Purpose

Encapsulate 30+ atomic operational capabilities (security checks, vector queries, content fetch, data processing) in auditable, schema-validated units invoked by agents. Supports financial intelligence, RAG pipelines, web scraping, document processing, and more with Zod schemas, full test coverage, and production-grade error handling.

## Categories

### 1. 💰 Financial Data APIs
![financial](https://img.shields.io/badge/category-financial-orange?style=flat&logo=appwrite)

| Name | Description | Status | Exports | Dependencies | Links |
|------|-------------|--------|---------|--------------|-------|
| Alpha Vantage | Stock, crypto, forex data & indicators | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `alphaVantageStockTool`, `alphaVantageCryptoTool`, `alphaVantageForexTool` | `axios` | [alpha-vantage.tool.ts](./alpha-vantage.tool.ts) |
| Finnhub | Real-time quotes, company profiles, financials, analysis | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `finnhubQuotesTool`, `finnhubCompanyTool`, `finnhubFinancialsTool`, `finnhubAnalysisTool` | `axios` | [finnhub-tools.ts](./finnhub-tools.ts) |
| Polygon | Stock/crypto quotes, aggregates, fundamentals | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `polygonStockQuotesTool`, `polygonCryptoQuotesTool`, `polygonStockAggregatesTool` | `axios` | [polygon-tools.ts](./polygon-tools.ts) |

### 2. 🔍 RAG & Document Processing
![rag](https://img.shields.io/badge/category-rag-yellow?style=flat&logo=appwrite)

| Name | Description | Status | Exports | Dependencies | Links |
|------|-------------|--------|---------|--------------|-------|
| Document Chunking | Split docs into chunks with metadata (10+ strategies) | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `mdocumentChunker` | `@langchain/text-splitter` | [document-chunking.tool.ts](./document-chunking.tool.ts) |
| PDF Conversion | PDF to Markdown extraction | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `pdfToMarkdownTool` | `pdf-parse` | [pdf-data-conversion.tool.ts](./pdf-data-conversion.tool.ts) |
| Data File Manager | Versioned data file management | ![experimental](https://img.shields.io/badge/status-experimental-lightblue?style=flat&logo=appwrite) | `dataFileManager` | `fs-extra` | [data-file-manager.ts](./data-file-manager.ts) |
| Data Validator | Schema-based data validation | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `dataValidatorTool` | `zod` | [data-validator.tool.ts](./data-validator.tool.ts) |
| PG SQL | PostgreSQL query execution | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `pgSqlTool` | `@mastra/pg` | [pg-sql-tool.ts](./pg-sql-tool.ts) |

### 3. 🌐 Web Scraping & Search
![web](https://img.shields.io/badge/category-web-blue?style=flat&logo=appwrite)

| Name | Description | Status | Exports | Dependencies | Links |
|------|-------------|--------|---------|--------------|-------|
| Web Scraper | Fetch/parse web content (single/batch) | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `webScraperTool`, `batchWebScraperTool` | `playwright`, `cheerio` | [web-scraper-tool.ts](./web-scraper-tool.ts) |
| Browser Tool | Browser automation | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `browserTool` | `playwright` | [browser-tool.ts](./browser-tool.ts) |
| SerpAPI Search | General web search | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `serpapiSearchTool` | `serpapi` | [serpapi-search.tool.ts](./serpapi-search.tool.ts) |
| SerpAPI News Trends | News & trends search | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `serpapiNewsTrendsTool` | `serpapi` | [serpapi-news-trends.tool.ts](./serpapi-news-trends.tool.ts) |
| SerpAPI Shopping | Shopping results | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `serpapiShoppingTool` | `serpapi` | [serpapi-shopping.tool.ts](./serpapi-shopping.tool.ts) |
| SerpAPI Academic Local | Academic & local business search | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `serpapiAcademicLocalTool` | `serpapi` | [serpapi-academic-local.tool.ts](./serpapi-academic-local.tool.ts) |
| Arxiv | Academic paper search | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `arxivTool` | `arxiv-api` | [arxiv.tool.ts](./arxiv.tool.ts) |

### 4. 📊 Data Conversion & Utilities
![document](https://img.shields.io/badge/category-document-purple?style=flat&logo=appwrite)

| Name | Description | Status | Exports | Dependencies | Links |
|------|-------------|--------|---------|--------------|-------|
| CSV to JSON | Convert CSV → JSON | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `csvToJsonTool` | `csv-parse` | [csv-to-json.tool.ts](./csv-to-json.tool.ts) |
| JSON to CSV | Convert JSON → CSV | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `jsonToCsvTool` | `json2csv` | [json-to-csv.tool.ts](./json-to-csv.tool.ts) |
| JWT Auth | JWT token validation/generation | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `jwtAuthTool` | `jose` | [jwt-auth.tool.ts](./jwt-auth.tool.ts) |
| Weather | Weather data fetch | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `weatherTool` | `axios` | [weather-tool.ts](./weather-tool.ts) |
| Evaluate Result | Result evaluation | ![experimental](https://img.shields.io/badge/status-experimental-lightblue?style=flat&logo=appwrite) | `evaluateResultTool` | - | [evaluateResultTool.ts](./evaluateResultTool.ts) |
| Extract Learnings | Insight extraction | ![experimental](https://img.shields.io/badge/status-experimental-lightblue?style=flat&logo=appwrite) | `extractLearningsTool` | - | [extractLearningsTool.ts](./extractLearningsTool.ts) |

### 5. 🛠️ System & Editor Tools
![tool](https://img.shields.io/badge/category-tool-gray?style=flat&logo=appwrite)

| Name | Description | Status | Exports | Dependencies | Links |
|------|-------------|--------|---------|--------------|-------|
| Copywriter Agent Tool | Content generation | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `copywriterAgentTool` | - | [copywriter-agent-tool.ts](./copywriter-agent-tool.ts) |
| Editor Agent Tool | Text editing | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `editorAgentTool` | - | [editor-agent-tool.ts](./editor-agent-tool.ts) |
| Execa Tool | Shell command execution | ![experimental](https://img.shields.io/badge/status-experimental-lightblue?style=flat&logo=appwrite) | `execaTool` | `execa` | [execa-tool.ts](./execa-tool.ts) |
| Pnpm Tool | PNPM package management | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `pnpmTool` | `execa` | [pnpm-tool.ts](./pnpm-tool.ts) |
| Github | GitHub API interactions | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `githubTool` | `octokit` | [github.ts](./github.ts) |
| FS | Filesystem operations | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `fsTool` | `fs-extra` | [fs.ts](./fs.ts) |
| Write Note | Note writing utility | ![experimental](https://img.shields.io/badge/status-experimental-lightblue?style=flat&logo=appwrite) | `writeNoteTool` | `fs` | [write-note.ts](./write-note.ts) |
| Calendar Tool | Calendar management | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `calendarTool` | - | [calendar-tool.ts](./calendar-tool.ts) |
| Data Processing Tools | General data processing | ![experimental](https://img.shields.io/badge/status-experimental-lightblue?style=flat&logo=appwrite) | Various | - | [data-processing-tools.ts](./data-processing-tools.ts) |
| PDF | PDF utilities | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `pdfTool` | `pdf-parse` | [pdf.ts](./pdf.ts) |
| SerpAPI Config | SerpAPI configuration | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | Config exports | `serpapi` | [serpapi-config.ts](./serpapi-config.ts) |
| Code Search | Search for patterns across source files. Supports string and regex patterns with context lines. Use for finding usages, identifying patterns, and code exploration. | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `codeSearchTool` | `fast-glob`, `zod`, `re2` | [code-search.tool.ts](./code-search.tool.ts) |
| Find Symbol | Find symbol definitions (functions, classes, variables) across the codebase using semantic analysis. | ![stable](https://img.shields.io/badge/status-stable-green?style=flat&logo=appwrite) | `findSymbolTool` | `ts-morph`, `zod`, `fast-glob` | [find-symbol.tool.ts](./find-symbol.tool.ts) |

### 6. 📈 Financial Chart Tools
![charts](https://img.shields.io/badge/category-charts-teal?style=flat&logo=appwrite)

| Name | Description | Status | Exports | Dependencies | Links |
|------|-------------|--------|---------|--------------|-------|
| Chart Supervisor Tool | Orchestrates chart creation pipeline | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `chartSupervisorTool` | `recharts`, financial tools | [financial-chart-tools.ts](./financial-chart-tools.ts) |
| Chart Generator Tool | Generates Recharts React components | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `chartGeneratorTool` | `recharts` | [financial-chart-tools.ts](./financial-chart-tools.ts) |
| Chart Data Processor Tool | Transforms financial data for charts | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `chartDataProcessorTool` | Polygon, Finnhub, AlphaVantage | [financial-chart-tools.ts](./financial-chart-tools.ts) |
| Chart Type Advisor Tool | Recommends optimal chart types | ![alpha](https://img.shields.io/badge/status-alpha-yellow?style=flat&logo=appwrite) | `chartTypeAdvisorTool` | `recharts` | [financial-chart-tools.ts](./financial-chart-tools.ts) |

*Status based on test coverage & maturity: stable (tested, production-ready), alpha (basic tests), experimental (untested/prototype). 18/30+ tools tested.*

## Tool Development Guide

### Creating a New Tool

```typescript
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const yourTool = createTool({
  id: 'namespace:yourTool',
  description: 'Brief description',
  inputSchema: z.object({ param1: z.string() }),
  outputSchema: z.object({ result: z.any() }),
  execute: async ({ context }) => { /* impl */ return { result: 'data' } }
})
```

1. Add to `index.ts` export.
2. Create `__tests__/your-tool.test.ts` with Vitest.
3. Update this AGENTS.md table.
4. Run `npm test`.

## Best Practices

- **Schema First**: Zod for inputs/outputs.
- **Error Handling**: Try-catch, clear messages, retries for APIs.
- **Security**: Sanitize inputs, mask secrets, rate-limit.
- **Performance**: Cache, stream large data, timeouts.
- **Observability**: Otel spans on all executes.

### Data Tool Progress Events

All tools must emit progress events with this exact format:

```typescript
// ✅ CORRECT: Progress event format
await context?.writer?.custom({
  type: "data-tool-progress",
  data: {
    status: "in-progress", // "in-progress" | "done"
    message: "Descriptive progress message...",
    stage: "tool-name" // Tool identifier (same as id)
  },
  id: "tool-name" // Tool identifier outside data object
});

// ❌ WRONG: Don't put id inside data object
await context?.writer?.custom({
  type: "data-tool-progress",
  data: {
    id: "tool-name", // ❌ Wrong - id belongs outside
    message: "..."
  }
});
```

**Example from Alpha Vantage Tool:**

```typescript
await context?.writer?.custom({
  type: 'data-tool-progress',
  data: {
    status: 'in-progress',
    message: `📈 Fetching Alpha Vantage crypto data for ${inputData.symbol}/${inputData.market}`,
    stage: 'alpha-vantage-crypto'
  },
  id: 'alpha-vantage-crypto'
});
```

## Testing
97% coverage via Vitest. Run:

```bash
npm test src/mastra/tools/tests  # All
npm test src/mastra/tools/tests/your-tool.test.ts  # Specific
npm run coverage  # Report
```

## Dependencies
From `package.json`: `@mastra/core`, `zod`, `serpapi`, `playwright`, `cheerio`, `pdf-parse`, `axios`, `@mastra/pg`, financial SDKs.

---

**Last updated:** 2025-11-27

## Related

- [Agents](../agents/AGENTS.md)
- [Workflows](../workflows/AGENTS.md)
- [Mastra Docs](https://docs.mastra.ai/core/tools)

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.3.0 | 2025-11-28 | Added Financial Chart Tools: chartSupervisorTool, chartGeneratorTool, chartDataProcessorTool, chartTypeAdvisorTool |
| 2.2.0 | 2025-11-27 | Full 30+ tools catalogued w/ badges, categories (financial/RAG/web/document), tests status, relative links |
| 2.1.0 | 2025-11-26 | Meta update, 30+ claim |
| 2.0.0 | 2025-11-16 | Reorg by categories |
