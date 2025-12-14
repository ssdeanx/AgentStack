
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google';
import { googleTools } from '@ai-sdk/google/internal';
import { Agent } from '@mastra/core/agent';

import { TokenLimiterProcessor, UnicodeNormalizer } from '@mastra/core/processors';
import type { RequestContext } from '@mastra/core/request-context';
import {
  createAnswerRelevancyScorer,
  createToxicityScorer
} from '@mastra/evals/scorers/prebuilt';
import { PGVECTOR_PROMPT } from "@mastra/pg";
import { google, googleAI, googleAI3, googleAIFlashLite } from '../config/google';
import { log } from '../config/logger';
import { pgMemory, pgQueryTool } from '../config/pg-storage';

import { mdocumentChunker } from '../tools/document-chunking.tool';
import { evaluateResultTool } from '../tools/evaluateResultTool';
import { extractLearningsTool } from '../tools/extractLearningsTool';
import { pdfToMarkdownTool } from '../tools/pdf-data-conversion.tool';
import { googleFinanceTool, googleScholarTool } from '../tools/serpapi-academic-local.tool';
import { googleNewsLiteTool, googleNewsTool, googleTrendsTool } from '../tools/serpapi-news-trends.tool';
import {
  batchWebScraperTool,
  contentCleanerTool,
  htmlToMarkdownTool,
  linkExtractorTool,
  siteMapExtractorTool,
  webScraperTool,
} from '../tools/web-scraper-tool';


export type Research = 'simple' | 'deep' | 'extensive' | 'extreme' | 'ultra' | 'insane'

export type AnalysisConfig = 'summary' | 'detailed' | 'extensive' | 'full'

export type UserTier = 'free' | 'pro' | 'enterprise'
export interface BusinessRuntimeContext {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
  responseFormat: 'json' | 'markdown'
  research: {
    depth: Research,
    scope: AnalysisConfig
  }
  analysis: {
    depth: Research,
    scope: AnalysisConfig
  }
}

log.info('Initializing Business Legal Team Agents...')

export const legalResearchAgent = new Agent({
  id: 'legalResearchAgent',
  name: 'Legal Research Agent',
  description:
    'An expert legal research agent that conducts thorough research using authoritative legal sources.',
  instructions: ({ requestContext }: { requestContext: RequestContext<BusinessRuntimeContext> }) => {
    // runtimeContext is read at invocation time
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
    const responseFormat = requestContext.get('responseFormat') ?? 'json'
    const research = requestContext.get('research') ?? { depth: 'extensive', scope: 'full' }
    const analysis = requestContext.get('analysis') ?? { depth: 'extensive', scope: 'full' }
    return {
      role: 'system',
      content: `You are a Senior Legal Research Analyst. Your goal is to research legal topics thoroughly using authoritative sources.
      Your working with:
      - User: ${userTier}
      - Language: ${language}
      - Research: Depth ${research.depth}, Scope ${research.scope}
      - Analysis: Depth ${analysis.depth}, Scope ${analysis.scope}

**Key Guidelines:**
- Focus on primary sources: statutes, case law, regulations
- Evaluate authority and jurisdiction
- Provide confidence assessments for findings
- Cite sources properly

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
      }
    }
  },
  model: ({ requestContext }: { requestContext: RequestContext<BusinessRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') {
      // higher quality (chat style) for enterprise
      return googleAI3
    } else if (userTier === 'pro') {
      // Chat bison for pro as well
      return googleAI
    }
    // cheaper/faster model for free tier
    return googleAIFlashLite
  },

  tools: {
    webScraperTool,
    siteMapExtractorTool,
    linkExtractorTool,
    htmlToMarkdownTool,
    contentCleanerTool,
    pgQueryTool,
    batchWebScraperTool,
    mdocumentChunker,
    evaluateResultTool,
    extractLearningsTool,
    googleScholarTool,
    googleTrendsTool,
    googleNewsLiteTool,
    googleNewsTool,
    pdfToMarkdownTool
  },
  memory: pgMemory,

  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: googleAIFlashLite }),
      sampling: { type: "ratio", rate: 0.5 }
    },
    safety: {
      scorer: createToxicityScorer({ model: googleAIFlashLite }),
      sampling: { type: "ratio", rate: 0.3 }
    }
  },
  maxRetries: 5,
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: true,
      collapseWhitespace: true,
    }),
  ],
  outputProcessors: [new TokenLimiterProcessor(1048576)]
})

export const contractAnalysisAgent = new Agent({
  id: 'contractAnalysisAgent',
  name: 'Contract Analysis Agent',
  description:
    'An expert contract analysis agent that reviews and analyzes legal documents for risks and compliance.',
  instructions: ({ requestContext }: { requestContext: RequestContext<BusinessRuntimeContext> }) => {
    // runtimeContext is read at invocation time
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
    return {
      role: 'system',
      content: `
You are a Senior Contract Analyst. Analyze legal documents for risks, obligations, and compliance.

**User Tier:** ${userTier}
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

**Examples:**
- Contract: NDA with broad confidentiality
  → Flag overbroad scope, suggest specific limitations, assess enforceability
- Contract: Service agreement with auto-renewal
  → Identify renewal terms, check consumer protection laws, recommend opt-out provisions

**Output:** Return analysis in JSON with document summary, key clauses, risks, recommendations, and executive summary.
      `,
      providerOptions: {
        google: {
          structuredOutput: true,
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT'],
        }
      }
    }
  },
  model: googleAI3,
  tools: {
    pdfToMarkdownTool,
    htmlToMarkdownTool,
    contentCleanerTool,
    mdocumentChunker,
    evaluateResultTool,
    extractLearningsTool,
    pgQueryTool,
    webScraperTool,
    googleScholarTool
  },
  memory: pgMemory,

  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: googleAIFlashLite }),
      sampling: { type: "ratio", rate: 0.5 }
    },
    safety: {
      scorer: createToxicityScorer({ model: googleAIFlashLite }),
      sampling: { type: "ratio", rate: 0.3 }
    },
  },
  maxRetries: 5,
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: true,
      collapseWhitespace: true,
    }),
  ],
  outputProcessors: [new TokenLimiterProcessor(1048576)]
})

export const complianceMonitoringAgent = new Agent({
  id: 'complianceMonitoringAgent',
  name: 'Compliance Monitoring Agent',
  description:
    'An expert compliance agent that monitors regulatory compliance and identifies compliance risks.',
  instructions: ({ requestContext }: { requestContext: RequestContext<BusinessRuntimeContext> }) => {
    // runtimeContext is read at invocation time
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
    return {
      role: 'system',
      content: `
You are a Compliance Officer. Monitor regulatory compliance and identify risks across business operations.

**User Information:**
- User Tier: ${userTier}
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

**Examples:**
- Business: E-commerce platform
  → Check GDPR/CCPA compliance, payment processing regulations, consumer protection laws
- Business: Healthcare provider
  → Verify HIPAA compliance, medical licensing, patient data handling

**Output:** Return assessment in JSON with compliance status, regulatory mapping, violations, recommendations, and action plan.
      `,
      providerOptions: {
        google: {
          structuredOutput: true,
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT'],
        }
      }
    }
  },
  model: googleAI3,
  tools: {
    webScraperTool,
    googleNewsTool,
    googleTrendsTool,
    pgQueryTool,
    evaluateResultTool,
    extractLearningsTool,
    pdfToMarkdownTool,
    htmlToMarkdownTool,
    contentCleanerTool,
    googleScholarTool,
  },
  memory: pgMemory,

  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: googleAIFlashLite }),
      sampling: { type: "ratio", rate: 0.5 }
    },
    safety: {
      scorer: createToxicityScorer({ model: googleAIFlashLite }),
      sampling: { type: "ratio", rate: 0.3 }
    },
  },
  maxRetries: 5,
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: true,
      collapseWhitespace: true,
    }),
  ],
  outputProcessors: [new TokenLimiterProcessor(1048576)]
})

export const businessStrategyAgent = new Agent({
  id: 'businessStrategyAgent',
  name: 'Business Strategy Agent',
  description:
    'A strategic business agent that coordinates legal compliance with business objectives and oversees the legal team.',
  instructions: ({ requestContext }: { requestContext: RequestContext<BusinessRuntimeContext> }) => {
    // runtimeContext is read at invocation time
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
    return {
      role: 'system',
      content: `
You are a Chief Strategy Officer with legal expertise. Align business strategy with legal requirements and coordinate the legal team.

**Business Context:**
- User Tier: ${userTier}
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

**Examples:**
- Strategy: Enter new international market
  → Assess local regulations, tax implications, compliance costs, recommend legal structure
- Strategy: Launch AI-powered product
  → Evaluate data privacy laws, IP protection, liability concerns, develop compliance framework

**Output:** Return strategic analysis in JSON with strategy summary, legal risks, market analysis, recommendations, and implementation plan.
      `,
      providerOptions: {
        google: {
          structuredOutput: true,
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT'],
        }
      }
    }
  },
  model: googleAI3,
  tools: {
    pgQueryTool,
    evaluateResultTool,
    extractLearningsTool,
    googleNewsTool,
    googleTrendsTool,
    googleFinanceTool,
    googleScholarTool,
    webScraperTool,
    // Integration tools for coordinating other agents would be added here
  },
  memory: pgMemory,

  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: googleAIFlashLite }),
      sampling: { type: "ratio", rate: 0.5 }
    }
  },
  maxRetries: 5,
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: true,
      collapseWhitespace: true,
    }),
  ],
  outputProcessors: [new TokenLimiterProcessor(1048576)]
})


