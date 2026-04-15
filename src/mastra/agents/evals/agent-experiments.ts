import type { Agent, ToolsInput } from '@mastra/core/agent'
import type {
    MastraScorer,
    ScorerRunInputForAgent,
    ScorerRunOutputForAgent,
} from '@mastra/core/evals'
import { RequestContext } from '@mastra/core/request-context'
import { contentStrategistAgent } from '../contentStrategistAgent'
import { copywriterAgent } from '../copywriterAgent'
import { scriptWriterAgent } from '../scriptWriterAgent'
import { stockAnalysisAgent } from '../stockAnalysisAgent'
import { reportAgent } from '../reportAgent'
import { learningExtractionAgent } from '../learningExtractionAgent'
import { evaluationAgent } from '../evaluationAgent'
import { imageToCsvAgent } from '../image_to_csv'
import { csvToExcalidrawAgent } from '../csv_to_excalidraw'
import { weatherAgent } from '../weather-agent'
import { log } from '../../config/logger'
import { researchAgent } from '../researchAgent'

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
                input: 'Build a 30-day cross-channel content plan for a new AI-powered coffee machine. Target two audiences: early adopters and busy remote workers. Include content pillars, channel mix, KPIs, and one risk mitigation idea. Tone: exciting but credible.',
            },
            {
                input: 'Develop a launch strategy for a sustainable fashion brand entering the Gen Z market. Include positioning, audience segments, launch phases, creator strategy, and three measurable outcomes. Tone: authentic, urgent, and modern.',
            },
            {
                input: 'Plan a blog series for a B2B SaaS accounting tool aimed at CFOs. Propose five article titles, the business problem each article solves, SEO intent, and a CTA theme for each. Tone: professional and authoritative.',
            },
        ]
    )
}

export async function runCopywriterExperiment() {
    return runAgentExperiment('Copywriter Experiment', copywriterAgent, [
            {
                input: 'Write three landing-page headline options for a noise-cancelling headphone launch. One should be punchy, one minimalist, and one premium. Add a one-sentence rationale for each.',
            },
            {
                input: 'Draft five email subject lines for a Black Friday sale for a premium skincare brand. Keep them under 55 characters, avoid spammy language, and include urgency without sounding pushy.',
            },
            {
                input: 'Write a product description for a luxury watch. Include craftsmanship, material quality, emotional appeal, and a closing sentence that drives preorders. Tone: sophisticated and elegant.',
            },
        ])
}

export async function runScriptWriterExperiment() {
    return runAgentExperiment('Script Writer Experiment', scriptWriterAgent, [
            {
                input: 'Write a 60-second TikTok script about productivity hacks for remote workers. Include a hook, two concrete tips, an example, and a short CTA for comments.',
            },
            {
                input: 'Create a YouTube intro for a tech review channel launching a video about budget laptops. Include the opening line, pacing notes, and a brief tease of the review criteria.',
            },
        ])
}

export async function runStockAnalysisExperiment() {
    return runAgentExperiment('Stock Analysis Experiment', stockAnalysisAgent, [
            {
                input: 'Analyze AAPL stock for a cautious long-term investor. Summarize the main bullish and bearish factors, mention possible catalysts, and finish with a risk-aware watchlist rather than a buy/sell command.',
            },
            {
                input: 'Should I buy TSLA right now? Compare the current thesis, key risks, and the kind of investor profile for which TSLA might or might not fit. Keep the answer balanced and evidence-oriented.',
            },
        ])
}

export async function runReportAgentExperiment() {
    return runAgentExperiment('Report Agent Experiment', reportAgent, [
            {
                input: 'Generate a quarterly performance report for a marketing team. Include an executive summary, KPI table, notable wins, root causes behind underperformance, and next-quarter recommendations.',
            },
            {
                input: 'Summarize the key findings from the user research interviews and group them into themes, friction points, opportunities, and open questions for the product team.',
            },
        ])
}

export async function runLearningExtractionExperiment() {
    return runAgentExperiment(
        'Learning Extraction Experiment',
        learningExtractionAgent,
        [
            {
                input: 'Extract the key learning points from an article about Rust ownership. For each point, include a practical implication, a common mistake, and a one-line example.',
            },
        ]
    )
}

export async function runEvaluationAgentExperiment() {
    return runAgentExperiment('Evaluation Agent Experiment', evaluationAgent, [
            {
                input: 'Evaluate this Python code for efficiency and maintainability: def fib(n): return n if n < 2 else fib(n-1) + fib(n-2). Call out time complexity, recursion risks, and propose a more production-ready alternative.',
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
                input: 'id,label,x,y\n1,Intake,0,0\n2,Validate,160,0\n3,Enrich,320,0\n4,Review,480,0\n5,Publish,640,0',
            },
        ]
    )
}

export async function runWeatherAgentExperiment() {
    return runAgentExperiment('Weather Agent Experiment', weatherAgent, [
            {
                input: 'What is the weather in Tokyo for the next 48 hours, and what clothing or travel advice should someone use to prepare for a day of meetings there?',
            },
            {
                input: 'Forecast for London tomorrow. Include rain risk, temperature range, and one practical recommendation for an outdoor event organizer.',
            },
        ])
}

export async function runKeywordCoverageExperiment() {
    const scorer = await import('../../scorers/keyword-coverage').then(
        (m) => m.keywordCoverageScorer
    )

    return runAgentExperiment(
        'Keyword Coverage Experiment',
        researchAgent,
        [
            {
                input: 'Compare React and Vue frameworks for a team building a customer dashboard with long-term maintainability concerns. Focus on rendering model, ecosystem tradeoffs, and team onboarding.',
                requestContext: { requiredKeywords: ['React', 'Vue'] },
            },
            {
                input: 'Discuss TypeScript features like generics and interfaces in the context of designing reusable API client abstractions for a large frontend codebase.',
                requestContext: {
                    requiredKeywords: ['TypeScript', 'generics', 'interfaces'],
                },
            },
        ],
        [scorer]
    )
}

export async function runTextualDifferenceExperiment() {
    const scorer = await import('./prebuilt').then((m) =>
        m.createTextualDifferenceScorer()
    )

    return runAgentExperiment(
        'Textual Difference Experiment',
        contentStrategistAgent,
        [
            {
                input: 'Summarize the concept of recursion for a junior developer, then give one practical coding example and one warning about when recursion becomes a bad fit.',
                groundTruth:
                    'Recursion is when a function calls itself to solve a problem by breaking it into smaller subproblems.',
            },
            {
                input: 'What is the capital of France? Answer in one sentence and include a short explanation of why the city is politically important.',
                groundTruth: 'The capital of France is Paris.',
            },
        ],
        [scorer]
    )
}

export async function runSourceDiversityExperiment() {
    const scorer = await import('../../scorers/custom-scorers').then(
        (m) => m.sourceDiversityScorer
    )

    return runAgentExperiment(
        'Source Diversity Experiment',
        researchAgent,
        [
            {
                input: 'Collect sources about climate change policy, covering at least one scientific source, one government source, and one recent news source. Summarize how each source contributes a different perspective.',
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
