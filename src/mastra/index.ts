import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';
import { pgVector } from './config/pg-storage';
import { log } from './config/logger';
import {
  CloudExporter,
  DefaultExporter,
  SamplingStrategyType,
  SensitiveDataFilter,
} from "@mastra/core/ai-tracing";
import { ArizeExporter } from "@mastra/arize";
import { a2aCoordinatorAgent } from './agents/a2aCoordinatorAgent'
import { a2aCoordinatorMcpServer } from './mcp'
import { csvToExcalidrawAgent } from './agents/csv_to_excalidraw'
import { imageToCsvAgent } from './agents/image_to_csv'
import { excalidrawValidatorAgent } from './agents/excalidraw_validator'
import { responseQualityScorer, taskCompletionScorer } from './scorers/custom-scorers'
import { reportAgent } from './agents/reportAgent';
import { learningExtractionAgent } from './agents/learningExtractionAgent';
import { evaluationAgent } from './agents/evaluationAgent';
import { researchAgent } from './agents/researchAgent';
import { editorAgent } from './agents/editorAgent';
import { copywriterAgent } from './agents/copywriterAgent';
import { agentNetwork } from './networks';

import { contentStrategistAgent } from './agents/contentStrategistAgent';
import { scriptWriterAgent } from './agents/scriptWriterAgent';
import { contentStudioWorkflow } from './workflows/content-studio-workflow';
import { chatRoute, workflowRoute, networkRoute } from "@mastra/ai-sdk";
export const mastra = new Mastra({
  workflows: { weatherWorkflow, contentStudioWorkflow },
  agents: {
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
    agentNetwork,
    contentStrategistAgent,
    scriptWriterAgent
  },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer, responseQualityScorer, taskCompletionScorer },
  mcpServers: { a2aCoordinator: a2aCoordinatorMcpServer },
  storage: new LibSQLStore({
    url: "file:./mastra.db",
  }),
  vectors: { pgVector },
  logger: log,
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false,
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
            { strategy: 'realtime'}
          )],
      },
    },
  },
  server: {
    apiRoutes: [
      chatRoute({
        path: "/chat",
        agent: "weatherAgent, a2aCoordinator, csvToExcalidrawAgent, imageToCsvAgent, excalidrawValidatorAgent, reportAgent, learningExtractionAgent, evaluationAgent, researchAgent, copywriterAgent, editorAgent, agentNetwork, contentStrategistAgent, scriptWriterAgent",
        defaultOptions: {},
        sendStart: true,
        sendFinish: true,
        sendReasoning: true,
        sendSources: true,
      }),
      workflowRoute({
        path: "/workflow",
        workflow: "weatherWorkflow, contentStudioWorkflow",
      }),
      networkRoute({
        path: "/network",
        agent: "agentNetwork",
        defaultOptions: {},
      }),
    ]
  },
});

log.info("Mastra instance created");
