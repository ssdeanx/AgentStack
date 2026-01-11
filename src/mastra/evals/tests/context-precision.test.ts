import { describe, it, expect } from 'vitest'
import { createContextPrecisionScorer } from '../scorers/prebuilt'

describe('Context Precision Scorer (MAP heuristic)', () => {
  it('gives high MAP when relevant items appear early', async () => {
    const scorer = createContextPrecisionScorer({ context: ['A','B','C','D'] })
    const run: any = { input: { inputMessages: [{ role: 'user', content: 'Query' }] }, output: [{ role: 'assistant', content: 'A B irrelevant C' }] }
    const res = await (scorer as any).run(run)
    expect(res.score).toBeGreaterThan(0.5)
  })

  it('gives low MAP when relevant items are missing or late', async () => {
    const scorer = createContextPrecisionScorer({ context: ['A','B','C','D'] })
    const run: any = { input: { inputMessages: [{ role: 'user', content: 'Query' }] }, output: [{ role: 'assistant', content: 'irrelevant D C' }] }
    const res = await (scorer as any).run(run)
    expect(res.score).toBeLessThan(0.82)
  })
})