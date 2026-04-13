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
import { evaluationAgent } from './evaluationAgent'
import { researchAgent } from './researchAgent'
import {
  getLanguageFromContext,
  getUserIdFromContext,
  getRoleFromContext,
} from './request-context'
import { LibsqlMemory } from '../config/libsql'

log.info('Initializing Translation Agent...')

/**
 * Evaluates whether a translation response includes the translated result,
 * localization reasoning, and quality-assurance guidance.
 */
const translationTaskCompleteScorer = createScorer({
  id: 'translation-task-complete',
  name: 'Translation Task Completeness',
  description:
    'Checks whether a translation response covers translation output, cultural adaptation, and review notes.',
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
      hasLanguagePair:
        /source language|target language|translate|translation/i.test(responseText),
      hasLocalization:
        /localization|cultural|tone|audience/i.test(responseText),
      hasQA:
        /quality|review|qa|proofread|validation/i.test(responseText),
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
    if (analysis.responseLength >= 250) score += 0.15
    if (analysis.hasLanguagePair) score += 0.25
    if (analysis.hasLocalization) score += 0.2
    if (analysis.hasQA) score += 0.15
    if (analysis.hasReasoning) score += 0.03
    if (analysis.toolCount > 0) score += 0.02
    if (analysis.hasStructure) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    const parts: string[] = []

    if (!analysis?.hasResponse) {
      return 'No usable translation response was produced.'
    }

    if (analysis.hasLanguagePair) parts.push('it identifies the source or target language')
    if (analysis.hasLocalization) parts.push('it explains localization or tone choices')
    if (analysis.hasQA) parts.push('it includes QA or proofreading guidance')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This translation response is strong because ${parts.join(', ')}.` : 'The response is present but still needs translation detail.'}`
  })

/**
 * Evaluates whether the translation response is delivery-ready with a clear
 * translated result and notes on localization trade-offs.
 */
const translationDeliveryScorer = createScorer({
  id: 'translation-delivery-readiness',
  name: 'Translation Delivery Readiness',
  description:
    'Checks whether a translation response contains a usable translation plus localization notes or alternatives.',
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
      hasTranslation:
        /translation|translated text|localized version|target text/i.test(responseText),
      hasNotes:
        /note|alternative|nuance|idiom|terminology/i.test(responseText),
      hasLocale:
        /audience|tone|region|locale/i.test(responseText),
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
    if (analysis.responseLength >= 100) score += 0.15
    if (analysis.responseLength >= 200) score += 0.1
    if (analysis.hasTranslation) score += 0.25
    if (analysis.hasNotes) score += 0.2
    if (analysis.hasLocale) score += 0.15
    if (analysis.hasReasoning) score += 0.03
    if (analysis.toolCount > 0) score += 0.02
    if (analysis.hasStructure) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    const parts: string[] = []

    if (!analysis?.hasResponse) {
      return 'No usable translation delivery response was produced.'
    }

    if (analysis.hasTranslation) parts.push('it includes the translated or localized text')
    if (analysis.hasNotes) parts.push('it adds notes about nuance or terminology')
    if (analysis.hasLocale) parts.push('it reflects the target audience or locale')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This delivery response is strong because ${parts.join(', ')}.` : 'The response is present but still lacks delivery-ready detail.'}`
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
