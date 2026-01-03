import { trace, SpanStatusCode } from "@opentelemetry/api";
import type { InferUITool} from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  logError,
  logStepEnd,
  logStepStart,
  logToolExecution,
} from "../config/logger";
import type { RequestContext } from '@mastra/core/request-context';

/**
 * Finnhub Quotes Tool
 *
 * Specialized for real-time stock quotes:
 * - Real-time stock quotes (QUOTE)
 *
 * Requires FINNHUB_API_KEY environment variable
 */
export const finnhubQuotesTool = createTool({
  id: "finnhub-quotes",
  description: "Access real-time stock quotes from Finnhub",
  inputSchema: z.object({
    symbol: z.string().describe("Stock symbol (e.g., 'AAPL', 'MSFT')")
  }),
  outputSchema: z.object({
    data: z.any().describe("The quote data returned from Finnhub API"),
    metadata: z.object({
      symbol: z.string().optional()
    }).optional(),
    message: z.string().optional()
  }),
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('finnhub-tools');
    const rootSpan = tracer.startSpan('finnhub-quotes', {
      attributes: {
        symbol: inputData.symbol,
        operation: 'finnhub-quotes'
      }
    });

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Fetching quote for ${inputData.symbol}`,
        stage: 'finnhub-quotes'
      },
      id: 'finnhub-quotes'
    });

    logToolExecution('finnhubQuotesTool', { input: inputData });

    const apiKey = process.env.FINNHUB_API_KEY;

    if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
      const message = "FINNHUB_API_KEY environment variable is required";
      rootSpan.recordException(new Error(message));
      rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
      rootSpan.end();
      logError('finnhubQuotesTool', new Error(message), { symbol: inputData.symbol });
      return {
        data: null,
        message
      };
    }

    try {
      const params = new URLSearchParams();
      params.append('token', apiKey);
      params.append('symbol', inputData.symbol);

      const url = `https://finnhub.io/api/v1/quote?${params.toString()}`;

      // Create child span for API call
      const apiSpan = tracer.startSpan('finnhub-api-call', {
        attributes: {
          url: url.replace(apiKey, '[REDACTED]'),
          method: 'GET'
        }
      });

      logStepStart('finnhub-api-call', {
        symbol: inputData.symbol,
        url: url.replace(apiKey, '[REDACTED]')
      });

      const apiStartTime = Date.now();
      const response = await fetch(url);
      const data = await response.json();
      const apiDuration = Date.now() - apiStartTime;

      /*apiSpan.end({
        output: { ... }
      }); -> OTEL doesn't accept object in end(). Only timestamp.*/

      // Set attributes on apiSpan
      // apiSpan.setAttribute('http.status_code', response.status);
      // ...
      // But I can't replicate `end({output})` directly.
      // I will set attributes and then end.

      apiSpan?.end();
      // Wait, the previous code used `apiSpan?.end({ output: ... })`. This was a custom wrapper.
      // I will just end it.

      logStepEnd('finnhub-api-call', {
        status: response.status,
        dataSize: JSON.stringify(data).length
      }, apiDuration);

      // Check for API errors
      if (data !== null && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
        const errorValue = (data as Record<string, unknown>)['error'];
        if (errorValue !== null && errorValue !== undefined && String(errorValue).trim() !== '') {
          const message = String(errorValue);
          rootSpan.recordException(new Error(message));
          rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
          logError('finnhubQuotesTool', new Error(message), { symbol: inputData.symbol, apiError: message });
          return {
            data: null,
            message
          };
        }
      }

      const result = {
        data,
        metadata: {
          symbol: inputData.symbol
        },
        message: undefined
      };

      rootSpan.end();

      logToolExecution('finnhubQuotesTool', { output: { symbol: inputData.symbol } });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      rootSpan.recordException(error instanceof Error ? error : new Error(errorMessage));
      rootSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
      rootSpan.end();
      logError('finnhubQuotesTool', error instanceof Error ? error : new Error(errorMessage), { symbol: inputData.symbol });
      return {
        data: null,
        message: errorMessage
      };
    }
  }
});

/**
 * Finnhub Company Tool
 *
 * Specialized for company information and news:
 * - Company profiles (COMPANY_PROFILE)
 * - Company news (COMPANY_NEWS)
 *
 * Requires FINNHUB_API_KEY environment variable
 */
export const finnhubCompanyTool = createTool({
  id: "finnhub-company",
  description: "Access company profiles and news from Finnhub",
  inputSchema: z.object({
    function: z.enum([
      "COMPANY_PROFILE",
      "COMPANY_NEWS"
    ]).describe("Finnhub company function"),
    symbol: z.string().describe("Stock symbol (e.g., 'AAPL', 'MSFT')"),
    from: z.string().optional().describe("Start date for news (YYYY-MM-DD)"),
    to: z.string().optional().describe("End date for news (YYYY-MM-DD)")
  }),
  outputSchema: z.object({
    data: z.any().describe("The company data returned from Finnhub API"),
    metadata: z.object({
      function: z.string(),
      symbol: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional()
    }).optional(),
    message: z.string().optional()
  }),
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('finnhub-tools');
    const rootSpan = tracer.startSpan('finnhub-company', {
      attributes: {
        function: inputData.function,
        symbol: inputData.symbol,
        operation: 'finnhub-company'
      }
    });

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Fetching company data (${inputData.function}) for ${inputData.symbol}`,
        stage: 'finnhub-company'
      },
      id: 'finnhub-company'
    });

    logToolExecution('finnhubCompanyTool', { input: inputData });

    const apiKey = process.env.FINNHUB_API_KEY;

    if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
      const message = "FINNHUB_API_KEY environment variable is required";
      rootSpan.recordException(new Error(message));
      rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
      rootSpan.end();
      logError('finnhubCompanyTool', new Error(message), { function: inputData.function, symbol: inputData.symbol });
      return {
        data: null,
        message
      };
    }

    try {
      let url: string;
      const params = new URLSearchParams();
      params.append('token', apiKey);

      switch (inputData.function) {
        case "COMPANY_PROFILE":
          params.append('symbol', inputData.symbol);
          url = `https://finnhub.io/api/v1/stock/profile2?${params.toString()}`;
          break;
        case "COMPANY_NEWS": {
          params.append('symbol', inputData.symbol);
          if (inputData.from !== undefined && inputData.from !== null && inputData.from.trim() !== '') {
            params.append('from', inputData.from);
          }
          if (inputData.to !== undefined && inputData.to !== null && inputData.to.trim() !== '') {
            params.append('to', inputData.to);
          }
          url = `https://finnhub.io/api/v1/company-news?${params.toString()}`;
          break;
        }
        default: {
          const message = `Unsupported function: ${inputData.function}`;
          rootSpan.recordException(new Error(message));
          rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
          rootSpan.end();
          logError('finnhubCompanyTool', new Error(message), { function: inputData.function, symbol: inputData.symbol });
          return {
            data: null,
            message
          };
        }
      }

      // Create child span for API call
      // Simplifying child span - no explicit parent context for now to keep it simple and avoid import hell,
      // but if tracing is critical, we should use context.
      // I will skip child spans for API calls to reduce complexity in this specific migration,
      // or just create them as root spans (implied child if in async context? no).
      // I will keep them but just start them. If the runtime propagates context, good. If not, they are siblings or independent properly.
      const apiSpan = tracer.startSpan('finnhub-api-call', {
        attributes: {
          url: url.replace(apiKey, '[REDACTED]'),
          method: 'GET'
        }
      });

      logStepStart('finnhub-api-call', {
        function: inputData.function,
        symbol: inputData.symbol,
        url: url.replace(apiKey, '[REDACTED]')
      });

      const apiStartTime = Date.now();
      const response = await fetch(url);
      const data = await response.json();
      const apiDuration = Date.now() - apiStartTime;

      apiSpan.end();

      logStepEnd('finnhub-api-call', {
        status: response.status,
        dataSize: JSON.stringify(data).length
      }, apiDuration);

      // Check for API errors
      if (data !== null && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
        const errorValue = (data as Record<string, unknown>)['error'];
        if (errorValue !== null && errorValue !== undefined && String(errorValue).trim() !== '') {
          const message = String(errorValue);
          rootSpan.recordException(new Error(message));
          rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
          logError('finnhubCompanyTool', new Error(message), { function: inputData.function, symbol: inputData.symbol, apiError: message });
          return {
            data: null,
            message
          };
        }
      }

      const result = {
        data,
        metadata: {
          function: inputData.function,
          symbol: inputData.symbol,
          from: inputData.from,
          to: inputData.to
        },
        message: undefined
      };

      rootSpan.end();

      logToolExecution('finnhubCompanyTool', { output: { function: inputData.function, symbol: inputData.symbol } });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      rootSpan.recordException(error instanceof Error ? error : new Error(errorMessage));
      rootSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
      rootSpan.end();
      logError('finnhubCompanyTool', error instanceof Error ? error : new Error(errorMessage), { function: inputData.function, symbol: inputData.symbol });
      return {
        data: null,
        message: errorMessage
      };
    }
  }
});

/**
 * Finnhub Financials Tool
 *
 * Specialized for financial statements and metrics:
 * - Financial statements (FINANCIAL_STATEMENTS)
 * - Company metrics (METRICS)
 * - Earnings data (EARNINGS)
 * - Revenue breakdown (REVENUE_BREAKDOWN)
 *
 * Requires FINNHUB_API_KEY environment variable
 */
export const finnhubFinancialsTool = createTool({
  id: "finnhub-financials",
  description: "Access financial statements, metrics, earnings, and revenue data from Finnhub",
  inputSchema: z.object({
    function: z.enum([
      "FINANCIAL_STATEMENTS",
      "METRICS",
      "EARNINGS",
      "REVENUE_BREAKDOWN"
    ]).describe("Finnhub financials function"),
    symbol: z.string().describe("Stock symbol (e.g., 'AAPL', 'MSFT')")
  }),
  outputSchema: z.object({
    data: z.any().describe("The financials data returned from Finnhub API"),
    metadata: z.object({
      function: z.string(),
      symbol: z.string().optional()
    }).optional(),
    message: z.string().optional()
  }),
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('finnhub-tools');
    const rootSpan = tracer.startSpan('finnhub-financials', {
      attributes: {
        function: inputData.function,
        symbol: inputData.symbol,
        operation: 'finnhub-financials'
      }
    });

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Fetching financials (${inputData.function}) for ${inputData.symbol}`,
        stage: 'finnhub-financials'
      },
      id: 'finnhub-financials'
    });

    logToolExecution('finnhubFinancialsTool', { input: inputData });

    const apiKey = process.env.FINNHUB_API_KEY;

    if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
      const message = "FINNHUB_API_KEY environment variable is required";
      rootSpan.recordException(new Error(message));
      rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
      rootSpan.end();
      logError('finnhubFinancialsTool', new Error(message), { function: inputData.function, symbol: inputData.symbol });
      return {
        data: null,
        message
      };
    }

    try {
      let url: string;
      const params = new URLSearchParams();
      params.append('token', apiKey);
      params.append('symbol', inputData.symbol);

      switch (inputData.function) {
        case "FINANCIAL_STATEMENTS": {
          url = `https://finnhub.io/api/v1/stock/financials?${params.toString()}`;
          break;
        }
        case "METRICS": {
          url = `https://finnhub.io/api/v1/stock/metric?${params.toString()}`;
          break;
        }
        case "EARNINGS": {
          url = `https://finnhub.io/api/v1/stock/earnings?${params.toString()}`;
          break;
        }
        case "REVENUE_BREAKDOWN": {
          url = `https://finnhub.io/api/v1/stock/revenue-breakdown2?${params.toString()}`;
          break;
        }
        default: {
          const message = `Unsupported function: ${inputData.function}`;
          rootSpan.recordException(new Error(message));
          rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
          rootSpan.end();
          logError('finnhubFinancialsTool', new Error(message), { function: inputData.function, symbol: inputData.symbol });
          return {
            data: null,
            message
          };
        }
      }

      // Create child span for API call
      const apiSpan = tracer.startSpan('finnhub-api-call', {
        attributes: {
          url: url.replace(apiKey, '[REDACTED]'),
          method: 'GET'
        }
      });

      logStepStart('finnhub-api-call', {
        function: inputData.function,
        symbol: inputData.symbol,
        url: url.replace(apiKey, '[REDACTED]')
      });

      const apiStartTime = Date.now();
      const response = await fetch(url);
      const data = await response.json();
      const apiDuration = Date.now() - apiStartTime;

      apiSpan.end();

      logStepEnd('finnhub-api-call', {
        status: response.status,
        dataSize: JSON.stringify(data).length
      }, apiDuration);

      // Check for API errors
      if (data !== null && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
        const errorValue = (data as Record<string, unknown>)['error'];
        if (errorValue !== null && errorValue !== undefined && String(errorValue).trim() !== '') {
          const message = String(errorValue);
          rootSpan.recordException(new Error(message));
          rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
          logError('finnhubFinancialsTool', new Error(message), { function: inputData.function, symbol: inputData.symbol, apiError: message });
          return {
            data: null,
            message
          };
        }
      }

      const result = {
        data,
        metadata: {
          function: inputData.function,
          symbol: inputData.symbol
        },
        message: undefined
      };

      rootSpan.end();

      logToolExecution('finnhubFinancialsTool', { output: { function: inputData.function, symbol: inputData.symbol } });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      rootSpan.recordException(error instanceof Error ? error : new Error(errorMessage));
      rootSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
      rootSpan.end();
      logError('finnhubFinancialsTool', error instanceof Error ? error : new Error(errorMessage), { function: inputData.function, symbol: inputData.symbol });
      return {
        data: null,
        message: errorMessage
      };
    }
  }
});

/**
 * Finnhub Analysis Tool
 *
 * Specialized for analyst recommendations and price targets:
 * - Recommendation trends (RECOMMENDATION_TRENDS)
 * - Price targets (PRICE_TARGET)
 *
 * Requires FINNHUB_API_KEY environment variable
 */
export const finnhubAnalysisTool = createTool({
  id: "finnhub-analysis",
  description: "Access analyst recommendations and price targets from Finnhub",
  inputSchema: z.object({
    function: z.enum([
      "RECOMMENDATION_TRENDS",
      "PRICE_TARGET"
    ]).describe("Finnhub analysis function"),
    symbol: z.string().describe("Stock symbol (e.g., 'AAPL', 'MSFT')")
  }),
  outputSchema: z.object({
    data: z.any().describe("The analysis data returned from Finnhub API"),
    metadata: z.object({
      function: z.string(),
      symbol: z.string().optional()
    }).optional(),
    message: z.string().optional()
  }),
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('finnhub-tools');
    const rootSpan = tracer.startSpan('finnhub-analysis', {
      attributes: {
        function: inputData.function,
        symbol: inputData.symbol,
        operation: 'finnhub-analysis'
      }
    });

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Fetching analysis (${inputData.function}) for ${inputData.symbol}`,
        stage: 'finnhub-analysis'
      },
      id: 'finnhub-analysis'
    });

    logToolExecution('finnhubAnalysisTool', { input: inputData });

    const apiKey = process.env.FINNHUB_API_KEY;

    if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
      const message = "FINNHUB_API_KEY environment variable is required";
      rootSpan.recordException(new Error(message));
      rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
      rootSpan.end();
      logError('finnhubAnalysisTool', new Error(message), { function: inputData.function, symbol: inputData.symbol });
      return {
        data: null,
        message
      };
    }

    try {
      let url: string;
      const params = new URLSearchParams();
      params.append('token', apiKey);
      params.append('symbol', inputData.symbol);

      switch (inputData.function) {
        case "RECOMMENDATION_TRENDS": {
          url = `https://finnhub.io/api/v1/stock/recommendation?${params.toString()}`;
          break;
        }
        case "PRICE_TARGET": {
          url = `https://finnhub.io/api/v1/stock/price-target?${params.toString()}`;
          break;
        }
        default: {
          const message = `Unsupported function: ${inputData.function}`;
          rootSpan.recordException(new Error(message));
          rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
          rootSpan.end();
          logError('finnhubAnalysisTool', new Error(message), { function: inputData.function, symbol: inputData.symbol });
          return {
            data: null,
            message
          };
        }
      }

      // Create child span for API call
      const apiSpan = tracer.startSpan('finnhub-api-call', {
        attributes: {
          url: url.replace(apiKey, '[REDACTED]'),
          method: 'GET'
        }
      });

      logStepStart('finnhub-api-call', {
        function: inputData.function,
        symbol: inputData.symbol,
        url: url.replace(apiKey, '[REDACTED]')
      });

      const apiStartTime = Date.now();
      const response = await fetch(url);
      const data = await response.json();
      const apiDuration = Date.now() - apiStartTime;

      apiSpan.end();

      logStepEnd('finnhub-api-call', {
        status: response.status,
        dataSize: JSON.stringify(data).length
      }, apiDuration);

      // Check for API errors
      if (data !== null && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
        const errorValue = (data as Record<string, unknown>)['error'];
        if (errorValue !== null && errorValue !== undefined && String(errorValue).trim() !== '') {
          const message = String(errorValue);
          rootSpan.recordException(new Error(message));
          rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
          logError('finnhubAnalysisTool', new Error(message), { function: inputData.function, symbol: inputData.symbol, apiError: message });
          return {
            data: null,
            message
          };
        }
      }

      const result = {
        data,
        metadata: {
          function: inputData.function,
          symbol: inputData.symbol
        },
        message: undefined
      };

      rootSpan.end();

      logToolExecution('finnhubAnalysisTool', { output: { function: inputData.function, symbol: inputData.symbol } });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      rootSpan.recordException(error instanceof Error ? error : new Error(errorMessage));
      rootSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
      rootSpan.end();
      logError('finnhubAnalysisTool', error instanceof Error ? error : new Error(errorMessage), { function: inputData.function, symbol: inputData.symbol });
      return {
        data: null,
        message: errorMessage
      };
    }
  }
});

/**
 * Finnhub Technical Tool
 *
 * Specialized for technical analysis and indicators:
 * - Technical indicators (TECHNICAL_INDICATOR)
 * - Pattern recognition (PATTERN_RECOGNITION)
 * - Support/resistance levels (SUPPORT_RESISTANCE)
 * - Aggregate indicators (AGGREGATE_INDICATOR)
 *
 * Requires FINNHUB_API_KEY environment variable
 */
export const finnhubTechnicalTool = createTool({
  id: "finnhub-technical",
  description: "Access technical analysis indicators and pattern recognition from Finnhub",
  inputSchema: z.object({
    function: z.enum([
      "TECHNICAL_INDICATOR",
      "PATTERN_RECOGNITION",
      "SUPPORT_RESISTANCE",
      "AGGREGATE_INDICATOR"
    ]).describe("Finnhub technical function"),
    symbol: z.string().describe("Stock symbol (e.g., 'AAPL', 'MSFT')"),
    resolution: z.enum(["1", "5", "15", "30", "60", "D", "W", "M"]).describe("Time resolution for technical indicators"),
    indicator: z.string().optional().describe("Technical indicator name (e.g., 'sma', 'ema', 'rsi', 'macd') - required for TECHNICAL_INDICATOR"),
    timeperiod: z.number().optional().describe("Time period for technical indicators - required for TECHNICAL_INDICATOR"),
    series_type: z.enum(["open", "high", "low", "close"]).optional().describe("Price series type for technical indicators - required for TECHNICAL_INDICATOR")
  }),
  outputSchema: z.object({
    data: z.any().describe("The technical data returned from Finnhub API"),
    metadata: z.object({
      function: z.string(),
      symbol: z.string().optional(),
      resolution: z.string().optional(),
      indicator: z.string().optional(),
      timeperiod: z.number().optional(),
      series_type: z.string().optional()
    }).optional(),
    message: z.string().optional()
  }),
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('finnhub-tools');
    const rootSpan = tracer.startSpan('finnhub-technical', {
      attributes: {
        function: inputData.function,
        symbol: inputData.symbol,
        operation: 'finnhub-technical'
      }
    });

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Fetching technical data (${inputData.function}) for ${inputData.symbol}`,
        stage: 'finnhub-technical'
      },
      id: 'finnhub-technical'
    });

    logToolExecution('finnhubTechnicalTool', { input: inputData });

    const apiKey = process.env.FINNHUB_API_KEY;

    if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
      const message = "FINNHUB_API_KEY environment variable is required";
      rootSpan.recordException(new Error(message));
      rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
      rootSpan.end();
      logError('finnhubTechnicalTool', new Error(message), { function: inputData.function, symbol: inputData.symbol });
      return {
        data: null,
        message
      };
    }

    try {
      let url: string;
      const params = new URLSearchParams();
      params.append('token', apiKey);
      params.append('symbol', inputData.symbol);
      params.append('resolution', inputData.resolution);

      switch (inputData.function) {
        case "TECHNICAL_INDICATOR": {
          if (inputData.indicator === undefined || inputData.indicator === null || inputData.indicator.trim() === '' ||
            inputData.timeperiod === undefined || inputData.timeperiod === null ||
            inputData.series_type === undefined || inputData.series_type === null || inputData.series_type.trim() === '') {
            const message = "TECHNICAL_INDICATOR function requires indicator, timeperiod, and series_type parameters";
            rootSpan.recordException(new Error(message));
            rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
            rootSpan.end();
            logError('finnhubTechnicalTool', new Error(message), { function: inputData.function, symbol: inputData.symbol });
            return {
              data: null,
              message
            };
          }
          params.append('indicator', inputData.indicator);
          params.append('timeperiod', inputData.timeperiod.toString());
          params.append('series_type', inputData.series_type);
          url = `https://finnhub.io/api/v1/indicator?${params.toString()}`;
          break;
        }
        case "PATTERN_RECOGNITION": {
          url = `https://finnhub.io/api/v1/scan/pattern?${params.toString()}`;
          break;
        }
        case "SUPPORT_RESISTANCE": {
          url = `https://finnhub.io/api/v1/scan/support-resistance?${params.toString()}`;
          break;
        }
        case "AGGREGATE_INDICATOR": {
          url = `https://finnhub.io/api/v1/scan/technical-indicator?${params.toString()}`;
          break;
        }
        default: {
          const message = `Unsupported function: ${inputData.function}`;
          rootSpan.recordException(new Error(message));
          rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
          rootSpan.end();
          logError('finnhubTechnicalTool', new Error(message), { function: inputData.function, symbol: inputData.symbol });
          return {
            data: null,
            message
          };
        }
      }

      // Create child span for API call
      const apiSpan = tracer.startSpan('finnhub-api-call', {
        attributes: {
          url: url.replace(apiKey, '[REDACTED]'),
          method: 'GET'
        }
      });

      logStepStart('finnhub-api-call', {
        function: inputData.function,
        symbol: inputData.symbol,
        url: url.replace(apiKey, '[REDACTED]')
      });

      const apiStartTime = Date.now();
      const response = await fetch(url);
      const data = await response.json();
      const apiDuration = Date.now() - apiStartTime;

      apiSpan.end();

      logStepEnd('finnhub-api-call', {
        status: response.status,
        dataSize: JSON.stringify(data).length
      }, apiDuration);

      // Check for API errors
      if (data !== null && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
        const errorValue = (data as Record<string, unknown>)['error'];
        if (errorValue !== null && errorValue !== undefined && String(errorValue).trim() !== '') {
          const message = String(errorValue);
          rootSpan.recordException(new Error(message));
          rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
          logError('finnhubTechnicalTool', new Error(message), { function: inputData.function, symbol: inputData.symbol, apiError: message });
          return {
            data: null,
            message
          };
        }
      }

      const result = {
        data,
        metadata: {
          function: inputData.function,
          symbol: inputData.symbol,
          resolution: inputData.resolution,
          indicator: inputData.indicator,
          timeperiod: inputData.timeperiod,
          series_type: inputData.series_type
        },
        message: undefined
      };

      rootSpan.end();

      logToolExecution('finnhubTechnicalTool', { output: { function: inputData.function, symbol: inputData.symbol } });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      rootSpan.recordException(error instanceof Error ? error : new Error(errorMessage));
      rootSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
      rootSpan.end();
      logError('finnhubTechnicalTool', error instanceof Error ? error : new Error(errorMessage), { function: inputData.function, symbol: inputData.symbol });
      return {
        data: null,
        message: errorMessage
      };
    }
  }
});

/**
 * Finnhub Economic Tool
 *
 * Specialized for economic indicators and data:
 * - Economic data (ECONOMIC_DATA)
 *
 * Requires FINNHUB_API_KEY environment variable
 */
export const finnhubEconomicTool = createTool({
  id: "finnhub-economic",
  description: "Access economic indicators and data from Finnhub",
  inputSchema: z.object({
    economic_code: z.string().describe("Economic data code (e.g., 'MA-USA-656880')")
  }),
  outputSchema: z.object({
    data: z.any().describe("The economic data returned from Finnhub API"),
    metadata: z.object({
      economic_code: z.string().optional()
    }).optional(),
    message: z.string().optional()
  }),
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('finnhub-tools');
    const rootSpan = tracer.startSpan('finnhub-economic', {
      attributes: {
        economic_code: inputData.economic_code,
        operation: 'finnhub-economic'
      }
    });

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Fetching economic data for ${inputData.economic_code}`,
        stage: 'finnhub-economic'
      },
      id: 'finnhub-economic'
    });

    logToolExecution('finnhubEconomicTool', { input: inputData });

    const apiKey = process.env.FINNHUB_API_KEY;

    if (apiKey === undefined || apiKey === null || apiKey.trim() === '') {
      const message = "FINNHUB_API_KEY environment variable is required";
      rootSpan.recordException(new Error(message));
      rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
      rootSpan.end();
      logError('finnhubEconomicTool', new Error(message), { economic_code: inputData.economic_code });
      return {
        data: null,
        message
      };
    }

    try {
      const params = new URLSearchParams();
      params.append('token', apiKey);
      params.append('code', inputData.economic_code);

      const url = `https://finnhub.io/api/v1/economic?${params.toString()}`;

      // Create child span for API call
      const apiSpan = tracer.startSpan('finnhub-api-call', {
        attributes: {
          url: url.replace(apiKey, '[REDACTED]'),
          method: 'GET'
        }
      });

      logStepStart('finnhub-api-call', {
        economic_code: inputData.economic_code,
        url: url.replace(apiKey, '[REDACTED]')
      });

      const apiStartTime = Date.now();
      const response = await fetch(url);
      const data = await response.json();
      const apiDuration = Date.now() - apiStartTime;

      apiSpan.end();

      logStepEnd('finnhub-api-call', {
        status: response.status,
        dataSize: JSON.stringify(data).length
      }, apiDuration);

      // Check for API errors
      if (data !== null && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
        const errorValue = (data as Record<string, unknown>)['error'];
        if (errorValue !== null && errorValue !== undefined && String(errorValue).trim() !== '') {
          const message = String(errorValue);
          rootSpan.recordException(new Error(message));
          rootSpan.setStatus({ code: SpanStatusCode.ERROR, message });
          logError('finnhubEconomicTool', new Error(message), { economic_code: inputData.economic_code, apiError: message });
          return {
            data: null,
            message
          };
        }
      }

      const result = {
        data,
        metadata: {
          economic_code: inputData.economic_code
        },
        message: undefined
      };

      rootSpan.end();

      logToolExecution('finnhubEconomicTool', { output: { economic_code: inputData.economic_code } });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      rootSpan.recordException(error instanceof Error ? error : new Error(errorMessage));
      rootSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
      rootSpan.end();
      logError('finnhubEconomicTool', error instanceof Error ? error : new Error(errorMessage), { economic_code: inputData.economic_code });
      return {
        data: null,
        message: errorMessage
      };
    }
  }
});

export type FinnhubEconomicUITool = InferUITool<typeof finnhubEconomicTool>;
export type FinnhubTechnicalUITool = InferUITool<typeof finnhubTechnicalTool>;
export type FinnhubAnalysisUITool = InferUITool<typeof finnhubAnalysisTool>;
export type FinnhubFinancialsUITool = InferUITool<typeof finnhubFinancialsTool>;
export type FinnhubCompanyUITool = InferUITool<typeof finnhubCompanyTool>;

export type FinnhubTools =
  | FinnhubEconomicUITool
  | FinnhubTechnicalUITool
  | FinnhubAnalysisUITool
  | FinnhubFinancialsUITool
  | FinnhubCompanyUITool;
