import { createScorer } from '@mastra/core/scores'
import { googleAIFlashLite } from '../config/google'
import { z } from 'zod'

export const csvValidityScorer = createScorer({
    name: 'CSV Validity',
    description: 'Evaluates if the output is a valid CSV and follows the required schema',
    judge: {
        model: googleAIFlashLite,
        instructions: 'You are a data format specialist.'
    }
})
.preprocess(({ run }) => {
    const {output} = run
    let text = ''
    if (typeof output === 'string') {
        text = output
    } else if (output && typeof output === 'object') {
        text = JSON.stringify(output)
    }
    return { text }
})
.analyze({
    description: 'Check CSV format and headers',
    outputSchema: z.object({
        isCsv: z.boolean(),
        hasHeaderRow: z.boolean(),
        rowCount: z.number(),
        columnCount: z.number(),
        isValidFormat: z.boolean(),
        issues: z.array(z.string())
    }),
    createPrompt: ({ results }) => `
        Analyze the following text to see if it is a valid CSV.
        
        Text:
        """
        ${results.preprocessStepResult.text.substring(0, 3000)}
        """
        
        Checks:
        1. Does it look like CSV (comma separated values)?
        2. Is there a header row?
        3. Are the number of columns consistent across rows?
        4. For Image to CSV specifically, does it have columns like 'id', 'type', 'x', 'y', 'width', 'height'?
        
        Return JSON:
        - isCsv: boolean
        - hasHeaderRow: boolean
        - rowCount: number
        - columnCount: number
        - isValidFormat: boolean
        - issues: string[]
    `
})
.generateScore(({ results }) => {
    const { isCsv, isValidFormat, hasHeaderRow } = results.analyzeStepResult
    if (!isCsv) return 0
    
    let score = 0.2
    if (hasHeaderRow) score += 0.3
    if (isValidFormat) score += 0.5
    
    return score
})
.generateReason(({ results, score }) => {
    const { issues, rowCount } = results.analyzeStepResult
    return `Score: ${score.toFixed(2)}. Rows: ${rowCount}. ${issues.length > 0 ? 'Issues: ' + issues.join(', ') : 'Valid CSV.'}`
})
