import { createScorer } from '@mastra/core/scores'
import { googleAIFlashLite } from '../config/google'
import { z } from 'zod'

export const financialDataScorer = createScorer({
    name: 'Financial Data Integrity',
    description: 'Evaluates if the financial analysis output contains valid, complete, and sane data',
    judge: {
        model: googleAIFlashLite,
        instructions: 'You are a financial data auditor.'
    }
})
.preprocess(({ run }) => {
    const {output} = run
    let json: any = null
    let text = ''
    
    if (typeof output === 'string') {
        text = output
        try {
            // Try to find JSON block if embedded in markdown
            const match = output.match(/```json\s*([\s\S]*?)\s*```/)
            if (match) {
                json = JSON.parse(match[1])
            } else {
                json = JSON.parse(output)
            }
        } catch (e) {
            // invalid json
        }
    } else if (output && typeof output === 'object') {
        json = output
        text = JSON.stringify(output)
    }
    
    return { json, text }
})
.analyze(({ results }) => {
    const { json } = results.preprocessStepResult
    
    if (!json) {
        return {
            isValidJson: false,
            hasRequiredFields: false,
            dataSanityCheck: false,
            missingFields: ['ALL'],
            issues: ['Could not parse JSON output']
        }
    }

    const requiredFields = ['symbol', 'currentPrice', 'analysis', 'recommendation', 'priceTarget', 'risks', 'sources']
    const missingFields = requiredFields.filter(field => !(field in json))
    const hasRequiredFields = missingFields.length === 0
    
    const issues: string[] = []
    let dataSanityCheck = true
    
    if (typeof json.currentPrice !== 'number' || json.currentPrice < 0) {
        issues.push('currentPrice must be a positive number')
        dataSanityCheck = false
    }
    
    const validRecommendations = ['buy', 'sell', 'hold', 'strong buy', 'strong sell']
    if (typeof json.recommendation !== 'string' || !validRecommendations.includes(json.recommendation.toLowerCase())) {
        issues.push(`recommendation must be one of: ${validRecommendations.join(', ')}`)
        dataSanityCheck = false
    }

    if (json.analysis) {
        if (!json.analysis.technical) issues.push('Missing technical analysis')
        if (!json.analysis.fundamental) issues.push('Missing fundamental analysis')
        if (!json.analysis.sentiment) issues.push('Missing sentiment analysis')
    }

    return {
        isValidJson: true,
        hasRequiredFields,
        dataSanityCheck,
        missingFields,
        issues
    }
})
.generateScore(({ results }) => {
    const { isValidJson, hasRequiredFields, dataSanityCheck } = results.analyzeStepResult
    if (!isValidJson) return 0
    
    let score = 0
    if (hasRequiredFields) score += 0.6
    if (dataSanityCheck) score += 0.4
    
    return score
})
.generateReason(({ results, score }) => {
    const { missingFields, issues } = results.analyzeStepResult
    return `Score: ${score.toFixed(2)}. ${missingFields.length > 0 ? 'Missing: ' + missingFields.join(', ') : ''} ${issues.length > 0 ? 'Issues: ' + issues.join(', ') : 'Data is valid.'}`
})
