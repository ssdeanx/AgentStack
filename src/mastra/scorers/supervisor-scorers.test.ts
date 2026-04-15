import { describe, expect, it } from 'vitest'
import {
    createAgentTestRun,
    createTestMessage,
    createToolInvocation,
} from '../agents/evals/utils'
import {
    supervisorActionabilityScorer,
    supervisorCoverageScorer,
    supervisorEvidenceGroundingScorer,
    supervisorRoutingDisciplineScorer,
    supervisorUncertaintyHandlingScorer,
} from './supervisor-scorers'

describe('Supervisor scorers', () => {
    it('rewards a synthesized supervisor response that uses delegation without exposing routing chatter', async () => {
        const scorer = supervisorRoutingDisciplineScorer
        const run = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'Research the market and return a final recommendation for the launch plan.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content:
                        'Executive summary: The launch is viable. Evidence suggests strong demand. Next steps: validate pricing, confirm positioning, and start with a small pilot.',
                    toolInvocations: [
                        createToolInvocation({
                            toolCallId: '1',
                            toolName: 'researchAgent',
                            args: { topic: 'market demand' },
                            result: { summary: 'Demand appears strong' },
                        }),
                        createToolInvocation({
                            toolCallId: '2',
                            toolName: 'copywriterAgent',
                            args: { brief: 'final synthesis' },
                            result: { draft: 'Final recommendation draft' },
                        }),
                    ],
                }),
            ],
        })

        const result = await scorer.run({
            input: run.input,
            output: run.output,
        })

        expect(result.score).toBeGreaterThan(0.7)
    })

    it('penalizes raw delegation chatter in the final supervisor response', async () => {
        const scorer = supervisorRoutingDisciplineScorer
        const run = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'Research the market and return a final recommendation for the launch plan.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content:
                        'I delegated to researchAgent and copywriterAgent. Here are their notes without synthesis.',
                }),
            ],
        })

        const result = await scorer.run({
            input: run.input,
            output: run.output,
        })

        expect(result.score).toBeLessThan(0.5)
    })

    it('rewards evidence grounded supervisor answers and penalizes unsupported summaries', async () => {
        const scorer = supervisorEvidenceGroundingScorer
        const strongRun = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'Summarize the market risk and give a recommendation with sources.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content:
                        'According to a 2024 market report and two cited sources, demand remains stable. The caveat is that pricing data is still incomplete. https://example.com/report',
                }),
            ],
        })
        const weakRun = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'Summarize the market risk and give a recommendation with sources.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content: 'The market is definitely strong and the plan will work.',
                }),
            ],
        })

        const strongResult = await scorer.run({
            input: strongRun.input,
            output: strongRun.output,
        })
        const weakResult = await scorer.run({
            input: weakRun.input,
            output: weakRun.output,
        })

        expect(strongResult.score).toBeGreaterThan(weakResult.score)
        expect(strongResult.score).toBeGreaterThan(0.65)
    })

    it('scores request coverage higher when the supervisor answers the key parts of the prompt', async () => {
        const scorer = supervisorCoverageScorer
        const strongRun = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'Compare React and Vue for a customer dashboard with maintainability, ecosystem, and onboarding in mind.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content:
                        'React offers a larger ecosystem and Vue offers a gentler onboarding curve. For maintainability, I would favor React if the team needs broader library support and Vue if simplicity is the top priority.',
                }),
            ],
        })
        const weakRun = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'Compare React and Vue for a customer dashboard with maintainability, ecosystem, and onboarding in mind.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content: 'Use React.',
                }),
            ],
        })

        const strongResult = await scorer.run({
            input: strongRun.input,
            output: strongRun.output,
        })
        const weakResult = await scorer.run({
            input: weakRun.input,
            output: weakRun.output,
        })

        expect(strongResult.score).toBeGreaterThan(weakResult.score)
        expect(strongResult.score).toBeGreaterThan(0.7)
    })

    it('rewards actionable supervisor recommendations and penalizes vague conclusions', async () => {
        const scorer = supervisorActionabilityScorer
        const strongRun = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'Turn the research into a next-step plan for the product team.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content:
                        'Next steps: (1) validate pricing, (2) run a small pilot, and (3) measure conversion and retention. Prioritize pricing first because it has the highest impact and lowest effort.',
                }),
            ],
        })
        const weakRun = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'Turn the research into a next-step plan for the product team.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content: 'Looks good overall.',
                }),
            ],
        })

        const strongResult = await scorer.run({
            input: strongRun.input,
            output: strongRun.output,
        })
        const weakResult = await scorer.run({
            input: weakRun.input,
            output: weakRun.output,
        })

        expect(strongResult.score).toBeGreaterThan(weakResult.score)
        expect(strongResult.score).toBeGreaterThan(0.75)
    })

    it('rewards uncertainty handling when the supervisor states caveats instead of overcommitting', async () => {
        const scorer = supervisorUncertaintyHandlingScorer
        const strongRun = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'Give me a recommendation, but be explicit about what is still uncertain.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content:
                        'Based on the available evidence, I would recommend a cautious pilot. The main assumption is that the sample data is representative, so I would validate that before scaling.',
                }),
            ],
        })
        const weakRun = createAgentTestRun({
            inputMessages: [
                createTestMessage({
                    role: 'user',
                    content:
                        'Give me a recommendation, but be explicit about what is still uncertain.',
                }),
            ],
            output: [
                createTestMessage({
                    role: 'assistant',
                    content:
                        'This will definitely work and there is no uncertainty at all.',
                }),
            ],
        })

        const strongResult = await scorer.run({
            input: strongRun.input,
            output: strongRun.output,
        })
        const weakResult = await scorer.run({
            input: weakRun.input,
            output: weakRun.output,
        })

        expect(strongResult.score).toBeGreaterThan(weakResult.score)
        expect(strongResult.score).toBeGreaterThan(0.6)
    })
})