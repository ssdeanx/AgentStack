// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { textAnalysisTool } from '../text-analysis.tool'

const createMockWriter = () => ({ custom: vi.fn() })

describe('textAnalysisTool', () => {
    beforeEach(() => vi.clearAllMocks())

    it('should count words, sentences, paragraphs', async () => {
        const text = 'Hello world. This is a test.\n\nNew paragraph.'
        const res = await textAnalysisTool.execute({ text, operations: ['word-count', 'sentence-count', 'paragraph-count'] })
        expect(res.success).toBe(true)
        expect(res.results['word-count']).toBeGreaterThan(0)
        expect(res.results['sentence-count']).toBe(2)
        expect(res.results['paragraph-count']).toBe(2)
    })

    it('should calculate readability and detect language', async () => {
        const en = 'This is a simple sentence. Another short sentence.'
        const res = await textAnalysisTool.execute({ text: en, operations: ['readability', 'language-detect'] })
        expect(res.success).toBe(true)
        expect(res.results['readability']).toHaveProperty('score')
        expect(res.results['language-detect']).toBe('en')
    })

    it('should do sentiment with advanced metrics disabled and enabled', async () => {
        const text = 'I love this product. It is amazing and great'
        // disabled via default requestContext
        const res1 = await textAnalysisTool.execute({ text, operations: ['sentiment'] })
        expect(res1.success).toBe(true)
        expect(res1.results['sentiment']).toBe('Advanced metrics disabled')

        const res2 = await textAnalysisTool.execute({ text, operations: ['sentiment'] }, { requestContext: { includeAdvancedMetrics: true } })
        expect(res2.success).toBe(true)
        expect(res2.results['sentiment']).toHaveProperty('polarity')
    })

    it('should summarize long text', async () => {
        const long = Array(200).fill('word').join(' ') + '. End sentence.'
        const res = await textAnalysisTool.execute({ text: long, operations: ['summary'] })
        expect(res.success).toBe(true)
        expect(typeof res.results['summary']).toBe('string')
    })
})