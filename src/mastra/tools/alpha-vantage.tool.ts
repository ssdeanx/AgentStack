import { SpanType } from '@mastra/core/observability'
import type { RequestContext } from '@mastra/core/request-context'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { log } from '../config/logger'

/**
 * Alpha Vantage Tools
 *
 * Specialized tools for financial market data from Alpha Vantage:
 * - Crypto Tool: Optimized for cryptocurrency data and exchange rates
 * - Stock Tool: Optimized for stock market data and analysis
 *
 * Requires ALPHA_VANTAGE_API_KEY environment variable
 */
export type UserTier = 'free' | 'pro' | 'enterprise'
/**
 * Base Request Context for Alpha Vantage
 */
export interface AlphaVantageRequestContext extends RequestContext {
  apiKey?: string
  'user-tier': UserTier
}

// In-memory counter to track tool calls per request
// Add this line at the beginning of each tool's execute function to track usage:
// toolCallCounters.set('tool-id', (toolCallCounters.get('tool-id') ?? 0) + 1)
const toolCallCounters = new Map<string, number>()
/**
 * Alpha Vantage Crypto Tool
 *
 * Specialized for cryptocurrency data including:
 * - Crypto time series data (intraday, daily, weekly, monthly)
 * - Digital currency exchange rates
 * - Crypto-to-fiat and crypto-to-crypto exchange rates
 */
export const alphaVantageCryptoTool = createTool({
  id: 'alpha-vantage-crypto',
  description:
    'Access cryptocurrency market data from Alpha Vantage including crypto prices, exchange rates, and historical data',
  inputSchema: z.object({
    function: z
      .enum([
        'CRYPTO_INTRADAY',
        'CRYPTO_DAILY',
        'CRYPTO_WEEKLY',
        'CRYPTO_MONTHLY',
        'CURRENCY_EXCHANGE_RATE',
      ])
      .describe('Crypto-specific Alpha Vantage API function'),
    symbol: z
      .string()
      .describe("Cryptocurrency symbol (e.g., 'BTC', 'ETH', 'ADA')"),
    market: z
      .string()
      .default('USD')
      .describe(
        "Quote currency for exchange rates (e.g., 'USD', 'EUR', 'BTC')"
      ),
    interval: z
      .enum(['1min', '5min', '15min', '30min', '60min'])
      .optional()
      .describe('Time interval for intraday data'),
    outputsize: z
      .enum(['compact', 'full'])
      .optional()
      .describe(
        'Amount of data to return (compact=latest 100, full=all available)'
      ),
    datatype: z
      .enum(['json', 'csv'])
      .optional()
      .describe('Response format'),
  }),
  outputSchema: z.object({
    data: z
      .any()
      .describe(
        'The cryptocurrency data returned from Alpha Vantage API'
      ),
    metadata: z
      .object({
        function: z.string(),
        symbol: z.string(),
        market: z.string().optional(),
        last_refreshed: z.string().optional(),
        interval: z.string().optional(),
        output_size: z.string().optional(),
        time_zone: z.string().optional(),
      })
      .optional(),
  }),
  execute: async (inputData, context) => {
    const requestContext = context?.requestContext as AlphaVantageRequestContext
    const tracingContext = context?.tracingContext

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: {
        message: `📈 Fetching Alpha Vantage crypto data for ${inputData.symbol}/${inputData.market}`,
        status: 'in-progress',
        stage: 'alpha-vantage-crypto',
      },
      id: 'alpha-vantage-crypto',
    })

    // Create child span for crypto data fetch
    const cryptoSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'alpha-vantage-crypto-fetch',
      input: inputData,
      metadata: {
        'tool.id': 'alpha-vantage-crypto',
        'tool.input.symbol': inputData.symbol,
        'tool.input.market': inputData.market,
        'tool.input.function': inputData.function,
      },
    })

    const apiKey = requestContext?.apiKey ?? process.env.ALPHA_VANTAGE_API_KEY

    if (typeof apiKey !== 'string' || apiKey.trim() === '') {
      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: {
          message: '❌ Missing ALPHA_VANTAGE_API_KEY',
          status: 'done',
          stage: 'alpha-vantage-crypto',
        },
        id: 'alpha-vantage-crypto',
      })
      throw new Error(
        'ALPHA_VANTAGE_API_KEY environment variable is required'
      )
    }
    toolCallCounters.set(
      'alpha-vantage-crypto',
      (toolCallCounters.get('alpha-vantage-crypto') ?? 0) + 1
    )
    try {
      const params = new URLSearchParams({
        apikey: apiKey,
        function: inputData.function,
        symbol: inputData.symbol,
        market: inputData.market,
      })

      // Add optional parameters
      if (inputData.interval !== undefined) {
        params.append('interval', inputData.interval)
      }
      if (inputData.outputsize !== undefined) {
        params.append('outputsize', inputData.outputsize)
      }
      if (inputData.datatype !== undefined) {
        params.append('datatype', inputData.datatype)
      }

      const url = `https://www.alphavantage.co/query?${params.toString()}`

      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: {
          message: '📡 Querying Alpha Vantage API...',
          status: 'in-progress',
          stage: 'alpha-vantage-crypto',
        },
        id: 'alpha-vantage-crypto',
      })
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(
          `Alpha Vantage API error: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()

      const dataObj = data as unknown

      // Check for API-specific errors
      if (
        Boolean(dataObj) &&
        typeof dataObj === 'object' &&
        dataObj !== null &&
        'Error Message' in (dataObj as Record<string, unknown>)
      ) {
        const errorMessage = (dataObj as Record<string, unknown>)[
          'Error Message'
        ]
        if (
          errorMessage !== null &&
          errorMessage !== undefined &&
          String(errorMessage).trim() !== ''
        ) {
          throw new Error(String(errorMessage))
        }
      }

      if (
        Boolean(dataObj) &&
        typeof dataObj === 'object' &&
        dataObj !== null &&
        'Note' in (dataObj as Record<string, unknown>)
      ) {
        const note = (dataObj as Record<string, unknown>)['Note']
        if (
          note !== null &&
          note !== undefined &&
          String(note).trim() !== ''
        ) {
          throw new Error(String(note)) // API limit reached
        }
      }

      // Extract metadata if available
      let metadata: unknown = null
      if (
        Boolean(dataObj) &&
        typeof dataObj === 'object' &&
        dataObj !== null
      ) {
        const dataRecord = dataObj as Record<string, unknown>
        if ('Meta Data' in dataRecord) {
          metadata = dataRecord['Meta Data']
        } else if ('meta' in dataRecord) {
          metadata = dataRecord['meta']
        }
      }

      const metadataObj = metadata

      // Helper function to safely extract metadata values
      const getMetadataValue = (key: string): string | null => {
        if (
          Boolean(metadataObj) &&
          typeof metadataObj === 'object' &&
          metadataObj !== null
        ) {
          const metaRecord = metadataObj as Record<string, unknown>
          if (key in metaRecord) {
            const value = metaRecord[key]
            return value !== null && value !== undefined
              ? String(value)
              : null
          }
        }
        return null
      }

      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: {
          message: `✅ Crypto data ready for ${inputData.symbol}`,
          status: 'done',
          stage: 'alpha-vantage-crypto',
        },
        id: 'alpha-vantage-crypto',
      })
      const result = {
        data,
        metadata: {
          function:
            getMetadataValue('1. Information') ??
            inputData.function,
          symbol: getMetadataValue('2. Symbol') ?? inputData.symbol,
          market: getMetadataValue('3. Market') ?? inputData.market,
          last_refreshed:
            getMetadataValue('4. Last Refreshed') ?? undefined,
          interval: getMetadataValue('5. Interval') ?? undefined,
          output_size:
            getMetadataValue('6. Output Size') ?? undefined,
          time_zone: getMetadataValue('7. Time Zone') ?? undefined,
        },
      }
      cryptoSpan?.end()
      return result
    } catch (error) {
      const errMsg =
        error instanceof Error
          ? error.message
          : 'Unknown error occurred'
      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: {
          message: `❌ Crypto fetch error: ${errMsg}`,
          status: 'done',
          stage: 'alpha-vantage-crypto',
        },
        id: 'alpha-vantage-crypto',
      })
      if (error instanceof Error) {
        cryptoSpan?.error({
          error,
          endSpan: true,
        })
      }
      throw error instanceof Error ? error : new Error(errMsg)
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Alpha Vantage tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
    log.info('Alpha Vantage tool received input chunk', {
      toolCallId,
      inputTextDelta,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputDelta',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Alpha Vantage crypto received input', {
      toolCallId,
      messageCount: messages.length,
      symbol: input.symbol,
      market: input.market,
      function: input.function,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    const dataKeys = (output.data !== null && typeof output.data === 'object') ? Object.keys(output.data as object).length : 0
    log.info('Alpha Vantage crypto completed', {
      toolCallId,
      toolName,
      symbol: output.metadata?.symbol ?? 'unknown',
      dataKeys,
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput',
    })
  },
})

/**
 * Alpha Vantage Stock Tool
 *
 * Specialized for stock market data including:
 * - Stock time series data (intraday, daily, weekly, monthly)
 * - Real-time quotes
 * - Symbol search
 * - Technical indicators
 * - Fundamental data
 */
export const alphaVantageStockTool = createTool({
  id: 'alpha-vantage-stock',
  description:
    'Access stock market data from Alpha Vantage including stock prices, quotes, technical indicators, and fundamental data',
  inputSchema: z.object({
    function: z
      .enum([
        'TIME_SERIES_INTRADAY',
        'TIME_SERIES_DAILY',
        'TIME_SERIES_DAILY_ADJUSTED',
        'TIME_SERIES_WEEKLY',
        'TIME_SERIES_MONTHLY',
        'GLOBAL_QUOTE',
        'SYMBOL_SEARCH',
        'SMA',
        'EMA',
        'RSI',
        'MACD',
        'STOCH',
        'BBANDS',
        'ADX',
        'CCI',
      ])
      .describe('Stock-specific Alpha Vantage API function'),
    symbol: z
      .string()
      .describe("Stock symbol (e.g., 'IBM', 'AAPL', 'GOOGL')"),
    interval: z
      .enum(['1min', '5min', '15min', '30min', '60min'])
      .optional()
      .describe('Time interval for intraday data'),
    outputsize: z
      .enum(['compact', 'full'])
      .optional()
      .describe(
        'Amount of data to return (compact=latest 100, full=all available)'
      ),
    datatype: z
      .enum(['json', 'csv'])
      .optional()
      .describe('Response format'),
    // Technical indicator parameters
    indicator: z
      .string()
      .optional()
      .describe(
        "Technical indicator name (e.g., 'SMA', 'EMA', 'RSI', 'MACD')"
      ),
    time_period: z
      .number()
      .optional()
      .describe('Time period for technical indicators'),
    series_type: z
      .enum(['close', 'open', 'high', 'low'])
      .optional()
      .describe('Price series type for technical indicators'),
  }),
  outputSchema: z.object({
    data: z
      .any()
      .describe('The stock data returned from Alpha Vantage API'),
    metadata: z
      .object({
        function: z.string(),
        symbol: z.string().optional(),
        last_refreshed: z.string().optional(),
        interval: z.string().optional(),
        output_size: z.string().optional(),
        time_zone: z.string().optional(),
        indicator: z.string().optional(),
        time_period: z.string().optional(),
        series_type: z.string().optional(),
      })
      .optional(),
  }),

  execute: async (inputData, context) => {
    const requestContext = context?.requestContext as AlphaVantageRequestContext
    const tracingContext = context?.tracingContext

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: {
        message: `📈 Fetching Alpha Vantage stock data for ${inputData.symbol || 'symbol'}`,
        status: 'in-progress',
        stage: 'alpha-vantage-stock',
      },
      id: 'alpha-vantage-stock',
    })

    // Create child span for stock data fetch
    const stockSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'alpha-vantage-stock-fetch',
      input: inputData,
      metadata: {
        'tool.id': 'alpha-vantage-stock',
        'tool.input.symbol': inputData.symbol,
        'tool.input.function': inputData.function,
      },
    })

    const apiKey = requestContext?.apiKey ?? process.env.ALPHA_VANTAGE_API_KEY

    if (typeof apiKey !== 'string' || apiKey.trim() === '') {
      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: {
          message: '❌ Missing ALPHA_VANTAGE_API_KEY',
          status: 'done',
          stage: 'alpha-vantage-stock',
        },
        id: 'alpha-vantage-stock',
      })
      throw new Error(
        'ALPHA_VANTAGE_API_KEY environment variable is required'
      )
    }
    toolCallCounters.set(
      'alpha-vantage-stock',
      (toolCallCounters.get('alpha-vantage-stock') ?? 0) + 1
    )
    try {
      const params = new URLSearchParams({
        apikey: apiKey,
        function: inputData.function,
      })

      // Add required symbol parameter
      if (inputData.symbol) {
        params.append('symbol', inputData.symbol)
      }

      // Add optional parameters
      if (inputData.interval !== undefined) {
        params.append('interval', inputData.interval)
      }
      if (inputData.outputsize !== undefined) {
        params.append('outputsize', inputData.outputsize)
      }
      if (inputData.datatype !== undefined) {
        params.append('datatype', inputData.datatype)
      }

      // Technical indicator parameters
      if (
        inputData.indicator !== undefined &&
        inputData.indicator !== null
      ) {
        params.append('indicator', inputData.indicator)
      }
      if (
        inputData.time_period !== undefined &&
        inputData.time_period !== null
      ) {
        params.append('time_period', inputData.time_period.toString())
      }
      if (inputData.series_type !== undefined) {
        params.append('series_type', inputData.series_type)
      }

      const url = `https://www.alphavantage.co/query?${params.toString()}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(
          `Alpha Vantage API error: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()

      const dataObj = data as unknown

      // Check for API-specific errors
      if (
        Boolean(dataObj) &&
        typeof dataObj === 'object' &&
        dataObj !== null &&
        'Error Message' in (dataObj as Record<string, unknown>)
      ) {
        const errorMessage = (dataObj as Record<string, unknown>)[
          'Error Message'
        ]
        if (
          errorMessage !== null &&
          errorMessage !== undefined &&
          String(errorMessage).trim() !== ''
        ) {
          throw new Error(String(errorMessage))
        }
      }

      if (
        Boolean(dataObj) &&
        typeof dataObj === 'object' &&
        dataObj !== null &&
        'Note' in (dataObj as Record<string, unknown>)
      ) {
        const note = (dataObj as Record<string, unknown>)['Note']
        if (
          note !== null &&
          note !== undefined &&
          String(note).trim() !== ''
        ) {
          throw new Error(String(note)) // API limit reached
        }
      }

      // Extract metadata if available
      const metadata =
        (Boolean(dataObj) &&
          typeof dataObj === 'object' &&
          dataObj !== null &&
          'Meta Data' in dataObj
          ? (dataObj as Record<string, unknown>)['Meta Data']
          : null) ??
        (Boolean(dataObj) &&
          typeof dataObj === 'object' &&
          dataObj !== null &&
          'meta' in dataObj
          ? (dataObj as Record<string, unknown>)['meta']
          : null) ??
        {}

      const metadataObj = metadata as unknown

      const result = {
        data,
        metadata: {
          function:
            (Boolean(metadataObj) &&
              typeof metadataObj === 'object' &&
              metadataObj !== null &&
              '1. Information' in metadataObj
              ? String(
                (metadataObj as Record<string, unknown>)[
                '1. Information'
                ]
              )
              : null) ?? inputData.function,
          symbol:
            (Boolean(metadataObj) &&
              typeof metadataObj === 'object' &&
              metadataObj !== null &&
              '2. Symbol' in metadataObj
              ? String(
                (metadataObj as Record<string, unknown>)[
                '2. Symbol'
                ]
              )
              : null) ?? inputData.symbol,
          last_refreshed:
            Boolean(metadataObj) &&
              typeof metadataObj === 'object' &&
              metadataObj !== null &&
              '3. Last Refreshed' in metadataObj
              ? String(
                (metadataObj as Record<string, unknown>)[
                '3. Last Refreshed'
                ]
              )
              : undefined,
          interval:
            Boolean(metadataObj) &&
              typeof metadataObj === 'object' &&
              metadataObj !== null &&
              '4. Interval' in metadataObj
              ? String(
                (metadataObj as Record<string, unknown>)[
                '4. Interval'
                ]
              )
              : undefined,
          output_size:
            Boolean(metadataObj) &&
              typeof metadataObj === 'object' &&
              metadataObj !== null &&
              '5. Output Size' in metadataObj
              ? String(
                (metadataObj as Record<string, unknown>)[
                '5. Output Size'
                ]
              )
              : undefined,
          time_zone:
            Boolean(metadataObj) &&
              typeof metadataObj === 'object' &&
              metadataObj !== null &&
              '6. Time Zone' in metadataObj
              ? String(
                (metadataObj as Record<string, unknown>)[
                '6. Time Zone'
                ]
              )
              : undefined,
          indicator: inputData.indicator,
          time_period: inputData.time_period?.toString(),
          series_type: inputData.series_type,
        },
      }
      stockSpan?.end()
      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error occurred'
      if (error instanceof Error) {
        stockSpan?.error({
          error,
          endSpan: true,
        })
      }
      throw error instanceof Error ? error : new Error(errorMessage)
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Alpha Vantage stock tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
    log.info('Alpha Vantage stock tool received input chunk', {
      toolCallId,
      inputTextDelta,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputDelta',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Alpha Vantage stock received input', {
      toolCallId,
      messageCount: messages.length,
      symbol: input.symbol,
      function: input.function,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    const dataKeys = (output.data !== null && typeof output.data === 'object') ? Object.keys(output.data as object).length : 0
    log.info('Alpha Vantage stock completed', {
      toolCallId,
      toolName,
      symbol: output.metadata?.symbol ?? 'unknown',
      dataKeys,
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput',
    })
  },
})

/**
 * Legacy Alpha Vantage Tool (General Purpose)
 *
 * Provides access to all financial market data including:
 * - Stock time series data (intraday, daily, weekly, monthly)
 * - Forex exchange rates
 * - Cryptocurrency data
 * - Economic indicators (GDP, inflation, unemployment, etc.)
 * - Technical indicators
 * - Fundamental data
 *
 * Note: For better performance, consider using alphaVantageCryptoTool or alphaVantageStockTool
 * Requires ALPHA_VANTAGE_API_KEY environment variable
 */
export const alphaVantageTool = createTool({
  id: 'alpha-vantage',
  description:
    'Access real-time and historical financial market data from Alpha Vantage including stocks, forex, crypto, and economic indicators. For specialized use cases, consider using alphaVantageCryptoTool or alphaVantageStockTool.',
  inputSchema: z.object({
    function: z
      .enum([
        'TIME_SERIES_INTRADAY',
        'TIME_SERIES_DAILY',
        'TIME_SERIES_WEEKLY',
        'TIME_SERIES_MONTHLY',
        'GLOBAL_QUOTE',
        'SYMBOL_SEARCH',
        'CURRENCY_EXCHANGE_RATE',
        'FX_INTRADAY',
        'FX_DAILY',
        'FX_WEEKLY',
        'FX_MONTHLY',
        'CRYPTO_INTRADAY',
        'CRYPTO_DAILY',
        'CRYPTO_WEEKLY',
        'CRYPTO_MONTHLY',
        'DIGITAL_CURRENCY_DAILY',
        'DIGITAL_CURRENCY_WEEKLY',
        'DIGITAL_CURRENCY_MONTHLY',
        'ECONOMIC_INDICATORS',
        'TECHNICAL_INDICATOR',
        'FUNDAMENTAL_DATA',
      ])
      .describe('Alpha Vantage API function to call'),
    symbol: z
      .string()
      .optional()
      .describe(
        "Stock symbol, currency pair (e.g., 'IBM', 'EURUSD'), or crypto symbol (e.g., 'BTC')"
      ),
    market: z
      .string()
      .optional()
      .describe(
        "Physical currency or digital/crypto currency (e.g., 'USD', 'EUR', 'BTC')"
      ),
    interval: z
      .enum(['1min', '5min', '15min', '30min', '60min'])
      .optional()
      .describe('Time interval for intraday data'),
    outputsize: z
      .enum(['compact', 'full'])
      .optional()
      .describe(
        'Amount of data to return (compact=latest 100, full=all available)'
      ),
    datatype: z
      .enum(['json', 'csv'])
      .optional()
      .describe('Response format'),
    indicator: z
      .string()
      .optional()
      .describe(
        "Technical indicator name (e.g., 'SMA', 'EMA', 'RSI', 'MACD')"
      ),
    time_period: z
      .number()
      .optional()
      .describe('Time period for technical indicators'),
    series_type: z
      .enum(['close', 'open', 'high', 'low'])
      .optional()
      .describe('Price series type for technical indicators'),
    economic_indicator: z
      .enum([
        'REAL_GDP',
        'REAL_GDP_PER_CAPITA',
        'TREASURY_YIELD',
        'FEDERAL_FUNDS_RATE',
        'CPI',
        'INFLATION',
        'INFLATION_EXPECTATION',
        'CONSUMER_SENTIMENT',
        'RETAIL_SALES',
        'DURABLES',
        'UNEMPLOYMENT',
        'NONFARM_PAYROLL',
      ])
      .optional()
      .describe('Economic indicator to retrieve'),
  }),
  outputSchema: z.object({
    data: z
      .any()
      .describe('The financial data returned from Alpha Vantage API'),
    metadata: z
      .object({
        function: z.string(),
        symbol: z.string().optional(),
        last_refreshed: z.string().optional(),
        interval: z.string().optional(),
        output_size: z.string().optional(),
        time_zone: z.string().optional(),
      })
      .optional(),
  }),
  execute: async (inputData, context) => {
    const requestContext = context?.requestContext as AlphaVantageRequestContext
    const tracingContext = context?.tracingContext

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: {
        message: `💰 Fetching general Alpha Vantage data for ${inputData.function}`,
        status: 'in-progress',
        stage: 'alpha-vantage',
      },
      id: 'alpha-vantage',
    })

    // Create child span for general data fetch
    const generalSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'alpha-vantage-general-fetch',
      input: inputData,
      metadata: {
        'tool.id': 'alpha-vantage',
        'tool.input.function': inputData.function,
        'tool.input.symbol': inputData.symbol,
      },
    })

    const apiKey = requestContext?.apiKey ?? process.env.ALPHA_VANTAGE_API_KEY

    if (typeof apiKey !== 'string' || apiKey.trim() === '') {
      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: {
          message: '❌ Missing ALPHA_VANTAGE_API_KEY',
          status: 'done',
          stage: 'alpha-vantage',
        },
        id: 'alpha-vantage',
      })
      throw new Error(
        'ALPHA_VANTAGE_API_KEY environment variable is required'
      )
    }
    toolCallCounters.set(
      'alpha-vantage',
      (toolCallCounters.get('alpha-vantage') ?? 0) + 1
    )
    try {
      const params = new URLSearchParams({
        apikey: apiKey,
        function: inputData.function,
      })

      // Add function-specific parameters
      if (inputData.symbol !== undefined && inputData.symbol !== null) {
        params.append('symbol', inputData.symbol)
      }
      if (inputData.market !== undefined && inputData.market !== null) {
        params.append('market', inputData.market)
      }
      if (inputData.interval !== undefined) {
        params.append('interval', inputData.interval)
      }
      if (inputData.outputsize !== undefined) {
        params.append('outputsize', inputData.outputsize)
      }
      if (inputData.datatype !== undefined) {
        params.append('datatype', inputData.datatype ?? 'json')
      }

      // Technical indicator parameters
      if (
        inputData.indicator !== undefined &&
        inputData.indicator !== null
      ) {
        params.append('indicator', inputData.indicator)
      }
      if (
        inputData.time_period !== undefined &&
        inputData.time_period !== null
      ) {
        params.append('time_period', inputData.time_period.toString())
      }
      if (inputData.series_type !== undefined) {
        params.append('series_type', inputData.series_type)
      }

      // Economic indicator
      if (inputData.economic_indicator !== undefined) {
        params.append('function', inputData.economic_indicator)
      }

      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: {
          message: '📡 Querying Alpha Vantage API...',
          status: 'in-progress',
          stage: 'alpha-vantage',
        },
        id: 'alpha-vantage',
      })

      const url = `https://www.alphavantage.co/query?${params.toString()}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(
          `Alpha Vantage API error: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()

      const dataObj = data as unknown

      // Check for API-specific errors
      if (
        Boolean(dataObj) &&
        typeof dataObj === 'object' &&
        dataObj !== null &&
        'Error Message' in (dataObj as Record<string, unknown>) &&
        Boolean((dataObj as Record<string, unknown>)['Error Message'])
      ) {
        throw new Error(
          String(
            (dataObj as Record<string, unknown>)['Error Message']
          )
        )
      }

      if (
        Boolean(dataObj) &&
        typeof dataObj === 'object' &&
        dataObj !== null &&
        'Note' in (dataObj as Record<string, unknown>) &&
        Boolean((dataObj as Record<string, unknown>)['Note'])
      ) {
        throw new Error(
          String((dataObj as Record<string, unknown>)['Note'])
        ) // API limit reached
      }

      // Extract metadata if available
      const metadata =
        (Boolean(dataObj) &&
          typeof dataObj === 'object' &&
          dataObj !== null &&
          'Meta Data' in dataObj
          ? (dataObj as Record<string, unknown>)['Meta Data']
          : null) ??
        (Boolean(dataObj) &&
          typeof dataObj === 'object' &&
          dataObj !== null &&
          'meta' in dataObj
          ? (dataObj as Record<string, unknown>)['meta']
          : null) ??
        {}

      const metadataObj = metadata as unknown

      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: {
          message: `✅ General data ready for ${inputData.function}`,
          status: 'done',
          stage: 'alpha-vantage',
        },
        id: 'alpha-vantage',
      })

      const result = {
        data,
        metadata: {
          function:
            (Boolean(metadataObj) &&
              typeof metadataObj === 'object' &&
              metadataObj !== null &&
              '1. Information' in metadataObj
              ? String(
                (metadataObj as Record<string, unknown>)[
                '1. Information'
                ]
              )
              : null) ?? inputData.function,
          symbol:
            (Boolean(metadataObj) &&
              typeof metadataObj === 'object' &&
              metadataObj !== null &&
              '2. Symbol' in metadataObj
              ? String(
                (metadataObj as Record<string, unknown>)[
                '2. Symbol'
                ]
              )
              : null) ?? inputData.symbol,
          last_refreshed:
            Boolean(metadataObj) &&
              typeof metadataObj === 'object' &&
              metadataObj !== null &&
              '3. Last Refreshed' in metadataObj
              ? String(
                (metadataObj as Record<string, unknown>)[
                '3. Last Refreshed'
                ]
              )
              : undefined,
          interval:
            Boolean(metadataObj) &&
              typeof metadataObj === 'object' &&
              metadataObj !== null &&
              '4. Interval' in metadataObj
              ? String(
                (metadataObj as Record<string, unknown>)[
                '4. Interval'
                ]
              )
              : undefined,
          output_size:
            Boolean(metadataObj) &&
              typeof metadataObj === 'object' &&
              metadataObj !== null &&
              '5. Output Size' in metadataObj
              ? String(
                (metadataObj as Record<string, unknown>)[
                '5. Output Size'
                ]
              )
              : undefined,
          time_zone:
            Boolean(metadataObj) &&
              typeof metadataObj === 'object' &&
              metadataObj !== null &&
              '6. Time Zone' in metadataObj
              ? String(
                (metadataObj as Record<string, unknown>)[
                '6. Time Zone'
                ]
              )
              : undefined,
        },
      }
      generalSpan?.end()
      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error occurred'
      if (error instanceof Error) {
        generalSpan?.error({
          error,
          endSpan: true,
        })
      }
      throw error instanceof Error ? error : new Error(errorMessage)
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('alphaVantageTool tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart'
    });
  },
  onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
    log.info('alphaVantageTool received input chunk', {
      toolCallId,
      inputTextDelta,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputDelta',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('alphaVantageTool received input', {
      toolCallId,
      messageCount: messages.length,
      inputData: {
        function: input.function,
        symbol: input.symbol,
        market: input.market,
        interval: input.interval,
        outputsize: input.outputsize,
        datatype: input.datatype,
        indicator: input.indicator,
        time_period: input.time_period,
        series_type: input.series_type,
        economic_indicator: input.economic_indicator,
      },
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable'
    });
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('alphaVantageTool completed', {
      toolCallId,
      toolName,
      outputData: {
        data: output.data,
        metadata: output.metadata,
      },
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput'
    });
  },
})

export type AlphaVantageCryptoUITool = InferUITool<
  typeof alphaVantageCryptoTool
>
export type AlphaVantageStockUITool = InferUITool<typeof alphaVantageStockTool>
export type AlphaVantageUITool = InferUITool<typeof alphaVantageTool>
