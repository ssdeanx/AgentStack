import { Agent } from '@mastra/core/agent';
import { googleAIFlashLite, pgMemory, pgQueryTool } from '../config';
import { arxivTool } from '../tools/arxiv.tool';
import { csvToJsonTool } from '../tools/csv-to-json.tool';
import { createDataDirTool, getDataFileInfoTool, listDataDirTool, moveDataFileTool, searchDataFilesTool, writeDataFileTool } from '../tools/data-file-manager';
import { convertDataFormatTool, csvToExcalidrawTool, readCSVDataTool } from '../tools/data-processing-tools';
import { mdocumentChunker } from '../tools/document-chunking.tool';
import { evaluateResultTool } from '../tools/evaluateResultTool';
import { execaTool } from '../tools/execa-tool';
import { extractLearningsTool } from '../tools/extractLearningsTool';
import { getFileContent, getRepositoryInfo, listRepositories, searchCode } from '../tools/github';
import { jsonToCsvTool } from '../tools/json-to-csv.tool';
import { pdfToMarkdownTool } from '../tools/pdf-data-conversion.tool';
import { batchWebScraperTool, contentCleanerTool, htmlToMarkdownTool, linkExtractorTool, webScraperTool } from '../tools/web-scraper-tool';
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import type { RequestContext } from '@mastra/core/request-context';
import { PGVECTOR_PROMPT } from '@mastra/pg';
import { TokenLimiterProcessor } from '@mastra/core/processors';

export interface ACPContext {
    userId?: string
    userRole?: string
}

export const acpAgent = new Agent({
  id: 'acpAgent',
  name: 'ACP Agent',
  description: 'A ACP assistant that can help manage ACP-related tasks',
  instructions: ({ requestContext }: { requestContext: RequestContext<ACPContext> }) => {
    const userId = requestContext.get('userId') ?? 'anonymous'
    const roleConstraint = requestContext.get('userRole') ?? 'user'

    return {
      role: 'system',
      content: `
# ACP Agent
User: ${userId} | Role: ${roleConstraint}

## Core Responsibilities
- **Manage Tasks**: Create, update, and track ACP-related tasks.
- **Data Ops**: Ingest (CSV, PDF, Web, Repo), transform (Excalidraw, JSON), and export data.
- **Persistence**: Use 'pgQueryTool' for Mongo-like operations with ${PGVECTOR_PROMPT}.

## Process
1. **Plan**: Outline 1-3 steps with tool rationale.
2. **Execute**: Small steps; validate results.
3. **Report**: Structured results; persist to 'acp_tasks' collection.

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
- **Security**: Mask PII; no secrets in logs; confirm destructive 'execaTool' calls.
- **Validation**: Read before mutate; validate web scraping rules.
`,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
    };
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  tools: {
  pgQueryTool,
    webScraperTool,
    linkExtractorTool,
    htmlToMarkdownTool,
    contentCleanerTool,
    batchWebScraperTool,
    mdocumentChunker,
    evaluateResultTool,
    extractLearningsTool,
    arxivTool,
    pdfToMarkdownTool,
    jsonToCsvTool,
    csvToJsonTool,
    csvToExcalidrawTool,
    readCSVDataTool,
    convertDataFormatTool,
    writeDataFileTool,
    listDataDirTool,
    searchDataFilesTool,
    moveDataFileTool,
    getDataFileInfoTool,
    createDataDirTool,
    execaTool,
    searchCode,
    getFileContent,
    getRepositoryInfo,
    listRepositories
    //	...supermemoryTools(process.env.SUPERMEMORY_API_KEY ?? '', {
    //		containerTags: ['acp-agent']
    //	}),
  },
  outputProcessors: [new TokenLimiterProcessor(128576)],
  workflows: {},
  scorers: {

  },
});
