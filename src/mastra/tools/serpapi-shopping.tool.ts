/**
 * SerpAPI Shopping Tools
 *
 * Provides shopping platform search tools for Amazon, Walmart, eBay, and Home Depot.
 *
 * @module serpapi-shopping-tool
 */
import { createTool } from '@mastra/core/tools';
import { SpanType } from "@mastra/core/observability";
import { getJson } from 'serpapi';
import { z } from 'zod';
import { log } from '../config/logger';
import { validateSerpApiKey } from './serpapi-config';

// Amazon Search Tool
const amazonSearchInputSchema = z.object({
  query: z.string().min(1).describe('Product search query'),
  sortBy: z.enum(['relevance', 'price-asc', 'price-desc', 'rating']).default('relevance').describe('Sort order'),
  minPrice: z.number().positive().optional().describe('Minimum price filter'),
  maxPrice: z.number().positive().optional().describe('Maximum price filter'),
  primeOnly: z.boolean().default(false).describe('Show only Prime eligible products'),
  numResults: z.number().int().min(1).max(50).default(10).describe('Number of results'),
})

const amazonSearchOutputSchema = z.object({
  products: z.array(
    z.object({
      title: z.string(),
      asin: z.string(),
      link: z.url(),
      price: z.number().optional(),
      rating: z.number().optional(),
      reviewCount: z.number().optional(),
      thumbnail: z.url().optional(),
      isPrime: z.boolean().optional(),
    })
  ),
})

export const amazonSearchTool = createTool({
  id: 'amazon-search',
  description:
    'Search Amazon for products. Filter by price range, sort by relevance/price/rating, and show only Prime eligible items. Returns product title, ASIN, price, rating, review count, and Prime status.',
  inputSchema: amazonSearchInputSchema,
  outputSchema: amazonSearchOutputSchema,
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('amazonSearchTool tool input streaming started', { toolCallId, hook: 'onInputStart' });
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('amazonSearchTool received input', {
      toolCallId,
      inputData: {
        query: input.query,
        sortBy: input.sortBy,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        primeOnly: input.primeOnly,
        numResults: input.numResults,
      },
      hook: 'onInputAvailable'
    });
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('amazonSearchTool completed', {
      toolCallId,
      toolName,
      outputData: {
        products: output.products,
      },
      hook: 'onOutput'
    });
  },
  execute: async (inputData, context) => {
    const writer = context?.writer;
    const tracingContext = context?.tracingContext;

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🛒 Starting Amazon search for "' + inputData.query + '"', stage: 'amazon-search' }, id: 'amazon-search' });
    validateSerpApiKey()

    const amazonSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'amazon-search',
      input: inputData,
      metadata: {
        'tool.id': 'amazon-search',
        'tool.input.query': inputData.query,
        'tool.input.sortBy': inputData.sortBy,
        'tool.input.numResults': inputData.numResults,
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '📡 Querying SerpAPI...', stage: 'amazon-search' }, id: 'amazon-search' });
    log.info('Executing Amazon search', { query: inputData.query })

    try {
      const params: Record<string, string | number | boolean> = {
        engine: 'amazon',
        query: inputData.query,
        num: inputData.numResults,
      }

      if (inputData.sortBy !== 'relevance') {
        const sortMap: Record<string, string> = {
          'price-asc': 'price-asc-rank',
          'price-desc': 'price-desc-rank',
          rating: 'review-rank',
        }
        const sortValue = sortMap[inputData.sortBy]
        if (sortValue) {
          params.sort_by = sortValue
        }
      }

      if (typeof inputData.minPrice === 'number') {
        params.min_price = inputData.minPrice
      }
      if (typeof inputData.maxPrice === 'number') {
        params.max_price = inputData.maxPrice
      }
      if (inputData.primeOnly) {
        params.prime = 'true'
      }

      const response = await getJson(params)

      const products =
        response.search_results?.map(
          (product: {
            title: string
            asin: string
            link: string
            price?: { value: number }
            rating?: number
            reviews_count?: number
            thumbnail?: string
            is_prime?: boolean
          }) => ({
            title: product.title,
            asin: product.asin,
            link: product.link,
            price: product.price?.value,
            rating: product.rating,
            reviewCount: product.reviews_count,
            thumbnail: product.thumbnail,
            isPrime: product.is_prime,
          })
        ) ?? []

      const result = { products }

      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Amazon search complete: ' + products.length + ' products', stage: 'amazon-search' }, id: 'amazon-search' });
      amazonSpan?.update({
        output: result,
        metadata: {
          'tool.output.productCount': products.length
        }
      });
      amazonSpan?.end();
      log.info('Amazon search completed', { query: inputData.query, productCount: products.length })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      amazonSpan?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })
      log.error('Amazon search failed', { query: inputData.query, error: errorMessage })
      throw new Error(`Amazon search failed: ${errorMessage}`)
    }
  },
})

// Walmart Search Tool
const walmartSearchInputSchema = z.object({
  query: z.string().min(1).describe('Product search query'),
  sortBy: z.enum(['relevance', 'price-asc', 'price-desc', 'rating']).default('relevance').describe('Sort order'),
  minPrice: z.number().positive().optional().describe('Minimum price'),
  maxPrice: z.number().positive().optional().describe('Maximum price'),
  numResults: z.number().int().min(1).max(50).default(10).describe('Number of results'),
})

const walmartSearchOutputSchema = z.object({
  products: z.array(
    z.object({
      title: z.string(),
      productId: z.string(),
      link: z.url(),
      price: z.number().optional(),
      rating: z.number().optional(),
      thumbnail: z.url().optional(),
    })
  ),
})

export const walmartSearchTool = createTool({
  id: 'walmart-search',
  description:
    'Search Walmart for products. Filter by price range and sort by relevance, price, or rating. Returns product information including title, price, rating, and links.',
  inputSchema: walmartSearchInputSchema,
  outputSchema: walmartSearchOutputSchema,
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('walmartSearchTool tool input streaming started', { toolCallId, hook: 'onInputStart' });
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('walmartSearchTool received input', {
      toolCallId,
      inputData: {
        query: input.query,
        sortBy: input.sortBy,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        numResults: input.numResults,
      },
      hook: 'onInputAvailable'
    });
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('walmartSearchTool completed', {
      toolCallId,
      toolName,
      outputData: {
        products: output.products,
      },
      hook: 'onOutput'
    });
  },
  execute: async (inputData, context) => {
    const writer = context?.writer;
    const tracingContext = context?.tracingContext;

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🛒 Starting Walmart search for "' + inputData.query + '"', stage: 'walmart-search' }, id: 'walmart-search' });
    validateSerpApiKey()

    const walmartSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'walmart-search',
      input: inputData,
      metadata: {
        'tool.id': 'walmart-search',
        'tool.input.query': inputData.query,
        'tool.input.sortBy': inputData.sortBy,
        'tool.input.numResults': inputData.numResults,
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '📡 Querying SerpAPI...', stage: 'walmart-search' }, id: 'walmart-search' });
    log.info('Executing Walmart search', { query: inputData.query })

    try {
      const params: Record<string, string | number> = {
        engine: 'walmart',
        query: inputData.query,
        num: inputData.numResults,
      }

      if (inputData.sortBy !== 'relevance') {
        params.sort = inputData.sortBy
      }
      if (typeof inputData.minPrice === 'number') {
        params.min_price = inputData.minPrice
      }
      if (typeof inputData.maxPrice === 'number') {
        params.max_price = inputData.maxPrice
      }

      const response = await getJson(params)

      const products =
        response.organic_results?.map(
          (product: {
            title: string
            product_id: string
            link: string
            primary_offer?: { offer_price?: number }
            rating?: number
            thumbnail?: string
          }) => ({
            title: product.title,
            productId: product.product_id,
            link: product.link,
            price: product.primary_offer?.offer_price,
            rating: product.rating,
            thumbnail: product.thumbnail,
          })
        ) ?? []

      const result = { products }

      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Walmart search complete: ' + products.length + ' products', stage: 'walmart-search' }, id: 'walmart-search' });
      walmartSpan?.update({
        output: result,
        metadata: {
          'tool.output.productCount': products.length
        }
      });
      walmartSpan?.end();
      log.info('Walmart search completed', { query: inputData.query, productCount: products.length })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      walmartSpan?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })
      log.error('Walmart search failed', { query: inputData.query, error: errorMessage })
      throw new Error(`Walmart search failed: ${errorMessage}`)
    }
  },
})

// eBay Search Tool
const ebaySearchInputSchema = z.object({
  query: z.string().min(1).describe('Product search query'),
  condition: z.enum(['new', 'used', 'refurbished']).optional().describe('Item condition'),
  sortBy: z.enum(['relevance', 'price-asc', 'price-desc']).default('relevance').describe('Sort order'),
  buyNowOnly: z.boolean().default(false).describe('Show only Buy It Now items'),
  numResults: z.number().int().min(1).max(50).default(10).describe('Number of results'),
})

const ebaySearchOutputSchema = z.object({
  products: z.array(
    z.object({
      title: z.string(),
      itemId: z.string(),
      link: z.url(),
      price: z.number().optional(),
      condition: z.string().optional(),
      bids: z.number().optional(),
      timeLeft: z.string().optional(),
      thumbnail: z.url().optional(),
    })
  ),
})

export const ebaySearchTool = createTool({
  id: 'ebay-search',
  description:
    'Search eBay for products and listings. Filter by condition (new/used/refurbished), show only Buy It Now items, and sort by relevance or price. Returns item details including price, bids, time left, and condition.',
  inputSchema: ebaySearchInputSchema,
  outputSchema: ebaySearchOutputSchema,
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('ebaySearchTool tool input streaming started', { toolCallId, hook: 'onInputStart' });
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('ebaySearchTool received input', {
      toolCallId,
      inputData: {
        query: input.query,
        condition: input.condition,
        sortBy: input.sortBy,
        buyNowOnly: input.buyNowOnly,
        numResults: input.numResults,
      },
      hook: 'onInputAvailable'
    });
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('ebaySearchTool completed', {
      toolCallId,
      toolName,
      outputData: {
        products: output.products,
      },
      hook: 'onOutput'
    });
  },
  execute: async (inputData, context) => {
    const writer = context?.writer;
    const tracingContext = context?.tracingContext;

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🛒 Starting eBay search for "' + inputData.query + '"', stage: 'ebay-search' }, id: 'ebay-search' });
    validateSerpApiKey()

    const ebaySpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'ebay-search',
      input: inputData,
      metadata: {
        'tool.id': 'ebay-search',
        'tool.input.query': inputData.query,
        'tool.input.condition': inputData.condition,
        'tool.input.sortBy': inputData.sortBy,
        'tool.input.numResults': inputData.numResults,
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '📡 Querying SerpAPI...', stage: 'ebay-search' }, id: 'ebay-search' });
    log.info('Executing eBay search', { query: inputData.query })

    try {
      const params: Record<string, string | number | boolean> = {
        engine: 'ebay',
        _nkw: inputData.query,
        _ipg: inputData.numResults,
      }
      if (inputData.condition) {
        params.LH_ItemCondition = inputData.condition === 'new' ? '1000' : inputData.condition === 'used' ? '3000' : '2000'
      }
      if (inputData.buyNowOnly) {
        params.LH_BIN = '1'
      }
      if (inputData.sortBy && inputData.sortBy !== 'relevance') {
        const sortMap: Record<string, string> = {
          'price-asc': 'PricePlusShippingLowest',
          'price-desc': 'PricePlusShippingHighest',
        }
        const sortVal = sortMap[inputData.sortBy]
        if (sortVal) { params._sop = sortVal }
      }

      const response = await getJson(params)
      const products =
        response.organic_results?.map(
          (product: {
            title: string
            item_id: string
            link: string
            price?: { value: number }
            condition?: string
            bids?: number
            time_left?: string
            thumbnail?: string
          }) => ({
            title: product.title,
            itemId: product.item_id,
            link: product.link,
            price: product.price?.value,
            condition: product.condition,
            bids: product.bids,
            timeLeft: product.time_left,
            thumbnail: product.thumbnail,
          })
        ) ?? []
      const result = { products }
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ eBay search complete: ' + products.length + ' products', stage: 'ebay-search' }, id: 'ebay-search' });
      ebaySpan?.update({
        output: result,
        metadata: {
          'tool.output.productCount': products.length
        }
      });
      ebaySpan?.end();
      log.info('eBay search completed', { query: inputData.query, productCount: products.length })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      ebaySpan?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })
      log.error('eBay search failed', { query: inputData.query, error: errorMessage })
      throw new Error(`eBay search failed: ${errorMessage}`)
    }
  },
})

// Home Depot Search Tool
const homeDepotSearchInputSchema = z.object({
  query: z.string().min(1).describe('Product search query'),
  sortBy: z.enum(['relevance', 'price-asc', 'price-desc', 'rating']).default('relevance').describe('Sort order'),
  inStockOnly: z.boolean().default(false).describe('Show only in-stock items'),
  numResults: z.number().int().min(1).max(50).default(10).describe('Number of results'),
})

const homeDepotSearchOutputSchema = z.object({
  products: z.array(
    z.object({
      title: z.string(),
      productId: z.string(),
      link: z.url(),
      price: z.number().optional(),
      rating: z.number().optional(),
      availability: z.string().optional(),
      thumbnail: z.url().optional(),
    })
  ),
})

export const homeDepotSearchTool = createTool({
  id: 'home-depot-search',
  description:
    'Search Home Depot for home improvement products. Filter by in-stock availability and sort by relevance, price, or rating. Returns product details including price, rating, availability, and links.',
  inputSchema: homeDepotSearchInputSchema,
  outputSchema: homeDepotSearchOutputSchema,
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('homeDepotSearchTool tool input streaming started', { toolCallId, hook: 'onInputStart' });
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('homeDepotSearchTool received input', {
      toolCallId,
      inputData: {
        query: input.query,
        sortBy: input.sortBy,
        inStockOnly: input.inStockOnly,
        numResults: input.numResults,
      },
      hook: 'onInputAvailable'
    });
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('homeDepotSearchTool completed', {
      toolCallId,
      toolName,
      outputData: {
        products: output.products,
      },
      hook: 'onOutput'
    });
  },
  execute: async (inputData, context) => {
    const writer = context?.writer;
    const tracingContext = context?.tracingContext;

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🛒 Starting Home Depot search for "' + inputData.query + '"', stage: 'home-depot-search' }, id: 'home-depot-search' });
    validateSerpApiKey()

    const homeDepotSpan = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'home-depot-search',
      input: inputData,
      metadata: {
        'tool.id': 'home-depot-search',
        'tool.input.query': inputData.query,
        'tool.input.sortBy': inputData.sortBy,
        'tool.input.numResults': inputData.numResults,
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '📡 Querying SerpAPI...', stage: 'home-depot-search' }, id: 'home-depot-search' });
    log.info('Executing Home Depot search', { query: inputData.query })

    try {
      const params: Record<string, string | number | boolean> = {
        engine: 'home_depot',
        q: inputData.query,
        num: inputData.numResults,
      }
      if (inputData.sortBy !== 'relevance') {
        params.sort_by = inputData.sortBy
      }
      if (inputData.inStockOnly) {
        params.in_stock = 'true'
      }
      const response = await getJson(params)
      const products =
        response.products?.map(
          (product: {
            title: string
            product_id: string
            link: string
            price?: number
            rating?: number
            availability?: string
            thumbnail?: string
          }) => ({
            title: product.title,
            productId: product.product_id,
            link: product.link,
            price: product.price,
            rating: product.rating,
            availability: product.availability,
            thumbnail: product.thumbnail,
          })
        ) ?? []
      const result = { products }
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Home Depot search complete: ' + products.length + ' products', stage: 'home-depot-search' }, id: 'home-depot-search' });
      homeDepotSpan?.update({
        output: result,
        metadata: {
          'tool.output.productCount': products.length
        }
      });
      homeDepotSpan?.end();
      log.info('Home Depot search completed', { query: inputData.query, productCount: products.length })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      homeDepotSpan?.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        endSpan: true,
      })
      log.error('Home Depot search failed', { query: inputData.query, error: errorMessage })
      throw new Error(`Home Depot search failed: ${errorMessage}`)
    }
  },
})
