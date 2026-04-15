import { chatRoute, networkRoute, workflowRoute } from '@mastra/ai-sdk'
import { Mastra } from '@mastra/core'
import { getAuthenticatedUser } from '@mastra/server/auth'
import {
    Observability,
    SamplingStrategyType,
    SensitiveDataFilter,
} from '@mastra/observability'

// Config
import { log } from './config/logger'
import { libsqlstorage, libsqlvector } from './config/libsql'

// Scorers
// Scorers are attached to agents where appropriate (see src/mastra/evals/AGENTS.md for mapping)

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

// Financial Chart Agents
import {
    chartDataProcessorAgent,
    chartGeneratorAgent,
    chartSupervisorAgent,
    chartTypeAdvisorAgent,
} from './agents/recharts'

import {
    chartJsAgent,
    codeGraphAgent,
    codeMetricsAgent,
    fetchAgent,
    finnhubAgent,
    graphSupervisorAgent,
    mappingAgent,
    technicalAnalysisAgent,
} from './agents/graphingAgents'

import { customerSupportAgent } from './agents/customerSupportAgent'
import { projectManagementAgent } from './agents/projectManagementAgent'
import { seoAgent } from './agents/seoAgent'
import { socialMediaAgent } from './agents/socialMediaAgent'
import { translationAgent } from './agents/translationAgent'

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
    buildSharedRequestContextPayload,
    LANGUAGE_CONTEXT_KEY,
    RESEARCH_PHASE_CONTEXT_KEY,
    TEMPERATURE_UNIT_CONTEXT_KEY,
    USER_ID_CONTEXT_KEY,
    ROLE_CONTEXT_KEY,
    type ResearchPhase,
    type SupportedLanguage,
    type TemperatureUnit,
} from './agents/request-context'
import {
    dane,
    daneChangeLog,
    daneCommitMessage,
    daneIssueLabeler,
    daneLinkChecker,
} from './agents/dane'
import {
    codingBriefWorkflow,
    codingChangePlanWorkflow,
    codingCommitPrepWorkflow,
    codingReferenceSearchWorkflow,
    codingRepoSnapshotWorkflow,
    githubCodeContextWorkflow,
    githubIssueTriageWorkflow,
    githubPullRequestDigestWorkflow,
    githubReleasePrepWorkflow,
    githubRepoOverviewWorkflow,
    genIdentifierPackWorkflow,
    genIdeaBatchWorkflow,
    genOutlineWorkflow,
    genTimeboxWorkflow,
    genVariantWorkflow,
    marketingCampaignWorkflow,
    researchArxivDownloadWorkflow,
    researchArxivSearchWorkflow,
    researchNoteWorkflow,
    researchSourceSummaryWorkflow,
    researchUrlCheckWorkflow,
    utilityCalculatorWorkflow,
    utilityDateTimeWorkflow,
    utilityNoteWorkflow,
    utilityRandomWorkflow,
    utilityUrlWorkflow,
} from './workflows'
import { automatedReportingWorkflow } from './workflows/automated-reporting-workflow'
import { contentReviewWorkflow } from './workflows/content-review-workflow'
import { contentStudioWorkflow } from './workflows/content-studio-workflow'
import { documentProcessingWorkflow } from './workflows/document-processing-workflow'
import { financialReportWorkflow } from './workflows/financial-report-workflow'
import { learningExtractionWorkflow } from './workflows/learning-extraction-workflow'
import { repoIngestionWorkflow } from './workflows/repo-ingestion-workflow'
import { researchSynthesisWorkflow } from './workflows/research-synthesis-workflow'
import { specGenerationWorkflow } from './workflows/spec-generation-workflow'
import { stockAnalysisWorkflow } from './workflows/stock-analysis-workflow'
import { telephoneGameWorkflow } from './workflows/telephone-game'
import { weatherWorkflow } from './workflows/weather-workflow'
//import { OtelBridge } from '@mastra/otel-bridge'
import { DefaultExporter } from '@mastra/observability'
import { keywordCoverageScorer } from './scorers/keyword-coverage'
import { createCompletenessScorer } from './agents/evals/prebuilt'
//import { createToolCallAccuracyScorerCode } from '@mastra/evals/scorers/prebuilt'
import {
    researchCompletenessScorer,
    sourceDiversityScorer,
} from './scorers/custom-scorers'
// Harness
import { mainHarness } from './harness'
import { supervisorAgent } from './agents/supervisor-agent'
import { mastraAuth } from './auth'
import { agentFsWorkspace } from './workspaces'
import { MastraEditor } from '@mastra/editor'
import { MastraCompositeStore } from '@mastra/core/storage'
import { ArcadeToolProvider } from '@mastra/editor/arcade'
import { ComposioToolProvider } from '@mastra/editor/composio'

export const mastra = new Mastra({
    workspace: agentFsWorkspace,
    editor: new MastraEditor(
        {
            logger: log,
            toolProviders: {
                composio: new ComposioToolProvider({
                apiKey: process.env.COMPOSIO_API_KEY!,
                }),
                // Add other tool providers here
                arcade: new ArcadeToolProvider({
                apiKey: process.env.ARCADE_API_KEY!,
                }),
            },
            sandboxes: {
                // Optional: restrict certain modules or APIs for security
            },
            filesystems: {

                // Optional: configure storage limits, allowed file types, etc.
            },
             // Optional: add a custom toolbar with specific tools or actions
        }
    ),
    workflows: {
        weatherWorkflow,
        contentStudioWorkflow,
        contentReviewWorkflow,
        documentProcessingWorkflow,
        financialReportWorkflow,
        learningExtractionWorkflow,
        researchSynthesisWorkflow,
        stockAnalysisWorkflow,
        telephoneGameWorkflow,
        repoIngestionWorkflow,
        specGenerationWorkflow,
        marketingCampaignWorkflow,
       // dataAnalysisWorkflow,
        automatedReportingWorkflow,
        codingBriefWorkflow,
        codingChangePlanWorkflow,
        codingCommitPrepWorkflow,
        codingReferenceSearchWorkflow,
        codingRepoSnapshotWorkflow,
        githubCodeContextWorkflow,
        githubIssueTriageWorkflow,
        githubPullRequestDigestWorkflow,
        githubReleasePrepWorkflow,
        githubRepoOverviewWorkflow,
        genIdeaBatchWorkflow,
        genIdentifierPackWorkflow,
        genOutlineWorkflow,
        genTimeboxWorkflow,
        genVariantWorkflow,
        researchArxivDownloadWorkflow,
        researchArxivSearchWorkflow,
        researchNoteWorkflow,
        researchSourceSummaryWorkflow,
        researchUrlCheckWorkflow,
        utilityCalculatorWorkflow,
        utilityDateTimeWorkflow,
        utilityNoteWorkflow,
        utilityRandomWorkflow,
        utilityUrlWorkflow,
    },
    agents: {
        // Core Agents
        researchAgent,
        supervisorAgent,
        csvToExcalidrawAgent,
        imageToCsvAgent,
        copywriterAgent,
        editorAgent,
        excalidrawValidatorAgent,
        reportAgent,
        learningExtractionAgent,
        evaluationAgent,
        contentStrategistAgent,
        scriptWriterAgent,
        stockAnalysisAgent,
        weatherAgent,
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

        // Graphing & Analysis Agents
        graphSupervisorAgent,
        technicalAnalysisAgent,
        chartJsAgent,
        mappingAgent,
        fetchAgent,
        finnhubAgent,
        codeGraphAgent,
        codeMetricsAgent,
        // Business Legal Agents
        legalResearchAgent,
        businessStrategyAgent,
        complianceMonitoringAgent,
        contractAnalysisAgent,
        // Marketing & Support Agents
        socialMediaAgent,
        seoAgent,
        translationAgent,
        customerSupportAgent,
        projectManagementAgent,
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
    scorers: {
        completeness: createCompletenessScorer(),
        keywordCoverage: keywordCoverageScorer,
        sourceDiversity: sourceDiversityScorer,
        researchCompleteness: researchCompletenessScorer,
    },
    mcpServers: {
        a2aCoordinator: a2aCoordinatorMcpServer,
        notes: notesMCP,
        codingA2A: codingA2AMcpServer,
    },

    storage: libsqlstorage,
    vectors: { libsqlvector },
    logger: log,
    observability: new Observability({
        configs: {
            default: {
                serviceName: 'ai',

                sampling: {
                    type: SamplingStrategyType.RATIO,
                    probability: 0.75,
                }, // 50% sampling
                requestContextKeys: [
                    'userId',
                    'role',
                    'language',
                    'temperature-unit',
                    'researchPhase',
                    'environment',
                    'tenantId',
                    'tool.id',
                    'agent.id',
                    'workflow.id',
                    'memory.thread.id',
                    'user.id',
                    'workspace.id',
                    'sandbox.id',
                ],
                spanOutputProcessors: [
                    new SensitiveDataFilter({
                        sensitiveFields: [
                            // Default fields
                            'password',
                            'token',
                            'secret',
                            'key',
                            'apikey',
                            // Custom fields for your application
                            'creditCard',
                            'bankAccount',
                            'routingNumber',
                            'email',
                            'phoneNumber',
                            'dateOfBirth',
                        ],
                        // Custom redaction token
                        redactionToken: '***SENSITIVE***',
                        // Redaction style
                        redactionStyle: 'full', // or 'partial'
                    }), // Redacts sensitive fields before export
                ],
                exporters: [
                    new DefaultExporter({
                        logger: log,
                        logLevel: 'info',
                        strategy: 'auto',
                        // maxBatchSize: 1000,
                        // maxBufferSize: 10000,
                        // maxBatchWaitMs: 5000,
                        maxRetries: 5,
                    }), // Studio access0
                  //  new CloudExporter(),
                ],
                includeInternalSpans: true,
                serializationOptions: {
                    maxStringLength: 1080, // Truncate long strings to prevent oversized spans
                    maxArrayLength: 100, // Limit array lengths in span attributes
                    maxDepth: 6, // Limit depth of nested objects in span attributes
                    maxObjectKeys: 100, // Limit number of keys in objects included in span attributes
                }
            }
        }
    }),
    server: {
        auth: mastraAuth, // Attach the Mastra auth bridge to the server for route protection and context population
        cors: {
            origin: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? 'http://localhost:3000', // your frontend origin
            credentials: true,
            allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
           // allowHeaders: ['*', 'Authorization', 'Content-Type', 'x-user-id', 'x-role', 'accept-language', 'x-research-phase', 'api-key'],
           // exposeHeaders: ['Authorization', 'Content-Type', 'x-user-id', 'x-role', 'accept-language', 'x-research-phase', 'api-key'],
        },
        build: {
          swaggerUI: true,
          apiReqLogs: true,
          openAPIDocs: true,
        },
        apiRoutes: [
            workflowRoute({
                path: '/workflow/:workflowId',
                includeTextStreamParts: true,
            }),
            networkRoute({
                path: '/network/:agentId',
            }),
            chatRoute({
                path: '/chat/:agentId',
                version: 'v6',
                //defaultOptions: {
                // memory: {
                //     thread: {
                //         id: ':agentId',
                //         resourceId: ':agentId',
                //         metadata: { agent: ':agentId' },
                //     },
                //    resource: ':agentId',
                //       options: {
                //           lastMessages: 500,
                //          semanticRecall: true,
                //          workingMemory: { enabled: true },
                //          threads: { generateTitle: true },
                //      },
                //   },
                //  maxSteps: 50,
                //   includeRawChunks: true,
                //   providerOptions: {
                //       google: {} as GoogleGenerativeAIProviderOptions,
                //       openai: {} as OpenAIResponsesProviderOptions,
                // Use an instance of RequestContext (not the class) so the route has a proper context per request
                //   requestContext: new RequestContext()
                //   }
                // },
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
                            id: 'researchAgent',
                            resourceId: 'researchAgent',
                            metadata: { agent: 'researchAgent' },
                        },
                        resource: 'researchAgent',
                        options: {
                            lastMessages: 500,
                            semanticRecall: true,
                            workingMemory: { enabled: true },
                            threads: { generateTitle: true },
                        },
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
                const acceptLanguage = c.req.header('accept-language') ?? ''
                const researchPhaseHeader = c.req.header('x-research-phase')

                const requestContext = c.get('requestContext') as
                    | RequestContext
                    | undefined
                if (requestContext?.set) {
                    const bearerToken = authHeader.startsWith('Bearer ')
                        ? authHeader.slice('Bearer '.length)
                        : ''
                    const authenticatedUser =
                        bearerToken.length > 0
                            ? await getAuthenticatedUser<{
                                  user: { id: string; role?: string }
                              }>({
                                  mastra,
                                  token: bearerToken,
                                  request: c.req.raw,
                              })
                            : null

                    // userId: prefer explicit header, otherwise try to parse from a bearer token (format: "Bearer user:<id>")
                    const userId =
                        authenticatedUser?.user.id?.trim() ||
                        headerUserId?.trim() ||
                        ''
                    if (userId !== '') {
                        requestContext.set('userId', userId)
                    }

                    const role =
                        authenticatedUser?.user.role === 'admin'
                            ? 'admin'
                            : 'user'
                    requestContext.set(ROLE_CONTEXT_KEY, role)
                    requestContext.set('userRole', role)

                    const temperatureUnit: TemperatureUnit =
                        country === 'US' ? 'fahrenheit' : 'celsius'
                    const acceptedLanguage =
                        acceptLanguage.split(',')[0]?.split('-')[0] ?? 'en'
                    const supportedLanguages = [
                        'en',
                        'es',
                        'ja',
                        'fr',
                    ] as const satisfies ReadonlyArray<SupportedLanguage>
                    const language: SupportedLanguage = supportedLanguages.includes(
                        acceptedLanguage as SupportedLanguage
                    )
                        ? (acceptedLanguage as SupportedLanguage)
                        : 'en'

                    const researchPhase: ResearchPhase =
                        researchPhaseHeader === 'followup' ||
                        researchPhaseHeader === 'validation'
                            ? researchPhaseHeader
                            : 'initial'

                    const requestContextPayload = buildSharedRequestContextPayload({
                        [USER_ID_CONTEXT_KEY]: userId ?? undefined,
                        [ROLE_CONTEXT_KEY]: role,
                        [LANGUAGE_CONTEXT_KEY]: language,
                        [TEMPERATURE_UNIT_CONTEXT_KEY]: temperatureUnit,
                        [RESEARCH_PHASE_CONTEXT_KEY]: researchPhase,
                    })

                    for (const [key, value] of Object.entries(requestContextPayload)) {
                        requestContext.set(key, value)
                    }

                    // research phase
                    requestContext.set(
                        RESEARCH_PHASE_CONTEXT_KEY,
                        researchPhase
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

await mainHarness.init()

log.info('Mastra instance created')
