import { Agent } from '@mastra/core/agent'
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
import { createSupervisorAgentPatternScorer } from '../scorers/supervisor-scorers'

log.info('Initializing SEO Agent...')

/**
 * Evaluates whether an SEO response covers research-backed optimization guidance,
 * prioritization, and concrete implementation detail.
 */
const seoTaskCompleteScorer = createSupervisorAgentPatternScorer({
  id: 'seo-task-complete',
  name: 'SEO Task Completeness',
  description:
    'Checks whether an SEO response includes keyword or SERP insight, actionable optimization guidance, and prioritization.',
  label: 'SEO completeness',
  emptyReason: 'No usable SEO response was produced.',
  weakReason: 'The response is present but still lacks optimization depth.',
  strongReasonPrefix: 'This SEO response is strong because',
  responseLengthThresholds: [
    { min: 160, weight: 0.15 },
    { min: 350, weight: 0.15 },
  ],
  minParagraphsForStructure: 3,
  structureWeight: 0.05,
  reasoningWeight: 0.03,
  toolWeight: 0.02,
  userMessageWeight: 0.05,
  systemMessageWeight: 0.05,
  signals: [
    {
      label: 'it includes keyword or SERP insight',
      regex: /keyword|serp|search intent|competitor/i,
      weight: 0.2,
    },
    {
      label: 'it covers on-page optimization',
      regex: /title|meta|header|internal link|content/i,
      weight: 0.15,
    },
    {
      label: 'it addresses technical SEO',
      regex: /technical|core web vitals|schema|crawl|index/i,
      weight: 0.15,
    },
    {
      label: 'it prioritizes the recommendations',
      regex: /priority|impact|effort|next step/i,
      weight: 0.15,
    },
  ],
})

/**
 * Evaluates whether the SEO response is execution-ready, prioritized, and tied
 * to measurable search performance outcomes.
 */
const seoActionabilityScorer = createSupervisorAgentPatternScorer({
  id: 'seo-actionability-readiness',
  name: 'SEO Actionability Readiness',
  description:
    'Checks whether an SEO response is prioritized, measurable, and easy to implement.',
  label: 'SEO actionability',
  emptyReason: 'No usable SEO actionability response was produced.',
  weakReason: 'The response is present but still lacks implementable detail.',
  strongReasonPrefix: 'This SEO plan is strong because',
  responseLengthThresholds: [
    { min: 140, weight: 0.15 },
    { min: 260, weight: 0.1 },
  ],
  structureWeight: 0.05,
  reasoningWeight: 0.03,
  toolWeight: 0.02,
  userMessageWeight: 0.05,
  systemMessageWeight: 0.05,
  signals: [
    {
      label: 'it prioritizes by impact or effort',
      regex: /priority|high impact|quick win|effort|impact/i,
      weight: 0.25,
    },
    {
      label: 'it ties changes to metrics',
      regex: /ranking|ctr|traffic|conversion|metric|measure/i,
      weight: 0.2,
    },
    {
      label: 'it gives actionable implementation steps',
      regex: /next step|implement|update|add|fix/i,
      weight: 0.2,
    },
  ],
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
