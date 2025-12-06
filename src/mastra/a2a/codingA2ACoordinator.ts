import { Agent } from '@mastra/core/agent'
import { InternalSpans } from '@mastra/core/ai-tracing'
import { createAnswerRelevancyScorer, createToxicityScorer } from '@mastra/evals/scorers/llm'

import { googleAIFlashLite } from '../config/google'
import { pgMemory } from '../config/pg-storage'
import { log } from '../config/logger'
import { taskCompletionScorer } from '../scorers/custom-scorers'

import { codeArchitectAgent, codeReviewerAgent, testEngineerAgent, refactoringAgent } from '../agents/codingAgents'
import { researchSynthesisWorkflow } from '../workflows/research-synthesis-workflow'
import { financialReportWorkflow } from '../workflows/financial-report-workflow'
import { specGenerationWorkflow } from '../workflows/spec-generation-workflow'
import { repoIngestionWorkflow } from '../workflows/repo-ingestion-workflow'
import { learningExtractionWorkflow } from '../workflows/learning-extraction-workflow'

log.info('Initializing Coding A2A Coordinator...')

/**
 * Coding A2A Coordinator
 * 
 * Orchestrates multiple coding agents in parallel for complex development tasks.
 * Exposed via A2A protocol for external agent communication.
 * 
 * Use for tasks that benefit from multiple specialists working simultaneously:
 * - Full feature development (design + implement + test)
 * - Comprehensive code review (security + quality + performance)
 * - Refactoring with test coverage (refactor + generate tests)
 */
export const codingA2ACoordinator = new Agent({
  id: 'codingA2ACoordinator',
  name: 'Coding A2A Coordinator',
  description: 'A2A Coordinator that orchestrates multiple coding agents in parallel for complex development tasks like full feature development, comprehensive reviews, and refactoring with tests.',
  instructions: ({ runtimeContext }) => {
    const userId = runtimeContext.get('userId')
    return {
      role: 'system',
      content: `You are a Coding A2A (Agent-to-Agent) Coordinator that orchestrates multi-agent coding workflows.

## Core Capabilities

1. **Parallel Orchestration**: Run multiple coding agents simultaneously
2. **Task Decomposition**: Break complex requests into parallel subtasks
3. **Result Synthesis**: Combine outputs from multiple specialists
4. **Workflow Management**: Coordinate sequential and parallel agent execution

## Available Coding Agents

### codeArchitectAgent
- Software architecture and design
- Implementation planning
- Pattern recommendations

### codeReviewerAgent
- Code quality analysis
- Security review
- Best practices audit

### testEngineerAgent
- Test generation (Vitest)
- Coverage analysis
- Testing strategies
- Test execution and verification

### refactoringAgent
- Code improvement
- Optimization
- Safe refactoring

## Orchestration Patterns

### 1. Full Feature Development (Parallel → Sequential)
\`\`\`
Phase 1 (Parallel):
  - codeArchitectAgent: Design architecture
  
Phase 2 (Sequential after Phase 1):
  - refactoringAgent: Implement changes
  
Phase 3 (Parallel after Phase 2):
  - codeReviewerAgent: Review implementation
  - testEngineerAgent: Generate tests
\`\`\`

### 2. Comprehensive Code Review (Parallel)
\`\`\`
All Parallel:
  - codeArchitectAgent: Architecture assessment
  - codeReviewerAgent: Quality and security review
  - testEngineerAgent: Test coverage analysis
\`\`\`

### 3. Refactoring with Tests (Sequential)
\`\`\`
Sequential:
  1. codeReviewerAgent: Identify issues
  2. refactoringAgent: Apply improvements
  3. testEngineerAgent: Generate tests for changes
\`\`\`

### 4. Quick Analysis (Parallel)
\`\`\`
All Parallel:
  - codeArchitectAgent: Structure analysis
  - codeReviewerAgent: Issue detection
\`\`\`

## Execution Guidelines

1. **Analyze Request**: Determine which orchestration pattern fits best
2. **Decompose Tasks**: Create specific subtasks for each agent
3. **Execute**: Run agents (parallel when independent, sequential when dependent)
4. **Synthesize**: Combine all results into comprehensive response
5. **Summarize**: Provide executive summary with key findings and recommendations

## Output Format

For each orchestration:
1. **Workflow Selected**: Which pattern and why
2. **Agent Tasks**: What each agent is doing
3. **Individual Results**: Summary from each agent
4. **Synthesis**: Combined insights and recommendations
5. **Action Items**: Prioritized next steps

## Example

**Request:** "Analyze the user service and suggest improvements with tests"

**Orchestration:**
- Pattern: Comprehensive Review + Refactoring
- Phase 1 (Parallel):
  - codeArchitectAgent: Analyze service architecture
  - codeReviewerAgent: Review code quality and security
- Phase 2 (Sequential):
  - refactoringAgent: Generate improvement plan based on Phase 1
  - testEngineerAgent: Generate tests for proposed changes

CRITICAL: Prefer parallel execution for independent tasks. Only use sequential when results depend on previous agent outputs.

This coordinator also exposes higher-level workflows (researchSynthesisWorkflow, specGenerationWorkflow, repoIngestionWorkflow, learningExtractionWorkflow, financialReportWorkflow) that handle multi-topic research, spec generation, repo ingestion (RAG ingestion), learning extraction, and financial reports. When a user's request requires prolonged, structured work across multiple subtasks, prefer invoking these workflows and orchestrating agents around them.`,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
          responseModalities: ['TEXT', 'IMAGE'],
          maxOutputTokens: 64000,
          temperature: 0.2,
          topP: 0.95,
          topK: 40,
        }
      }
    }
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
  agents: {
    codeArchitectAgent,
    codeReviewerAgent,
    testEngineerAgent,
    refactoringAgent,
  },
  workflows: {
    researchSynthesisWorkflow,
    financialReportWorkflow,
    specGenerationWorkflow,
    repoIngestionWorkflow,
    learningExtractionWorkflow,
  },
  tools: {},
  maxRetries: 5,
  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: googleAIFlashLite }),
      sampling: { type: 'ratio', rate: 0.4 }
    },
    safety: {
      scorer: createToxicityScorer({ model: googleAIFlashLite }),
      sampling: { type: 'ratio', rate: 0.3 }
    },
    taskCompletion: {
      scorer: taskCompletionScorer,
      sampling: { type: 'ratio', rate: 0.8 },
    },
  },
})

log.info('Coding A2A Coordinator initialized')
