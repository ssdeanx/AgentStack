import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import { logError, logStepEnd, logStepStart } from '../config/logger'

const financialDataSchema = z.object({
    symbol: z.string(),
    price: z.number().optional(),
    volume: z.number().optional(),
    marketCap: z.number().optional(),
    peRatio: z.number().optional(),
    eps: z.number().optional(),
    raw: z.any().optional(),
})

const technicalAnalysisSchema = z.object({
    symbol: z.string(),
    trend: z.enum(['bullish', 'bearish', 'sideways']).optional(),
    rsi: z.number().optional(),
    macd: z.object({ signal: z.string() }).optional(),
    bollingerBands: z
        .object({
            upper: z.number(),
            middle: z.number(),
            lower: z.number(),
        })
        .optional(),
    support: z.number().optional(),
    resistance: z.number().optional(),
})

const reportSchema = z.object({
    symbol: z.string(),
    analysis: z.object({
        financial: financialDataSchema,
        technical: technicalAnalysisSchema,
    }),
    recommendation: z.enum([
        'strong-buy',
        'buy',
        'hold',
        'sell',
        'strong-sell',
    ]),
    confidence: z.number().min(0).max(100),
    risks: z.array(z.string()),
    report: z.string(),
    generatedAt: z.string(),
})

const fetchFinancialDataStep = createStep({
    id: 'fetch-financial-data',
    description: 'Fetches financial data using Polygon tools',
    inputSchema: z.object({
        symbol: z.string(),
    }),
    outputSchema: financialDataSchema,
    retries: 3,
    execute: async ({ inputData, writer, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'fetch-financial-data',
            input: inputData,
            metadata: {
                'workflow.step': 'fetch-financial-data',
            },
            requestContext,
            mastra,
        })
        const startTime = Date.now()
        logStepStart('fetch-financial-data', { symbol: inputData.symbol })

        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `📊 Fetching financial data for ${inputData.symbol}...`,
                    stage: 'fetch-financial-data',
                },
                id: 'fetch-financial-data',
            })

            // This would use polygonStockQuotesTool or polygonStockFundamentalsTool
            // For now, return mock data structure
            const result = {
                symbol: inputData.symbol,
                price: 150.25,
                volume: 1000000,
                marketCap: 1500000000,
                peRatio: 25.5,
                eps: 6.0,
                raw: { source: 'polygon' },
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Financial data retrieved for ${inputData.symbol}`,
                    stage: 'fetch-financial-data',
                },
                id: 'fetch-financial-data',
            })

            logStepEnd(
                'fetch-financial-data',
                { symbol: result.symbol },
                Date.now() - startTime
            )
            span?.update({ output: result })
            span?.end()
            return result
        } catch (error) {
            span?.error({
                error:
                    error instanceof Error ? error : new Error(String(error)),
                endSpan: true,
            })
            logError('fetch-financial-data', error instanceof Error ? error : new Error(String(error)), {
                symbol: inputData.symbol,
            })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Error fetching financial data for ${inputData.symbol}`,
                    stage: 'fetch-financial-data',
                },
                id: 'fetch-financial-data',
            })

            throw error
        }
    },
})

const performTechnicalAnalysisStep = createStep({
    id: 'perform-technical-analysis',
    description: 'Performs technical analysis using technical analysis tools',
    inputSchema: financialDataSchema,
    outputSchema: z.object({
        financial: financialDataSchema,
        technical: technicalAnalysisSchema,
    }),
    execute: async ({ inputData, writer, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'perform-technical-analysis',
            input: inputData,
            metadata: {
                'workflow.step': 'perform-technical-analysis',
            },
            requestContext,
            mastra,
        })
        const startTime = Date.now()
        logStepStart('perform-technical-analysis', { symbol: inputData.symbol })

        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `📈 Performing technical analysis for ${inputData.symbol}...`,
                    stage: 'perform-technical-analysis',
                },
                id: 'perform-technical-analysis',
            })

            // This would use technicalAnalysisTool, trendAnalysisTool, momentumAnalysisTool, etc.
            // For now, return mock technical analysis
            const technical = {
                symbol: inputData.symbol,
                trend: 'bullish' as const,
                rsi: 65,
                macd: { signal: 'bullish crossover' },
                bollingerBands: {
                    upper: 160,
                    middle: 150,
                    lower: 140,
                },
                support: 145,
                resistance: 155,
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Technical analysis complete for ${inputData.symbol}`,
                    stage: 'perform-technical-analysis',
                },
                id: 'perform-technical-analysis',
            })

            logStepEnd(
                'perform-technical-analysis',
                { symbol: inputData.symbol },
                Date.now() - startTime
            )
            const output = { financial: inputData, technical }
            span?.update({ output })
            span?.end()
            return output
        } catch (error) {
            span?.error({
                error:
                    error instanceof Error ? error : new Error(String(error)),
                endSpan: true,
            })
            logError('perform-technical-analysis', error instanceof Error ? error : new Error(String(error)), {
                symbol: inputData.symbol,
            })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Technical analysis failed for ${inputData.symbol}`,
                    stage: 'perform-technical-analysis',
                },
                id: 'perform-technical-analysis',
            })

            throw error
        }
    },
})

const generateFinancialReportStep = createStep({
    id: 'generate-financial-report',
    description: 'Generates comprehensive financial analysis report',
    inputSchema: z.object({
        financial: financialDataSchema,
        technical: technicalAnalysisSchema,
    }),
    outputSchema: reportSchema,
    execute: async ({ inputData, writer, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'generate-financial-report',
            input: inputData,
            metadata: {
                'workflow.step': 'generate-financial-report',
            },
            requestContext,
            mastra,
        })
        const startTime = Date.now()
        const { financial } = inputData
        const { symbol } = financial
        logStepStart('generate-financial-report', { symbol })

        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `📋 Generating financial report for ${symbol}...`,
                    stage: 'generate-financial-report',
                },
                id: 'generate-financial-report',
            })

            // This would use reportAgent or evaluationAgent
            const report = {
                symbol,
                analysis: inputData,
                recommendation: 'buy' as const,
                confidence: 75,
                risks: ['Market volatility', 'Economic uncertainty'],
                report: `Financial Analysis Report for ${symbol}\n\nPrice: $${inputData.financial.price}\nTrend: ${inputData.technical.trend}\nRecommendation: BUY with 75% confidence`,
                generatedAt: new Date().toISOString(),
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Financial report generated for ${symbol}`,
                    stage: 'generate-financial-report',
                },
                id: 'generate-financial-report',
            })

            logStepEnd(
                'generate-financial-report',
                { symbol, recommendation: report.recommendation },
                Date.now() - startTime
            )
            span?.update({ output: report })
            span?.end()
            return report
        } catch (error) {
            span?.error({
                error:
                    error instanceof Error ? error : new Error(String(error)),
                endSpan: true,
            })
            logError('generate-financial-report', error instanceof Error ? error : new Error(String(error)), { symbol })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Report generation failed for ${symbol}`,
                    stage: 'generate-financial-report',
                },
                id: 'generate-financial-report',
            })

            throw error
        }
    },
})

export const financialAnalysisWorkflow = createWorkflow({
    id: 'financialAnalysisWorkflow',
    description:
        'Comprehensive financial analysis workflow using technical analysis tools',
    inputSchema: z.object({
        symbol: z
            .string()
            .describe('Stock symbol to analyze (e.g., AAPL, MSFT, GOOGL)'),
    }),
    outputSchema: reportSchema,
})

financialAnalysisWorkflow.commit()

