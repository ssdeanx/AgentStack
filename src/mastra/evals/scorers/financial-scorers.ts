import { createScorer } from '@mastra/core/evals'

interface FinancialAnalysisSections {
    technical?: unknown
    fundamental?: unknown
    sentiment?: unknown
}

interface FinancialAnalysisPayload {
    symbol?: unknown
    currentPrice?: unknown
    analysis?: FinancialAnalysisSections
    recommendation?: unknown
    priceTarget?: unknown
    risks?: unknown
    sources?: unknown
}

function isFinancialAnalysisPayload(
    value: unknown
): value is FinancialAnalysisPayload {
    return typeof value === 'object' && value !== null
}

function parseFinancialOutput(output: unknown): {
    json: FinancialAnalysisPayload | null
    text: string
} {
    if (typeof output === 'string') {
        const text = output

        try {
            const match = /```json\s*([\s\S]*?)\s*```/.exec(output)
            const rawJson = match?.[1] ?? output
            const parsed: unknown = JSON.parse(rawJson)

            return {
                json: isFinancialAnalysisPayload(parsed) ? parsed : null,
                text,
            }
        } catch {
            return { json: null, text }
        }
    }

    if (isFinancialAnalysisPayload(output)) {
        return {
            json: output,
            text: JSON.stringify(output),
        }
    }

    return { json: null, text: '' }
}

export const financialDataScorer = createScorer({
    id: 'financial-data-scorer',
    name: 'Financial Data Integrity',
    description:
        'Evaluates if the financial analysis output contains valid, complete, and sane data',
    judge: {
        model: 'google/gemini-3.1-flash-lite-preview',
        instructions: 'You are a financial data auditor.',
    },
    type: 'agent',
})
    .preprocess(({ run }) => {
        return parseFinancialOutput(run.output)
    })
    .analyze(({ results }) => {
        const { json } = results.preprocessStepResult

        if (json === null) {
            return {
                isValidJson: false,
                hasRequiredFields: false,
                dataSanityCheck: false,
                missingFields: ['ALL'],
                issues: ['Could not parse JSON output'],
            }
        }

        const requiredFields = [
            'symbol',
            'currentPrice',
            'analysis',
            'recommendation',
            'priceTarget',
            'risks',
            'sources',
        ]
        const missingFields = requiredFields.filter((field) => !(field in json))
        const hasRequiredFields = missingFields.length === 0

        const issues: string[] = []
        let dataSanityCheck = true

        if (typeof json.currentPrice !== 'number' || json.currentPrice < 0) {
            issues.push('currentPrice must be a positive number')
            dataSanityCheck = false
        }

        const validRecommendations = [
            'buy',
            'sell',
            'hold',
            'strong buy',
            'strong sell',
        ]
        if (
            typeof json.recommendation !== 'string' ||
            !validRecommendations.includes(json.recommendation.toLowerCase())
        ) {
            issues.push(
                `recommendation must be one of: ${validRecommendations.join(', ')}`
            )
            dataSanityCheck = false
        }

        if (json.analysis !== undefined) {
            if (json.analysis.technical === undefined) {
                issues.push('Missing technical analysis')
            }
            if (json.analysis.fundamental === undefined) {
                issues.push('Missing fundamental analysis')
            }
            if (json.analysis.sentiment === undefined) {
                issues.push('Missing sentiment analysis')
            }
        }

        return {
            isValidJson: true,
            hasRequiredFields,
            dataSanityCheck,
            missingFields,
            issues,
        }
    })
    .generateScore(({ results }) => {
        const { isValidJson, hasRequiredFields, dataSanityCheck } =
            results.analyzeStepResult
        if (!isValidJson) {
            return 0
        }

        let score = 0
        if (hasRequiredFields) {
            score += 0.6
        }
        if (dataSanityCheck) {
            score += 0.4
        }

        return score
    })
    .generateReason(({ results, score }) => {
        const { missingFields, issues } = results.analyzeStepResult
        return `Score: ${score.toFixed(2)}. ${missingFields.length > 0 ? 'Missing: ' + missingFields.join(', ') : ''} ${issues.length > 0 ? 'Issues: ' + issues.join(', ') : 'Data is valid.'}`
    })
