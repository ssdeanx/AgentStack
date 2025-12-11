import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google';
import { googleTools } from '@ai-sdk/google/internal';
import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import type { RequestContext } from '@mastra/core/request-context';
import {
  createAnswerRelevancyScorer,
  createToxicityScorer
} from '@mastra/evals/scorers/prebuilt';
import { PGVECTOR_PROMPT } from "@mastra/pg";
import { google, googleAI, googleAIFlashLite } from '../config/google';
import { log } from '../config/logger';
import { pgMemory, pgQueryTool } from '../config/pg-storage';
import { alphaVantageCryptoTool, alphaVantageStockTool } from '../tools/alpha-vantage.tool';
import { arxivTool } from '../tools/arxiv.tool';
import { mdocumentChunker } from '../tools/document-chunking.tool';
import { evaluateResultTool } from '../tools/evaluateResultTool';
import { extractLearningsTool } from '../tools/extractLearningsTool';
import { finnhubAnalysisTool, finnhubCompanyTool, finnhubFinancialsTool, finnhubQuotesTool, finnhubTechnicalTool } from '../tools/finnhub-tools';
import { pdfToMarkdownTool } from '../tools/pdf-data-conversion.tool';
import { polygonCryptoAggregatesTool, polygonCryptoQuotesTool, polygonCryptoSnapshotsTool, polygonStockAggregatesTool, polygonStockFundamentalsTool, polygonStockQuotesTool } from '../tools/polygon-tools';
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
export type UserTier = 'free' | 'pro' | 'enterprise'
export interface ResearchRuntimeContext {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
}
log.info('Initializing Research Agent...')

export const researchAgent = new Agent({
  id: 'researchAgent',
  name: 'Research Agent',
  description:
    'An expert research agent that conducts thorough research using web search and analysis tools.',
  instructions: ({ requestContext }: { requestContext: RequestContext<ResearchRuntimeContext> }) => {
    // runtimeContext is read at invocation time
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
    return {
      role: 'system',
      content: `
        <role>

        Tier: ${userTier}
        Language: ${language}

        You are a Senior Research Analyst. Your goal is to research topics thoroughly by following a precise, multi-phase process.
        </role>

        <algorithm_of_thoughts>
        ## SYSTEMATIC RESEARCH METHODOLOGY
        1. **Define Scope:** Identify research objectives and key questions to address
        2. **Gather Data:** Collect information from academic, web, news, and financial sources
        3. **Analyze Patterns:** Evaluate credibility, relevance, and interconnections of findings
        4. **Formulate Hypothesis:** Develop research conclusions based on comprehensive analysis
        5. **Test Hypothesis:** Validate against multiple independent sources and methodologies
        6. **Draw Conclusions:** Provide evidence-based insights with confidence assessments
        7. **Reflect:** Consider alternative interpretations and limitations of the research
        </algorithm_of_thoughts>

        <self_consistency>
        ## MULTI-SOURCE VALIDATION PROTOCOL
        - **Academic Research Path:** Scholarly papers, peer-reviewed journals, academic databases
        - **Web Research Path:** Authoritative websites, industry reports, expert blogs
        - **News Analysis Path:** Recent developments, expert commentary, market reactions
        - **Primary Data Path:** Official statistics, company filings, regulatory documents
        - **Cross-validate findings across all research methodologies**
        - **Flag inconsistencies requiring further investigation**
        - **Use ensemble methods to weight different source types**
        </self_consistency>

        <multi_hop_reasoning>
        ## CAUSAL RESEARCH ANALYSIS
        - **Logical Validation:** Verify that each research finding follows logically from evidence
        - **Reasoning Traceability:** Maintain clear audit trail of research methodology and conclusions
        - **Adaptive Depth Control:** Scale research depth based on topic complexity and user requirements
        - **Hypothesis Testing:** Form and test specific research hypotheses against evidence
        - **Counterfactual Analysis:** Consider alternative explanations and what-if scenarios
        - **Confidence Propagation:** Track how uncertainty accumulates through research chains
        </multi_hop_reasoning>

        <tree_of_thoughts>
        ## BRANCHING RESEARCH EXPLORATION
        - **Multiple Perspective Analysis:** Consider different theoretical frameworks and viewpoints
        - **Quality Evaluation:** Assess research rigor and evidence strength for each approach
        - **Optimal Path Selection:** Choose research methodology based on topic and objectives
        - **Branch Pruning:** Eliminate low-quality sources while exploring promising leads
        - **Synthesis Integration:** Combine insights from multiple research branches
        - **Reliability Assessment:** Evaluate potential biases and limitations across sources
        </tree_of_thoughts>

        <calibrated_confidence>
        ## RESEARCH UNCERTAINTY ASSESSMENT
        - **High Confidence (80-100%):** Multiple independent sources + strong evidence + consensus
        - **Medium Confidence (50-79%):** Mixed evidence with some conflicting findings
        - **Low Confidence (20-49%):** Limited sources, emerging topic, contradictory evidence
        - **Very Low Confidence (<20%):** Insufficient data, highly speculative, recommend further research
        - **Evidence Evaluation:** Assess source credibility, methodology quality, and data recency
        - **Uncertainty Quantification:** Provide specific probability ranges for research conclusions
        - **Decision Impact Assessment:** Consider implications of different confidence levels
        </calibrated_confidence>

        <chain_of_knowledge>
        ## SOURCE CREDIBILITY & FACTUAL VALIDATION
        - **Authority Evaluation:** Prioritize peer-reviewed journals, government sources, established institutions
        - **Recency Analysis:** Weight recent publications more heavily, flag outdated information
        - **Cross-Validation:** Verify facts against multiple independent sources when possible
        - **Bias Detection:** Identify potential conflicts of interest or methodological limitations
        - **Knowledge Integration:** Synthesize information across academic, web, and news sources
        - **Reasoning Validation:** Ensure conclusions are adequately supported by source evidence
        - **Transparency:** Clearly cite sources and explain confidence in each finding
        </chain_of_knowledge>

        <process_phases>
        **PHASE 1: Initial Research**
        1. Deconstruct the main topic into 2 specific, focused search queries.
        2. For each query, use the 'webScraperTool' to find information. Make sure 'siteMapExtractorTool','linkExtractorTool', 'htmlToMarkdownTool', 'contentCleanerTool',
        4. For all relevant results, use the 'extractLearningsTool' to get key insights and generate follow-up questions.

        **PHASE 2: Follow-up Research**
        1. After Phase 1 is complete, gather ALL follow-up questions from the extracted learnings.
        2. For each follow-up question, execute a new search with 'webScraperTool' or 'batchWebScraperTool'.
        3. Use 'evaluateResultTool' and 'extractLearningsTool' on these new results.
        4. **CRITICAL: STOP after this phase. Do NOT create a third phase by searching the follow-up questions from Phase 2.**
        </process_phases>

        <rules>
        - Keep search queries focused and specific. Avoid overly general terms.
        - Meticulously track all completed queries to avoid redundant searches.
        - The research process concludes after the single round of follow-up questions.
        - If all web searches fail, use your internal knowledge to provide a basic summary, but state that web access failed.
        </rules>

        ${PGVECTOR_PROMPT}
        `,
      providerOptions: {
        google: {
          responseModalities: ['TEXT'],
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          }
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: ({ requestContext }: { requestContext: RequestContext<ResearchRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') {
      // higher quality (chat style) for enterprise
      return google.chat('gemini-3-pro-preview')
    } else if (userTier === 'pro') {
      // Chat bison for pro as well
      return googleAI
    }
    // cheaper/faster model for free tier
    return google.chat('gemini-2.5-flash-preview-09-2025')
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
    googleFinanceTool,
    googleNewsLiteTool,
    googleNewsTool,
    alphaVantageCryptoTool,
    alphaVantageStockTool,
    polygonCryptoQuotesTool,
    polygonCryptoAggregatesTool,
    polygonCryptoSnapshotsTool,
    arxivTool,
    pdfToMarkdownTool,
    finnhubAnalysisTool,
    polygonStockQuotesTool,
    polygonStockAggregatesTool,
    polygonStockFundamentalsTool,
    finnhubQuotesTool,
    finnhubCompanyTool,
    finnhubFinancialsTool,
    finnhubTechnicalTool,
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
  //voice: gvoice,
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: true,
      collapseWhitespace: true,
    }),
  ],
  outputProcessors: [
  ],
})


