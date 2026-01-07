/**
 * SerpAPI Academic and Local Search Tools
 *
 * Provides Google Scholar, Google Finance, and Yelp search tools.
 *
 * @module serpapi-academic-local-tool
 */
import type { RequestContext } from '@mastra/core/request-context'
import { trace, SpanStatusCode } from '@opentelemetry/api'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { getJson } from 'serpapi'
import { z } from 'zod'
import { log } from '../config/logger'
import { validateSerpApiKey } from './serpapi-config'

// Google Scholar Tool
const googleScholarInputSchema = z.object({
    query: z.string().min(1).describe('Academic search query'),
    yearStart: z
        .number()
        .int()
        .min(1900)
        .optional()
        .describe('Start year for filtering papers'),
    yearEnd: z
        .number()
        .int()
        .max(new Date().getFullYear())
        .optional()
        .describe('End year for filtering papers'),
    sortBy: z
        .enum(['relevance', 'date'])
        .default('relevance')
        .describe('Sort order'),
    includePatents: z
        .boolean()
        .default(false)
        .describe('Include patents in results'),
    includeCitations: z
        .boolean()
        .default(true)
        .describe('Include citation count'),
    numResults: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe('Number of results'),
})

const googleScholarOutputSchema = z.object({
    papers: z.array(
        z.object({
            title: z.string(),
            link: z.url(),
            authors: z.string().optional(),
            publication: z.string().optional(),
            year: z.string().optional(),
            citedBy: z.number().optional(),
            relatedArticles: z.url().optional(),
            snippet: z.string().optional(),
            pdfLink: z.url().optional(),
        })
    ),
})

export const googleScholarTool = createTool({
    id: 'googlescholar',
    description:
        'Search Google Scholar for academic papers and citations. Filter by year range, include/exclude patents, and sort by relevance or date. Returns paper title, authors, publication, year, citation count, and PDF links when available. Useful for research and finding academic sources.',
    inputSchema: googleScholarInputSchema,
    outputSchema: googleScholarOutputSchema,
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Google Scholar tool input streaming started', {
            toolCallId,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Google Scholar received input', {
            toolCallId,
            inputData: {
                query: input.query,
                yearStart: input.yearStart,
                yearEnd: input.yearEnd,
                sortBy: input.sortBy,
                numResults: input.numResults,
            },
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Google Scholar search completed', {
            toolCallId,
            toolName,
            papersFound: output.papers.length,
            hook: 'onOutput',
        })
    },
    execute: async (input, context) => {
        validateSerpApiKey()
        const writer = context?.writer

        const tracer = trace.getTracer('serpapi-academic-local-tool')
        const scholarSpan = tracer.startSpan('google-scholar-tool', {
            attributes: {
                query: input.query,
                yearRange: `${input.yearStart}-${input.yearEnd}`,
                operation: 'google-scholar',
            },
        })
        log.info('Executing Google Scholar search', { query: input.query })
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                message: `Searching Google Scholar for: ${input.query}`,
            },
        })
        try {
            const params: Record<string, string | number> = {
                engine: 'google_scholar',
                q: input.query,
                num: input.numResults,
            }
            if (
                typeof input.yearStart === 'number' &&
                typeof input.yearEnd === 'number'
            ) {
                params.as_ylo = input.yearStart
                params.as_yhi = input.yearEnd
            }
            if (input.sortBy === 'date') {
                params.scisbd = '1'
            }
            if (!input.includePatents) {
                params.as_sdt = '0,5'
            }
            const response = await getJson(params)
            const papers =
                response.organic_results?.map(
                    (paper: {
                        title: string
                        link: string
                        publication_info?: {
                            authors?: string
                            summary?: string
                        }
                        inline_links?: {
                            cited_by?: { total?: number; link?: string }
                            related_pages_link?: string
                        }
                        snippet?: string
                        resources?: Array<{
                            link?: string
                            file_format?: string
                        }>
                    }) => ({
                        title: paper.title,
                        link: paper.link,
                        authors: paper.publication_info?.authors,
                        publication: paper.publication_info?.summary,
                        year: paper.publication_info?.summary?.match(
                            /\d{4}/
                        )?.[0],
                        citedBy: paper.inline_links?.cited_by?.total,
                        relatedArticles: paper.inline_links?.related_pages_link,
                        snippet: paper.snippet,
                        pdfLink: paper.resources?.find(
                            (r: { file_format?: string }) =>
                                r.file_format === 'PDF'
                        )?.link,
                    })
                ) ?? []
            const result = { papers }
            scholarSpan.end()
            log.info('Google Scholar search completed', {
                query: input.query,
                paperCount: papers.length,
            })
            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            scholarSpan.recordException(
                error instanceof Error ? error : new Error(errorMessage)
            )
            scholarSpan.setStatus({
                code: SpanStatusCode.ERROR,
                message: errorMessage,
            })
            scholarSpan.end()
            log.error('Google Scholar search failed', {
                query: input.query,
                error: errorMessage,
            })
            throw new Error(`Google Scholar search failed: ${errorMessage}`)
        }
    },
})

export type GoogleScholarUITool = InferUITool<typeof googleScholarTool>

// Google Finance Tool
const googleFinanceInputSchema = z.object({
    query: z
        .string()
        .min(1)
        .describe('Stock symbol or company name (e.g., "AAPL", "Apple")'),
    exchange: z
        .string()
        .optional()
        .describe('Stock exchange (e.g., "NASDAQ", "NYSE")'),
})

const googleFinanceOutputSchema = z.object({
    symbol: z.string(),
    price: z.number().optional(),
    change: z.number().optional(),
    changePercent: z.number().optional(),
    marketCap: z.string().optional(),
    volume: z.string().optional(),
    high: z.number().optional(),
    low: z.number().optional(),
    open: z.number().optional(),
    previousClose: z.number().optional(),
    news: z
        .array(
            z.object({
                title: z.string(),
                link: z.url(),
                source: z.string(),
                date: z.string(),
            })
        )
        .optional(),
})

export const googleFinanceTool = createTool({
    id: 'google-finance',
    description:
        'Get stock quotes and financial data from Google Finance. Returns current price, change, market cap, volume, high/low, and recent financial news. Use for real-time stock information and market data.',
    inputSchema: googleFinanceInputSchema,
    outputSchema: googleFinanceOutputSchema,
    execute: async (input, context) => {
        validateSerpApiKey()
        const writer = context?.writer

        const tracer = trace.getTracer('serpapi-academic-local-tool')
        const financeSpan = tracer.startSpan('google-finance-tool', {
            attributes: {
                query: input.query,
                operation: 'google-finance',
            },
        })
        log.info('Executing Google Finance search', { query: input.query })
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                message: `Searching Google Finance for: ${input.query}`,
            },
        })
        try {
            const params: Record<string, string> = {
                engine: 'google_finance',
                q: input.query,
            }
            if (
                typeof input.exchange === 'string' &&
                input.exchange.length > 0
            ) {
                params.exchange = input.exchange
            }
            const response = await getJson(params)
            const { summary } = response
            const news = response.news?.map(
                (article: {
                    title: string
                    link: string
                    source: string
                    date: string
                }) => ({
                    title: article.title,
                    link: article.link,
                    source: article.source,
                    date: article.date,
                })
            )
            const result = {
                symbol: summary?.stock ?? input.query,
                price: summary?.price?.value,
                change: summary?.price?.change,
                changePercent: summary?.price?.change_percentage,
                marketCap: summary?.market_cap,
                volume: summary?.volume,
                high: summary?.high,
                low: summary?.low,
                open: summary?.open,
                previousClose: summary?.previous_close,
                news,
            }
            financeSpan.end()
            log.info('Google Finance search completed', {
                query: input.query,
                symbol: result.symbol,
            })
            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            financeSpan.recordException(
                error instanceof Error ? error : new Error(errorMessage)
            )
            financeSpan.setStatus({
                code: SpanStatusCode.ERROR,
                message: errorMessage,
            })
            financeSpan.end()
            log.error('Google Finance search failed', {
                query: input.query,
                error: errorMessage,
            })
            throw new Error(`Google Finance search failed: ${errorMessage}`)
        }
    },
})

export type GoogleFinanceUITool = InferUITool<typeof googleFinanceTool>

// Yelp Search Tool
const yelpSearchInputSchema = z.object({
    query: z
        .string()
        .min(1)
        .describe('Business type or name (e.g., "pizza", "Starbucks")'),
    location: z
        .string()
        .min(1)
        .describe('City, address, or location (required)'),
    sortBy: z
        .enum(['recommended', 'rating', 'review_count'])
        .default('recommended')
        .describe('Sort order'),
    priceRange: z
        .enum(['$', '$$', '$$$', '$$$$'])
        .optional()
        .describe('Price range filter'),
    openNow: z
        .boolean()
        .default(false)
        .describe('Show only businesses open now'),
    numResults: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe('Number of results'),
})

const yelpSearchOutputSchema = z.object({
    businesses: z.array(
        z.object({
            name: z.string(),
            rating: z.number().optional(),
            reviewCount: z.number().optional(),
            priceRange: z.string().optional(),
            categories: z.array(z.string()).optional(),
            address: z.string().optional(),
            phone: z.string().optional(),
            link: z.url().optional(),
            hours: z.string().optional(),
            photos: z.array(z.url()).optional(),
        })
    ),
})

export const yelpSearchTool = createTool({
    id: 'yelp-search',
    description:
        'Search Yelp for local businesses and reviews. Requires location parameter. Filter by price range, open now status, and sort by recommended, rating, or review count. Returns business name, rating, reviews, address, phone, hours, and photos. Best for finding local services and restaurants.',
    inputSchema: yelpSearchInputSchema,
    outputSchema: yelpSearchOutputSchema,
    execute: async (input, context) => {
        validateSerpApiKey()
        const writer = context?.writer

        const tracer = trace.getTracer('serpapi-academic-local-tool')
        const yelpSpan = tracer.startSpan('yelp-search-tool', {
            attributes: {
                query: input.query,
                location: input.location,
                operation: 'yelp-search',
            },
        })
        log.info('Executing Yelp search', {
            query: input.query,
            location: input.location,
        })
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                message: `Searching Yelp for: ${input.query} in ${input.location}`,
            },
        })
        try {
            const params: Record<string, string | number | boolean> = {
                engine: 'yelp',
                find_desc: input.query,
                find_loc: input.location,
                num: input.numResults,
            }
            if (input.sortBy !== 'recommended') {
                params.sortby = input.sortBy
            }
            if (input.priceRange) {
                params.price = input.priceRange
            }
            if (input.openNow) {
                params.open_now = 'true'
            }
            const response = await getJson(params)
            const businesses =
                response.organic_results?.map(
                    (business: {
                        title: string
                        rating?: number
                        reviews?: number
                        price?: string
                        categories?: string[]
                        address?: string
                        phone?: string
                        link?: string
                        hours?: string
                        thumbnail?: string
                        photos?: string[]
                    }) => ({
                        name: business.title,
                        rating: business.rating,
                        reviewCount: business.reviews,
                        priceRange: business.price,
                        categories: business.categories,
                        address: business.address,
                        phone: business.phone,
                        link: business.link,
                        hours: business.hours,
                        photos:
                            business.photos ??
                            (typeof business.thumbnail === 'string' &&
                            business.thumbnail.length > 0
                                ? [business.thumbnail]
                                : undefined),
                    })
                ) ?? []
            const result = { businesses }
            yelpSpan.end()
            log.info('Yelp search completed', {
                query: input.query,
                location: input.location,
                businessCount: businesses.length,
            })
            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            yelpSpan.recordException(
                error instanceof Error ? error : new Error(errorMessage)
            )
            yelpSpan.setStatus({
                code: SpanStatusCode.ERROR,
                message: errorMessage,
            })
            yelpSpan.end()
            log.error('Yelp search failed', {
                query: input.query,
                location: input.location,
                error: errorMessage,
            })
            throw new Error(`Yelp search failed: ${errorMessage}`)
        }
    },
})

export type YelpSearchUITool = InferUITool<typeof yelpSearchTool>
