/**
 * SerpAPI Search Tools
 *
 * Provides Google Search and AI Overview tools using the SerpAPI service.
 * These tools enable agents to perform web searches and retrieve AI-generated overviews.
 *
 * @module serpapi-search-tool
 */
import type { RequestContext } from '@mastra/core/request-context'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import type { TracingContext } from '@mastra/core/observability'
import type { InferToolInput, InferToolOutput, InferUITool } from '@mastra/core/tools';
import { createTool } from '@mastra/core/tools'
import { getJson } from 'serpapi'
import { z } from 'zod'
import { log } from '../config/logger'
import { validateSerpApiKey } from './serpapi-config'

export interface SerpApiSearchContext extends RequestContext {
    userId?: string
}

/**
 * Input schema for Google Search
 */
const googleSearchInputSchema = z.object({
    query: z.string().min(1).describe('The search query'),
    location: z
        .string()
        .optional()
        .describe('Location for geo-targeted results'),
    numResults: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10)
        .describe('Number of results to return (1-100)'),
    language: z
        .string()
        .optional()
        .describe('Language code (e.g., "en", "es")'),
    device: z
        .enum(['desktop', 'mobile', 'tablet'])
        .optional()
        .describe('Device type for result formatting'),
})

/**
 * Output schema for Google Search
 */
const googleSearchOutputSchema = z.object({
    organicResults: z
        .array(
            z.object({
                title: z.string(),
                link: z.url(),
                snippet: z.string(),
                position: z.number(),
                displayedLink: z.string().optional(),
            })
        )
        .describe('Array of organic search results'),
    knowledgeGraph: z
        .object({
            title: z.string().optional(),
            description: z.string().optional(),
            source: z.string().optional(),
        })
        .optional()
        .describe('Knowledge graph information if available'),
    relatedSearches: z
        .array(z.string())
        .optional()
        .describe('Related search queries'),
    searchInfo: z
        .object({
            totalResults: z.union([z.string(), z.number()]).optional(),
            timeTaken: z.number().optional(),
        })
        .optional()
        .describe('Search metadata'),
})

/**
 * Google Search Tool
 *
 * Performs standard Google web searches with organic results, knowledge graphs,
 * and related searches. Useful for finding current information, websites, and answers
 * to factual questions.
 *
 * Rate Limits: SerpAPI has rate limits based on your plan. Consider this when
 * designing agent workflows.
 */
export const googleSearchTool = createTool({
    id: 'google-search',
    description:
        'Search Google to find current information, websites, and answers to factual questions. Returns organic search results, knowledge graph data, and related searches. Best for general web search queries.',
    inputSchema: googleSearchInputSchema,
    outputSchema: googleSearchOutputSchema,
    strict: true,
    onInputStart: ({ toolCallId, messages }) => {
        log.info('Google search tool input streaming started', {
            toolCallId,
            messages: messages ?? [],
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages }) => {
        log.info('Google search tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messages: messages ?? [],
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages }) => {
        log.info('Google search received complete input', {
            toolCallId,
            messages: messages ?? [],
            query: input.query,
            numResults: input.numResults,
            location: input.location,
            language: input.language,
            device: input.device,
            hook: 'onInputAvailable',
        })
    },
    execute: async (input, context) => {
        // Validate API key
        validateSerpApiKey()
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const numResults = input.numResults ?? 10
        const requestContext = context?.requestContext as
            | SerpApiSearchContext
            | undefined
        const tracingContext: TracingContext | undefined =
            context?.tracingContext

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Google search cancelled')
        }
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔍 Searching Google for "${input.query}" (${input.numResults} results)`,
                stage: 'serpapi-search',
            },
            id: 'serpapi-search',
        })

        // Create span for Google search
        const searchSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'google-search',
            input,
            metadata: {
                'tool.id': 'google-search',
                'tool.input.query': input.query,
                'tool.input.numResults': numResults,
                'tool.input.location': input.location,
                'tool.input.language': input.language,
                'tool.input.device': input.device,
            },
            requestContext,
            tracingContext,
        })

        log.info('Executing Google search', {
            query: input.query,
            numResults: input.numResults,
            location: input.location,
        })
        try {
            const params: Record<string, string | number> = {
                engine: 'google',
                q: input.query,
                num: numResults,
            }
            if (
                typeof input.location === 'string' &&
                input.location.length > 0
            ) {
                params.location = input.location
            }
            if (
                typeof input.language === 'string' &&
                input.language.length > 0
            ) {
                params.hl = input.language
            }
            if (input.device) {
                params.device = input.device
            }
            // Check for cancellation before API call
            if (abortSignal?.aborted ?? false) {
                searchSpan?.error({
                    error: new Error('Operation cancelled during API call'),
                    endSpan: true,
                })
                throw new Error('Google search cancelled during API call')
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: '📡 Querying SerpAPI...',
                    stage: 'serpapi-search',
                },
                id: 'serpapi-search',
            })
            const rawResponse: unknown = await getJson(params)
            const response = rawResponse as {
                organic_results?: Array<{
                    position: number
                    title: string
                    link: string
                    snippet?: string
                    displayed_link?: string
                }>
                knowledge_graph?: {
                    title?: string
                    description?: string
                    source?: { name?: string }
                } | null
                related_searches?: Array<{ query: string }>
                search_information?: {
                    total_results?: string
                    time_taken_displayed?: number
                } | null
            }
            // Extract organic results
            const organicResults =
                response.organic_results?.map((result) => ({
                    position: result.position,
                    title: result.title,
                    link: result.link,
                    snippet: result.snippet ?? '',
                    displayedLink: result.displayed_link,
                })) ?? []
            // Extract knowledge graph
            const knowledgeGraph =
                typeof response.knowledge_graph === 'object' &&
                response.knowledge_graph !== null
                    ? {
                          title: response.knowledge_graph.title,
                          description: response.knowledge_graph.description,
                          source: response.knowledge_graph.source?.name,
                      }
                    : undefined
            // Extract related searches
            const relatedSearches =
                response.related_searches?.map(
                    (search: { query: string }) => search.query
                ) ?? undefined
            // Extract search info
            const searchInfo =
                typeof response.search_information === 'object' &&
                response.search_information !== null
                    ? {
                          totalResults:
                              response.search_information.total_results,
                          timeTaken:
                              response.search_information.time_taken_displayed,
                      }
                    : undefined
            const result = {
                organicResults,
                knowledgeGraph,
                relatedSearches,
                searchInfo,
            }

            searchSpan?.update({
                output: result,
                metadata: {
                    'tool.output.organicResults': organicResults.length,
                    'tool.output.hasKnowledgeGraph': !!knowledgeGraph,
                    'tool.output.relatedSearches': relatedSearches?.length ?? 0,
                    'tool.output.success': true,
                },
            })
            searchSpan?.end()
            log.info('Google search completed successfully', {
                query: input.query,
                resultCount: organicResults.length,
            })
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Search complete: ${organicResults.length} organic results`,
                    stage: 'serpapi-search',
                },
                id: 'serpapi-search',
            })
            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)

            // Handle AbortError specifically
            if (error instanceof Error && error.name === 'AbortError') {
                const cancelMessage = `Google search cancelled for "${input.query}"`
                searchSpan?.error({
                    error: new Error(cancelMessage),
                    endSpan: true,
                })

                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: `🛑 ${cancelMessage}`,
                        stage: 'serpapi-search',
                    },
                    id: 'serpapi-search',
                })

                log.warn(cancelMessage)
                throw error
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ Search failed: ${errorMessage}`,
                    stage: 'serpapi-search',
                },
                id: 'serpapi-search',
            })
            searchSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            log.error('Google search failed', {
                query: input.query,
                error: errorMessage,
            })
            throw error
        }
    },
    toModelOutput: (output) => ({
        type: 'json',
        value: output,
    }),
    onOutput: ({ output, toolCallId, toolName }) => {
        log.info('Google search completed', {
            toolCallId,
            toolName,
            organicResults: output?.organicResults?.length ?? 0,
            hasKnowledgeGraph: !!output?.knowledgeGraph,
            relatedSearches: output?.relatedSearches?.length ?? 0,
            hook: 'onOutput',
        })
    },
})

/**
 * Input schema for Google AI Overview
 */
const googleAiOverviewInputSchema = z.object({
    query: z.string().min(1).describe('The search query'),
    location: z
        .string()
        .optional()
        .describe('Location for geo-targeted results'),
    includeScrapedContent: z
        .boolean()
        .default(false)
        .describe('Include scraped content from sources'),
})

/**
 * Output schema for Google AI Overview
 */
const googleAiOverviewOutputSchema = z.object({
    aiOverview: z.string().optional().describe('AI-generated overview text'),
    sources: z
        .array(
            z.object({
                title: z.string(),
                link: z.url(),
                snippet: z.string().optional(),
            })
        )
        .describe('Source documents used in the overview'),
    scrapedContent: z
        .string()
        .optional()
        .describe('Full content from scraped sources if requested'),
    available: z.boolean().describe('Whether AI overview was available'),
})

/**
 * Google AI Overview Tool
 *
 * Retrieves AI-generated overviews from Google search results. These overviews
 * synthesize information from multiple sources to answer queries directly.
 *
 * Note: AI overviews are not available for all queries. The tool will indicate
 * if an overview was not available for the given query.
 */
export const googleAiOverviewTool = createTool({
    id: 'google-ai-overview',
    description:
        'Get AI-generated overviews from Google that synthesize information from multiple sources. Best for queries that need comprehensive answers combining multiple perspectives. Returns overview text and source citations.',
    inputSchema: googleAiOverviewInputSchema,
    outputSchema: googleAiOverviewOutputSchema,
    strict: true,
    onInputStart: ({ toolCallId, messages }) => {
        log.info('AI overview tool input streaming started', {
            toolCallId,
            messages: messages ?? [],
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages }) => {
        log.info('AI overview tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messages: messages ?? [],
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages }) => {
        log.info('AI overview received complete input', {
            toolCallId,
            messages: messages ?? [],
            query: input.query,
            location: input.location,
            includeScrapedContent: input.includeScrapedContent,
            hook: 'onInputAvailable',
        })
    },
    execute: async (input, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext as
            | SerpApiSearchContext
            | undefined
        const tracingContext: TracingContext | undefined =
            context?.tracingContext

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🤖 Generating AI overview for "${input.query}"`,
                stage: 'google-ai-overview',
            },
            id: 'google-ai-overview',
        })
        // Validate API key
        validateSerpApiKey()

        // Create span for AI overview
        const overviewSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'google-ai-overview',
            input,
            metadata: {
                'tool.id': 'google-ai-overview',
                'tool.input.query': input.query,
                'tool.input.location': input.location,
                'tool.input.includeScrapedContent': input.includeScrapedContent,
            },
            requestContext,
            tracingContext,
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '📡 Querying SerpAPI for AI overview...',
                stage: 'google-ai-overview',
            },
            id: 'google-ai-overview',
        })
        log.info('Executing Google AI Overview search', {
            query: input.query,
            location: input.location,
        })
        try {
            const params: Record<string, string> = {
                engine: 'google',
                q: input.query,
            }
            if (
                typeof input.location === 'string' &&
                input.location.length > 0
            ) {
                params.location = input.location
            }
            const rawOverviewResponse: unknown = await getJson(params)
            const response = rawOverviewResponse as {
                ai_overview?: {
                    text?: string
                    sources?: Array<{
                        title: string
                        link: string
                        snippet?: string
                    }>
                    scraped_content?: string
                }
            }
            // Check if AI overview is available
            const aiOverviewData = response.ai_overview
            const available = Boolean(aiOverviewData)
            const sources =
                aiOverviewData?.sources?.map(
                    (source: {
                        title: string
                        link: string
                        snippet?: string
                    }) => ({
                        title: source.title,
                        link: source.link,
                        snippet: source.snippet,
                    })
                ) ?? []
            const result = {
                aiOverview: aiOverviewData?.text,
                sources,
                scrapedContent: input.includeScrapedContent
                    ? aiOverviewData?.scraped_content
                    : undefined,
                available,
            }
            overviewSpan?.update({
                output: result,
                metadata: {
                    'tool.output.available': available,
                    'tool.output.sourcesCount': sources.length,
                    'tool.output.hasAiOverview': Boolean(aiOverviewData?.text),
                    'tool.output.success': true,
                },
            })
            overviewSpan?.end()
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ AI overview ready: ${available ? 'Available' : 'Not available'} (${sources.length} sources)`,
                    stage: 'google-ai-overview',
                },
                id: 'google-ai-overview',
            })
            log.info('Google AI Overview completed', {
                query: input.query,
                available,
                sourcesCount: sources.length,
            })
            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ AI overview failed: ${errorMessage}`,
                    stage: 'google-ai-overview',
                },
                id: 'google-ai-overview',
            })
            overviewSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            log.error('Google AI Overview failed', {
                query: input.query,
                error: errorMessage,
            })
            if (error instanceof Error) {
                throw error
            }

            throw new Error(`Google AI Overview failed: ${errorMessage}`, {
                cause: error,
            })
        }
    },
    toModelOutput: (output) => ({
        type: 'json',
        value: output,
    }),
    onOutput: ({ output, toolCallId, toolName }) => {
        log.info('AI overview completed', {
            toolCallId,
            toolName,
            available: output.available,
            sourcesCount: output.sources?.length ?? 0,
            hasAiOverview: (output.aiOverview ?? '') !== '',
            hook: 'onOutput',
        })
    },
})

export type GoogleSearchToolUI = InferUITool<typeof googleSearchTool>
export type GoogleAiOverviewToolUI = InferUITool<typeof googleAiOverviewTool>


export type GoogleSearchToolOutput = InferToolOutput<typeof googleSearchTool>
export type GoogleSearchToolInput = InferToolInput<typeof googleSearchTool>
export type GoogleAiOverviewToolOutput = InferToolOutput<typeof googleAiOverviewTool>
export type GoogleAiOverviewToolInput = InferToolInput<typeof googleAiOverviewTool>