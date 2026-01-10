/**
 * SerpAPI Search Tools
 *
 * Provides Google Search and AI Overview tools using the SerpAPI service.
 * These tools enable agents to perform web searches and retrieve AI-generated overviews.
 *
 * @module serpapi-search-tool
 */
import type { RequestContext } from '@mastra/core/request-context'
import { SpanType } from '@mastra/core/observability'
import { createTool } from '@mastra/core/tools'
import { getJson } from 'serpapi'
import { z } from 'zod'
import { log } from '../config/logger'
import { validateSerpApiKey } from './serpapi-config'

export interface SerpApiContext extends RequestContext {
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
            totalResults: z.string().optional(),
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

    execute: async (input, context) => {
        // Validate API key
        validateSerpApiKey()
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const requestContext = context?.requestContext as SerpApiContext | undefined
        const tracingContext = context?.tracingContext

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

        // Create child span for Google search
        const searchSpan = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'google-search',
            input,
            metadata: {
                'tool.id': 'google-search',
                'tool.input.query': input.query,
                'tool.input.numResults': input.numResults,
                'tool.input.location': input.location,
                'tool.input.language': input.language,
                'tool.input.device': input.device,
            },
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
                num: input.numResults,
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
            if (abortSignal?.aborted) {
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
            const response = await getJson(params)
            // Extract organic results
            const organicResults =
                response.organic_results?.map(
                    (result: {
                        position: number
                        title: string
                        link: string
                        snippet?: string
                        displayed_link?: string
                    }) => ({
                        position: result.position,
                        title: result.title,
                        link: result.link,
                        snippet: result.snippet ?? '',
                        displayedLink: result.displayed_link,
                    })
                ) ?? []
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
                throw new Error(cancelMessage)
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
    onInputStart: ({ toolCallId, abortSignal }) => {
        log.info('Google search tool input streaming started', {
            toolCallId,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Google search tool received input chunk', {
            toolCallId,
            inputTextDelta,
            abortSignal: abortSignal?.aborted,
            messageCount: messages.length,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, abortSignal }) => {
        log.info('Google search received complete input', {
            toolCallId,
            abortSignal: abortSignal?.aborted,
            query: input.query,
            numResults: input.numResults,
            location: input.location,
            language: input.language,
            device: input.device,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Google search completed', {
            toolCallId,
            toolName,
            abortSignal: abortSignal?.aborted,
            organicResults: output.organicResults.length,
            hasKnowledgeGraph: !!output.knowledgeGraph,
            relatedSearches: output.relatedSearches?.length ?? 0,
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
    execute: async (input, context) => {
        const writer = context?.writer
        const tracingContext = context?.tracingContext

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

        // Create child span for AI overview
        const overviewSpan = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'google-ai-overview',
            input,
            metadata: {
                'tool.id': 'google-ai-overview',
                'tool.input.query': input.query,
                'tool.input.location': input.location,
                'tool.input.includeScrapedContent': input.includeScrapedContent,
            },
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
            const response = await getJson(params)
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
            throw new Error(`Google AI Overview failed: ${errorMessage}`)
        }
    },
})
