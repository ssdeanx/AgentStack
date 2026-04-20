/**
 * SerpAPI News and Trends Tools
 *
 * Provides Google News, News Lite, Trends, and Autocomplete tools using the SerpAPI service.
 * These tools enable agents to find current news, analyze trends, and get search suggestions.
 *
 * @module serpapi-news-trends-tool
 */
import { SpanType } from '@mastra/core/observability'
import { createTool } from '@mastra/core/tools'
import type {
    InferToolInput,
    InferToolOutput,
    InferUITool,
} from '@mastra/core/tools'
import { z } from 'zod'
import { getJson } from 'serpapi'
import { log } from '../config/logger'
import { validateSerpApiKey } from './serpapi-config'
import type { RequestContext } from '@mastra/core/request-context'
import { resolveAbortSignal } from './abort-signal.utils'

export interface SerpApiNewsContext extends RequestContext {
    userId?: string
}

interface SerpApiNewsSource {
    name: string
    authors?: string[]
}

interface SerpApiNewsArticle {
    position?: number
    title: string
    link: string
    source?: SerpApiNewsSource | string
    date: string
    description?: string
    snippet?: string
    thumbnail?: string
}

interface SerpApiMenuLink {
    title: string
    topic_token?: string
    serpapi_link?: string
}

interface SerpApiNewsResponse {
    news_results?: SerpApiNewsArticle[]
    menu_links?: SerpApiMenuLink[]
    search_information?: { total_results?: number | string }
}

interface SerpApiTrendTimelineValue {
    query?: string
    value?: string | number
    extracted_value?: number
}

interface SerpApiTrendTimelinePoint {
    date?: string
    timestamp: string
    values?: SerpApiTrendTimelineValue[]
    averages?: Array<{ query: string; value: number }>
}

interface SerpApiTrendAverage {
    query: string
    value: number
}

interface SerpApiTrendRelatedQueryItem {
    query: string
    value: string
    extracted_value?: number
    link?: string
    serpapi_link?: string
}

interface SerpApiTrendTopic {
    value: string
    title: string
    type: string
}

interface SerpApiTrendRelatedTopicItem {
    topic: SerpApiTrendTopic
    value: string
    extracted_value?: number
    link?: string
    serpapi_link?: string
}

interface SerpApiTrendsResponse {
    interest_over_time?: {
        timeline_data?: SerpApiTrendTimelinePoint[]
        averages?: SerpApiTrendAverage[]
    }
    related_queries?: {
        rising?: SerpApiTrendRelatedQueryItem[]
        top?: SerpApiTrendRelatedQueryItem[]
    }
    related_topics?: {
        rising?: SerpApiTrendRelatedTopicItem[]
        top?: SerpApiTrendRelatedTopicItem[]
    }
}

interface SerpApiSuggestResponse {
    suggestions?: Array<{ value: string }>
}

type GoogleTrendsTimeRange =
    | 'now-1-H'
    | 'now-4-H'
    | 'now-1-d'
    | 'now-7-d'
    | 'today-1-m'
    | 'today-3-m'
    | 'today-12-m'
    | 'today-5-y'

const GOOGLE_TRENDS_DATE_RANGE_MAP: Record<GoogleTrendsTimeRange, string> = {
    'now-1-H': 'now 1-H',
    'now-4-H': 'now 4-H',
    'now-1-d': 'now 1-d',
    'now-7-d': 'now 7-d',
    'today-1-m': 'today 1-m',
    'today-3-m': 'today 3-m',
    'today-12-m': 'today 12-m',
    'today-5-y': 'today 5-y',
}

/**
 * Converts the tool's hyphenated time range enum into the SerpAPI date format.
 *
 * SerpAPI expects values like `today 12-m` and `now 7-d`, not the hyphenated
 * internal enum values used by this tool's input schema.
 *
 * @param timeRange - Internal tool time range
 * @returns The SerpAPI-compatible date string
 */
export function mapGoogleTrendsDateRange(
    timeRange: GoogleTrendsTimeRange
): string {
    return GOOGLE_TRENDS_DATE_RANGE_MAP[timeRange]
}

/**
 * Input schema for Google News
 */
const googleNewsInputSchema = z.object({
    query: z.string().min(1).describe('The news search query'),
    location: z.string().optional().describe('Location for regional news'),
    timeRange: z
        .enum(['hour', 'day', 'week', 'month', 'year'])
        .optional()
        .describe('Time range filter for news articles'),
    topic: z
        .enum([
            'world',
            'nation',
            'business',
            'technology',
            'entertainment',
            'sports',
            'science',
            'health',
        ])
        .optional()
        .describe('News category filter'),
    sortBy: z
        .enum(['relevance', 'date'])
        .default('relevance')
        .describe('Sort order for results'),
    numResults: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10)
        .describe('Number of results to return'),
})

/**
 * Output schema for Google News
 */
const googleNewsOutputSchema = z.object({
    newsArticles: z
        .array(
            z.object({
                position: z.number().optional(),
                title: z.string(),
                link: z.url(),
                source: z.string(),
                sourceDetails: z
                    .object({
                        name: z.string(),
                        authors: z.array(z.string()).optional(),
                    })
                    .optional(),
                date: z.string(),
                snippet: z.string(),
                thumbnail: z.url().optional(),
            })
        )
        .describe('Array of news articles'),
    totalResults: z
        .number()
        .optional()
        .describe('Total number of results available'),
    menuLinks: z
        .array(
            z.object({
                title: z.string(),
                topicToken: z.string(),
                serpapiLink: z.url(),
            })
        )
        .optional()
        .describe('Topic and section links from the news navigation menu'),
})

/**
 * Google News Tool
 *
 * Searches Google News for current news articles with filtering options.
 * Provides time-based filtering, topic categories, and source information.
 */
export const googleNewsTool = createTool({
    id: 'google-news',
    description:
        'Search Google News for current news articles. Filter by time range (hour, day, week, month, year), topic (world, business, technology, etc.), and sort by relevance or date. Returns article title, source, date, and snippet.',
    inputSchema: googleNewsInputSchema,
    outputSchema: googleNewsOutputSchema,
    strict: true,
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Google News tool input streaming started', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            aborted: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Google News received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages?.length ?? 0,
            aborted: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Google News received input', {
            toolCallId,
            inputData: {
                query: input.query,
                location: input.location,
                timeRange: input.timeRange,
                topic: input.topic,
                numResults: input.numResults,
            },
            messageCount: messages?.length ?? 0,
            aborted: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputAvailable',
        })
    },
    execute: async (input, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext as
            | SerpApiNewsContext
            | undefined
        log.info('Google News request context loaded', {
            hasContext: requestContext !== undefined,
            userId: requestContext?.userId,
        })
        const tracingContext = context?.tracingContext
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Input: query="${input.query}" - 📰 Starting Google News search`,
                stage: 'google-news',
            },
            id: 'google-news',
        })
        validateSerpApiKey()

        const newsSpan = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'google-news-tool',
            input,
            metadata: {
                'tool.id': 'google-news',
                query: input.query,
                timeRange: input.timeRange,
                topic: input.topic,
                operation: 'google-news',
            },
        })
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '📡 Querying SerpAPI...',
                stage: 'google-news',
            },
            id: 'google-news',
        })
        log.info('Executing Google News search', { query: input.query })
        try {
            const params: Record<string, string | number> = {
                engine: 'google_news',
                q: input.query,
            }
            if (typeof input.numResults === 'number') {
                params.num = input.numResults
            }
            if (
                typeof input.location === 'string' &&
                input.location.length > 0
            ) {
                params.gl = input.location
            }
            if (input.timeRange) {
                params.tbs = `qdr:${input.timeRange.charAt(0)}`
            }
            if (input.topic) {
                params.topic = input.topic
            }
            if (input.sortBy === 'date') {
                params.sort = 'date'
            }
            const response = await getJson(params)
            const newsResponse = response as SerpApiNewsResponse
            const menuLinks = newsResponse.menu_links
                ?.map((menuLink) => {
                    if (
                        !menuLink.title ||
                        !menuLink.topic_token ||
                        !menuLink.serpapi_link
                    ) {
                        return null
                    }

                    return {
                        title: menuLink.title,
                        topicToken: menuLink.topic_token,
                        serpapiLink: menuLink.serpapi_link,
                    }
                })
                .filter(
                    (
                        menuLink
                    ): menuLink is {
                        title: string
                        topicToken: string
                        serpapiLink: string
                    } => menuLink !== null
                )
            const totalResultsRaw = newsResponse.search_information?.total_results
            const totalResults =
                typeof totalResultsRaw === 'string'
                    ? Number(totalResultsRaw)
                    : totalResultsRaw
            const newsArticles =
                newsResponse.news_results?.map(
                    (article: {
                        position?: number
                        title: string
                        link: string
                        source?:
                            | { name: string; authors?: string[] }
                            | string
                        date: string
                        snippet?: string
                        thumbnail?: string
                        description?: string
                    }) => ({
                        position: article.position,
                        title: article.title,
                        link: article.link,
                        source:
                            typeof article.source === 'string'
                                ? article.source
                                : article.source?.name ?? 'Unknown',
                        sourceDetails:
                            typeof article.source === 'object' &&
                            article.source !== null
                                ? {
                                      name: article.source.name,
                                      authors: article.source.authors,
                                  }
                                : undefined,
                        date: article.date,
                        snippet: article.snippet ?? article.description ?? '',
                        thumbnail: article.thumbnail,
                    })
                ) ?? []
            const result = {
                newsArticles,
                totalResults:
                    typeof totalResults === 'number' &&
                    Number.isFinite(totalResults)
                        ? totalResults
                        : undefined,
                menuLinks,
            }
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message:
                        '✅ Google News search complete: ' +
                        newsArticles.length +
                        ' articles',
                    stage: 'google-news',
                },
                id: 'google-news',
            })
            newsSpan?.update({
                output: result,
                metadata: {
                    'tool.output.articlesFound': newsArticles.length,
                },
            })
            newsSpan?.end()
            log.info('Google News search completed', {
                query: input.query,
                resultCount: newsArticles.length,
            })
            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            newsSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            log.error('Google News search failed', {
                query: input.query,
                error: errorMessage,
            })
            throw new Error(`Google News search failed: ${errorMessage}`, { cause: error })
        }
    },
    toModelOutput: (output) => ({
        type: 'json',
        value: output,
    }),
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Google News search completed', {
            toolCallId,
            toolName,
            articlesFound: output?.newsArticles?.length ?? 0,
            totalResults: output.totalResults,
            aborted: resolveAbortSignal(abortSignal).aborted,
            hook: 'onOutput',
        })
    },
})

/**
 * Google News Lite Tool
 *
 * Lightweight version of Google News search optimized for speed.
 * Returns fewer details but faster response times.
 */
export const googleNewsLiteTool = createTool({
    id: 'google-news-lite',
    description:
        'Lightweight Google News search optimized for speed. Returns basic news article information (title, source, link) with faster response times. Best when speed is more important than comprehensive details.',
    inputSchema: googleNewsInputSchema.omit({
        timeRange: true,
        topic: true,
        sortBy: true,
    }),
    outputSchema: z.object({
        newsArticles: z
            .array(
                z.object({
                    position: z.number().optional(),
                    title: z.string(),
                    link: z.url(),
                    source: z.string(),
                })
            )
            .describe('Array of news articles with minimal details'),
    }),
    strict: true,
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Google News Lite input streaming started', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            aborted: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Google News Lite received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages?.length ?? 0,
            aborted: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Google News Lite received input', {
            toolCallId,
            inputData: {
                query: input.query,
                location: input.location,
                numResults: input.numResults,
            },
            messageCount: messages?.length ?? 0,
            aborted: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputAvailable',
        })
    },
    execute: async (input, context) => {
        const writer = context?.writer
        const tracingContext = context?.tracingContext
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message:
                    '📰 Starting Google News Lite search for "' +
                    input.query +
                    '"',
                stage: 'google-news-lite',
            },
            id: 'google-news-lite',
        })
        validateSerpApiKey()

        const newsLiteSpan = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'google-news-lite-tool',
            input,
            metadata: {
                'tool.id': 'google-news-lite',
                query: input.query,
                operation: 'google-news-lite',
            },
        })
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '📡 Querying SerpAPI...',
                stage: 'google-news-lite',
            },
            id: 'google-news-lite',
        })
        log.info('Executing Google News Lite search', { query: input.query })
        try {
            const params: Record<string, string | number> = {
                engine: 'google_news',
                q: input.query,
            }
            if (typeof input.numResults === 'number') {
                params.num = input.numResults
            }
            const response = await getJson(params)

            const newsResultsSchema = z.array(
                z.object({
                    position: z.number().optional(),
                    title: z.string(),
                    link: z.string(),
                    source: z.object({ name: z.string() }).optional(),
                })
            )

            const parsed = z
                .object({ news_results: newsResultsSchema.optional() })
                .safeParse(response)

            const newsArticles =
                parsed.success && parsed.data.news_results
                    ? parsed.data.news_results.map((article) => ({
                                                    position: article.position,
                          title: article.title,
                          link: article.link,
                          source: article.source?.name ?? 'Unknown',
                      }))
                    : []
            const result = { newsArticles }
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message:
                        '✅ Google News Lite search complete: ' +
                        newsArticles.length +
                        ' articles',
                    stage: 'google-news-lite',
                },
                id: 'google-news-lite',
            })
            newsLiteSpan?.update({
                output: result,
                metadata: {
                    'tool.output.articlesFound': newsArticles.length,
                },
            })
            newsLiteSpan?.end()
            log.info('Google News Lite search completed', {
                query: input.query,
                resultCount: newsArticles.length,
            })
            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            const normalizedError =
                error instanceof Error ? error : new Error(errorMessage)
            newsLiteSpan?.error({
                error: normalizedError,
                endSpan: true,
            })
            log.error('Google News Lite search failed', {
                query: input.query,
                error: errorMessage,
            })
            if (error instanceof Error) {
                throw error
            }

            throw new Error(`Google News Lite search failed: ${errorMessage}`, {
                cause: error,
            })
        }
    },
    toModelOutput: (output) => ({
        type: 'json',
        value: output,
    }),
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Google News Lite tool completed', {
            toolCallId,
            toolName,
            abortSignal: resolveAbortSignal(abortSignal).aborted,
            outputData: {
                articlesFound: output?.newsArticles?.length ?? 0,
            },
            hook: 'onOutput',
        })
    },
})

/**
 * Input schema for Google Trends
 */
const googleTrendsInputSchema = z.object({
    query: z.string().min(1).describe('The search term to analyze trends for'),
    location: z
        .string()
        .default('US')
        .describe('Country code (e.g., "US", "GB", "FR")'),
    timeRange: z
        .enum([
            'now-1-H',
            'now-4-H',
            'now-1-d',
            'now-7-d',
            'today-1-m',
            'today-3-m',
            'today-12-m',
            'today-5-y',
        ])
        .default('today-12-m')
        .describe('Time period for trend analysis'),
    category: z
        .number()
        .int()
        .optional()
        .describe('Category ID for filtering trends'),
})

/**
 * Output schema for Google Trends
 */
const googleTrendsOutputSchema = z.object({
    interestOverTime: z
        .array(
            z.object({
                date: z.string().optional(),
                timestamp: z.string(),
                values: z.array(
                    z.object({
                        query: z.string().optional(),
                        value: z.string(),
                        extractedValue: z.number(),
                    })
                ),
            })
        )
        .describe('Interest values over time'),

    averages: z
        .array(
            z.object({
                query: z.string(),
                value: z.number(),
            })
        )
        .optional()
        .describe('Average values for each queried term'),
    relatedQueries: z
        .object({
            rising: z
                .array(
                    z.object({
                        query: z.string(),
                        value: z.string(),
                        extractedValue: z.number().optional(),
                        link: z.url().optional(),
                        serpapiLink: z.url().optional(),
                    })
                )
                .optional(),
            top: z
                .array(
                    z.object({
                        query: z.string(),
                        value: z.string(),
                        extractedValue: z.number().optional(),
                        link: z.url().optional(),
                        serpapiLink: z.url().optional(),
                    })
                )
                .optional(),
        })
        .optional()
        .describe('Related search queries broken down by rising and top'),
    relatedTopics: z
        .object({
            rising: z
                .array(
                    z.object({
                        topic: z.object({
                            value: z.string(),
                            title: z.string(),
                            type: z.string(),
                        }),
                        value: z.string(),
                        extractedValue: z.number().optional(),
                        link: z.url().optional(),
                        serpapiLink: z.url().optional(),
                    })
                )
                .optional(),
            top: z
                .array(
                    z.object({
                        topic: z.object({
                            value: z.string(),
                            title: z.string(),
                            type: z.string(),
                        }),
                        value: z.string(),
                        extractedValue: z.number().optional(),
                        link: z.url().optional(),
                        serpapiLink: z.url().optional(),
                    })
                )
                .optional(),
        })
        .optional()
        .describe('Related topics broken down by rising and top'),
    averageInterest: z
        .number()
        .optional()
        .describe('Average interest level over the period'),
})

/**
 * Google Trends Tool
 *
 * Analyzes search trends and interest over time for specific queries.
 * Useful for understanding topic popularity and discovering related queries.
 */
export const googleTrendsTool = createTool({
    id: 'google-trends',
    description:
        'Analyze search trends and interest over time for specific topics. Returns interest data over time, related queries, and related topics. Use to understand topic popularity, discover trending related searches, and analyze search patterns over different time periods.',
    inputSchema: googleTrendsInputSchema,
    outputSchema: googleTrendsOutputSchema,
    strict: true,
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Google Trends received input', {
            toolCallId,
            inputData: {
                query: input.query,
                location: input.location,
                timeRange: input.timeRange,
                category: input.category,
            },
            messageCount: messages?.length ?? 0,
            abortSignal: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputAvailable',
        })
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Google Trends input streaming started', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            abortSignal: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Google Trends received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages?.length ?? 0,
            abortSignal: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputDelta',
        })
    },
    execute: async (input, context) => {
        const writer = context?.writer
        const tracingContext = context?.tracingContext
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message:
                    '📈 Starting Google Trends analysis for "' +
                    input.query +
                    '"',
                stage: 'google-trends',
            },
            id: 'google-trends',
        })
        validateSerpApiKey()

        const trendsSpan = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'google-trends-tool',
            input,
            metadata: {
                'tool.id': 'google-trends',
                query: input.query,
                timeRange: input.timeRange,
                operation: 'google-trends',
            },
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '📡 Querying SerpAPI...',
                stage: 'google-trends',
            },
            id: 'google-trends',
        })
        log.info('Executing Google Trends search', { query: input.query })

        try {
            const params: Record<string, string | number> = {
                engine: 'google_trends',
                q: input.query,
                data_type: 'TIMESERIES',
            }

            if (typeof input.location === 'string' && input.location.length > 0) {
                params.geo = input.location
            }
            if (typeof input.timeRange === 'string' && input.timeRange.length > 0) {
                params.date = mapGoogleTrendsDateRange(input.timeRange)
            }

            if (typeof input.category === 'number') {
                params.cat = input.category
            }

            const response = await getJson(params)

            const timelinePointSchema = z.object({
                date: z.string().optional(),
                timestamp: z.string(),
                values: z
                    .array(
                        z.object({
                            query: z.string().optional(),
                            value: z.union([z.string(), z.number()]),
                            extracted_value: z.number().optional(),
                        })
                    )
                    .optional(),
                averages: z
                    .array(
                        z.object({
                            query: z.string(),
                            value: z.number(),
                        })
                    )
                    .optional(),
            })

            const parsed = z
                .object({
                    interest_over_time: z
                        .object({
                            timeline_data: z.array(timelinePointSchema).optional(),
                            averages: z
                                .array(
                                    z.object({
                                        query: z.string(),
                                        value: z.number(),
                                    })
                                )
                                .optional(),
                        })
                        .optional(),
                })
                .safeParse(response)

            const interestOverTime =
                parsed.success && parsed.data.interest_over_time?.timeline_data
                    ? parsed.data.interest_over_time.timeline_data.map(
                          (point) => ({
                              date: point.date,
                              timestamp: point.timestamp,
                              values: (point.values ?? []).map((value) => ({
                                  query: value.query,
                                  value: String(value.value),
                                  extractedValue:
                                      value.extracted_value ??
                                      (typeof value.value === 'number'
                                          ? value.value
                                          : Number(value.value) || 0),
                              })),
                          })
                      )
                    : []

            const trendsResponse = response as SerpApiTrendsResponse
            const relatedQueries = trendsResponse.related_queries
                ? {
                      rising:
                          trendsResponse.related_queries.rising?.map(
                              (query) => ({
                                  query: query.query,
                                  value: query.value,
                                  extractedValue: query.extracted_value,
                                  link: query.link,
                                  serpapiLink: query.serpapi_link,
                              })
                          ) ?? [],
                      top:
                          trendsResponse.related_queries.top?.map((query) => ({
                              query: query.query,
                              value: query.value,
                              extractedValue: query.extracted_value,
                              link: query.link,
                              serpapiLink: query.serpapi_link,
                          })) ?? [],
                  }
                : undefined

            const relatedTopics = trendsResponse.related_topics
                ? {
                      rising:
                          trendsResponse.related_topics.rising?.map((topic) => ({
                              topic: topic.topic,
                              value: topic.value,
                              extractedValue: topic.extracted_value,
                              link: topic.link,
                              serpapiLink: topic.serpapi_link,
                          })) ?? [],
                      top:
                          trendsResponse.related_topics.top?.map((topic) => ({
                              topic: topic.topic,
                              value: topic.value,
                              extractedValue: topic.extracted_value,
                              link: topic.link,
                              serpapiLink: topic.serpapi_link,
                          })) ?? [],
                  }
                : undefined

            const averages =
                parsed.success && parsed.data.interest_over_time?.averages
                    ? parsed.data.interest_over_time.averages.map((average) => ({
                          query: average.query,
                          value: average.value,
                      }))
                    : undefined

            const averageInterest =
                interestOverTime.length > 0
                    ? interestOverTime.reduce(
                          (sum: number, item: { values: Array<{ extractedValue: number }> }) =>
                              sum + (item.values[0]?.extractedValue ?? 0),
                          0
                      ) / interestOverTime.length
                    : undefined

            const result = {
                interestOverTime,
                averages,
                relatedQueries,
                relatedTopics,
                averageInterest,
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: '✅ Google Trends analysis complete',
                    stage: 'google-trends',
                },
                id: 'google-trends',
            })
            trendsSpan?.update({
                output: result,
                metadata: {
                    'tool.output.dataPoints': interestOverTime.length,
                },
            })
            trendsSpan?.end()
            log.info('Google Trends search completed', {
                query: input.query,
                dataPoints: interestOverTime.length,
            })

            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            trendsSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            log.error('Google Trends search failed', {
                query: input.query,
                error: errorMessage,
            })
            throw new Error(`Google Trends search failed: ${errorMessage}`, { cause: error })
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        const relatedQueryCount =
            (output?.relatedQueries?.rising?.length ?? 0) +
            (output?.relatedQueries?.top?.length ?? 0)
        const relatedTopicCount =
            (output?.relatedTopics?.rising?.length ?? 0) +
            (output?.relatedTopics?.top?.length ?? 0)

        log.info('Google Trends analysis completed', {
            toolCallId,
            toolName,
            dataPoints: output?.interestOverTime?.length ?? 0,
            relatedQueries: relatedQueryCount,
            relatedTopics: relatedTopicCount,
            aborted: resolveAbortSignal(abortSignal).aborted,
            hook: 'onOutput',
        })
    },
})

/**
 * Input schema for Google Autocomplete
 */
const googleAutocompleteInputSchema = z.object({
    query: z
        .string()
        .min(1)
        .describe('The partial search query to get suggestions for'),
    location: z
        .string()
        .optional()
        .describe('Location for localized suggestions'),
})

/**
 * Output schema for Google Autocomplete
 */
const googleAutocompleteOutputSchema = z.object({
    suggestions: z
        .array(z.string())
        .describe('Array of autocomplete suggestions'),
})

/**
 * Google Autocomplete Tool
 *
 * Provides search query suggestions based on partial input.
 * Useful for discovering related search terms and query variations.
 */
export const googleAutocompleteTool = createTool({
    id: 'google-autocomplete',
    description:
        'Get Google search suggestions for partial queries. Returns an array of autocomplete suggestions that users commonly search for. Useful for discovering related search terms, query variations, and popular searches.',
    inputSchema: googleAutocompleteInputSchema,
    outputSchema: googleAutocompleteOutputSchema,
    strict: true,
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Google Autocomplete input streaming started', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            aborted: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Google Autocomplete received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages?.length ?? 0,
            aborted: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Google Autocomplete received input', {
            toolCallId,
            inputData: {
                query: input.query,
                location: input.location,
            },
            messageCount: messages?.length ?? 0,
            aborted: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputAvailable',
        })
    },
    execute: async (input, context) => {
        const writer = context?.writer
        const tracingContext = context?.tracingContext
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message:
                    '🔍 Getting autocomplete suggestions for "' +
                    input.query +
                    '"',
                stage: 'google-autocomplete',
            },
            id: 'google-autocomplete',
        })
        validateSerpApiKey()

        const autocompleteSpan = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'google-autocomplete-tool',
            input,
            metadata: {
                'tool.id': 'google-autocomplete',
                query: input.query,
                operation: 'google-autocomplete',
            },
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '📡 Querying SerpAPI...',
                stage: 'google-autocomplete',
            },
            id: 'google-autocomplete',
        })
        log.info('Executing Google Autocomplete search', { query: input.query })

        try {
            const params: Record<string, string> = {
                engine: 'google_autocomplete',
                q: input.query,
            }

            if (
                typeof input.location === 'string' &&
                input.location.length > 0
            ) {
                params.gl = input.location
            }

            const response = await getJson(params)

            const suggestResponse = response as SerpApiSuggestResponse
            const suggestions =
                suggestResponse.suggestions?.map(
                    (s: { value: string }) => s.value
                ) ?? []

            const result = { suggestions }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message:
                        '✅ Autocomplete complete: ' +
                        suggestions.length +
                        ' suggestions',
                    stage: 'google-autocomplete',
                },
                id: 'google-autocomplete',
            })
            autocompleteSpan?.update({
                output: result,
                metadata: {
                    'tool.output.suggestionCount': suggestions.length,
                },
            })
            autocompleteSpan?.end()
            log.info('Google Autocomplete completed', {
                query: input.query,
                suggestionCount: suggestions.length,
            })

            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            const normalizedError =
                error instanceof Error ? error : new Error(errorMessage)
            autocompleteSpan?.error({
                error: normalizedError,
                endSpan: true,
            })
            log.error('Google Autocomplete failed', {
                query: input.query,
                location: input.location,
                error: errorMessage,
            })
            if (error instanceof Error) {
                throw error
            }

            throw new Error(`Google Autocomplete failed: ${errorMessage}`, {
                cause: error,
            })
        }
    },
    toModelOutput: (output) => ({
        type: 'json',
        value: output,
    }),
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Google Autocomplete completed', {
            toolCallId,
            toolName,
            suggestionCount: output?.suggestions?.length ?? 0,
            aborted: resolveAbortSignal(abortSignal).aborted,
            hook: 'onOutput',
        })
    },
})

export type GoogleNewsToolUI = InferUITool<typeof googleNewsTool>
export type GoogleNewsLiteToolUI = InferUITool<typeof googleNewsLiteTool>
export type GoogleTrendsToolUI = InferUITool<typeof googleTrendsTool>
export type GoogleAutocompleteToolUI = InferUITool<typeof googleAutocompleteTool>
export type GoogleTrendsToolOutput = InferToolOutput<typeof googleTrendsTool>
export type GoogleTrendsToolInput = InferToolInput<typeof googleTrendsTool>
export type GoogleNewsToolOutput = InferToolOutput<typeof googleNewsTool>
export type GoogleNewsToolInput = InferToolInput<typeof googleNewsTool>
export type GoogleNewsLiteToolOutput = InferToolOutput<typeof googleNewsLiteTool>
export type GoogleNewsLiteToolInput = InferToolInput<typeof googleNewsLiteTool>
export type GoogleAutocompleteToolOutput = InferToolOutput<typeof googleAutocompleteTool>
export type GoogleAutocompleteToolInput = InferToolInput<typeof googleAutocompleteTool>