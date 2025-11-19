import { Agent } from '@mastra/core/agent'

import { evaluateResultTool } from '../tools/evaluateResultTool'
import { extractLearningsTool } from '../tools/extractLearningsTool'
import {
    webScraperTool,
    batchWebScraperTool,
    siteMapExtractorTool,
    linkExtractorTool,
    htmlToMarkdownTool,
    contentCleanerTool,
} from '../tools/web-scraper-tool'
import { log } from '../config/logger'
import { pgMemory, pgQueryTool } from '../config/pg-storage'
import { googleAI, googleAI3, googleAIFlashLite } from '../config/google'
import {
  createAnswerRelevancyScorer,
  createToxicityScorer
} from "@mastra/evals/scorers/llm";
import { mdocumentChunker } from '../tools/document-chunking.tool'
import { googleFinanceTool, googleScholarTool } from '../tools/serpapi-academic-local.tool'
import { googleNewsLiteTool, googleNewsTool, googleTrendsTool } from '../tools/serpapi-news-trends.tool'
import { alphaVantageCryptoTool, alphaVantageStockTool } from '../tools/alpha-vantage.tool'
import { polygonCryptoAggregatesTool, polygonCryptoQuotesTool, polygonCryptoSnapshotsTool, polygonStockAggregatesTool, polygonStockFundamentalsTool, polygonStockQuotesTool } from '../tools/polygon-tools'
import { arxivTool } from '../tools/arxiv.tool'
import { pdfToMarkdownTool } from '../tools/pdf-data-conversion.tool'
import { finnhubAnalysisTool, finnhubCompanyTool, finnhubFinancialsTool, finnhubQuotesTool, finnhubTechnicalTool } from '../tools/finnhub-tools'
import { researchCompletenessScorer, sourceDiversityScorer, summaryQualityScorer } from '../scorers/custom-scorers'
import { InternalSpans } from '@mastra/core/ai-tracing'
import { CompositeVoice } from '@mastra/core/voice'


export interface ResearchAgentContext {
    userId?: string
    tier?: 'free' | 'pro' | 'enterprise'
    researchDepth?: number
}

log.info('Initializing Research Agent...')

export const researchAgent = new Agent({
    id: 'research',
    name: 'Research Agent',
    description:
        'An expert research agent that conducts thorough research using web search and analysis tools.',
    instructions: ({ runtimeContext }) => {
        const userId = runtimeContext.get('userId')
        const tier = runtimeContext.get('tier')
        const researchDepth = runtimeContext.get('researchDepth')
        return `
        <role>
        User: ${userId ?? 'admin'}
        Tier: ${tier ?? 'enterprise'}
        Research Depth: ${researchDepth ?? '1-5'}
        You are a Senior Research Analyst. Your goal is to research topics thoroughly by following a precise, multi-phase process.
        Today's date is ${new Date().toISOString()}
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
        2. For each query, use the \`webSearchTool\` to find information.
        3. For each result, use the \`evaluateResultTool\` to determine relevance.
        4. For all relevant results, use the \`extractLearningsTool\` to get key insights and generate follow-up questions.

        **PHASE 2: Follow-up Research**
        1. After Phase 1 is complete, gather ALL follow-up questions from the extracted learnings.
        2. For each follow-up question, execute a new search with \`webSearchTool\`.
        3. Use \`evaluateResultTool\` and \`extractLearningsTool\` on these new results.
        4. **CRITICAL: STOP after this phase. Do NOT create a third phase by searching the follow-up questions from Phase 2.**
        </process_phases>

        <rules>
        - Keep search queries focused and specific. Avoid overly general terms.
        - Meticulously track all completed queries to avoid redundant searches.
        - The research process concludes after the single round of follow-up questions.
        - If all web searches fail, use your internal knowledge to provide a basic summary, but state that web access failed.
        </rules>

        <output_format>
        CRITICAL: You must return the final findings in a single, valid JSON object. Do not add any text outside of the JSON structure.
        Example:
        {      "queries": ["initial query 1", "initial query 2", "follow-up question 1"],
            "queries": ["initial query 1", "initial query 2", "follow-up question 1"],
            "searchResults": [ { "url": "...", "title": "..." } ],
            "learnings": [ { "insight": "...", "followUp": "..." } ],
            "completedQueries": ["initial query 1", "initial query 2", "follow-up question 1"],
            "phase": "follow-up",
            "summary": "A concise summary of the key findings.",
            "data": "The detailed, synthesized data, often in Markdown format.",
            "sources": [
                { "url": "...", "title": "..." }
            ]
        }
        </output_format>
        `
    },
    model: googleAI3,
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
        finnhubTechnicalTool
    },
    memory: pgMemory,
    options: { tracingPolicy: { internal: InternalSpans.ALL } },
    scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: googleAIFlashLite }),
      sampling: { type: "ratio", rate: 0.5 }
    },
    safety: {
      scorer: createToxicityScorer({ model: googleAIFlashLite }),
      sampling: { type: "ratio", rate: 0.3 }
    },
    sourceDiversity: {
      scorer: sourceDiversityScorer,
      sampling: { type: "ratio", rate: 0.5 }
    },
    researchCompleteness: {
      scorer: researchCompletenessScorer,
      sampling: { type: "ratio", rate: 0.7 }
    },
    summaryQuality: {
      scorer: summaryQualityScorer,
      sampling: { type: "ratio", rate: 0.6 }
    },
  },
  maxRetries: 5,
  voice: new CompositeVoice({
//    input: {
//      listeningModel: 'googleAIFlashLite',
//      speechModel: 'googleAIFlashLite'
    })
})

