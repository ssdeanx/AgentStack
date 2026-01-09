import { chatRoute, networkRoute, workflowRoute } from '@mastra/ai-sdk'
import { Mastra } from '@mastra/core'
import { Observability, SamplingStrategyType, SensitiveDataFilter } from '@mastra/observability'
import { OtelExporter } from '@mastra/otel-exporter'
import { PostgresStore } from '@mastra/pg'
// Config
import { log } from './config/logger'
import { pgVector } from './config/pg-storage'

// Scorers

// MCP
import { a2aCoordinatorMcpServer, codingA2AMcpServer } from './mcp'
import { notesMCP } from './mcp/server'

// A2A Coordinator
import { a2aCoordinatorAgent } from './a2a/a2aCoordinatorAgent'

// Core Agents
import { contentStrategistAgent } from './agents/contentStrategistAgent'
import { copywriterAgent } from './agents/copywriterAgent'
import { csvToExcalidrawAgent } from './agents/csv_to_excalidraw'
import { editorAgent } from './agents/editorAgent'
import { evaluationAgent } from './agents/evaluationAgent'
import { excalidrawValidatorAgent } from './agents/excalidraw_validator'
import { imageToCsvAgent } from './agents/image_to_csv'
import { learningExtractionAgent } from './agents/learningExtractionAgent'
import { reportAgent } from './agents/reportAgent'
import { researchAgent } from './agents/researchAgent'
import { scriptWriterAgent } from './agents/scriptWriterAgent'
import { stockAnalysisAgent } from './agents/stockAnalysisAgent'
import { weatherAgent } from './agents/weather-agent'

// CSV/Data Pipeline Agents
import { dataExportAgent } from './agents/dataExportAgent'
import { dataIngestionAgent } from './agents/dataIngestionAgent'
import { dataTransformationAgent } from './agents/dataTransformationAgent'

// Research & Document Processing Agents
import { documentProcessingAgent } from './agents/documentProcessingAgent'
import { knowledgeIndexingAgent } from './agents/knowledgeIndexingAgent'
import { researchPaperAgent } from './agents/researchPaperAgent'

// Utility Agents
import { bgColorAgent } from './agents/bgColorAgent'
import { calendarAgent } from './agents/calendarAgent'
import { noteTakerAgent } from './agents/noteTakerAgent'
import { danePackagePublisher } from './agents/package-publisher'
import { daneNewContributor } from './workflows/new-contributor'

// Financial Chart Agents
import {
  chartDataProcessorAgent,
  chartGeneratorAgent,
  chartSupervisorAgent,
  chartTypeAdvisorAgent,
} from './agents/recharts'

// Image Processing Agents
import { imageAgent } from './agents/image'

// Networks
import {
  agentNetwork,
  businessIntelligenceNetwork,
  codingTeamNetwork,
  contentCreationNetwork,
  dataPipelineNetwork,
  devopsNetwork,
  financialIntelligenceNetwork,
  learningNetwork,
  marketingAutomationNetwork,
  reportGenerationNetwork,
  researchPipelineNetwork,
  securityNetwork,
} from './networks'

// Coding Team
import { codingA2ACoordinator } from './a2a/codingA2ACoordinator'
import {
  codeArchitectAgent,
  codeReviewerAgent,
  refactoringAgent,
  testEngineerAgent,
} from './agents/codingAgents'

// Workflows
import type { RequestContext } from '@mastra/core/request-context'
import { acpAgent } from './agents/acpAgent'
import {
  businessStrategyAgent,
  complianceMonitoringAgent,
  contractAnalysisAgent,
  legalResearchAgent,
} from './agents/businessLegalAgents'
import {
  dane,
  daneChangeLog,
  daneCommitMessage,
  daneIssueLabeler,
  daneLinkChecker,
} from './agents/dane'
import { marketingCampaignWorkflow } from './workflows'
import { automatedReportingWorkflow } from './workflows/automated-reporting-workflow'
import { changelogWorkflow } from './workflows/changelog'
import { contentReviewWorkflow } from './workflows/content-review-workflow'
import { contentStudioWorkflow } from './workflows/content-studio-workflow'
import { dataAnalysisWorkflow } from './workflows/data-analysis-workflow'
import { documentProcessingWorkflow } from './workflows/document-processing-workflow'
import { financialReportWorkflow } from './workflows/financial-report-workflow'
import { governedRagIndex } from './workflows/governed-rag-index.workflow'
import { learningExtractionWorkflow } from './workflows/learning-extraction-workflow'
import { repoIngestionWorkflow } from './workflows/repo-ingestion-workflow'
import { researchSynthesisWorkflow } from './workflows/research-synthesis-workflow'
import { specGenerationWorkflow } from './workflows/spec-generation-workflow'
import { stockAnalysisWorkflow } from './workflows/stock-analysis-workflow'
import { telephoneGameWorkflow } from './workflows/telephone-game'
import { weatherWorkflow } from './workflows/weather-workflow'
import { OtelBridge } from "@mastra/otel-bridge";
import { DefaultExporter } from "@mastra/observability";
import type { SpanOptions } from '@opentelemetry/api';
import { trace } from '@opentelemetry/api'
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
    governedRagIndex,
    marketingCampaignWorkflow,
    dataAnalysisWorkflow,
    automatedReportingWorkflow,
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
    // Calendar and misc
    calendarAgent,
    bgColorAgent,
    // Package publisher
    danePackagePublisher,
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

    // Note Taker Agent
    noteTakerAgent,

    // Networks (Agent-based routing)
    agentNetwork,
    dataPipelineNetwork,
    reportGenerationNetwork,
    researchPipelineNetwork,
    codingTeamNetwork,
    contentCreationNetwork,
    financialIntelligenceNetwork,
    learningNetwork,
    marketingAutomationNetwork,
    devopsNetwork,
    businessIntelligenceNetwork,
    securityNetwork,

    // A2A Agents (Coordinator)
    a2aCoordinatorAgent,
    codingA2ACoordinator,
  },
  scorers: {},
  mcpServers: { a2aCoordinator: a2aCoordinatorMcpServer, notes: notesMCP, codingA2A: codingA2AMcpServer },

  storage: new PostgresStore({
    id: 'main-storage',
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

    configs: {
      default: {
        serviceName: "ai",

        sampling: { type: SamplingStrategyType.RATIO, probability: 0.5 }, // 50% sampling
        requestContextKeys: ["userId", "environment", "tenantId"],
        spanOutputProcessors: [
          new SensitiveDataFilter(
            {
              sensitiveFields: [
              // Default fields
              "password",
              "token",
              "secret",
              "key",
              "apikey",
              // Custom fields for your application
              "creditCard",
              "bankAccount",
              "routingNumber",
              "email",
              "phoneNumber",
              "dateOfBirth",
            ],
            // Custom redaction token
            redactionToken: "***SENSITIVE***",
            // Redaction style
            redactionStyle: "full", // or 'partial'
            }
          ), // Redacts sensitive fields before export
        ],
        exporters: [
          new DefaultExporter(
            {
              logger: log,
              logLevel: 'info',
//              strategy: 'realtime',
//              maxBatchSize: 500,
//              maxBufferSize: 1000,
//              maxBatchWaitMs: 6000,
              maxRetries: 5,
            }
          ), // Studio access0
        ],
        includeInternalSpans: true,

        bridge: new OtelBridge(
          {
            name: "mastra-otel-bridge",
//            otelTracer: {
//              startSpan: (name: string, options: SpanOptions | undefined) => {
//                const tracer = trace.getTracer("mastra-otel-bridge-tracer");
//                return tracer.startSpan(name, options);
//              },
//            },
            logger: log,
            logLevel: 'info',
//            batchsize: 500,
            timeout: 50000,
            serializationOptions: {
              maxStringLength: 1024,   // Maximum length for string values (default: 1024)
              maxDepth: 6,            // Maximum depth for nested objects (default: 6)
              maxArrayLength: 50,     // Maximum number of items in arrays (default: 50)
              maxObjectKeys: 50,       // Maximum number of keys in objects (default: 50)
            },
            resourceAttributes: {
              'deployment.environment': 'dev',
            },
          }
        ),
      },
//      exporters: [
//          new DefaultExporter(), // Studio access

//         new OtelExporter({
//            provider: {
//              traceloop: {
//                apiKey: process.env.TRACELOOP_API_KEY,
//                destinationId: 'my-destination',
//              },
//            },
//            batchSize: 500,
//            timeout: 50000,
//            logger: log,
//            logLevel: 'debug',
//            resourceAttributes: {
//              'deployment.environment': 'dev',
//            },
//          }),
//        ],
    },
  }),
  server: {
    apiRoutes: [
      workflowRoute({
        path: '/workflow/:workflowId',
        includeTextStreamParts: true,
      }),
      networkRoute({
        path: '/network/:agentId',
        defaultOptions: {
          memory: {
            thread: {
              id: ':agentId',
              resourceId: ':agentId',
              metadata: { agentId: ':agentId' },
            },
            resource: 'network',
            options: {
              lastMessages: 500,
              semanticRecall: true,
              workingMemory: { enabled: true },
              threads: { generateTitle: true },
            },
          },
          maxSteps: 200,
          includeRawChunks: true,
        },
      }),
      chatRoute({
        path: '/chat/:agentId',
        defaultOptions: {
          memory: {
            thread: {
              id: ':agentId',
              resourceId: ':agentId',
              metadata: { agent: ':agentId' },
            },
            resource: ':agentId',
            options: {
              lastMessages: 500,
              semanticRecall: true,
              workingMemory: { enabled: true },
              threads: { generateTitle: true },
            }
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
        path: '/custom/researchAgent',
        agent: 'researchAgent',
        defaultOptions: {
          memory: {
            thread: {
              id: 'researchAgentChat',
              resourceId: 'chat',
              metadata: { agent: 'researchAgent' },
            },
            resource: 'chat',
            options: {
              lastMessages: 500,
              semanticRecall: true,
              workingMemory: { enabled: true },
              threads: { generateTitle: true },
            }
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
    middleware: [
      // Populate RequestContext with real runtime values derived from headers (used by agents/tools)
      async (c, next) => {
        const country = c.req.header('CF-IPCountry') ?? ''
        const authHeader = c.req.header('Authorization') ?? ''
        const headerUserId = c.req.header('x-user-id')
        const headerUserTier = c.req.header('x-user-tier')
        const acceptLanguage = c.req.header('accept-language') ?? ''
        const researchPhaseHeader = c.req.header('x-research-phase')

        const requestContext = c.get('requestContext') as
          | RequestContext
          | undefined
        if (requestContext?.set) {
          //          // Temperature unit (from Cloudflare geo header)
          const unit = country === 'US' ? 'fahrenheit' : 'celsius'
          requestContext.set('temperature-unit', unit)

          // userId: prefer explicit header, otherwise try to parse from a bearer token (format: "Bearer user:<id>")
          let userId = headerUserId
          if (
            !userId &&
            authHeader !== null &&
            authHeader !== '' &&
            authHeader.startsWith('Bearer ')
          ) {
            const token = authHeader.slice('Bearer '.length)
            const exec = /user:([^;\s]+)/.exec(token)
            if (exec) {
              userId = exec[1]
            }
          }
          if (userId !== null && userId !== '') {
            requestContext.set('userId', userId)
          }

          // user-tier: prefer explicit header, otherwise derive from token hints
          let userTier = headerUserTier
          if (
            !userTier &&
            authHeader !== null &&
            authHeader !== '' &&
            authHeader.startsWith('Bearer ')
          ) {
            const token = authHeader.slice('Bearer '.length)
            if (token.includes('enterprise')) {
              userTier = 'enterprise'
            } else if (token.includes('pro')) {
              userTier = 'pro'
            } else {
              userTier = 'free'
            }
          }
          if (userTier !== null && userTier !== '') {
            requestContext.set('user-tier', userTier)
          }

          // language: prefer Accept-Language header (primary language subtag), fallback to 'en'
          const language =
            acceptLanguage.split(',')[0]?.split('-')[0] ?? 'en'
          const supported = ['en', 'es', 'ja', 'fr']
          requestContext.set(
            'language',
            supported.includes(language) ? language : 'en'
          )

          // research phase
          requestContext.set(
            'researchPhase',
            researchPhaseHeader ?? 'initial'
          )

          // runtime API key (for tools that may accept runtimeContext.apiKey)
          //            if (apiKeyHeader !== null && apiKeyHeader !== '') { requestContext.set('apiKey', apiKeyHeader) }
        }

        await next()
      },
      //Request timing logger
      async (c, next) => {
        const start = Date.now()
        await next()
        const duration = Date.now() - start
        log.info(`${c.req.method} ${c.req.url} - ${duration}ms`)
      },
    ],
  },
})

log.info('Mastra instance created')
