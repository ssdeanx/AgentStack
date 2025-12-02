import { createScorer } from '@mastra/core/scores'
import { googleAIFlashLite } from '../config/google'
import { z } from 'zod'

export const toneConsistencyScorer = createScorer({
    name: 'Tone Consistency',
    description: 'Evaluates if the content matches the requested tone (professional, casual, technical, etc.)',
    judge: {
        model: googleAIFlashLite,
        instructions: 'You are an expert editor and tone evaluator. Your job is to analyze text and determine if it adheres to a specific tone.'
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

    // Try to extract the requested tone from the input instructions if available
    // This assumes the input follows a structure where we can find the tone, 
    // or we default to checking for consistency within the text itself.
    // For this scorer, we'll look for a 'tone' property in the input context or instructions.
    let requestedTone = 'consistent'
    const {input} = run
    if (input && typeof input === 'object') {
        if ('tone' in input) requestedTone = (input as any).tone
        else if ('instructions' in input && typeof (input as any).instructions === 'string') {
            const match = (input as any).instructions.match(/tone:?\s*(\w+)/i)
            if (match) requestedTone = match[1]
        }
    }

    return { text, requestedTone }
})
.analyze({
    description: 'Analyze the text for tone markers and consistency',
    outputSchema: z.object({
        detectedTone: z.string(),
        consistencyScore: z.number().min(0).max(1),
        matchesRequested: z.boolean(),
        markers: z.array(z.string()),
        explanation: z.string()
    }),
    createPrompt: ({ results }) => `
        Analyze the following text for its tone and style.
        
        Requested Tone: ${results.preprocessStepResult.requestedTone}
        
        Text to Analyze:
        """
        ${results.preprocessStepResult.text.substring(0, 2000)}
        """
        
        Determine:
        1. The dominant tone of the text (e.g., professional, casual, academic, urgent, etc.).
        2. How consistent the tone is throughout the text (0-1).
        3. If the detected tone matches the requested tone (true/false). If requested tone is 'consistent', check if the text is internally consistent.
        4. Identify specific words or phrases (markers) that establish this tone.
        
        Return a JSON object with:
        - detectedTone: string
        - consistencyScore: number (0-1)
        - matchesRequested: boolean
        - markers: string[]
        - explanation: string
    `
})
.generateScore(({ results }) => {
    const { consistencyScore, matchesRequested } = results.analyzeStepResult
    // If specific tone was requested, matching it is most important.
    // If just consistency was requested, the consistency score is used.
    if (results.preprocessStepResult.requestedTone !== 'consistent') {
        return matchesRequested ? consistencyScore : consistencyScore * 0.5
    }
    return consistencyScore
})
.generateReason(({ results, score }) => {
    const { detectedTone, matchesRequested, explanation } = results.analyzeStepResult
    const requested = results.preprocessStepResult.requestedTone
    
    return `Score: ${score.toFixed(2)}. Detected tone: "${detectedTone}". ` +
           (requested !== 'consistent' ? `Requested: "${requested}". Match: ${matchesRequested}. ` : '') +
           `${explanation}`
})
