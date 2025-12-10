/**
 * SerpAPI Shopping Tools
 *
 * Provides shopping platform search tools for Amazon, Walmart, eBay, and Home Depot.
 *
 * @module serpapi-shopping-tool
 */
import type { RequestContext } from '@mastra/core/request-context';
import { createTool } from '@mastra/core/tools'
import { getJson } from 'serpapi'
import { z } from 'zod'
import { trace } from "@opentelemetry/api";
import { log } from '../config/logger'
import { validateSerpApiKey } from './serpapi-config'

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
  execute: async (input, context) => {
    const writer = context?.writer;

    await writer?.custom({ type: 'data-tool-progress', data: { message: '🛒 Starting Amazon search for "' + input.query + '"' } });
    validateSerpApiKey()

    // Get tracer from OpenTelemetry API
    const tracer = trace.getTracer('amazon-search-tool', '1.0.0');
    const amazonSpan = tracer.startSpan('amazon-search', {
      attributes: {
        'tool.id': 'amazon-search',
        'tool.input.query': input.query,
        'tool.input.sortBy': input.sortBy,
        'tool.input.numResults': input.numResults,
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { message: '📡 Querying SerpAPI...' } });
    log.info('Executing Amazon search', { query: input.query })

    try {
      const params: Record<string, string | number | boolean> = {
        engine: 'amazon',
        query: input.query,
        num: input.numResults,
      }

      if (input.sortBy !== 'relevance') {
        const sortMap: Record<string, string> = {
          'price-asc': 'price-asc-rank',
          'price-desc': 'price-desc-rank',
          rating: 'review-rank',
        }
        const sortValue = sortMap[input.sortBy]
        if (sortValue) {
          params.sort_by = sortValue
        }
      }

      if (typeof input.minPrice === 'number') {
        params.min_price = input.minPrice
      }
      if (typeof input.maxPrice === 'number') {
        params.max_price = input.maxPrice
      }
      if (input.primeOnly) {
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

      await writer?.custom({ type: 'data-tool-progress', data: { message: '✅ Amazon search complete: ' + products.length + ' products' } });
      amazonSpan.setAttribute('tool.output.productCount', products.length);
      amazonSpan.end();
      log.info('Amazon search completed', { query: input.query, productCount: products.length })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        amazonSpan.recordException(error);
      }
      amazonSpan.setStatus({ code: 2, message: errorMessage }); // ERROR status
      amazonSpan.end();
      log.error('Amazon search failed', { query: input.query, error: errorMessage })
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
  execute: async (input, context) => {
    const writer = context?.writer;

    await writer?.custom({ type: 'data-tool-progress', data: { message: '🛒 Starting Walmart search for "' + input.query + '"' } });
    validateSerpApiKey()

    // Get tracer from OpenTelemetry API
    const tracer = trace.getTracer('walmart-search-tool', '1.0.0');
    const walmartSpan = tracer.startSpan('walmart-search', {
      attributes: {
        'tool.id': 'walmart-search',
        'tool.input.query': input.query,
        'tool.input.sortBy': input.sortBy,
        'tool.input.numResults': input.numResults,
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { message: '📡 Querying SerpAPI...' } });
    log.info('Executing Walmart search', { query: input.query })

    try {
      const params: Record<string, string | number> = {
        engine: 'walmart',
        query: input.query,
        num: input.numResults,
      }

      if (input.sortBy !== 'relevance') {
        params.sort = input.sortBy
      }
      if (typeof input.minPrice === 'number') {
        params.min_price = input.minPrice
      }
      if (typeof input.maxPrice === 'number') {
        params.max_price = input.maxPrice
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

      await writer?.custom({ type: 'data-tool-progress', data: { message: '✅ Walmart search complete: ' + products.length + ' products' } });
      walmartSpan.setAttribute('tool.output.productCount', products.length);
      walmartSpan.end();
      log.info('Walmart search completed', { query: input.query, productCount: products.length })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        walmartSpan.recordException(error);
      }
      walmartSpan.setStatus({ code: 2, message: errorMessage }); // ERROR status
      walmartSpan.end();
      log.error('Walmart search failed', { query: input.query, error: errorMessage })
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
  execute: async (input, context) => {
    const writer = context?.writer;

    await writer?.custom({ type: 'data-tool-progress', data: { message: '🛒 Starting eBay search for "' + input.query + '"' } });
    validateSerpApiKey()

    // Get tracer from OpenTelemetry API
    const tracer = trace.getTracer('ebay-search-tool', '1.0.0');
    const ebaySpan = tracer.startSpan('ebay-search', {
      attributes: {
        'tool.id': 'ebay-search',
        'tool.input.query': input.query,
        'tool.input.condition': input.condition,
        'tool.input.sortBy': input.sortBy,
        'tool.input.numResults': input.numResults,
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { message: '📡 Querying SerpAPI...' } });
    log.info('Executing eBay search', { query: input.query })

    try {
      const params: Record<string, string | number | boolean> = {
        engine: 'ebay',
        _nkw: input.query,
        _ipg: input.numResults,
      }
      if (input.condition) {
        params.LH_ItemCondition = input.condition === 'new' ? '1000' : input.condition === 'used' ? '3000' : '2000'
      }
      if (input.buyNowOnly) {
        params.LH_BIN = '1'
      }
      if (input.sortBy && input.sortBy !== 'relevance') {
        const sortMap: Record<string, string> = {
          'price-asc': 'PricePlusShippingLowest',
          'price-desc': 'PricePlusShippingHighest',
        }
        const sortVal = sortMap[input.sortBy]
        if (sortVal) {params._sop = sortVal}
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
      await writer?.custom({ type: 'data-tool-progress', data: { message: '✅ eBay search complete: ' + products.length + ' products' } });
      ebaySpan.setAttribute('tool.output.productCount', products.length);
      ebaySpan.end();
      log.info('eBay search completed', { query: input.query, productCount: products.length })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        ebaySpan.recordException(error);
      }
      ebaySpan.setStatus({ code: 2, message: errorMessage }); // ERROR status
      ebaySpan.end();
      log.error('eBay search failed', { query: input.query, error: errorMessage })
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
  execute: async (input, context) => {
    const writer = context?.writer;

    await writer?.custom({ type: 'data-tool-progress', data: { message: '🛒 Starting Home Depot search for "' + input.query + '"' } });
    validateSerpApiKey()

    // Get tracer from OpenTelemetry API
    const tracer = trace.getTracer('home-depot-search-tool', '1.0.0');
    const homeDepotSpan = tracer.startSpan('home-depot-search', {
      attributes: {
        'tool.id': 'home-depot-search',
        'tool.input.query': input.query,
        'tool.input.sortBy': input.sortBy,
        'tool.input.numResults': input.numResults,
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { message: '📡 Querying SerpAPI...' } });
    log.info('Executing Home Depot search', { query: input.query })

    try {
      const params: Record<string, string | number | boolean> = {
        engine: 'home_depot',
        q: input.query,
        num: input.numResults,
      }
      if (input.sortBy !== 'relevance') {
        params.sort_by = input.sortBy
      }
      if (input.inStockOnly) {
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
      await writer?.custom({ type: 'data-tool-progress', data: { message: '✅ Home Depot search complete: ' + products.length + ' products' } });
      homeDepotSpan.setAttribute('tool.output.productCount', products.length);
      homeDepotSpan.end();
      log.info('Home Depot search completed', { query: input.query, productCount: products.length })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        homeDepotSpan.recordException(error);
      }
      homeDepotSpan.setStatus({ code: 2, message: errorMessage }); // ERROR status
      homeDepotSpan.end();
      log.error('Home Depot search failed', { query: input.query, error: errorMessage })
      throw new Error(`Home Depot search failed: ${errorMessage}`)
    }
  },
})
