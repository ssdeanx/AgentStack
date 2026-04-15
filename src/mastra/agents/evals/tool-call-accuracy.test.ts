import { describe, it, expect } from 'vitest'
import { createToolCallAccuracyScorerCode } from './prebuilt'
import { createAgentTestRun, createTestMessage, createToolInvocation } from './utils'

describe('Tool Call Accuracy (Code)', () => {
    it('passes when expected tool is called', async () => {
        const scorer = createToolCallAccuracyScorerCode({
            expectedTool: 'weather-tool',
        })
        const run = createAgentTestRun({
            output: [
                createTestMessage({
                    role: 'assistant',
                    content: 'Checking the weather for your location.',
                    toolInvocations: [
                        createToolInvocation({
                            toolCallId: '1',
                            toolName: 'weather-tool',
                            args: { location: 'Tokyo', units: 'metric' },
                            result: {
                                temperature: 24,
                                condition: 'sunny',
                            },
                        }),
                    ],
                }),
            ],
        })
        const res = await scorer.run({
            input: run.input,
            output: run.output,
        })
        expect(res.score).toBe(1)
    })

    it('fails strict mode when multiple tools called', async () => {
        const scorer = createToolCallAccuracyScorerCode({
            expectedTool: 'weather-tool',
            strictMode: true,
        })
        const run = createAgentTestRun({
            output: [
                createTestMessage({
                    role: 'assistant',
                    content:
                        'I searched the web first and then checked the weather as a follow-up.',
                    toolInvocations: [
                        createToolInvocation({
                            toolCallId: '1',
                            toolName: 'search-tool',
                            args: { query: 'best route for a hiking trip' },
                            result: { topResult: 'trail guide' },
                        }),
                        createToolInvocation({
                            toolCallId: '2',
                            toolName: 'weather-tool',
                            args: { location: 'Seattle', units: 'metric' },
                            result: {
                                temperature: 18,
                                condition: 'cloudy',
                            },
                        }),
                    ],
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
