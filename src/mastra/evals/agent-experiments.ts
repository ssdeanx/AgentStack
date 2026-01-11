import { createScorer, runEvals } from '@mastra/core/evals';
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
import { log } from '../config/logger';
import { researchAgent } from '../agents/researchAgent';

export async function runContentStrategistExperiment() {
    log.info('Running Content Strategist Experiment', { event: 'Running Content Strategist Experiment' })
    const results = await runEvals({
        target: contentStrategistAgent,
        data: [
            {
                input: 'Create a content plan for a new AI-powered coffee machine. Focus on tech enthusiasts. Tone: Exciting.'
            },
            {
                input: 'Develop a strategy for a sustainable fashion brand launch. Target audience: Gen Z. Tone: Authentic and urgent.'
            },
            {
                input: 'Plan a blog series for a B2B SaaS accounting tool. Target audience: CFOs. Tone: Professional and authoritative.'
            }
        ],
        scorers: []
    })
    log.info('Content Strategist Experiment Results', { results: JSON.stringify(results, null, 2) })
    return results
}

export async function runCopywriterExperiment() {
    log.info('Running Copywriter Experiment...')
    const results = await runEvals({
        target: copywriterAgent,
        data: [
            {
                input: 'Write a landing page headline for a noise-cancelling headphone. Tone: Punchy and minimalist.',
            },
            {
                input: 'Draft an email subject line for a Black Friday sale. Tone: Urgent and exciting.',
            },
            {
                input: 'Write a product description for a luxury watch. Tone: Sophisticated and elegant.',
            }
        ],
        scorers: []
    })
    log.info('Copywriter Experiment Results:', { results: JSON.stringify(results, null, 2) })
    return results
}

export async function runScriptWriterExperiment() {
    log.info('Running Script Writer Experiment...')
    const results = await runEvals({
        target: scriptWriterAgent,
        data: [
            {
                input: 'Write a 60-second TikTok script about productivity hacks.',
            },
            {
                input: 'Create a YouTube intro for a tech review channel.',
            }
        ],
        scorers: []
    })
    log.info('Script Writer Experiment Results:', { results: JSON.stringify(results, null, 2) })
    return results
}

export async function runStockAnalysisExperiment() {
    log.info('Running Stock Analysis Experiment...')
    const results = await runEvals({
        target: stockAnalysisAgent,
        data: [
            {
                input: 'Analyze AAPL stock.',
            },
            {
                input: 'Should I buy TSLA right now?',
            }
        ],
        scorers: []
    })
    log.info('Stock Analysis Experiment Results:', { results: JSON.stringify(results, null, 2) })
    return results
}

export async function runReportAgentExperiment() {
    log.info('Running Report Agent Experiment...')
    const results = await runEvals({
        target: reportAgent,
        data: [
            {
                input: 'Generate a quarterly performance report for a marketing team. Include sections for KPIs, Highlights, and Next Steps.',
            },
            {
                input: 'Summarize the key findings from the user research interviews.',
            }
        ],
        scorers: []
    })
    log.info('Report Agent Experiment Results:', { results: JSON.stringify(results, null, 2) })
    return results
}

export async function runLearningExtractionExperiment() {
    log.info('Running Learning Extraction Experiment...')
    const results = await runEvals({
        target: learningExtractionAgent,
        data: [
            {
                input: 'Extract key learning points from this article about Rust ownership.'
            }
        ],
        scorers: []
    })
        log.info('Learning Extraction Experiment Results:', { results: JSON.stringify(results, null, 2) })
        return results
}

export async function runEvaluationAgentExperiment() {
    log.info('Running Evaluation Agent Experiment...')
    const results = await runEvals({
        target: evaluationAgent,
        data: [
            {
                input: 'Evaluate this python code for efficiency: def fib(n): return n if n < 2 else fib(n-1) + fib(n-2)',
            }
        ],
        scorers: []
    })
    log.info('Evaluation Agent Experiment Results:', { results: JSON.stringify(results, null, 2) })
    return results
}

export async function runImageToCsvExperiment() {
    log.info('Running Image to CSV Experiment...')
    const results = await runEvals({
        target: imageToCsvAgent,
        data: [
            {
                input: 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv',
            }
        ],
        scorers: []
    })
    log.info('Image to CSV Experiment Results:', { results: JSON.stringify(results, null, 2) })
    return results
}

export async function runCsvToExcalidrawExperiment() {
    log.info('Running CSV to Excalidraw Experiment...')
    const results = await runEvals({
        target: csvToExcalidrawAgent,
        data: [
            {
                input: 'id,label,x,y\n1,Start,0,0\n2,Process,100,0\n3,End,200,0',
            }
        ],
        scorers: []
    })
    log.info('CSV to Excalidraw Experiment Results:', { results: JSON.stringify(results, null, 2) })
    return results
}

export async function runWeatherAgentExperiment() {
    log.info('Running Weather Agent Experiment...')
    const results = await runEvals({
        target: weatherAgent,
        data: [
            {
                input: 'What is the weather in Tokyo?',
            },
            {
                input: 'Forecast for London tomorrow.',
            }
        ],
        scorers: []
    })
    log.info('Weather Agent Experiment Results:', { results: JSON.stringify(results, null, 2) })
    return results
}

export async function runKeywordCoverageExperiment() {
    log.info('Running Keyword Coverage Experiment...')
    const scorer = await import('./scorers/keyword-coverage').then(m => m.keywordCoverageScorer)
    const results = await runEvals({
        target: researchAgent,
        data: [
            { input: 'Compare React and Vue frameworks', requestContext: { requiredKeywords: ['React', 'Vue'] } as any },
            { input: 'Discuss TypeScript features like generics and interfaces', requestContext: { requiredKeywords: ['TypeScript', 'generics', 'interfaces'] } as any }
        ],
        scorers: [scorer]
    })
    log.info('Keyword Coverage Results', { results: JSON.stringify(results, null, 2) })
    return results
}

export async function runTextualDifferenceExperiment() {
    log.info('Running Textual Difference Experiment...')
    const scorer = await import('./scorers/prebuilt').then(m => m.createTextualDifferenceScorer())
    const results = await runEvals({
        target: contentStrategistAgent,
        data: [
            { input: 'Summarize the concept of recursion', groundTruth: 'Recursion is when a function calls itself to solve a problem by breaking it into smaller subproblems.' },
            { input: 'What is the capital of France?', groundTruth: 'The capital of France is Paris.' }
        ],
        scorers: [scorer]
    })
    log.info('Textual Difference Results', { results: JSON.stringify(results, null, 2) })
    return results
}

export async function runSourceDiversityExperiment() {
    log.info('Running Source Diversity Experiment...')
    const scorer = await import('./scorers/custom-scorers').then(m => m.sourceDiversityScorer)
    const results = await runEvals({
        target: researchAgent,
        data: [
            { input: 'Collect sources about climate change', requestContext: {} as any }
        ],
        scorers: [scorer]
    })
    log.info('Source Diversity Results', { results: JSON.stringify(results, null, 2) })
    return results
}

export async function runAllExperiments(p0: unknown) {
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

