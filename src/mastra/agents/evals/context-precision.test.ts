import { describe, it, expect } from 'vitest'
import { createContextPrecisionScorer } from './prebuilt'
import { createAgentTestRun, createTestMessage } from './utils'

describe('Context Precision Scorer (MAP heuristic)', () => {
    it('gives high MAP when relevant items appear early', async () => {
        const scorer = createContextPrecisionScorer({
            context: ['A', 'B', 'C', 'D'],
        })
        const run = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'Prioritize the context items that directly answer the customer support escalation.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content: 'A B irrelevant C',
                }),
            ],
        })
        const res = await scorer.run(run)
        expect(res.score).toBeGreaterThan(0.5)
    })

    it('gives low MAP when relevant items are missing or late', async () => {
        const scorer = createContextPrecisionScorer({
            context: ['A', 'B', 'C', 'D'],
        })
        const run = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'Only use the context items needed for a concise executive summary.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content: 'irrelevant D C',
                }),
            ],
        })
        const res = await scorer.run(run)
        expect(res.score).toBeLessThan(0.82)
    })
})
