import { Agent } from '@mastra/core/agent'
import { InternalSpans } from '@mastra/core/ai-tracing'
import { BatchPartsProcessor, UnicodeNormalizer } from '@mastra/core/processors'
import { RuntimeContext } from '@mastra/core/runtime-context'
import { createAnswerRelevancyScorer, createToxicityScorer } from '@mastra/evals/scorers/llm'

import { googleAI, googleAI3, googleAIFlashLite } from '../config/google'
import { log } from '../config/logger'
import { pgMemory } from '../config/pg-storage'

import { multiStringEditTool } from '../tools/multi-string-edit.tool'
import { codeAnalysisTool } from '../tools/code-analysis.tool'
import { testGeneratorTool } from '../tools/test-generator.tool'
import { diffReviewTool } from '../tools/diff-review.tool'
import { codeSearchTool } from '../tools/code-search.tool'

export type UserTier = 'free' | 'pro' | 'enterprise'
export type CodingRuntimeContext = {
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
  id: 'code-architect',
  name: 'Code Architect Agent',
  description: 'Expert in software architecture, design patterns, and implementation planning. Analyzes codebases and proposes architectural solutions.',
  instructions: ({ runtimeContext }: { runtimeContext: RuntimeContext<CodingRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    const language = runtimeContext.get('language') ?? 'en'
    const projectRoot = runtimeContext.get('projectRoot') ?? process.cwd()
    
    return {
      role: 'system',
      content: `You are a Senior Software Architect. Your role is to analyze codebases, propose architectural solutions, and guide implementation.

**Context:**
- User Tier: ${userTier}
- Language: ${language}
- Project Root: ${projectRoot}

**Core Capabilities:**
1. **Architecture Analysis**: Evaluate existing code structure, identify patterns and anti-patterns
2. **Design Proposals**: Create architecture diagrams, data models, and API contracts
3. **Implementation Planning**: Break down features into tasks with clear dependencies
4. **Pattern Recognition**: Identify applicable design patterns (SOLID, DRY, etc.)
5. **Code Search**: Find existing implementations and patterns in the codebase

**Process:**
1. Analyze the request and existing codebase using codeAnalysisTool and codeSearchTool
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

Always consider maintainability, scalability, and testability in your recommendations.`,
      providerOptions: {
        google: {
          structuredOutput: true,
          thinkingConfig: {
            thinkingLevel: userTier === 'enterprise' ? 'high' : 'medium',
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT'],
          maxOutputTokens: 32000,
          temperature: 0.3,
        }
      }
    }
  },
  model: ({ runtimeContext }: { runtimeContext: RuntimeContext<CodingRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    return userTier === 'enterprise' ? googleAI3 : googleAI
  },
  tools: {
    codeAnalysisTool,
    codeSearchTool,
  },
  memory: pgMemory,
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
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
    new UnicodeNormalizer({ stripControlChars: true, collapseWhitespace: true }),
  ],
  outputProcessors: [
    new BatchPartsProcessor({ batchSize: 5, maxWaitTime: 100, emitOnNonText: true }),
  ],
})

/**
 * Code Reviewer Agent
 * Specializes in code quality, security analysis, and best practices review.
 */
export const codeReviewerAgent = new Agent({
  id: 'code-reviewer',
  name: 'Code Reviewer Agent',
  description: 'Expert code reviewer focusing on quality, security, performance, and best practices.',
  instructions: ({ runtimeContext }: { runtimeContext: RuntimeContext<CodingRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    const language = runtimeContext.get('language') ?? 'en'
    
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
3. Categorize findings by severity (critical, warning, info)
4. Provide actionable recommendations with code examples

**Output Format:**
- Executive Summary
- Critical Issues (must fix)
- Warnings (should fix)
- Suggestions (nice to have)
- Positive observations

Be constructive and educational in feedback.`,
      providerOptions: {
        google: {
          structuredOutput: true,
          thinkingConfig: {
            thinkingLevel: userTier === 'enterprise' ? 'high' : 'medium',
            includeThoughts: true,
          },
          responseModalities: ['TEXT'],
          maxOutputTokens: 32000,
          temperature: 0.2,
        }
      }
    }
  },
  model: ({ runtimeContext }: { runtimeContext: RuntimeContext<CodingRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    return userTier === 'enterprise' ? googleAI3 : googleAI
  },
  tools: {
    codeAnalysisTool,
    diffReviewTool,
    codeSearchTool,
  },
  memory: pgMemory,
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
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
    new UnicodeNormalizer({ stripControlChars: true, collapseWhitespace: true }),
  ],
  outputProcessors: [
    new BatchPartsProcessor({ batchSize: 5, maxWaitTime: 100, emitOnNonText: true }),
  ],
})

/**
 * Test Engineer Agent
 * Specializes in test generation, coverage analysis, and testing strategies.
 */
export const testEngineerAgent = new Agent({
  id: 'test-engineer',
  name: 'Test Engineer Agent',
  description: 'Expert in test generation, coverage analysis, and testing strategies using Vitest.',
  instructions: ({ runtimeContext }: { runtimeContext: RuntimeContext<CodingRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    const language = runtimeContext.get('language') ?? 'en'
    
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

**Process:**
1. Analyze source code using codeAnalysisTool
2. Generate test scaffolds using testGeneratorTool
3. Identify edge cases and error conditions
4. Create comprehensive test suites

**Output Format:**
Provide:
- Test file content (ready to run)
- Coverage targets
- Mock setup instructions
- Run commands (npx vitest <path>)

Always use Vitest syntax: describe, it, expect, vi.mock, vi.fn.`,
      providerOptions: {
        google: {
          structuredOutput: true,
          thinkingConfig: {
            thinkingLevel: userTier === 'enterprise' ? 'high' : 'medium',
            includeThoughts: true,
          },
          responseModalities: ['TEXT'],
          maxOutputTokens: 32000,
          temperature: 0.2,
        }
      }
    }
  },
  model: ({ runtimeContext }: { runtimeContext: RuntimeContext<CodingRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    return userTier === 'enterprise' ? googleAI3 : googleAI
  },
  tools: {
    codeAnalysisTool,
    testGeneratorTool,
    codeSearchTool,
  },
  memory: pgMemory,
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
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
    new UnicodeNormalizer({ stripControlChars: true, collapseWhitespace: true }),
  ],
  outputProcessors: [
    new BatchPartsProcessor({ batchSize: 5, maxWaitTime: 100, emitOnNonText: true }),
  ],
})

/**
 * Refactoring Agent
 * Specializes in code refactoring, optimization, and quality improvement.
 */
export const refactoringAgent = new Agent({
  id: 'refactoring',
  name: 'Refactoring Agent',
  description: 'Expert in safe code refactoring, optimization, and quality improvement with before/after comparisons.',
  instructions: ({ runtimeContext }: { runtimeContext: RuntimeContext<CodingRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    const language = runtimeContext.get('language') ?? 'en'
    const projectRoot = runtimeContext.get('projectRoot') ?? process.cwd()
    
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
3. Apply changes with multiStringEditTool (dry-run first)
4. Verify changes don't break functionality

**Output Format:**
For each refactoring:
- Problem identified
- Proposed solution
- Before/after diff
- Risk assessment
- Verification steps`,
      providerOptions: {
        google: {
          structuredOutput: true,
          thinkingConfig: {
            thinkingLevel: userTier === 'enterprise' ? 'high' : 'medium',
            includeThoughts: true,
          },
          responseModalities: ['TEXT'],
          maxOutputTokens: 32000,
          temperature: 0.2,
        }
      }
    }
  },
  model: ({ runtimeContext }: { runtimeContext: RuntimeContext<CodingRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    return userTier === 'enterprise' ? googleAI3 : googleAI
  },
  tools: {
    multiStringEditTool,
    codeAnalysisTool,
    diffReviewTool,
    codeSearchTool,
  },
  memory: pgMemory,
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
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
    new UnicodeNormalizer({ stripControlChars: true, collapseWhitespace: true }),
  ],
  outputProcessors: [
    new BatchPartsProcessor({ batchSize: 5, maxWaitTime: 100, emitOnNonText: true }),
  ],
})

log.info('Coding Team Agents initialized: codeArchitectAgent, codeReviewerAgent, testEngineerAgent, refactoringAgent')
