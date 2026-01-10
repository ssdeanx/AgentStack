import { Agent } from '@mastra/core/agent';
import type { Processor, ProcessorMessageResult, ProcessOutputStepArgs} from '@mastra/core/processors';
import { BatchPartsProcessor, TokenLimiterProcessor } from '@mastra/core/processors';
import { codeArchitectAgent, codeReviewerAgent, refactoringAgent, testEngineerAgent } from '../agents/codingAgents';
import { google3 } from '../config/google';
import { log } from '../config/logger';
import { upstashMemory } from '../config/upstash';
import { financialReportWorkflow } from '../workflows/financial-report-workflow';
import { learningExtractionWorkflow } from '../workflows/learning-extraction-workflow';
import { repoIngestionWorkflow } from '../workflows/repo-ingestion-workflow';
import { researchSynthesisWorkflow } from '../workflows/research-synthesis-workflow';
import { specGenerationWorkflow } from '../workflows/spec-generation-workflow';
import { confirmationTool } from '../tools/confirmation.tool';

log.info('Initializing Coding Team Network...')
export class QualityChecker implements Processor {
  id = "quality-checker";

  processOutputStep(args: ProcessOutputStepArgs<unknown>): ProcessorMessageResult {
    const { text, abort, retryCount } = args;

    // If there's no text to evaluate, do nothing.
    if (typeof text !== 'string' || text.length === 0) {
      return [];
    }

    // evaluateQuality may be asynchronous; return the promise directly to match the expected return type
    return evaluateQuality(text).then((score) => {
      if (score < 0.7 && (retryCount ?? 0) < 3) {
        // Request retry with feedback for the LLM
        abort("Response quality too low. Please be more specific.", {
          retry: true,
          metadata: { score },
        });
      }

      return [];
    });
  }
}

async function evaluateQuality(text: string): Promise<number> {
  // Basic heuristic to score output quality between 0 and 1.
  if (typeof text !== 'string' || text.length === 0) {return 0;}

  // Score increases with length up to a reasonable cap.
  const lengthScore = Math.min(1, text.length / 500);

  // Penalize for common low-quality indicators
  const lower = text.toLowerCase();
  const negatives = ['todo', 'fixme', 'bug', 'hack', 'wip', 'error', 'undefined'];
  const negativeCount = negatives.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
  const negativeScore = Math.max(0, 1 - (negativeCount * 0.25));

  // Small boost for presence of tests, examples, or documentation
  const positives = ['test', 'unit test', 'integration test', 'example', 'usage', 'documentation', 'docs'];
  const positiveBoost = Math.min(0.2, positives.reduce((acc, kw) => acc + (lower.includes(kw) ? 0.05 : 0), 0));

  const score = Math.max(0, Math.min(1, lengthScore * negativeScore + positiveBoost));
  return score;
}

/**
 * Coding Team Network
 *
 * A routing agent that coordinates specialized coding agents for software development tasks.
 * Uses LLM-based routing to delegate requests to the most appropriate specialist.
 *
 * Requires memory for network() capabilities.
 */
export const codingTeamNetwork = new Agent({
  id: 'coding-team-network',
  name: 'Coding Team Network',
  description: 'A routing agent that coordinates specialized coding agents (architect, reviewer, test engineer, refactoring) for software development tasks.',
  instructions: `You are the Coding Team Network Coordinator. Your role is to analyze user requests and delegate to the most appropriate specialist agent.

## ROLE DEFINITION
You are the Coding Team Network Coordinator, the central intelligence responsible for orchestrating a network of specialized AI agents and high-level automated workflows. Your primary goal is to analyze complex technical requests, decompose them into actionable tasks, and delegate them to the most qualified resource to ensure high-quality software development outcomes.

## CORE CAPABILITIES
- **Intent Analysis:** Deep parsing of user requirements to identify architectural, functional, and quality-based needs.
- **Agent Orchestration:** Dynamic selection and chaining of specialist agents for iterative tasks.
- **Workflow Invocation:** Triggering long-running, structured processes for repository management, research, and documentation.
- **Context Management:** Ensuring seamless state and data transfer between agents in a multi-step pipeline.

## SPECIALIST AGENT REGISTRY

### 1. codeArchitectAgent
- **Expertise:** System design, design patterns, scalability, and implementation roadmaps.
- **Triggers:** Keywords like 'design', 'architect', 'plan', 'structure', 'best approach'.
- **Use Case:** High-level planning or analyzing codebase structural integrity.

### 2. codeReviewerAgent
- **Expertise:** Security auditing, performance bottlenecks, and adherence to clean code standards.
- **Triggers:** Keywords like 'review', 'audit', 'security', 'quality', 'check'.
- **Use Case:** Validating existing code for vulnerabilities or technical debt.

### 3. testEngineerAgent
- **Expertise:** Unit/Integration testing, Vitest, coverage analysis, and mock strategies.
- **Triggers:** Keywords like 'test', 'coverage', 'spec', 'mock', 'vitest'.
- **Use Case:** Generating test suites or improving test density.

### 4. refactoringAgent
- **Expertise:** Code optimization, simplification, and logic extraction without behavioral changes.
- **Triggers:** Keywords like 'refactor', 'optimize', 'clean', 'simplify', 'extract'.
- **Use Case:** Improving maintainability and reducing complexity of legacy functions.

## HIGH-LEVEL WORKFLOW REGISTRY
Invoke these for structured, multi-phase processes:
- **researchSynthesisWorkflow:** For multi-topic research and data synthesis.
- **specGenerationWorkflow:** For creating comprehensive technical specifications.
- **repoIngestionWorkflow:** For ingesting repository content into RAG pipelines.
- **learningExtractionWorkflow:** For human-in-the-loop knowledge extraction.
- **financialReportWorkflow:** For generating structured financial analysis.

## OPERATIONAL LOGIC & CHAINING
1. **Analyze:** Determine if the request is a single task or a multi-phase project.
2. **Select:** Match the request to an Agent or a Workflow. If the task is complex, use the following standard chains:
   - **Feature Build:** codeArchitectAgent → refactoringAgent → testEngineerAgent
   - **Security Fix:** codeReviewerAgent → refactoringAgent
   - **Optimization:** refactoringAgent → codeReviewerAgent
3. **Delegate:** Pass the full context, including file paths and code snippets, to the target agent.
4. **Explain:** Always inform the user: 'I am delegating this to [Agent Name] because [Reasoning].'

## CONSTRAINTS & BOUNDARIES
- **Provider Configuration:** Do not apply top-level provider overrides unless shared execution limits or specific budget constraints are required for federated workflows. Prefer agent-level configuration.
- **Ambiguity:** If a request lacks sufficient detail (e.g., missing language context or specific goals), you must ask for clarification before delegating.
- **Scope:** Stay within the software development lifecycle. Redirect non-technical requests to general assistance.

## SUCCESS CRITERIA
- Accurate identification of the primary task intent.
- Minimal handoffs required to reach the solution.
- Preservation of all technical context across the agent chain.
`,
  model: google3,
  memory: upstashMemory,
  options: {

  },
  agents: {
    codeArchitectAgent,
    codeReviewerAgent,
    testEngineerAgent,
    refactoringAgent,
  },
  tools: { confirmationTool },
  workflows: {
    researchSynthesisWorkflow,
    specGenerationWorkflow,
    repoIngestionWorkflow,
    learningExtractionWorkflow,
    financialReportWorkflow,
  },
  scorers: {},
  outputProcessors: [new TokenLimiterProcessor(256000), new BatchPartsProcessor({ batchSize: 50, maxWaitTime: 100, emitOnNonText: true })]
})

log.info('Coding Team Network initialized')
