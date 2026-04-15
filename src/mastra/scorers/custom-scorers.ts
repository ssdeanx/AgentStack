import { createScorer } from '@mastra/core/evals'
import { extractAgentResponseMessages } from '../agents/evals/utils'

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

interface ParsedResearchOutput {
    sources?: Source[]
    learnings?: Learning[]
    summary?: string
    data?: string
}

const JSON_FENCE_REGEX = /```(?:json)?\s*([\s\S]*?)```/i
const URL_REGEX = /https?:\/\/[^\s<>\\")\]]+/g

function clamp(value: number, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value))
}

function safeJsonParse<T>(text: string): T | null {
    const candidates = [text]
    const fencedMatch = text.match(JSON_FENCE_REGEX)

    if (fencedMatch?.[1]) {
        candidates.push(fencedMatch[1].trim())
    }

    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        candidates.push(text.slice(firstBrace, lastBrace + 1))
    }

    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate) as T
        } catch {
            continue
        }
    }

    return null
}

function extractUrls(text: string) {
    return Array.from(text.matchAll(URL_REGEX), (match) => match[0])
}

function normalizeDomain(url: string) {
    try {
        const hostname = new URL(url).hostname.toLowerCase()
        return hostname.replace(/^www\./, '')
    } catch {
        return null
    }
}

function getTopDomains(domains: string[]) {
    const counts: Record<string, number> = {}

    domains.forEach((domain) => {
        counts[domain] = (counts[domain] || 0) + 1
    })

    return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .map(([domain, count]) => ({ domain, count }))
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
        const parsed = safeJsonParse<ParsedResearchOutput>(outputText)

        const sourcesFromJson = parsed?.sources?.flatMap((source) => {
            const url = typeof source.url === 'string' ? source.url : ''
            return url ? [url] : []
        }) ?? []

        const sources = sourcesFromJson.length > 0 ? sourcesFromJson : extractUrls(outputText)

        return { sources }
    })
    .analyze(({ results }) => {
        const sources = results.preprocessStepResult.sources ?? []

        if (sources.length === 0) {
            return {
                diversityScore: 0,
                uniqueDomains: 0,
                totalSources: 0,
                validSources: 0,
                domainBreakdown: {},
                issues: ['No sources found'],
                topDomains: [],
            }
        }

        const domains = sources
            .map((url: string) => normalizeDomain(url))
            .filter((domain): domain is string => Boolean(domain))

        const uniqueDomains = new Set(domains)
        const domainBreakdown: Record<string, number> = {}

        domains.forEach((domain) => {
            domainBreakdown[domain] = (domainBreakdown[domain] || 0) + 1
        })

        const validSources = domains.length
        const topDomains = getTopDomains(domains)
        const dominantDomainShare =
            validSources > 0 ? (topDomains[0]?.count ?? 0) / validSources : 0
        const diversityRatio =
            validSources > 0 ? uniqueDomains.size / validSources : 0
        const sourceCountScore = clamp(validSources / 3)
        const balanceScore = clamp(1 - dominantDomainShare)
        const diversityScore = clamp(
            diversityRatio * 0.45 + balanceScore * 0.4 + sourceCountScore * 0.15
        )

        const issues: string[] = []
        if (validSources !== sources.length) {
            issues.push('Some source URLs could not be parsed')
        }
        if (validSources < 3) {
            issues.push('Insufficient number of valid sources')
        }
        if (uniqueDomains.size < 2) {
            issues.push('Limited domain diversity - mostly single source')
        }
        if (dominantDomainShare > 0.6) {
            issues.push('Heavy reliance on single domain')
        }

        return {
            diversityScore,
            uniqueDomains: uniqueDomains.size,
            totalSources: sources.length,
            validSources,
            domainBreakdown,
            issues,
            topDomains,
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
        const parsed = safeJsonParse<ParsedResearchOutput>(outputText)
        const learnings = parsed?.learnings ?? []
        const summary = parsed?.summary ?? outputText
        const data = parsed?.data ?? ''

        return { learnings, summary, data }
    })
    .analyze(({ results }) => {
        const learnings = results.preprocessStepResult.learnings ?? []
        const summary = results.preprocessStepResult.summary ?? ''
        const data = results.preprocessStepResult.data ?? ''

        const totalContent = `${summary} ${data}`.toLowerCase()
        const learningCount = learnings.length
        const summaryLength = summary.trim().length
        const dataLength = data.trim().length

        const followUps = learnings
            .map((learning: Learning) =>
                typeof learning.followUp === 'string' ? learning.followUp.trim() : ''
            )
            .filter(Boolean)

        const strengths: string[] = []
        const weaknesses: string[] = []

        const aspects = {
            hasMultiplePerspectives:
                /different|various|alternative|compared|versus|however|but|although/i.test(
                    totalContent
                ),
            hasDepth: learningCount > 3 || totalContent.length > 700,
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
            hasSpecificEvidence:
                /\b\d+(\.\d+)?%?\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\b(?:202[0-9]|19[0-9]{2})\b/i.test(
                    totalContent
                ),
            hasFollowUp: followUps.length > 0,
            hasStructure:
                /^#{1,6}\s|^[-*]\s|^\d+\.\s/m.test(summary) || dataLength > 0,
        }

        const weightedAspects: Array<[keyof typeof aspects, number]> = [
            ['hasMultiplePerspectives', 0.18],
            ['hasDepth', 0.22],
            ['hasExamples', 0.12],
            ['hasContext', 0.12],
            ['hasAnalysis', 0.16],
            ['hasSpecificEvidence', 0.1],
            ['hasFollowUp', 0.06],
            ['hasStructure', 0.04],
        ]

        const weightedScore = weightedAspects.reduce((score, [key, weight]) => {
            return score + (aspects[key] ? weight : 0)
        }, 0)

        const aspectsCovered = Object.values(aspects).filter(Boolean).length
        const totalAspects = Object.keys(aspects).length
        const completenessScore = clamp(weightedScore)

        if (aspects.hasMultiplePerspectives) strengths.push('Includes comparative framing')
        if (aspects.hasDepth) strengths.push('Shows meaningful depth')
        if (aspects.hasExamples) strengths.push('Uses concrete examples')
        if (aspects.hasContext) strengths.push('Provides background or context')
        if (aspects.hasAnalysis) strengths.push('Connects facts to reasoning')
        if (aspects.hasSpecificEvidence) strengths.push('Includes specific evidence')
        if (aspects.hasFollowUp) strengths.push('Includes actionable follow-up ideas')
        if (aspects.hasStructure) strengths.push('Has a structured presentation')

        if (!aspects.hasMultiplePerspectives) weaknesses.push('Could compare more alternatives or viewpoints')
        if (!aspects.hasDepth) weaknesses.push('Could expand the analysis with more detail')
        if (!aspects.hasExamples) weaknesses.push('Could add examples or case-level evidence')
        if (!aspects.hasContext) weaknesses.push('Could add more background or context')
        if (!aspects.hasAnalysis) weaknesses.push('Could explain more of the reasoning behind conclusions')
        if (!aspects.hasSpecificEvidence) weaknesses.push('Could include more specific evidence or dates')
        if (!aspects.hasFollowUp) weaknesses.push('Could include next steps or follow-up questions')
        if (!aspects.hasStructure) weaknesses.push('Could improve structure and readability')

        return {
            completenessScore,
            aspectsCovered,
            totalAspects,
            learningCount,
            contentLength: totalContent.length,
            summaryLength,
            dataLength,
            strengths,
            weaknesses,
            aspects,
        }
    })
    .generateScore(({ results }) => results.analyzeStepResult.completenessScore)
