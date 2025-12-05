import { Agent } from '@mastra/core/agent';
import { googleAI } from '../config/google';
import { weatherWorkflow } from '../workflows/weather-workflow';
import { researchAgent } from '../agents/researchAgent';
import { stockAnalysisAgent } from '../agents/stockAnalysisAgent';
import { weatherAgent } from '../agents/weather-agent';
import { copywriterAgent } from '../agents/copywriterAgent';
import { editorAgent } from '../agents/editorAgent';
import { reportAgent } from '../agents/reportAgent';
import { pgMemory } from '../config';
import { InternalSpans } from '@mastra/core/ai-tracing';

// CSV/Data Pipeline Networks
export { dataPipelineNetwork } from './dataPipelineNetwork';
export { reportGenerationNetwork } from './reportGenerationNetwork';

// Research Pipeline Network
export { researchPipelineNetwork } from './researchPipelineNetwork';

// Coding Team Network
export { codingTeamNetwork } from './codingTeamNetwork';

export const agentNetwork = new Agent({
  id: 'agent-network',
  name: 'Primary Agent Network',
  description: 'A routing agent that coordinates specialized agents and workflows.',
  instructions: `
    You are the Primary Network Coordinator. Your goal is to route user requests to the most appropriate specialist agent or workflow.

    Available Capabilities:
    - **Research**: For deep research topics, finding facts, and gathering information.
    - **Stock Analysis**: For financial data, market analysis, and stock trends.
    - **Weather Workflow**: For comprehensive weather forecasts combined with activity planning.
    - **Weather Agent**: For quick weather checks.
    - **Copywriting**: For generating marketing copy, blog posts, and creative writing.
    - **Editor**: For refining, proofreading, and improving existing text.
    - **Report**: For generating formal reports.

    Routing Logic:
    - If the user asks for a weather forecast *and* what to do, delegate to the 'weather-workflow'.
    - If the user asks for deep research or "find out about X", delegate to 'researchAgent'.
    - If the user asks about stocks, crypto, or finance, delegate to 'stockAnalysisAgent'.
    - If the user wants text written, delegate to 'copywriterAgent'.
    - If the user wants text checked or fixed, delegate to 'editorAgent'.
    - If the request is simple or general, handle it yourself.
  `,
  model: googleAI,
  memory: pgMemory, // Required for network capabilities
  options: { tracingPolicy: { internal: InternalSpans.ALL } },
  agents: {
    researchAgent,
    stockAnalysisAgent,
    weatherAgent,
    copywriterAgent,
    editorAgent,
    reportAgent
  },
  tools: {},
  scorers: {},
  workflows: {weatherWorkflow}
});
