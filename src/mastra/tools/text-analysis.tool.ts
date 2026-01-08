import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { trace } from '@opentelemetry/api'
import { z } from 'zod'
import { log } from '../config/logger'

import type { RequestContext } from '@mastra/core/request-context'

export interface TextAnalysisToolContext extends RequestContext {
    defaultLanguage?: string
    includeAdvancedMetrics?: boolean
}

export const textAnalysisTool = createTool({
    id: 'text-analysis',
    description:
        'Analyze text for word count, readability, and basic statistics',
    inputSchema: z.object({
        text: z.string().describe('Text to analyze'),
        operations: z
            .array(
                z.enum([
                    'word-count',
                    'sentence-count',
                    'paragraph-count',
                    'readability',
                    'sentiment',
                    'language-detect',
                    'summary',
                ])
            )
            .optional()
            .default(['word-count'])
            .describe('Analysis operations to perform'),
        language: z
            .string()
            .optional()
            .describe('Language for analysis (ISO 639-1 codes)'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        results: z.record(
            z.string(),
            z.union([
                z.number(),
                z.string(),
                z.object({
                    score: z.number(),
                    level: z.string(),
                    grade: z.string().optional(),
                }),
                z.object({
                    polarity: z.number(),
                    subjectivity: z.number(),
                    confidence: z.number(),
                }),
            ])
        ),
        operations: z.array(z.string()),
        textLength: z.number(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const writer = context?.writer
        const requestCtx = context?.requestContext as TextAnalysisToolContext | undefined
        const defaultLanguage = requestCtx?.defaultLanguage ?? 'en'
        const includeAdvancedMetrics = requestCtx?.includeAdvancedMetrics ?? false

        const tracer = trace.getTracer('text-analysis-tool', '1.0.0')
        const span = tracer.startSpan('text-analysis', {
            attributes: {
                'tool.id': 'text-analysis',
                'tool.input.textLength': inputData.text.length,
                'tool.input.operations': inputData.operations.join(','),
            },
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📊 Analyzing text (${inputData.text.length} chars)...`,
                stage: 'text-analysis',
            },
            id: 'text-analysis',
        })

        try {
            type TextAnalysisResult =
                | string
                | number
                | { score: number; level: string; grade?: string }
                | { polarity: number; subjectivity: number; confidence: number }
            const results: Record<string, TextAnalysisResult> = {}
            const language = inputData.language ?? defaultLanguage
            const includeAdvancedMetricsFlag = includeAdvancedMetrics ?? false

            for (const operation of inputData.operations) {
                switch (operation) {
                    case 'word-count':
                        results[operation] = countWords(inputData.text)
                        break
                    case 'sentence-count':
                        results[operation] = countSentences(inputData.text)
                        break
                    case 'paragraph-count':
                        results[operation] = countParagraphs(inputData.text)
                        break
                    case 'readability':
                        results[operation] = calculateReadability(
                            inputData.text,
                            language
                        )
                        break
                    case 'sentiment':
                        if (includeAdvancedMetricsFlag) {
                            results[operation] = analyzeSentiment(
                                inputData.text,
                                language
                            )
                        } else {
                            results[operation] = 'Advanced metrics disabled'
                        }
                        break
                    case 'language-detect':
                        results[operation] = detectLanguage(inputData.text)
                        break
                    case 'summary':
                        results[operation] = generateSummary(inputData.text)
                        break
                    default:
                        throw new Error(`Unknown operation: ${operation}`)
                }
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Text analysis completed (${inputData.operations.length} operations)`,
                    stage: 'text-analysis',
                },
                id: 'text-analysis',
            })

            span.setAttributes({
                'tool.output.success': true,
                'tool.output.operationsCount': inputData.operations.length,
            })
            span.end()

            return {
                success: true,
                results,
                operations: inputData.operations,
                textLength: inputData.text.length,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`Text analysis failed: ${errorMsg}`, { error: errorMsg })

            if (e instanceof Error) {
                span.recordException(e)
            }
            span.setStatus({ code: 2, message: errorMsg })
            span.end()

            return {
                success: false,
                results: {},
                operations: inputData.operations,
                textLength: inputData.text.length,
                message: errorMsg,
            }
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Text analysis tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Text analysis tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Text analysis tool received input', {
            toolCallId,
            messageCount: messages.length,
            inputData: {
                textLength: input.text?.length ?? 0,
                operationsCount: input.operations?.length ?? 0,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Text analysis tool completed', {
            toolCallId,
            toolName,
            outputData: {
                success: output.success,
                operationsCompleted: output.operations?.length ?? 0,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export const textProcessingTool = createTool({
    id: 'text-processing',
    description: 'Process and transform text with various operations',
    inputSchema: z.object({
        text: z.string().describe('Text to process'),
        operations: z
            .array(
                z.enum([
                    'lowercase',
                    'uppercase',
                    'capitalize',
                    'trim',
                    'remove-extra-spaces',
                    'remove-punctuation',
                    'extract-numbers',
                    'extract-emails',
                    'extract-urls',
                    'count-characters',
                ])
            )
            .describe('Processing operations to apply'),
        options: z
            .object({
                preserveCase: z.boolean().optional().default(false),
                removeNewlines: z.boolean().optional().default(false),
            })
            .optional(),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        processedText: z.string(),
        operations: z.array(z.string()),
        statistics: z.object({
            originalLength: z.number(),
            processedLength: z.number(),
            changes: z.number(),
        }),
        extracted: z.record(z.string(), z.array(z.string())).optional(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const writer = context?.writer

        const tracer = trace.getTracer('text-processing-tool', '1.0.0')
        const span = tracer.startSpan('text-processing', {
            attributes: {
                'tool.id': 'text-processing',
                'tool.input.textLength': inputData.text.length,
                'tool.input.operations': inputData.operations.join(','),
            },
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔄 Processing text (${inputData.text.length} chars)...`,
                stage: 'text-processing',
            },
            id: 'text-processing',
        })

        try {
            let processedText = inputData.text
            const extracted: Record<string, string[]> = {}

            for (const operation of inputData.operations) {
                switch (operation) {
                    case 'lowercase':
                        processedText = processedText.toLowerCase()
                        break
                    case 'uppercase':
                        processedText = processedText.toUpperCase()
                        break
                    case 'capitalize':
                        processedText = capitalizeText(processedText)
                        break
                    case 'trim':
                        processedText = processedText.trim()
                        break
                    case 'remove-extra-spaces':
                        processedText = processedText.replace(/\s+/g, ' ')
                        break
                    case 'remove-punctuation':
                        processedText = processedText.replace(
                            /[.,\\/#!$%\\^&\\*;:{}=\-_`~()]/g,
                            ''
                        )
                        break
                    case 'extract-numbers':
                        extracted[operation] = extractNumbers(processedText)
                        break
                    case 'extract-emails':
                        extracted[operation] = extractEmails(processedText)
                        break
                    case 'extract-urls':
                        extracted[operation] = extractUrls(processedText)
                        break
                    case 'count-characters':
                        // This doesn't modify text, just extracts info
                        extracted[operation] = [processedText.length.toString()]
                        break
                    default:
                        throw new Error(`Unknown operation: ${operation}`)
                }
            }

            // Apply options
            const removeNewlinesFlag = inputData.options?.removeNewlines ?? false
            if (removeNewlinesFlag) {
                processedText = processedText.replace(/\n/g, ' ')
            }

            const statistics = {
                originalLength: inputData.text.length,
                processedLength: processedText.length,
                changes: Math.abs(inputData.text.length - processedText.length),
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Text processing completed (${inputData.operations.length} operations)`,
                    stage: 'text-processing',
                },
                id: 'text-processing',
            })

            span.setAttributes({
                'tool.output.success': true,
                'tool.output.operationsCount': inputData.operations.length,
                'tool.output.lengthChange': statistics.changes,
            })
            span.end()

            return {
                success: true,
                processedText,
                operations: inputData.operations,
                statistics,
                extracted:
                    Object.keys(extracted).length > 0 ? extracted : undefined,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`Text processing failed: ${errorMsg}`, {
                error: errorMsg,
            })

            if (e instanceof Error) {
                span.recordException(e)
            }
            span.setStatus({ code: 2, message: errorMsg })
            span.end()

            return {
                success: false,
                processedText: inputData.text,
                operations: inputData.operations,
                statistics: {
                    originalLength: inputData.text.length,
                    processedLength: inputData.text.length,
                    changes: 0,
                },
                message: errorMsg,
            }
        }
    },
})

// Helper functions
function countWords(text: string): number {
    // Remove punctuation and split by whitespace
    const cleanText = text.replace(/[^\w\s]/g, ' ')
    const words = cleanText.trim().split(/\s+/)
    return words.filter((word) => word.length > 0).length
}

function countSentences(text: string): number {
    // Split by sentence-ending punctuation
    const sentences = text.split(/[.!?]+/)
    return sentences.filter((sentence) => sentence.trim().length > 0).length
}

function countParagraphs(text: string): number {
    const paragraphs = text.split(/\n\s*\n/)
    return paragraphs.filter((para) => para.trim().length > 0).length
}

function calculateReadability(text: string, language: string) {

    const words = countWords(text)
    const sentences = countSentences(text)

    if (words === 0 || sentences === 0) {
        return {
            score: 0,
            level: 'Unable to calculate',
            grade: 'N/A',
        }
    }

    // Simplified Flesch Reading Ease score
    const avgWordsPerSentence = words / sentences
    const score =
        206.835 - 1.015 * avgWordsPerSentence - 84.6 * (text.length / words)

    let level: string
    let grade: string

    if (score >= 90) {
        level = 'Very Easy'
        grade = '5th grade'
    } else if (score >= 80) {
        level = 'Easy'
        grade = '6th grade'
    } else if (score >= 70) {
        level = 'Fairly Easy'
        grade = '7th grade'
    } else if (score >= 60) {
        level = 'Standard'
        grade = '8th-9th grade'
    } else if (score >= 50) {
        level = 'Fairly Difficult'
        grade = '10th-12th grade'
    } else if (score >= 30) {
        level = 'Difficult'
        grade = 'College'
    } else {
        level = 'Very Difficult'
        grade = 'College Graduate'
    }

    return {
        score: Math.round(score * 100) / 100,
        level,
        grade,
    }
}

function analyzeSentiment(text: string, language: string) {

    // Simplified sentiment analysis (positive/negative word counting)
    const positiveWords = [
        'good',
        'great',
        'excellent',
        'amazing',
        'wonderful',
        'fantastic',
        'love',
        'like',
        'best',
        'awesome',
    ]
    const negativeWords = [
        'bad',
        'terrible',
        'awful',
        'hate',
        'worst',
        'horrible',
        'disappointing',
        'poor',
        'ugly',
        'stupid',
    ]

    const words = text.toLowerCase().split(/\W+/)
    let positiveCount = 0
    let negativeCount = 0

    for (const word of words) {
        if (positiveWords.includes(word)) {
            positiveCount++
        }
        if (negativeWords.includes(word)) {
            negativeCount++
        }
    }

    const polarity = positiveCount - negativeCount
    const subjectivity = (positiveCount + negativeCount) / words.length

    return {
        polarity,
        subjectivity: Math.round(subjectivity * 100) / 100,
        confidence: Math.min(1, (positiveCount + negativeCount) / words.length),
    }
}

function detectLanguage(text: string): string {
    // Very basic language detection based on common words
    const englishWords = [
        'the',
        'and',
        'or',
        'but',
        'in',
        'on',
        'at',
        'to',
        'for',
        'of',
        'with',
        'by',
    ]
    const spanishWords = [
        'el',
        'la',
        'de',
        'que',
        'y',
        'en',
        'un',
        'es',
        'se',
        'no',
        'por',
        'con',
    ]
    const frenchWords = [
        'le',
        'la',
        'de',
        'et',
        'à',
        'un',
        'il',
        'être',
        'et',
        'en',
        'avoir',
        'que',
    ]

    const words = text
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 2)
    let englishScore = 0
    let spanishScore = 0
    let frenchScore = 0

    for (const word of words) {
        if (englishWords.includes(word)) {
            englishScore++
        }
        if (spanishWords.includes(word)) {
            spanishScore++
        }
        if (frenchWords.includes(word)) {
            frenchScore++
        }
    }

    const maxScore = Math.max(englishScore, spanishScore, frenchScore)
    if (maxScore === 0) {
        return 'unknown'
    }

    if (englishScore === maxScore) {
        return 'en'
    }
    if (spanishScore === maxScore) {
        return 'es'
    }
    return 'fr'
}

function generateSummary(text: string): string {
    const words = text.split(/\s+/)
    if (words.length <= 50) {
        return text
    }

    // Simple extractive summary - take first and last sentences
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
    if (sentences.length <= 2) {
        return text
    }

    return (
        sentences[0].trim() +
        '. ' +
        sentences[sentences.length - 1].trim() +
        '.'
    )
}

function capitalizeText(text: string): string {
    return text.replace(/\b\w/g, (char) => char.toUpperCase())
}

function extractNumbers(text: string): string[] {
    const matches = text.match(/\d+(\.\d+)?/g)
    return matches ?? []
}

function extractEmails(text: string): string[] {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    const matches = text.match(emailRegex)
    return matches ?? []
}

function extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g
    const matches = text.match(urlRegex)
    return matches ?? []
}

export type TextAnalysisUITool = InferUITool<typeof textAnalysisTool>
export type TextProcessingUITool = InferUITool<typeof textProcessingTool>
