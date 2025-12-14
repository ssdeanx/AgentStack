import { createStep, createWorkflow } from '@mastra/core/workflows';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { z } from 'zod';
import { logError, logStepEnd, logStepStart } from '../config/logger';

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
  execute: async ({ inputData, mastra, writer }) => {
    const startTime = Date.now();
    logStepStart('fetch-stock-data', { symbol: inputData.symbol });

    const tracer = trace.getTracer('stock-analysis');
    const span = tracer.startSpan('polygon-snapshot-fetch', {
      attributes: { symbol: inputData.symbol, service: 'polygon', endpoint: '/v2/snapshot' },
    });

    try {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'in-progress',
          message: `Fetching stock data for ${inputData.symbol}...`,
          stage: 'fetch-stock-data',
        },
        id: 'fetch-stock-data',
      });

      const apiKey = process.env.POLYGON_API_KEY;
      if (!apiKey) {
        throw new Error('POLYGON_API_KEY is required');
      }

      const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${inputData.symbol}?apiKey=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: 'Processing stock data...',
          stage: 'fetch-stock-data',
        },
        id: 'fetch-stock-data',
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

      // Record key attributes and close the OTEL span
      if (result.currentPrice !== null && result.currentPrice !== undefined) { span.setAttribute('currentPrice', result.currentPrice); }
      if (result.volume !== null && result.volume !== undefined) { span.setAttribute('volume', result.volume); }
      span.setAttribute('responseTimeMs', Date.now() - startTime);
      span.end();


      logStepEnd('fetch-stock-data', { symbol: result.symbol, price: result.currentPrice }, Date.now() - startTime);
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      logError('fetch-stock-data', error, { symbol: inputData.symbol });

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          stage: 'fetch-stock-data',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        id: 'fetch-stock-data',
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
  execute: async ({ inputData, writer }) => {
    const startTime = Date.now();
    logStepStart('get-company-news', { symbol: inputData.symbol });

    const tracer = trace.getTracer('stock-analysis');
    const span = tracer.startSpan('finnhub-news-fetch', {
      attributes: {
        symbol: inputData.symbol,
        service: 'finnhub',
        endpoint: '/company-news'
      }
    });

    try {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'in-progress',
          message: `Fetching news for ${inputData.symbol}...`,
          stage: 'get-company-news',
        },
        id: 'get-company-news',
      });

      const apiKey = process.env.FINNHUB_API_KEY;
      if (!apiKey) {
        const newsData: z.infer<typeof newsDataSchema> = {
          symbol: inputData.symbol,
          headlines: [],
          overallSentiment: 'neutral',
        };

        await writer?.custom({
          type: 'data-tool-progress',
          data: {
            status: 'done',
            message: 'FINNHUB_API_KEY not set; returning empty news and neutral sentiment.',
            stage: 'get-company-news',
          },
          id: 'get-company-news',
        });

        span.setAttribute('newsCount', 0);
        span.setAttribute('sentiment', 'neutral');
        span.setAttribute('responseTimeMs', Date.now() - startTime);
        span.end();

        await writer?.custom({
          type: 'data-tool-progress',
          data: {
            stage: 'get-company-news',
            success: true,
            duration: Date.now() - startTime,
            status: 'done',
          },
          id: 'get-company-news',
        });

        return { stockData: inputData, newsData };
      }

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const url = `https://finnhub.io/api/v1/company-news?symbol=${inputData.symbol}&from=${weekAgo}&to=${today}&token=${apiKey}`;

      const response = await fetch(url);
      const articles = await response.json();

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'in-progress',
          message: 'Analyzing news sentiment...',
          stage: 'get-company-news',
        },
        id: 'get-company-news',
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

      span.setAttribute('newsCount', headlines.length);
      span.setAttribute('sentiment', newsData.overallSentiment ?? 'neutral');
      span.setAttribute('responseTimeMs', Date.now() - startTime);
      span.end();


      logStepEnd('get-company-news', { symbol: inputData.symbol, newsCount: headlines.length }, Date.now() - startTime);
      return { stockData: inputData, newsData };
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      logError('get-company-news', error, { symbol: inputData.symbol });

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          stage: 'get-company-news',
          status: 'done',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        id: 'get-company-news',
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

    const tracer = trace.getTracer('stock-analysis');
    const span = tracer.startSpan('stock-analysis-agent-call', {
      attributes: {
        symbol: inputData.stockData.symbol,
        agent: 'stockAnalysisAgent',
      },
    });

    try {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'in-progress',
          message: 'Starting technical analysis...',
          stage: 'run-analysis',
        },
        id: 'run-analysis',
      });

      const agent = mastra?.getAgent('stockAnalysisAgent');

      let technicalAnalysis: z.infer<typeof analysisDataSchema>['technicalAnalysis'] = {};
      let fundamentalAnalysis: z.infer<typeof analysisDataSchema>['fundamentalAnalysis'] = {};

      if (agent) {
        await writer?.custom({
          type: 'data-tool-progress',
          data: {
            status: 'in-progress',
            message: 'Running AI-powered analysis...',
            stage: 'run-analysis',
          },
          id: 'run-analysis',
        });

        const prompt = `Analyze the stock ${inputData.stockData.symbol}:
        Current Price: ${inputData.stockData.currentPrice}
        Change: ${inputData.stockData.changePercent}%
        Volume: ${inputData.stockData.volume}
        Recent News Headlines: ${inputData.newsData.headlines?.map(h => h.title).join('; ')}

        Provide technical and fundamental analysis in JSON format.`;

        const stream = await agent.stream(prompt, {
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
        } as any);

        // Pipe partial text deltas into the workflow writer for live progress if provided
        await stream.textStream?.pipeTo?.(writer);

        // Wait for the final text and attempt JSON parse; if parse fails we fall back to no-op
        const finalText = await stream.text;
        let parsed: any = null;
        try {
          parsed = JSON.parse(finalText);
        } catch {
          parsed = null;
        }

        if (parsed) {
          technicalAnalysis = parsed.technicalAnalysis ?? {};
          fundamentalAnalysis = parsed.fundamentalAnalysis ?? {};
        }
      } else {
        technicalAnalysis = {
          trend: 'sideways',
          rsiSignal: 'neutral',
          macdSignal: 'neutral',
        };
      }

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: 'Finalizing analysis...',
          stage: 'run-analysis',
        },
        id: 'run-analysis',
      });

      const result: z.infer<typeof analysisDataSchema> = {
        symbol: inputData.stockData.symbol,
        stockData: inputData.stockData,
        newsData: inputData.newsData,
        technicalAnalysis,
        fundamentalAnalysis,
      };

      if (technicalAnalysis?.trend) {
        span.setAttribute('trend', technicalAnalysis.trend);
      }
      span.setAttribute('hasAgent', !!agent);
      span.setAttribute('responseTimeMs', Date.now() - startTime);
      span.end();


      logStepEnd('run-analysis', { symbol: result.symbol, trend: technicalAnalysis?.trend }, Date.now() - startTime);
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      logError('run-analysis', error, { symbol: inputData.stockData.symbol });

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          stage: 'run-analysis',
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'done'
        },
        id: 'run-analysis',
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

    const tracer = trace.getTracer('stock-analysis');
    const span = tracer.startSpan('report-agent-call', {
      attributes: {
        symbol: inputData.symbol,
        agent: 'reportAgent',
      },
    });

    try {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'in-progress',
          message: 'Generating investment report...',
          stage: 'generate-report',
        },
        id: 'generate-report',
      });

      const agent = mastra?.getAgent('reportAgent');

      let recommendation: z.infer<typeof reportDataSchema>['recommendation'] = 'hold';
      let confidence = 50;
      let priceTarget: number | undefined;
      let reasoning = '';
      let risks: string[] = [];
      let report = '';

      if (agent) {
        await writer?.custom({
          type: 'data-tool-progress',
          data: {
            status: 'in-progress',
            message: 'AI generating comprehensive report...',
            stage: 'generate-report',
          },
          id: 'generate-report',
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

        const stream = await agent.stream(prompt, {
          output: z.object({
            recommendation: z.enum(['strong-buy', 'buy', 'hold', 'sell', 'strong-sell']),
            confidence: z.number().min(0).max(100),
            priceTarget: z.number().optional(),
            reasoning: z.string(),
            risks: z.array(z.string()),
            report: z.string(),
          }),
        } as any);

        // Pipe partial deltas into the workflow writer if one is present
        await stream.textStream?.pipeTo?.(writer);

        // Wait for final text and try to parse JSON
        const finalText = await stream.text;
        let parsed: any = null;
        try {
          parsed = JSON.parse(finalText);
        } catch {
          parsed = null;
        }
        if (parsed) {
          recommendation = parsed.recommendation;
          confidence = parsed.confidence;
          priceTarget = parsed.priceTarget;
          reasoning = parsed.reasoning;
          risks = parsed.risks;
          report = parsed.report;
        }
      } else {
        reasoning = `Based on the ${inputData.technicalAnalysis?.trend} trend and ${inputData.newsData.overallSentiment} news sentiment.`;
        risks = ['Market volatility', 'Economic uncertainty'];
        report = `Stock Analysis Report for ${inputData.symbol}\n\nCurrent Price: $${inputData.stockData.currentPrice}\nRecommendation: ${recommendation}`;
      }

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: 'Finalizing report...',
          stage: 'generate-report',
        },
        id: 'generate-report',
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

      span.setAttribute('recommendation', recommendation);
      span.setAttribute('confidence', confidence);
      span.setAttribute('hasReport', !!report);
      span.setAttribute('responseTimeMs', Date.now() - startTime);
      span.end();


      logStepEnd('generate-report', { symbol: result.symbol, recommendation }, Date.now() - startTime);
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      logError('generate-report', error, { symbol: inputData.symbol });

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          stage: 'generate-report',
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'done',
        },
        id: 'generate-report',
      });

      throw error;
    }
  },
});

export const stockAnalysisWorkflow = createWorkflow({
  id: 'stockAnalysisWorkflow',
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
