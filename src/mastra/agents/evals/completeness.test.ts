import { describe, it, expect } from 'vitest'
import { createCompletenessScorer } from './prebuilt'
import { createAgentTestRun, createTestMessage } from './utils'

describe('Completeness Scorer', () => {
    it('scores 1.0 when output contains all input terms', async () => {
        const scorer = createCompletenessScorer()
        const run = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'Compare apples, oranges, and bananas by taste, nutrition, and ideal use cases in a smoothie.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content:
                        'Apples are crisp and versatile, oranges are citrusy and vitamin-rich, and bananas add creaminess for smoothies.',
                }),
            ],
        })
        const res = await scorer.run({
            input: run.input,
            output: run.output,
        })
        expect(res.score).toBeGreaterThan(0.9)
    })

    it('scores 0 when none of the terms are present', async () => {
        const scorer = createCompletenessScorer()
        const run = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'Discuss quantum physics and relativity, then explain where the two ideas conflict and where they are both useful.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content:
                        'I like pizza because it is easy to share and customize.',
                }),
            ],
        })
        const res = await scorer.run({
            input: run.input,
            output: run.output,
        })
        expect(res.score).toBe(0)
    })
})
