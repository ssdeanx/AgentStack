
import { chatRoute, networkRoute, workflowRoute } from "@mastra/ai-sdk";
import {
  DefaultExporter,
  SamplingStrategyType,
  SensitiveDataFilter
} from "@mastra/core/ai-tracing";
import { Mastra } from '@mastra/core/mastra';
import { PostgresStore } from "@mastra/pg";
import { LangfuseExporter } from "@mastra/langfuse";
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
    codingTeamNetwork,

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
    codingA2ACoordinator,
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
      langfuse: {
        serviceName: "ai",
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
              tracer: trace.getTracer("ai"),
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
        agent: "weatherAgent",
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
          telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
            functionId: "chat-api",
          },
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/chat",
        agent: "researchAgent",
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
          telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
            functionId: "chat-api",
          },
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/chat",
        agent: "reportAgent",
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
          telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
            functionId: "chat-api",
          },
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/chat",
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
          telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
            functionId: "chat-api",
          },
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/chat",
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
          telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
            functionId: "chat-api",
          },
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/chat",
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
          telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
            functionId: "chat-api",
          },
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/chat",
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
          telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
            functionId: "chat-api",
          },
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/chat",
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
          telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
            functionId: "chat-api",
          },
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      chatRoute({
        path: "/chat",
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
          telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
            functionId: "chat-api",
          },
        },
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      workflowRoute({
        path: "/workflow",
        workflow: "weatherWorkflow",
        includeTextStreamParts: true,
      }),
      workflowRoute({
        path: "/workflow",
        workflow: "contentStudioWorkflow",
        includeTextStreamParts: true,
      }),
      workflowRoute({
        path: "/workflow",
        workflow: "changelogWorkflow",
        includeTextStreamParts: true,
      }),
      workflowRoute({
        path: "/workflow",
        workflow: "contentReviewWorkflow",
        includeTextStreamParts: true,
      }),
      workflowRoute({
        path: "/workflow",
        workflow: "documentProcessingWorkflow",
        includeTextStreamParts: true,
      }),
      workflowRoute({
        path: "/workflow",
        workflow: "financialReportWorkflow",
        includeTextStreamParts: true,
      }),
      workflowRoute({
        path: "/workflow",
        workflow: "learningExtractionWorkflow",
        includeTextStreamParts: true,
      }),
      workflowRoute({
        path: "/workflow",
        workflow: "researchSynthesisWorkflow",
        includeTextStreamParts: true,
      }),
      workflowRoute({
        path: "/workflow",
        workflow: "stockAnalysisWorkflow",
        includeTextStreamParts: true,
      }),
      workflowRoute({
        path: "/workflow",
        workflow: "telephoneGameWorkflow",
        includeTextStreamParts: true,
      }),
      workflowRoute({
        path: "/workflow",
        workflow: "repoIngestionWorkflow",

      }),
      workflowRoute({
        path: "/workflow",
        workflow: "specGenerationWorkflow",

      }),
      networkRoute({
        path: "/network",
        agent: "agentNetwork",
        defaultOptions: {
          memory: {
            thread: {
              id: 'network',
              resourceId: 'network',
            },
            resource: "network",
            options:
              { lastMessages: 500,  semanticRecall: true, workingMemory: { enabled: true, }, threads: { generateTitle: true,  } }
          },
          maxSteps: 200,
          telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
          },
          includeRawChunks: true,
          savePerStep: true,
        }
      }),
       networkRoute({
        path: "/network",
        agent: "dataPipelineNetwork",
        defaultOptions: {
          memory: {
            thread: {
              id: 'network',
              resourceId: 'network',
            },
            resource: "network",
            options:
              { lastMessages: 500,  semanticRecall: true, workingMemory: { enabled: true, }, threads: { generateTitle: true,  } }
          },
          maxSteps: 200,
          telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
          },
          includeRawChunks: true,
          savePerStep: true,
        }
      }),
       networkRoute({
        path: "/network",
        agent: "reportGenerationNetwork",
        defaultOptions: {
          memory: {
            thread: {
              id: 'network',
              resourceId: 'network',
            },
            resource: "network",
            options:
              { lastMessages: 500,  semanticRecall: true, workingMemory: { enabled: true, }, threads: { generateTitle: true,  } }
          },
          maxSteps: 200,
          telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
          },
          includeRawChunks: true
        }
      }),
       networkRoute({
        path: "/network",
        agent: "researchPipelineNetwork",
        defaultOptions: {
          memory: {
            thread: {
              id: 'network',
              resourceId: 'network',
            },
            resource: "network",
           options:
              { lastMessages: 500,  semanticRecall: true, workingMemory: { enabled: true, }, threads: { generateTitle: true,  } }
          },
          maxSteps: 200,
          telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
          }
        }
      }),
       networkRoute({
        path: "/network",
        agent: "codingTeamNetwork",
        defaultOptions: {
          memory: {
            thread: {
              id: 'coding-network',
              resourceId: 'coding-network',
            },
            resource: "coding-network",
            options:
              { lastMessages: 500,  semanticRecall: true, workingMemory: { enabled: true, }, threads: { generateTitle: true,  } }
          },
          maxSteps: 200,
          telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
          },
          includeRawChunks: true,
          savePerStep: true,
        }
      }),
    ],
    cors: {
      origin: ["*"], // Allow specific origins or '*' for all
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: false,
    },
    middleware: [
      async (c, next) => {
        const runtimeContext = c.get("runtimeContext");

        if (c.req.method === "POST") {
          try {
            const clonedReq = c.req.raw.clone();
            const body = await clonedReq.json();

            // Ensure body and body.data are objects before using them
            if (body !== null && typeof body === 'object' && body.data !== null && typeof body.data === 'object') {
              const data = body.data as Record<string, unknown>;
              for (const [key, value] of Object.entries(data)) {
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
