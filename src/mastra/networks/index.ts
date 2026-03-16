import { Agent } from '@mastra/core/agent'
import { asNestedAgents } from '@/src/mastra/agents/nestedAgents'
import { copywriterAgent } from '../agents/copywriterAgent'
import { editorAgent } from '../agents/editorAgent'
import { reportAgent } from '../agents/reportAgent'
import { researchAgent } from '../agents/researchAgent'
import { stockAnalysisAgent } from '../agents/stockAnalysisAgent'
import { weatherAgent } from '../agents/weather-agent'

// Orphaned agents now registered
import { customerSupportAgent } from '../agents/customerSupportAgent'
import { projectManagementAgent } from '../agents/projectManagementAgent'
import { seoAgent } from '../agents/seoAgent'
import { socialMediaAgent } from '../agents/socialMediaAgent'
import { translationAgent } from '../agents/translationAgent'

import { pgMemory } from '../config'
import { googleAI } from '../config/google'
import { weatherWorkflow } from '../workflows/weather-workflow'

// CSV/Data Pipeline Networks
export { dataPipelineNetwork } from './dataPipelineNetwork'
export { reportGenerationNetwork } from './reportGenerationNetwork'

// Research Pipeline Network
export { researchPipelineNetwork } from './researchPipelineNetwork'

// Coding Team Network
export { codingTeamNetwork } from './codingTeamNetwork'

// Content Creation Network
export { contentCreationNetwork } from './contentCreationNetwork'

// Financial Intelligence Network
export { financialIntelligenceNetwork } from './financialIntelligenceNetwork'

// Learning Network
export { learningNetwork } from './learningNetwork'

// Marketing Automation Network
export { marketingAutomationNetwork } from './marketingAutomationNetwork'

// DevOps Network
export { devopsNetwork } from './devopsNetwork'

// Business Intelligence Network
export { businessIntelligenceNetwork } from './businessIntelligenceNetwork'

// Security Network
export { securityNetwork } from './securityNetwork'

import {
  TokenLimiterProcessor
} from '@mastra/core/processors'
export const agentNetwork = new Agent({
  id: 'agent-network',
  name: 'Primary Agent Network',
  description:
    'A routing agent that coordinates specialized agents and workflows.',
  instructions: `
     You are a Primary Network Coordinator. Your goal is to route user requests to most appropriate specialist agent or workflow.

     Available Capabilities:
     - **Research**: For deep research topics, finding facts, and gathering information.
     - **Stock Analysis**: For financial data, market analysis, and stock trends.
     - **Weather Workflow**: For comprehensive weather forecasts combined with activity planning.
     - **Weather Agent**: For quick weather checks.
     - **Copywriting**: For generating marketing copy, blog posts, and creative writing.
     - **Editor**: For refining, proofreading, and improving existing text.
     - **Report**: For generating formal reports.
     - **Social Media**: For creating social media content and engagement strategies.
     - **SEO**: For search engine optimization and content strategy.
     - **Translation**: For translating content between languages.
     - **Customer Support**: For answering customer questions and providing support.
     - **Project Management**: For task tracking, project planning, and coordination.

     Routing Logic:
     - If user asks for a weather forecast *and* what to do, delegate to 'weather-workflow'.
     - If user asks for deep research or "find out about X", delegate to 'researchAgent'.
     - If user asks about stocks, crypto, or finance, delegate to 'stockAnalysisAgent'.
     - If user wants text written, delegate to 'copywriterAgent'.
     - If user wants text checked or fixed, delegate to 'editorAgent'.
     - If user needs social media content or strategy, delegate to 'socialMediaAgent'.
     - If user asks about SEO or content optimization, delegate to 'seoAgent'.
     - If user needs translation, delegate to 'translationAgent'.
     - If user has customer questions or support needs, delegate to 'customerSupportAgent'.
     - If user needs project management or task tracking, delegate to 'projectManagementAgent'.
     - If user request is simple, general, or conversational (like "hello", "what's up"), respond directly and naturally to user without explaining your routing logic.
   `,
  model: googleAI,
  memory: pgMemory, // Required for network capabilities
  options: {},
  agents: asNestedAgents({
    researchAgent,
    stockAnalysisAgent,
    weatherAgent,
    copywriterAgent,
    editorAgent,
    reportAgent,
    socialMediaAgent,
    seoAgent,
    translationAgent,
    customerSupportAgent,
    projectManagementAgent,
  }),
  //  tools: { confirmationTool },
  scorers: {},
  workflows: { weatherWorkflow },
  outputProcessors: [
    new TokenLimiterProcessor(128000),
    //  new BatchPartsProcessor({
    //      batchSize: 20,
    //      maxWaitTime: 100,
    //      emitOnNonText: true,
    //  }),
  ],
})
