import { createScorer } from '@mastra/core/evals'
import type { ScorerRunInputForAgent, ScorerRunOutputForAgent } from '@mastra/core/evals'
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

interface SupervisorSnapshot {
    userMessage: string
    inputMessageCount: number
    systemMessageCount: number
    systemPrompt: string
    responseText: string
    responseMessageCount: number
    reasoningText: string
    toolCount: number
    toolNames: string[]
    paragraphCount: number
    wordCount: number
    keyTerms: string[]
}

interface SupervisorSignals extends SupervisorSnapshot {
    hasResponse: boolean
    hasStructure: boolean
    hasDirectSummary: boolean
    hasNextSteps: boolean
    hasCaveat: boolean
    hasEvidence: boolean
    hasRoutingChatter: boolean
    hasPriorityLanguage: boolean
    hasActionLanguage: boolean
    hasUncertaintyLanguage: boolean
    keyTermCoverage: number
}

const STOPWORDS = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'be',
    'been',
    'but',
    'by',
    'can',
    'compare',
    'comparing',
    'customer',
    'dashboard',
    'decide',
    'discuss',
    'explain',
    'final',
    'give',
    'guide',
    'for',
    'from',
    'how',
    'if',
    'in',
    'into',
    'launch',
    'is',
    'make',
    'it',
    'mind',
    'need',
    'plan',
    'of',
    'on',
    'or',
    'our',
    'product',
    'provide',
    'recommend',
    'recommendation',
    'recommendations',
    'research',
    'return',
    'say',
    'should',
    'solve',
    'strategy',
    'summarize',
    'summary',
    'that',
    'the',
    'their',
    'then',
    'there',
    'team',
    'tell',
    'this',
    'topic',
    'to',
    'user',
    'want',
    'we',
    'what',
    'when',
    'where',
    'which',
    'with',
    'write',
    'you',
    'your',
])

const ROUTING_CHATTER_REGEX = /\b(delegat(?:e|ed|ing)|subagent|researchagent|copywriteragent|writing-agent|primitive|tool call|routing)\b/i
const EVIDENCE_REGEX = /source|sources|citation|citations|http|www\.|\b20\d{2}\b/i
const SUMMARY_REGEX = /summary|executive summary|bottom line|in short|direct answer|recommend/i
const NEXT_STEPS_REGEX = /next step|next steps|follow-up|action items?|recommend(?:ation|ed)?|priority/i
const CAUTION_REGEX = /risk|caveat|uncertain|unknown|assumption|depends on/i
const ACTION_REGEX = /prioritize|implement|prepare|review|validate|ship|run|measure|track|monitor|decide/i
const STRUCTURE_REGEX = /^#{1,6}\s|^[-*]\s|^\d+\.\s/m

function clamp(value: number, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value))
}

function normalizeText(value: unknown): string {
    if (typeof value !== 'string') {
        return ''
    }

    return value.trim()
}

function splitParagraphs(text: string): number {
    return text.split(/\n\s*\n/).filter(Boolean).length
}

function extractKeyTerms(text: string, limit = 12): string[] {
    const terms = text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((term) => term.trim())
        .filter(Boolean)
        .filter((term) => term.length > 2 && !STOPWORDS.has(term))

    return Array.from(new Set(terms)).slice(0, limit)
}

function buildSupervisorSnapshot(run: {
    input?: ScorerRunInputForAgent
    output?: ScorerRunOutputForAgent
}): SupervisorSnapshot {
    const input = run.input
    const output = run.output

    const userMessage = normalizeText(getUserMessageFromRunInput(input))
    const inputMessageCount = extractInputMessages(input).length
    const systemMessages = getSystemMessagesFromRunInput(input)
    const systemMessageCount = systemMessages.length
    const systemPrompt = normalizeText(getCombinedSystemPrompt(input))
    const responseText = normalizeText(
        output
            ? getAssistantMessageFromRunOutput(output) ??
                  extractAgentResponseMessages(output).join('\n')
            : undefined
    )
    const responseMessageCount = output ? extractAgentResponseMessages(output).length : 0
    const reasoningText = normalizeText(output ? getReasoningFromRunOutput(output) : undefined)
    const { tools, toolCallInfos } = output ? extractToolCalls(output) : { tools: [], toolCallInfos: [] }
    const toolNames = toolCallInfos
        .map((info) => {
            if (typeof info === 'object' && info !== null) {
                const toolName = (info as Record<string, unknown>).toolName
                return typeof toolName === 'string' ? toolName : ''
            }

            return ''
        })
        .filter(Boolean)

    return {
        userMessage,
        inputMessageCount,
        systemMessageCount,
        systemPrompt,
        responseText,
        responseMessageCount,
        reasoningText,
        toolCount: Math.max(tools.length, toolNames.length),
        toolNames,
        paragraphCount: splitParagraphs(responseText),
        wordCount: responseText.length > 0 ? responseText.split(/\s+/).filter(Boolean).length : 0,
        keyTerms: extractKeyTerms(userMessage),
    }
}

function buildSignals(snapshot: SupervisorSnapshot): SupervisorSignals {
    const lowerResponse = snapshot.responseText.toLowerCase()
    const keyTermCoverage =
        snapshot.keyTerms.length === 0
            ? 1
            : snapshot.keyTerms.filter((term) => lowerResponse.includes(term)).length /
              snapshot.keyTerms.length

    return {
        ...snapshot,
        hasResponse: snapshot.responseText.length > 0,
        hasStructure:
            STRUCTURE_REGEX.test(snapshot.responseText) || snapshot.paragraphCount >= 3,
        hasDirectSummary: SUMMARY_REGEX.test(snapshot.responseText),
        hasNextSteps: NEXT_STEPS_REGEX.test(snapshot.responseText),
        hasCaveat: CAUTION_REGEX.test(snapshot.responseText),
        hasEvidence: EVIDENCE_REGEX.test(snapshot.responseText),
        hasRoutingChatter: ROUTING_CHATTER_REGEX.test(snapshot.responseText),
        hasPriorityLanguage: /priority|prioritize|impact|effort|important/i.test(snapshot.responseText),
        hasActionLanguage: ACTION_REGEX.test(snapshot.responseText),
        hasUncertaintyLanguage: /maybe|might|may|could|appears|seems|likely|unlikely|unclear/i.test(snapshot.responseText),
        keyTermCoverage,
    }
}

function generateSupervisorReason(
    label: string,
    score: number,
    details: string[]
): string {
    if (details.length === 0) {
        return `Score: ${score.toFixed(2)}. ${label} is present but lacks strong quality signals.`
    }

    return `Score: ${score.toFixed(2)}. ${label} is strong because ${details.join(', ')}.`
}

/**
 * Measures whether the supervisor response stays user-facing, avoids raw routing chatter,
 * and presents a synthesized answer rather than exposing delegation mechanics.
 */
export const supervisorRoutingDisciplineScorer = createScorer({
    id: 'supervisor-routing-discipline',
    name: 'Supervisor Routing Discipline',
    description:
        'Checks whether the supervisor response stays synthesized and avoids exposing internal routing chatter.',
    type: 'agent',
}).preprocess(({ run }) => buildSupervisorSnapshot(run))
    .analyze(({ results }) => {
        const signals = buildSignals(results.preprocessStepResult)

        return {
            hasResponse: signals.hasResponse,
            hasSynthesis: signals.hasDirectSummary,
            hasStructure: signals.hasStructure,
            hasRoutingChatter: signals.hasRoutingChatter,
            hasNextSteps: signals.hasNextSteps,
            toolCount: signals.toolCount,
            paragraphCount: signals.paragraphCount,
        }
    })
    .generateScore(({ results }) => {
        const signals = buildSignals(results.preprocessStepResult)

        if (!signals.hasResponse) {
            return 0
        }

        const score =
            (signals.hasDirectSummary ? 0.35 : 0) +
            (signals.hasStructure ? 0.2 : 0) +
            (signals.hasNextSteps ? 0.15 : 0) +
            (signals.toolCount > 0 ? 0.15 : 0.05) +
            (signals.hasEvidence ? 0.15 : 0) +
            (!signals.hasRoutingChatter ? 0.15 : 0)

        return clamp(score)
    })
    .generateReason(({ results, score }) => {
        const signals = buildSignals(results.preprocessStepResult)
        const details: string[] = []

        if (signals.hasDirectSummary) details.push('it opens with a direct synthesis')
        if (signals.hasStructure) details.push('it is structured for a user-ready answer')
        if (signals.hasNextSteps) details.push('it closes with next steps')
        if (signals.hasEvidence) details.push('it includes evidence anchors')
        if (signals.toolCount > 0) details.push(`it used ${signals.toolCount} delegation signal(s)`)
        if (!signals.hasRoutingChatter) details.push('it avoids raw delegation chatter')

        return generateSupervisorReason('Routing discipline', score, details)
    })

/**
 * Measures whether the supervisor backs claims with sources, dates, or other evidence anchors.
 */
export const supervisorEvidenceGroundingScorer = createScorer({
    id: 'supervisor-evidence-grounding',
    name: 'Supervisor Evidence Grounding',
    description:
        'Checks whether the supervisor response includes evidence anchors, dates, citations, or other grounding signals.',
    type: 'agent',
}).preprocess(({ run }) => buildSupervisorSnapshot(run))
    .analyze(({ results }) => {
        const signals = buildSignals(results.preprocessStepResult)

        return {
            hasResponse: signals.hasResponse,
            hasEvidence: signals.hasEvidence,
            hasCaveat: signals.hasCaveat,
            hasStructure: signals.hasStructure,
            toolCount: signals.toolCount,
        }
    })
    .generateScore(({ results }) => {
        const signals = buildSignals(results.preprocessStepResult)

        if (!signals.hasResponse) {
            return 0
        }

        return clamp(
            (signals.hasEvidence ? 0.45 : 0) +
                (signals.hasCaveat ? 0.2 : 0) +
                (signals.hasStructure ? 0.15 : 0) +
                (signals.toolCount > 0 ? 0.1 : 0.05) +
                (signals.responseText.length > 180 ? 0.05 : 0)
        )
    })
    .generateReason(({ results, score }) => {
        const signals = buildSignals(results.preprocessStepResult)
        const details: string[] = []

        if (signals.hasEvidence) details.push('it includes citations or dated evidence')
        if (signals.hasCaveat) details.push('it acknowledges uncertainty or caveats')
        if (signals.hasStructure) details.push('it is easy to inspect and verify')
        if (signals.toolCount > 0) details.push('it appears to be based on delegated research')

        return generateSupervisorReason('Evidence grounding', score, details)
    })

/**
 * Measures how well the supervisor response covers the major parts of the user request.
 */
export const supervisorCoverageScorer = createScorer({
    id: 'supervisor-request-coverage',
    name: 'Supervisor Request Coverage',
    description:
        'Checks whether the supervisor response covers the most important terms and sub-questions from the user request.',
    type: 'agent',
}).preprocess(({ run }) => buildSupervisorSnapshot(run))
    .analyze(({ results }) => {
        const signals = buildSignals(results.preprocessStepResult)

        return {
            hasResponse: signals.hasResponse,
            keyTerms: signals.keyTerms,
            keyTermCoverage: signals.keyTermCoverage,
            hasStructure: signals.hasStructure,
            paragraphCount: signals.paragraphCount,
        }
    })
    .generateScore(({ results }) => {
        const signals = buildSignals(results.preprocessStepResult)

        if (!signals.hasResponse) {
            return 0
        }

        return clamp(signals.keyTermCoverage * 0.75 + (signals.hasStructure ? 0.15 : 0) + (signals.paragraphCount >= 2 ? 0.1 : 0))
    })
    .generateReason(({ results, score }) => {
        const signals = buildSignals(results.preprocessStepResult)
        const details: string[] = []

        if (signals.keyTerms.length > 0) {
            details.push(`it covers ${Math.round(signals.keyTermCoverage * 100)}% of the important request terms`)
        }
        if (signals.hasStructure) details.push('it is organized for multi-part requests')
        if (signals.paragraphCount >= 2) details.push('it separates the response into readable sections')

        return generateSupervisorReason('Request coverage', score, details)
    })

/**
 * Measures whether the supervisor response includes concrete follow-up actions, priorities, or implementation steps.
 */
export const supervisorActionabilityScorer = createScorer({
    id: 'supervisor-actionability',
    name: 'Supervisor Actionability',
    description:
        'Checks whether the supervisor response ends with actionable next steps, priorities, or implementation guidance.',
    type: 'agent',
}).preprocess(({ run }) => buildSupervisorSnapshot(run))
    .analyze(({ results }) => {
        const signals = buildSignals(results.preprocessStepResult)

        return {
            hasResponse: signals.hasResponse,
            hasNextSteps: signals.hasNextSteps,
            hasPriorityLanguage: signals.hasPriorityLanguage,
            hasActionLanguage: signals.hasActionLanguage,
            hasStructure: signals.hasStructure,
        }
    })
    .generateScore(({ results }) => {
        const signals = buildSignals(results.preprocessStepResult)

        if (!signals.hasResponse) {
            return 0
        }

        return clamp(
            (signals.hasNextSteps ? 0.35 : 0) +
                (signals.hasPriorityLanguage ? 0.2 : 0) +
                (signals.hasActionLanguage ? 0.25 : 0) +
                (signals.hasStructure ? 0.15 : 0) +
                (signals.responseText.length > 120 ? 0.05 : 0)
        )
    })
    .generateReason(({ results, score }) => {
        const signals = buildSignals(results.preprocessStepResult)
        const details: string[] = []

        if (signals.hasNextSteps) details.push('it ends with next steps or follow-up guidance')
        if (signals.hasPriorityLanguage) details.push('it prioritizes the work by impact or effort')
        if (signals.hasActionLanguage) details.push('it uses concrete action language')
        if (signals.hasStructure) details.push('it is structured for execution')

        return generateSupervisorReason('Actionability', score, details)
    })

/**
 * Measures whether the supervisor states caveats, assumptions, or uncertainty instead of overcommitting.
 */
export const supervisorUncertaintyHandlingScorer = createScorer({
    id: 'supervisor-uncertainty-handling',
    name: 'Supervisor Uncertainty Handling',
    description:
        'Checks whether the supervisor acknowledges uncertainty, assumptions, and risk when evidence is incomplete.',
    type: 'agent',
}).preprocess(({ run }) => buildSupervisorSnapshot(run))
    .analyze(({ results }) => {
        const signals = buildSignals(results.preprocessStepResult)

        return {
            hasResponse: signals.hasResponse,
            hasCaveat: signals.hasCaveat,
            hasUncertaintyLanguage: signals.hasUncertaintyLanguage,
            hasEvidence: signals.hasEvidence,
            hasRoutingChatter: signals.hasRoutingChatter,
        }
    })
    .generateScore(({ results }) => {
        const signals = buildSignals(results.preprocessStepResult)

        if (!signals.hasResponse) {
            return 0
        }

        const overcommitment = /guarantee|certain|definitely|always|never/i.test(signals.responseText)

        return clamp(
            (signals.hasCaveat ? 0.45 : 0) +
                (signals.hasUncertaintyLanguage ? 0.2 : 0) +
                (signals.hasEvidence ? 0.2 : 0) +
                (!overcommitment ? 0.15 : -0.1) +
                (!signals.hasRoutingChatter ? 0.05 : 0)
        )
    })
    .generateReason(({ results, score }) => {
        const signals = buildSignals(results.preprocessStepResult)
        const details: string[] = []

        if (signals.hasCaveat) details.push('it acknowledges caveats or assumptions')
        if (signals.hasUncertaintyLanguage) details.push('it avoids absolute overcommitment')
        if (signals.hasEvidence) details.push('it grounds uncertainty with evidence')

        return generateSupervisorReason('Uncertainty handling', score, details)
    })

/**
 * Measures whether the supervisor answer is the right size for a final user-facing synthesis.
 */
export const supervisorConcisenessScorer = createScorer({
    id: 'supervisor-conciseness',
    name: 'Supervisor Conciseness',
    description:
        'Checks whether the supervisor response is substantial enough to be useful without becoming excessively long.',
    type: 'agent',
}).preprocess(({ run }) => buildSupervisorSnapshot(run))
    .analyze(({ results }) => {
        const signals = buildSignals(results.preprocessStepResult)

        return {
            hasResponse: signals.hasResponse,
            wordCount: signals.wordCount,
            paragraphCount: signals.paragraphCount,
            hasStructure: signals.hasStructure,
        }
    })
    .generateScore(({ results }) => {
        const signals = buildSignals(results.preprocessStepResult)

        if (!signals.hasResponse) {
            return 0
        }

        const wordScore =
            signals.wordCount < 90
                ? signals.wordCount / 90
                : signals.wordCount <= 900
                    ? 1
                    : clamp(1 - (signals.wordCount - 900) / 1500)

        const paragraphScore =
            signals.paragraphCount === 0
                ? 0
                : signals.paragraphCount <= 5
                    ? 1
                    : clamp(1 - (signals.paragraphCount - 5) / 10)

        return clamp(wordScore * 0.7 + paragraphScore * 0.2 + (signals.hasStructure ? 0.1 : 0))
    })
    .generateReason(({ results, score }) => {
        const signals = buildSignals(results.preprocessStepResult)
        const details: string[] = []

        details.push(`it is ${signals.wordCount} word(s) long`)
        if (signals.paragraphCount > 0) details.push(`it uses ${signals.paragraphCount} paragraph(s)`)
        if (signals.hasStructure) details.push('it has clear structure')

        return generateSupervisorReason('Conciseness', score, details)
    })

export const supervisorScorers = {
    routingDiscipline: { scorer: supervisorRoutingDisciplineScorer },
    evidenceGrounding: { scorer: supervisorEvidenceGroundingScorer },
    requestCoverage: { scorer: supervisorCoverageScorer },
    actionability: { scorer: supervisorActionabilityScorer },
    uncertaintyHandling: { scorer: supervisorUncertaintyHandlingScorer },
    conciseness: { scorer: supervisorConcisenessScorer },
}
