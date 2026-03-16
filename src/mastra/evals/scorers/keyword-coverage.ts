import { createScorer } from '@mastra/core/evals'

interface KeywordCoverageRequestContext {
    requiredKeywords?: string[]
}

function getRequiredKeywords(
    requestContext: unknown
): string[] {
    if (typeof requestContext !== 'object' || requestContext === null) {
        return []
    }

    const requiredKeywords = (requestContext as Record<string, unknown>)[
        'requiredKeywords'
    ]

    if (!Array.isArray(requiredKeywords)) {
        return []
    }

    return requiredKeywords.filter(
        (keyword): keyword is string => typeof keyword === 'string'
    )
}

export const keywordCoverageScorer = createScorer({
    id: 'keyword-coverage',
    name: 'Keyword Coverage',
    description: 'Measures coverage of required keywords in output',
    type: 'agent',
}).generateScore(({ run }) => {
    const output = JSON.stringify(run.output ?? '')
    const required = getRequiredKeywords(run.requestContext)

    if (required.length === 0) {
        return 1
    }

    const matched = required.filter((k: string) =>
        output.toLowerCase().includes(k.toLowerCase())
    ).length

    return matched / required.length
})
