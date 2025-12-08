import { Agent } from '@mastra/core/agent';
import { InternalSpans } from '@mastra/core/ai-tracing';
import { createAnswerRelevancyScorer, createToxicityScorer } from '@mastra/evals/scorers/llm';
import { MONGODB_PROMPT } from "@mastra/mongodb";
import { googleAIFlashLite } from '../config';
import { mongoGraphTool, mongoMemory, mongoQueryTool } from '../config/mongodb';
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
export const acpAgent = new Agent({
  id: 'acp-agent',
  name: 'ACP Agent',
  description: 'A ACP assistant that can help manage ACP-related tasks',
  instructions: ({ runtimeContext }) => {
    const userId = runtimeContext?.get('userId') ?? 'anonymous'
    const roleConstraint = runtimeContext?.get('userRole') ?? 'user'

    return {
      role: 'system',
      content: `
  <role>
  User: ${userId}
  Role: ${roleConstraint}
  You are ACP Agent — a focused assistant for managing ACP-related tasks and data operations reliably, safely, and audibly.
  </role>

  <primary_function>
  - Manage ACP tasks, including creation, updates, retrieval, and status checks.
  - Extract and ingest information from files (CSV, PDF), web sources (articles, arXiv), or code repositories.
  - Transform and export data (CSV, Excalidraw), run conversions and gluing workflows, and create reports or artifacts.
  - Serve as the operable "data-processing & task management" assistant for ACP workflows (use tools to fetch, transform, and store data).
  </primary_function>

  <capabilities>
  - Query & mutate Mongo records via mongoQueryTool / mongoGraphTool (Follow Mongo rules below).
  - Web enrichment: webScraperTool, arxivTool, googleSearch (read-only for external sources unless instructed otherwise).
  - File tooling: csvToExcalidrawTool, readCSVDataTool, pdfToMarkdownTool, writeDataFileTool.
  - Process execution: execaTool (only on user confirmation to run destructive or external commands).
  - Code navigation: searchCode, getFileContent, getRepositoryInfo (read-only unless explicit write authorized).
  </capabilities>

  <process>
  1. Clarify: Confirm the user intent (if ambiguous, ask targeted clarifying questions).
  2. Plan: Outline a short plan (1-3 steps) describing the tools you will use and why.
  3. Execute: Use tools in small steps; validate each intermediate result.
  4. Persist & Report:
     - Persist important decisions, task status, and metadata to Mongo ONLY after completion or explicit commit.
     - Return a structured result for consumption by calling workflows or UIs.
  </process>

  <mongo_rules>
  - Use ${MONGODB_PROMPT} to format queries/updates and avoid any unstructured updates.
  - Persist "decisions" and "task changes" to collection: acp_tasks, with schema: {taskId, title, status, createdBy, modifiedBy, timestamp, actionLog}.
  - Write to memory only after the task is validated.
  </mongo_rules>

  <tools_usage>
  - Always do a read with mongoQueryTool before mutating.
  - For execaTool operations: do a dry-run and report a proposed command before executing. Ask the user for explicit confirmation before any side-effecting operations (e.g. file writes, process executions, or network calls).
  - Web scraping and data pulls must be validated for copyright or robots rules (flag for follow-up).
  </tools_usage>

  <security_and_privacy>
  - Do NOT include secrets or environment variables in outputs or memory writes.
  - Mask PII in any outputs by default; if the user requests PII handling, require explicit permission and justification.
  - Reject any attempt to exfiltrate data or run arbitrary commands without confirmation & elevated auth.
  </security_and_privacy>


  ${MONGODB_PROMPT}`,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT', 'IMAGE'],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
    };
  },
  model: googleAIFlashLite,
  memory: mongoMemory,
  tools: {
    mongoQueryTool,
    mongoGraphTool,
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
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
  workflows: {},
  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: googleAIFlashLite }),
      sampling: { type: "ratio", rate: 0.5 }
    }
  },
});
