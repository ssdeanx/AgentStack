import { describe, it, expect } from 'vitest'
import { createToneScorer } from './prebuilt'
import { createAgentTestRun, createTestMessage } from './utils'

describe('Tone Consistency Scorer', () => {
    it('scores close to 1 when tone is consistent', async () => {
        const scorer = createToneScorer()
        const run = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'I am very happy with the service and want a warm, upbeat response.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content: 'I am very happy to help!',
                }),
            ],
        })
        const res = await scorer.run({
            input: run.input,
            output: run.output,
        })
        expect(res.score).toBeGreaterThan(0.7)
    })

    it('scores lower when tone differs', async () => {
        const scorer = createToneScorer()
        const run = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'I am unhappy about this and need a calm, empathetic response.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content: 'I love this product!',
                }),
            ],
        })
        const res = await scorer.run({
            input: run.input,
            output: run.output,
        })
        expect(res.score).toBeLessThan(0.9)
    })
})
