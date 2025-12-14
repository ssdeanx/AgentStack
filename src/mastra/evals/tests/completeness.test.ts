import { describe, it, expect } from 'vitest'
import { createCompletenessScorer } from '../scorers/prebuilt'
import { createAgentTestRun } from '../scorers/utils'

describe('Completeness Scorer', () => {
  it('scores 1.0 when output contains all input terms', async () => {
    const scorer = createCompletenessScorer()
    const run = createAgentTestRun({ inputMessages: [{ role: 'user', content: 'List apples oranges and bananas' }], output: [{ role: 'assistant', content: 'Apples, oranges, bananas' }] })
    const res = await (scorer as any).run({ input: run.input, output: run.output })
    expect(res.score).toBeGreaterThan(0.9)
  })

  it('scores 0 when none of the terms are present', async () => {
    const scorer = createCompletenessScorer()
    const run = createAgentTestRun({ inputMessages: [{ role: 'user', content: 'Discuss quantum physics and relativity' }], output: [{ role: 'assistant', content: 'I like pizza' }] })
    const res = await (scorer as any).run({ input: run.input, output: run.output })
    expect(res.score).toBe(0)
  })
})
