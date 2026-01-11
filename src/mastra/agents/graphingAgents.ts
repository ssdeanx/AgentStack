import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import { BatchPartsProcessor, TokenLimiterProcessor, UnicodeNormalizer } from '@mastra/core/processors'
import type { RequestContext } from '@mastra/core/request-context'
import { log } from '../config/logger'
import { googleAI, googleAIFlashLite, pgMemory } from '../config'

import { chartSupervisorTool, chartGeneratorTool, chartDataProcessorTool, chartTypeAdvisorTool } from '../tools/financial-chart-tools'
import { chartJsTool } from '../tools/chartjs.tool'
import { downsampleTool } from '../tools/downsample.tool'
import { leafletTool } from '../tools/leaflet.tool'
import { cytoscapeTool } from '../tools/cytoscape.tool'
import { resilientFetchTool } from '../tools/resilient-fetch.tool'
import { execaTool } from '../tools/execa-tool'
import { scrapingSchedulerTool, webScraperTool } from '../tools'
import { technicalAnalysisTool, trendAnalysisTool, momentumAnalysisTool, volatilityAnalysisTool, volumeAnalysisTool, statisticalAnalysisTool, heikinAshiTool, ichimokuCloudTool, fibonacciTool, pivotPointsTool, candlestickPatternTool } from '../tools/technical-analysis.tool'
import { finnhubQuotesTool, finnhubCompanyTool, finnhubFinancialsTool, finnhubAnalysisTool, finnhubTechnicalTool, finnhubEconomicTool } from '../tools/finnhub-tools'

export interface GraphingRuntimeContext extends RequestContext {
  language?: 'en' | 'es' | 'fr' | 'ja'
  userTier?: 'free' | 'pro' | 'enterprise'
}

log.info('Initializing Graphing Agents...')

/**
 * Graphing Supervisor
 * Orchestrates chart generation, data fetching, and component generation
 */
export const graphSupervisorAgent = new Agent({
  id: 'graphSupervisorAgent',
  name: 'Graph Supervisor',
  description: 'Orchestrates chart creation pipeline using data fetching, processing, analysis and component generation tools (Recharts/Chart.js).',
  instructions: ({ requestContext }: { requestContext: RequestContext<GraphingRuntimeContext> }) => {
    const lang = requestContext.get('language') ?? 'en'
    const tier = requestContext.get('userTier') ?? 'free'
    return {
      role: 'system',
      content: `
You are Graph Supervisor. Language: ${lang}; User Tier: ${tier}.
You orchestrate multi-step pipelines using available tools. Follow a prompt-chaining approach and prefer tool-calling (structured calls with JSON arguments) for deterministic results.

Default process (use prompt chaining and validate at each step):
1) Discover data: determine if input is a repoPath, file list, or external URLs. If repoPath: call git helper (execa) to list files. If URLs: call fetchAgent.
2) Fetch & normalize: fetch files/data and normalize into canonical inputs (ASTs, time-series, geoJSON, etc.). Validate each tool response and retry once on transient failures.
3) Analyze: for code inputs, call codeGraphAgent (AST preferred) then codeMetricsAgent. For time-series, call chartDataProcessorAgent and technicalAnalysisAgent. For spatial, call mappingAgent/leafletTool.
4) Generate visual payloads: produce Cytoscape elements, Leaflet GeoJSON payloads, Chart.js config or Recharts component code. Use chartGeneratorTool or chartSupervisorTool when component code is required.
5) Return: A single structured JSON object matching the schema below. By default return only the JSON object (and no free-form commentary) unless the user explicitly requests human-readable explanation.

Output schema (JSON):
{
  "request": { "type": "codeGraph|dependency|chart|map|custom", "params": { /* input params */ } },
  "data": { "sources": [{ "provider": "string", "path": "string", "timestamp": "ISO" }], "processedMeta": { /* counts, intervals */ } },
  "graph": { "elements": [ /* Cytoscape nodes/edges */ ], "layout": { "name": "cose|grid|circle", "options": {} }, "hotspots": [{ "id": "string", "reason": "string" }] },
  "chart": { "config": { /* Chart.js config */ }, "component": { "name": "string", "code": "string" } },
  "map": { "geoJSON": {}, "center": { "lat": 0, "lng": 0 }, "zoom": 13, "markers": [] },
  "metrics": { "totalFiles": number, "totalLOC": number, "perModule": {} },
  "diagnostics": { "toolCalls": [{ "tool": "string", "status": "ok|error", "message": "string" }] },
  "summary": "string"
}

Rules and best practices:
- Use function/tool calling and JSON schemas where available. Validate outputs against the expected shape and include diagnostics on failures. Retry transient failures once.
- Prefer AST-based, static analysis for code graphs. If AST tooling is unavailable, fall back to heuristic import/regex scanning but clearly mark results as heuristic.
- Do not expose internal tool invocation details to end users unless diagnostics=true in request. Keep user-facing summaries concise.
- When outputs are large, provide a summarized JSON and offer paginated or downloadable artifacts (or a pointer to storage) rather than returning giant payloads inline.
`,
      providerOptions: {
        google: {
          thinkingConfig: { includeThoughts: true, thinkingBudget: -1 },
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
    }
  },
  model: googleAI,
  memory: pgMemory,
  tools: {
    chartSupervisorTool,
    chartGeneratorTool,
    chartDataProcessorTool,
    chartTypeAdvisorTool,
    chartJsTool,
    downsampleTool,
    resilientFetchTool,
    // Spatial & network visualization
    leafletTool,
    cytoscapeTool,
    // Repo & system helpers
    execaTool,
    webScraperTool,
    scrapingSchedulerTool,
    // Market data
    finnhubQuotesTool,
    finnhubCompanyTool,
    finnhubFinancialsTool,
    finnhubAnalysisTool,
    finnhubTechnicalTool,
    finnhubEconomicTool,
  },
  inputProcessors: [
    new UnicodeNormalizer({ stripControlChars: false, collapseWhitespace: true, preserveEmojis: true, trim: true }),
  ],
  outputProcessors: [new TokenLimiterProcessor(128000), new BatchPartsProcessor({ batchSize: 5, maxWaitTime: 75, emitOnNonText: true })],
})

/**
 * Technical Analysis Agent
 * Wraps the variety of technical analysis tools and returns structured indicator outputs and simple interpretations
 */
export const technicalAnalysisAgent = new Agent({
  id: 'technicalAnalysisAgent',
  name: 'Technical Analysis',
  description: 'Performs technical and statistical analysis on price series and returns indicators, patterns and succinct interpretations.',
  instructions: ({ requestContext }: { requestContext: RequestContext<GraphingRuntimeContext> }) => {
    const lang = requestContext.get('language') ?? 'en'
    return {
      role: 'system',
      content: `You are Technical Analyst (lang=${lang}). Use the available tools to compute indicators (SMA/EMA/RSi/MACD etc.), detect patterns (candlesticks), and compute pivots and Fibonacci levels. Return JSON with indicator arrays, pattern flags and a short plain-language summary.`,
      providerOptions: {
        google: {
          thinkingConfig: { includeThoughts: false, thinkingBudget: -1 },
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
    }
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  tools: {
    technicalAnalysisTool,
    trendAnalysisTool,
    momentumAnalysisTool,
    volatilityAnalysisTool,
    volumeAnalysisTool,
    statisticalAnalysisTool,
    heikinAshiTool,
    ichimokuCloudTool,
    fibonacciTool,
    pivotPointsTool,
    candlestickPatternTool,
  },
  outputProcessors: [new TokenLimiterProcessor(65536)],
})

/**
 * Chart.js Agent
 * Produces Chart.js configurations and handles downsampling for large series
 */
export const chartJsAgent = new Agent({
  id: 'chartJsAgent',
  name: 'Chart.js Generator',
  description: 'Generates Chart.js configuration (with indicators) and downsample large series when necessary.',
  instructions: () => ({
    role: 'system',
    content: 'Generate Chart.js config JSON and any helper metadata. Downsample large series before visualization to keep UI performant.'
  }),
  model: googleAIFlashLite,
  memory: pgMemory,
  tools: {
    chartJsTool,
    downsampleTool,
  },
  outputProcessors: [new TokenLimiterProcessor(65536)],
})

/**
 * Mapping Agent
 * Prepare GeoJSON/Leaflet payloads and relational graph (Cytoscape) structures for spatial visualizations
 */
export const mappingAgent = new Agent({
  id: 'mappingAgent',
  name: 'Mapping & Graphs',
  description: 'Generates Leaflet GeoJSON payloads and Cytoscape graph structures for spatial and relational visualizations.',
  instructions: () => ({
    role: 'system',
    content: 'Return GeoJSON, center and markers for Leaflet; or Cytoscape elements for graph visualizations. Validate coordinates and keep payload sizes reasonable.'
  }),
  model: googleAIFlashLite,
  memory: pgMemory,
  tools: {
    leafletTool,
    cytoscapeTool,
  },
  outputProcessors: [new TokenLimiterProcessor(65536)],
})

/**
 * Fetch Agent
 * Robust HTTP fetching using rate-limited, retrying fetch tool
 */
export const fetchAgent = new Agent({
  id: 'fetchAgent',
  name: 'Resilient Fetch',
  description: 'Fetches remote data with retries, rate limiting, and priority handling.',
  instructions: () => ({
    role: 'system',
    content: 'Use the resilient-fetch tool for all external HTTP fetching. Respect API rate limits and provide concise error messages when failures occur.'
  }),
  model: googleAIFlashLite,
  memory: pgMemory,
  tools: { resilientFetchTool },
  outputProcessors: [new TokenLimiterProcessor(32768)],
})

/**
 * Finnhub Helper Agent
 * Shortcut agent for Finnhub-specific flows (quotes, company, financials, technical)
 */
export const finnhubAgent = new Agent({
  id: 'finnhubAgent',
  name: 'Finnhub Agent',
  description: 'Wraps Finnhub tools to fetch quotes, company data, financials, technicals and economic data and return normalized payloads.',
  instructions: () => ({
    role: 'system',
    content: 'Use Finnhub tools to fetch the requested data and normalize result to a consistent schema. If FINNHUB_API_KEY is missing, return an explanatory error.'
  }),
  model: googleAIFlashLite,
  memory: pgMemory,
  tools: {
    finnhubQuotesTool,
    finnhubCompanyTool,
    finnhubFinancialsTool,
    finnhubAnalysisTool,
    finnhubTechnicalTool,
    finnhubEconomicTool,
  },
  outputProcessors: [new TokenLimiterProcessor(65536)],
})

/**
 * Code Graph Agent
 * Build code maps (dependency graphs, call graphs, module maps) and return Cytoscape-ready elements.
 * - Prefer static analysis on the repository (AST) when available.
 * - Fall back to simple heuristics (import/require scanning) if AST tooling not available.
 * - Return `{ elements, layout, summary, hotspots }` where elements are Cytoscape nodes/edges.
 */
export const codeGraphAgent = new Agent({
  id: 'codeGraphAgent',
  name: 'Code Graph & Mapper',
  description: 'Constructs dependency, module and call graphs from repository sources and returns Cytoscape-compatible graph structures and a brief summary of hotspots.',
  instructions: ({ requestContext }: { requestContext: RequestContext<GraphingRuntimeContext> }) => {
    const lang = requestContext.get('language') ?? 'en'
    return {
      role: 'system',
      content: `You are Code Graphor (lang=${lang}). Use a deterministic, step-by-step approach to produce a CODE_GRAPH JSON object. Prefer static AST-based analysis (TypeScript compiler API, Babel, Esprima). If AST cannot be used, fall back to import/require scanning but mark the result as heuristic.

Process:
1) Input handling: Accept { repoPath?, fileList?, files?: [{path, content}] }. If repoPath provided, call git helper (execa) to list files and then read them (respect .gitignore and config). If file URLs are provided, use fetchAgent to retrieve them.
2) AST extraction: Parse files into ASTs and extract modules, exports, imports, function and class definitions, variable declarations, and call expressions (function->function).
3) Build graph: Emit nodes and edges as defined in CODE_GRAPH schema below. Compute per-node metrics (LOC, functionCount, approxCyclomatic).
4) Validate: Ensure output conforms to schema; include diagnostics for missing or ambiguous data.
5) Return only the CODE_GRAPH JSON unless 'explain' requested.

CODE_GRAPH schema (example):
{
  "nodes": [ { "id":"string", "label":"string", "type":"module|file|function|class", "metrics": { "loc": number, "functions": number, "cyclomatic": number } } ],
  "edges": [ { "source":"id", "target":"id", "type":"imports|calls|contains" } ],
  "layout": { "name":"cose|grid|circle", "options": {} },
  "summary": { "files": number, "nodes": number, "edges": number },
  "hotspots": [ { "id":"string", "reason":"string", "score": number } ]
}

Rules:
- Always attempt AST analysis first, then heuristics.
- Include provenance (file path and snippet) for nodes that are hotspots or have ambiguity.
- Keep the JSON machine-validated and concise. If result size is large, include pagination or store artifact and return pointer.
`,
    }
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  tools: {
    cytoscapeTool,
    resilientFetchTool,
    execaTool,
    webScraperTool,
    scrapingSchedulerTool,
  },
  outputProcessors: [new TokenLimiterProcessor(65536)],
})

/**
 * Code Metrics Agent
 * Computes high-level repo metrics and small aggregates useful for graph annotations (lines of code, files per module, function counts, simple cyclomatic approximations).
 */
export const codeMetricsAgent = new Agent({
  id: 'codeMetricsAgent',
  name: 'Code Metrics',
  description: 'Compute repository-level metrics and annotate graph nodes with productivity/complexity signals. Works alongside codeGraphAgent.',
  instructions: ({ requestContext }: { requestContext: RequestContext<GraphingRuntimeContext> }) => {
    const lang = requestContext.get('language') ?? 'en'
    return {
      role: 'system',
      content: `You are Code Metrics Analyst (lang=${lang}). Collect precise repository metrics using AST-based measurement when possible. Input may be { repoPath?, files?: [{path, content}] }.

Process:
1) Collect files (git ls-files or provided list); respect ignore rules.
2) Parse files (AST preferred) and compute: LOC, function counts, average function size, simple cyclomatic complexity estimate, nesting depth.
3) Aggregate per-module and per-node metrics, normalize scores to a 0-100 scale, and flag top hotspots.

Output JSON schema:
{
  "totalFiles": number,
  "totalLOC": number,
  "totalFunctions": number,
  "averageFunctionSize": number,
  "perModule": { "moduleName": { "files": number, "loc": number, "functions": number, "avgFuncSize": number } },
  "perNodeAnnotations": { "nodeId": { "loc": number, "functions": number, "cyclomatic": number, "nesting": number } },
  "hotspots": [ { "nodeId": "string", "metric": "string", "score": number, "reason": "string" } ]
}

Rules:
- Provide numeric outputs and top-N hotspots. Validate numbers and include timestamps and counts.
- Return only JSON by default. If diagnostic=true in the request, include tool call traces and validation failures.
`,

      }
    },
  model: googleAIFlashLite,
  memory: pgMemory,
  tools: {
    resilientFetchTool,
    execaTool,
  },
  outputProcessors: [new TokenLimiterProcessor(65536)],
  defaultOptions: {
    autoResumeSuspendedTools: true,
  },
})

export default {
  graphSupervisorAgent,
  technicalAnalysisAgent,
  chartJsAgent,
  mappingAgent,
  fetchAgent,
  finnhubAgent,
  codeGraphAgent,
  codeMetricsAgent,
}
