
import { chatRoute, networkRoute, workflowRoute } from "@mastra/ai-sdk";
import {
  DefaultExporter,
  SamplingStrategyType,
  SensitiveDataFilter
} from "@mastra/core/ai-tracing";
import { Mastra } from '@mastra/core/mastra';
import { PostgresStore } from "@mastra/pg";
import { LangfuseExporter } from "./config/tracing";
// Config
import { log } from './config/logger';
import { pgVector } from './config/pg-storage';

// Scorers
import { responseQualityScorer, taskCompletionScorer } from './scorers/custom-scorers';
import { completenessScorer, toolCallAppropriatenessScorer, translationScorer } from './scorers/weather-scorer';

// MCP
import { a2aCoordinatorMcpServer } from './mcp';
import { notesMCP } from './mcp/server';

// A2A Coordinator
import { a2aCoordinatorAgent } from './a2a/a2aCoordinatorAgent';

// Core Agents
import { contentStrategistAgent } from './agents/contentStrategistAgent';
import { copywriterAgent } from './agents/copywriterAgent';
import { csvToExcalidrawAgent } from './agents/csv_to_excalidraw';
import { editorAgent } from './agents/editorAgent';
import { evaluationAgent } from './agents/evaluationAgent';
import { excalidrawValidatorAgent } from './agents/excalidraw_validator';
import { imageToCsvAgent } from './agents/image_to_csv';
import { learningExtractionAgent } from './agents/learningExtractionAgent';
import { reportAgent } from './agents/reportAgent';
import { researchAgent } from './agents/researchAgent';
import { scriptWriterAgent } from './agents/scriptWriterAgent';
import { stockAnalysisAgent } from './agents/stockAnalysisAgent';
import { weatherAgent } from './agents/weather-agent';

// CSV/Data Pipeline Agents
import { dataExportAgent } from './agents/dataExportAgent';
import { dataIngestionAgent } from './agents/dataIngestionAgent';
import { dataTransformationAgent } from './agents/dataTransformationAgent';

// Research & Document Processing Agents
import { documentProcessingAgent } from './agents/documentProcessingAgent';
import { knowledgeIndexingAgent } from './agents/knowledgeIndexingAgent';
import { researchPaperAgent } from './agents/researchPaperAgent';

// Utility Agents
import { daneNewContributor } from './workflows/new-contributor';

// Financial Chart Agents
import {
  chartDataProcessorAgent,
  chartGeneratorAgent,
  chartSupervisorAgent,
  chartTypeAdvisorAgent,
} from './agents/recharts';

// Networks
import { agentNetwork, dataPipelineNetwork, reportGenerationNetwork, researchPipelineNetwork } from './networks';

// Workflows
import { trace } from "@opentelemetry/api";
import { acpAgent } from './agents/acpAgent';
import { dane, daneChangeLog, daneCommitMessage, daneIssueLabeler, daneLinkChecker } from './agents/dane';
import { changelogWorkflow } from './workflows/changelog';
import { contentReviewWorkflow } from './workflows/content-review-workflow';
import { contentStudioWorkflow } from './workflows/content-studio-workflow';
import { documentProcessingWorkflow } from './workflows/document-processing-workflow';
import { financialReportWorkflow } from './workflows/financial-report-workflow';
import { learningExtractionWorkflow } from './workflows/learning-extraction-workflow';
import { researchSynthesisWorkflow } from './workflows/research-synthesis-workflow';
import { stockAnalysisWorkflow } from './workflows/stock-analysis-workflow';
import { telephoneGameWorkflow } from './workflows/telephone-game';
import { weatherWorkflow } from './workflows/weather-workflow';


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
    dane,
    // Financial Chart Agents
    chartTypeAdvisorAgent,
    chartDataProcessorAgent,
    chartGeneratorAgent,
    chartSupervisorAgent,
  },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer, responseQualityScorer, taskCompletionScorer },
  mcpServers: { a2aCoordinator: a2aCoordinatorMcpServer, notes: notesMCP },
  storage: new PostgresStore({
    // Connection configuration
    connectionString:
      process.env.SUPABASE ??
      'postgresql://user:password@localhost:5432/mydb',
    // Schema management
    schemaName: process.env.DB_SCHEMA ?? 'mastra',
  }),
  vectors: { pgVector },
  logger: log,
  //  telemetry: {
  // Telemetry is deprecated and will be removed in the Nov 4th release
  //    enabled: true,
  //  },
  observability: {
    default: { enabled: true },
    configs: {
      default: {
        serviceName: "AgentStack",
        sampling: { type: SamplingStrategyType.ALWAYS },
        processors: [new SensitiveDataFilter(
          {
            sensitiveFields: ['api-key', 'authorization', 'password', 'token',
              'secret', 'key', 'bearer', 'bearertoken', 'jwt', 'credential', 'clientsecret', 'privatekey', 'refresh', 'email', 'phone', 'address', 'ssn'],
            redactionToken: '[REDACTED]',
            redactionStyle: 'partial'
          }
        )],
        exporters: [
          new LangfuseExporter({
            publicKey: process.env.LANGFUSE_PUBLIC_KEY,
            secretKey: process.env.LANGFUSE_SECRET_KEY,
            baseUrl: process.env.LANGFUSE_BASE_URL,
            logger: log,
            options: {
              tracer: trace.getTracer("AgentStack"),
            }
          }),
          //          new CloudExporter({
          //            logger: log,
          //                logLevel: 'debug',
          //          }),

          new DefaultExporter(
            {
              maxBatchSize: 100,
              maxBufferSize: 500,
              maxBatchWaitMs: 75,
              maxRetries: 3,
              retryDelayMs: 500,
              strategy: 'batch-with-updates',
            }
          )],
      },
    }
  },
  server: {
    apiRoutes: [
      chatRoute({
        path: "/chat",
        agent: "weatherAgent, a2aCoordinatorAgent, csvToExcalidrawAgent, imageToCsvAgent, excalidrawValidatorAgent, reportAgent, learningExtractionAgent, evaluationAgent, researchAgent, copywriterAgent, editorAgent, agentNetwork, contentStrategistAgent, scriptWriterAgent, dataExportAgent, dataIngestionAgent, dataTransformationAgent, researchPaperAgent, documentProcessingAgent, knowledgeIndexingAgent, stockAnalysisAgent, daneNewContributor, chartTypeAdvisorAgent, chartDataProcessorAgent, chartGeneratorAgent, chartSupervisorAgent",
        defaultOptions: {
          maxSteps: 50,
          includeRawChunks: true,
          telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
            functionId: "chat-api",
            metadata: {
              route: "/chat",
              project: "AgentStack",
              environment: process.env.NODE_ENV ?? "development",
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              timestamp: new Date().toISOString(),
            },
          },
        },
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
      }),
    ],
    middleware: [
      async (c, next) => {
        const runtimeContext = c.get("runtimeContext");

        if (c.req.method === "POST") {
          try {
            const clonedReq = c.req.raw.clone();
            const body = await clonedReq.json();

            if (body?.data) {
              for (const [key, value] of Object.entries(body.data)) {
                runtimeContext.set(key, value);
              }
            }
          } catch {
            log.error("Failed to parse request body for middleware");
          }
        }
        await next();
      },
    ],
  }
});

log.info("Mastra instance created");
