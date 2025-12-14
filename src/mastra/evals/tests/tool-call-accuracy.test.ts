import { describe, it, expect } from 'vitest'
import { createToolCallAccuracyScorerCode } from '../scorers/prebuilt'
import { createAgentTestRun, createTestMessage } from '../scorers/utils'

describe('Tool Call Accuracy (Code)', () => {
  it('passes when expected tool is called', async () => {
    const scorer = createToolCallAccuracyScorerCode({ expectedTool: 'weather-tool' })
    const run = createAgentTestRun({ output: [createTestMessage({ role: 'assistant', content: 'Ok', toolInvocations: [{ toolCallId: '1', toolName: 'weather-tool' }] })] })
    const res = await (scorer as any).run({ input: run.input, output: run.output })
    expect(res.score).toBe(1)
  })

  it('fails strict mode when multiple tools called', async () => {
    const scorer = createToolCallAccuracyScorerCode({ expectedTool: 'weather-tool', strictMode: true })
    const run = createAgentTestRun({ output: [createTestMessage({ role: 'assistant', content: 'Ok', toolInvocations: [{ toolCallId: '1', toolName: 'search-tool' }, { toolCallId: '2', toolName: 'weather-tool' }] })] })
    const res = await (scorer as any).run({ input: run.input, output: run.output })
    expect(res.score).toBe(0)
  })
})