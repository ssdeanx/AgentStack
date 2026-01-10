import { Agent } from '@mastra/core/agent'
import type { RequestContext } from '@mastra/core/request-context';
import { createAnswerRelevancyScorer, createToxicityScorer } from '@mastra/evals/scorers/prebuilt'

import { googleAIFlashLite } from '../config/google'
import { pgMemory } from '../config/pg-storage'
import { log } from '../config/logger'


import { codeArchitectAgent, codeReviewerAgent, testEngineerAgent, refactoringAgent } from '../agents/codingAgents'
import { knowledgeIndexingAgent } from '../agents/knowledgeIndexingAgent'
import * as e2bTools from '../tools/e2b'
import { researchSynthesisWorkflow } from '../workflows/research-synthesis-workflow'
import { financialReportWorkflow } from '../workflows/financial-report-workflow'
import { specGenerationWorkflow } from '../workflows/spec-generation-workflow'
import { repoIngestionWorkflow } from '../workflows/repo-ingestion-workflow'
import { learningExtractionWorkflow } from '../workflows/learning-extraction-workflow'
import { safeRefactoringWorkflow } from '../workflows/safe-refactoring-workflow'
import { testGenerationWorkflow } from '../workflows/test-generation-workflow'
import { dataAnalysisWorkflow } from '../workflows/data-analysis-workflow'
import { automatedReportingWorkflow } from '../workflows/automated-reporting-workflow'
import { checkFileExists, createDirectory, createSandbox, deleteFile, getFileInfo, getFileSize, listFiles, runCode, runCommand, watchDirectory, writeFile, writeFiles } from '../tools/e2b';

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
  id: 'codingA2A',
  name: 'Coding A2A Coordinator',
  description: 'A2A Coordinator that orchestrates multiple coding agents in parallel for complex development tasks like full feature development, comprehensive reviews, and refactoring with tests.',
  instructions: ({ requestContext }) => {
    const userId = requestContext.get('userId')
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

### 3. Refactoring with Verification (Hybrid)
\`\`\`
Sequential:
  1. codeReviewerAgent: Identify issues
  2. refactoringAgent: Apply improvements (verifying in E2B sandbox)
  3. testEngineerAgent: Generate and run tests in sandbox
\`\`\`

### 4. Sandbox Code Execution (Isolated)
\`\`\`
Parallel:
  - createSandbox: Prepare environment
  - runCode: Execute untrusted or experimental code
  - testEngineerAgent: Verify output
\`\`\`

### 5. Quick Analysis (Parallel)
\`\`\`
All Parallel:
  - codeArchitectAgent: Structure analysis
  - codeReviewerAgent: Issue detection
\`\`\`

## Execution Guidelines

1. **Analyze Request**: Determine which orchestration pattern fits best. Prefer patterns that involve sandbox verification for destructive or critical changes.
2. **Decompose Tasks**: Create specific subtasks for each agent
3. **Execute**: Run agents (parallel when independent, sequential when dependent). Use Promise.all() for parallel steps.
4. **Synthesize**: Combine all results into comprehensive response
5. **Summarize**: Provide executive summary with key findings and recommendations

## E2B Sandbox Usage
As a coordinator, you can use E2B tools directly or instruct agents to use them. Sandboxes are preferred for:
- Running untrusted code
- Verifying refactorings before local application
- Executing generated tests in isolation
- Scraping or processing data in a clean environment

## Output Format

For each orchestration:
1. **Workflow Selected**: Which pattern and why
2. **Sandbox Used**: Details of any E2B session (if applicable)
3. **Agent Tasks**: What each agent is doing
4. **Individual Results**: Summary from each agent
5. **Synthesis**: Combined insights and recommendations
6. **Action Items**: Prioritized next steps

## Example

**Request:** "Analyze the user service and suggest improvements with verified tests"

**Orchestration:**
- Pattern: Comprehensive Review + Refactoring with Verification
- Phase 1 (Parallel):
  - codeArchitectAgent: Analyze service architecture
  - codeReviewerAgent: Review code quality and security
- Phase 2 (Sequential):
  - refactoringAgent: Generate improvement plan + verify behavior in E2B sandbox
  - testEngineerAgent: Generate and run Vitest tests in sandbox for proposed changes

CRITICAL: Prefer parallel execution for independent tasks. Only use sequential when results depend on previous agent outputs. Use E2B sandboxes for any execution-related tasks to ensure safety and repeatability.

This coordinator also exposes higher-level workflows:
- **researchSynthesisWorkflow**: Multi-topic research synthesis
- **specGenerationWorkflow**: SPARC-based spec generation
- **repoIngestionWorkflow**: Ingest repositories for RAG
- **learningExtractionWorkflow**: Extract learnings from documents
- **financialReportWorkflow**: Financial analysis reports
- **safeRefactoringWorkflow**: Refactor code with E2B sandbox verification
- **testGenerationWorkflow**: Generate and verify tests in E2B sandbox

When a user's request requires prolonged, structured work across multiple subtasks, prefer invoking these workflows and orchestrating agents around them.`,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
          responseModalities: ['TEXT', 'IMAGE'],
        }
      }
    }
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  options: {},
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
    safeRefactoringWorkflow,
    testGenerationWorkflow,
    dataAnalysisWorkflow,
    automatedReportingWorkflow,
  },
  tools: {
    createSandbox,
    writeFile,
    writeFiles,
    listFiles,
    deleteFile,
    createDirectory,
    getFileInfo,
    checkFileExists,
    getFileSize,
    watchDirectory,
    runCommand,
    runCode,
  },
  maxRetries: 5,
  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: googleAIFlashLite }),
      sampling: { type: 'ratio', rate: 0.4 }
    },
    safety: {
      scorer: createToxicityScorer({ model: googleAIFlashLite }),
      sampling: { type: 'ratio', rate: 0.3 }
    }
  },
})

log.info('Coding A2A Coordinator initialized')
