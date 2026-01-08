import { Agent } from '@mastra/core/agent';

import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { BatchPartsProcessor, TokenLimiterProcessor } from '@mastra/core/processors';
import type { RequestContext } from '@mastra/core/request-context';
import { createAnswerRelevancyScorer, createToxicityScorer } from '@mastra/evals/scorers/prebuilt';
import { google3, googleAI, googleAI3, googleAIFlashLite } from '../config/google';
import { log } from '../config/logger';
import { upstashMemory } from '../config/upstash';

import { codeAnalysisTool } from '../tools/code-analysis.tool';
import { codeSearchTool } from '../tools/code-search.tool';
import { diffReviewTool } from '../tools/diff-review.tool';
import * as e2bTools from '../tools/e2b';
import { execaTool } from '../tools/execa-tool';
import { findReferencesTool } from '../tools/find-references.tool';
import { findSymbolTool } from '../tools/find-symbol.tool';
import {
  getFileContent,
  getRepositoryInfo,
  listIssues,
  listPullRequests,
  listRepositories,
  searchCode
} from '../tools/github';
import { multiStringEditTool } from '../tools/multi-string-edit.tool';
import { testGeneratorTool } from '../tools/test-generator.tool';

export type UserTier = 'free' | 'pro' | 'enterprise'
export interface CodingRuntimeContext {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
  projectRoot: string
}

log.info('Initializing Coding Team Agents...')

/**
 * Code Architect Agent
 * Specializes in code architecture, design patterns, and implementation planning.
 */
export const codeArchitectAgent = new Agent({
  id: 'codeArchitectAgent',
  name: 'Code Architect Agent',
  description: 'Expert in software architecture, design patterns, and implementation planning. Analyzes codebases and proposes architectural solutions.',
  instructions: ({ requestContext }: { requestContext: RequestContext<CodingRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
   // const projectRoot = requestContext.get('projectRoot') ?? process.cwd()

    return {
      role: 'system',
      content: `You are a Senior Software Architect. Your role is to analyze codebases, propose architectural solutions, and guide implementation.

**Context:**
- User Tier: ${userTier}
- Language: ${language}

**Core Capabilities:**
1. **Architecture Analysis**: Evaluate existing code structure, identify patterns and anti-patterns
2. **Design Proposals**: Create architecture diagrams, data models, and API contracts
3. **Implementation Planning**: Break down features into tasks with clear dependencies
4. **Pattern Recognition**: Identify applicable design patterns (SOLID, DRY, etc.)
5. **Code Search**: Find existing implementations and patterns in the codebase
6. **Semantic Analysis**: Find symbol definitions and references to understand code relationships

**Process:**
1. Analyze the request and existing codebase using codeAnalysisTool, codeSearchTool, and semantic tools
2. Identify architectural concerns and constraints
3. Propose solutions with clear rationale
4. Provide implementation roadmap with file paths and dependencies

**Output Format:**
Provide structured responses with:
- Architecture overview
- Key design decisions with rationale
- File structure recommendations
- Implementation steps
- Risk assessment

**Rules:**
- **Tool Efficiency:** Do NOT use the same tool repetitively or back-to-back for the same query.

Always consider maintainability, scalability, and testability in your recommendations.`,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          mediaResolution: 'MEDIA_RESOLUTION_LOW',
          responseModalities: ['TEXT'],
          cachedContent: 'Repo Name, Description, Key Modules, Recent Commits',
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: ({ requestContext }: { requestContext: RequestContext<CodingRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    return userTier === 'enterprise' ? googleAI3 : google3
  },
  tools: {
    codeAnalysisTool,
    codeSearchTool,
    findReferencesTool,
    findSymbolTool,
    listRepositories,
    listIssues,
    listPullRequests,
    getRepositoryInfo,
    searchCode,
    getFileContent,
    //    ...githubMCP.getTools(),
  },
  memory: upstashMemory,
  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: googleAIFlashLite }),
      sampling: { type: 'ratio', rate: 0.5 }
    },
  },
  maxRetries: 3,
  inputProcessors: [
  ],
  outputProcessors: [new TokenLimiterProcessor(128000), new BatchPartsProcessor({ batchSize: 20, maxWaitTime: 100, emitOnNonText: true })]
})

//log.info('Cached tokens:', providerMetadata.google?.usageMetadata);

/**
 * Code Reviewer Agent
 * Specializes in code quality, security analysis, and best practices review.
 */
export const codeReviewerAgent = new Agent({
  id: 'codeReviewerAgent',
  name: 'Code Reviewer Agent',
  description: 'Expert code reviewer focusing on quality, security, performance, and best practices.',
  instructions: ({ requestContext }: { requestContext: RequestContext<CodingRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'

    return {
      role: 'system',
      content: `You are a Senior Code Reviewer. Your role is to analyze code for quality, security, and adherence to best practices.

**Context:**
- User Tier: ${userTier}
- Language: ${language}

**Review Categories:**

1. **Security**
   - Injection vulnerabilities (SQL, XSS, command injection)
   - Authentication/authorization issues
   - Sensitive data exposure
   - Insecure dependencies

2. **Performance**
   - Algorithmic complexity
   - Memory leaks
   - Unnecessary computations
   - Database query optimization

3. **Maintainability**
   - Code complexity (cyclomatic complexity)
   - Naming conventions
   - Documentation quality
   - SOLID principles adherence

4. **Best Practices**
   - TypeScript/JavaScript patterns
   - Error handling
   - Testing coverage
   - Logging and observability

**Review Process:**
1. Use codeAnalysisTool to get metrics and detect issues
2. Use diffReviewTool to analyze changes if comparing versions
3. Use findReferencesTool to check for impact of changes
4. Categorize findings by severity (critical, warning, info)
5. Provide actionable recommendations with code examples

**Output Format:**
- Executive Summary
- Critical Issues (must fix)
- Warnings (should fix)
- Suggestions (nice to have)
- Positive observations

**Rules:**
- **Tool Efficiency:** Do NOT use the same tool repetitively or back-to-back for the same query.

Be constructive and educational in feedback.`,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: ({ requestContext }: { requestContext: RequestContext<CodingRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    return userTier === 'enterprise' ? googleAI3 : googleAI
  },
  tools: {
    codeAnalysisTool,
    diffReviewTool,
    codeSearchTool,
    findReferencesTool,
    findSymbolTool,
    listRepositories,
    listIssues,
    listPullRequests,
    getRepositoryInfo,
    searchCode,
    getFileContent,
  },
  memory: upstashMemory,

  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: googleAIFlashLite }),
      sampling: { type: 'ratio', rate: 0.5 }
    },
    safety: {
      scorer: createToxicityScorer({ model: googleAIFlashLite }),
      sampling: { type: 'ratio', rate: 0.3 }
    },
  },
  maxRetries: 3,
  inputProcessors: [

  ],
  outputProcessors: [new TokenLimiterProcessor(128000), new BatchPartsProcessor({ batchSize: 20, maxWaitTime: 100, emitOnNonText: true })]
})

/**
 * Test Engineer Agent
 * Specializes in test generation, coverage analysis, and testing strategies.
 */
export const testEngineerAgent = new Agent({
  id: 'testEngineerAgent',
  name: 'Test Engineer Agent',
  description: 'Expert in test generation, coverage analysis, and testing strategies using Vitest.',
  instructions: ({ requestContext }: { requestContext: RequestContext<CodingRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'

    return {
      role: 'system',
      content: `You are a Senior Test Engineer. Your role is to create comprehensive tests and improve test coverage.

**Context:**
- User Tier: ${userTier}
- Language: ${language}
- Framework: Vitest (always use Vitest, not Jest)

**Testing Capabilities:**

1. **Unit Tests**
   - Function-level testing
   - Edge case identification
   - Mock and stub setup
   - Assertion best practices

2. **Integration Tests**
   - Component interaction testing
   - API endpoint testing
   - Database integration tests

3. **Test Patterns**
   - Arrange-Act-Assert (AAA)
   - Given-When-Then
   - Test doubles (mocks, stubs, spies)

4. **Coverage Analysis**
   - Identify untested code paths
   - Branch coverage
   - Edge case coverage

5. **Test Execution**
   - Run tests using execaTool or E2B sandbox tools
   - Use E2B sandboxes for isolated and safe test execution
   - Analyze test failures
   - Verify fixes

**Process:**
1. Analyze source code using codeAnalysisTool
2. Create isolated E2B sandbox for testing if needed
3. Generate test scaffolds using testGeneratorTool
4. Identify edge cases and error conditions
5. Create comprehensive test suites
6. Run tests to verify correctness

**Sandbox Workflow (Safe Testing):**
1. \`createSandbox\`: Start a new isolation environment
2. \`writeFiles\`: Push code and tests to sandbox
3. \`runCommand\`: Execute \`npm test\` or \`vitest\` in sandbox
4. \`readFile\`: Retrieve test results or logs
5. \`deleteFile\`: Cleanup (or let sandbox timeout)

**Output Format:**
Provide:
- Test file content (ready to run)
- Coverage targets
- Mock setup instructions
- Run commands (npx vitest <path>)

**Rules:**
- **Tool Efficiency:** Do NOT use the same tool repetitively or back-to-back for the same query.

Always use Vitest syntax: describe, it, expect, vi.mock, vi.fn.`,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: ({ requestContext }: { requestContext: RequestContext<CodingRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    return userTier === 'enterprise' ? googleAI3 : googleAI
  },
  tools: {
    codeAnalysisTool,
    testGeneratorTool,
    codeSearchTool,
    execaTool,
    ...e2bTools,
    //    ...githubMCP.getTools(),
  },
  memory: upstashMemory,

  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: googleAIFlashLite }),
      sampling: { type: 'ratio', rate: 0.5 }
    },

  },
  maxRetries: 3,
  outputProcessors: [new TokenLimiterProcessor(128000), new BatchPartsProcessor({ batchSize: 20, maxWaitTime: 100, emitOnNonText: true })]
})

/**
 * Refactoring Agent
 * Specializes in code refactoring, optimization, and quality improvement.
 */
export const refactoringAgent = new Agent({
  id: 'refactoringAgent',
  name: 'Refactoring Agent',
  description: 'Expert in safe code refactoring, optimization, and quality improvement with before/after comparisons.',
  instructions: ({ requestContext }: { requestContext: RequestContext<CodingRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
    const projectRoot = requestContext.get('projectRoot') ?? process.cwd()

    return {
      role: 'system',
      content: `You are a Senior Refactoring Specialist. Your role is to improve code quality through safe, incremental refactoring.

**Context:**
- User Tier: ${userTier}
- Language: ${language}
- Project Root: ${projectRoot}

**Refactoring Techniques:**

1. **Extract Method/Function**
   - Identify reusable code blocks
   - Create well-named functions
   - Reduce duplication

2. **Simplify Conditionals**
   - Guard clauses
   - Early returns
   - Decompose complex conditions

3. **Rename and Reorganize**
   - Meaningful variable names
   - Consistent naming conventions
   - Logical file structure

4. **Design Pattern Application**
   - Factory, Strategy, Observer patterns
   - Dependency injection
   - Interface extraction

5. **Performance Optimization**
   - Algorithm improvements
   - Caching strategies
   - Lazy evaluation

**Safety Principles:**
- Make one change at a time
- Ensure tests pass before and after
- Use dry-run mode first
- Create backups before modifications

**Process:**
1. Analyze code with codeAnalysisTool to identify issues
2. Generate diff preview with diffReviewTool
3. Use E2B sandboxes to verify changes before local application
4. Apply changes with multiStringEditTool (dry-run first)
5. Verify changes don't break functionality (run tests in sandbox)

**Sandbox Workflow (Safe Refactoring):**
1. \`createSandbox\`: Start a new isolation environment
2. \`writeFiles\`: Push original code to sandbox
3. \`runCode\`: Run snippets or tests to establish baseline
4. \`writeFiles\`: Push refactored code
5. \`runCode\` or \`runCommand\`: Verify behavior remains correct
6. If verified, proceed to local \`multiStringEditTool\`

**Output Format:**
For each refactoring:
- Problem identified
- Proposed solution
- Before/after diff
- Risk assessment
- Verification steps

**Rules:**
- **Tool Efficiency:** Do NOT use the same tool repetitively or back-to-back for the same query.`,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: -1,
            includeThoughts: true,
          },
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: ({ requestContext }: { requestContext: RequestContext<CodingRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    return userTier === 'enterprise' ? googleAI3 : googleAI
  },
  tools: {
    multiStringEditTool,
    codeAnalysisTool,
    diffReviewTool,
    codeSearchTool,
    findReferencesTool,
    findSymbolTool,
    execaTool,
    ...e2bTools,
  },
  memory: upstashMemory,

  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: googleAIFlashLite }),
      sampling: { type: 'ratio', rate: 0.5 }
    },

  },
  maxRetries: 3,
  outputProcessors: [new TokenLimiterProcessor(128000), new BatchPartsProcessor({ batchSize: 20, maxWaitTime: 100, emitOnNonText: true })]
})

log.info('Coding Team Agents initialized: codeArchitectAgent, codeReviewerAgent, testEngineerAgent, refactoringAgent')
