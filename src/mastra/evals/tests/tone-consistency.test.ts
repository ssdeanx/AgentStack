import { describe, it, expect } from 'vitest'
import { createToneScorer } from '../scorers/prebuilt'
import { createAgentTestRun } from '../scorers/utils'

describe('Tone Consistency Scorer', () => {
  it('scores close to 1 when tone is consistent', async () => {
    const scorer = createToneScorer()
    const run = createAgentTestRun({ inputMessages: [{ role: 'user', content: 'I am happy with the service' }], output: [{ role: 'assistant', content: 'I am very happy to help!' }] })
    const res = await (scorer as any).run({ input: run.input, output: run.output })
    expect(res.score).toBeGreaterThan(0.7)
  })

  it('scores lower when tone differs', async () => {
    const scorer = createToneScorer()
    const run = createAgentTestRun({ inputMessages: [{ role: 'user', content: 'I am unhappy about this' }], output: [{ role: 'assistant', content: 'I love this product!' }] })
    const res = await (scorer as any).run({ input: run.input, output: run.output })
    expect(res.score).toBeLessThan(0.9)
  })
})