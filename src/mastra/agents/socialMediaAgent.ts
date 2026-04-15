import { Agent } from '@mastra/core/agent'
import { log } from '../config/logger'

import { InternalSpans } from '@mastra/core/observability'
//import { calendarAgent } from './calendarAgent'
import { contentStrategistAgent } from './contentStrategistAgent'
import { copywriterAgent } from './copywriterAgent'
import { researchAgent } from './researchAgent'
import {
  //baseAgentRequestContextSchema,
  getLanguageFromContext,
  getUserIdFromContext,
  getRoleFromContext,
} from './request-context'
import { LibsqlMemory } from '../config/libsql'
import { createSupervisorAgentPatternScorer } from '../scorers/supervisor-scorers'

log.info('Initializing Social Media Agent...')

/**
 * Evaluates whether a social-media response includes platform-aware content,
 * campaign guidance, and execution-ready details.
 */
const socialMediaTaskCompleteScorer = createSupervisorAgentPatternScorer({
  id: 'social-media-task-complete',
  name: 'Social Media Task Completeness',
  description:
    'Checks whether a social-media response includes platform targeting, content direction, and publishing guidance.',
  label: 'social media completeness',
  emptyReason: 'No usable social media response was produced.',
  weakReason: 'The response is present but still lacks campaign detail.',
  strongReasonPrefix: 'This social response is strong because',
  responseLengthThresholds: [
    { min: 120, weight: 0.15 },
    { min: 250, weight: 0.1 },
  ],
  minParagraphsForStructure: 2,
  structureWeight: 0.05,
  reasoningWeight: 0.03,
  toolWeight: 0.02,
  userMessageWeight: 0.05,
  systemMessageWeight: 0.05,
  signals: [
    {
      label: 'it specifies the target platform',
      regex: /linkedin|twitter|x|instagram|facebook|tiktok/i,
      weight: 0.2,
    },
    {
      label: 'it uses channel-native content formats',
      regex: /post|thread|carousel|reel|story|caption/i,
      weight: 0.2,
    },
    {
      label: 'it includes cadence or posting guidance',
      regex: /schedule|posting time|calendar|cadence/i,
      weight: 0.15,
    },
    {
      label: 'it includes hooks, CTAs, or engagement guidance',
      regex: /cta|hashtag|engagement|hook/i,
      weight: 0.15,
    },
  ],
})

/**
 * Evaluates whether the social-media response is campaign-ready with clear
 * channel fit, hooks, and execution guidance.
 */
const socialMediaExecutionScorer = createSupervisorAgentPatternScorer({
  id: 'social-media-execution-readiness',
  name: 'Social Media Execution Readiness',
  description:
    'Checks whether a social-media response contains usable channel tactics, hooks, and next actions.',
  label: 'social media execution',
  emptyReason: 'No usable social media execution plan was produced.',
  weakReason: 'The response is present but still needs execution detail.',
  strongReasonPrefix: 'This execution plan is strong because',
  responseLengthThresholds: [
    { min: 120, weight: 0.15 },
    { min: 220, weight: 0.1 },
  ],
  structureWeight: 0.05,
  reasoningWeight: 0.03,
  toolWeight: 0.02,
  userMessageWeight: 0.05,
  systemMessageWeight: 0.05,
  signals: [
    {
      label: 'it opens with a hook or CTA',
      regex: /hook|opening line|cta|call to action/i,
      weight: 0.25,
    },
    {
      label: 'it includes cadence guidance',
      regex: /cadence|schedule|posting time|weekly|daily/i,
      weight: 0.15,
    },
    {
      label: 'it ties the plan to engagement outcomes',
      regex: /engagement|reach|click|reply|save|share/i,
      weight: 0.2,
    },
  ],
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
