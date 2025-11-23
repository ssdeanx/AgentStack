import { createScorer } from '@mastra/core/scores'
import { googleAIFlashLite } from '../config/google'
import { z } from 'zod'

export const factualityScorer = createScorer({
    name: 'Factuality',
    description: 'Evaluates if the claims in the output are factual and supported by evidence',
    judge: {
        model: googleAIFlashLite,
        instructions: 'You are a fact-checker and research evaluator.'
    }
})
.preprocess(({ run }) => {
    const output = run.output
    let text = ''
    if (typeof output === 'string') {
        text = output
    } else if (output && typeof output === 'object') {
        text = JSON.stringify(output)
    }
    
    // Ideally, we would have access to the "ground truth" or "search results" in the run context.
    // If the agent put search results in the output (like researchAgent does), we can use them.
    // Otherwise, the LLM judge will have to rely on its own knowledge base (which is a proxy for factuality).
    
    return { text }
})
.analyze({
    description: 'Check for factual claims and hallucinations',
    outputSchema: z.object({
        factualScore: z.number().min(0).max(1),
        unsupportedClaims: z.array(z.string()),
        hallucinations: z.array(z.string()),
        explanation: z.string()
    }),
    createPrompt: ({ results }) => `
        Analyze the following text for factuality.
        
        Text:
        """
        ${results.preprocessStepResult.text.substring(0, 3000)}
        """
        
        Tasks:
        1. Identify key factual claims made in the text.
        2. Verify if these claims are generally known to be true or if they appear to be hallucinations (plausible but false/unverifiable).
        3. Check for internal contradictions.
        
        Note: Since you don't have external search access right now, rely on your internal knowledge base to flag obvious errors or highly suspicious claims.
        
        Return JSON:
        - factualScore: number (0-1, where 1 is fully factual)
        - unsupportedClaims: string[] (claims that seem dubious)
        - hallucinations: string[] (claims that are likely false)
        - explanation: string
    `
})
.generateScore(({ results }) => {
    return results.analyzeStepResult.factualScore
})
.generateReason(({ results, score }) => {
    const { unsupportedClaims, hallucinations, explanation } = results.analyzeStepResult
    let reason = `Score: ${score.toFixed(2)}. `
    if (hallucinations.length > 0) reason += `Detected hallucinations: ${hallucinations.join(', ')}. `
    if (unsupportedClaims.length > 0) reason += `Unsupported claims: ${unsupportedClaims.join(', ')}. `
    reason += explanation
    return reason
})
