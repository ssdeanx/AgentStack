import { Agent } from '@mastra/core/agent'
import { createScorer } from '@mastra/core/evals'
import {
  extractAgentResponseMessages,
  extractInputMessages,
  extractToolCalls,
  getAssistantMessageFromRunOutput,
  getCombinedSystemPrompt,
  getReasoningFromRunOutput,
  getSystemMessagesFromRunInput,
  getUserMessageFromRunInput,
} from '@mastra/evals/scorers/utils'
import { log } from '../config/logger'

import { InternalSpans } from '@mastra/core/observability'
import { contentStrategistAgent } from './contentStrategistAgent'
import { evaluationAgent } from './evaluationAgent'
import { researchAgent } from './researchAgent'
import {
  getLanguageFromContext,
  getUserIdFromContext,
  getRoleFromContext,
} from './request-context'
import { LibsqlMemory } from '../config/libsql'

log.info('Initializing SEO Agent...')

/**
 * Evaluates whether an SEO response covers research-backed optimization guidance,
 * prioritization, and concrete implementation detail.
 */
const seoTaskCompleteScorer = createScorer({
  id: 'seo-task-complete',
  name: 'SEO Task Completeness',
  description:
    'Checks whether an SEO response includes keyword or SERP insight, actionable optimization guidance, and prioritization.',
  type: 'agent',
})
  .preprocess(({ run }) => {
    const userMessage = getUserMessageFromRunInput(run.input)
    const inputMessages = extractInputMessages(run.input)
    const systemMessages = getSystemMessagesFromRunInput(run.input)
    const systemPrompt = getCombinedSystemPrompt(run.input)
    const response = getAssistantMessageFromRunOutput(run.output)
    const responseMessages = extractAgentResponseMessages(run.output)
    const reasoning = getReasoningFromRunOutput(run.output)
    const { tools, toolCallInfos } = extractToolCalls(run.output)

    return {
      userMessage,
      inputMessages,
      systemMessages,
      systemPrompt,
      response,
      responseMessages,
      reasoning,
      tools,
      toolCallInfos,
    }
  })
  .analyze(({ results }) => {
    const {
      userMessage,
      inputMessages,
      systemMessages,
      systemPrompt,
      response,
      responseMessages,
      reasoning,
      tools,
      toolCallInfos,
    } = results.preprocessStepResult

    const responseText = (response ?? responseMessages.join('\n')).trim()

    return {
      hasUserMessage: Boolean(userMessage),
      inputMessageCount: inputMessages.length,
      systemMessageCount: systemMessages.length,
      systemPromptLength: systemPrompt.length,
      responseLength: responseText.length,
      hasResponse: responseText.length > 0,
      hasReasoning: Boolean(reasoning),
      toolCount: tools.length,
      toolCallCount: toolCallInfos.length,
      hasKeyword:
        /keyword|serp|search intent|competitor/i.test(responseText),
      hasOnPage:
        /title|meta|header|internal link|content/i.test(responseText),
      hasTechnical:
        /technical|core web vitals|schema|crawl|index/i.test(responseText),
      hasPriority:
        /priority|impact|effort|next step/i.test(responseText),
      hasStructure:
        /^#{1,6}\s|^[-*]\s|^\d+\.\s/m.test(responseText) ||
        responseText.split(/\n\s*\n/).filter(Boolean).length >= 3,
    }
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) {
      return 0
    }

    let score = 0
    if (analysis.responseLength >= 160) score += 0.15
    if (analysis.responseLength >= 350) score += 0.15
    if (analysis.hasKeyword) score += 0.2
    if (analysis.hasOnPage) score += 0.15
    if (analysis.hasTechnical) score += 0.15
    if (analysis.hasPriority) score += 0.15
    if (analysis.hasReasoning) score += 0.03
    if (analysis.toolCount > 0) score += 0.02
    if (analysis.hasStructure) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    const parts: string[] = []

    if (!analysis?.hasResponse) {
      return 'No usable SEO response was produced.'
    }

    if (analysis.hasKeyword) parts.push('it includes keyword or SERP insight')
    if (analysis.hasOnPage) parts.push('it covers on-page optimization')
    if (analysis.hasTechnical) parts.push('it addresses technical SEO')
    if (analysis.hasPriority) parts.push('it prioritizes the recommendations')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This SEO response is strong because ${parts.join(', ')}.` : 'The response is present but still lacks optimization depth.'}`
  })

/**
 * Evaluates whether the SEO response is execution-ready, prioritized, and tied
 * to measurable search performance outcomes.
 */
const seoActionabilityScorer = createScorer({
  id: 'seo-actionability-readiness',
  name: 'SEO Actionability Readiness',
  description:
    'Checks whether an SEO response is prioritized, measurable, and easy to implement.',
  type: 'agent',
})
  .preprocess(({ run }) => {
    const userMessage = getUserMessageFromRunInput(run.input)
    const inputMessages = extractInputMessages(run.input)
    const systemMessages = getSystemMessagesFromRunInput(run.input)
    const systemPrompt = getCombinedSystemPrompt(run.input)
    const response = getAssistantMessageFromRunOutput(run.output)
    const responseMessages = extractAgentResponseMessages(run.output)
    const reasoning = getReasoningFromRunOutput(run.output)
    const { tools, toolCallInfos } = extractToolCalls(run.output)

    return {
      userMessage,
      inputMessages,
      systemMessages,
      systemPrompt,
      response,
      responseMessages,
      reasoning,
      tools,
      toolCallInfos,
    }
  })
  .analyze(({ results }) => {
    const {
      userMessage,
      inputMessages,
      systemMessages,
      systemPrompt,
      response,
      responseMessages,
      reasoning,
      tools,
      toolCallInfos,
    } = results.preprocessStepResult

    const responseText = (response ?? responseMessages.join('\n')).trim()

    return {
      hasUserMessage: Boolean(userMessage),
      inputMessageCount: inputMessages.length,
      systemMessageCount: systemMessages.length,
      systemPromptLength: systemPrompt.length,
      responseLength: responseText.length,
      hasResponse: responseText.length > 0,
      hasReasoning: Boolean(reasoning),
      toolCount: tools.length,
      toolCallCount: toolCallInfos.length,
      hasImpact: /priority|high impact|quick win|effort|impact/i.test(responseText),
      hasMetrics:
        /ranking|ctr|traffic|conversion|metric|measure/i.test(responseText),
      hasAction:
        /next step|implement|update|add|fix/i.test(responseText),
      hasStructure:
        /^#{1,6}\s|^[-*]\s|^\d+\.\s/m.test(responseText),
    }
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) {
      return 0
    }

    let score = 0
    if (analysis.responseLength >= 140) score += 0.15
    if (analysis.responseLength >= 260) score += 0.1
    if (analysis.hasImpact) score += 0.25
    if (analysis.hasMetrics) score += 0.2
    if (analysis.hasAction) score += 0.2
    if (analysis.hasReasoning) score += 0.03
    if (analysis.toolCount > 0) score += 0.02
    if (analysis.hasStructure) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    const parts: string[] = []

    if (!analysis?.hasResponse) {
      return 'No usable SEO actionability response was produced.'
    }

    if (analysis.hasImpact) parts.push('it prioritizes by impact or effort')
    if (analysis.hasMetrics) parts.push('it ties changes to metrics')
    if (analysis.hasAction) parts.push('it gives actionable implementation steps')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This SEO plan is strong because ${parts.join(', ')}.` : 'The response is present but still lacks implementable detail.'}`
  })

export const seoAgent = new Agent({
  id: 'seo-agent',
  name: 'SEO Agent',
  description:
    'Optimizes content for search engines through keyword research, on-page optimization, technical SEO analysis, and performance tracking.',
  instructions: ({ requestContext }) => {
    const userTier = getRoleFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)
    const userId = getUserIdFromContext(requestContext) ?? 'anonymous'

    return {
      role: 'system',
      content: `# SEO Agent
User: ${userId} | Tier: ${userTier} | Lang: ${language}

You are an SEO Specialist and Content Optimizer. Your expertise covers all aspects of search engine optimization and content performance.

## Core SEO Capabilities

### Keyword Research & Analysis
- **Keyword Discovery**: Find relevant keywords with search volume and competition data
- **Intent Analysis**: Understand user search intent (informational, transactional, navigational)
- **Long-tail Keywords**: Identify specific, low-competition keyword opportunities
- **Competitor Analysis**: Analyze competitor keyword strategies and content gaps

### On-Page Optimization
- **Title Optimization**: Create compelling, keyword-rich titles under character limits
- **Meta Descriptions**: Write engaging meta descriptions that improve click-through rates
- **Header Structure**: Optimize H1-H6 tags for content hierarchy and keyword targeting
- **Content Optimization**: Improve content for target keywords while maintaining readability
- **Internal Linking**: Suggest internal link structures for better site architecture

### Technical SEO
- **Site Speed Analysis**: Identify performance bottlenecks and optimization opportunities
- **Mobile Optimization**: Ensure mobile-friendly design and fast loading
- **Core Web Vitals**: Optimize for Google's page experience metrics
- **Schema Markup**: Implement structured data for rich snippets
- **Crawlability**: Ensure search engines can properly crawl and index content

### Content Strategy
- **Topic Clustering**: Group related content for comprehensive topic coverage
- **Content Gaps**: Identify missing content opportunities in your niche
- **SERP Analysis**: Study search engine results pages for optimization opportunities
- **User Experience**: Optimize content for user engagement and dwell time

## SEO Tools Integration

### With Research Network
- Use researchAgent for competitor analysis and market research
- Use researchAgent for backlink opportunity identification
- Use researchAgent for content gap analysis

### With Content Network
- Use contentStrategistAgent for SEO-driven content planning
- Use evaluationAgent for content quality and SEO performance assessment

## SEO Best Practices

### Keyword Targeting
- **Primary Keywords**: Main topic keywords (1-2% density)
- **Secondary Keywords**: Supporting topic keywords (0.5-1% density)
- **LSI Keywords**: Latent semantic indexing terms for context
- **User Intent**: Match content to search intent, not just keywords

### Content Optimization
- **Readability**: Aim for 60+ Flesch reading score
- **Length**: Comprehensive content typically ranks better (2,000+ words for pillar content)
- **Structure**: Clear headings, bullet points, short paragraphs
- **Multimedia**: Images, videos, infographics for engagement

### Technical Excellence
- **Page Speed**: Target <3 second load times
- **Mobile-First**: Responsive design is critical
- **HTTPS**: Secure connections required
- **XML Sitemap**: Submit updated sitemaps to search engines

## Performance Tracking

### Key Metrics
- **Organic Traffic**: Monitor search-driven visits
- **Keyword Rankings**: Track position changes for target keywords
- **Click-Through Rates**: Optimize titles and meta descriptions
- **Dwell Time**: Measure user engagement on page
- **Conversion Rates**: Track goal completions from organic traffic

### Reporting
- **Monthly Reports**: Comprehensive SEO performance analysis
- **Keyword Tracking**: Position monitoring and trend analysis
- **Technical Audits**: Regular site health assessments
- **Competitor Monitoring**: Track competitor SEO activities

## Response Guidelines

- Always provide specific, actionable SEO recommendations
- Include keyword research data when relevant
- Explain the reasoning behind optimization suggestions
- Prioritize recommendations by impact and effort
- Include performance tracking suggestions
- Consider both immediate wins and long-term strategy

## Final Answer Contract

- Start with the highest-impact SEO conclusion or opportunity.
- Group recommendations into priorities, on-page changes, technical changes, and measurement.
- End with the first actions to take and the metrics that should improve if the plan works.
`,
    }
  },
  model: "google/gemini-3.1-flash-lite-preview",
  memory: LibsqlMemory,
  agents: {
    researchAgent,
    contentStrategistAgent,
    evaluationAgent,
  },
  options: {
    tracingPolicy: {
      internal: InternalSpans.ALL,
    },
  },
  defaultOptions: {
    delegation: {
      onDelegationStart: async context => {
        if (context.primitiveId === 'researchAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nFocus on keyword intent, SERP patterns, competitor gaps, and evidence-backed SEO opportunities. Return concise findings with sources or clearly stated evidence anchors.`,
            modifiedInstructions:
              'Act as an SEO researcher. Prioritize intent, SERP evidence, competitor gaps, and high-confidence opportunities over generic SEO advice.',
            modifiedMaxSteps: 7,
          }
        }

        if (context.primitiveId === 'contentStrategistAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nTranslate the SEO findings into a content brief with target audience, search intent, page angle, title direction, H1/H2 outline, and internal-link opportunities.`,
            modifiedInstructions:
              'Convert SEO findings into an actionable content brief with target intent, structure, and implementation priorities.',
            modifiedMaxSteps: 6,
          }
        }

        if (context.primitiveId === 'evaluationAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nEvaluate the SEO recommendations for impact, effort, completeness, and risk of over-optimization. Prioritize the most valuable corrections first.`,
            modifiedInstructions:
              'Review the SEO plan for impact, effort, completeness, and over-optimization risk. Return prioritized corrective guidance.',
            modifiedMaxSteps: 5,
          }
        }

        return { proceed: true }
      },
      onDelegationComplete: async context => {
        if (!context.error) {
          return
        }

        return {
          feedback: `Delegation to ${context.primitiveId} failed. Continue with the available SEO context, note the missing specialist input, and avoid making unsupported ranking claims.`,
        }
      },
      messageFilter: ({ messages }) => {
        return messages
          .filter(message =>
            message.content.parts.every(part => part.type !== 'tool-invocation')
          )
          .slice(-8)
      },
    },
    onIterationComplete: async context => {
      const feedback: string[] = []
      const text = context.text.trim()

      if (!/priority|quick win|impact|effort/i.test(text)) {
        feedback.push('Prioritize the recommendations by impact and effort.')
      }

      if (!/keyword|intent|serp|competitor/i.test(text)) {
        feedback.push('Include the search-intent or keyword evidence behind the recommendations.')
      }

      if (!/metric|ctr|traffic|ranking|conversion|measure/i.test(text)) {
        feedback.push('Tie the plan to measurable SEO outcomes or metrics.')
      }

      await Promise.resolve()
      return {
        continue: true,
        feedback: feedback.length > 0 ? feedback.join(' ') : undefined,
      }
    },
    isTaskComplete: {
      scorers: [seoTaskCompleteScorer, seoActionabilityScorer],
      strategy: 'any',
      parallel: true,
      onComplete: async result => {
        log.info('SEO completion check', {
          complete: result.complete,
          scores: result.scorers.map((scorer, index) => ({
            scorerIndex: index,
            score: scorer.score,
          })),
        })
        await Promise.resolve()
      },
      suppressFeedback: false,
    },
  },
})

log.info('SEO Agent initialized')
