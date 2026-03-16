import type { Agent, ToolsInput } from '@mastra/core/agent'
import type {
    MastraScorer,
    ScorerRunInputForAgent,
    ScorerRunOutputForAgent,
} from '@mastra/core/evals'
import { RequestContext } from '@mastra/core/request-context'
import { contentStrategistAgent } from '../agents/contentStrategistAgent'
import { copywriterAgent } from '../agents/copywriterAgent'
import { scriptWriterAgent } from '../agents/scriptWriterAgent'
import { stockAnalysisAgent } from '../agents/stockAnalysisAgent'
import { reportAgent } from '../agents/reportAgent'
import { learningExtractionAgent } from '../agents/learningExtractionAgent'
import { evaluationAgent } from '../agents/evaluationAgent'
import { imageToCsvAgent } from '../agents/image_to_csv'
import { csvToExcalidrawAgent } from '../agents/csv_to_excalidraw'
import { weatherAgent } from '../agents/weather-agent'
import { log } from '../config/logger'
import { researchAgent } from '../agents/researchAgent'

type JsonPrimitive = boolean | number | string | null
type JsonValue = JsonPrimitive | JsonObject | JsonValue[]

interface JsonObject {
    [key: string]: JsonValue | undefined
}

type EvalScorer = MastraScorer<string, ScorerRunInputForAgent, ScorerRunOutputForAgent>

interface ExperimentSample {
    input: string
    groundTruth?: string
    requestContext?: JsonObject
}

interface ExperimentCaseResult {
    input: string
    text: string
    scores: Record<string, number>
    reasons: Record<string, string | undefined>
}

interface ExperimentSummary {
    experiment: string
    cases: ExperimentCaseResult[]
}

type ScoreEntry = readonly [
    string,
    {
        score: number
        reason: string | undefined
    },
]

function createRequestContext(
    values?: JsonObject
): RequestContext<JsonObject> | undefined {
    if (values === undefined) {
        return undefined
    }

    return new RequestContext<JsonObject>(Object.entries(values))
}

async function runAgentExperiment<TRequestContext>(
    experiment: string,
    agent: Agent<string, ToolsInput, undefined, TRequestContext>,
    samples: ExperimentSample[],
    scorers: readonly EvalScorer[] = []
): Promise<ExperimentSummary> {
    log.info(`Running ${experiment}...`)

    const cases = await Promise.all(
        samples.map(async (sample): Promise<ExperimentCaseResult> => {
            const result = await agent.generate(sample.input, {
                requestContext: createRequestContext(sample.requestContext),
                returnScorerData: true,
            })

            const scorerInput = result.scoringData?.input
            const scorerOutput = result.scoringData?.output

            const scoreEntries: ScoreEntry[] = await Promise.all(
                scorers.map(async (scorer) => {
                    if (!scorerInput || !scorerOutput) {
                        throw new Error(
                            `Missing scoring data while running ${scorer.name} for ${experiment}`
                        )
                    }

                    const scorerResult = await scorer.run({
                        input: scorerInput,
                        output: scorerOutput,
                        groundTruth: sample.groundTruth,
                        requestContext: sample.requestContext,
                    })

                    const entry: ScoreEntry = [
                        scorer.name,
                        {
                            score: scorerResult.score,
                            reason:
                                typeof scorerResult.reason === 'string'
                                    ? scorerResult.reason
                                    : undefined,
                        },
                    ]

                    return entry
                })
            )

            const scores: Record<string, number> = {}
            const reasons: Record<string, string | undefined> = {}

            for (const [name, value] of scoreEntries) {
                scores[name] = value.score
                reasons[name] = value.reason
            }

            return {
                input: sample.input,
                text: result.text,
                scores,
                reasons,
            }
        })
    )

    const summary = { experiment, cases }

    log.info(`${experiment} Results`, {
        results: JSON.stringify(summary, null, 2),
    })

    return summary
}

export async function runContentStrategistExperiment() {
    return runAgentExperiment(
        'Content Strategist Experiment',
        contentStrategistAgent,
        [
            {
                input: 'Create a content plan for a new AI-powered coffee machine. Focus on tech enthusiasts. Tone: Exciting.',
            },
            {
                input: 'Develop a strategy for a sustainable fashion brand launch. Target audience: Gen Z. Tone: Authentic and urgent.',
            },
            {
                input: 'Plan a blog series for a B2B SaaS accounting tool. Target audience: CFOs. Tone: Professional and authoritative.',
            },
        ]
    )
}

export async function runCopywriterExperiment() {
    return runAgentExperiment('Copywriter Experiment', copywriterAgent, [
            {
                input: 'Write a landing page headline for a noise-cancelling headphone. Tone: Punchy and minimalist.',
            },
            {
                input: 'Draft an email subject line for a Black Friday sale. Tone: Urgent and exciting.',
            },
            {
                input: 'Write a product description for a luxury watch. Tone: Sophisticated and elegant.',
            },
        ])
}

export async function runScriptWriterExperiment() {
    return runAgentExperiment('Script Writer Experiment', scriptWriterAgent, [
            {
                input: 'Write a 60-second TikTok script about productivity hacks.',
            },
            {
                input: 'Create a YouTube intro for a tech review channel.',
            },
        ])
}

export async function runStockAnalysisExperiment() {
    return runAgentExperiment('Stock Analysis Experiment', stockAnalysisAgent, [
            {
                input: 'Analyze AAPL stock.',
            },
            {
                input: 'Should I buy TSLA right now?',
            },
        ])
}

export async function runReportAgentExperiment() {
    return runAgentExperiment('Report Agent Experiment', reportAgent, [
            {
                input: 'Generate a quarterly performance report for a marketing team. Include sections for KPIs, Highlights, and Next Steps.',
            },
            {
                input: 'Summarize the key findings from the user research interviews.',
            },
        ])
}

export async function runLearningExtractionExperiment() {
    return runAgentExperiment(
        'Learning Extraction Experiment',
        learningExtractionAgent,
        [
            {
                input: 'Extract key learning points from this article about Rust ownership.',
            },
        ]
    )
}

export async function runEvaluationAgentExperiment() {
    return runAgentExperiment('Evaluation Agent Experiment', evaluationAgent, [
            {
                input: 'Evaluate this python code for efficiency: def fib(n): return n if n < 2 else fib(n-1) + fib(n-2)',
            },
        ])
}

export async function runImageToCsvExperiment() {
    return runAgentExperiment('Image to CSV Experiment', imageToCsvAgent, [
            {
                input: 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv',
            },
        ])
}

export async function runCsvToExcalidrawExperiment() {
    return runAgentExperiment(
        'CSV to Excalidraw Experiment',
        csvToExcalidrawAgent,
        [
            {
                input: 'id,label,x,y\n1,Start,0,0\n2,Process,100,0\n3,End,200,0',
            },
        ]
    )
}

export async function runWeatherAgentExperiment() {
    return runAgentExperiment('Weather Agent Experiment', weatherAgent, [
            {
                input: 'What is the weather in Tokyo?',
            },
            {
                input: 'Forecast for London tomorrow.',
            },
        ])
}

export async function runKeywordCoverageExperiment() {
    const scorer = await import('./scorers/keyword-coverage').then(
        (m) => m.keywordCoverageScorer
    )

    return runAgentExperiment(
        'Keyword Coverage Experiment',
        researchAgent,
        [
            {
                input: 'Compare React and Vue frameworks',
                requestContext: { requiredKeywords: ['React', 'Vue'] },
            },
            {
                input: 'Discuss TypeScript features like generics and interfaces',
                requestContext: {
                    requiredKeywords: ['TypeScript', 'generics', 'interfaces'],
                },
            },
        ],
        [scorer]
    )
}

export async function runTextualDifferenceExperiment() {
    const scorer = await import('./scorers/prebuilt').then((m) =>
        m.createTextualDifferenceScorer()
    )

    return runAgentExperiment(
        'Textual Difference Experiment',
        contentStrategistAgent,
        [
            {
                input: 'Summarize the concept of recursion',
                groundTruth:
                    'Recursion is when a function calls itself to solve a problem by breaking it into smaller subproblems.',
            },
            {
                input: 'What is the capital of France?',
                groundTruth: 'The capital of France is Paris.',
            },
        ],
        [scorer]
    )
}

export async function runSourceDiversityExperiment() {
    const scorer = await import('./scorers/custom-scorers').then(
        (m) => m.sourceDiversityScorer
    )

    return runAgentExperiment(
        'Source Diversity Experiment',
        researchAgent,
        [
            {
                input: 'Collect sources about climate change',
                requestContext: {},
            },
        ],
        [scorer]
    )
}

export async function runAllExperiments() {
    await runContentStrategistExperiment()
    await runCopywriterExperiment()
    await runScriptWriterExperiment()
    await runStockAnalysisExperiment()
    await runReportAgentExperiment()
    await runLearningExtractionExperiment()
    await runEvaluationAgentExperiment()
    //await runImageToCsvExperiment()
    await runCsvToExcalidrawExperiment()
    await runWeatherAgentExperiment()
    // new experiments (manual invocation recommended)
    // await runKeywordCoverageExperiment()
    // await runTextualDifferenceExperiment()
    // await runSourceDiversityExperiment()
}
