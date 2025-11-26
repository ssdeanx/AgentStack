import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { chatRoute, workflowRoute, networkRoute } from "@mastra/ai-sdk";
import {
  CloudExporter,
  DefaultExporter,
  SamplingStrategyType,
  SensitiveDataFilter,
} from "@mastra/core/ai-tracing";
import { ArizeExporter } from "@mastra/arize";

// Config
import { pgVector } from './config/pg-storage';
import { log } from './config/logger';

// Scorers
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';
import { responseQualityScorer, taskCompletionScorer } from './scorers/custom-scorers';

// MCP
import { a2aCoordinatorMcpServer } from './mcp';
import { notes } from './mcp/server';

// A2A Coordinator
import { a2aCoordinatorAgent } from './a2a/a2aCoordinatorAgent';

// Core Agents
import { weatherAgent } from './agents/weather-agent';
import { csvToExcalidrawAgent } from './agents/csv_to_excalidraw';
import { imageToCsvAgent } from './agents/image_to_csv';
import { excalidrawValidatorAgent } from './agents/excalidraw_validator';
import { reportAgent } from './agents/reportAgent';
import { learningExtractionAgent } from './agents/learningExtractionAgent';
import { evaluationAgent } from './agents/evaluationAgent';
import { researchAgent } from './agents/researchAgent';
import { editorAgent } from './agents/editorAgent';
import { copywriterAgent } from './agents/copywriterAgent';
import { contentStrategistAgent } from './agents/contentStrategistAgent';
import { scriptWriterAgent } from './agents/scriptWriterAgent';
import { stockAnalysisAgent } from './agents/stockAnalysisAgent';

// CSV/Data Pipeline Agents
import { dataExportAgent } from './agents/dataExportAgent';
import { dataIngestionAgent } from './agents/dataIngestionAgent';
import { dataTransformationAgent } from './agents/dataTransformationAgent';

// Research & Document Processing Agents
import { researchPaperAgent } from './agents/researchPaperAgent';
import { documentProcessingAgent } from './agents/documentProcessingAgent';
import { knowledgeIndexingAgent } from './agents/knowledgeIndexingAgent';

// Utility Agents
import { daneNewContributor } from './workflows/new-contributor';

// Networks
import { agentNetwork, dataPipelineNetwork, reportGenerationNetwork, researchPipelineNetwork } from './networks';

// Workflows
import { weatherWorkflow } from './workflows/weather-workflow';
import { contentStudioWorkflow } from './workflows/content-studio-workflow';
import { changelogWorkflow } from './workflows/changelog';
import { contentReviewWorkflow } from './workflows/content-review-workflow';
import { documentProcessingWorkflow } from './workflows/document-processing-workflow';
import { financialReportWorkflow } from './workflows/financial-report-workflow';
import { learningExtractionWorkflow } from './workflows/learning-extraction-workflow';
import { researchSynthesisWorkflow } from './workflows/research-synthesis-workflow';
import { stockAnalysisWorkflow } from './workflows/stock-analysis-workflow';
import { telephoneGameWorkflow } from './workflows/telephone-game';
import { acpAgent } from './agents/acpAgent';
import { dane, daneChangeLog, daneCommitMessage, daneIssueLabeler, daneLinkChecker } from './agents/dane';

export const mastra = new Mastra({
  workflows: {
    weatherWorkflow,
    contentStudioWorkflow,
    changelogWorkflow,
    contentReviewWorkflow,
    documentProcessingWorkflow,
    financialReportWorkflow,
    learningExtractionWorkflow,
    researchSynthesisWorkflow,
    stockAnalysisWorkflow,
    telephoneGameWorkflow,
  },
  agents: {
    // Core Agents
    weatherAgent,
    a2aCoordinatorAgent,
    csvToExcalidrawAgent,
    imageToCsvAgent,
    copywriterAgent,
    editorAgent,
    excalidrawValidatorAgent,
    reportAgent,
    learningExtractionAgent,
    evaluationAgent,
    researchAgent,
    contentStrategistAgent,
    scriptWriterAgent,
    stockAnalysisAgent,
    daneNewContributor,
    // CSV/Data Pipeline Agents
    dataExportAgent,
    dataIngestionAgent,
    dataTransformationAgent,
    // Research & Document Processing Agents
    researchPaperAgent,
    documentProcessingAgent,
    knowledgeIndexingAgent,
    // Networks (Agent-based routing)
    agentNetwork,
    dataPipelineNetwork,
    reportGenerationNetwork,
    researchPipelineNetwork,
    acpAgent,
    daneCommitMessage,
    daneIssueLabeler,
    daneLinkChecker,
    daneChangeLog,
    dane
  },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer, responseQualityScorer, taskCompletionScorer },
  mcpServers: { a2aCoordinator: a2aCoordinatorMcpServer, notes },
  storage: new LibSQLStore({
    url: "file:./mastra.db",
  }),
  vectors: { pgVector },
  logger: log,
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: true,
  },
  observability: {
    configs: {
      default: {
        serviceName: "mastra",
        sampling: { type: SamplingStrategyType.ALWAYS },
        processors: [new SensitiveDataFilter()],
        exporters: [new CloudExporter(
          { logger: log, logLevel: 'debug' }),
          new ArizeExporter({
            endpoint: process.env.PHOENIX_ENDPOINT!,
            apiKey: process.env.PHOENIX_API_KEY,
            projectName: process.env.PHOENIX_PROJECT_NAME,
          }), new DefaultExporter(
            {
              maxBatchSize: 100,
              maxBufferSize: 500,
              maxBatchWaitMs: 700,
              maxRetries: 3,
              retryDelayMs: 500,
              strategy: 'batch-with-updates'
            }
          )],
      },
    },
  },
  server: {
    apiRoutes: [
      chatRoute({
        path: "/chat",
        agent: "weatherAgent, a2aCoordinator, csvToExcalidrawAgent, imageToCsvAgent, excalidrawValidatorAgent, reportAgent, learningExtractionAgent, evaluationAgent, researchAgent, copywriterAgent, editorAgent, agentNetwork, contentStrategistAgent, scriptWriterAgent, dataExportAgent, dataIngestionAgent, dataTransformationAgent, researchPaperAgent, documentProcessingAgent, knowledgeIndexingAgent, stockAnalysisAgent, daneNewContributor",
        defaultOptions: {},
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      workflowRoute({
        path: "/workflow",
        workflow: "weatherWorkflow, contentStudioWorkflow, changelogWorkflow, contentReviewWorkflow, documentProcessingWorkflow, financialReportWorkflow, learningExtractionWorkflow, researchSynthesisWorkflow, stockAnalysisWorkflow, telephoneGameWorkflow",
      }),
      networkRoute({
        path: "/network",
        agent: "agentNetwork, dataPipelineNetwork, reportGenerationNetwork, researchPipelineNetwork",
        defaultOptions: {
          format: 'aisdk'
        },
      }),
    ]
  },
  bundler: {
    externals: ["playwright-core"],
  }
});

log.info("Mastra instance created");
