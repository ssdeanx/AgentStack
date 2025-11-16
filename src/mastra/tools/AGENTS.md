<!-- AGENTS-META {"title":"Mastra Tools","version":"2.0.0","last_updated":"2025-11-16T01:55:00Z","applies_to":"/src/mastra/tools","tags":["layer:backend","domain:rag","type:tools","status":"stable"]} -->

# Tools Directory (`/src/mastra/tools`)

## Persona

**Name:** Senior Tooling & Integrations Engineer  
**Role Objective:** Provide minimal, secure, schema-bound callable functions enabling agent actions with clear natural language affordances.

## Purpose

Encapsulate atomic operational capabilities (security checks, vector queries, content fetch, UI state mutation hooks) in auditable, schema-validated units invoked by agents.

## Tool Categories

### 1. Web Scraping & Content Extraction

| Tool File | Export | Purpose | Dependencies |
|-----------|--------|---------|--------------|
| `web-scraper-tool.ts` | `webScraperTool`, `batchWebScraperTool` | Fetch and parse web content | `playwright`, `cheerio` |
| `siteMapExtractor.ts` | `siteMapExtractorTool` | Extract URLs from sitemaps | `fast-xml-parser` |
| `linkExtractor.ts` | `linkExtractorTool` | Extract links from HTML content | `cheerio` |
| `htmlToMarkdownTool.ts` | `htmlToMarkdownTool` | Convert HTML to clean Markdown | `turndown` |
| `contentCleanerTool.ts` | `contentCleanerTool` | Clean and normalize extracted content | - |

### 2. Document Processing

| Tool File | Export | Purpose | Dependencies |
|-----------|--------|---------|--------------|
| `document-chunking.tool.ts` | `mdocumentChunker` | Split documents into chunks with metadata | `langchain/text-splitter` |
| `pdf-data-conversion.tool.ts` | `pdfToMarkdownTool` | Convert PDFs to Markdown | `pdf-parse` |
| `data-file-manager.ts` | `dataFileManager` | Manage data files with versioning | `fs-extra` |

### 3. Financial Data APIs

#### Alpha Vantage

- **File**: `alpha-vantage.tool.ts`
- **Tools**:
  - `alphaVantageStockTool`: Stock market data
  - `alphaVantageCryptoTool`: Cryptocurrency data
  - `alphaVantageForexTool`: Foreign exchange rates
- **Requirements**: `ALPHA_VANTAGE_API_KEY`

#### Finnhub

- **File**: `finnhub-tools.ts`
- **Tools**:
  - `finnhubQuotesTool`: Real-time quotes
  - `finnhubCompanyTool`: Company profiles
  - `finnhubFinancialsTool`: Financial statements
  - `finnhubAnalysisTool`: Market analysis
- **Requirements**: `FINNHUB_API_KEY`

#### Polygon.io

- **File**: `polygon-tools.ts`
- **Tools**:
  - `polygonStockQuotesTool`: Stock quotes
  - `polygonCryptoQuotesTool`: Crypto quotes
  - `polygonStockAggregatesTool`: Historical aggregates
- **Requirements**: `POLYGON_API_KEY`

### 4. Research & Academic

| Tool File | Export | Purpose | Dependencies |
|-----------|--------|---------|--------------|
| `arxiv.tool.ts` | `arxivTool` | Search academic papers | `arxiv-api` |
| `evaluateResultTool.ts` | `evaluateResultTool` | Evaluate search results | - |
| `extractLearningsTool.ts` | `extractLearningsTool` | Extract insights from content | - |

### 5. Data Conversion & Validation

| Tool File | Export | Purpose | Dependencies |
|-----------|--------|---------|--------------|
| `csv-to-json.tool.ts` | `csvToJsonTool` | Convert CSV to JSON | `csv-parse` |
| `json-to-csv.tool.ts` | `jsonToCsvTool` | Convert JSON to CSV | `json2csv` |
| `data-validator.tool.ts` | `dataValidatorTool` | Validate data against schema | `zod` |

## Tool Development

### Creating a New Tool

1. **Define the Tool**

   ```typescript
   // src/mastra/tools/your-tool.ts
   import { createTool } from '@mastra/core/tools'
   import { z } from 'zod'

   export const yourTool = createTool({
     id: 'namespace:yourTool',
     description: 'Brief description of what this tool does',
     inputSchema: z.object({
       // Define your input schema using zod
       param1: z.string().describe('Description of parameter 1'),
       param2: z.number().optional()
     }),
     outputSchema: z.object({
       // Define your output schema
       result: z.any()
     }),
     execute: async ({ input, context }) => {
       // Your implementation here
       return { result: 'your result' }
     }
   })
   ```

2. **Add Tests**
   Create a test file in `src/mastra/tools/__tests__/your-tool.test.ts`

3. **Documentation**
   - Add your tool to the appropriate section in this file
   - Include example usage and any requirements

## Best Practices

1. **Error Handling**
   - Always validate inputs using the schema
   - Provide clear error messages
   - Handle rate limiting and API errors gracefully

2. **Performance**
   - Cache responses when appropriate
   - Implement timeouts for external API calls
   - Use streaming for large data processing

3. **Security**
   - Never expose API keys or sensitive data
   - Sanitize all inputs and outputs
   - Implement proper access controls

## Testing Tools

Run tool tests:

```bash
# Run all tool tests
npm test src/mastra/tools/__tests__

# Run a specific tool's tests
npm test src/mastra/tools/__tests__/your-tool.test.ts
```

## Dependencies

- `@mastra/core`: Core tooling utilities
- `zod`: Schema validation
- `axios`: HTTP client
- Various API SDKs for specific services

---
Last updated: 2025-11-16

## Related Documentation

- [Agents Documentation](../agents/AGENTS.md)
- [Configuration Guide](../config/README.md)
- [Mastra Core Documentation](https://docs.mastra.ai/core/tools)

## Change Log

| Version | Date (UTC) | Changes |
|---------|------------|---------|
| 2.0.0   | 2025-11-16 | Complete reorganization of tools documentation. Added detailed sections for Web Scraping, Document Processing, Financial Data APIs, and Research tools. |
| 1.4.0   | 2025-10-18 | Added alpha-vantage, arxiv, finnhub, polygon, and starter-agent tools |
| 1.3.0   | 2025-10-18 | Added pdf-data-conversion.tool.ts for PDF processing |
| 1.2.0   | 2025-10-17 | Added SerpAPI integration tools for web search, news, shopping, academic, and local business queries |
| 1.0.0   | 2025-09-24 | Standardized template applied; legacy content preserved |
