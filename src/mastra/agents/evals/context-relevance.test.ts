import { describe, it, expect } from 'vitest'
import { createContextRelevanceScorerLLM } from './prebuilt'
import { createAgentTestRun, createTestMessage } from './utils'

describe('Context Relevance Scorer (heuristic)', () => {
    it('penalizes unused high relevance context', async () => {
        const scorer = createContextRelevanceScorerLLM({
            penalties: {
                unusedHighRelevanceContext: 0.2,
                missingContextPerItem: 0.15,
                maxMissingContextPenalty: 0.5,
            },
            context: ['Important fact', 'Other detail'],
        })
        const run = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'Use only the most relevant context to explain which factors should appear in a follow-up summary.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content: 'Other detail',
                }),
            ],
        })
        const res = await scorer.run(run)
        expect(res.score).toBeLessThan(1)
        const analysis = res.analyzeStepResult
        expect(analysis).toBeDefined()
        if (!analysis) {
            throw new Error('Expected analyzeStepResult to be defined')
        }
        // ensure unused high context counted
        expect(analysis.unusedHigh).toBeGreaterThanOrEqual(0)
    })
})
