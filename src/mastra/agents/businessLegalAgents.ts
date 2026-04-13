import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'

import {
  TokenLimiterProcessor,
  UnicodeNormalizer,
} from '@mastra/core/processors'
import type { RequestContext } from '@mastra/core/request-context'
import type { AgentRequestContext } from './request-context'
import { PGVECTOR_PROMPT } from '@mastra/pg'
import {
  googleAI3,
} from '../config/google'
import { log } from '../config/logger'

import { InternalSpans } from '@mastra/core/observability'
import { libsqlChunker } from '../tools/document-chunking.tool'
import { evaluateResultTool } from '../tools/evaluateResultTool'
import { extractLearningsTool } from '../tools/extractLearningsTool'
import {
  googleFinanceTool,
  googleScholarTool,
} from '../tools/serpapi-academic-local.tool'
import {
  googleNewsLiteTool,
  googleNewsTool,
  googleTrendsTool,
} from '../tools/serpapi-news-trends.tool'
import { fetchTool } from '../tools'
import { LibsqlMemory, libsqlQueryTool } from '../config/libsql'


type Research = 'simple' | 'deep' | 'extensive' | 'extreme' | 'ultra' | 'insane'

type AnalysisConfig = 'summary' | 'detailed' | 'extensive' | 'full'

export type BusinessRuntimeContext = AgentRequestContext<{
  responseFormat: 'json' | 'markdown'
  research: {
    depth: Research
    scope: AnalysisConfig
  }
  analysis: {
    depth: Research
    scope: AnalysisConfig
  }
}>

const isResearchConfig = (value: unknown): value is BusinessRuntimeContext['research'] => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const maybe = value as { depth?: unknown; scope?: unknown }
  return typeof maybe.depth === 'string' && typeof maybe.scope === 'string'
}

log.info('Initializing Business Legal Team Agents...')

export const legalResearchAgent = new Agent({
  id: 'legalResearchAgent',
  name: 'Legal Research Agent',
  description:
    'An expert legal research agent that conducts thorough research using authoritative legal sources.',
  instructions: ({
    requestContext,
  }: {
    requestContext: RequestContext<BusinessRuntimeContext>
  }) => {
    // runtimeContext is read at invocation time
    const roleValue = requestContext.get('role')
    const role = typeof roleValue === 'string' ? roleValue : 'user'
    const languageValue = requestContext.get('language')
    const language = typeof languageValue === 'string' ? languageValue : 'en'
    const researchValue = requestContext.get('research')
    const research = isResearchConfig(researchValue) ? researchValue : {
      depth: 'extensive',
      scope: 'full',
    }
    const analysisValue = requestContext.get('analysis')
    const analysis = isResearchConfig(analysisValue) ? analysisValue : {
      depth: 'extensive',
      scope: 'full',
    }
    return {
      role: 'system',
      content: `You are a Senior Legal Research Analyst. Your goal is to research legal topics thoroughly using authoritative sources.
                              Your working with:
                              - Role: ${role}
                              - Language: ${language}
                              - Research: Depth ${research.depth}, Scope ${research.scope}
                              - Analysis: Depth ${analysis.depth}, Scope ${analysis.scope}

                        **Key Guidelines:**
                        - Focus on primary sources: statutes, case law, regulations
                        - Evaluate authority and jurisdiction
                        - Provide confidence assessments for findings
                        - Cite sources properly

                        **Rules:**
                        - **Tool Efficiency:** Do NOT use the same tool repetitively or back-to-back for the same query.

                        **Process:**
                        1. Break down legal issues into specific queries
                        2. Search authoritative databases
                        3. Evaluate relevance and authority
                        4. Extract key insights and follow-up questions
                        5. Synthesize findings with confidence levels

                        **Examples:**
                        - Query: "Breach of contract remedies in California"
                          → Research California Civil Code, relevant case law, provide summary with citations
                        - Query: "Data privacy regulations for EU businesses"
                          → Analyze GDPR requirements, enforcement cases, compliance implications

                        **Output:** Return findings in JSON format with queries, results, summary, sources, and confidence level.
                        ${PGVECTOR_PROMPT}
                              `,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
    }
  },
  model: ({ requestContext }) => {
    const role = requestContext.get('role') ?? 'user'
    if (role === 'admin') {
      // higher quality (chat style) for admin
      return "google/gemini-3.1-pro-preview"
    }
    // cheaper/faster model for user tier
    return "google/gemini-3.1-flash-lite-preview"
  },

  tools: {
    fetchTool,
    libsqlChunker,
    evaluateResultTool,
    extractLearningsTool,
    googleScholarTool,
    googleTrendsTool,
    googleNewsLiteTool,
    googleNewsTool,
  },
  memory: LibsqlMemory,
  options: {
    tracingPolicy: {
      internal: InternalSpans.ALL,
    },
  },
  scorers: {
  },
  maxRetries: 5,
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: true,
      collapseWhitespace: true,
    }),
  ],
  //outputProcessors: [new TokenLimiterProcessor(128000)],
  defaultOptions: {
    autoResumeSuspendedTools: true,
  },
})

export const contractAnalysisAgent = new Agent({
  id: 'contractAnalysisAgent',
  name: 'Contract Analysis Agent',
  description:
    'An expert contract analysis agent that reviews and analyzes legal documents for risks and compliance.',
  instructions: ({
    requestContext,
  }: {
    requestContext: RequestContext<BusinessRuntimeContext>
  }) => {
    // runtimeContext is read at invocation time
    const role = requestContext.get('role') ?? 'user'
    const language = requestContext.get('language') ?? 'en'
    return {
      role: 'system',
      content: `
You are a Senior Contract Analyst. Analyze legal documents for risks, obligations, and compliance.

**Role:** ${role}
**Language:** ${language}

**Analysis Framework:**
1. **Document Overview:** Identify type, parties, governing law, key terms
2. **Risk Assessment:** Evaluate high-risk clauses, ambiguities, unfavorable terms
3. **Compliance Check:** Verify against applicable laws and regulations
4. **Recommendations:** Provide specific improvements and redlines

**Key Focus Areas:**
- Payment terms and obligations
- Termination clauses
- Liability and indemnification
- Confidentiality and IP rights
- Dispute resolution

**Rules:**
- **Tool Efficiency:** Do NOT use the same tool repetitively or back-to-back for the same query.

**Examples:**
- Contract: NDA with broad confidentiality
  → Flag overbroad scope, suggest specific limitations, assess enforceability
- Contract: Service agreement with auto-renewal
  → Identify renewal terms, check consumer protection laws, recommend opt-out provisions

**Output:** Return analysis in JSON with document summary, key clauses, risks, recommendations, and executive summary.
      `,
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
  model: googleAI3,
  tools: {
    fetchTool,
    libsqlChunker,
    evaluateResultTool,
    extractLearningsTool,
    libsqlQueryTool,

    googleScholarTool,
  },
  memory: LibsqlMemory,

  scorers: {
  },
  maxRetries: 5,
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: true,
      collapseWhitespace: true,
    }),
  ],
  outputProcessors: [new TokenLimiterProcessor(1048576)],
  defaultOptions: {
    autoResumeSuspendedTools: true,
  },
})

export const complianceMonitoringAgent = new Agent({
  id: 'complianceMonitoringAgent',
  name: 'Compliance Monitoring Agent',
  description:
    'An expert compliance agent that monitors regulatory compliance and identifies compliance risks.',
  instructions: ({
    requestContext,
  }: {
    requestContext: RequestContext<BusinessRuntimeContext>
  }) => {
    // runtimeContext is read at invocation time
    const role = requestContext.get('role') ?? 'user'
    const language = requestContext.get('language') ?? 'en'
    return {
      role: 'system',
      content: `
You are a Compliance Officer. Monitor regulatory compliance and identify risks across business operations.

**User Information:**
- Role: ${role}
- Language: ${language}

**Monitoring Process:**
1. **Regulatory Mapping:** Identify applicable laws, regulations, standards
2. **Process Review:** Evaluate business processes against requirements
3. **Risk Assessment:** Detect gaps, vulnerabilities, potential violations
4. **Remediation:** Develop corrective actions and monitoring frameworks
5. **Reporting:** Generate compliance status and audit findings

**Priority Areas:**
- Data protection and privacy laws
- Financial regulations
- Employment and labor laws
- Industry-specific compliance
- Ethical standards

**Rules:**
- **Tool Efficiency:** Do NOT use the same tool repetitively or back-to-back for the same query.

**Examples:**
- Business: E-commerce platform
  → Check GDPR/CCPA compliance, payment processing regulations, consumer protection laws
- Business: Healthcare provider
  → Verify HIPAA compliance, medical licensing, patient data handling

**Output:** Return assessment in JSON with compliance status, regulatory mapping, violations, recommendations, and action plan.
      `,
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
  model: googleAI3,
  tools: {
    googleNewsTool,
    googleTrendsTool,
    libsqlQueryTool,
    evaluateResultTool,
    extractLearningsTool,
    fetchTool,
    googleScholarTool,
  },
  memory: LibsqlMemory,

  scorers: {
  },
  maxRetries: 5,
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: true,
      collapseWhitespace: true,
    }),
  ],
//  outputProcessors: [new TokenLimiterProcessor(1048576)],
  defaultOptions: {
    autoResumeSuspendedTools: true,
  },
})

export const businessStrategyAgent = new Agent({
  id: 'businessStrategyAgent',
  name: 'Business Strategy Agent',
  description:
    'A strategic business agent that coordinates legal compliance with business objectives and oversees the legal team.',
  instructions: ({
    requestContext,
  }: {
    requestContext: RequestContext<BusinessRuntimeContext>
  }) => {
    // runtimeContext is read at invocation time
    const role = requestContext.get('role') ?? 'user'
    const language = requestContext.get('language') ?? 'en'
    return {
      role: 'system',
      content: `
You are a Chief Strategy Officer with legal expertise. Align business strategy with legal requirements and coordinate the legal team.

**Business Context:**
- Role: ${role}
- Language: ${language}

**Strategy Framework:**
1. **Business Analysis:** Define objectives, assess market opportunities
2. **Legal Assessment:** Evaluate applicable laws, regulations, constraints
3. **Risk-Benefit Analysis:** Balance opportunities with legal/compliance risks
4. **Strategy Development:** Create legally compliant business initiatives
5. **Implementation:** Plan execution with legal safeguards and monitoring

**Integration Points:**
- Market expansion strategies
- Product development compliance
- Partnership and M&A legal considerations
- Regulatory change adaptation
- Risk management frameworks

**Rules:**
- **Tool Efficiency:** Do NOT use the same tool repetitively or back-to-back for the same query.

**Examples:**
- Strategy: Enter new international market
  → Assess local regulations, tax implications, compliance costs, recommend legal structure
- Strategy: Launch AI-powered product
  → Evaluate data privacy laws, IP protection, liability concerns, develop compliance framework

**Output:** Return strategic analysis in JSON with strategy summary, legal risks, market analysis, recommendations, and implementation plan.
      `,
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
  model: googleAI3,
  tools: {
    libsqlQueryTool,
    evaluateResultTool,
    extractLearningsTool,
    googleNewsTool,
    googleTrendsTool,
    googleFinanceTool,
    googleScholarTool,
    fetchTool,
    // Integration tools for coordinating other agents would be added here
  },
  memory: LibsqlMemory,

  scorers: {
  },
  maxRetries: 5,
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: true,
      collapseWhitespace: true,
    }),
  ],
  outputProcessors: [new TokenLimiterProcessor(1048576)],
  //defaultOptions: {
  //      autoResumeSuspendedTools: true,
  // },
})
