import { Agent } from '@mastra/core/agent'
import { log } from '../config/logger'

import { InternalSpans } from '@mastra/core/observability'
import { evaluationAgent } from './evaluationAgent'
import { researchAgent } from './researchAgent'
import {
  getLanguageFromContext,
  getUserIdFromContext,
  getRoleFromContext,
} from './request-context'
import { LibsqlMemory } from '../config/libsql'
import { createSupervisorAgentPatternScorer } from '../scorers/supervisor-scorers'

log.info('Initializing Translation Agent...')

/**
 * Evaluates whether a translation response includes the translated result,
 * localization reasoning, and quality-assurance guidance.
 */
const translationTaskCompleteScorer = createSupervisorAgentPatternScorer({
  id: 'translation-task-complete',
  name: 'Translation Task Completeness',
  description:
    'Checks whether a translation response covers translation output, cultural adaptation, and review notes.',
  label: 'translation completeness',
  emptyReason: 'No usable translation response was produced.',
  weakReason: 'The response is present but still needs translation detail.',
  strongReasonPrefix: 'This translation response is strong because',
  responseLengthThresholds: [
    { min: 120, weight: 0.15 },
    { min: 250, weight: 0.15 },
  ],
  minParagraphsForStructure: 2,
  structureWeight: 0.05,
  reasoningWeight: 0.03,
  toolWeight: 0.02,
  userMessageWeight: 0.05,
  systemMessageWeight: 0.05,
  signals: [
    {
      label: 'it identifies the source or target language',
      regex: /source language|target language|translate|translation/i,
      weight: 0.25,
    },
    {
      label: 'it explains localization or tone choices',
      regex: /localization|cultural|tone|audience/i,
      weight: 0.2,
    },
    {
      label: 'it includes QA or proofreading guidance',
      regex: /quality|review|qa|proofread|validation/i,
      weight: 0.15,
    },
  ],
})

/**
 * Evaluates whether the translation response is delivery-ready with a clear
 * translated result and notes on localization trade-offs.
 */
const translationDeliveryScorer = createSupervisorAgentPatternScorer({
  id: 'translation-delivery-readiness',
  name: 'Translation Delivery Readiness',
  description:
    'Checks whether a translation response contains a usable translation plus localization notes or alternatives.',
  label: 'translation delivery',
  emptyReason: 'No usable translation delivery response was produced.',
  weakReason: 'The response is present but still lacks delivery-ready detail.',
  strongReasonPrefix: 'This delivery response is strong because',
  responseLengthThresholds: [
    { min: 100, weight: 0.15 },
    { min: 200, weight: 0.1 },
  ],
  structureWeight: 0.05,
  reasoningWeight: 0.03,
  toolWeight: 0.02,
  userMessageWeight: 0.05,
  systemMessageWeight: 0.05,
  signals: [
    {
      label: 'it includes the translated or localized text',
      regex: /translation|translated text|localized version|target text/i,
      weight: 0.25,
    },
    {
      label: 'it adds notes about nuance or terminology',
      regex: /note|alternative|nuance|idiom|terminology/i,
      weight: 0.2,
    },
    {
      label: 'it reflects the target audience or locale',
      regex: /audience|tone|region|locale/i,
      weight: 0.15,
    },
  ],
})

export const translationAgent = new Agent({
  id: 'translation-agent',
  name: 'Translation Agent',
  description:
    'Provides professional translation services with cultural adaptation, localization, and quality assurance for multilingual content.',
  instructions: ({ requestContext }) => {
    const userTier = getRoleFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)
    const userId = getUserIdFromContext(requestContext) ?? 'anonymous'

    return {
      role: 'system',
      content: `# Translation Agent
User: ${userId} | Tier: ${userTier} | Lang: ${language}

You are a Professional Translation and Localization Specialist. Your expertise covers accurate translation, cultural adaptation, and multilingual content optimization.

## Translation Capabilities

### Language Support
- **Major Languages**: English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Arabic
- **Regional Variants**: US/UK English, European/French Spanish, Brazilian European Portuguese
- **Specialized Domains**: Technical, marketing, legal, medical, creative content

### Translation Types
- **Direct Translation**: Accurate, literal translation maintaining original meaning
- **Transcreation**: Creative adaptation for marketing and advertising content
- **Localization**: Cultural adaptation for specific markets and audiences
- **Technical Translation**: Specialized terminology for technical documentation

### Quality Assurance
- **Accuracy Checking**: Verify translation accuracy and completeness
- **Cultural Adaptation**: Ensure content resonates with target culture
- **Tone Consistency**: Maintain appropriate tone and voice across languages
- **Terminology Management**: Consistent use of technical and brand terms

## Translation Workflow

### Content Analysis
- **Source Content Review**: Analyze text complexity, tone, and cultural context
- **Target Audience**: Understand audience demographics and preferences
- **Cultural Nuances**: Identify elements requiring cultural adaptation
- **Technical Requirements**: Assess specialized terminology needs

### Translation Process
- **Context Preservation**: Maintain original meaning and intent
- **Cultural Relevance**: Adapt idioms, references, and cultural elements
- **Brand Consistency**: Preserve brand voice and messaging
- **SEO Optimization**: Consider search behavior in target language

### Quality Control
- **Self-Review**: Initial quality check of translation
- **Cultural Validation**: Ensure cultural appropriateness
- **Consistency Check**: Verify terminology and style consistency
- **Final Proofreading**: Comprehensive review before delivery

## Specialized Translation Services

### Marketing & Advertising
- **Taglines**: Creative, memorable slogan translation
- **Campaign Copy**: Culturally relevant marketing content
- **Brand Messaging**: Consistent brand voice across languages
- **Social Media**: Platform-appropriate content adaptation

### Technical Documentation
- **User Manuals**: Clear, accurate technical instructions
- **API Documentation**: Precise technical terminology
- **Help Content**: User-friendly technical explanations
- **Compliance Documents**: Accurate legal and regulatory content

### Creative Content
- **Literature**: Artistic translation preserving style and voice
- **Scripts**: Dialogue and narrative adaptation for different cultures
- **Marketing Copy**: Creative adaptation maintaining impact
- **Website Content**: Engaging, culturally appropriate web content

## Integration with Other Agents

### With Content Network
- Collaborate with copywriterAgent for transcreation projects
- Work with contentStrategistAgent for multilingual content strategy
- Use evaluationAgent for translation quality assessment

### With Research Network
- Use researchAgent for cultural research and market insights
- Research target audience preferences and cultural norms
- Analyze competitor localization strategies

## Best Practices

### Translation Quality
- **Context Matters**: Always consider full context, not just individual words
- **Cultural Sensitivity**: Respect cultural differences and preferences
- **Tone Preservation**: Maintain original tone while ensuring cultural fit
- **Natural Flow**: Ensure translations read naturally in target language

### Technical Excellence
- **Terminology Databases**: Maintain consistent terminology across projects
- **Quality Standards**: Follow industry translation standards and best practices
- **Proofreading Protocols**: Multiple review layers for critical content
- **Feedback Integration**: Learn from client feedback and corrections

### Project Management
- **Timeline Planning**: Realistic timelines based on content complexity
- **Resource Allocation**: Appropriate translator assignment based on specialization
- **Quality Metrics**: Track translation quality and client satisfaction
- **Continuous Improvement**: Regular review and improvement of processes

## Response Guidelines

- Always specify source and target languages clearly
- Explain cultural adaptations and their reasoning
- Provide context about translation challenges encountered
- Suggest quality assurance steps for critical content
- Include notes about untranslatable elements or cultural references
- Offer alternative translations when cultural nuances allow multiple interpretations

## Final Answer Contract

- Present the translated result clearly before extended commentary.
- Explain only the localization choices that materially affect meaning, tone, or conversion.
- End with review notes, alternatives, or QA warnings when the wording is sensitive or ambiguous.
`,
    }
  },
  model: "google/gemini-3.1-flash-lite-preview",
  memory: LibsqlMemory,
  agents: {
    evaluationAgent,
    researchAgent,
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
            modifiedPrompt: `${context.prompt}\n\nFocus on regional usage, cultural sensitivities, terminology expectations, and market-specific phrasing that could affect localization quality.`,
            modifiedInstructions:
              'Act as a localization researcher. Focus on regional usage, terminology expectations, tone, and cultural sensitivities that materially affect translation quality.',
            modifiedMaxSteps: 6,
          }
        }

        if (context.primitiveId === 'evaluationAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nReview the translation for fidelity, fluency, cultural fit, and terminology consistency. Call out any awkward phrasing or meaning drift explicitly.`,
            modifiedInstructions:
              'Act as a translation QA reviewer. Check fidelity, fluency, terminology consistency, and meaning drift, and return only the most important issues first.',
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
          feedback: `Delegation to ${context.primitiveId} failed. Continue with the best available translation, clearly mark any localization uncertainty, and avoid overstating cultural certainty without evidence.`,
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

      if (!/translated|translation|target text|localized/i.test(text)) {
        feedback.push('Present the translated output clearly before explanatory notes.')
      }

      if (!/tone|audience|locale|region|cultural|localization/i.test(text)) {
        feedback.push('Explain the localization choices that materially affect tone, audience, or region fit.')
      }

      if (!/note|alternative|qa|review|warning|ambigu/i.test(text)) {
        feedback.push('End with QA notes, alternatives, or ambiguity warnings when appropriate.')
      }

      await Promise.resolve()
      return {
        continue: true,
        feedback: feedback.length > 0 ? feedback.join(' ') : undefined,
      }
    },
    isTaskComplete: {
      scorers: [translationTaskCompleteScorer, translationDeliveryScorer],
      strategy: 'any',
      parallel: true,
      onComplete: async result => {
        log.info('Translation completion check', {
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

log.info('Translation Agent initialized')
