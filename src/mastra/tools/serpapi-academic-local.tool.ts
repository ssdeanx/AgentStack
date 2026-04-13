/**
 * SerpAPI Academic and Local Search Tools
 *
 * Provides Google Scholar, Google Finance, and Yelp search tools.
 *
 * @module serpapi-academic-local-tool
 */
import type { RequestContext } from '@mastra/core/request-context'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import type { TracingContext } from '@mastra/core/observability'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { getJson } from 'serpapi'
import { z } from 'zod'
import { log } from '../config/logger'
import { validateSerpApiKey } from './serpapi-config'

export interface SerpApiContext extends RequestContext {
    userId?: string
}

// SerpAPI response type interfaces for type-safe API response handling

interface ScholarPublicationInfo {
    authors?: string
    summary?: string
}

interface ScholarCitedBy {
    total?: number
    link?: string
}

interface ScholarInlineLinks {
    cited_by?: ScholarCitedBy
    related_pages_link?: string
}

interface ScholarResource {
    link?: string
    file_format?: string
}

interface ScholarOrganicResult {
    title: string
    link: string
    publication_info?: ScholarPublicationInfo
    inline_links?: ScholarInlineLinks
    snippet?: string
    resources?: ScholarResource[]
}

interface ScholarApiResponse {
    organic_results?: ScholarOrganicResult[]
}

interface FinancePriceInfo {
    value?: number
    change?: number
    change_percentage?: number
}

interface FinanceSummaryData {
    stock?: string
    price?: FinancePriceInfo
    market_cap?: string
    volume?: string
    high?: number
    low?: number
    open?: number
    previous_close?: number
}

interface FinanceNewsArticle {
    title: string
    link: string
    source: string
    date: string
}

interface FinanceApiResponse {
    summary?: FinanceSummaryData
    news?: FinanceNewsArticle[]
}

interface YelpBusiness {
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
}

interface YelpApiResponse {
    organic_results?: YelpBusiness[]
}

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
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Google Scholar tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Google Scholar received input', {
            toolCallId,
            messageCount: messages.length,
            inputData: {
                query: input.query,
                yearStart: input.yearStart,
                yearEnd: input.yearEnd,
                sortBy: input.sortBy,
                numResults: input.numResults,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    execute: async (input, context) => {
        validateSerpApiKey()
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined =
            context?.tracingContext

        if (abortSignal?.aborted === true) {
            throw new Error('Google Scholar search cancelled')
        }

        const scholarSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'google-scholar-tool',
            input,
            metadata: {
                'tool.id': 'googlescholar',
                query: input.query,
                yearRange: `${String(input.yearStart ?? 'any')}-${String(input.yearEnd ?? 'any')}`,
                operation: 'google-scholar',
            },
            requestContext: context?.requestContext,
            tracingContext,
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
            }
            if (typeof input.numResults === 'number') {
                params.num = input.numResults
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
            if (input.includePatents === false) {
                params.as_sdt = '0,5'
            }
            const response = (await getJson(params)) as ScholarApiResponse
            const papers =
                response.organic_results?.map(
                    (paper: ScholarOrganicResult) => ({
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
                            (r: ScholarResource) => r.file_format === 'PDF'
                        )?.link,
                    })
                ) ?? []
            const result = { papers }
            scholarSpan?.update({
                output: result,
                metadata: {
                    'tool.output.paperCount': papers.length,
                },
            })
            scholarSpan?.end()
            log.info('Google Scholar search completed', {
                query: input.query,
                paperCount: papers.length,
            })
            return result
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                const cancelMessage = `Google Scholar search cancelled for "${input.query}"`
                scholarSpan?.error({
                    error: new Error(cancelMessage),
                    endSpan: true,
                })

                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: `🛑 ${cancelMessage}`,
                        stage: 'serpapi-academic-local',
                    },
                    id: 'serpapi-academic-local',
                })

                log.warn(cancelMessage)
                throw error
            }

            const errorMessage =
                error instanceof Error ? error.message : String(error)
            const normalizedError =
                error instanceof Error ? error : new Error(errorMessage)
            scholarSpan?.error({
                error: normalizedError,
                endSpan: true,
            })
            log.error('Google Scholar search failed', {
                query: input.query,
                error: errorMessage,
            })
            if (error instanceof Error) {
                throw error
            }

            throw new Error(`Google Scholar search failed: ${errorMessage}`, {
                cause: error,
            })
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Google Scholar search completed', {
            toolCallId,
            toolName,
            outputData: { paperCount: output.papers.length },
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
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
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Google Finance tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Google Finance tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Google Finance received input', {
            toolCallId,
            messageCount: messages.length,
            inputData: {
                query: input.query,
                exchange: input.exchange,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    execute: async (input, context) => {
        validateSerpApiKey()
        const writer = context?.writer
        const tracingContext: TracingContext | undefined =
            context?.tracingContext

        const financeSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'google-finance-tool',
            input,
            metadata: {
                'tool.id': 'google-finance',
                query: input.query,
                operation: 'google-finance',
            },
            requestContext: context?.requestContext,
            tracingContext,
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
            const response = (await getJson(params)) as FinanceApiResponse
            const summary: FinanceSummaryData | undefined = response.summary
            const news: Array<{
                title: string
                link: string
                source: string
                date: string
            }> =
                response.news?.map((article: FinanceNewsArticle) => ({
                    title: article.title,
                    link: article.link,
                    source: article.source,
                    date: article.date,
                })) ?? []
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
            financeSpan?.update({
                output: result,
                metadata: {
                    'tool.output.symbol': result.symbol,
                },
            })
            financeSpan?.end()
            log.info('Google Finance search completed', {
                query: input.query,
                symbol: result.symbol,
            })
            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            const normalizedError =
                error instanceof Error ? error : new Error(errorMessage)
            financeSpan?.error({
                error: normalizedError,
                endSpan: true,
            })
            log.error('Google Finance search failed', {
                query: input.query,
                error: errorMessage,
            })
            if (error instanceof Error) {
                throw error
            }

            throw new Error(`Google Finance search failed: ${errorMessage}`, {
                cause: error,
            })
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Google Finance search completed', {
            toolCallId,
            toolName,
            outputData: { symbol: output.symbol },
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
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
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Yelp Search tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Yelp Search tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Yelp Search received input', {
            toolCallId,
            messageCount: messages.length,
            inputData: {
                query: input.query,
                location: input.location,
                sortBy: input.sortBy,
                priceRange: input.priceRange,
                openNow: input.openNow,
                numResults: input.numResults,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    execute: async (input, context) => {
        validateSerpApiKey()
        const writer = context?.writer
        const tracingContext: TracingContext | undefined =
            context?.tracingContext

        const yelpSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'yelp-search-tool',
            input,
            metadata: {
                'tool.id': 'yelp-search',
                query: input.query,
                location: input.location,
                operation: 'yelp-search',
            },
            requestContext: context?.requestContext,
            tracingContext,
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
            }
            if (typeof input.numResults === 'number') {
                params.num = input.numResults
            }
            if (
                typeof input.sortBy === 'string' &&
                input.sortBy !== 'recommended'
            ) {
                params.sortby = input.sortBy
            }
            if (input.priceRange) {
                params.price = input.priceRange
            }
            if (input.openNow === true) {
                params.open_now = 'true'
            }
            const response = (await getJson(params)) as YelpApiResponse
            const businesses =
                response.organic_results?.map(
                    (business: YelpBusiness) => ({
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
            yelpSpan?.update({
                output: result,
                metadata: {
                    'tool.output.businessCount': businesses.length,
                },
            })
            yelpSpan?.end()
            log.info('Yelp search completed', {
                query: input.query,
                location: input.location,
                businessCount: businesses.length,
            })
            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            const normalizedError =
                error instanceof Error ? error : new Error(errorMessage)
            yelpSpan?.error({
                error: normalizedError,
                endSpan: true,
            })
            log.error('Yelp search failed', {
                query: input.query,
                location: input.location,
                error: errorMessage,
            })
            if (error instanceof Error) {
                throw error
            }

            throw new Error(`Yelp search failed: ${errorMessage}`, {
                cause: error,
            })
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Yelp Search completed', {
            toolCallId,
            toolName,
            outputData: { businessCount: output.businesses.length },
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export type YelpSearchUITool = InferUITool<typeof yelpSearchTool>
