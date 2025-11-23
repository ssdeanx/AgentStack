import { createScorer } from '@mastra/core/scores'
import { googleAIFlashLite } from '../config/google'
import { z } from 'zod'
import { generateText } from 'ai'

export const structureScorer = createScorer({
    name: 'Structure Compliance',
    description: 'Evaluates if the content follows the required structure (e.g. specific sections, JSON format)',
    judge: {
        model: googleAIFlashLite,
        instructions: 'You are a structural editor and compliance checker.'
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
    
    // Determine expected structure from input context if possible
    // For Content Strategist, we expect: Title Variations, Target Audience, One Thing, Key Points, Differentiation
    const input = run.input
    let expectedSections: string[] = []
    
    // Heuristic: Check which agent is running or look at instructions
    // This is a general scorer, but we can default to checking for common structured elements
    // or specific ones if we can infer the intent.
    // For now, we'll let the LLM infer the *intended* structure from the prompt if available, 
    // or just check for general structural integrity (headings, lists).
    
    return { text, input: JSON.stringify(input) }
})
.analyze(async ({ results, run }) => {
    const { text } = results.preprocessStepResult
    const context = run.runtimeContext || {}
    const expectedKeys = context.expectedKeys as string[] | undefined
    const expectedSections = context.expectedSections as string[] | undefined
    
    // Deterministic JSON Key Check
    if (expectedKeys && Array.isArray(expectedKeys)) {
        try {
            const json = JSON.parse(text)
            const missingKeys = expectedKeys.filter(key => !(key in json))
            return {
                hasStructure: missingKeys.length === 0,
                missingSections: missingKeys,
                formattingScore: missingKeys.length === 0 ? 1 : Math.max(0, 1 - (missingKeys.length * 0.2)),
                explanation: missingKeys.length === 0 
                    ? 'All expected JSON keys are present.' 
                    : `Missing JSON keys: ${missingKeys.join(', ')}`
            }
        } catch (e) {
            return {
                hasStructure: false,
                missingSections: expectedKeys,
                formattingScore: 0,
                explanation: 'Output is not valid JSON, cannot check for keys.'
            }
        }
    }

    // Deterministic Markdown Section Check
    if (expectedSections && Array.isArray(expectedSections)) {
        const missingSections = expectedSections.filter(section => !text.toLowerCase().includes(section.toLowerCase()))
        return {
            hasStructure: missingSections.length === 0,
            missingSections,
            formattingScore: missingSections.length === 0 ? 1 : Math.max(0, 1 - (missingSections.length * 0.2)),
            explanation: missingSections.length === 0
                ? 'All expected sections found.'
                : `Missing sections: ${missingSections.join(', ')}`
        }
    }

    // Fallback to LLM for generic structure check
    const result = await generateText({
        model: googleAIFlashLite,
        prompt: `
        Analyze the response to see if it follows a logical or requested structure.
        
        Input Context (what was asked):
        """
        ${results.preprocessStepResult.input.substring(0, 500)}
        """
        
        Response to Analyze:
        """
        ${text.substring(0, 2000)}
        """
        
        1. Identify if the response is structured (uses headings, bullet points, JSON keys, etc.).
        2. Based on the input, are there specific sections that were clearly requested (e.g., "Title", "Summary", "Key Points")?
        3. List any missing sections.
        4. Rate the formatting quality (0-1).
        
        Return JSON:
        {
            "hasStructure": boolean,
            "missingSections": string[],
            "formattingScore": number,
            "explanation": string
        }
    `})
    
    try {
        const json = JSON.parse(result.text.replace(/```json\n?|\n?```/g, ''))
        return {
            hasStructure: json.hasStructure,
            missingSections: json.missingSections || [],
            formattingScore: json.formattingScore,
            explanation: json.explanation
        }
    } catch (e) {
        return {
            hasStructure: false,
            missingSections: [],
            formattingScore: 0.5,
            explanation: 'Failed to parse LLM analysis.'
        }
    }
})
.generateScore(({ results }) => {
    const { hasStructure, missingSections, formattingScore } = results.analyzeStepResult
    
    if (!hasStructure) return 0.2
    
    // Penalize for missing sections
    const penalty = missingSections.length * 0.15
    const score = Math.max(0, formattingScore - penalty)
    
    return score
})
.generateReason(({ results, score }) => {
    const { missingSections, explanation } = results.analyzeStepResult
    return `Score: ${score.toFixed(2)}. ${missingSections.length > 0 ? 'Missing sections: ' + missingSections.join(', ') + '.' : 'Structure is complete.'} ${explanation}`
})
