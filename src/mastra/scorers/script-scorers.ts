import { createScorer } from '@mastra/core/scores'
import { googleAIFlashLite } from '../config/google'
import { z } from 'zod'

export const scriptFormatScorer = createScorer({
    name: 'Script Formatting',
    description: 'Evaluates if the script follows the required formatting rules (brackets for cues, capitals for emphasis, etc.)',
    judge: {
        model: googleAIFlashLite,
        instructions: 'You are an expert script editor and formatting specialist.'
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
.analyze(({ results }) => {
    const { text } = results.preprocessStepResult
    
    // Regex checks
    const bracketCues = (text.match(/\[.*?\]/g) || []).length
    const parentheticalTone = (text.match(/\(.*?\)/g) || []).length
    
    // Check for capitalized words (2+ letters) to avoid "I", "A"
    // We want to see if there is *some* emphasis
    const capitalizedEmphasis = (text.match(/\b[A-Z]{2,}\b/g) || []).length
    
    const issues: string[] = []
    let score = 1.0
    
    if (bracketCues === 0) {
        issues.push('No visual/audio cues found in [BRACKETS]')
        score -= 0.3
    }
    
    if (capitalizedEmphasis < 2) {
        issues.push('Little to no capitalized emphasis found')
        score -= 0.2
    }
    
    // Tone shifts are optional but good
    if (parentheticalTone === 0) {
        // issues.push('No tone shifts found in (parentheses)') 
        // Don't penalize too much, maybe it's a short script
    }
    
    // Check for short paragraphs (heuristic: split by double newline, check avg length)
    const paragraphs = text.split(/\n\s*\n/)
    const longParagraphs = paragraphs.filter(p => p.length > 300).length
    if (longParagraphs > 0) {
        issues.push(`${longParagraphs} paragraphs are too long (>300 chars)`)
        score -= 0.1 * longParagraphs
    }
    
    return {
        hasVisualCues: bracketCues > 0,
        hasAudioCues: bracketCues > 0, // Assuming brackets cover both
        hasCapitalizedEmphasis: capitalizedEmphasis > 1,
        hasToneShifts: parentheticalTone > 0,
        formattingScore: Math.max(0, score),
        issues
    }
})
.generateScore(({ results }) => {
    return results.analyzeStepResult.formattingScore
})
.generateReason(({ results, score }) => {
    const { issues } = results.analyzeStepResult
    return `Score: ${score.toFixed(2)}. ${issues.length > 0 ? 'Issues: ' + issues.join(', ') : 'Perfect formatting.'}`
})

export const pacingScorer = createScorer({
    name: 'Script Pacing',
    description: 'Evaluates the pacing and structure of the script (Hook, Body, Payoff)',
    judge: {
        model: googleAIFlashLite,
        instructions: 'You are an expert script consultant focusing on engagement and pacing.'
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
    description: 'Analyze script structure and pacing',
    outputSchema: z.object({
        hasHook: z.boolean(),
        hasBody: z.boolean(),
        hasPayoff: z.boolean(),
        pacingScore: z.number().min(0).max(1),
        engagementLevel: z.enum(['Low', 'Medium', 'High']),
        explanation: z.string()
    }),
    createPrompt: ({ results }) => `
        Analyze the pacing and structure of the script.
        
        Script:
        """
        ${results.preprocessStepResult.text.substring(0, 3000)}
        """
        
        Check for:
        1. **The Hook**: Does it start with a pattern interrupt or high stakes?
        2. **The Body**: Is there a "slippery slide" effect? Does it use "But... therefore..." logic?
        3. **The Payoff**: Is there a clear conclusion and Call to Action (CTA)?
        
        Return JSON:
        - hasHook: boolean
        - hasBody: boolean
        - hasPayoff: boolean
        - pacingScore: number (0-1)
        - engagementLevel: 'Low' | 'Medium' | 'High'
        - explanation: string
    `
})
.generateScore(({ results }) => {
    return results.analyzeStepResult.pacingScore
})
.generateReason(({ results, score }) => {
    const { engagementLevel, explanation } = results.analyzeStepResult
    return `Score: ${score.toFixed(2)}. Engagement: ${engagementLevel}. ${explanation}`
})
