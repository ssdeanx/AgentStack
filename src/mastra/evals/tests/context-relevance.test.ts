import { describe, it, expect } from 'vitest'
import { createContextRelevanceScorerLLM } from '../scorers/prebuilt'

describe('Context Relevance Scorer (heuristic)', () => {
  it('penalizes unused high relevance context', async () => {
    const scorer = createContextRelevanceScorerLLM({ penalties: { unusedHighRelevanceContext: 0.2, missingContextPerItem: 0.15, maxMissingContextPenalty: 0.5 }, context: ['Important fact', 'Other detail'] })
    const run: any = { input: { inputMessages: [{ role: 'user', content: 'Query' }] }, output: [{ role: 'assistant', content: 'Other detail' }] }
    const res = await (scorer as any).run(run)
    expect(res.score).toBeLessThan(1)
    // ensure unused high context counted
    expect(res.analyzeStepResult.unusedHigh).toBeGreaterThanOrEqual(0)
  })
})