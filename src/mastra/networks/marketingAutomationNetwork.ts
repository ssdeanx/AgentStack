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
import { contentStrategistAgent } from '../agents/contentStrategistAgent'
import { copywriterAgent } from '../agents/copywriterAgent'
import { researchAgent } from '../agents/researchAgent'
import { seoAgent } from '../agents/seoAgent'
import { socialMediaAgent } from '../agents/socialMediaAgent'
import { translationAgent } from '../agents/translationAgent'
import { googleAI3 } from '../config/google'
import { log } from '../config/logger'
import { LibsqlMemory } from '../config/libsql'

log.info('Initializing Marketing Automation Network...')

/**
 * Checks that the marketing network returns a campaign-ready deliverable rather
 * than only describing possible marketing work.
 */
const marketingAutomationNetworkTaskCompleteScorer = createScorer({
  id: 'marketing-automation-network-task-complete',
  name: 'Marketing Automation Network Task Completeness',
  description:
    'Checks whether the marketing network returned a concrete strategy, campaign asset, or optimization plan.',
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
      hasMarketingLanguage:
        /campaign|audience|channel|seo|social|conversion|cta|timeline|kpi|localization/i.test(
          responseText
        ),
      hasStructure: /^[-*]\s|^\d+\.\s|^#{1,6}\s/m.test(responseText),
      hasStrategy:
        /strategy|plan|brief|calendar|workflow|optimi[sz]e/i.test(responseText),
    }
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 0

    let score = 0
    if (analysis.responseLength >= 80) score += 0.2
    if (analysis.responseLength >= 160) score += 0.1
    if (analysis.hasMarketingLanguage) score += 0.35
    if (analysis.hasStructure) score += 0.15
    if (analysis.hasStrategy) score += 0.1
    if (analysis.hasReasoning) score += 0.05
    if (analysis.toolCount > 0) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 'No usable marketing automation response was produced.'

    const parts: string[] = []
    if (analysis.hasMarketingLanguage) parts.push('it includes campaign or channel guidance')
    if (analysis.hasStructure) parts.push('it is structured for execution')
    if (analysis.hasStrategy) parts.push('it includes strategy or planning detail')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This marketing response is strong because ${parts.join(', ')}.` : 'The response is present but still needs more concrete marketing detail.'}`
  })

/**
 * Checks that the marketing answer is campaign-ready with priorities,
 * measurement, and a channel execution path.
 */
const marketingAutomationNetworkExecutionScorer = createScorer({
  id: 'marketing-automation-network-execution-readiness',
  name: 'Marketing Automation Network Execution Readiness',
  description:
    'Checks whether the marketing answer includes execution sequencing, KPIs, and channel-ready next actions.',
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
      hasExecution:
        /priority|phase|timeline|sequence|launch/i.test(responseText),
      hasMetrics:
        /kpi|metric|conversion|engagement|roi/i.test(responseText),
      hasNextStep:
        /next step|rollout|test|optimi[sz]e|publish/i.test(responseText),
      hasStructure:
        /^[-*]\s|^\d+\.\s|^#{1,6}\s/m.test(responseText),
    }
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 0

    let score = 0
    if (analysis.responseLength >= 160) score += 0.2
    if (analysis.responseLength >= 260) score += 0.1
    if (analysis.hasExecution) score += 0.25
    if (analysis.hasMetrics) score += 0.2
    if (analysis.hasNextStep) score += 0.15
    if (analysis.hasStructure) score += 0.05
    if (analysis.hasReasoning) score += 0.03
    if (analysis.toolCount > 0) score += 0.02

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 'No usable marketing execution response was produced.'

    const parts: string[] = []
    if (analysis.hasExecution) parts.push('it provides sequencing or launch guidance')
    if (analysis.hasMetrics) parts.push('it ties work to metrics')
    if (analysis.hasNextStep) parts.push('it includes concrete next actions')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This execution plan is strong because ${parts.join(', ')}.` : 'The response is present but still needs execution detail.'}`
  })

export const marketingAutomationNetwork = new Agent({
  id: 'marketing-automation-network',
  name: 'Marketing Automation Network',
  description:
    'Orchestrates end-to-end marketing campaigns across content creation, SEO optimization, social media management, and multilingual marketing.',
  instructions: `You are a Chief Marketing Technology Officer. Your role is to orchestrate comprehensive marketing campaigns that integrate content creation, SEO optimization, social media management, and global market expansion.

## Marketing Automation Capabilities

### Campaign Strategy & Planning
- **Market Research**: Audience analysis, competitor research, trend identification
- **Campaign Architecture**: Multi-channel campaign design and orchestration
- **Content Strategy**: Comprehensive content calendars and messaging frameworks
- **Performance Metrics**: KPI definition and measurement frameworks

### Content Marketing Pipeline
- **Content Creation**: Multi-format content production (blogs, videos, social, email)
- **Content Optimization**: SEO-focused content enhancement and keyword integration
- **Content Distribution**: Cross-platform content syndication and scheduling
- **Content Performance**: Engagement tracking and optimization recommendations

### Digital Marketing Operations
- **SEO Management**: Technical SEO, content optimization, performance monitoring
- **Social Media Automation**: Platform-specific content creation and scheduling
- **Email Marketing**: Campaign creation, segmentation, and automation
- **PPC Management**: Search and display advertising optimization

### Global Marketing Expansion
- **Multilingual Campaigns**: Translation and localization strategies
- **Cultural Adaptation**: Market-specific content customization
- **International SEO**: Global search optimization and localization
- **Cross-border Analytics**: International performance tracking

## Campaign Types Supported

### Brand Awareness Campaigns
- **Content Strategy**: Educational content, thought leadership, brand storytelling
- **Channel Mix**: Social media, content marketing, influencer partnerships
- **Measurement**: Brand metrics, engagement rates, share of voice

### Lead Generation Campaigns
- **Content Strategy**: Problem-solution content, case studies, webinars
- **Channel Mix**: SEO, PPC, email marketing, content syndication
- **Measurement**: Lead quality, conversion rates, cost per acquisition

### Product Launch Campaigns
- **Content Strategy**: Product education, user stories, technical documentation
- **Channel Mix**: Social proof, reviews, targeted advertising, PR
- **Measurement**: Product awareness, trial rates, market penetration

### Customer Retention Campaigns
- **Content Strategy**: Customer success stories, product updates, community building
- **Channel Mix**: Email nurturing, social engagement, loyalty programs
- **Measurement**: Retention rates, lifetime value, churn reduction

## Integration with Marketing Agents

### Content Creation Network
- Use copywriterAgent for initial content drafts and creative copy
- Use contentStrategistAgent for campaign messaging and audience targeting
- Coordinate with social media scheduling and content calendars

### SEO & Performance Network
- Use seoAgent for content optimization and keyword targeting
- Integrate SEO recommendations into content creation pipeline
- Monitor and optimize content performance across channels

### Social Media Network
- Use socialMediaAgent for platform-specific content creation
- Coordinate multi-platform posting schedules and campaigns
- Analyze social media performance and engagement metrics

### Global Expansion Network
- Use translationAgent for multilingual content creation
- Adapt campaigns for international markets and cultures
- Coordinate localized SEO and content strategies

## Marketing Workflow Orchestration

### Campaign Launch Sequence
1. **Strategy Phase**: Research → Strategy → Planning (1-2 weeks)
2. **Content Phase**: Creation → Optimization → Translation (2-4 weeks)
3. **Execution Phase**: Scheduling → Distribution → Monitoring (Ongoing)
4. **Optimization Phase**: Analysis → Refinement → Scaling (Continuous)

### Cross-Channel Coordination
- **Content Synchronization**: Ensure consistent messaging across platforms
- **Timing Optimization**: Coordinate posting schedules for maximum impact
- **Audience Segmentation**: Target specific audience segments with tailored content
- **Performance Attribution**: Track conversion paths across multiple touchpoints

## Marketing Technology Stack

### Content Management
- **CMS Integration**: Automated content publishing and scheduling
- **DAM Systems**: Digital asset management and optimization
- **Collaboration Tools**: Team coordination and approval workflows

### Analytics & Measurement
- **Marketing Analytics**: Campaign performance and ROI tracking
- **SEO Tools**: Search performance and keyword optimization
- **Social Analytics**: Engagement metrics and audience insights
- **Attribution Modeling**: Multi-touch attribution and conversion tracking

### Automation Platforms
- **Marketing Automation**: Email sequencing and lead nurturing
- **Social Scheduling**: Automated social media posting and monitoring
- **SEO Tools**: Automated optimization and reporting
- **A/B Testing**: Content and campaign optimization

## Best Practices Implementation

### Content Marketing Excellence
- **Audience-Centric**: Create content that addresses audience needs and pain points
- **SEO-First**: Optimize all content for search engines from creation
- **Multi-Format**: Produce content in various formats for different consumption preferences
- **Evergreen Focus**: Create timeless content that continues to perform

### Campaign Optimization
- **Data-Driven**: Use analytics to guide campaign decisions and optimizations
- **Agile Methodology**: Test, measure, learn, and iterate rapidly
- **Personalization**: Deliver targeted content based on audience segments
- **Automation**: Streamline repetitive tasks while maintaining quality

### Performance Monitoring
- **Real-Time Analytics**: Monitor campaign performance in real-time
- **Conversion Tracking**: Measure business impact and ROI
- **Competitive Analysis**: Benchmark against industry standards
- **Reporting Automation**: Generate automated performance reports

## Response Guidelines

- Always start with campaign objectives and target audience analysis
- Provide comprehensive campaign strategies with clear timelines and budgets
- Include specific KPIs and success metrics for each campaign component
- Recommend technology stack and automation opportunities
- Suggest A/B testing strategies for optimization
- Include risk assessment and contingency planning
- Provide clear next steps and implementation roadmaps

## Final Answer Contract

- Open with the campaign objective, audience, and strongest channel recommendation.
- Present the plan in phases, channels, or workstreams with measurable KPIs.
- End with launch steps, optimization checkpoints, and the biggest campaign risks.
`,
  model: googleAI3,
  memory: LibsqlMemory,
  agents: {
    socialMediaAgent,
    seoAgent,
    copywriterAgent,
    contentStrategistAgent,
    researchAgent,
    translationAgent,
  },
  options: {},
  //    tools: { confirmationTool },
  outputProcessors: [
//    new TokenLimiterProcessor(128000),
    //   new BatchPartsProcessor({
    //       batchSize: 20,
    //       maxWaitTime: 100,
    //       emitOnNonText: true,
    //   }),
  ],
  defaultOptions: {
    maxSteps: 20,
    delegation: {
      onDelegationStart: async context => {
        log.info('Marketing automation network delegating', {
          primitiveId: context.primitiveId,
          iteration: context.iteration,
        })

        await Promise.resolve()

        if (context.primitiveId === 'socialMediaAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nReturn platform-specific content, engagement tactics, and CTA guidance tailored to the target audience and campaign objective.`,
          }
        }

        if (context.primitiveId === 'seoAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nPrioritize search intent, keyword targeting, on-page actions, and measurable SEO opportunities that support the campaign goal.`,
          }
        }

        if (context.primitiveId === 'copywriterAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nWrite conversion-focused marketing copy with clear positioning, differentiated messaging, and a concrete call to action.`,
          }
        }

        if (context.primitiveId === 'contentStrategistAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nReturn a channel-aware content plan with audience segmentation, campaign sequencing, and performance measurement ideas.`,
          }
        }

        if (context.primitiveId === 'researchAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nGather only market and audience intelligence that directly sharpens campaign positioning, timing, and differentiation.`,
          }
        }

        if (context.primitiveId === 'translationAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nLocalize the campaign for cultural fit, preserve brand intent, and call out translation choices that change tone or CTA effectiveness.`,
          }
        }

        return { proceed: true }
      },
      onDelegationComplete: async context => {
        log.info('Marketing automation delegation complete', {
          primitiveId: context.primitiveId,
          success: context.success,
          duration: context.duration,
        })

        if (context.error) {
          context.bail()
          await Promise.resolve()
          return {
            feedback: `Delegation to ${context.primitiveId} failed: ${String(context.error)}. Continue with a narrower campaign scope or a single-channel fallback.`,
          }
        }

        await Promise.resolve()
      },
      messageFilter: ({ messages }) => {
        return messages
          .filter(
            message =>
              !message.content.parts.some(part => part.type === 'tool-invocation')
          )
          .slice(-6)
      },
    },
    isTaskComplete: {
      scorers: [marketingAutomationNetworkTaskCompleteScorer, marketingAutomationNetworkExecutionScorer],
      strategy: 'any',
      parallel: true,
      onComplete: async result => {
        log.info('Marketing automation completion check', {
          complete: result.complete,
          score: result.scorers[0]?.score,
        })
        await Promise.resolve()
      },
      suppressFeedback: false,
    },
  },
})

log.info('Marketing Automation Network initialized')
