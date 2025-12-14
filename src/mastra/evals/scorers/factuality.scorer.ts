import { createScorer } from '@mastra/core/evals'
import { googleAIFlashLite } from '../../config/google'
import { z } from 'zod'

export const factualityScorer = createScorer({
    id: 'factuality-scorer',
    name: 'Factuality',
    description: 'Evaluates if the claims in the output are factual and supported by evidence',
    judge: {
        model: googleAIFlashLite,
        instructions: 'You are a fact-checker and research evaluator.'
    },
    type: 'agent'
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
    description: 'Check for factual claims and hallucinations',
    outputSchema: z.object({
        factualScore: z.number().min(0).max(1),
        unsupportedClaims: z.array(z.string()),
        hallucinations: z.array(z.string()),
        explanation: z.string()
    }),
    createPrompt: ({ results }) => `Analyze the following text for factuality.\n\nText:\n"""\n${results.preprocessStepResult.text.substring(0, 3000)}\n"""\n\nTasks:\n1. Identify key factual claims made in the text.\n2. Verify if these claims are generally known to be true or if they appear to be hallucinations (plausible but false/unverifiable).\n3. Check for internal contradictions.\n\nReturn JSON: { factualScore: number, unsupportedClaims: string[], hallucinations: string[], explanation: string }`
})
.generateScore(({ results }) => results.analyzeStepResult.factualScore)
.generateReason(({ results, score }) => {
    const { unsupportedClaims, hallucinations, explanation } = results.analyzeStepResult
    let reason = `Score: ${score.toFixed(2)}. `
    if (hallucinations.length > 0) {reason += `Detected hallucinations: ${hallucinations.join(', ')}. `}
    if (unsupportedClaims.length > 0) {reason += `Unsupported claims: ${unsupportedClaims.join(', ')}. `}
    reason += explanation
    return reason
})
