import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { AISpanType, InternalSpans } from '@mastra/core/ai-tracing';
import { logStepStart, logStepEnd, logError } from '../config/logger';

const stockDataSchema = z.object({
  symbol: z.string(),
  currentPrice: z.number().optional(),
  volume: z.number().optional(),
  previousClose: z.number().optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  marketCap: z.number().optional(),
  raw: z.any().optional(),
});

const newsDataSchema = z.object({
  symbol: z.string(),
  headlines: z.array(z.object({
    title: z.string(),
    source: z.string().optional(),
    url: z.string().optional(),
    sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
    publishedAt: z.string().optional(),
  })).optional(),
  overallSentiment: z.enum(['bullish', 'bearish', 'neutral']).optional(),
});

const analysisDataSchema = z.object({
  symbol: z.string(),
  stockData: stockDataSchema,
  newsData: newsDataSchema,
  technicalAnalysis: z.object({
    trend: z.enum(['uptrend', 'downtrend', 'sideways']).optional(),
    rsiSignal: z.string().optional(),
    macdSignal: z.string().optional(),
    support: z.number().optional(),
    resistance: z.number().optional(),
  }).optional(),
  fundamentalAnalysis: z.object({
    peRatio: z.number().optional(),
    eps: z.number().optional(),
    revenueGrowth: z.number().optional(),
    profitMargin: z.number().optional(),
  }).optional(),
});

const reportDataSchema = z.object({
  symbol: z.string(),
  analysis: analysisDataSchema,
  recommendation: z.enum(['strong-buy', 'buy', 'hold', 'sell', 'strong-sell']),
  confidence: z.number().min(0).max(100),
  priceTarget: z.number().optional(),
  reasoning: z.string(),
  risks: z.array(z.string()),
  report: z.string(),
  generatedAt: z.string(),
});

const fetchStockDataStep = createStep({
  id: 'fetch-stock-data',
  description: 'Fetches real-time stock data from Polygon.io',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol'),
    analysisDepth: z.enum(['quick', 'standard', 'deep']).default('standard'),
  }),
  outputSchema: stockDataSchema,
  retries: 3,
  execute: async ({ inputData, mastra, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('fetch-stock-data', { symbol: inputData.symbol });

    await writer?.write({
      type: 'step-start',
      stepId: 'fetch-stock-data',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'polygon-snapshot-fetch',
      input: { symbol: inputData.symbol },
      metadata: { service: 'polygon', endpoint: '/v2/snapshot' },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 20,
        message: `Fetching stock data for ${inputData.symbol}...`,
      });

      const apiKey = process.env.POLYGON_API_KEY;
      if (!apiKey) {
        throw new Error('POLYGON_API_KEY is required');
      }

      const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${inputData.symbol}?apiKey=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      await writer?.write({
        type: 'progress',
        percent: 80,
        message: 'Processing stock data...',
      });

      const ticker = data?.ticker;
      const result: z.infer<typeof stockDataSchema> = {
        symbol: inputData.symbol,
        currentPrice: ticker?.day?.c ?? ticker?.prevDay?.c,
        volume: ticker?.day?.v ?? ticker?.prevDay?.v,
        previousClose: ticker?.prevDay?.c,
        change: ticker?.todaysChange,
        changePercent: ticker?.todaysChangePerc,
        marketCap: undefined,
        raw: data,
      };

      span?.end({
        output: { currentPrice: result.currentPrice, volume: result.volume },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'fetch-stock-data',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('fetch-stock-data', { symbol: result.symbol, price: result.currentPrice }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('fetch-stock-data', error, { symbol: inputData.symbol });

      await writer?.write({
        type: 'step-error',
        stepId: 'fetch-stock-data',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const getCompanyNewsStep = createStep({
  id: 'get-company-news',
  description: 'Fetches company news and sentiment from Finnhub',
  inputSchema: stockDataSchema,
  outputSchema: z.object({
    stockData: stockDataSchema,
    newsData: newsDataSchema,
  }),
  retries: 3,
  execute: async ({ inputData, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('get-company-news', { symbol: inputData.symbol });

    await writer?.write({
      type: 'step-start',
      stepId: 'get-company-news',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'finnhub-news-fetch',
      input: { symbol: inputData.symbol },
      metadata: { service: 'finnhub', endpoint: '/company-news' },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 30,
        message: `Fetching news for ${inputData.symbol}...`,
      });

      const apiKey = process.env.FINNHUB_API_KEY;
      if (!apiKey) {
        const newsData: z.infer<typeof newsDataSchema> = {
          symbol: inputData.symbol,
          headlines: [],
          overallSentiment: 'neutral',
        };
        span?.end({ output: { newsCount: 0, sentiment: 'neutral' } });
        return { stockData: inputData, newsData };
      }

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const url = `https://finnhub.io/api/v1/company-news?symbol=${inputData.symbol}&from=${weekAgo}&to=${today}&token=${apiKey}`;

      const response = await fetch(url);
      const articles = await response.json();

      await writer?.write({
        type: 'progress',
        percent: 70,
        message: 'Analyzing news sentiment...',
      });

      const headlines = Array.isArray(articles)
        ? articles.slice(0, 10).map((a: { headline?: string; source?: string; url?: string; datetime?: number }) => ({
            title: a.headline ?? '',
            source: a.source,
            url: a.url,
            sentiment: 'neutral' as const,
            publishedAt: a.datetime ? new Date(a.datetime * 1000).toISOString() : undefined,
          }))
        : [];

      const newsData: z.infer<typeof newsDataSchema> = {
        symbol: inputData.symbol,
        headlines,
        overallSentiment: 'neutral',
      };

      span?.end({
        output: { newsCount: headlines.length, sentiment: newsData.overallSentiment },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'get-company-news',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('get-company-news', { symbol: inputData.symbol, newsCount: headlines.length }, Date.now() - startTime);
      return { stockData: inputData, newsData };
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('get-company-news', error, { symbol: inputData.symbol });

      await writer?.write({
        type: 'step-error',
        stepId: 'get-company-news',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        stockData: inputData,
        newsData: { symbol: inputData.symbol, headlines: [], overallSentiment: 'neutral' as const },
      };
    }
  },
});

const runAnalysisStep = createStep({
  id: 'run-analysis',
  description: 'Performs technical and fundamental analysis using stockAnalysisAgent',
  inputSchema: z.object({
    stockData: stockDataSchema,
    newsData: newsDataSchema,
  }),
  outputSchema: analysisDataSchema,
  execute: async ({ inputData, mastra, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('run-analysis', { symbol: inputData.stockData.symbol });

    await writer?.write({
      type: 'step-start',
      stepId: 'run-analysis',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.AGENT_RUN,
      name: 'stock-analysis-agent-call',
      input: { symbol: inputData.stockData.symbol },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 10,
        message: 'Starting technical analysis...',
      });

      const agent = mastra?.getAgent('stockAnalysisAgent');

      let technicalAnalysis: z.infer<typeof analysisDataSchema>['technicalAnalysis'] = {};
      let fundamentalAnalysis: z.infer<typeof analysisDataSchema>['fundamentalAnalysis'] = {};

      if (agent) {
        await writer?.write({
          type: 'progress',
          percent: 40,
          message: 'Running AI-powered analysis...',
        });

        const prompt = `Analyze the stock ${inputData.stockData.symbol}:
        Current Price: ${inputData.stockData.currentPrice}
        Change: ${inputData.stockData.changePercent}%
        Volume: ${inputData.stockData.volume}
        Recent News Headlines: ${inputData.newsData.headlines?.map(h => h.title).join('; ')}
        
        Provide technical and fundamental analysis in JSON format.`;

        const response = await agent.generate(prompt, {
          output: z.object({
            technicalAnalysis: z.object({
              trend: z.enum(['uptrend', 'downtrend', 'sideways']),
              rsiSignal: z.string(),
              macdSignal: z.string(),
              support: z.number().optional(),
              resistance: z.number().optional(),
            }),
            fundamentalAnalysis: z.object({
              peRatio: z.number().optional(),
              eps: z.number().optional(),
              revenueGrowth: z.number().optional(),
              profitMargin: z.number().optional(),
            }),
          }),
        });

        technicalAnalysis = response.object.technicalAnalysis;
        fundamentalAnalysis = response.object.fundamentalAnalysis;
      } else {
        technicalAnalysis = {
          trend: 'sideways',
          rsiSignal: 'neutral',
          macdSignal: 'neutral',
        };
      }

      await writer?.write({
        type: 'progress',
        percent: 90,
        message: 'Finalizing analysis...',
      });

      const result: z.infer<typeof analysisDataSchema> = {
        symbol: inputData.stockData.symbol,
        stockData: inputData.stockData,
        newsData: inputData.newsData,
        technicalAnalysis,
        fundamentalAnalysis,
      };

      span?.end({
        output: { trend: technicalAnalysis?.trend, hasAgent: !!agent },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'run-analysis',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('run-analysis', { symbol: result.symbol, trend: technicalAnalysis?.trend }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('run-analysis', error, { symbol: inputData.stockData.symbol });

      await writer?.write({
        type: 'step-error',
        stepId: 'run-analysis',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const generateReportStep = createStep({
  id: 'generate-report',
  description: 'Generates final analysis report using reportAgent',
  inputSchema: analysisDataSchema,
  outputSchema: reportDataSchema,
  execute: async ({ inputData, mastra, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('generate-report', { symbol: inputData.symbol });

    await writer?.write({
      type: 'step-start',
      stepId: 'generate-report',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.WORKFLOW_RUN,
      name: 'report-agent-call',
      input: { symbol: inputData.symbol },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 20,
        message: 'Generating investment report...',
      });

      const agent = mastra?.getAgent('reportAgent');

      let recommendation: z.infer<typeof reportDataSchema>['recommendation'] = 'hold';
      let confidence = 50;
      let priceTarget: number | undefined;
      let reasoning = '';
      let risks: string[] = [];
      let report = '';

      if (agent) {
        await writer?.write({
          type: 'progress',
          percent: 50,
          message: 'AI generating comprehensive report...',
        });

        const prompt = `Generate an investment report for ${inputData.symbol}:
        
        Technical Analysis:
        - Trend: ${inputData.technicalAnalysis?.trend}
        - RSI: ${inputData.technicalAnalysis?.rsiSignal}
        - MACD: ${inputData.technicalAnalysis?.macdSignal}
        
        Stock Data:
        - Current Price: $${inputData.stockData.currentPrice}
        - Change: ${inputData.stockData.changePercent}%
        - Volume: ${inputData.stockData.volume}
        
        News Sentiment: ${inputData.newsData.overallSentiment}
        
        Provide a recommendation (strong-buy, buy, hold, sell, strong-sell), confidence score (0-100), price target, reasoning, and key risks.`;

        const response = await agent.generate(prompt, {
          output: z.object({
            recommendation: z.enum(['strong-buy', 'buy', 'hold', 'sell', 'strong-sell']),
            confidence: z.number().min(0).max(100),
            priceTarget: z.number().optional(),
            reasoning: z.string(),
            risks: z.array(z.string()),
            report: z.string(),
          }),
        });

        recommendation = response.object.recommendation;
        confidence = response.object.confidence;
        priceTarget = response.object.priceTarget;
        reasoning = response.object.reasoning;
        risks = response.object.risks;
        report = response.object.report;
      } else {
        reasoning = `Based on the ${inputData.technicalAnalysis?.trend} trend and ${inputData.newsData.overallSentiment} news sentiment.`;
        risks = ['Market volatility', 'Economic uncertainty'];
        report = `Stock Analysis Report for ${inputData.symbol}\n\nCurrent Price: $${inputData.stockData.currentPrice}\nRecommendation: ${recommendation}`;
      }

      await writer?.write({
        type: 'progress',
        percent: 90,
        message: 'Finalizing report...',
      });

      const result: z.infer<typeof reportDataSchema> = {
        symbol: inputData.symbol,
        analysis: inputData,
        recommendation,
        confidence,
        priceTarget,
        reasoning,
        risks,
        report,
        generatedAt: new Date().toISOString(),
      };

      span?.end({
        output: { recommendation, confidence, hasReport: !!report },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'generate-report',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('generate-report', { symbol: result.symbol, recommendation }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('generate-report', error, { symbol: inputData.symbol });

      await writer?.write({
        type: 'step-error',
        stepId: 'generate-report',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

export const stockAnalysisWorkflow = createWorkflow({
  id: 'stock-analysis-workflow',
  description: 'Sequential stock analysis workflow with data enrichment at each step',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol (e.g., AAPL, MSFT, GOOGL)'),
    analysisDepth: z.enum(['quick', 'standard', 'deep']).default('standard').describe('Depth of analysis'),
  }),
  outputSchema: reportDataSchema,
})
  .then(fetchStockDataStep)
  .then(getCompanyNewsStep)
  .then(runAnalysisStep)
  .then(generateReportStep);

stockAnalysisWorkflow.commit();
