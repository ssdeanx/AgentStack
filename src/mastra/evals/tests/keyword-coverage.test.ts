import { describe, it, expect } from 'vitest'
import { keywordCoverageScorer } from '../scorers/keyword-coverage'
import { createAgentTestRun } from '../scorers/utils'

describe('Keyword Coverage Scorer', () => {
  it('returns 1.0 when all required keywords are present in output', async () => {
    const scorer = keywordCoverageScorer
    const run = createAgentTestRun({ output: [{ role: 'assistant', content: 'This answer covers React and Vue frameworks.' }] })

    const res = await (scorer as any).run({ input: run.input, output: run.output, requestContext: { requiredKeywords: ['React', 'Vue'] } })
    expect(res.score).toBeCloseTo(1, 3)
  })

  it('returns 0 when none of the required keywords are present', async () => {
    const scorer = keywordCoverageScorer
    const run = createAgentTestRun({ output: [{ role: 'assistant', content: 'I enjoy hiking and pizza.' }] })

    const res = await (scorer as any).run({ input: run.input, output: run.output, requestContext: { requiredKeywords: ['React', 'Vue'] } })
    expect(res.score).toBe(0)
  })
})