import { Agent } from '@mastra/core/agent'
import { createAnswerRelevancyScorer, createToxicityScorer } from '@mastra/evals/scorers/prebuilt'
import { copywriterAgent } from '../agents/copywriterAgent'
import { editorAgent } from '../agents/editorAgent'
import { researchAgent } from '../agents/researchAgent'
import { knowledgeIndexingAgent } from '../agents/knowledgeIndexingAgent'
import { codeArchitectAgent, codeReviewerAgent, testEngineerAgent, refactoringAgent } from '../agents/codingAgents'
import { contentStrategistAgent } from '../agents/contentStrategistAgent'
import { projectManagementAgent } from '../agents/projectManagementAgent'
import { researchSynthesisWorkflow } from '../workflows/research-synthesis-workflow'
import { repoIngestionWorkflow } from '../workflows/repo-ingestion-workflow'
import { specGenerationWorkflow } from '../workflows/spec-generation-workflow'
import { googleAI, googleAIFlashLite } from '../config/google'
import { pgMemory } from '../config/pg-storage'
import type { RequestContext } from '@mastra/core/request-context';
// Import all agents

// Import all workflows

/**
 * A2A Coordinator Agent
 *
 * This agent coordinates complex tasks by orchestrating multiple specialized agents in parallel
 * using Mastra's agent.network() for non-deterministic LLM-based multi-agent orchestration.
 *
 * Exposed via A2A protocol through MCP server for external agent communication.
 */

export const a2aCoordinatorAgent = new Agent({
    id: 'a2aCoordinator',
    name: 'a2aCoordinator',
    description: 'A2A Coordinator that orchestrates multiple specialized agents in parallel. Routes tasks dynamically, coordinates workflows, and synthesizes results using the A2A protocol.',
    instructions: ({ requestContext }) => {
        const userId = requestContext.get('userId');
        return {
            role: 'system',
            content: `You are an A2A (Agent-to-Agent) Coordinator that orchestrates multi-agent workflows.
userId: ${userId}
CORE CAPABILITIES:
- Orchestrate multiple agents working in parallel
- Route tasks to specialized agents dynamically
- Monitor task progress and handle errors
- Collect and synthesize all results
- Coordinate complex, multi-step workflows

ORCHESTRATION PATTERNS (NOT SEQUENTIAL):
1. Analyze the task and identify all required agents
2. Create parallel agent tasks for maximum efficiency
3. Monitor task execution across all agents simultaneously
4. Collect and synthesize results from all agents
5. Provide comprehensive final response

AVAILABLE AGENTS:
- researchAgent: Fact finding and information gathering
- knowledgeIndexingAgent: Document chunking, vector embedding, and semantic reranking (RAG)
- editorAgent: Reviewing and polishing content
- copywriterAgent: High-quality marketing and technical writing
- contentStrategistAgent: Strategic planning for content campaigns
- codeArchitectAgent: System design and architectural planning
- codeReviewerAgent: Deep analysis of code quality and security
- testEngineerAgent: Automated test generation and verification
- refactoringAgent: Safe and efficient code modernization
- projectManagementAgent: Task decomposition and roadmap creation

AVAILABLE WORKFLOWS:
- researchSynthesisWorkflow: Multi-source research consolidation
- repoIngestionWorkflow: Knowledge indexing for RAG from codebases
- specGenerationWorkflow: Detailed product and technical specification generation

AVAILABLE NETWORKS (Multi-agent):
- Coding Team Network: Orchestrated coding specialists for feature development

ORCHESTRATION WORKFLOWS (PARALLEL):
1. Implementation Planning: codeArchitectAgent + projectManagementAgent
2. Content Creation: researchAgent + copywriterAgent + editorAgent
3. Software Modernization: codeReviewerAgent + refactoringAgent + testEngineerAgent
4. Knowledge Base Building: knowledgeIndexingAgent (for chunking/embeddings) + researchAgent (for verification)

CRITICAL: Always prefer parallel orchestration over sequential execution for efficiency.
Only use sequential when tasks have strict dependencies on previous results.
Use Promise.all() pattern for parallel execution.
Maximize the use of E2B sandboxes via specialized agents for any code-related tasks.
Use knowledgeIndexingAgent to provide semantic context for complex queries.
`,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: 'high',
            includeThoughts: true,
            thinkingBudget: -1,
          },
          mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
          responseModalities: ['TEXT', 'IMAGE'],
        }
      }
    }
  },
  model: googleAI,
  memory: pgMemory,
  options: {},
  agents: {
    researchAgent,
    knowledgeIndexingAgent,
    editorAgent,
    copywriterAgent,
    codeArchitectAgent,
    codeReviewerAgent,
    testEngineerAgent,
    refactoringAgent,
    contentStrategistAgent,
    projectManagementAgent,
  },
  workflows: {
    researchSynthesisWorkflow,
    repoIngestionWorkflow,
    specGenerationWorkflow,
  },
  maxRetries: 5,
    tools: {},
    scorers: {
        relevancy: {
            scorer: createAnswerRelevancyScorer({ model: googleAIFlashLite }),
            sampling: { type: "ratio", rate: 0.4 }
        },
        safety: {
            scorer: createToxicityScorer({ model: googleAIFlashLite }),
            sampling: { type: "ratio", rate: 0.3 }
        }
    },
})
