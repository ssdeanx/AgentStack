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
import { reportAgent } from './reportAgent'
import { researchAgent } from './researchAgent'
import {
  getLanguageFromContext,
  getUserIdFromContext,
  getRoleFromContext,
} from './request-context'
import { LibsqlMemory } from '../config/libsql'

log.info('Initializing Customer Support Agent...')

/**
 * Evaluates whether a customer-support response contains empathy, a practical resolution,
 * and clear follow-up guidance.
 */
const customerSupportTaskCompleteScorer = createScorer({
  id: 'customer-support-task-complete',
  name: 'Customer Support Task Completeness',
  description:
    'Checks whether a support reply includes empathy, concrete next steps, and resolution guidance.',
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
      hasEmpathy:
        /understand|sorry|happy to help|i can help|thanks for sharing/i.test(
          responseText
        ),
      hasActionableSteps:
        /step 1|1\.|next step|please try|follow these steps|here's what to do/i.test(
          responseText
        ),
      hasResolutionPath:
        /if this does not work|if the issue persists|contact|follow up|escalate/i.test(
          responseText
        ),
      hasVerification:
        /verify|confirm|check|test|expected result|what should happen/i.test(
          responseText
        ),
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
    if (analysis.hasUserMessage) score += 0.05
    if (analysis.systemMessageCount > 0) score += 0.05
    if (analysis.responseLength >= 140) score += 0.15
    if (analysis.responseLength >= 300) score += 0.1
    if (analysis.hasEmpathy) score += 0.2
    if (analysis.hasActionableSteps) score += 0.2
    if (analysis.hasResolutionPath) score += 0.15
    if (analysis.hasVerification) score += 0.05
    if (analysis.hasReasoning) score += 0.03
    if (analysis.toolCount > 0) score += 0.02
    if (analysis.hasStructure) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    const parts: string[] = []

    if (!analysis?.hasResponse) {
      return 'No usable customer support response was produced.'
    }

    if (analysis.hasEmpathy) parts.push('it opens with empathy')
    if (analysis.hasActionableSteps) parts.push('it includes clear actions')
    if (analysis.hasResolutionPath) parts.push('it includes a resolution or escalation path')
    if (analysis.hasVerification) parts.push('it adds verification guidance')
    if (analysis.hasReasoning) parts.push('it includes reasoning support')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This support response is strong because ${parts.join(', ')}.` : 'The response is present but lacks the main support signals.'}`
  })

/**
 * Evaluates whether the support response is concise, operationally clear, and
 * ready to send to the customer.
 */
const customerSupportResolutionScorer = createScorer({
  id: 'customer-support-resolution-readiness',
  name: 'Customer Support Resolution Readiness',
  description:
    'Checks whether a support reply provides a usable resolution flow, clear next steps, and escalation guidance.',
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
      hasSequence:
        /1\.|2\.|step 1|step-by-step|follow these steps/i.test(responseText),
      hasVerification:
        /expected result|what should happen|confirm|verify/i.test(responseText),
      hasEscalation:
        /escalate|contact support|follow up|reply back|reach out/i.test(
          responseText
        ),
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
    if (analysis.responseLength >= 140) score += 0.2
    if (analysis.responseLength >= 260) score += 0.1
    if (analysis.hasSequence) score += 0.25
    if (analysis.hasVerification) score += 0.2
    if (analysis.hasEscalation) score += 0.15
    if (analysis.hasReasoning) score += 0.03
    if (analysis.toolCount > 0) score += 0.02
    if (analysis.hasStructure) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    const parts: string[] = []

    if (!analysis?.hasResponse) {
      return 'No usable customer support resolution was produced.'
    }

    if (analysis.hasSequence) parts.push('it gives a step-by-step flow')
    if (analysis.hasVerification) parts.push('it tells the user how to verify the fix')
    if (analysis.hasEscalation) parts.push('it includes escalation guidance')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This resolution is strong because ${parts.join(', ')}.` : 'The response is present but not yet resolution-ready.'}`
  })

/**
 * Customer Support Agent.
 *
 * Handles support requests, issue resolution, and customer communication.
 */
export const customerSupportAgent = new Agent({
  id: 'customer-support-agent',
  name: 'Customer Support Agent',
  description:
    'Handles customer inquiries, provides technical support, resolves issues, and manages customer relationships with empathy and efficiency.',
  instructions: ({ requestContext }) => {
    const role = getRoleFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)
    const userId = getUserIdFromContext(requestContext) ?? 'anonymous'

    return {
      role: 'system',
      content: `# Customer Support Specialist
    User: ${userId} | Role: ${role} | Lang: ${language}

You are a Professional Customer Support Specialist. Your role is to provide exceptional customer service, resolve issues efficiently, and build positive customer relationships.

## Support Capabilities

### Issue Resolution
- **Technical Support**: Troubleshoot technical problems and provide solutions
- **Account Issues**: Handle login problems, password resets, account modifications
- **Billing Support**: Address billing questions, payment issues, subscription management
- **Product Questions**: Answer detailed product feature and usage questions
- **Bug Reports**: Document and escalate technical issues appropriately

### Communication Excellence
- **Empathetic Responses**: Show understanding and care for customer concerns
- **Clear Explanations**: Provide simple, jargon-free explanations
- **Proactive Solutions**: Anticipate related issues and provide comprehensive solutions
- **Follow-up Assurance**: Ensure customer satisfaction and offer additional help

### Customer Experience
- **Personalization**: Use customer context and history when available
- **Efficient Service**: Resolve issues in minimal interactions while being thorough
- **Positive Language**: Maintain optimistic, solution-oriented communication
- **Professional Tone**: Balance friendliness with professionalism

## Support Workflow

### Initial Assessment
- **Issue Classification**: Categorize the type and urgency of the customer issue
- **Information Gathering**: Ask relevant questions to understand the full context
- **Priority Assessment**: Determine if issue needs immediate attention or can be scheduled
- **Resource Identification**: Identify knowledge base articles, documentation, or experts needed

### Problem Solving
- **Root Cause Analysis**: Identify the underlying cause of the reported issue
- **Solution Research**: Consult knowledge base, documentation, and internal resources
- **Solution Testing**: Verify solutions work in similar scenarios
- **Workaround Provision**: Provide temporary solutions while permanent fixes are developed

### Resolution & Follow-up
- **Clear Instructions**: Provide step-by-step resolution instructions
- **Verification**: Confirm the solution resolves the customer's issue
- **Documentation**: Update knowledge base with new solutions or issues encountered
- **Satisfaction Check**: Ensure customer is fully satisfied with the resolution

## Specialized Support Areas

### Technical Support
- **Software Issues**: Application bugs, feature problems, compatibility issues
- **Hardware Problems**: Device-specific issues, connectivity problems
- **Integration Issues**: Third-party service integrations, API problems
- **Performance Issues**: Slow loading, system crashes, resource problems

### Account & Billing Support
- **Login Issues**: Password resets, account recovery, security concerns
- **Subscription Management**: Plan changes, upgrades, cancellations
- **Payment Processing**: Failed payments, refunds, billing disputes
- **Feature Access**: Permission issues, feature limitations

### Product Education
- **Feature Explanations**: How-to guides, best practices, advanced features
- **Use Cases**: Industry-specific applications, workflow optimization
- **Training Resources**: Documentation links, tutorial recommendations
- **Comparison Questions**: Feature comparisons, alternative solutions

## Integration with Other Agents

### With Research Network
- Use researchAgent for in-depth technical research and solution finding
- Research similar issues and documented solutions
- Analyze trends in customer issues and common problems

### With Evaluation Network
- Use evaluationAgent to assess solution effectiveness
- Evaluate customer satisfaction and support quality metrics
- Analyze support interaction patterns and improvement opportunities

### With Report Network
- Use reportAgent to generate customer support reports and analytics
- Document support interactions and resolutions
- Create knowledge base articles from resolved issues

## Support Best Practices

### Communication Standards
- **Active Listening**: Demonstrate understanding of customer concerns
- **Clear Language**: Avoid technical jargon unless customer is technical
- **Positive Framing**: Focus on solutions rather than problems
- **Professional Courtesy**: Maintain respect and patience in all interactions

### Efficiency Principles
- **First Contact Resolution**: Aim to resolve issues in initial interaction
- **Knowledge Base Utilization**: Leverage existing documentation and solutions
- **Escalation Protocols**: Know when and how to escalate complex issues
- **Time Management**: Balance thoroughness with reasonable response times

### Quality Assurance
- **Solution Verification**: Test solutions before providing to customers
- **Documentation Updates**: Contribute to knowledge base improvements
- **Feedback Collection**: Gather customer feedback for service improvement
- **Continuous Learning**: Stay updated on product changes and common issues

## Response Guidelines

- Always acknowledge the customer's issue and show empathy first
- Provide clear, numbered steps for technical solutions
- Include relevant links to documentation or resources
- Ask for confirmation when solution is complex
- Offer additional assistance and follow-up options
- Document any new issues or solutions encountered for future reference

## Final Answer Contract

- Open with empathy and a one-sentence diagnosis when supported by the evidence.
- Provide the smallest safe set of steps needed to move the customer forward.
- End with verification guidance, escalation options, or what to send back if the issue persists.
`,
    }
  },
  model: "google/gemini-3.1-flash-lite-preview",
  memory: LibsqlMemory,
  agents: {
    researchAgent,
    evaluationAgent,
    reportAgent,
  },
  options: {
    tracingPolicy: {
      internal: InternalSpans.AGENT,
    },
  },
  defaultOptions: {
    delegation: {
      onDelegationStart: async context => {
        if (context.primitiveId === 'researchAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nFocus on root cause analysis, likely fixes, official documentation, and known troubleshooting steps. Return your findings as concise support-ready bullets with sources where possible.`,
            modifiedInstructions:
              'Act as a support researcher. Prioritize safe troubleshooting, likely root causes, and official or well-supported fixes. Keep findings concise and customer-safe.',
            modifiedMaxSteps: 7,
          }
        }

        if (context.primitiveId === 'evaluationAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nEvaluate whether the proposed customer-facing resolution is accurate, safe, complete, and easy for a non-expert user to follow. Call out missing steps or risky assumptions explicitly.`,
            modifiedInstructions:
              'Act as a QA reviewer for support guidance. Flag risky assumptions, unclear instructions, or missing verification and escalation steps.',
            modifiedMaxSteps: 5,
          }
        }

        if (context.primitiveId === 'reportAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nProduce a clean support summary that captures the issue, diagnosis, steps taken, recommended resolution, and any follow-up actions or escalation notes.`,
            modifiedInstructions:
              'Produce a support-case summary suitable for handoff or logging. Keep it concise, factual, and action-oriented.',
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
          feedback: `Delegation to ${context.primitiveId} failed. Continue by either trying another specialist or answering with the best safe support guidance available, and clearly state any remaining uncertainty.`,
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

      if (!/sorry|understand|happy to help|i can help|thanks for sharing/i.test(text)) {
        feedback.push('Open with empathy before giving the resolution steps.')
      }

      if (!/1\.|step 1|follow these steps|please try/i.test(text)) {
        feedback.push('Convert the resolution into clear numbered actions.')
      }

      if (!/verify|confirm|if this does not work|if the issue persists|escalate/i.test(text)) {
        feedback.push('Add verification guidance and an escalation path if the first fix fails.')
      }

      await Promise.resolve()
      return {
        continue: true,
        feedback: feedback.length > 0 ? feedback.join(' ') : undefined,
      }
    },
    isTaskComplete: {
      scorers: [customerSupportTaskCompleteScorer, customerSupportResolutionScorer],
      strategy: 'any',
      parallel: true,
      onComplete: async result => {
        log.info('Customer support completion check', {
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

log.info('Customer Support Agent initialized')
