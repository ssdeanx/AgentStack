import { Agent } from '@mastra/core/agent'
import { createAnswerRelevancyScorer, createToxicityScorer } from '@mastra/evals/scorers/prebuilt'
import { copywriterAgent } from '../agents/copywriterAgent'
import { editorAgent } from '../agents/editorAgent'
import { researchAgent } from '../agents/researchAgent'
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


AVAILABLE WORKFLOWS:


AVAILABLE NETWORKS (Multi-agent):


ORCHESTRATION WORKFLOWS (PARALLEL):


CRITICAL: Always prefer parallel orchestration over sequential execution for efficiency.
Only use sequential when tasks have strict dependencies on previous results.
Use Promise.all() pattern for parallel execution.
`,
            providerOptions: {
                google: {
                    thinkingConfig: {
                        thinkingLevel: 'high',
                        includeThoughts: true,
                        thinkingBudget: -1,
                    }
                }
            }
        }
    },
    model: googleAI,
    memory: pgMemory,
    options: {},
    agents: { researchAgent, editorAgent, copywriterAgent },
    workflows: {},
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
