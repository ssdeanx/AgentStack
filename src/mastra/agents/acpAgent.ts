import { Agent } from '@mastra/core/agent';
import { InternalSpans } from '@mastra/core/ai-tracing';
import { supermemoryTools } from "@supermemory/tools/ai-sdk";
import { googleAIFlashLite, pgMemory } from '../config';
import { browserTool, clickAndExtractTool, extractTablesTool, fillFormTool, googleSearch, monitorPageTool, pdfGeneratorTool, screenshotTool } from '../tools/browser-tool';
import { mongoGraphTool, mongoMemory, mongoQueryTool } from '../config/mongodb';
import { MONGODB_PROMPT } from "@mastra/mongodb";
import { batchWebScraperTool, contentCleanerTool, htmlToMarkdownTool, linkExtractorTool, siteMapExtractorTool, webScraperTool } from '../tools/web-scraper-tool';
import { mdocumentChunker } from '../tools/document-chunking.tool';
import { evaluateResultTool } from '../tools/evaluateResultTool';
import { extractLearningsTool } from '../tools/extractLearningsTool';
import { arxivTool } from '../tools/arxiv.tool';
import { pdfToMarkdownTool } from '../tools/pdf-data-conversion.tool';
import { jsonToCsvTool } from '../tools/json-to-csv.tool';
import { csvToJsonTool } from '../tools/csv-to-json.tool';
import { convertDataFormatTool, csvToExcalidrawTool, readCSVDataTool } from '../tools/data-processing-tools';
import { createDataDirTool, getDataFileInfoTool, listDataDirTool, moveDataFileTool, searchDataFilesTool, writeDataFileTool } from '../tools/data-file-manager';
import { execaTool } from '../tools/execa-tool';
import { getFileContent, getRepositoryInfo, listRepositories, searchCode } from '../tools/github';
import { createAnswerRelevancyScorer, createToxicityScorer } from '@mastra/evals/scorers/llm';
import { creativityScorer, researchCompletenessScorer, responseQualityScorer, sourceDiversityScorer, summaryQualityScorer, taskCompletionScorer } from '../scorers/custom-scorers';
import { structureScorer } from '../scorers/structure.scorer';

export const acpAgent = new Agent({
  id: 'acp-agent',
  name: 'ACP Agent',
  description: 'A ACP assistant that can help manage ACP-related tasks',
  instructions: ({ runtimeContext }) => {
    const userId = runtimeContext?.get('userId');
    return {
      role: 'system',
      content: `You are a helpful ACP assistant. You help users manage their ACP-related tasks efficiently.

Your capabilities:
-

${MONGODB_PROMPT}

Current user: ${userId ?? 'anonymous'}`,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: 'low',
            includeThoughts: true,
            thinkingBudget: -1,
          },
          media_resolution: "MEDIA_RESOLUTION_MEDIUM",
          maxOutputTokens: 64000,
        },
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
      },
      safety: {
        scorer: createToxicityScorer({ model: googleAIFlashLite }),
        sampling: { type: "ratio", rate: 0.3 }
      },
      sourceDiversity: {
        scorer: sourceDiversityScorer,
        sampling: { type: "ratio", rate: 0.5 }
      },
      researchCompleteness: {
        scorer: researchCompletenessScorer,
        sampling: { type: "ratio", rate: 0.7 }
      },
      summaryQuality: {
        scorer: summaryQualityScorer,
        sampling: { type: "ratio", rate: 0.6 }
      },
      structure: {
            scorer: structureScorer,
            sampling: { type: 'ratio', rate: 1.0 },
      },
      creativity: {
            scorer: creativityScorer,
            sampling: { type: 'ratio', rate: 1.0 },
      },
      responseQuality: {
            scorer: responseQualityScorer,
            sampling: { type: 'ratio', rate: 0.8 },
      },
      taskCompletion: {
            scorer: taskCompletionScorer,
            sampling: { type: 'ratio', rate: 0.7 },
      },
    },
});
