import { describe, it, expect } from 'vitest'
import { createNoiseSensitivityScorerLLM } from '../scorers/prebuilt'
import { createAgentTestRun, createTestMessage } from '../scorers/utils'

describe('Noise Sensitivity (heuristic)', () => {
  it('gives high score when output equals baseline', async () => {
    const scorer = createNoiseSensitivityScorerLLM({ baselineResponse: 'The capital of France is Paris.' })
    const run = createAgentTestRun({ output: [createTestMessage({ role: 'assistant', content: 'The capital of France is Paris.' })] })
    const res = await (scorer as any).run({ input: run.input, output: run.output })
    expect(res.score).toBeGreaterThan(0.95)
  })

  it('gives lower score for different output', async () => {
    const scorer = createNoiseSensitivityScorerLLM({ baselineResponse: 'The capital of France is Paris.' })
    const run = createAgentTestRun({ output: [createTestMessage({ role: 'assistant', content: 'Berlin' })] })
    const res = await (scorer as any).run({ input: run.input, output: run.output })
    expect(res.score).toBeLessThan(0.8)
  })
})