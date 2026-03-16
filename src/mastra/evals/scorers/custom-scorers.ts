import { createScorer } from '@mastra/core/evals'
import { extractAgentResponseMessages } from './utils'

// Typings for parsed outputs
interface Source {
    [key: string]: unknown
    url: string
    title?: string
}
interface Learning {
    [key: string]: unknown
    insight?: string
    followUp?: string
}

// Source Diversity Scorer - evaluates if sources come from different domains
export const sourceDiversityScorer = createScorer({
    id: 'source-diversity-scorer',
    name: 'Source Diversity',
    description:
        'Evaluates if research sources come from diverse domains and avoid single-source bias',
    type: 'agent',
    judge: {
        model: 'google/gemini-3.1-flash-lite-preview',
        instructions:
            'You are an expert research evaluator focused on source credibility and diversity.',
    },
})
    .preprocess(({ run }) => {
        const outputText = extractAgentResponseMessages(run.output).join('\n')
        let sources: string[] = []

        try {
            const parsed = JSON.parse(outputText) as { sources?: Source[] }
            sources = parsed.sources?.map((source) => source.url) ?? []
        } catch {
            const urlRegex = /https?:\/\/[^\s]+/g
            sources = Array.from(outputText.matchAll(urlRegex), (match) => match[0])
        }

        return { sources }
    })
    .analyze(({ results }) => {
        const sources = results.preprocessStepResult.sources ?? []

        if (sources.length === 0) {
            return {
                diversityScore: 0,
                uniqueDomains: 0,
                totalSources: 0,
                domainBreakdown: {},
                issues: ['No sources found'],
            }
        }

        const domains = sources
            .map((url: string) => {
                try {
                    const urlObj = new URL(url)
                    return urlObj.hostname.replace('www.', '')
                } catch {
                    return 'invalid'
                }
            })
            .filter((d) => d !== 'invalid')

        const uniqueDomains = new Set(domains)
        const domainBreakdown: Record<string, number> = {}

        domains.forEach((domain) => {
            domainBreakdown[domain] = (domainBreakdown[domain] || 0) + 1
        })

        const diversityScore = uniqueDomains.size / Math.max(sources.length, 1)

        const issues: string[] = []
        if (uniqueDomains.size < 2) {
            issues.push('Limited domain diversity - mostly single source')
        }
        if (sources.length < 3) {
            issues.push('Insufficient number of sources')
        }
        if (
            Object.values(domainBreakdown).some(
                (count) => count > sources.length * 0.6
            )
        ) {
            issues.push('Heavy reliance on single domain')
        }

        return {
            diversityScore,
            uniqueDomains: uniqueDomains.size,
            totalSources: sources.length,
            domainBreakdown,
            issues,
        }
    })
    .generateScore(({ results }) => {
        return results.analyzeStepResult.diversityScore
    })

// Other scorers (researchCompleteness, summaryQuality, taskCompletion, responseQuality, creativity)
export const researchCompletenessScorer = createScorer({
    id: 'research-completeness-scorer',
    name: 'Research Completeness',
    description:
        'Evaluates if the research comprehensively covers the topic from multiple angles',
    type: 'agent',
    judge: {
        model: 'google/gemini-3.1-flash-lite-preview',
        instructions:
            'You are an expert research evaluator focused on completeness and depth of analysis.',
    },
})
    .preprocess(({ run }) => {
        const outputText = extractAgentResponseMessages(run.output).join('\n')
        let learnings: Learning[] = []
        let summary = ''
        let data = ''

        try {
            const parsed = JSON.parse(outputText) as {
                learnings?: Learning[]
                summary?: string
                data?: string
            }
            learnings = parsed.learnings ?? []
            summary = parsed.summary ?? ''
            data = parsed.data ?? ''
        } catch {
            summary = outputText
        }

        return { learnings, summary, data }
    })
    .analyze(({ results }) => {
        const learnings = results.preprocessStepResult.learnings ?? []
        const summary = results.preprocessStepResult.summary ?? ''
        const data = results.preprocessStepResult.data ?? ''

        const totalContent = `${summary} ${data}`.toLowerCase()
        const learningCount = learnings.length

        const aspects = {
            hasMultiplePerspectives:
                /different|various|alternative|compared|versus|however|but|although/i.test(
                    totalContent
                ),
            hasDepth: learningCount > 3 || totalContent.length > 500,
            hasExamples: /example|instance|case|such as|for example/i.test(
                totalContent
            ),
            hasContext:
                /background|context|history|overview|introduction/i.test(
                    totalContent
                ),
            hasAnalysis:
                /because|therefore|thus|consequently|as a result|due to/i.test(
                    totalContent
                ),
            hasFollowUp: learnings.some(
                (l: Learning) =>
                    Boolean(l.followUp) &&
                    typeof l.followUp === 'string' &&
                    l.followUp.trim().length > 0
            ),
        }

        const aspectsCovered = Object.values(aspects).filter(Boolean).length
        const totalAspects = Object.keys(aspects).length
        const completenessScore = aspectsCovered / totalAspects

        return {
            completenessScore,
            aspectsCovered,
            totalAspects,
            learningCount,
            contentLength: totalContent.length,
            strengths: [],
            weaknesses: [],
            aspects,
        }
    })
    .generateScore(({ results }) => results.analyzeStepResult.completenessScore)
