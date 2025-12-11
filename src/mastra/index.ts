
import { chatRoute, networkRoute, workflowRoute } from "@mastra/ai-sdk";
import {
  DefaultExporter,
  SamplingStrategyType,
  SensitiveDataFilter,
  Observability
} from "@mastra/observability";
import { Mastra } from '@mastra/core';
import { PostgresStore } from "@mastra/pg";
import { OtelExporter } from "@mastra/otel-exporter";
import { LangfuseExporter } from "@mastra/langfuse";
// Config
import { log } from './config/logger';
import { pgVector } from './config/pg-storage';

// Scorers
import { responseQualityScorer, taskCompletionScorer } from './scorers/custom-scorers';
import { translationScorer } from './scorers/weather-scorer';

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

// Image Processing Agents
import { imageAgent } from './agents/image';

// Networks
import { agentNetwork, dataPipelineNetwork, reportGenerationNetwork, researchPipelineNetwork, codingTeamNetwork } from './networks';

// Coding Team
import { codeArchitectAgent, codeReviewerAgent, testEngineerAgent, refactoringAgent } from './agents/codingAgents';
import { codingA2ACoordinator } from './a2a/codingA2ACoordinator';

// Workflows
import { trace } from "@opentelemetry/api";
import { acpAgent } from './agents/acpAgent';
import { businessStrategyAgent, complianceMonitoringAgent, contractAnalysisAgent, legalResearchAgent } from "./agents/businessLegalAgents";
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
import { repoIngestionWorkflow } from './workflows/repo-ingestion-workflow';
import { specGenerationWorkflow } from './workflows/spec-generation-workflow';
import { ResearchRuntimeContext } from './agents/index';

const ml = process.env.MLFLOW_EXPERIMENT_ID

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
    repoIngestionWorkflow,
    specGenerationWorkflow,
  },
  agents: {
    // Core Agents
    weatherAgent,
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
    // Utility Agents
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
    // Business Legal Agents
    legalResearchAgent,
    businessStrategyAgent,
    complianceMonitoringAgent,
    contractAnalysisAgent,
    // Image Processing Agents
    imageAgent,
    // Coding Team Agents
    codeArchitectAgent,
    codeReviewerAgent,
    testEngineerAgent,
    refactoringAgent,

    // Networks (Agent-based routing)
    agentNetwork,
    dataPipelineNetwork,
    reportGenerationNetwork,
    researchPipelineNetwork,
    codingTeamNetwork,

    // A2A Agents (Coordinator)
    a2aCoordinatorAgent,
    codingA2ACoordinator,
  },
  scorers: { translationScorer, responseQualityScorer, taskCompletionScorer },
  mcpServers: { a2aCoordinator: a2aCoordinatorMcpServer, notes: notesMCP },

  storage: new PostgresStore({
    id: 'mastra-storage',
    // Connection configuration
    connectionString:
      process.env.SUPABASE ??
      'postgresql://user:password@localhost:5432/mydb',
    // Schema management
    schemaName: process.env.DB_SCHEMA ?? 'mastra',
  }),
  vectors: { pgVector },
  logger: log,
  observability: new Observability({
    default: { enabled: false },
    configs: {
      otel: {
        serviceName: "maestra-app",
        exporters: [new OtelExporter({
          provider: {
            custom: {
              // Specify tracking server URI with the `/v1/traces` path.
              endpoint: process.env.MLFLOW_TRACKING_URI ?? "http://localhost:5000/api/2.0/mlflow/tracking/v1/traces",
              // Set the MLflow experiment ID in the header.
              headers: { "x-mlflow-experiment-id": process.env.MLFLOW_EXPERIMENT_ID ?? "", api_key: process.env.DATABRICKS_TOKEN ?? "" },
              // MLflow support HTTP/Protobuf protocol.
              protocol: "http/protobuf"
            }
          }
        })]
      },
      langfuse: {
        serviceName: "ai",
        requestContextKeys: ["userId", "environment", "tenantId"],
        //sampling: { type: SamplingStrategyType.ALWAYS },
        spanOutputProcessors: [new SensitiveDataFilter(
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
              tracer: trace.getTracer("ai"),
            },
            logLevel: 'info',
          }),
          ],
      },
    }
  }),
  server: {
    apiRoutes: [
      workflowRoute({
        path: "/workflow/:workflowId",
        includeTextStreamParts: true,
      }),
      networkRoute({
        path: "/network/:agentId",
        defaultOptions: {
          memory: {
            thread: {
              id: 'network',
              resourceId: 'network',
              metadata: { agentId: ':agentId' }
            },
            resource: "network",
            options: {
              lastMessages: 500,
              semanticRecall: true,
              workingMemory: { enabled: true },
              threads: { generateTitle: true }
            }
          },
          maxSteps: 200,
          includeRawChunks: true,
        }
      }),
      chatRoute({
        path: "/chat/:agentId",
        defaultOptions: {
          memory: {
            thread: {
              id: ':agentIdChat',
              resourceId: 'chat',
              metadata: { agent: ':agentId' }
            },
            resource: "chat",
            options:
              { lastMessages: 500, semanticRecall: true, workingMemory: { enabled: true, }, threads: { generateTitle: true } },
            readOnly: false,
          },
          maxSteps: 50,
          includeRawChunks: true,
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/chat/weatherAgent",
        agent: "weatherAgent",
        defaultOptions: {
          memory: {
            thread: {
              id: "weatherAgentChat",
              resourceId: 'chat',
              metadata: { agent: 'weatherAgent' }
            },
            resource: "chat",
            options:
              { lastMessages: 500, semanticRecall: true, workingMemory: { enabled: true, }, threads: { generateTitle: true } },
            readOnly: false,
          },
          maxSteps: 50,
          includeRawChunks: true,
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/custom/researchAgent",
        agent: "researchAgent",
        defaultOptions: {
          memory: {
            thread: {
              id: "researchAgentChat",
              resourceId: 'chat',
              metadata: { agent: 'researchAgent' }
            },
            resource: "chat",
            options:
              { lastMessages: 500, semanticRecall: true, workingMemory: { enabled: true, }, threads: { generateTitle: true } },
            readOnly: false,
          },
          maxSteps: 50,
          includeRawChunks: true,
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/chat/reportAgent",
        agent: "reportAgent",
        defaultOptions: {
          memory: {
            thread: {
              id: 'reportAgentChat',
              resourceId: 'chat',
            },
            resource: "chat",
            options:
              { semanticRecall: true, workingMemory: { enabled: true, } }
          },
          maxSteps: 50,
          includeRawChunks: true,
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/chat/excalidrawValidatorAgent",
        agent: "excalidrawValidatorAgent",
        defaultOptions: {
          memory: {
            thread: {
              id: 'chat',
              resourceId: 'chat',
            },
            resource: "chat",
            options:
              { semanticRecall: true, workingMemory: { enabled: true, } }
          },
          maxSteps: 50,
          includeRawChunks: true,
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/chat/editorAgent",
        agent: "editorAgent",
        defaultOptions: {
          memory: {
            thread: {
              id: 'chat',
              resourceId: 'chat',
            },
            resource: "chat",
            options:
              { semanticRecall: true, workingMemory: { enabled: true, } }
          },
          maxSteps: 50,
          includeRawChunks: true,
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/chat/copywriterAgent",
        agent: "copywriterAgent",
        defaultOptions: {
          memory: {
            thread: {
              id: 'chat',
              resourceId: 'chat',
            },
            resource: "chat",
            options:
              { semanticRecall: true, workingMemory: { enabled: true, } }
          },
          maxSteps: 50,
          includeRawChunks: true,
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/chat/scriptWriterAgent",
        agent: "scriptWriterAgent",
        defaultOptions: {
          memory: {
            thread: {
              id: 'chat',
              resourceId: 'chat',
            },
            resource: "chat",
            options:
              { semanticRecall: true, workingMemory: { enabled: true, } }
          },
          maxSteps: 50,
          includeRawChunks: true,
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/chat/knowledgeIndexingAgent",
        agent: "knowledgeIndexingAgent",
        defaultOptions: {
          memory: {
            thread: {
              id: 'chat',
              resourceId: 'chat',
            },
            resource: "chat",
            options:
              { semanticRecall: true, workingMemory: { enabled: true, } }
          },
          maxSteps: 50,
          includeRawChunks: true,
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/chat/documentProcessingAgent",
        agent: "documentProcessingAgent",
        defaultOptions: {
          memory: {
            thread: {
              id: 'chat',
              resourceId: 'chat',
            },
            resource: "network",
            options:
              { semanticRecall: true, workingMemory: { enabled: true, } }
          },
          maxSteps: 50,
          includeRawChunks: true,
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
    ],
//    cors: {
//      origin: ["*"], // Allow specific origins or '*' for all
//      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//      allowHeaders: ["Content-Type", "Authorization"],
//      exposeHeaders: ["Content-Length", "X-Requested-With"],
//      credentials: false,
//    },
//    middleware: [
      // Middleware to extract data from the request body
//      async (c, next) => {
//        const runtimeContext = c.get("runtimeContext");
//
//        if (c.req.method === "POST") {
//          try {
//            const clonedReq = c.req.raw.clone();
///            const body = await clonedReq.json();
//
            // Ensure body and body.data are objects before using them
//            if (body !== null && typeof body === 'object' && body.data !== null && typeof body.data === 'object') {
//              const data = body.data as Record<string, unknown>;
//              for (const [key, value] of Object.entries(data)) {
//                runtimeContext.set(key, value);
//              }
//            }
//          } catch {
//            log.error("Failed to parse request body for middleware");
//          }
//        }
//        await next();
//      },
//0          ],
    }
});

log.info("Mastra instance created");
