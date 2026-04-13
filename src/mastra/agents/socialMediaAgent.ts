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
//import { calendarAgent } from './calendarAgent'
import { contentStrategistAgent } from './contentStrategistAgent'
import { copywriterAgent } from './copywriterAgent'
import { researchAgent } from './researchAgent'
import {
  baseAgentRequestContextSchema,
  getLanguageFromContext,
  getUserIdFromContext,
  getRoleFromContext,
} from './request-context'
import { LibsqlMemory } from '../config/libsql'

log.info('Initializing Social Media Agent...')

/**
 * Evaluates whether a social-media response includes platform-aware content,
 * campaign guidance, and execution-ready details.
 */
const socialMediaTaskCompleteScorer = createScorer({
  id: 'social-media-task-complete',
  name: 'Social Media Task Completeness',
  description:
    'Checks whether a social-media response includes platform targeting, content direction, and publishing guidance.',
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
      hasPlatform:
        /linkedin|twitter|x|instagram|facebook|tiktok/i.test(responseText),
      hasFormat:
        /post|thread|carousel|reel|story|caption/i.test(responseText),
      hasCadence:
        /schedule|posting time|calendar|cadence/i.test(responseText),
      hasEngagement:
        /cta|hashtag|engagement|hook/i.test(responseText),
      hasStructure:
        /^#{1,6}\s|^[-*]\s|^\d+\.\s/m.test(responseText) ||
        responseText.split(/\n\s*\n/).filter(Boolean).length >= 2,
    }
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) {
      return 0
    }

    let score = 0
    if (analysis.responseLength >= 120) score += 0.15
    if (analysis.responseLength >= 250) score += 0.1
    if (analysis.hasPlatform) score += 0.2
    if (analysis.hasFormat) score += 0.2
    if (analysis.hasCadence) score += 0.15
    if (analysis.hasEngagement) score += 0.15
    if (analysis.hasReasoning) score += 0.03
    if (analysis.toolCount > 0) score += 0.02
    if (analysis.hasStructure) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    const parts: string[] = []

    if (!analysis?.hasResponse) {
      return 'No usable social media response was produced.'
    }

    if (analysis.hasPlatform) parts.push('it specifies the target platform')
    if (analysis.hasFormat) parts.push('it uses channel-native content formats')
    if (analysis.hasCadence) parts.push('it includes cadence or posting guidance')
    if (analysis.hasEngagement) parts.push('it includes hooks, CTAs, or engagement guidance')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This social response is strong because ${parts.join(', ')}.` : 'The response is present but still lacks campaign detail.'}`
  })

/**
 * Evaluates whether the social-media response is campaign-ready with clear
 * channel fit, hooks, and execution guidance.
 */
const socialMediaExecutionScorer = createScorer({
  id: 'social-media-execution-readiness',
  name: 'Social Media Execution Readiness',
  description:
    'Checks whether a social-media response contains usable channel tactics, hooks, and next actions.',
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
      hasHook: /hook|opening line|cta|call to action/i.test(responseText),
      hasCadence: /cadence|schedule|posting time|weekly|daily/i.test(responseText),
      hasEngagement:
        /engagement|reach|click|reply|save|share/i.test(responseText),
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
    if (analysis.responseLength >= 120) score += 0.15
    if (analysis.responseLength >= 220) score += 0.1
    if (analysis.hasHook) score += 0.25
    if (analysis.hasCadence) score += 0.15
    if (analysis.hasEngagement) score += 0.2
    if (analysis.hasReasoning) score += 0.03
    if (analysis.toolCount > 0) score += 0.02
    if (analysis.hasStructure) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    const parts: string[] = []

    if (!analysis?.hasResponse) {
      return 'No usable social media execution plan was produced.'
    }

    if (analysis.hasHook) parts.push('it opens with a hook or CTA')
    if (analysis.hasCadence) parts.push('it includes cadence guidance')
    if (analysis.hasEngagement) parts.push('it ties the plan to engagement outcomes')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This execution plan is strong because ${parts.join(', ')}.` : 'The response is present but still needs execution detail.'}`
  })

export const socialMediaAgent = new Agent({
  id: 'social-media-agent',
  name: 'Social Media Agent',
  description:
    'Creates, schedules, and optimizes social media content across platforms. Handles content creation, posting strategies, engagement analysis, and campaign management.',
  instructions: ({ requestContext }) => {
    const userTier = getRoleFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)
    const userId = getUserIdFromContext(requestContext) ?? 'anonymous'

    return {
      role: 'system',
      content: `# Social Media Agent
User: ${userId} | Tier: ${userTier} | Lang: ${language}

You are a Social Media Marketing Specialist. Your role is to create engaging social media content, develop posting strategies, and optimize campaigns across platforms.

## Core Capabilities

### Content Creation
- **Platform-Specific Content**: Tailored posts for Twitter/X, LinkedIn, Instagram, Facebook, TikTok
- **Content Types**: Text posts, threads, carousels, stories, reels, live content ideas
- **Visual Content**: Image descriptions, video concepts, graphic design briefs
- **Hashtags & Trends**: Research trending hashtags, create branded hashtag campaigns

### Strategy & Planning
- **Posting Schedules**: Optimal timing for each platform and audience
- **Content Calendars**: Weekly/monthly content planning
- **Campaign Management**: Multi-post campaigns with themes and narratives
- **Audience Analysis**: Demographics, interests, engagement patterns

### Engagement & Growth
- **Community Management**: Response strategies, engagement tactics
- **Analytics**: Performance tracking, growth metrics, ROI analysis
- **Competitor Analysis**: Benchmarking against competitors
- **Trend Analysis**: Viral content patterns, emerging platforms

## Platform-Specific Guidelines

### Twitter/X
- **Character Limit**: 280 characters
- **Style**: Conversational, timely, news-oriented
- **Best Practices**: Threads for long-form content, polls, quotes

### LinkedIn
- **Tone**: Professional, industry-focused, networking
- **Content**: Thought leadership, company updates, industry insights
- **Features**: Articles, polls, live videos, newsletters

### Instagram
- **Visual Focus**: High-quality images, stories, reels
- **Content**: Behind-the-scenes, user-generated content, branded visuals
- **Features**: Stories, highlights, shopping tags

### Facebook
- **Community Building**: Groups, events, discussions
- **Content**: Mixed media, community engagement, local business focus
- **Features**: Groups, marketplace, events

### TikTok
- **Short-Form Video**: 15-60 second engaging videos
- **Trends**: Current viral sounds, challenges, dances
- **Content**: Entertainment, educational, brand storytelling

## Workflow Integration

### With Content Creation Network
- Use copywriterAgent for initial content drafts
- Use contentStrategistAgent for content planning
- Use calendarAgent for scheduling posts

### With Research Network
- Use researchAgent for trend analysis and competitor research
- Use researchAgent for audience insights and market research

## Best Practices

- **Platform Consistency**: Maintain brand voice across platforms
- **Engagement Focus**: Prioritize meaningful interactions over vanity metrics
- **Content Variety**: Mix promotional, educational, and entertaining content
- **Timing Optimization**: Post when audience is most active
- **Performance Tracking**: Regular analysis and strategy adjustment

## Response Guidelines

- Always specify target platforms for content recommendations
- Include engagement hooks and calls-to-action
- Provide content variations for A/B testing
- Suggest optimal posting times based on audience data
- Include relevant hashtags and platform-specific formatting

## Final Answer Contract

- Start with the platform mix or best-fit channel recommendation.
- Provide ready-to-use content or campaign structure, not just abstract strategy.
- End with cadence, CTAs, and the engagement signals to monitor after publishing.
`,
    }
  },
  model: "google/gemini-3.1-flash-lite-preview",
  memory: LibsqlMemory,
  agents: {
    copywriterAgent,
    contentStrategistAgent,
    researchAgent,
   // calendarAgent,
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
            modifiedPrompt: `${context.prompt}\n\nFocus on audience insights, trending angles, competitor patterns, and timely signals that can improve campaign performance. Return only the most actionable findings first.`,
            modifiedInstructions:
              'Act as a social intelligence analyst. Prioritize audience behavior, timely trends, and competitor patterns that materially change campaign direction.',
            modifiedMaxSteps: 7,
          }
        }

        if (context.primitiveId === 'contentStrategistAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nTurn the request into a campaign plan with platform mix, publishing cadence, core messaging pillars, and measurable engagement goals.`,
            modifiedInstructions:
              'Build a channel-aware campaign plan with audience fit, cadence, messaging pillars, and measurable engagement objectives.',
            modifiedMaxSteps: 6,
          }
        }

        if (context.primitiveId === 'copywriterAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nWrite platform-native copy with strong hooks, concise CTAs, and formatting that matches the target channel. Avoid generic cross-platform wording unless explicitly requested.`,
            modifiedInstructions:
              'Write native social copy for the target platform. Optimize for hooks, clarity, CTA strength, and channel-specific formatting.',
            modifiedMaxSteps: 6,
          }
        }

        return { proceed: true }
      },
      onDelegationComplete: async context => {
        if (!context.error) {
          return
        }

        return {
          feedback: `Delegation to ${context.primitiveId} failed. Continue with the remaining campaign context and clearly identify which platform or strategy detail still needs validation.`,
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

      if (!/linkedin|twitter|x|instagram|facebook|tiktok|platform/i.test(text)) {
        feedback.push('Make the platform recommendation explicit.')
      }

      if (!/hook|cta|caption|post|thread|carousel|reel/i.test(text)) {
        feedback.push('Include ready-to-use social content or channel-native execution details.')
      }

      if (!/cadence|schedule|posting|engagement|metric|monitor/i.test(text)) {
        feedback.push('End with cadence and the engagement signals to monitor.')
      }

      await Promise.resolve()
      return {
        continue: true,
        feedback: feedback.length > 0 ? feedback.join(' ') : undefined,
      }
    },
    isTaskComplete: {
      scorers: [socialMediaTaskCompleteScorer, socialMediaExecutionScorer],
      strategy: 'any',
      parallel: true,
      onComplete: async result => {
        log.info('Social media completion check', {
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

log.info('Social Media Agent initialized')
