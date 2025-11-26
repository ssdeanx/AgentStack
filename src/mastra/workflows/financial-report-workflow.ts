import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { AISpanType, InternalSpans } from '@mastra/core/ai-tracing';
import { logStepStart, logStepEnd, logError } from '../config/logger';

const financialInputSchema = z.object({
  symbols: z.array(z.string()).min(1).describe('Stock ticker symbols'),
  reportType: z.enum(['daily', 'weekly', 'quarterly']).describe('Report type'),
  includeNews: z.boolean().default(true),
  includeTechnicals: z.boolean().default(true),
});

const priceDataSchema = z.object({
  symbol: z.string(),
  currentPrice: z.number().optional(),
  previousClose: z.number().optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  volume: z.number().optional(),
  high: z.number().optional(),
  low: z.number().optional(),
  open: z.number().optional(),
  timestamp: z.string().optional(),
});

const companyMetricsSchema = z.object({
  symbol: z.string(),
  marketCap: z.number().optional(),
  peRatio: z.number().optional(),
  eps: z.number().optional(),
  dividend: z.number().optional(),
  beta: z.number().optional(),
  weekHigh52: z.number().optional(),
  weekLow52: z.number().optional(),
  avgVolume: z.number().optional(),
});

const newsSentimentSchema = z.object({
  symbol: z.string(),
  articles: z.array(z.object({
    headline: z.string(),
    source: z.string().optional(),
    sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
    publishedAt: z.string().optional(),
  })).optional(),
  overallSentiment: z.enum(['bullish', 'bearish', 'neutral']).optional(),
  sentimentScore: z.number().optional(),
});

const parallelResultsSchema = z.object({
  priceData: z.array(priceDataSchema),
  companyMetrics: z.array(companyMetricsSchema),
  newsSentiment: z.array(newsSentimentSchema),
  metadata: z.object({
    symbols: z.array(z.string()),
    reportType: z.string(),
    includeNews: z.boolean(),
    includeTechnicals: z.boolean(),
    fetchedAt: z.string(),
  }),
});

const mergedDataSchema = z.object({
  stocks: z.array(z.object({
    symbol: z.string(),
    price: priceDataSchema,
    metrics: companyMetricsSchema,
    sentiment: newsSentimentSchema,
  })),
  metadata: z.object({
    symbols: z.array(z.string()),
    reportType: z.string(),
    totalSymbols: z.number(),
    fetchedAt: z.string(),
  }),
});

const analysisResultSchema = z.object({
  stocks: mergedDataSchema.shape.stocks,
  analysis: z.object({
    topPerformers: z.array(z.string()),
    worstPerformers: z.array(z.string()),
    bullishStocks: z.array(z.string()),
    bearishStocks: z.array(z.string()),
    averageChange: z.number(),
    marketTrend: z.enum(['bullish', 'bearish', 'neutral']),
    recommendations: z.array(z.object({
      symbol: z.string(),
      action: z.enum(['buy', 'hold', 'sell']),
      reason: z.string(),
    })),
  }),
  metadata: mergedDataSchema.shape.metadata,
});

const finalReportSchema = z.object({
  reportId: z.string(),
  generatedAt: z.string(),
  summary: z.string(),
  report: z.string(),
  data: z.object({
    stocks: analysisResultSchema.shape.stocks,
    analysis: analysisResultSchema.shape.analysis,
  }),
  metadata: z.object({
    symbols: z.array(z.string()),
    reportType: z.string(),
    totalSymbols: z.number(),
  }),
});

const fetchPriceDataStep = createStep({
  id: 'fetch-price-data',
  description: 'Fetches real-time price data from Polygon.io',
  inputSchema: financialInputSchema,
  outputSchema: z.object({
    priceData: z.array(priceDataSchema),
    metadata: z.object({
      symbols: z.array(z.string()),
      reportType: z.string(),
      includeNews: z.boolean(),
      includeTechnicals: z.boolean(),
    }),
  }),
  retries: 3,
  execute: async ({ inputData, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('fetch-price-data', { symbols: inputData.symbols });

    await writer?.write({
      type: 'step-start',
      stepId: 'fetch-price-data',
      timestamp: Date.now(),
    });

    const parentSpan = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'parallel-price-fetch',
      input: { symbols: inputData.symbols },
    });

    try {
      const priceData: z.infer<typeof priceDataSchema>[] = [];
      const apiKey = process.env.POLYGON_API_KEY;

      await writer?.write({
        type: 'parallel-progress',
        stepId: 'fetch-price-data',
        total: inputData.symbols.length,
        completed: 0,
        message: `Fetching prices for ${inputData.symbols.length} symbols...`,
      });

      for (let i = 0; i < inputData.symbols.length; i++) {
        const symbol = inputData.symbols[i];

        const symbolSpan = parentSpan?.createChildSpan({
          type: AISpanType.TOOL_CALL,
          name: `price-fetch-${symbol}`,
          input: { symbol },
          metadata: { service: 'polygon' },
          tracingPolicy: { internal: InternalSpans.ALL }
        });

        try {
          if (apiKey) {
            const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apiKey=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json();
            const ticker = data?.ticker;

            priceData.push({
              symbol,
              currentPrice: ticker?.day?.c ?? ticker?.prevDay?.c,
              previousClose: ticker?.prevDay?.c,
              change: ticker?.todaysChange,
              changePercent: ticker?.todaysChangePerc,
              volume: ticker?.day?.v,
              high: ticker?.day?.h,
              low: ticker?.day?.l,
              open: ticker?.day?.o,
              timestamp: new Date().toISOString(),
            });
          } else {
            priceData.push({
              symbol,
              currentPrice: 100 + Math.random() * 50,
              previousClose: 100,
              change: Math.random() * 10 - 5,
              changePercent: Math.random() * 5 - 2.5,
              volume: Math.floor(Math.random() * 10000000),
              timestamp: new Date().toISOString(),
            });
          }

          symbolSpan?.end({ output: { symbol, fetched: true } });
        } catch (error) {
          symbolSpan?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
          priceData.push({ symbol, timestamp: new Date().toISOString() });
        }

        await writer?.write({
          type: 'parallel-progress',
          stepId: 'fetch-price-data',
          total: inputData.symbols.length,
          completed: i + 1,
          message: `Fetched ${i + 1}/${inputData.symbols.length} prices...`,
        });
      }

      parentSpan?.end({
        output: { symbolsCount: priceData.length },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'fetch-price-data',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('fetch-price-data', { symbolsCount: priceData.length }, Date.now() - startTime);

      return {
        priceData,
        metadata: {
          symbols: inputData.symbols,
          reportType: inputData.reportType,
          includeNews: inputData.includeNews,
          includeTechnicals: inputData.includeTechnicals,
        },
      };
    } catch (error) {
      parentSpan?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('fetch-price-data', error, { symbols: inputData.symbols });

      await writer?.write({
        type: 'step-error',
        stepId: 'fetch-price-data',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const fetchCompanyMetricsStep = createStep({
  id: 'fetch-company-metrics',
  description: 'Fetches company fundamentals from Finnhub',
  inputSchema: financialInputSchema,
  outputSchema: z.object({
    companyMetrics: z.array(companyMetricsSchema),
    metadata: z.object({
      symbols: z.array(z.string()),
      reportType: z.string(),
      includeNews: z.boolean(),
      includeTechnicals: z.boolean(),
    }),
  }),
  retries: 3,
  execute: async ({ inputData, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('fetch-company-metrics', { symbols: inputData.symbols });

    await writer?.write({
      type: 'step-start',
      stepId: 'fetch-company-metrics',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'parallel-metrics-fetch',
      input: { symbols: inputData.symbols },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    try {
      const companyMetrics: z.infer<typeof companyMetricsSchema>[] = [];
      const apiKey = process.env.FINNHUB_API_KEY;

      await writer?.write({
        type: 'parallel-progress',
        stepId: 'fetch-company-metrics',
        total: inputData.symbols.length,
        completed: 0,
        message: `Fetching metrics for ${inputData.symbols.length} symbols...`,
      });

      for (let i = 0; i < inputData.symbols.length; i++) {
        const symbol = inputData.symbols[i];

        try {
          if (apiKey) {
            const url = `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json();
            const metrics = data?.metric ?? {};

            companyMetrics.push({
              symbol,
              marketCap: metrics.marketCapitalization,
              peRatio: metrics.peBasicExclExtraTTM,
              eps: metrics.epsBasicExclExtraItemsTTM,
              dividend: metrics.dividendYieldIndicatedAnnual,
              beta: metrics.beta,
              weekHigh52: metrics['52WeekHigh'],
              weekLow52: metrics['52WeekLow'],
              avgVolume: metrics['10DayAverageTradingVolume'],
            });
          } else {
            companyMetrics.push({
              symbol,
              marketCap: Math.floor(Math.random() * 1000000000000),
              peRatio: 15 + Math.random() * 20,
              eps: 2 + Math.random() * 10,
              beta: 0.8 + Math.random() * 0.6,
            });
          }
        } catch {
          companyMetrics.push({ symbol });
        }

        await writer?.write({
          type: 'parallel-progress',
          stepId: 'fetch-company-metrics',
          total: inputData.symbols.length,
          completed: i + 1,
          message: `Fetched ${i + 1}/${inputData.symbols.length} metrics...`,
        });
      }

      span?.end({
        output: { symbolsCount: companyMetrics.length },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'fetch-company-metrics',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('fetch-company-metrics', { symbolsCount: companyMetrics.length }, Date.now() - startTime);

      return {
        companyMetrics,
        metadata: {
          symbols: inputData.symbols,
          reportType: inputData.reportType,
          includeNews: inputData.includeNews,
          includeTechnicals: inputData.includeTechnicals,
        },
      };
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('fetch-company-metrics', error, { symbols: inputData.symbols });

      await writer?.write({
        type: 'step-error',
        stepId: 'fetch-company-metrics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const fetchNewsSentimentStep = createStep({
  id: 'fetch-news-sentiment',
  description: 'Fetches news and sentiment from Finnhub',
  inputSchema: financialInputSchema,
  outputSchema: z.object({
    newsSentiment: z.array(newsSentimentSchema),
    metadata: z.object({
      symbols: z.array(z.string()),
      reportType: z.string(),
      includeNews: z.boolean(),
      includeTechnicals: z.boolean(),
    }),
  }),
  retries: 3,
  execute: async ({ inputData, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('fetch-news-sentiment', { symbols: inputData.symbols });

    await writer?.write({
      type: 'step-start',
      stepId: 'fetch-news-sentiment',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'parallel-news-fetch',
      input: { symbols: inputData.symbols },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    try {
      const newsSentiment: z.infer<typeof newsSentimentSchema>[] = [];
      const apiKey = process.env.FINNHUB_API_KEY;

      if (!inputData.includeNews) {
        inputData.symbols.forEach(symbol => {
          newsSentiment.push({ symbol, articles: [], overallSentiment: 'neutral' });
        });

        span?.end({ output: { skipped: true, reason: 'includeNews=false' } });

        await writer?.write({
          type: 'step-complete',
          stepId: 'fetch-news-sentiment',
          success: true,
          duration: Date.now() - startTime,
        });

        return {
          newsSentiment,
          metadata: {
            symbols: inputData.symbols,
            reportType: inputData.reportType,
            includeNews: inputData.includeNews,
            includeTechnicals: inputData.includeTechnicals,
          },
        };
      }

      await writer?.write({
        type: 'parallel-progress',
        stepId: 'fetch-news-sentiment',
        total: inputData.symbols.length,
        completed: 0,
        message: `Fetching news for ${inputData.symbols.length} symbols...`,
      });

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      for (let i = 0; i < inputData.symbols.length; i++) {
        const symbol = inputData.symbols[i];

        try {
          if (apiKey) {
            const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${weekAgo}&to=${today}&token=${apiKey}`;
            const response = await fetch(url);
            const articles = await response.json();

            const formattedArticles = Array.isArray(articles)
              ? articles.slice(0, 5).map((a: { headline?: string; source?: string; datetime?: number }) => ({
                  headline: a.headline ?? '',
                  source: a.source,
                  sentiment: 'neutral' as const,
                  publishedAt: a.datetime ? new Date(a.datetime * 1000).toISOString() : undefined,
                }))
              : [];

            newsSentiment.push({
              symbol,
              articles: formattedArticles,
              overallSentiment: 'neutral',
              sentimentScore: 0,
            });
          } else {
            newsSentiment.push({
              symbol,
              articles: [{ headline: `Sample news for ${symbol}`, sentiment: 'neutral' }],
              overallSentiment: 'neutral',
              sentimentScore: Math.random() * 2 - 1,
            });
          }
        } catch {
          newsSentiment.push({ symbol, articles: [], overallSentiment: 'neutral' });
        }

        await writer?.write({
          type: 'parallel-progress',
          stepId: 'fetch-news-sentiment',
          total: inputData.symbols.length,
          completed: i + 1,
          message: `Fetched ${i + 1}/${inputData.symbols.length} news...`,
        });
      }

      span?.end({
        output: { symbolsCount: newsSentiment.length },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'fetch-news-sentiment',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('fetch-news-sentiment', { symbolsCount: newsSentiment.length }, Date.now() - startTime);

      return {
        newsSentiment,
        metadata: {
          symbols: inputData.symbols,
          reportType: inputData.reportType,
          includeNews: inputData.includeNews,
          includeTechnicals: inputData.includeTechnicals,
        },
      };
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('fetch-news-sentiment', error, { symbols: inputData.symbols });

      await writer?.write({
        type: 'step-error',
        stepId: 'fetch-news-sentiment',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const mergeDataStep = createStep({
  id: 'merge-data',
  description: 'Merges parallel fetch results into unified structure',
  inputSchema: parallelResultsSchema,
  outputSchema: mergedDataSchema,
  execute: async ({ inputData, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('merge-data', { symbolsCount: inputData.metadata.symbols.length });

    await writer?.write({
      type: 'step-start',
      stepId: 'merge-data',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'data-merge',
      input: { symbolsCount: inputData.metadata.symbols.length },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 30,
        message: 'Merging price, metrics, and sentiment data...',
      });

      const stocks = inputData.metadata.symbols.map(symbol => {
        const price = inputData.priceData.find(p => p.symbol === symbol) ?? { symbol };
        const metrics = inputData.companyMetrics.find(m => m.symbol === symbol) ?? { symbol };
        const sentiment = inputData.newsSentiment.find(s => s.symbol === symbol) ?? { symbol };

        return { symbol, price, metrics, sentiment };
      });

      await writer?.write({
        type: 'progress',
        percent: 90,
        message: 'Data merge complete...',
      });

      const result: z.infer<typeof mergedDataSchema> = {
        stocks,
        metadata: {
          symbols: inputData.metadata.symbols,
          reportType: inputData.metadata.reportType,
          totalSymbols: stocks.length,
          fetchedAt: inputData.metadata.fetchedAt,
        },
      };

      span?.end({
        output: { totalSymbols: stocks.length },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'merge-data',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('merge-data', { totalSymbols: stocks.length }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('merge-data', error);

      await writer?.write({
        type: 'step-error',
        stepId: 'merge-data',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const analyzeDataStep = createStep({
  id: 'analyze-data',
  description: 'Analyzes merged data using stockAnalysisAgent',
  inputSchema: mergedDataSchema,
  outputSchema: analysisResultSchema,
  execute: async ({ inputData, mastra, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('analyze-data', { totalSymbols: inputData.metadata.totalSymbols });

    await writer?.write({
      type: 'step-start',
      stepId: 'analyze-data',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.AGENT_RUN,
      name: 'stock-analysis',
      input: { symbols: inputData.metadata.symbols },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 20,
        message: 'Analyzing stock data...',
      });

      const sortedByChange = [...inputData.stocks].sort((a, b) => 
        (b.price.changePercent ?? 0) - (a.price.changePercent ?? 0)
      );

      const topPerformers = sortedByChange.slice(0, 3).map(s => s.symbol);
      const worstPerformers = sortedByChange.slice(-3).reverse().map(s => s.symbol);

      const bullishStocks = inputData.stocks
        .filter(s => s.sentiment.overallSentiment === 'bullish' || (s.price.changePercent ?? 0) > 2)
        .map(s => s.symbol);

      const bearishStocks = inputData.stocks
        .filter(s => s.sentiment.overallSentiment === 'bearish' || (s.price.changePercent ?? 0) < -2)
        .map(s => s.symbol);

      const averageChange = inputData.stocks.reduce((sum, s) => sum + (s.price.changePercent ?? 0), 0) / inputData.stocks.length;
      const marketTrend: 'bullish' | 'bearish' | 'neutral' = 
        averageChange > 1 ? 'bullish' : averageChange < -1 ? 'bearish' : 'neutral';

      await writer?.write({
        type: 'progress',
        percent: 60,
        message: 'Generating recommendations...',
      });

      const agent = mastra?.getAgent('stockAnalysisAgent');
      let recommendations: z.infer<typeof analysisResultSchema>['analysis']['recommendations'] = [];

      if (agent) {
        const analysisPrompt = `Analyze these stocks and provide buy/hold/sell recommendations:
        ${inputData.stocks.map(s => 
          `${s.symbol}: Price $${s.price.currentPrice}, Change ${s.price.changePercent}%, P/E ${s.metrics.peRatio}, Sentiment ${s.sentiment.overallSentiment}`
        ).join('\n')}`;

        const response = await agent.generate(analysisPrompt, {
          output: z.object({
            recommendations: z.array(z.object({
              symbol: z.string(),
              action: z.enum(['buy', 'hold', 'sell']),
              reason: z.string(),
            })),
          }),
        });

        recommendations = response.object.recommendations;
      } else {
        recommendations = inputData.stocks.map(s => ({
          symbol: s.symbol,
          action: (s.price.changePercent ?? 0) > 1 ? 'hold' as const : (s.price.changePercent ?? 0) < -1 ? 'sell' as const : 'hold' as const,
          reason: `Based on ${s.price.changePercent?.toFixed(2)}% change`,
        }));
      }

      await writer?.write({
        type: 'progress',
        percent: 90,
        message: 'Analysis complete...',
      });

      const result: z.infer<typeof analysisResultSchema> = {
        stocks: inputData.stocks,
        analysis: {
          topPerformers,
          worstPerformers,
          bullishStocks,
          bearishStocks,
          averageChange,
          marketTrend,
          recommendations,
        },
        metadata: inputData.metadata,
      };

      span?.end({
        output: { marketTrend, recommendationsCount: recommendations.length },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'analyze-data',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('analyze-data', { marketTrend, recommendationsCount: recommendations.length }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('analyze-data', error);

      await writer?.write({
        type: 'step-error',
        stepId: 'analyze-data',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const generateReportStep = createStep({
  id: 'generate-report',
  description: 'Generates comprehensive financial report using reportAgent',
  inputSchema: analysisResultSchema,
  outputSchema: finalReportSchema,
  execute: async ({ inputData, mastra, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('generate-report', { symbols: inputData.metadata.symbols });

    await writer?.write({
      type: 'step-start',
      stepId: 'generate-report',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.AGENT_RUN,
      name: 'report-generation',
      input: { symbolsCount: inputData.metadata.totalSymbols },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 20,
        message: 'Generating financial report...',
      });

      const reportId = `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const agent = mastra?.getAgent('reportAgent');

      let summary = '';
      let report = '';

      if (agent) {
        await writer?.write({
          type: 'progress',
          percent: 50,
          message: 'AI generating comprehensive report...',
        });

        const prompt = `Generate a ${inputData.metadata.reportType} financial report:

Market Overview:
- Trend: ${inputData.analysis.marketTrend}
- Average Change: ${inputData.analysis.averageChange.toFixed(2)}%

Top Performers: ${inputData.analysis.topPerformers.join(', ')}
Underperformers: ${inputData.analysis.worstPerformers.join(', ')}

Stock Details:
${inputData.stocks.map(s => 
  `${s.symbol}: $${s.price.currentPrice} (${s.price.changePercent?.toFixed(2)}%), P/E: ${s.metrics.peRatio?.toFixed(2)}`
).join('\n')}

Recommendations:
${inputData.analysis.recommendations.map(r => `${r.symbol}: ${r.action} - ${r.reason}`).join('\n')}

Provide a concise summary and detailed report.`;

        const response = await agent.generate(prompt, {
          output: z.object({
            summary: z.string(),
            report: z.string(),
          }),
        });

        summary = response.object.summary;
        report = response.object.report;
      } else {
        summary = `${inputData.metadata.reportType.charAt(0).toUpperCase() + inputData.metadata.reportType.slice(1)} Report: Market ${inputData.analysis.marketTrend} with ${inputData.analysis.averageChange.toFixed(2)}% average change. Top: ${inputData.analysis.topPerformers.join(', ')}.`;
        
        report = `# Financial Report\n\n## Market Overview\n\nTrend: ${inputData.analysis.marketTrend}\nAverage Change: ${inputData.analysis.averageChange.toFixed(2)}%\n\n## Stock Analysis\n\n${
          inputData.stocks.map(s => 
            `### ${s.symbol}\n- Price: $${s.price.currentPrice}\n- Change: ${s.price.changePercent?.toFixed(2)}%`
          ).join('\n\n')
        }\n\n## Recommendations\n\n${inputData.analysis.recommendations.map(r => `- **${r.symbol}**: ${r.action.toUpperCase()} - ${r.reason}`).join('\n')}`;
      }

      await writer?.write({
        type: 'progress',
        percent: 90,
        message: 'Report complete...',
      });

      const result: z.infer<typeof finalReportSchema> = {
        reportId,
        generatedAt: new Date().toISOString(),
        summary,
        report,
        data: {
          stocks: inputData.stocks,
          analysis: inputData.analysis,
        },
        metadata: {
          symbols: inputData.metadata.symbols,
          reportType: inputData.metadata.reportType,
          totalSymbols: inputData.metadata.totalSymbols,
        },
      };

      span?.end({
        output: { reportId, summaryLength: summary.length },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'generate-report',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('generate-report', { reportId }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('generate-report', error);

      await writer?.write({
        type: 'step-error',
        stepId: 'generate-report',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const parallelMergeStep = createStep({
  id: 'parallel-merge',
  description: 'Merges results from parallel steps',
  inputSchema: z.object({
    'fetch-price-data': z.object({
      priceData: z.array(priceDataSchema),
      metadata: z.object({
        symbols: z.array(z.string()),
        reportType: z.string(),
        includeNews: z.boolean(),
        includeTechnicals: z.boolean(),
      }),
    }),
    'fetch-company-metrics': z.object({
      companyMetrics: z.array(companyMetricsSchema),
      metadata: z.object({
        symbols: z.array(z.string()),
        reportType: z.string(),
        includeNews: z.boolean(),
        includeTechnicals: z.boolean(),
      }),
    }),
    'fetch-news-sentiment': z.object({
      newsSentiment: z.array(newsSentimentSchema),
      metadata: z.object({
        symbols: z.array(z.string()),
        reportType: z.string(),
        includeNews: z.boolean(),
        includeTechnicals: z.boolean(),
      }),
    }),
  }),
  outputSchema: parallelResultsSchema,
  execute: async ({ inputData, writer }) => {
    const startTime = Date.now();

    await writer?.write({
      type: 'step-start',
      stepId: 'parallel-merge',
      timestamp: Date.now(),
    });

    const priceResult = inputData['fetch-price-data'];
    const metricsResult = inputData['fetch-company-metrics'];
    const newsResult = inputData['fetch-news-sentiment'];

    const result: z.infer<typeof parallelResultsSchema> = {
      priceData: priceResult.priceData,
      companyMetrics: metricsResult.companyMetrics,
      newsSentiment: newsResult.newsSentiment,
      metadata: {
        symbols: priceResult.metadata.symbols,
        reportType: priceResult.metadata.reportType,
        includeNews: priceResult.metadata.includeNews,
        includeTechnicals: priceResult.metadata.includeTechnicals,
        fetchedAt: new Date().toISOString(),
      },
    };

    await writer?.write({
      type: 'step-complete',
      stepId: 'parallel-merge',
      success: true,
      duration: Date.now() - startTime,
    });

    return result;
  },
});

export const financialReportWorkflow = createWorkflow({
  id: 'financial-report-workflow',
  description: 'Comprehensive multi-source financial reports using .parallel() for concurrent data fetching',
  inputSchema: financialInputSchema,
  outputSchema: finalReportSchema,
})
  .parallel([fetchPriceDataStep, fetchCompanyMetricsStep, fetchNewsSentimentStep])
  .then(parallelMergeStep)
  .then(mergeDataStep)
  .then(analyzeDataStep)
  .then(generateReportStep);

financialReportWorkflow.commit();
