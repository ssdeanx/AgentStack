import { createScorer, runEvals } from '@mastra/core/evals';
import { contentStrategistAgent } from '../agents/contentStrategistAgent'
import { sqlAgent } from '../agents/sql'
import { copywriterAgent } from '../agents/copywriterAgent'
import { scriptWriterAgent } from '../agents/scriptWriterAgent'
import { stockAnalysisAgent } from '../agents/stockAnalysisAgent'
import { reportAgent } from '../agents/reportAgent'
import { learningExtractionAgent } from '../agents/learningExtractionAgent'
import { evaluationAgent } from '../agents/evaluationAgent'
import { imageToCsvAgent } from '../agents/image_to_csv'
import { csvToExcalidrawAgent } from '../agents/csv_to_excalidraw'
import { weatherAgent } from '../agents/weather-agent'
import {
    structureScorer,
    creativityScorer,
    sqlValidityScorer,
    toneConsistencyScorer,
    responseQualityScorer,
    scriptFormatScorer,
    pacingScorer,
    financialDataScorer,
    sourceDiversityScorer,
    csvValidityScorer,
    factualityScorer
} from '../scorers'

export async function runContentStrategistExperiment() {
    console.log('Running Content Strategist Experiment...')
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
        scorers: [structureScorer, creativityScorer, toneConsistencyScorer]
    })
    console.log('Content Strategist Experiment Results:', JSON.stringify(results, null, 2))
    return results
}

export async function runSqlAgentExperiment() {
    console.log('Running SQL Agent Experiment...')
    const results = await runEvals({
        target: sqlAgent,
        data: [
            {
                input: 'What are the top 5 most populous cities in Europe?',
            },
            {
                input: 'List all cities in France with a population over 1 million.',
            },
            {
                input: 'Show me the average population of cities in Asia.',
            }
        ],
        scorers: [sqlValidityScorer, responseQualityScorer]
    })
    console.log('SQL Agent Experiment Results:', JSON.stringify(results, null, 2))
    return results
}

export async function runCopywriterExperiment() {
    console.log('Running Copywriter Experiment...')
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
        scorers: [toneConsistencyScorer, creativityScorer, responseQualityScorer]
    })
    console.log('Copywriter Experiment Results:', JSON.stringify(results, null, 2))
    return results
}

export async function runScriptWriterExperiment() {
    console.log('Running Script Writer Experiment...')
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
        scorers: [scriptFormatScorer, pacingScorer, creativityScorer]
    })
    console.log('Script Writer Experiment Results:', JSON.stringify(results, null, 2))
    return results
}

export async function runStockAnalysisExperiment() {
    console.log('Running Stock Analysis Experiment...')
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
        scorers: [financialDataScorer, responseQualityScorer, sourceDiversityScorer]
    })
    console.log('Stock Analysis Experiment Results:', JSON.stringify(results, null, 2))
    return results
}

export async function runReportAgentExperiment() {
    console.log('Running Report Agent Experiment...')
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
        scorers: [structureScorer, responseQualityScorer, factualityScorer]
    })
    console.log('Report Agent Experiment Results:', JSON.stringify(results, null, 2))
    return results
}

export async function runLearningExtractionExperiment() {
    console.log('Running Learning Extraction Experiment...')
    const results = await runEvals({
        target: learningExtractionAgent,
        data: [
            {
                input: 'Extract key learning points from this article about Rust ownership.'
            }
        ],
        scorers: [responseQualityScorer, factualityScorer]
    })
    console.log('Learning Extraction Experiment Results:', JSON.stringify(results, null, 2))
    return results
}

export async function runEvaluationAgentExperiment() {
    console.log('Running Evaluation Agent Experiment...')
    const results = await runEvals({
        target: evaluationAgent,
        data: [
            {
                input: 'Evaluate this python code for efficiency: def fib(n): return n if n < 2 else fib(n-1) + fib(n-2)',
            }
        ],
        scorers: [responseQualityScorer, structureScorer]
    })
    console.log('Evaluation Agent Experiment Results:', JSON.stringify(results, null, 2))
    return results
}

export async function runImageToCsvExperiment() {
    console.log('Running Image to CSV Experiment...')
    const results = await runEvals({
        target: imageToCsvAgent,
        data: [
            {
                input: 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv',
            }
        ],
        scorers: [csvValidityScorer, structureScorer]
    })
    console.log('Image to CSV Experiment Results:', JSON.stringify(results, null, 2))
    return results
}

export async function runCsvToExcalidrawExperiment() {
    console.log('Running CSV to Excalidraw Experiment...')
    const results = await runEvals({
        target: csvToExcalidrawAgent,
        data: [
            {
                input: 'id,label,x,y\n1,Start,0,0\n2,Process,100,0\n3,End,200,0',
            }
        ],
        scorers: [structureScorer, responseQualityScorer]
    })
    console.log('CSV to Excalidraw Experiment Results:', JSON.stringify(results, null, 2))
    return results
}

export async function runWeatherAgentExperiment() {
    console.log('Running Weather Agent Experiment...')
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
        scorers: [factualityScorer, responseQualityScorer]
    })
    console.log('Weather Agent Experiment Results:', JSON.stringify(results, null, 2))
    return results
}

export async function runAllExperiments(p0: unknown) {
    await runContentStrategistExperiment()
    await runSqlAgentExperiment()
    await runCopywriterExperiment()
    await runScriptWriterExperiment()
    await runStockAnalysisExperiment()
    await runReportAgentExperiment()
    await runLearningExtractionExperiment()
    await runEvaluationAgentExperiment()
    //await runImageToCsvExperiment()
    await runCsvToExcalidrawExperiment()
    await runWeatherAgentExperiment()
}

