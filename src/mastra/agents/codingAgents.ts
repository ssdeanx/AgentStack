import { Agent } from '@mastra/core/agent'

import type { GoogleGenerativeAIProviderOptions, GoogleLanguageModelOptions } from '@ai-sdk/google'

import { log } from '../config/logger'

import { InternalSpans } from '@mastra/core/observability'
import {
  getFileContent,
  getRepositoryInfo,
  listIssues,
  listPullRequests,
  listRepositories,
  searchCode,
} from '../tools/github'
import {
  getLanguageFromContext,
  resolveModelFromContext,
  getRoleFromContext,
  type AgentRequestContext,
} from './request-context'
import { LibsqlMemory } from '../config/libsql'

export type CodingRuntimeContext = AgentRequestContext<{
  projectRoot: string
}>

log.info('Initializing Coding Team Agents...')

const CODE_PROJECT_ROOT_CONTEXT_KEY = 'projectRoot' as const

const codeArchitectTools = {
  getRepositoryInfo,
  getFileContent,
  searchCode,
  listRepositories,
  listPullRequests,
  listIssues,
}

const codeReviewerTools = {
  getRepositoryInfo,
  getFileContent,
  searchCode,
}

const testEngineerTools = {

}

const refactoringTools = {
  searchCode,
  getFileContent,
  getRepositoryInfo,
}

/**
 * Code Architect Agent.
 *
 * Specializes in code architecture, design patterns, and implementation planning.
 */
export const codeArchitectAgent = new Agent({
  id: 'codeArchitectAgent',
  name: 'Code Architect Agent',
  description:
    'Expert in software architecture, design patterns, and implementation planning. Analyzes codebases and proposes architectural solutions.',
  instructions: ({ requestContext }) => {
    const role = getRoleFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)
    // const projectRoot = requestContext.get('projectRoot') ?? process.cwd()

    return {
      role: 'system',
      content: `You are a Senior Software Architect. Your role is to analyze codebases, propose architectural solutions, and guide implementation.

**Context:**
- Role: ${role}
- Language: ${language}

**Core Capabilities:**
1. **Architecture Analysis**: Evaluate existing code structure, identify patterns and anti-patterns
2. **Design Proposals**: Create architecture diagrams, data models, and API contracts
3. **Implementation Planning**: Break down features into tasks with clear dependencies
4. **Pattern Recognition**: Identify applicable design patterns (SOLID, DRY, etc.)
5. **Code Search**: Find existing implementations and patterns in the codebase
6. **Workspace Search/Edit**: Use workspace read/search/edit tools and LSP diagnostics to trace relationships safely

**Process:**
1. Analyze the request and existing codebase using workspace search/read tools and sandbox checks
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
          cachedContent:
            'Repo Name, Description, Key Modules, Recent Commits',
        } satisfies GoogleLanguageModelOptions,
      },
    }
  },
  model: ({ requestContext }) => {
    const role = getRoleFromContext(requestContext)
    return role === 'admin' ? 'google/gemini-3.1-flash-preview' : 'google/gemini-3.1-flash-lite-preview'
  },
  tools: codeArchitectTools,
  memory: LibsqlMemory,
  scorers: {
  },
  maxRetries: 3,
  options: {
    tracingPolicy: {
      internal: InternalSpans.AGENT,
    },
  },
  inputProcessors: [],
  outputProcessors: [
//    new TokenLimiterProcessor(128000),
    //     new BatchPartsProcessor({
    //         batchSize: 20,
    //         maxWaitTime: 100,
    //         emitOnNonText: true,
    //     }),
  ],
})

//log.info('Cached tokens:', providerMetadata.google?.usageMetadata);

/**
 * Code Reviewer Agent.
 *
 * Specializes in code quality, security analysis, and best practices review.
 */
export const codeReviewerAgent = new Agent({
  id: 'codeReviewerAgent',
  name: 'Code Reviewer Agent',
  description:
    'Expert code reviewer focusing on quality, security, performance, and best practices.',
  instructions: ({ requestContext }) => {
    const role = getRoleFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)

    return {
      role: 'system',
      content: `You are a Senior Code Reviewer. Your role is to analyze code for quality, security, and adherence to best practices.

**Context:**
- Role: ${role}
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
1. Use workspace search/read tools to inspect impacted files
2. Use workspace search/read tools to inspect impacted files
3. Use workspace edit tools with LSP diagnostics enabled for safe refactors
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
      },
    }
  },
  model: ({ requestContext }) => {
    return resolveModelFromContext(requestContext, {
      user: 'google/gemini-3.1-flash-lite-preview',
      admin: 'google/gemini-3.1-flash-preview',
    })
  },
  tools: codeReviewerTools,
  memory: LibsqlMemory,
  options: {
    tracingPolicy: {
      internal: InternalSpans.AGENT,
    },
  },
  scorers: {
  },
  maxRetries: 3,
  inputProcessors: [],
  outputProcessors: [
 //   new TokenLimiterProcessor(128000),
    //  new BatchPartsProcessor({
    //      batchSize: 20,
    //      maxWaitTime: 100,
    //      emitOnNonText: true,
    // }),
  ],
})

/**
 * Test Engineer Agent.
 *
 * Specializes in test generation, coverage analysis, and testing strategies.
 */
export const testEngineerAgent = new Agent({
  id: 'testEngineerAgent',
  name: 'Test Engineer Agent',
  description:
    'Expert in test generation, coverage analysis, and testing strategies using Vitest.',
  instructions: ({ requestContext }) => {
    const role = getRoleFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)

    return {
      role: 'system',
      content: `You are a Senior Test Engineer. Your role is to create comprehensive tests and improve test coverage.

**Context:**
- Role: ${role}
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
1. Analyze source code using workspace search/read tools
2. Create isolated E2B sandbox for testing if needed
3. Generate test scaffolds using workspace edit tools and existing test patterns
4. Identify edge cases and error conditions
5. Create comprehensive test suites
6. Run tests to verify correctness

**Sandbox Workflow:**
- Use your inter workspace/sandbox tools to use your sandbox environment for test execution and verification. This allows you to safely run tests and verify fixes without affecting the main codebase.


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
      },
    }
  },
  model: ({ requestContext }) => {
    return resolveModelFromContext(requestContext, {
      user: 'google/gemini-3.1-flash-lite-preview',
      admin: 'google/gemini-3.1-flash-preview',
    })
  },
  tools: testEngineerTools,
  memory: LibsqlMemory,
  options: {
    tracingPolicy: {
      internal: InternalSpans.AGENT,
    },
  },
  scorers: {
  },
  maxRetries: 3,
  outputProcessors: [
    //new TokenLimiterProcessor(128000),
    //  new BatchPartsProcessor({
    //      batchSize: 20,
    //      maxWaitTime: 100,
    //     emitOnNonText: true,
    // }),
  ],
  // defaultOptions: {
  //     autoResumeSuspendedTools: true,
  // },
})

/**
 * Refactoring Agent.
 *
 * Specializes in code refactoring, optimization, and quality improvement.
 */
export const refactoringAgent = new Agent({
  id: 'refactoringAgent',
  name: 'Refactoring Agent',
  description:
    'Expert in safe code refactoring, optimization, and quality improvement with before/after comparisons.',
  instructions: ({ requestContext }) => {
    const role = getRoleFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)
    const rawProjectRoot = requestContext.get(CODE_PROJECT_ROOT_CONTEXT_KEY)
    const projectRoot =
      typeof rawProjectRoot === 'string' ? rawProjectRoot : process.cwd()

    return {
      role: 'system',
      content: `You are a Senior Refactoring Specialist. Your role is to improve code quality through safe, incremental refactoring.

  **Context:**
  - Role: ${role}
  - Language: ${language}
  - Project Root: ${projectRoot}

  **Refactoring Techniques:**
  1. **Extract Method/Function** - identify reusable code blocks and reduce duplication.
  2. **Simplify Conditionals** - use guard clauses and early returns.
  3. **Rename and Reorganize** - prefer meaningful names and logical file structure.
  4. **Design Pattern Application** - use patterns only when they improve clarity.
  5. **Performance Optimization** - consider algorithmic improvements and caching.

  **Safety Principles:**
  - Make one change at a time.
  - Verify behavior before and after the edit.
  - Use the workspace edit tools and review LSP diagnostics after every change.

  **Process:**
  1. Analyze code with workspace search/read tools to identify issues.
  2. Use workspace search/read tools to inspect the target region.
  3. Use a sandbox to verify changes before applying them locally.
  4. Apply changes with the workspace edit tool and review diagnostics.
  5. Re-run tests or checks in the sandbox if needed.

  **Output Format:**
  For each refactoring, provide the problem, the proposed solution, a before/after diff, risk, and verification steps.

  **Rules:**
   - **Tool Efficiency:** Do NOT use the same tool repetitively or back-to-back for the same query.
    - Prefer workspace tooling over custom file-manipulation helpers.`,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: -1,
            includeThoughts: true,
          },
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
    }
  },
  model: ({ requestContext }) => {
    return resolveModelFromContext(requestContext, {
      user: 'google/gemini-3.1-flash-lite-preview',
      admin: 'google/gemini-3.1-flash-preview',
    })
  },
  tools: refactoringTools,
  memory: LibsqlMemory,
  options: {
    tracingPolicy: {
      internal: InternalSpans.AGENT,
    },
  },
  scorers: {
  },
  maxRetries: 3,
  outputProcessors: [
  //  new TokenLimiterProcessor(128000),
    //   new BatchPartsProcessor({
    //       batchSize: 20,
    //       maxWaitTime: 100,
    //       emitOnNonText: true,
    //   }),
  ],
  // defaultOptions: {
  //    autoResumeSuspendedTools: true,
  //  },
})

log.info(
  'Coding Team Agents initialized: codeArchitectAgent, codeReviewerAgent, testEngineerAgent, refactoringAgent'
)
